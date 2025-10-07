export default function NotFound() {
  return (
    <html lang="en">
      <head>
        <title>404 - Not Found</title>
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          padding: '20px'
        }}>
          <h1 style={{ fontSize: '4rem', margin: 0, fontWeight: 'bold' }}>404</h1>
          <h2 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>Page Not Found</h2>
          <p style={{ color: '#666', marginTop: '0.5rem' }}>Could not find requested resource</p>
          <a href="/chat" style={{ 
            marginTop: '2rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '0.5rem'
          }}>
            Go back home
          </a>
        </div>
      </body>
    </html>
  );
}
