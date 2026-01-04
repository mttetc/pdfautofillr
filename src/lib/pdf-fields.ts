/**
 * PDF field extraction utilities
 * Extracts form fields with their labels from PDF documents
 */
import { pdfjs } from 'react-pdf';

export interface PdfFieldInfo {
    name: string;
    type: 'text' | 'checkbox' | 'radio' | 'select';
    alternativeText?: string;
}

interface TextItem {
    text: string;
    x: number;
    y: number;
}

/**
 * Check if text is a meaningful label (not dots, colons, or date keywords)
 */
function isMeaningfulLabel(text: string): boolean {
    if (/^[.\s:]+$/.test(text)) return false;
    if (/^\.{3,}/.test(text)) return false;
    if (text.length < 3) return false;
    if (['jour', 'mois', 'année', 'an'].includes(text.toLowerCase())) return false;
    return true;
}

/**
 * Find the nearest meaningful text label for a field position
 */
function findNearestLabel(
    textItems: TextItem[],
    fieldX: number,
    fieldY: number
): string {
    let nearestLabel = '';
    let minDistance = Infinity;

    for (const item of textItems) {
        if (!isMeaningfulLabel(item.text)) continue;

        const dx = fieldX - item.x;
        const dy = fieldY - item.y;

        // Text should be to the left or above the field
        if (dx > -10 && dx < 400 && dy > -30 && dy < 50) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance) {
                minDistance = distance;
                nearestLabel = item.text;
            }
        }
    }

    return nearestLabel;
}

/**
 * Determine field type from annotation
 */
function getFieldType(annotation: { checkBox?: boolean; radioButton?: boolean; comboBox?: boolean }): PdfFieldInfo['type'] {
    if (annotation.checkBox) return 'checkbox';
    if (annotation.radioButton) return 'radio';
    if (annotation.comboBox) return 'select';
    return 'text';
}

/**
 * Extract all form fields with their labels from a PDF
 */
export async function extractPdfFields(file: File): Promise<PdfFieldInfo[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const fields: PdfFieldInfo[] = [];
    const seenNames = new Set<string>();

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const annotations = await page.getAnnotations();
        const textContent = await page.getTextContent();

        // Extract text items with positions
        const textItems: TextItem[] = [];
        for (const item of textContent.items) {
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

        // Extract form fields
        for (const annotation of annotations) {
            if (annotation.subtype === 'Widget' && annotation.fieldName) {
                if (seenNames.has(annotation.fieldName)) continue;
                seenNames.add(annotation.fieldName);

                const rect = annotation.rect;
                const nearestLabel = findNearestLabel(textItems, rect[0], rect[1]);

                fields.push({
                    name: annotation.fieldName,
                    type: getFieldType(annotation),
                    alternativeText: nearestLabel || annotation.alternativeText || undefined,
                });
            }
        }
    }

    return fields;
}
