import { PDFDocument } from 'pdf-lib';

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

            if (fieldType === 'PDFTextField') {
                const textField = form.getTextField(fieldName);
                textField.setText(value);
            } else if (fieldType === 'PDFCheckBox') {
                const checkBox = form.getCheckBox(fieldName);
                if (value === 'true' || value === 'on') {
                    checkBox.check();
                } else {
                    checkBox.uncheck();
                }
            } else if (fieldType === 'PDFDropdown') {
                const dropdown = form.getDropdown(fieldName);
                dropdown.select(value);
            } else if (fieldType === 'PDFRadioGroup') {
                const radioGroup = form.getRadioGroup(fieldName);
                radioGroup.select(value);
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
