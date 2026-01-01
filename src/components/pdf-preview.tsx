'use client';

import { lazy, Suspense } from 'react';
import { Card, CardBody, Spinner } from '@heroui/react';

const PDFViewer = lazy(() => import('./pdf-viewer-inner'));

interface PdfPreviewProps {
    file: File;
}

export function PdfPreview({ file }: PdfPreviewProps) {
    return (
        <Suspense
            fallback={
                <Card>
                    <CardBody className="flex items-center justify-center h-96">
                        <Spinner size="lg" label="Chargement..." />
                    </CardBody>
                </Card>
            }
        >
            <PDFViewer file={file} />
        </Suspense>
    );
}
