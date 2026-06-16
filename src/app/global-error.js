'use client';

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#09090b', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center',
        }}>
          <div style={{
            maxWidth: '400px', background: '#18181b', border: '1px solid #27272a',
            borderRadius: '24px', padding: '40px 32px',
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', background: '#ef4444',
              opacity: 0.12, margin: '0 auto 20px',
            }} />
            <h1 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 8px' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '0 0 24px', lineHeight: '1.6' }}>
              The beoneofus app hit an unexpected error. Your work is safe — just reload to continue.
            </p>
            <button
              onClick={() => reset()}
              style={{
                width: '100%', padding: '12px', background: '#2563eb', color: '#fff',
                border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
