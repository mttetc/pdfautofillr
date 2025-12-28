'use client';

import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Textarea,
    Chip,
    Alert,
} from '@heroui/react';
import { useState } from 'react';

interface ContextModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (context: string) => void;
    detectedContext: string | null;
    isLoading: boolean;
}

export function ContextModal({
    isOpen,
    onClose,
    onConfirm,
    detectedContext,
    isLoading,
}: ContextModalProps) {
    const [userContext, setUserContext] = useState('');

    const handleConfirm = () => {
        onConfirm(userContext.trim() || detectedContext || '');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            backdrop="blur"
            classNames={{
                base: "bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 shadow-2xl",
                header: "border-b border-white/5",
                footer: "border-t border-white/5",
                closeButton: "hover:bg-white/5 active:bg-white/10",
            }}
            motionProps={{
                variants: {
                    enter: {
                        y: 0,
                        opacity: 1,
                        transition: {
                            duration: 0.3,
                            ease: "easeOut",
                        },
                    },
                    exit: {
                        y: -20,
                        opacity: 0,
                        transition: {
                            duration: 0.2,
                            ease: "easeIn",
                        },
                    },
                }
            }}
        >
            <ModalContent>
                {() => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 text-gray-100">
                            ⚡️ Définir le contexte
                        </ModalHeader>
                        <ModalBody className="py-6">
                            {detectedContext && (
                                <div className="bg-success-500/10 border border-success-500/20 rounded-xl p-3 mb-4">
                                    <p className="text-xs text-success-400 font-bold uppercase tracking-wide mb-1">
                                        Détecté automatiquement
                                    </p>
                                    <p className="text-success-100">{detectedContext}</p>
                                </div>
                            )}

                            <p className="text-gray-400 text-sm mb-2">
                                Aidez l'IA en précisant le type de document (ex: "Facture EDF", "Bulletion de paie").
                            </p>

                            <Textarea
                                placeholder="Ex: Déclaration de compte bancaire..."
                                value={userContext}
                                onValueChange={setUserContext}
                                minRows={3}
                                variant="bordered"
                                classNames={{
                                    input: "text-gray-200 placeholder:text-gray-600",
                                    inputWrapper: "bg-white/5 border-white/10 hover:border-white/20 focus-within:!border-primary-500/50"
                                }}
                            />

                            <div className="flex flex-wrap gap-2 mt-2">
                                <Chip
                                    variant="flat"
                                    className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400"
                                    onClick={() => setUserContext('Compte étranger')}
                                >
                                    Compte étranger
                                </Chip>
                                <Chip
                                    variant="flat"
                                    className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400"
                                    onClick={() => setUserContext('Formulaire CERFA')}
                                >
                                    CERFA
                                </Chip>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="danger" variant="light" onPress={onClose} className="text-danger-400">
                                Annuler
                            </Button>
                            <Button
                                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-900/20 border border-white/10"
                                onPress={handleConfirm}
                                isLoading={isLoading}
                                isDisabled={!detectedContext && !userContext.trim()}
                            >
                                Lancer l'analyse
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
