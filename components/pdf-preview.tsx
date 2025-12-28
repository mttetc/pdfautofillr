'use client';

import dynamic from 'next/dynamic';
import { Card, CardBody, Spinner } from '@heroui/react';

const PDFViewer = dynamic(() => import('./pdf-viewer-inner'), {
    ssr: false,
    loading: () => (
        <Card>
            <CardBody className="flex items-center justify-center h-96">
                <Spinner size="lg" label="Chargement..." />
            </CardBody>
        </Card>
    ),
});

interface PdfPreviewProps {
    file: File;
}

export function PdfPreview({ file }: PdfPreviewProps) {
    return <PDFViewer file={file} />;
}
