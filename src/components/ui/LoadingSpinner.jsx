export function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size, border: `2px solid var(--color-border-tertiary)`,
      borderTopColor: 'var(--purple-600)', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}

export function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 10, color: 'var(--color-text-secondary)', fontSize: 13 }}>
      <Spinner /> Loading…
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#791F1F', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <span><i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{message}</span>
      {onRetry && <button onClick={onRetry} style={{ fontSize: 12, color: '#791F1F', fontWeight: 500, textDecoration: 'underline' }}>Retry</button>}
    </div>
  );
}
