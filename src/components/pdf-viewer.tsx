'use client';

import { useState, useRef, useCallback, lazy, Suspense } from 'react';
import { Spinner } from '@heroui/react';
import type { PdfViewerRef } from './pdf-viewer-inner';
import type { SignatureOverlayRef } from './signature-overlay';
import { exportFilledPdf, downloadPdf, type SignatureData } from '@/lib/pdf';
import type { DetectedField } from '@/types';

// Lazy imports for code splitting (replaces next/dynamic)
const PdfViewerInner = lazy(() => import('./pdf-viewer-inner'));
const PdfEditorSidebar = lazy(() => import('./pdf-editor-sidebar'));
const ContextModal = lazy(() => import('./context-modal').then(mod => ({ default: mod.ContextModal })));
const SignatureModal = lazy(() => import('./signature-modal').then(mod => ({ default: mod.SignatureModal })));
const CreditAlert = lazy(() => import('./credit-alert').then(mod => ({ default: mod.CreditAlert })));

interface Props {
    file: File;
}

export default function PdfViewer({ file }: Props) {
    const [fieldCount, setFieldCount] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isContextModalOpen, setIsContextModalOpen] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [detectedContext, setDetectedContext] = useState<string | null>(null);
    const [showCreditAlert, setShowCreditAlert] = useState(false);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const viewerRef = useRef<PdfViewerRef>(null);
    const signatureRef = useRef<SignatureOverlayRef | null>(null);

    const handleExport = useCallback(async () => {
        if (!viewerRef.current) return;

        setIsExporting(true);
        try {
            const formValues = viewerRef.current.getFormValues();
            const originalBytes = await file.arrayBuffer();

            // Get signature data if present
            let signatureData: SignatureData | undefined;
            const dims = viewerRef.current.getSelectedPageDimensions();
            const sigPos = viewerRef.current.getSignaturePosition();
            const selectedPage = viewerRef.current.getSelectedPage();

            if (signatureDataUrl && dims && sigPos) {
                signatureData = {
                    dataUrl: signatureDataUrl,
                    x: sigPos.x,
                    y: sigPos.y,
                    width: sigPos.width,
                    height: sigPos.height,
                    containerWidth: dims.width,
                    containerHeight: dims.height,
                    pageIndex: selectedPage,
                };
            }

            const filledPdfBytes = await exportFilledPdf(originalBytes, formValues, signatureData, true);

            const baseName = file.name.replace(/\.pdf$/i, '');
            const exportName = `${baseName}_rempli.pdf`;

            downloadPdf(filledPdfBytes, exportName);
        } catch (err) {
            console.error('Erreur export PDF:', err);
        } finally {
            setIsExporting(false);
        }
    }, [file, signatureDataUrl]);

    const handleMagicFill = useCallback(() => {
        setIsContextModalOpen(true);
    }, []);

    const handleSignature = useCallback(() => {
        setIsSignatureModalOpen(true);
    }, []);

    const handleSignatureConfirm = useCallback((dataUrl: string) => {
        setSignatureDataUrl(dataUrl);
        setIsSignatureModalOpen(false);
    }, []);

    const handleRemoveSignature = useCallback(() => {
        setSignatureDataUrl(null);
    }, []);

    const handleAnalyze = useCallback(async (context: string) => {
        setIsAnalyzing(true);
        setIsContextModalOpen(false);

        try {
            // Get actual PDF field info from viewer (name, type, alternativeText)
            const fieldsInfo = viewerRef.current?.getFieldsInfo() || [];
            console.log('📋 Sending fields info to LLM:', fieldsInfo);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('context', context);
            formData.append('fieldsInfo', JSON.stringify(fieldsInfo));

            // Import and call server function
            const { analyzeDocument } = await import('@/server-fns/analyze');
            const data = await analyzeDocument({ data: formData });

            if (data.context) {
                setDetectedContext(data.context);
            }

            const values: Record<string, string> = {};
            (data.fields as DetectedField[]).forEach(field => {
                if (field.suggestedValue && field.name) {
                    values[field.name] = field.suggestedValue;
                }
            });

            console.log('🎯 Filling fields:', values);
            fillFormFields(values);

        } catch (err) {
            console.error('Erreur analyse:', err);
            if (err instanceof Error && err.message === 'CREDIT_EXHAUSTED') {
                setShowCreditAlert(true);
                setTimeout(() => setShowCreditAlert(false), 5000);
            }
        } finally {
            setIsAnalyzing(false);
        }
    }, [file]);

    const fillFormFields = (values: Record<string, string>) => {
        // Use the viewer's setFormValues method which updates both internal ref and DOM
        viewerRef.current?.setFormValues(values);
    };

    const loadingSpinner = (
        <div className="flex items-center justify-center h-full">
            <Spinner size="lg" color="white" />
        </div>
    );

    return (
        <div className="flex gap-4 h-full">
            {/* Credit Alert */}
            <Suspense fallback={null}>
                <CreditAlert isVisible={showCreditAlert} />
            </Suspense>

            {/* Context Modal */}
            <Suspense fallback={null}>
                <ContextModal
                    isOpen={isContextModalOpen}
                    onClose={() => setIsContextModalOpen(false)}
                    onConfirm={handleAnalyze}
                    detectedContext={detectedContext}
                    isLoading={isAnalyzing}
                />
            </Suspense>

            {/* Signature Modal */}
            <Suspense fallback={null}>
                <SignatureModal
                    isOpen={isSignatureModalOpen}
                    onClose={() => setIsSignatureModalOpen(false)}
                    onConfirm={handleSignatureConfirm}
                />
            </Suspense>

            {/* PDF Viewer (LEFT) */}
            <div className="flex-1 h-full min-w-0">
                <Suspense fallback={loadingSpinner}>
                    <PdfViewerInner
                        file={file}
                        ref={viewerRef}
                        onFieldsDetected={setFieldCount}
                        signatureDataUrl={signatureDataUrl}
                        signatureRef={signatureRef}
                        onRemoveSignature={handleRemoveSignature}
                    />
                </Suspense>
            </div>

            {/* Sidebar (RIGHT) */}
            <Suspense fallback={null}>
                <PdfEditorSidebar
                    fileName={file.name}
                    fieldCount={fieldCount}
                    onExport={handleExport}
                    onMagicFill={handleMagicFill}
                    onSignature={handleSignature}
                    isExporting={isExporting}
                    isAnalyzing={isAnalyzing}
                />
            </Suspense>
        </div>
    );
}
