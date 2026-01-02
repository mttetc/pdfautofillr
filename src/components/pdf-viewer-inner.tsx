'use client';

import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useResizeObserver } from '@wojtekmaj/react-hooks';
import { Document, Page, pdfjs } from 'react-pdf';
import { Spinner } from '@heroui/react';
import { SignatureOverlay, type SignatureOverlayRef } from './signature-overlay';
import { PageThumbnails } from './page-thumbnails';

// Import required CSS for annotation layer (forms) and text layer
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker using import.meta.url as per react-pdf documentation
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

// Options for Document component (fonts, cMaps, wasm)
const options = {
    cMapUrl: '/cmaps/',
    standardFontDataUrl: '/standard_fonts/',
};

const resizeObserverOptions = {};
const maxWidth = 800;

export interface PdfFieldInfo {
    name: string;
    type: string;
    alternativeText?: string;
}

export interface PdfViewerRef {
    getFormValues: () => Record<string, string>;
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
    const [fieldsInfo, setFieldsInfo] = useState<PdfFieldInfo[]>([]);
    const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
    const [containerWidth, setContainerWidth] = useState<number>();
    const formValuesRef = useRef<Record<string, string>>({});
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const internalSignatureRef = useRef<SignatureOverlayRef>(null);

    const onResize = useCallback<ResizeObserverCallback>((entries) => {
        const [entry] = entries;
        if (entry) {
            setContainerWidth(entry.contentRect.width);
        }
    }, []);

    useResizeObserver(containerRef, resizeObserverOptions, onResize);

    const actualSignatureRef = signatureRef || internalSignatureRef;

    // Set page ref for a specific page index
    const setPageRef = useCallback((index: number, element: HTMLDivElement | null) => {
        if (element) {
            pageRefs.current.set(index, element);
        } else {
            pageRefs.current.delete(index);
        }
    }, []);

    useImperativeHandle(ref, () => ({
        getFormValues: () => ({ ...formValuesRef.current }),
        getFieldNames: () => fieldsInfo.map(f => f.name),
        getFieldsInfo: () => [...fieldsInfo],
        getSelectedPageDimensions: () => {
            const pageElement = pageRefs.current.get(selectedPage);
            if (pageElement) {
                const canvas = pageElement.querySelector('canvas');
                if (canvas) {
                    return { width: canvas.offsetWidth, height: canvas.offsetHeight };
                }
            }
            return null;
        },
        getSignaturePosition: () => {
            if (actualSignatureRef.current) {
                return actualSignatureRef.current.getPosition();
            }
            return null;
        },
        getSelectedPage: () => selectedPage,
    }), [fieldsInfo, actualSignatureRef, selectedPage]);

    const handleLoadSuccess = useCallback(async ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            const fields: PdfFieldInfo[] = [];
            const seenNames = new Set<string>();

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const annotations = await page.getAnnotations();

                console.log('Annotations:', annotations);
                // Get text content with positions
                const textContent = await page.getTextContent();
                const textItems: { text: string; x: number; y: number }[] = [];

                for (const item of textContent.items) {
                    // TextItem has 'str' and 'transform', TextMarkedContent doesn't
                    if ('str' in item && 'transform' in item) {
                        const textItem = item as { str: string; transform: number[] };
                        if (textItem.str.trim().length > 0) {
                            textItems.push({
                                text: textItem.str.trim(),
                                x: textItem.transform[4],
                                y: textItem.transform[5],
                            });
                        }
                    }
                }

                for (const annotation of annotations) {
                    if (annotation.subtype === 'Widget' && annotation.fieldName) {
                        // Skip duplicates
                        if (seenNames.has(annotation.fieldName)) continue;
                        seenNames.add(annotation.fieldName);

                        // Get field position from rect [x1, y1, x2, y2]
                        const rect = annotation.rect;
                        const fieldX = rect[0];
                        const fieldY = rect[1];

                        // Find nearest MEANINGFUL text label (filter out dots and short text)
                        let nearestLabel = '';
                        let minDistance = Infinity;

                        for (const textItem of textItems) {
                            // Skip dotted lines, colons, and very short text
                            const text = textItem.text;
                            if (/^[.\s:]+$/.test(text)) continue; // Only dots, spaces, colons
                            if (/^\.{3,}/.test(text)) continue; // Starts with multiple dots
                            if (text.length < 3) continue; // Too short
                            if (['jour', 'mois', 'année', 'an'].includes(text.toLowerCase())) continue; // Date labels

                            // Text should be to the left or above the field
                            const dx = fieldX - textItem.x;
                            const dy = fieldY - textItem.y;

                            // Only consider text that is to the left (dx > 0) or above (dy < 50 and dy > -20)
                            if (dx > -10 && dx < 400 && dy > -30 && dy < 50) {
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    nearestLabel = text;
                                }
                            }
                        }

                        // Determine field type
                        let fieldType = 'text';
                        if (annotation.checkBox) fieldType = 'checkbox';
                        else if (annotation.radioButton) fieldType = 'radio';
                        else if (annotation.comboBox) fieldType = 'select';

                        fields.push({
                            name: annotation.fieldName,
                            type: fieldType,
                            alternativeText: nearestLabel || annotation.alternativeText || undefined,
                        });
                    }
                }
            }

            console.log('📋 Extracted PDF fields with labels:', fields);
            setFieldsInfo(fields);
            onFieldsDetected?.(fields.length);
        } catch (err) {
            console.error('Erreur détection champs:', err);
        }
    }, [file, onFieldsDetected]);

    useEffect(() => {
        const container = containerRef;
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

        container.addEventListener('input', handleInput, true);
        container.addEventListener('change', handleInput, true);

        return () => {
            container.removeEventListener('input', handleInput, true);
            container.removeEventListener('change', handleInput, true);
        };
    }, [containerRef, numPages]);

    // Track if we're programmatically scrolling (to avoid observer conflicts)
    const isScrollingRef = useRef(false);

    // IntersectionObserver to detect visible page during scroll
    useEffect(() => {
        if (!containerRef || numPages === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                // Skip if we're doing a programmatic scroll
                if (isScrollingRef.current) return;

                // Find the most visible page
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

        // Observe all page elements
        pageRefs.current.forEach((element) => {
            observer.observe(element);
        });

        return () => observer.disconnect();
    }, [containerRef, numPages, selectedPage]);

    // Handle page selection from thumbnails
    const handleSelectPage = useCallback((pageIndex: number) => {
        setSelectedPage(pageIndex);
        // Mark that we're doing a programmatic scroll
        isScrollingRef.current = true;
        // Scroll to the selected page
        const pageElement = pageRefs.current.get(pageIndex);
        if (pageElement) {
            pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Reset the flag after scroll completes
            setTimeout(() => {
                isScrollingRef.current = false;
            }, 500);
        } else {
            isScrollingRef.current = false;
        }
    }, []);

    return (
        <div className="flex h-full w-full gap-3">
            {/* Thumbnails sidebar (LEFT) */}
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

            {/* Main PDF viewer (RIGHT) */}
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
                                {/* Signature overlay only on selected page */}
                                {index === selectedPage && signatureDataUrl && (
                                    <SignatureOverlay
                                        ref={actualSignatureRef as React.RefObject<SignatureOverlayRef>}
                                        imageUrl={signatureDataUrl}
                                        onRemove={onRemoveSignature || (() => { })}
                                        containerRef={{ current: pageRefs.current.get(selectedPage) || null }}
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
