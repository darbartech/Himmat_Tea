'use client';

import { useEffect } from 'react';

// Next.js only invokes global-error.tsx when the ROOT layout itself throws —
// error.tsx can't catch that case because it renders inside the layout.
// Because this replaces the entire document, it must render its own
// <html>/<body> and can't safely depend on providers/contexts from the root
// layout (they may be exactly what failed). Kept intentionally minimal.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[global error boundary]', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', margin: 0 }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '24px',
            background: '#f9f7f4',
            color: '#1c1917',
          }}
        >
          <h1 style={{ fontSize: '1.75rem', marginBottom: '12px' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#78746e', marginBottom: '24px', maxWidth: '32rem' }}>
            Himmat Tea hit an unexpected error. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '12px 24px',
              borderRadius: '9999px',
              background: '#2d5a3d',
              color: '#fff',
              border: 'none',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
