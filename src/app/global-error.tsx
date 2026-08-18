'use client'

/** Última rede de segurança: erro que derruba até o layout raiz. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#f8fafc',
          color: '#0f172a',
        }}
      >
        <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 12px' }}>
            Algo deu errado
          </h1>
          <p style={{ margin: '0 0 24px', color: '#475569', lineHeight: 1.6 }}>
            O aplicativo encontrou um erro inesperado. Tente carregar de novo.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 0,
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Recarregar
          </button>
        </div>
      </body>
    </html>
  )
}
