import { cn, Button } from '@repo/ui';
import { IconDownload, IconExternalLink } from '@tabler/icons-react';

export type ImageGenerationImage = {
    id: string;
    mediaType?: string;
    dataUrl?: string;
    url?: string | null;
};

export type ImageGenerationResultData = {
    type: 'image-generation';
    summary?: string;
    images: ImageGenerationImage[];
};

export const ImageGenerationResult = ({
    result,
    className,
}: {
    result: ImageGenerationResultData;
    className?: string;
}) => {
    if (!result?.images?.length) {
        return null;
    }

    return (
        <div className={cn('space-y-3', className)}>
            {result.summary && (
                <p className="text-muted-foreground text-sm leading-snug">{result.summary}</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
                {result.images.map(image => {
                    const src = image.dataUrl ?? image.url ?? '';
                    if (!src) {
                        return null;
                    }

                    const fileExtension = image.mediaType?.split('/')?.[1] || 'png';
                    const downloadFileName = `${image.id}.${fileExtension}`;

                    return (
                        <div
                            key={image.id}
                            className="group relative overflow-hidden rounded-xl border border-border/70 bg-background/60 shadow-subtle-sm"
                        >
                            <img
                                src={src}
                                alt={result.summary || 'Generated image'}
                                className="h-full w-full object-cover"
                                loading="lazy"
                            />

                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-background/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                            <div className="absolute inset-x-3 bottom-3 flex items-center justify-end gap-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                                <Button asChild variant="secondary" size="xs" rounded="full">
                                    <a href={src} target="_blank" rel="noopener noreferrer">
                                        <IconExternalLink size={14} strokeWidth={2} />
                                        View
                                    </a>
                                </Button>
                                <Button asChild variant="bordered" size="xs" rounded="full">
                                    <a href={src} download={downloadFileName}>
                                        <IconDownload size={14} strokeWidth={2} />
                                        Save
                                    </a>
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
