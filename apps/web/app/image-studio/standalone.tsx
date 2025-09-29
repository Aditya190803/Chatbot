'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export default function StandaloneImageStudio() {
    const [prompt, setPrompt] = useState('');
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
    const [generatedImages, setGeneratedImages] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file && file.type.startsWith('image/')) {
            setUploadedImage(file);
            setUploadedImageUrl(URL.createObjectURL(file));
            setError('');
        } else {
            setError('Please upload a valid image file');
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
        multiple: false
    });

    const clearUploadedImage = () => {
        setUploadedImage(null);
        setUploadedImageUrl('');
    };

    const generateImage = async () => {
        if (!prompt.trim()) {
            setError('Please enter a text prompt');
            return;
        }

        setIsGenerating(true);
        setError('');

        try {
            const requestData: any = { prompt };

            if (uploadedImage) {
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData),
            });

            const result = await response.json();
            
            if (response.ok && result.images) {
                setGeneratedImages(prev => [...result.images.map((img: any, idx: number) => ({
                    ...img,
                    id: `${Date.now()}-${idx}`,
                    prompt,
                    timestamp: Date.now()
                })), ...prev]);
            } else {
                setError(result.error || 'Failed to generate image');
            }
        } catch (err) {
            setError('Network error occurred');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen p-8" style={{ backgroundColor: '#f8fafc' }}>
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-4">🎨 Gemini Image Studio</h1>
                    <p className="text-gray-600">Generate stunning images from text or transform existing images with AI</p>
                </div>

                <div className="bg-white p-6 rounded-lg border space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Describe the image you want to create or modify:
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Enter your image description here..."
                            className="w-full p-3 border rounded-md resize-none"
                            rows={4}
                            disabled={isGenerating}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Upload Image (Optional - for image editing):
                        </label>
                        
                        {!uploadedImage ? (
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
                                    isDragActive ? 'border-green-500 bg-green-50' : 'border-gray-300'
                                }`}
                            >
                                <input {...getInputProps()} ref={fileInputRef} />
                                <div className="space-y-2">
                                    <div className="text-4xl">📤</div>
                                    <p className="text-gray-600">Drag & drop an image here, or click to select</p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative inline-block">
                                <img
                                    src={uploadedImageUrl}
                                    alt="Uploaded"
                                    className="max-w-xs max-h-48 rounded-lg border"
                                />
                                <button
                                    onClick={clearUploadedImage}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                                >
                                    ×
                                </button>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={generateImage}
                        disabled={isGenerating || !prompt.trim()}
                        className={`w-full py-3 px-4 rounded-md text-white font-medium ${
                            isGenerating || !prompt.trim() 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {isGenerating ? (
                            <>⏳ Generating Image...</>
                        ) : (
                            <>✨ {uploadedImage ? 'Process Image' : 'Generate Image'}</>
                        )}
                    </button>
                </div>

                {generatedImages.length > 0 && (
                    <div className="bg-white p-6 rounded-lg border">
                        <h3 className="text-lg font-semibold mb-4">Generated Images</h3>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {generatedImages.map((image) => (
                                <div key={image.id} className="space-y-3">
                                    <img
                                        src={image.dataUrl}
                                        alt={`Generated: ${image.prompt}`}
                                        className="w-full h-auto rounded-lg border shadow-sm"
                                    />
                                    <div className="space-y-2">
                                        <p className="text-xs text-gray-500 line-clamp-2">{image.prompt}</p>
                                        <button
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = image.dataUrl;
                                                link.download = `generated-image-${Date.now()}.png`;
                                                link.click();
                                            }}
                                            className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
                                        >
                                            📥 Download
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}