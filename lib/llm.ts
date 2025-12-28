/**
 * Module LLM pour l'analyse des formulaires PDF
 */
import OpenAI from 'openai';
import type { DetectedField } from '@/types';

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
    if (!openaiClient) {
        openaiClient = new OpenAI({
            apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY,
            baseURL: process.env.LLM_BASE_URL,
        });
    }
    return openaiClient;
}

const MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

const BLOCKED_PATTERNS = [
    /ignore|oublie|forget/i,
    /jailbreak|bypass|hack|exploit/i,
    /écris un|write a|raconte|tell me/i,
    /code python|javascript|script/i,
    /fais semblant|pretend|act as/i,
];

export function validateUserPrompt(prompt: string): { valid: boolean; reason?: string } {
    if (prompt.length < 5) {
        return { valid: false, reason: 'Description trop courte' };
    }
    if (prompt.length > 500) {
        return { valid: false, reason: 'Description trop longue' };
    }

    for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(prompt)) {
            return { valid: false, reason: 'Demande non valide pour ce contexte' };
        }
    }

    return { valid: true };
}

export async function detectDocumentContext(pdfText: string): Promise<string | null> {
    if (!pdfText.trim()) return null;

    try {
        const response = await getClient().chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: `Identifie le type de document. Réponds avec le type en une phrase courte.
Exemples: "Déclaration de compte bancaire étranger", "Formulaire CERFA", "Contrat de travail".
Si incertain, réponds "UNKNOWN".`,
                },
                {
                    role: 'user',
                    content: `Type de ce document ?\n\n${pdfText.slice(0, 1500)}`,
                },
            ],
            temperature: 0,
            max_tokens: 80,
        });

        const content = response.choices[0]?.message?.content?.trim();
        return content && content !== 'UNKNOWN' ? content : null;
    } catch (error) {
        console.error('Erreur détection contexte:', error);
        return null;
    }
}

const today = () => new Date().toLocaleDateString('fr-FR');

function buildSystemPrompt(userContext: string): string {
    return `Tu analyses des formulaires PDF et retournes un JSON avec les champs à remplir.

CONTEXTE UTILISATEUR: ${userContext}

RÈGLES pour "value":
1. SI l'utilisateur a fourni des infos personnelles dans le contexte (nom, prénom, âge, adresse, email, etc.), UTILISE-LES pour remplir les champs correspondants
2. Si aucune info perso fournie → null pour: nom, prénom, adresse, email, téléphone, IBAN, n° sécu, signature, montants
3. Toujours suggérer: dates (${today()}), cases à cocher (false par défaut), pays ("France" si contexte FR)

EXEMPLES d'extraction du contexte:
- "je m'appelle Jean Dupont" → champ nom: "Jean Dupont"  
- "j'ai 35 ans" → champ âge: "35"
- "j'habite 12 rue de Paris" → champ adresse: "12 rue de Paris"

FORMAT JSON requis:
{"fields": [{"id": "slug", "label": "Nom affiché", "type": "text|date|checkbox", "value": null|"valeur", "confidence": 0.9}]}`;
}

export async function analyzeFormWithLLM(
    pdfText: string,
    context: string = ''
): Promise<DetectedField[]> {
    try {
        const response = await getClient().chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: buildSystemPrompt(context) },
                {
                    role: 'user',
                    content: `Analyse ce formulaire:\n\n${pdfText.slice(0, 6000)}`,
                },
            ],
            temperature: 0,
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('Réponse vide');

        const parsed = JSON.parse(content);
        return (parsed.fields || []).map((f: Record<string, unknown>) => ({
            id: String(f.id || ''),
            name: String(f.id || f.name || ''),
            label: String(f.label || ''),
            type: String(f.type || 'text'),
            suggestedValue: f.value ? String(f.value) : null,
            confidence: Number(f.confidence || 0.5),
        }));
    } catch (error) {
        console.error('Erreur LLM:', error);

        if (error instanceof Error) {
            const msg = error.message.toLowerCase();
            if (msg.includes('quota') || msg.includes('rate') || msg.includes('billing')) {
                throw new Error('CREDIT_EXHAUSTED');
            }
        }

        throw new Error('Analyse impossible');
    }
}
