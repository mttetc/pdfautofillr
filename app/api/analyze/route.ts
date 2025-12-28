import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPdf } from '@/lib/pdf';
import { detectDocumentContext, analyzeFormWithLLM } from '@/lib/llm';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const userContext = formData.get('context') as string || '';

        if (!file) {
            return NextResponse.json(
                { error: 'Aucun fichier fourni' },
                { status: 400 }
            );
        }

        // Extract text from PDF
        const buffer = await file.arrayBuffer();
        const pdfText = await extractTextFromPdf(buffer);

        if (!pdfText.trim()) {
            return NextResponse.json(
                { error: 'Impossible d\'extraire le texte du PDF' },
                { status: 400 }
            );
        }

        // Auto-detect context if not provided
        let context = userContext;
        if (!context) {
            const detected = await detectDocumentContext(pdfText);
            context = detected || '';
        }

        // Analyze form with LLM
        const fields = await analyzeFormWithLLM(pdfText, context);

        return NextResponse.json({
            success: true,
            context,
            fields,
        });
    } catch (error) {
        console.error('Erreur analyse:', error);

        if (error instanceof Error && error.message === 'CREDIT_EXHAUSTED') {
            return NextResponse.json(
                { error: 'CREDIT_EXHAUSTED' },
                { status: 402 }
            );
        }

        return NextResponse.json(
            { error: 'Erreur lors de l\'analyse' },
            { status: 500 }
        );
    }
}
