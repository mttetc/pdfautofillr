/**
 * Types pour l'application PDF Auto-Fill
 */
import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

// Champ détecté par le LLM
export interface DetectedField {
  id: string;          // Slug unique
  name: string;        // Nom interne du champ PDF (si détecté)
  label: string;       // Libellé lisible
  type: 'text' | 'date' | 'checkbox' | 'select' | string;
  suggestedValue: string | null;  // null = donnée personnelle, ne pas remplir
  confidence: number;  // 0-1
}

// Réponse de l'API d'analyse
export interface AnalyzeResponse {
  fields: DetectedField[];
  pageCount: number;
}
