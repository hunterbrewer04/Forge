'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: '#1C1C1C', fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '24rem' }}>
            <div style={{
              width: '4rem',
              height: '4rem',
              backgroundColor: 'rgba(255, 103, 20, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <span style={{ color: '#ff6714', fontSize: '1.875rem', fontWeight: 'bold' }}>!</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
              Something went wrong
            </h2>
            <p style={{ color: '#a8a29e', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              A critical error occurred. Please reload the page.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#ff6714',
                color: 'white',
                fontWeight: 600,
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
