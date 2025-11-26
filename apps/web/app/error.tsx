'use client';

import { useEffect } from 'react';
import { logger } from '@repo/shared/logger';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error for debugging
        logger.error('Unhandled application error', error, {
            digest: error.digest,
            stack: error.stack,
        });
    }, [error]);

    const isNetworkError = error.message?.toLowerCase().includes('network') ||
        error.message?.toLowerCase().includes('fetch');

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                width: '100%',
                padding: '1rem',
            }}
        >
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                <div
                    style={{
                        fontSize: '4rem',
                        marginBottom: '1rem',
                    }}
                >
                    {isNetworkError ? '🌐' : '⚠️'}
                </div>
                <h2
                    style={{
                        marginBottom: '0.5rem',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#1f2937',
                    }}
                >
                    {isNetworkError ? 'Connection Error' : 'Something went wrong'}
                </h2>
                <p
                    style={{
                        marginBottom: '1.5rem',
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                    }}
                >
                    {isNetworkError
                        ? 'Please check your internet connection and try again.'
                        : "We're sorry, but something unexpected happened. Our team has been notified."}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '0.625rem 1.25rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            transition: 'background-color 0.2s',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
                    >
                        Try again
                    </button>
                    <button
                        onClick={() => (window.location.href = '/')}
                        style={{
                            padding: '0.625rem 1.25rem',
                            backgroundColor: 'transparent',
                            color: '#6b7280',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            transition: 'border-color 0.2s',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
                        onMouseOut={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
                    >
                        Go home
                    </button>
                </div>
                {error.digest && (
                    <p
                        style={{
                            marginTop: '1.5rem',
                            color: '#9ca3af',
                            fontSize: '0.75rem',
                        }}
                    >
                        Error ID: {error.digest}
                    </p>
                )}
            </div>
        </div>
    );
}
