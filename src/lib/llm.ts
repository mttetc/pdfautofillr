/**
 * Module LLM pour l'analyse des formulaires PDF
 */
import OpenAI from 'openai';
import type { DetectedField } from '@/types';

// Type for PDF field info from client
export interface PdfFieldInfo {
    name: string;
    type: string;
    alternativeText?: string;
}

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

function buildSystemPrompt(userContext: string, fieldsInfo: PdfFieldInfo[], pdfText: string): string {
    // Detect form language/country from PDF text
    const isFrench = /déclaration|formulaire|compte|étranger|impôts|cerfa/i.test(pdfText);
    const formCountry = isFrench ? 'French/European' : 'Unknown';

    // Filter to only fields with meaningful labels (not garbled text)
    const meaningfulFields = fieldsInfo.filter(f => {
        if (!f.alternativeText) return false;
        // Skip garbled text (contains control characters)
        if (/[\x00-\x1F]/.test(f.alternativeText)) return false;
        // Skip very short or generic labels
        if (f.alternativeText.length < 5) return false;
        return true;
    });

    // Categorize fields - only institution/account related
    const institutionFields = meaningfulFields.filter(f => {
        const label = f.alternativeText?.toLowerCase() || '';
        return label.includes('organisme') ||
            label.includes('établissement') ||
            label.includes('psan') ||
            label.includes('gestionnaire') ||
            label.includes('désignation') ||
            label.includes('raison sociale') ||
            label.includes('url') ||
            label.includes('actifs numériques') ||
            label.includes('compte bancaire') ||
            label.includes('caractéristiques') ||
            (label.includes('adresse') && (label.includes('organisme') || label.includes('gestionnaire')));
    });

    const fieldsList = institutionFields.map(f => {
        const type = f.type === 'checkbox' ? '[CHECKBOX]' : '[TEXT]';
        return `- ${f.name} ${type}: "${f.alternativeText}"`;
    }).join('\n');

    return `You are an expert at filling administrative forms.

FORM ORIGIN: ${formCountry}
USER CONTEXT: "${userContext}"

YOUR TASK:
1. Identify the company/service mentioned in the context (e.g., "Coinbase", "Binance", "Revolut")
2. Use YOUR KNOWLEDGE to find the correct legal entity for this form's country:
   - For French/European forms → use the EUROPEAN subsidiary of the company
   - Find the official company name, headquarters address, and country
3. Fill ONLY fields related to the INSTITUTION/ORGANIZATION (not personal info)

AVAILABLE FIELDS (institution-related only):
${fieldsList}

DO NOT FILL:
- Personal fields (declarant's name, address, email)
- Account numbers, amounts, dates
- Tax IDs like SIRET (those are for the declarant, not the institution)

FILL WITH YOUR KNOWLEDGE:
- Organization name → official legal name of the European entity
- Organization address → European headquarters address
- URL if requested
- Checkboxes matching the account type (crypto = "actifs numériques" = true)

RESPOND IN JSON ONLY:
{"fields": [{"name": "FIELD_NAME", "value": "VALUE"}]}`;
}

export async function analyzeFormWithLLM(
    pdfText: string,
    context: string = '',
    fieldsInfo: PdfFieldInfo[] = []
): Promise<DetectedField[]> {
    try {
        console.log('📋 PDF fields info:', fieldsInfo.slice(0, 10), '... (total:', fieldsInfo.length, ')');

        const response = await getClient().chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: buildSystemPrompt(context, fieldsInfo, pdfText) },
                {
                    role: 'user',
                    content: `Voici le texte du formulaire. Analyse-le et remplis les champs appropriés:\n\n${pdfText.slice(0, 8000)}`,
                },
            ],
            temperature: 0,
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        console.log('📝 LLM raw response:', content);
        if (!content) throw new Error('Réponse vide');

        const parsed = JSON.parse(content);
        const fields = parsed.fields || [];
        console.log('✅ Fields to fill:', fields.length);

        // Map to DetectedField format
        return fields.map((f: Record<string, unknown>) => {
            const fieldName = String(f.name || f.id || '');
            const fieldInfo = fieldsInfo.find(fi => fi.name === fieldName);
            return {
                id: fieldName,
                name: fieldName,
                label: fieldName,
                type: fieldInfo?.type || 'text',
                suggestedValue: f.value !== null && f.value !== undefined ? String(f.value) : null,
                confidence: 0.9,
            };
        });
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
