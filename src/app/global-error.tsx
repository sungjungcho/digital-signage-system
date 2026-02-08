'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f3f4f6'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#dc2626', fontSize: '1.5rem', marginBottom: '1rem' }}>
              심각한 오류가 발생했습니다
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              {error.message || '알 수 없는 오류가 발생했습니다.'}
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
