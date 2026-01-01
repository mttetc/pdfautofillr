import { createServerFn } from '@tanstack/react-start';
import { extractTextFromPdf } from '@/lib/pdf';
import { detectDocumentContext, analyzeFormWithLLM } from '@/lib/llm';

export const analyzeDocument = createServerFn({ method: 'POST' })
    .inputValidator((data) => {
        if (!(data instanceof FormData)) {
            throw new Error('Expected FormData');
        }
        const file = data.get('file') as File | null;
        const context = data.get('context')?.toString() || '';

        if (!file) {
            throw new Error('Aucun fichier fourni');
        }

        return { file, context };
    })
    .handler(async ({ data }) => {
        try {
            const { file, context: userContext } = data;

            // Extract text from PDF
            const buffer = await file.arrayBuffer();
            const pdfText = await extractTextFromPdf(buffer);

            if (!pdfText.trim()) {
                throw new Error("Impossible d'extraire le texte du PDF");
            }

            // Auto-detect context if not provided
            let context = userContext;
            if (!context) {
                const detected = await detectDocumentContext(pdfText);
                context = detected || '';
            }

            // Analyze form with LLM
            const fields = await analyzeFormWithLLM(pdfText, context);

            return {
                success: true,
                context,
                fields,
            };
        } catch (error) {
            console.error('Erreur analyse:', error);

            if (error instanceof Error && error.message === 'CREDIT_EXHAUSTED') {
                throw new Error('CREDIT_EXHAUSTED');
            }

            throw new Error("Erreur lors de l'analyse");
        }
    });
