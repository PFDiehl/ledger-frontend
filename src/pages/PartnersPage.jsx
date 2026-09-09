// Public partner-recruiting page (logged-out) at /partners. Navy/gold brand.

const C = {
  navy1: '#0A2440', navy2: '#123A63', navy3: '#185186',
  gold: '#F2C14E', goldB: '#FFDD85',
  ink: '#EAF2FB', muted: '#A9C3DE', dim: '#7FA3C7',
  line: 'rgba(255,255,255,.14)',
};
const SANS = "'Segoe UI', -apple-system, Helvetica, Arial, sans-serif";
const CONTACT = 'mailto:partners@mountaintopledger.com?subject=MountainTop%20Ledger%20Partner%20inquiry';

function Benefit({ icon, title, desc }) {
  return (
    <div style={{ display: 'flex', gap: 14, background: 'rgba(255,255,255,.05)', border: `1px solid ${C.line}`, borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontSize: 24, lineHeight: 1 }}>{icon}</div>
      <div>
        <h3 style={{ fontSize: 16, color: C.gold, margin: '0 0 4px', fontWeight: 700 }}>{title}</h3>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.5, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

function Step({ n, title, desc }) {
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      <div style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(160deg, ${C.goldB}, #E0A82E)`, color: C.navy1, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{n}</div>
      <div>
        <h4 style={{ fontSize: 16, margin: '4px 0 4px', fontWeight: 700 }}>{title}</h4>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.5, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

export default function PartnersPage() {
  const btn = {
    display: 'inline-block', background: `linear-gradient(135deg, ${C.goldB}, ${C.gold})`, color: C.navy1,
    fontWeight: 800, border: 'none', borderRadius: 12, padding: '15px 30px', fontSize: 16, cursor: 'pointer',
    letterSpacing: '.3px', fontFamily: SANS, textDecoration: 'none',
  };
  const wrap = { maxWidth: 1040, margin: '0 auto', padding: '0 24px' };

  return (
    <div style={{ fontFamily: SANS, color: C.ink, background: C.navy1, lineHeight: 1.5, minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', background: `radial-gradient(1200px 600px at 82% -10%, rgba(120,170,225,.4), rgba(0,0,0,0) 60%), linear-gradient(135deg, ${C.navy1}, ${C.navy2} 55%, ${C.navy3})` }}>
        <div style={wrap}>
          <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0', borderBottom: `1px solid ${C.line}` }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 800, fontSize: 19, color: C.ink, textDecoration: 'none' }}>
              <img src="/favicon.png" alt="MountainTop Ledger" style={{ width: 38, height: 38, borderRadius: 11 }} />
              MountainTop Ledger
            </a>
            <a href="/" style={{ color: C.muted, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>← Back to home</a>
          </nav>

          <div style={{ padding: '70px 0 84px', maxWidth: 760 }}>
            <div style={{ color: C.goldB, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', fontSize: 13, marginBottom: 16 }}>Partner Program</div>
            <h1 style={{ fontSize: 44, lineHeight: 1.08, letterSpacing: -.8, fontWeight: 800, margin: '0 0 18px' }}>
              Run a branded bookkeeping practice — <span style={{ color: C.gold }}>without building the software.</span>
            </h1>
            <p style={{ fontSize: 19, color: C.muted, maxWidth: 640, margin: '0 0 30px' }}>
              MountainTop Ledger lets you offer modern bookkeeping to your clients under your brand, your domain, and your pricing. You own the relationship and the recurring revenue — we run the platform behind the scenes.
            </p>
            <a href={CONTACT} style={btn}>Become a partner</a>
          </div>
        </div>
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: -1, width: '100%', height: 100, display: 'block' }}>
          <path d="M0,120 L0,70 L240,20 L480,80 L720,10 L960,74 L1200,30 L1440,86 L1440,120 Z" fill="rgba(255,255,255,.05)" />
        </svg>
      </div>

      {/* Benefits */}
      <section style={{ padding: '64px 0', background: 'rgba(0,0,0,.18)' }}>
        <div style={wrap}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <Benefit icon="🏷️" title="Your brand, your domain" desc="Your logo, colors, and web address. Clients see your firm — not us." />
            <Benefit icon="🔁" title="Recurring revenue" desc="Set your own client pricing and bill through your Stripe. Predictable monthly income." />
            <Benefit icon="🗂️" title="All clients, one login" desc="Switch between every client’s books in a click, from a single dashboard." />
            <Benefit icon="🔐" title="Client-approved access" desc="Each client grants access in-app, with a recorded permission trail. Clean and compliant." />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '64px 0' }}>
        <div style={wrap}>
          <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', margin: '0 0 40px' }}>How it works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 28 }}>
            <Step n="1" title="Become a partner" desc="Start your free trial and set up your brand in minutes." />
            <Step n="2" title="Add your clients" desc="Create each client’s company and set your own prices." />
            <Step n="3" title="Grow" desc="You bill your clients and keep it all; we charge a small flat fee per client. That’s it." />
          </div>
        </div>
      </section>

      {/* Economics */}
      <section style={{ padding: '20px 0 72px' }}>
        <div style={wrap}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', background: 'linear-gradient(135deg, rgba(242,193,78,.12), rgba(242,193,78,.03))', border: '1px solid rgba(242,193,78,.28)', borderRadius: 18, padding: '30px 32px' }}>
            <div style={{ fontSize: 64, fontWeight: 800, color: C.gold, lineHeight: 1, flex: 'none' }}>100%</div>
            <div style={{ fontSize: 16, color: '#CFE0F2', lineHeight: 1.55, minWidth: 260, flex: 1 }}>
              <strong style={{ color: C.ink }}>You keep everything you bill your clients.</strong><br />
              Set your own pricing and collect it through your own Stripe account. MountainTop charges a small flat platform fee per client — <strong style={{ color: C.gold }}>$5/mo</strong>, or <strong style={{ color: C.gold }}>$12/mo</strong> if the client runs payroll. No revenue share, no other charges.
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '10px 0 80px' }}>
        <div style={{ ...wrap, textAlign: 'center' }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 12px' }}>Ready to put your name on it?</h2>
          <p style={{ color: C.muted, fontSize: 17, margin: '0 0 26px' }}>Tell us about your practice and we’ll get you set up.</p>
          <a href={CONTACT} style={btn}>Become a partner</a>
          <div style={{ color: C.dim, fontSize: 13, marginTop: 16 }}>Or email us at partners@mountaintopledger.com</div>
        </div>
      </section>

      <footer style={{ padding: '26px 0', background: '#061424', borderTop: `1px solid ${C.line}`, textAlign: 'center', color: '#5E7FA0', fontSize: 13 }}>
        © 2026 MountainTop Ledger · <a href="/" style={{ color: C.gold, textDecoration: 'none' }}>Home</a> ·{' '}
        <a href="/privacy" style={{ color: C.gold, textDecoration: 'none' }}>Privacy</a> ·{' '}
        <a href="/terms" style={{ color: C.gold, textDecoration: 'none' }}>Terms</a>
      </footer>
    </div>
  );
}
