/**
 * Utilitaires pour l'extraction de texte PDF côté serveur
 * Utilise unpdf pour Node.js (pas de dépendance DOM)
 */
import { extractText, getDocumentProxy } from 'unpdf';

/**
 * Extrait le texte d'un PDF (côté serveur)
 */
export async function extractTextFromPdf(pdfBuffer: ArrayBuffer): Promise<string> {
    const { text } = await extractText(pdfBuffer, { mergePages: true });
    return text;
}

/**
 * Compte le nombre de pages d'un PDF
 */
export async function getPdfPageCount(pdfBuffer: ArrayBuffer): Promise<number> {
    const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
    return pdf.numPages;
}
