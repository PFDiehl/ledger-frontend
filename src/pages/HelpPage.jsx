// Help Center — serves the static HTML guides from /public/help in an embedded
// frame. The guides cross-link to each other (relative hrefs), so navigation
// stays inside this frame. Updating a guide is just editing its file in
// public/help/ — no code change needed here.
export default function HelpPage() {
  return (
    <div className="page" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 92px)' }}>
      <iframe
        title="MountainTop Ledger Help Center"
        src="/help/mtl-help-center.html"
        style={{ flex: 1, width: '100%', border: '1px solid var(--color-border-tertiary, #D4DDCC)', borderRadius: 12, background: '#fff' }}
      />
    </div>
  );
}
