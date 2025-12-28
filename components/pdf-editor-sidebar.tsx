'use client';

import { Button, Chip, Divider } from '@heroui/react';

interface Props {
    fileName: string;
    fieldCount: number;
    onExport: () => void;
    onMagicFill: () => void;
    onSignature: () => void;
    isExporting?: boolean;
    isAnalyzing?: boolean;
}

export default function PdfEditorSidebar({
    fileName,
    fieldCount,
    onExport,
    onMagicFill,
    onSignature,
    isExporting,
    isAnalyzing
}: Props) {
    return (
        <div className="w-64 shrink-0 flex flex-col gap-4 p-4 bg-black/20 backdrop-blur-sm rounded-xl border border-white/5">
            {/* File Info */}
            <div className="flex flex-col gap-2">
                <span className="text-xs text-white/50 uppercase tracking-wider">Document</span>
                <span className="text-sm text-white/90 truncate" title={fileName}>
                    {fileName}
                </span>
            </div>

            <Divider className="bg-white/10" />

            {/* Field Count */}
            <div className="flex flex-col gap-2">
                <span className="text-xs text-white/50 uppercase tracking-wider">Champs de formulaire</span>
                <Chip
                    size="sm"
                    variant="flat"
                    classNames={{
                        base: "bg-violet-500/20 border border-violet-500/30",
                        content: "text-violet-300"
                    }}
                >
                    {fieldCount} champs détectés
                </Chip>
            </div>

            <Divider className="bg-white/10" />

            {/* Magic AI Button */}
            <div className="flex flex-col gap-2">
                <span className="text-xs text-white/50 uppercase tracking-wider">Remplissage IA</span>
                <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-900/30 border border-white/10 font-semibold"
                    onPress={onMagicFill}
                    isLoading={isAnalyzing}
                    startContent={!isAnalyzing && <span className="text-lg">✨</span>}
                >
                    {isAnalyzing ? 'Analyse en cours...' : 'Remplir avec l\'IA'}
                </Button>
            </div>

            <Divider className="bg-white/10" />

            {/* Signature Button */}
            <div className="flex flex-col gap-2">
                <span className="text-xs text-white/50 uppercase tracking-wider">Signature</span>
                <Button
                    variant="bordered"
                    className="w-full border-white/20 text-white/80 hover:bg-white/5"
                    onPress={onSignature}
                    startContent={<span className="text-lg">✍️</span>}
                >
                    Dessiner une signature
                </Button>
            </div>

            <Divider className="bg-white/10" />

            {/* Export Button */}
            <Button
                color="success"
                size="lg"
                className="w-full font-semibold"
                onPress={onExport}
                isLoading={isExporting}
            >
                {isExporting ? 'Export en cours...' : 'Terminé'}
            </Button>
        </div>
    );
}
