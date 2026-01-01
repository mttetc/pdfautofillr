'use client';

import {
    Button,
    Chip,
    Progress,
    Accordion,
    AccordionItem,
    CircularProgress,
    Tooltip,
    ScrollShadow
} from '@heroui/react';
import type { DetectedField } from '@/types';

interface FieldListProps {
    fields: DetectedField[];
    onAutoFill: () => void;
    isAutoFilling: boolean;
}

export function FieldList({ fields, onAutoFill, isAutoFilling }: FieldListProps) {
    const filledFields = fields.filter((f) => f.suggestedValue !== null);
    const emptyFields = fields.filter((f) => f.suggestedValue === null);
    const fillablePercentage = (filledFields.length / fields.length) * 100;

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm mb-1 px-1">
                    <span className="text-default-500 font-medium tracking-wide text-xs uppercase">Confidence Score</span>
                    <span className="text-success-400 font-mono">{Math.round(fillablePercentage)}%</span>
                </div>
                <Progress
                    aria-label="Taux de remplissage"
                    value={fillablePercentage}
                    classNames={{
                        indicator: "bg-gradient-to-r from-blue-500 to-purple-500",
                        track: "bg-default-500/20",
                    }}
                    size="sm"
                />
            </div>

            <ScrollShadow className="flex-1 -mx-2 px-2 pb-4">
                <Accordion
                    selectionMode="multiple"
                    defaultExpandedKeys={['filled', 'empty']}
                    variant="light"
                    className="px-0 gap-4"
                    itemClasses={{
                        title: "text-default-300 text-sm font-medium",
                        subtitle: "text-default-500 text-xs",
                        trigger: "py-2",
                        content: "pb-2",
                        indicator: "text-default-400"
                    }}
                >
                    <AccordionItem
                        key="filled"
                        aria-label="Champs remplis"
                        title={
                            <div className="flex items-center gap-2">
                                <span className="text-success-400">●</span>
                                <span>Champs détectés</span>
                                <Chip size="sm" classNames={{ base: "bg-success-500/20 border border-success-500/20 h-5", content: "text-success-400 text-[10px] font-bold" }}>{filledFields.length}</Chip>
                            </div>
                        }
                    >
                        <div className="grid gap-2">
                            {filledFields.map((field) => (
                                <FieldItem key={field.id} field={field} isFilled />
                            ))}
                        </div>
                    </AccordionItem>

                    <AccordionItem
                        key="empty"
                        aria-label="Champs manuels"
                        title={
                            <div className="flex items-center gap-2">
                                <span className="text-default-400">○</span>
                                <span>Champs manuels</span>
                                <Chip size="sm" classNames={{ base: "bg-default-500/20 border border-default-500/20 h-5", content: "text-default-400 text-[10px] font-bold" }}>{emptyFields.length}</Chip>
                            </div>
                        }
                    >
                        <div className="grid gap-2">
                            {emptyFields.map((field) => (
                                <FieldItem key={field.id} field={field} isFilled={false} />
                            ))}
                        </div>
                    </AccordionItem>
                </Accordion>
            </ScrollShadow>

            <div className="mt-auto pt-4 border-t border-white/5">
                <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow-none border border-white/10"
                    size="lg"
                    onPress={onAutoFill}
                    isDisabled={isAutoFilling || filledFields.length === 0}
                    isLoading={isAutoFilling}
                >
                    Appliquer les valeurs ({filledFields.length})
                </Button>
            </div>
        </div>
    );
}

function FieldItem({ field, isFilled }: { field: DetectedField; isFilled: boolean }) {
    const confidenceColor = field.confidence > 0.8 ? 'success' : field.confidence > 0.5 ? 'warning' : 'danger';

    // Couleurs adaptées dark mode
    const itemClasses = isFilled
        ? "bg-default-50/10 border-success-500/20 hover:border-success-500/40"
        : "bg-default-50/5 border-white/5 hover:border-white/10 opacity-70";

    return (
        <div
            className={`border rounded-xl p-3 transition-all duration-200 ${itemClasses} group`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-200 truncate">{field.label || field.name}</span>
                        {field.type !== 'text' && (
                            <span className="text-[10px] uppercase text-default-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{field.type}</span>
                        )}
                    </div>

                    {isFilled && field.suggestedValue ? (
                        <div className="text-sm text-success-300 font-mono truncate pl-0.5 opacity-90 group-hover:opacity-100 transition-opacity">
                            {field.suggestedValue}
                        </div>
                    ) : (
                        <div className="text-xs text-default-500 italic pl-0.5">
                            Manquant
                        </div>
                    )}
                </div>

                <Tooltip content={`Confiance : ${Math.round(field.confidence * 100)}%`} classNames={{ content: "bg-background border border-white/10 text-xs" }}>
                    <div className="flex items-center justify-center pt-1">
                        <CircularProgress
                            value={field.confidence * 100}
                            color={confidenceColor}
                            size="sm"
                            classNames={{
                                svg: "w-6 h-6",
                                track: "stroke-white/10",
                                indicator: isFilled ? "stroke-success-500" : "stroke-default-500",
                            }}
                            aria-label="Score"
                        />
                    </div>
                </Tooltip>
            </div>
        </div>
    );
}
