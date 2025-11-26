'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    // Log to console since we can't use external modules in global error
    if (typeof console !== 'undefined') {
        console.error('Global error:', error.message, error.stack, error.digest);
    }

    return (
        <html lang="en">
            <head>
                <title>Error - LLMChat</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body
                style={{
                    margin: 0,
                    padding: 0,
                    fontFamily:
                        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    backgroundColor: '#fafafa',
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem',
                        textAlign: 'center',
                        maxWidth: '450px',
                    }}
                >
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😵</div>
                    <h1
                        style={{
                            fontSize: '1.75rem',
                            fontWeight: 700,
                            marginBottom: '0.5rem',
                            color: '#111827',
                        }}
                    >
                        Application Error
                    </h1>
                    <p
                        style={{
                            fontSize: '1rem',
                            color: '#6b7280',
                            marginBottom: '2rem',
                            lineHeight: 1.6,
                        }}
                    >
                        The application encountered a critical error. This has been logged and our team
                        will investigate. Please try refreshing the page.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                            onClick={() => reset()}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.9375rem',
                                fontWeight: 500,
                                transition: 'background-color 0.2s',
                            }}
                        >
                            Try again
                        </button>
                        <button
                            onClick={() => (window.location.href = '/')}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: 'white',
                                color: '#374151',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.9375rem',
                                fontWeight: 500,
                            }}
                        >
                            Return home
                        </button>
                    </div>
                    {error.digest && (
                        <p
                            style={{
                                marginTop: '2rem',
                                padding: '0.5rem 1rem',
                                backgroundColor: '#f3f4f6',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                color: '#9ca3af',
                                fontFamily: 'monospace',
                            }}
                        >
                            Reference: {error.digest}
                        </p>
                    )}
                </div>
            </body>
        </html>
    );
}
