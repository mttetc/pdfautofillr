'use client';

import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useResizeObserver } from '@wojtekmaj/react-hooks';
import { Document, Page } from 'react-pdf';
import { Spinner } from '@heroui/react';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import { SignatureOverlay, type SignatureOverlayRef } from './signature-overlay';
import { PageThumbnails } from './page-thumbnails';
import { extractPdfFields, type PdfFieldInfo } from '@/lib/pdf-fields';

// Worker configuration
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

const options = {
    cMapUrl: '/cmaps/',
    standardFontDataUrl: '/standard_fonts/',
};

const resizeObserverOptions = {};
const maxWidth = 800;

// Re-export for backward compatibility
export type { PdfFieldInfo };

export interface PdfViewerRef {
    getFormValues: () => Record<string, string>;
    setFormValues: (values: Record<string, string>) => void;
    getFieldNames: () => string[];
    getFieldsInfo: () => PdfFieldInfo[];
    getSelectedPageDimensions: () => { width: number; height: number } | null;
    getSignaturePosition: () => { x: number; y: number; width: number; height: number } | null;
    getSelectedPage: () => number;
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
    const [selectedPage, setSelectedPage] = useState(0);
    const [signaturePage, setSignaturePage] = useState<number | null>(null);
    const [fieldsInfo, setFieldsInfo] = useState<PdfFieldInfo[]>([]);
    const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
    const [containerWidth, setContainerWidth] = useState<number>();
    const formValuesRef = useRef<Record<string, string>>({});
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const internalSignatureRef = useRef<SignatureOverlayRef>(null);
    const isScrollingRef = useRef(false);

    // Resize observer
    const onResize = useCallback<ResizeObserverCallback>((entries) => {
        const [entry] = entries;
        if (entry) setContainerWidth(entry.contentRect.width);
    }, []);
    useResizeObserver(containerRef, resizeObserverOptions, onResize);

    const actualSignatureRef = signatureRef || internalSignatureRef;

    // Track signature page when signature is added
    useEffect(() => {
        if (signatureDataUrl && signaturePage === null) {
            setSignaturePage(selectedPage);
        } else if (!signatureDataUrl) {
            setSignaturePage(null);
        }
    }, [signatureDataUrl, signaturePage, selectedPage]);

