import { useState, useEffect } from 'react';
import { fmt } from '../lib/utils';

// This page is accessible without login via /portal/:token
// It loads the invoice data from the public portal API

function StatusBadge({ status }) {
  const map = {
    draft:   ['#D3D1C7','#5F5E5A'],
    sent:    ['#E6F1FB','#185FA5'],
    paid:    ['#E1F5EE','#0F6E56'],
    overdue: ['#FCEBEB','#A32D2D'],
    partial: ['#FAEEDA','#854F0B'],
    void:    ['#D3D1C7','#5F5E5A'],
  };
  const [bg, color] = map[status] ?? map.draft;
  return (
    <span style={{ fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:20, background:bg, color }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function PaymentForm({ token, amountDue, currency, onSuccess }) {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [cardName, setCardName] = useState('');

  // In production this uses the Stripe.js SDK with card elements.
  // This is a simplified UI that calls our backend to get a PaymentIntent.
  async function handlePay(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL}/portal/invoices/${token}/pay`, { method:'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      // In production: use Stripe.js confirmCardPayment(json.data.clientSecret, {...})
      onSuccess();
    } catch (err) {
      setError(err.message ?? 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding:24, marginTop:20 }}>
      <div className="card-title" style={{ marginBottom:16 }}>Pay online</div>
      {error && (
        <div style={{ background:'#FCEBEB', color:'#A32D2D', borderRadius:8, padding:'8px 12px', fontSize:13, marginBottom:12 }}>
          {error}
        </div>
      )}
      <form onSubmit={handlePay}>
        <div className="form-field" style={{ marginBottom:12 }}>
          <label>Name on card</label>
          <input value={cardName} onChange={e => setCardName(e.target.value)} placeholder="Jane Doe" required />
        </div>
        <div className="form-field" style={{ marginBottom:12 }}>
          <label>Card number</label>
          <input placeholder="4242 4242 4242 4242" maxLength={19} style={{ letterSpacing:'0.1em' }} />
        </div>
        <div className="form-row two-col" style={{ marginBottom:16 }}>
          <div className="form-field"><label>Expiry</label><input placeholder="MM / YY" maxLength={7} /></div>
          <div className="form-field"><label>CVC</label><input placeholder="123" maxLength={4} /></div>
        </div>
        <button type="submit" className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:'10px 0' }} disabled={loading}>
          {loading ? 'Processing…' : `Pay ${fmt(amountDue)}`}
        </button>
        <p style={{ fontSize:11, color:'var(--gray-400)', textAlign:'center', marginTop:10 }}>
          <i className="ti ti-lock" style={{ fontSize:12, marginRight:4 }} />
          Secured by Stripe · Your card details are never stored
        </p>
      </form>
    </div>
  );
}

export default function CustomerPortalPage({ token }) {
  const [state, setState] = useState('loading'); // loading | loaded | paid | error
  const [data,  setData]  = useState(null);
  const [error, setError] = useState('');

  // Extract token from URL if not passed as prop
  const portalToken = token ?? window.location.pathname.split('/portal/')[1];

  useEffect(() => {
    if (!portalToken) { setState('error'); setError('Invalid portal link.'); return; }
    fetch(`${import.meta.env.VITE_API_URL}/portal/invoices/${portalToken}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) throw new Error(json.message);
        setData(json.data);
        setState('loaded');
      })
      .catch(err => { setError(err.message); setState('error'); });
  }, [portalToken]);

  if (state === 'loading') return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f8f6' }}>
      <div style={{ fontSize:13, color:'#888' }}>Loading invoice…</div>
    </div>
  );

  if (state === 'error') return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f8f6' }}>
      <div className="card" style={{ padding:32, maxWidth:400, textAlign:'center' }}>
        <i className="ti ti-alert-circle" style={{ fontSize:32, color:'#A32D2D', marginBottom:12 }} />
        <div style={{ fontSize:15, fontWeight:500, marginBottom:8 }}>Invoice not found</div>
        <div style={{ fontSize:13, color:'#888' }}>{error}</div>
      </div>
    </div>
  );

  const { invoice, org } = data;
  const amountDue = Number(invoice.amountDue);
  const isPaid    = invoice.status === 'paid' || state === 'paid';

  return (
    <div style={{ minHeight:'100vh', background:'#f8f8f6', padding:'32px 16px' }}>
      <div style={{ maxWidth:640, margin:'0 auto' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <div style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.02em', color:'var(--brand-primary,#2D4A35)' }}>{org.name}</div>
          <a href={`${import.meta.env.VITE_API_URL}/portal/invoices/${portalToken}/pdf`} target="_blank"
             className="btn-secondary" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
            <i className="ti ti-download" /> Download PDF
          </a>
        </div>

        {/* Invoice card */}
        <div className="card" style={{ padding:'28px 32px', marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
            <div>
              <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.02em' }}>Invoice {invoice.invoiceNumber}</div>
              <div style={{ fontSize:13, color:'#888', marginTop:4 }}>From {org.name}</div>
            </div>
            <StatusBadge status={invoice.status} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:24, paddingBottom:20, borderBottom:'0.5px solid var(--border)' }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'#aaa', marginBottom:6 }}>Bill to</div>
              <div style={{ fontSize:14, fontWeight:600 }}>{invoice.contact.name}</div>
              <div style={{ fontSize:12, color:'#555' }}>{invoice.contact.email}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:12, color:'#888' }}>Issued: {new Date(invoice.issueDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
              <div style={{ fontSize:12, color: isPaid ? '#888' : '#A32D2D', marginTop:4 }}>
                Due: {new Date(invoice.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
              </div>
            </div>
          </div>

          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, marginBottom:0 }}>
            <thead>
              <tr>
                {['Description','Qty','Unit price','Amount'].map((h,i) => (
                  <th key={h} style={{ textAlign:i>0?'right':'left', padding:'7px 0', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'#aaa', borderBottom:'1px solid #eee' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item, i) => (
                <tr key={i}>
                  <td style={{ padding:'11px 0', borderBottom:'1px solid #f5f5f5' }}>{item.description}</td>
                  <td style={{ padding:'11px 0', textAlign:'right', borderBottom:'1px solid #f5f5f5' }}>{item.quantity}</td>
                  <td style={{ padding:'11px 0', textAlign:'right', borderBottom:'1px solid #f5f5f5' }}>{fmt(Number(item.unitPrice))}</td>
                  <td style={{ padding:'11px 0', textAlign:'right', fontWeight:500, borderBottom:'1px solid #f5f5f5' }}>{fmt(Number(item.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5, marginTop:16, paddingTop:12, borderTop:'1px solid #eee' }}>
            <div style={{ display:'flex', gap:48, fontSize:13, color:'#555' }}>
              <span>Subtotal</span><span style={{ fontWeight:500, minWidth:80, textAlign:'right' }}>{fmt(Number(invoice.subtotal))}</span>
            </div>
            <div style={{ display:'flex', gap:48, fontSize:13, color:'#555' }}>
              <span>Tax</span><span style={{ fontWeight:500, minWidth:80, textAlign:'right' }}>{fmt(Number(invoice.taxAmount))}</span>
            </div>
            {Number(invoice.amountPaid) > 0 && (
              <div style={{ display:'flex', gap:48, fontSize:13, color:'#0F6E56' }}>
                <span>Amount paid</span><span style={{ fontWeight:500, minWidth:80, textAlign:'right' }}>-{fmt(Number(invoice.amountPaid))}</span>
              </div>
            )}
            <div style={{ display:'flex', gap:48, fontSize:16, fontWeight:700, borderTop:'1px solid #ddd', paddingTop:10, marginTop:4 }}>
              <span>Amount due</span><span style={{ minWidth:80, textAlign:'right', color: isPaid ? '#0F6E56' : '#111' }}>{fmt(amountDue)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid #eee', fontSize:12, color:'#555' }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'#aaa', marginBottom:5 }}>Notes</div>
              {invoice.notes}
            </div>
          )}
        </div>

        {/* Payment section */}
        {isPaid ? (
          <div className="card" style={{ padding:24, textAlign:'center' }}>
            <i className="ti ti-circle-check" style={{ fontSize:36, color:'#0F6E56', marginBottom:8 }} />
            <div style={{ fontSize:16, fontWeight:600, color:'#0F6E56' }}>Payment received — thank you!</div>
          </div>
        ) : (
          <PaymentForm token={portalToken} amountDue={amountDue} currency={invoice.currency} onSuccess={() => setState('paid')} />
        )}

        <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:'#aaa' }}>
          Questions? Reply to this email or contact {org.email}
        </div>
      </div>
    </div>
  );
}
