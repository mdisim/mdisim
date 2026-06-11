'use client'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error)
    }
  }, [error])

  return (
    <html>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', background: '#f8fafc' }}>
          <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: '480px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{ color: '#1e3a5f', marginBottom: '8px' }}>Something went wrong</h1>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>An unexpected error occurred. Our team has been notified.</p>
            <button onClick={reset} style={{ background: '#f59e0b', border: 'none', padding: '12px 28px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
