/**
 * PDF utilities for text extraction and form manipulation
 */
import { extractText, getDocumentProxy } from 'unpdf';
import { PDFDocument, PDFName } from 'pdf-lib';

// ============================================
// Types
// ============================================

export interface SignatureData {
    dataUrl: string;
    x: number;
    y: number;
    width: number;
    height: number;
    containerWidth: number;
    containerHeight: number;
    pageIndex: number;
}

// ============================================
// Server-side text extraction (unpdf)
// ============================================

/**
 * Extract text from a PDF (server-side)
 */
export async function extractTextFromPdf(pdfBuffer: ArrayBuffer): Promise<string> {
    const { text } = await extractText(pdfBuffer, { mergePages: true });
    return text;
}

/**
 * Get page count of a PDF
 */
export async function getPdfPageCount(pdfBuffer: ArrayBuffer): Promise<number> {
    const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
    return pdf.numPages;
}

// ============================================
// Client-side PDF manipulation (pdf-lib)
// ============================================

/**
 * Fill PDF form fields with values and optionally embed a signature
 */
export async function exportFilledPdf(
    originalBytes: ArrayBuffer,
    formValues: Record<string, string>,
    signature?: SignatureData,
    flatten: boolean = true
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(originalBytes);
    const form = pdfDoc.getForm();

    // Fill each field
    for (const [fieldName, value] of Object.entries(formValues)) {
        try {
            const field = form.getFieldMaybe(fieldName);
            if (!field) continue;

            const fieldType = field.constructor.name;

            // Use includes() because pdf-lib may return PDFTextField2, PDFCheckBox2, etc.
            if (fieldType.includes('PDFTextField')) {
                form.getTextField(fieldName).setText(value);
            } else if (fieldType.includes('PDFCheckBox')) {
                const checkBox = form.getCheckBox(fieldName);

                if (value === 'true' || value === 'on') {
                    checkBox.check();
                } else if (value === 'false' || value === 'off') {
                    checkBox.uncheck();
                } else {
                    // Value is an export value (e.g., 'a', 'b', 'c') for multi-widget checkboxes
                    const acroField = (checkBox as unknown as {
                        acroField: {
                            dict: { set: (key: unknown, val: unknown) => void };
                            getWidgets: () => Array<{
                                dict: { set: (key: unknown, val: unknown) => void };
                                getOnValue: () => { toString: () => string } | undefined;
                            }>;
                        }
                    }).acroField;

                    if (acroField?.getWidgets && acroField?.dict) {
                        const widgets = acroField.getWidgets();

                        // Set the field value
                        acroField.dict.set(PDFName.of('V'), PDFName.of(value));

                        // Update each widget's appearance state
                        for (const widget of widgets) {
                            const onValue = widget.getOnValue?.()?.toString?.();
                            if (onValue === `/${value}` || onValue === value) {
                                widget.dict.set(PDFName.of('AS'), PDFName.of(value));
                            } else {
                                widget.dict.set(PDFName.of('AS'), PDFName.of('Off'));
                            }
                        }
                    } else {
                        checkBox.check();
                    }
                }
            } else if (fieldType.includes('PDFDropdown')) {
                form.getDropdown(fieldName).select(value);
            } else if (fieldType.includes('PDFRadioGroup')) {
                form.getRadioGroup(fieldName).select(value);
            }
        } catch (err) {
            console.warn(`Could not set field "${fieldName}":`, err);
        }
    }

    // Flatten makes fields non-editable (baked into PDF)
    if (flatten) {
        form.flatten();
    }

    // Embed signature if provided
    if (signature) {
        await embedSignature(pdfDoc, signature);
    }

    return await pdfDoc.save();
}

/**
 * Embed a signature image into the PDF at the specified position
 */
async function embedSignature(pdfDoc: PDFDocument, signature: SignatureData): Promise<void> {
    const pages = pdfDoc.getPages();
    const pageIndex = Math.min(signature.pageIndex, pages.length - 1);
    const page = pages[pageIndex];

    // Get page dimensions
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Convert screen coordinates to PDF coordinates
    // Screen: top-left origin, PDF: bottom-left origin
    const scaleX = pageWidth / signature.containerWidth;
    const scaleY = pageHeight / signature.containerHeight;

    const pdfX = signature.x * scaleX;
    const pdfWidth = signature.width * scaleX;
    const pdfHeight = signature.height * scaleY;
    // Y is inverted: convert from top-origin to bottom-origin
    const pdfY = pageHeight - (signature.y * scaleY) - pdfHeight;

    // Convert data URL to bytes
    const base64Data = signature.dataUrl.split(',')[1];
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Embed the PNG image
    const pngImage = await pdfDoc.embedPng(imageBytes);

    // Draw on the page
    page.drawImage(pngImage, {
        x: pdfX,
        y: pdfY,
        width: pdfWidth,
        height: pdfHeight,
    });
}

/**
 * Trigger browser download of PDF bytes
 */
export function downloadPdf(bytes: Uint8Array, filename: string): void {
    // Create a copy to ensure we have a proper ArrayBuffer (not SharedArrayBuffer)
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/**
 * Get all form field names from a PDF
 */
export async function getFieldNames(pdfBytes: ArrayBuffer): Promise<string[]> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    return form.getFields().map(field => field.getName());
}
