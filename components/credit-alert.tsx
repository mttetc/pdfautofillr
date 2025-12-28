'use client';

import { Alert } from '@heroui/react';

interface CreditAlertProps {
    isVisible: boolean;
    message?: string;
}

export function CreditAlert({ isVisible, message }: CreditAlertProps) {
    if (!isVisible) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 p-4 flex justify-center pointer-events-none">
            <div className="pointer-events-auto max-w-lg w-full shadow-2xl shadow-danger-500/20">
                <Alert
                    color="danger"
                    title="Crédits épuisés"
                    description={message || "Configurez votre clé API OpenAI pour continuer."}
                    variant="flat"
                    className="bg-danger-500/10 border border-danger-500/50 backdrop-blur-xl text-danger-200"
                />
            </div>
        </div>
    );
}
