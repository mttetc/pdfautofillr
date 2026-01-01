'use client';

import { useCallback, useState } from 'react';
import { Card, CardBody } from '@heroui/react';

interface PdfUploaderProps {
    onFileSelect: (file: File) => void;
    isDisabled?: boolean;
}

export function PdfUploader({ onFileSelect, isDisabled }: PdfUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file?.type === 'application/pdf') {
                onFileSelect(file);
            } else {
                alert('Veuillez déposer un fichier PDF');
            }
        },
        [onFileSelect]
    );

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                onFileSelect(file);
            }
        },
        [onFileSelect]
    );

    return (
        <Card
            className={`
        border border-dashed transition-all duration-300 cursor-pointer h-80
        ${isDragging
                    ? 'border-primary-500 bg-primary-500/10 shadow-[0_0_30px_rgba(0,111,238,0.2)]'
                    : 'border-default-200/20 hover:border-primary-500/50 bg-default-100/5 hover:bg-default-100/10'
                }
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        shadow-none backdrop-blur-sm
      `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <CardBody className="flex items-center justify-center relative bg-transparent">
                <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    disabled={isDisabled}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                />

                <div className="space-y-6 text-center">
                    <div className={`mx-auto w-20 h-20 rounded-3xl flex items-center justify-center transition-colors duration-300 ${isDragging ? 'bg-primary-500/20 text-primary-400' : 'bg-default-100/10 text-default-500'}`}>
                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13a1.5 1.5 0 1 1 0 3H8v2H6.5v-7H8.5zm6 0a2.5 2.5 0 0 1 0 5H13v-7h1.5a2.5 2.5 0 0 1 0 5zm-6 1H8v1h.5a.5.5 0 0 0 0-1zm6 0H13v3h1.5a1.5 1.5 0 0 0 0-3z" />
                        </svg>
                    </div>

                    <div>
                        <p className="text-xl font-semibold text-default-800 dark:text-gray-200">
                            Glissez votre PDF ici
                        </p>
                        <p className="text-sm text-default-500 mt-2">
                            ou cliquez pour parcourir vos fichiers
                        </p>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}
