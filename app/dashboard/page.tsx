'use client';

import { useState } from 'react';
import { PdfUploader } from "@/components/pdf-uploader";
import PdfViewer from "@/components/pdf-viewer";
import { title } from "@/components/primitives";

export default function DashboardPage() {
    const [file, setFile] = useState<File | null>(null);

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile);
    };

    if (file) {
        return (
            <div className="h-[calc(100vh-4rem)] w-full p-4">
                <PdfViewer file={file} />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
            <div className="inline-block max-w-xl text-center justify-center">
                <span className={title()}>Upload your&nbsp;</span>
                <span className={title({ color: "violet" })}>PDF&nbsp;</span>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-4xl mt-8">
                <PdfUploader onFileSelect={handleFileSelect} />
            </div>
        </div>
    );
}
