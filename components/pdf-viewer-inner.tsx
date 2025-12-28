'use client';

import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Spinner } from '@heroui/react';
import { SignatureOverlay, type SignatureOverlayRef } from './signature-overlay';

// Import required CSS for annotation layer (forms)
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker using import.meta.url as per react-pdf documentation
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

const PDF_WIDTH = 700;

export interface PdfViewerRef {
    getFormValues: () => Record<string, string>;
    getFieldNames: () => string[];
    getFirstPageDimensions: () => { width: number; height: number } | null;
    getSignaturePosition: () => { x: number; y: number; width: number; height: number } | null;
}

interface Props {
    file: File;
    onFieldsDetected?: (count: number) => void;
    signatureDataUrl?: string | null;
    signatureRef?: React.RefObject<SignatureOverlayRef | null>;
    onRemoveSignature?: () => void;
}

const PdfViewerInner = forwardRef<PdfViewerRef, Props>(({
    file,
    onFieldsDetected,
    signatureDataUrl,
    signatureRef,
    onRemoveSignature
}, ref) => {
    const [numPages, setNumPages] = useState(0);
    const [fieldNames, setFieldNames] = useState<string[]>([]);
    const formValuesRef = useRef<Record<string, string>>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const firstPageRef = useRef<HTMLDivElement>(null);
    const internalSignatureRef = useRef<SignatureOverlayRef>(null);

    // Use external ref if provided, otherwise use internal
    const actualSignatureRef = signatureRef || internalSignatureRef;

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
        getFormValues: () => ({ ...formValuesRef.current }),
        getFieldNames: () => [...fieldNames],
        getFirstPageDimensions: () => {
            if (firstPageRef.current) {
                const rect = firstPageRef.current.getBoundingClientRect();
                return { width: rect.width, height: rect.height };
            }
            return null;
        },
        getSignaturePosition: () => {
            if (actualSignatureRef.current) {
                return actualSignatureRef.current.getPosition();
            }
            return null;
        },
    }), [fieldNames, actualSignatureRef]);

    const handleLoadSuccess = useCallback(async ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);

        // Detect form fields
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            const names: string[] = [];

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const annotations = await page.getAnnotations();

                for (const annotation of annotations) {
                    if (annotation.subtype === 'Widget' && annotation.fieldName) {
                        names.push(annotation.fieldName);
                    }
                }
            }

            setFieldNames(names);
            onFieldsDetected?.(names.length);
        } catch (err) {
            console.error('Erreur détection champs:', err);
        }
    }, [file, onFieldsDetected]);

    // Set up event listeners to capture form input changes
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleInput = (event: Event) => {
            const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            if (!target || !target.name) return;

            if (target instanceof HTMLInputElement && target.type === 'checkbox') {
                formValuesRef.current[target.name] = target.checked ? 'true' : 'false';
            } else {
                formValuesRef.current[target.name] = target.value;
            }
        };

        // Listen for input events on the annotation layer
        container.addEventListener('input', handleInput, true);
        container.addEventListener('change', handleInput, true);

        return () => {
            container.removeEventListener('input', handleInput, true);
            container.removeEventListener('change', handleInput, true);
        };
    }, [numPages]);

    return (
        <div ref={containerRef} className="h-full overflow-auto">
            {/* Custom CSS to fix annotation layer sizing */}
            <style>{`
                .react-pdf__Page {
                    position: relative;
                }
                .react-pdf__Page__annotations {
                    width: 100% !important;
                    height: 100% !important;
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                }
                .react-pdf__Page__textContent {
                    top: 0 !important;
                    left: 0 !important;
                    transform: none !important;
                    width: 100% !important;
                    height: 100% !important;
                }
            `}</style>

            <Document
                file={file}
                onLoadSuccess={handleLoadSuccess}
                loading={<Spinner size="lg" color="white" />}
                error={<div className="text-danger p-4">Erreur de chargement du PDF</div>}
                className="flex flex-col gap-4"
            >
                {Array.from({ length: numPages }, (_, index) => (
                    <div
                        key={index}
                        ref={index === 0 ? firstPageRef : undefined}
                        className="relative shadow-2xl shadow-black/50"
                        style={{ width: PDF_WIDTH }}
                    >
                        <Page
                            pageNumber={index + 1}
                            className="!bg-white"
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            renderForms={true}
                            width={PDF_WIDTH}
                            canvasBackground="white"
                        />
                        {/* Signature overlay only on first page */}
                        {index === 0 && signatureDataUrl && (
                            <SignatureOverlay
                                ref={actualSignatureRef as React.RefObject<SignatureOverlayRef>}
                                imageUrl={signatureDataUrl}
                                onRemove={onRemoveSignature || (() => { })}
                                containerRef={firstPageRef}
                            />
                        )}
                    </div>
                ))}
            </Document>
        </div>
    );
});

PdfViewerInner.displayName = 'PdfViewerInner';

export default PdfViewerInner;
