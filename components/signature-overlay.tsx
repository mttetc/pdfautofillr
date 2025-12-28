'use client';

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@heroui/react';

export interface SignaturePosition {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface SignatureOverlayRef {
    getPosition: () => SignaturePosition;
}

interface Props {
    imageUrl: string;
    onRemove: () => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

export const SignatureOverlay = forwardRef<SignatureOverlayRef, Props>(
    ({ imageUrl, onRemove, containerRef }, ref) => {
        const [position, setPosition] = useState({ x: 50, y: 50 });
        const [size, setSize] = useState({ width: 150, height: 60 });
        const [isDragging, setIsDragging] = useState(false);
        const [isResizing, setIsResizing] = useState(false);
        const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
        const overlayRef = useRef<HTMLDivElement>(null);

        // Expose position via ref
        useImperativeHandle(ref, () => ({
            getPosition: () => ({
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
            }),
        }), [position, size]);

        const handleMouseDown = useCallback((e: React.MouseEvent) => {
            if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
            e.preventDefault();
            setIsDragging(true);
            const rect = overlayRef.current?.getBoundingClientRect();
            if (rect) {
                setDragOffset({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                });
            }
        }, []);

        const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsResizing(true);
        }, []);

        useEffect(() => {
            const handleMouseMove = (e: MouseEvent) => {
                const container = containerRef.current;
                if (!container) return;
                const containerRect = container.getBoundingClientRect();

                if (isDragging) {
                    const newX = e.clientX - containerRect.left - dragOffset.x;
                    const newY = e.clientY - containerRect.top - dragOffset.y;

                    setPosition({
                        x: Math.max(0, Math.min(newX, containerRect.width - size.width)),
                        y: Math.max(0, Math.min(newY, containerRect.height - size.height)),
                    });
                }

                if (isResizing) {
                    const newWidth = e.clientX - containerRect.left - position.x;
                    const newHeight = e.clientY - containerRect.top - position.y;

                    setSize({
                        width: Math.max(80, Math.min(newWidth, 400)),
                        height: Math.max(30, Math.min(newHeight, 200)),
                    });
                }
            };

            const handleMouseUp = () => {
                setIsDragging(false);
                setIsResizing(false);
            };

            if (isDragging || isResizing) {
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            }

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }, [isDragging, isResizing, dragOffset, position, size, containerRef]);

        return (
            <div
                ref={overlayRef}
                className="absolute cursor-move select-none group z-10"
                style={{
                    left: position.x,
                    top: position.y,
                    width: size.width,
                    height: size.height,
                }}
                onMouseDown={handleMouseDown}
            >
                {/* Border visible on hover */}
                <div className="absolute inset-0 border-2 border-dashed border-blue-500/50 group-hover:border-blue-500 rounded transition-colors" />

                {/* Signature image */}
                <img
                    src={imageUrl}
                    alt="Signature"
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                />

                {/* Resize handle */}
                <div
                    className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-blue-500 rounded-tl opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={handleResizeMouseDown}
                />

                {/* Remove button */}
                <Button
                    isIconOnly
                    size="sm"
                    color="danger"
                    variant="solid"
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity min-w-6 w-6 h-6"
                    onPress={onRemove}
                >
                    ✕
                </Button>
            </div>
        );
    }
);

SignatureOverlay.displayName = 'SignatureOverlay';
