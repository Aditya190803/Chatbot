'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button, Card, Flex, Textarea, cn } from '@repo/ui';
import { IconUpload, IconDownload, IconPhotoPlus, IconLoader2, IconX, IconSparkles } from '@tabler/icons-react';
import { useDropzone } from 'react-dropzone';

interface GeneratedImage {
    id: string;
    dataUrl: string;
    mediaType: string;
    prompt: string;
    timestamp: number;
}

export const ImageStudioComponent: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Example prompts for users
    const examplePrompts = [
        "A futuristic robot cat playing chess on the moon, highly detailed, cinematic lighting",
        "A whimsical watercolor painting of a dragon reading books in a cozy library",
        "A cyberpunk cityscape at night with neon reflections on wet streets",
        "Change the background to a bustling city street (for uploaded images)",
        "Add a crown to the subject in this image (for uploaded images)"
    ];

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file && file.type.startsWith('image/')) {
            setUploadedImage(file);
            setUploadedImageUrl(URL.createObjectURL(file));
            setError('');
        } else {
            setError('Please upload a valid image file (PNG, JPG, WEBP)');
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp']
        },
        multiple: false
    });

    const clearUploadedImage = () => {
        setUploadedImage(null);
        setUploadedImageUrl('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const generateImage = async () => {
        if (!prompt.trim()) {
            setError('Please enter a text prompt');
            return;
        }

        setIsGenerating(true);
        setError('');

        try {
            // Make API call to our custom endpoint
            const requestData: any = {
                prompt: prompt,
            };

            if (uploadedImage) {
                // Convert image to base64
                const imageBuffer = await uploadedImage.arrayBuffer();
                const uint8Array = new Uint8Array(imageBuffer);
                const base64Image = btoa(Array.from(uint8Array, byte => String.fromCharCode(byte)).join(''));
                requestData.image = {
                    data: base64Image,
                    mimeType: uploadedImage.type
                };
            }

            const response = await fetch('/api/image-generation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate image');
            }

            const result = await response.json();

            if (result.images && result.images.length > 0) {
                const newImages: GeneratedImage[] = result.images.map((imageData: any, index: number) => ({
                    id: `${Date.now()}-${index}`,
                    dataUrl: imageData.dataUrl,
                    mediaType: imageData.mediaType || 'image/png',
                    prompt: prompt,
                    timestamp: Date.now(),
                }));

                setGeneratedImages(prev => [...newImages, ...prev]);
            } else {
                setError('No images were generated. Please try a different prompt.');
            }
        } catch (err) {
            console.error('Image generation error:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate image. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadImage = (image: GeneratedImage) => {
        const link = document.createElement('a');
        link.href = image.dataUrl;
        const timestamp = new Date(image.timestamp).toISOString().slice(0, 19).replace(/:/g, '-');
        link.download = `generated-image-${timestamp}.${image.mediaType.split('/')[1] || 'png'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex h-full w-full flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-4xl space-y-8">
                    {/* Header */}
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <IconPhotoPlus className="h-8 w-8 text-emerald-600" />
                            <h1 className="text-3xl font-bold text-foreground">Gemini Image Studio</h1>
                        </div>
                        <p className="text-muted-foreground text-lg">
                            Generate stunning images from text or transform existing images with AI
                        </p>
                    </div>

                    {/* Input Section */}
                    <Card className="p-6 space-y-6">
                        {/* Text Prompt Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Describe the image you want to create or modify:
                            </label>
                            <Textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Enter your image description here..."
                                className="min-h-[100px] resize-none"
                                disabled={isGenerating}
                            />
                        </div>

                        {/* Image Upload Section */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Upload Image (Optional - for image editing):
                            </label>
                            
                            {!uploadedImage ? (
                                <div
                                    {...getRootProps()}
                                    className={cn(
                                        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                                        isDragActive 
                                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10" 
                                            : "border-muted-foreground/30 hover:border-emerald-500/50"
                                    )}
                                >
                                    <input {...getInputProps()} ref={fileInputRef} />
                                    <div className="flex flex-col items-center gap-2">
                                        <IconUpload className="h-8 w-8 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">
                                            Drag & drop an image here, or click to select
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Supports PNG, JPG, and WEBP formats
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative inline-block">
                                    <img
                                        src={uploadedImageUrl}
                                        alt="Uploaded"
                                        className="max-w-xs max-h-48 rounded-lg border"
                                    />
                                    <Button
                                        size="icon-xs"
                                        variant="destructive"
                                        className="absolute -top-2 -right-2"
                                        onClick={clearUploadedImage}
                                    >
                                        <IconX size={14} />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Error Display */}
                        {error && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}

                        {/* Generate Button */}
                        <Button
                            onClick={generateImage}
                            disabled={isGenerating || !prompt.trim()}
                            size="lg"
                            className="w-full"
                        >
                            {isGenerating ? (
                                <>
                                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating Image...
                                </>
                            ) : (
                                <>
                                    <IconSparkles className="mr-2 h-4 w-4" />
                                    {uploadedImage ? 'Process Image' : 'Generate Image'}
                                </>
                            )}
                        </Button>
                    </Card>

                    {/* Example Prompts */}
                    <Card className="p-4">
                        <h3 className="font-semibold mb-3 text-sm">Example Prompts:</h3>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {examplePrompts.map((example, index) => (
                                <Button
                                    key={index}
                                    variant="ghost"
                                    size="sm"
                                    className="text-left h-auto p-2 justify-start text-wrap"
                                    onClick={() => setPrompt(example)}
                                    disabled={isGenerating}
                                >
                                    <span className="text-xs text-muted-foreground">"{example}"</span>
                                </Button>
                            ))}
                        </div>
                    </Card>

                    {/* Generated Images Gallery */}
                    {generatedImages.length > 0 && (
                        <Card className="p-6">
                            <h3 className="font-semibold mb-4 text-lg">Generated Images</h3>
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {generatedImages.map((image) => (
                                    <div key={image.id} className="space-y-3">
                                        <div className="relative group">
                                            <img
                                                src={image.dataUrl}
                                                alt={`Generated: ${image.prompt}`}
                                                className="w-full h-auto rounded-lg border shadow-sm"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {image.prompt}
                                            </p>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>{image.mediaType}</span>
                                                <span>{new Date(image.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="w-full"
                                                onClick={() => downloadImage(image)}
                                            >
                                                <IconDownload className="mr-2 h-3 w-3" />
                                                Download
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};