'use client';

import { ImageStudioComponent } from '@repo/common/components';

// Minimal version without layout dependencies for testing
export default function ImageStudioPage() {
    return (
        <div className="min-h-screen bg-background">
            <ImageStudioComponent />
        </div>
    );
}