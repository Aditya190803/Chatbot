export default function NotFound() {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                textAlign: 'center',
                padding: '2rem',
                fontFamily:
                    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
        >
            <div style={{ fontSize: '5rem', marginBottom: '0.5rem' }}>🔍</div>
            <h1
                style={{
                    fontSize: '6rem',
                    margin: 0,
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                }}
            >
                404
            </h1>
            <h2
                style={{
                    fontSize: '1.5rem',
                    marginTop: '0.5rem',
                    fontWeight: 600,
                    color: '#1f2937',
                }}
            >
                Page Not Found
            </h2>
            <p
                style={{
                    color: '#6b7280',
                    marginTop: '0.75rem',
                    maxWidth: '400px',
                    lineHeight: 1.6,
                }}
            >
                The page you&apos;re looking for doesn&apos;t exist or has been moved.
                Let&apos;s get you back on track.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <a
                    href="/"
                    style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                        transition: 'background-color 0.2s',
                    }}
                >
                    Go home
                </a>
                <a
                    href="/chat"
                    style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: 'transparent',
                        color: '#374151',
                        textDecoration: 'none',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                    }}
                >
                    Start chatting
                </a>
            </div>
        </div>
    );
}
