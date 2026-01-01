'use client';

import { Thumbnail } from 'react-pdf';

interface Props {
    numPages: number;
    selectedPage: number;
    onSelectPage: (pageIndex: number) => void;
    file: File;
}

export function PageThumbnails({ numPages, selectedPage, onSelectPage }: Props) {
    return (
        <div className="flex flex-col gap-2 overflow-y-auto p-2 bg-content2/50 rounded-lg">
            {Array.from({ length: numPages }, (_, index) => (
                <button
                    key={`thumb_${index}`}
                    type="button"
                    onClick={() => onSelectPage(index)}
                    className={`
                        relative rounded-md overflow-hidden transition-all duration-200
                        hover:ring-2 hover:ring-primary/50
                        ${selectedPage === index
                            ? 'ring-2 ring-primary shadow-lg shadow-primary/20'
                            : 'ring-1 ring-white/10'
                        }
                    `}
                >
                    {/* Page number badge */}
                    <span className={`
                        absolute top-1 left-1 z-10 text-xs font-medium px-1.5 py-0.5 rounded
                        ${selectedPage === index
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-black/50 text-white/80'
                        }
                    `}>
                        {index + 1}
                    </span>

                    {/* Thumbnail */}
                    <Thumbnail
                        pageNumber={index + 1}
                        width={80}
                        className="pointer-events-none"
                    />
                </button>
            ))}
        </div>
    );
}
