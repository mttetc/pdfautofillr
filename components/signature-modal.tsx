'use client';

import { useRef, useState, useEffect } from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
} from '@heroui/react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (signatureDataUrl: string) => void;
}

export function SignatureModal({ isOpen, onClose, onConfirm }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        if (isOpen && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { alpha: true });
            if (ctx) {
                // Clear with transparent background
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // Anti-aliasing settings
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }
            setHasSignature(false);
        }
    }, [isOpen]);

    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
        };
    };

    const startDrawing = (x: number, y: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (x: number, y: number) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        ctx.lineTo(x, y);
        ctx.stroke();
        setHasSignature(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getMousePos(e);
        startDrawing(pos.x, pos.y);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getMousePos(e);
        draw(pos.x, pos.y);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const pos = getTouchPos(e);
        startDrawing(pos.x, pos.y);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const pos = getTouchPos(e);
        draw(pos.x, pos.y);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        // Clear with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const handleConfirm = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Export as PNG data URL
        const dataUrl = canvas.toDataURL('image/png');
        onConfirm(dataUrl);
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
        >
            <ModalContent>
                {() => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 text-gray-100">
                            ✍️ Dessiner votre signature
                        </ModalHeader>
                        <ModalBody className="py-6">
                            <p className="text-gray-400 text-sm mb-4">
                                Dessinez votre signature dans le cadre ci-dessous avec la souris ou le doigt.
                            </p>

                            {/* Checkered background to show transparency */}
                            <div
                                className="relative rounded-lg overflow-hidden border border-white/20"
                                style={{
                                    backgroundImage: 'linear-gradient(45deg, #e0e0e0 25%, transparent 25%), linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e0e0e0 75%), linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)',
                                    backgroundSize: '20px 20px',
                                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                                    backgroundColor: '#fff',
                                }}
                            >
                                <canvas
                                    ref={canvasRef}
                                    width={450}
                                    height={200}
                                    className="cursor-crosshair touch-none"
                                    style={{ background: 'transparent' }}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={stopDrawing}
                                />
                            </div>

                            <div className="flex justify-end mt-2">
                                <Button
                                    size="sm"
                                    variant="light"
                                    className="text-danger-400"
                                    onPress={clearCanvas}
                                >
                                    Effacer
                                </Button>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="danger" variant="light" onPress={onClose} className="text-danger-400">
                                Annuler
                            </Button>
                            <Button
                                color="success"
                                onPress={handleConfirm}
                                isDisabled={!hasSignature}
                            >
                                Valider la signature
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
