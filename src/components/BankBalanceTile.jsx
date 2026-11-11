const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m} min${m > 1 ? 's' : ''} ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24); return `${d} day${d > 1 ? 's' : ''} ago`;
}

// Bank-vs-books summary for one account (our take on QuickBooks' banking tile, in
// MountainTop's own colors): the live bank-feed balance on top, the balance recorded
// in MTL below, and a count of transactions still waiting to be reviewed. The gap
// between the two numbers is exactly those un-reviewed items.
export default function BankBalanceTile({ account, txns }) {
  const list = txns || [];
  const reviewed = list.filter(t => t.status === 'categorized' || t.status === 'matched');
  const bookBal = Math.round(reviewed.reduce((s, t) => s + Number(t.amount || 0), 0) * 100) / 100;
  const reviewCount = list.filter(t => t.status === 'uncategorized').length;
  const connected = !!account.plaidItemId;
  const bankBal = Number(account.currentBalance || 0);
  const updated = connected && account.lastSyncedAt ? timeAgo(account.lastSyncedAt) : null;

  return (
    <div style={wrap}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {connected && (
          <div style={topStrip}>
            <div style={bigWhite}>{bankBal < 0 ? `−${money(Math.abs(bankBal))}` : money(bankBal)}</div>
            <div style={labelWhite}>Bank balance{updated ? ` · updated ${updated}` : ''}</div>
          </div>
        )}
        <div style={{ ...bottom, borderTopLeftRadius: connected ? 0 : 12, borderTopRightRadius: connected ? 0 : 12 }}>
          <div style={bigDark}>{bookBal < 0 ? `−${money(Math.abs(bookBal))}` : money(bookBal)}</div>
          <div style={labelDark}>In MountainTop Ledger</div>
        </div>
      </div>
      {reviewCount > 0 && (
        <div style={countCol} title={`${reviewCount} transaction${reviewCount === 1 ? '' : 's'} still to review below`}>
          <div style={countNum}>{reviewCount}</div>
          <div style={countLbl}>to review</div>
        </div>
      )}
    </div>
  );
}

const wrap = { display: 'flex', alignItems: 'stretch', border: '1px solid var(--color-border-secondary, #D4DDCC)', borderRadius: 12, overflow: 'hidden', maxWidth: 440, margin: '4px 2px 16px', background: 'var(--color-background-primary, #fff)', boxShadow: '0 2px 8px rgba(45,74,53,0.08)' };
const topStrip = { background: 'var(--brand-primary, #2D4A35)', color: '#fff', padding: '12px 18px' };
const bigWhite = { fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1.1 };
const labelWhite = { fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', marginTop: 3 };
const bottom = { background: 'var(--color-background-primary, #fff)', padding: '12px 18px' };
const bigDark = { fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.1 };
const labelDark = { fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-tertiary, #9BB39B)', marginTop: 3 };
const countCol = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 22px', borderLeft: '1px solid var(--color-border-tertiary, #EBF2E8)', minWidth: 92, flex: '0 0 auto' };
const countNum = { fontSize: 30, fontWeight: 800, color: '#C8841A', lineHeight: 1 };
const countLbl = { fontSize: 11, color: 'var(--color-text-tertiary, #9BB39B)', marginTop: 3 };