    // Set page ref
    const setPageRef = useCallback((index: number, element: HTMLDivElement | null) => {
        if (element) {
            pageRefs.current.set(index, element);
        } else {
            pageRefs.current.delete(index);
        }
    }, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        getFormValues: () => ({ ...formValuesRef.current }),
        setFormValues: (values: Record<string, string>) => {
            Object.assign(formValuesRef.current, values);
            Object.entries(values).forEach(([name, value]) => {
                const elements = document.querySelectorAll(`[name="${name}"]`);
                elements.forEach(el => {
                    if (el instanceof HTMLInputElement) {
                        if (el.type === 'checkbox') {
                            el.checked = value === 'true' || value === 'on';
                        } else {
                            el.value = value;
                        }
                    } else if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
                        el.value = value;
                    }
                });
            });
        },
        getFieldNames: () => fieldsInfo.map(f => f.name),
        getFieldsInfo: () => [...fieldsInfo],
        getSelectedPageDimensions: () => {
            const pageElement = pageRefs.current.get(signaturePage ?? selectedPage);
            const canvas = pageElement?.querySelector('canvas');
            return canvas ? { width: canvas.offsetWidth, height: canvas.offsetHeight } : null;
        },
        getSignaturePosition: () => actualSignatureRef.current?.getPosition() ?? null,
        getSelectedPage: () => signaturePage ?? selectedPage,
    }), [fieldsInfo, actualSignatureRef, selectedPage, signaturePage]);

    // Load PDF and extract fields
    const handleLoadSuccess = useCallback(async ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        try {
            const fields = await extractPdfFields(file);
            setFieldsInfo(fields);
            onFieldsDetected?.(fields.length);
        } catch (err) {
            console.error('Erreur détection champs:', err);
        }
    }, [file, onFieldsDetected]);

    // Form input capture
    useEffect(() => {
        if (!containerRef) return;

        const handleInput = (event: Event) => {
            const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            if (!target || !target.name) return;

            if (target instanceof HTMLInputElement && target.type === 'checkbox') {
                // Get the PDF export value from the exportvalue attribute (set by react-pdf)
                const exportValue = target.getAttribute('exportvalue') || 'true';
                if (target.checked) {
                    formValuesRef.current[target.name] = exportValue;
                } else {
                    if (formValuesRef.current[target.name] === exportValue) {
                        delete formValuesRef.current[target.name];
                    }
                }
            } else {
                formValuesRef.current[target.name] = target.value;
            }
        };

        containerRef.addEventListener('input', handleInput, true);
        containerRef.addEventListener('change', handleInput, true);

        return () => {
            containerRef.removeEventListener('input', handleInput, true);
            containerRef.removeEventListener('change', handleInput, true);
        };
    }, [containerRef]);

    // Scroll tracking with IntersectionObserver
    useEffect(() => {
        if (!containerRef || numPages === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (isScrollingRef.current) return;

                let maxRatio = 0;
                let mostVisiblePage = selectedPage;

                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
                        const pageIndex = parseInt(entry.target.getAttribute('data-page-index') || '0', 10);
                        maxRatio = entry.intersectionRatio;
                        mostVisiblePage = pageIndex;
                    }
                });

                if (maxRatio > 0 && mostVisiblePage !== selectedPage) {
                    setSelectedPage(mostVisiblePage);
                }
            },
            {
                root: containerRef,
                threshold: [0, 0.25, 0.5, 0.75, 1],
            }
        );

        pageRefs.current.forEach((element) => {
            observer.observe(element);
        });

        return () => observer.disconnect();
    }, [containerRef, numPages, selectedPage]);

    // Handle page selection from thumbnails
    const handleSelectPage = useCallback((pageIndex: number) => {
        setSelectedPage(pageIndex);
        isScrollingRef.current = true;
        const pageElement = pageRefs.current.get(pageIndex);
        if (pageElement) {
            pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(() => {
                isScrollingRef.current = false;
            }, 500);
        } else {
            isScrollingRef.current = false;
        }
    }, []);

    return (
        <div className="flex h-full w-full gap-3">
            {/* Thumbnails sidebar */}
            {numPages > 0 && (
                <div className="flex-shrink-0 w-[100px] h-full overflow-y-auto">
                    <Document file={file} options={options}>
                        <PageThumbnails
                            numPages={numPages}
                            selectedPage={selectedPage}
                            onSelectPage={handleSelectPage}
                            file={file}
                        />
                    </Document>
                </div>
            )}

            {/* Main PDF viewer */}
            <div ref={setContainerRef} className="flex-1 h-full min-w-0 overflow-auto">
                <Document
                    file={file}
                    onLoadSuccess={handleLoadSuccess}
                    options={options}
                    loading={<Spinner size="lg" color="white" />}
                    error={<div className="text-danger p-4">Erreur de chargement du PDF</div>}
                    className="flex flex-col items-center gap-3"
                >
                    {Array.from({ length: numPages }, (_, index) => (
                        <div
                            key={`page_wrapper_${index}`}
                            ref={(el) => setPageRef(index, el)}
                            data-page-index={index}
                            className={`relative ${selectedPage === index ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded' : ''}`}
                        >
                            <Page
                                pageNumber={index + 1}
                                width={containerWidth ? Math.min(containerWidth - 20, maxWidth) : maxWidth}
                                renderForms
                                renderAnnotationLayer
                                renderTextLayer
                                onClick={() => setSelectedPage(index)}
                            >
                                {/* Signature stays on the page where it was placed */}
                                {index === signaturePage && signatureDataUrl && (
                                    <SignatureOverlay
                                        ref={actualSignatureRef as React.RefObject<SignatureOverlayRef>}
                                        imageUrl={signatureDataUrl}
                                        onRemove={onRemoveSignature || (() => { })}
                                        containerRef={{ current: pageRefs.current.get(signaturePage) || null }}
                                    />
                                )}
                            </Page>
                        </div>
                    ))}
                </Document>
            </div>
        </div>
    );
});

PdfViewerInner.displayName = 'PdfViewerInner';

export default PdfViewerInner;
