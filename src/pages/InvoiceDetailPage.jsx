import { useState } from 'react';
import StatusBadge from '../components/ui/StatusBadge';
import { Spinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../lib/AuthContext';
import { fmt } from '../lib/utils';

export default function InvoiceDetailPage({ invoice, onBack, onEdit, onRefresh }) {
  const { org } = useAuth();
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showPay, setShowPay]     = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payDate, setPayDate]     = useState(() => new Date().toISOString().slice(0, 10));
  const [payBusy, setPayBusy]     = useState(false);
  const [payErr, setPayErr]       = useState('');

  if (!invoice) return null;

  const id       = invoice.invoiceNumber ?? invoice.id;
  const client   = invoice.contact?.name ?? invoice.client;
  const email    = invoice.contact?.email ?? invoice.email;
  const issued   = invoice.issueDate ?? invoice.issued;
  const due      = invoice.dueDate ?? invoice.due;
  const subtotal = Number(invoice.subtotal ?? 0);
  const tax      = Number(invoice.taxAmount ?? 0);
  const shipping = Number(invoice.shipping ?? 0);
  const discount = Number(invoice.discount ?? 0);
  const total    = Number(invoice.total ?? subtotal + tax);
  const lines    = invoice.lines ?? invoice.lineItems ?? invoice.items ?? [];
  const canSend  = ['draft','sent','partial'].includes(invoice.status);
  const canPay   = ['sent','partial','overdue'].includes(invoice.status);
  const paid     = Number(invoice.amountPaid ?? 0);
  const balance  = Math.max(0, total - paid);

  async function handleSend() {
    if (!org) return;
    setSending(true); setMsg(null);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/orgs/${org.id}/invoices/${invoice.id}/send`, {
        method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
      });
      setMsg({ type: 'success', text: `Invoice sent to ${email}` });
      onRefresh?.();
    } catch(e) {
      setMsg({ type: 'error', text: 'Could not send invoice.' });
    } finally { setSending(false); }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this invoice? This cannot be undone.')) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/orgs/${org.id}/invoices/${invoice.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
      });
      onBack?.();
    } catch(e) { alert('Error deleting invoice'); }
  }

  async function handleMarkPaid() {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/orgs/${org.id}/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
        body: JSON.stringify({ status: 'paid' })
      });
      onRefresh?.();
      onBack?.();
    } catch(e) { alert('Error updating invoice'); }
  }

  function openPay() { setPayAmount(String(balance || total)); setPayErr(''); setShowPay(true); }

  async function handleRecordPayment(e) {
    e.preventDefault();
    setPayBusy(true); setPayErr('');
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL}/orgs/${org.id}/invoices/${invoice.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
        body: JSON.stringify({ amount: Number(payAmount), method: payMethod, date: payDate }),
      });
      const j = await r.json();
      if (j.success) { setShowPay(false); onRefresh?.(); onBack?.(); }
      else setPayErr(j.message || 'Could not record payment.');
    } catch { setPayErr('Network error. Please try again.'); }
    finally { setPayBusy(false); }
  }

  async function handlePayNow() {
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL}/orgs/${org.id}/stripe/invoices/${invoice.id}/payment-link`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` }
      });
      const j = await r.json();
      if (j.success) window.open(j.url, '_blank');
      else alert(j.message);
    } catch(e) { alert('Error generating payment link'); }
  }
function downloadPDF() {
    import('../lib/generateInvoicePdf').then(({ generateInvoicePdf }) => {
      generateInvoicePdf(invoice);
    });
  }

  return (
    <div className="page invoice-detail-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="back-btn" onClick={onBack} aria-label="Back"><i className="ti ti-arrow-left" /></button>
          <h1 className="page-title">{id}</h1>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="page-actions">
          {invoice.status === 'draft' && (
            <button className="btn-primary" onClick={handleSend} disabled={sending}>
              <i className="ti ti-send" /> {sending ? 'Sending…' : 'Send'}
            </button>
          )}
          {canPay && (
            <button className="btn-primary" onClick={openPay}>
              <i className="ti ti-cash" /> Record payment
            </button>
          )}
          {canPay && (
            <button className="btn-secondary" onClick={handlePayNow}>
              <i className="ti ti-credit-card" /> Payment link
            </button>
          )}
          <button className="btn-secondary" onClick={() => onEdit?.(invoice)}>
            <i className="ti ti-edit" /> Edit
          </button>
          <button className="btn-secondary" onClick={downloadPDF}>
            <i className="ti ti-download" /> Download PDF
          </button>
          <button className="btn-secondary" onClick={handleDelete} style={{ color:'#c0392b', borderColor:'#c0392b' }}>
            <i className="ti ti-trash" /> Delete
          </button>
        </div>
      </div>

      {msg && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 16,
          background: msg.type === 'success' ? '#EBF2E8' : '#FDE8E8',
          color: msg.type === 'success' ? '#2D4A35' : '#c0392b', fontSize: 14
        }}>
          {msg.text}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontSize:11, color:'#7A9A7A', marginBottom:4 }}>CLIENT</div>
          <div style={{ fontSize:16, fontWeight:600 }}>{client || 'N/A'}</div>
          {email && <div style={{ fontSize:13, color:'#7A9A7A', marginTop:4 }}>{email}</div>}
          {invoice.poNumber && <div style={{ fontSize:13, color:'#7A9A7A', marginTop:4 }}>PO: {invoice.poNumber}</div>}
        </div>
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontSize:11, color:'#7A9A7A', marginBottom:4 }}>DATES</div>
          <div style={{ fontSize:13, marginBottom:4 }}>Issued: {issued ? new Date(issued).toLocaleDateString() : '-'}</div>
          <div style={{ fontSize:13 }}>Due: {due ? new Date(due).toLocaleDateString() : '-'}</div>
        </div>
      </div>

      <div className="card" style={{ padding:20, marginBottom:16 }}>
        <div style={{ fontSize:11, color:'#7A9A7A', marginBottom:12 }}>LINE ITEMS</div>
        {lines.length > 0 ? (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #D4DDCC' }}>
                <th style={{ padding:'8px 0', textAlign:'left', fontWeight:500, color:'#7A9A7A' }}>Description</th>
                <th style={{ padding:'8px 8px', textAlign:'left', fontWeight:500, color:'#7A9A7A', width:150 }}>Service</th>
                <th style={{ padding:'8px 8px', textAlign:'center', fontWeight:500, color:'#7A9A7A', width:60 }}>Qty</th>
                <th style={{ padding:'8px 8px', textAlign:'right', fontWeight:500, color:'#7A9A7A', width:90 }}>Rate</th>
                <th style={{ padding:'8px 8px', textAlign:'center', fontWeight:500, color:'#7A9A7A', width:70 }}>Tax</th>
                <th style={{ padding:'8px 8px', textAlign:'right', fontWeight:500, color:'#7A9A7A', width:100 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} style={{ borderBottom:'0.5px solid #EBF2E8' }}>
                  <td style={{ padding:'10px 0' }}>{line.description}</td>
                  <td style={{ padding:'10px 8px', color:'#2D4A35' }}>{line.service || '—'}</td>
                  <td style={{ padding:'10px 8px', textAlign:'center' }}>{Number(line.quantity)}</td>
                  <td style={{ padding:'10px 8px', textAlign:'right' }}>{fmt(line.unitPrice)}</td>
                  <td style={{ padding:'10px 8px', textAlign:'center', color: line.taxable === false ? '#7A9A7A' : '#2D4A35' }}>{line.taxable === false ? 'No' : 'Yes'}</td>
                  <td style={{ padding:'10px 8px', textAlign:'right', fontWeight:500 }}>{fmt(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color:'#7A9A7A', fontSize:13 }}>No line items</p>
        )}
      </div>

      <div className="card" style={{ padding:20, marginBottom:16 }}>
        <div style={{ fontSize:11, color:'#7A9A7A', marginBottom:12 }}>SUMMARY</div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ color:'#7A9A7A', fontSize:14 }}>Subtotal</span>
          <span style={{ fontSize:14 }}>{fmt(subtotal)}</span>
        </div>
        {tax > 0 && (
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ color:'#7A9A7A', fontSize:14 }}>Tax ({invoice.taxRate}%)</span>
            <span style={{ fontSize:14 }}>{fmt(tax)}</span>
          </div>
        )}
        {shipping > 0 && (
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ color:'#7A9A7A', fontSize:14 }}>Shipping</span>
            <span style={{ fontSize:14 }}>{fmt(shipping)}</span>
          </div>
        )}
        {discount > 0 && (
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ color:'#7A9A7A', fontSize:14 }}>Discount</span>
            <span style={{ fontSize:14, color:'#c0392b' }}>-{fmt(discount)}</span>
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', paddingTop:12, borderTop:'2px solid #2D4A35' }}>
          <span style={{ fontSize:16, fontWeight:700 }}>Total</span>
          <span style={{ fontSize:16, fontWeight:700, color:'#2D4A35' }}>{fmt(total)}</span>
        </div>
        {paid > 0 && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:10 }}>
              <span style={{ color:'#7A9A7A', fontSize:14 }}>Paid</span>
              <span style={{ fontSize:14, color:'#2D7A4A' }}>{fmt(paid)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
              <span style={{ fontSize:14, fontWeight:600 }}>Balance due</span>
              <span style={{ fontSize:14, fontWeight:700, color: balance > 0 ? '#d4682a' : '#2D7A4A' }}>{fmt(balance)}</span>
            </div>
          </>
        )}
      </div>

      {invoice.notes && (
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontSize:11, color:'#7A9A7A', marginBottom:8 }}>NOTES</div>
          <p style={{ fontSize:14, color:'#555', margin:0 }}>{invoice.notes}</p>
        </div>
      )}

      {showPay && (
        <div onClick={() => !payBusy && setShowPay(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleRecordPayment}
            style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth:380, boxShadow:'0 10px 40px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin:'0 0 4px', fontSize:18, color:'#2D4A35' }}>Record payment</h3>
            <div style={{ fontSize:13, color:'#7A9A7A', marginBottom:16 }}>{id} · Balance due {fmt(balance)}</div>
            {payErr && <div style={{ background:'#FDE8E8', color:'#c0392b', borderRadius:8, padding:'8px 12px', fontSize:13, marginBottom:12 }}>{payErr}</div>}
            <label style={{ display:'block', fontSize:12, color:'#7A9A7A', marginBottom:4 }}>Amount</label>
            <input type="number" step="0.01" min="0" value={payAmount} autoFocus onChange={e => setPayAmount(e.target.value)}
              style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #D4DDCC', fontSize:15, boxSizing:'border-box', marginBottom:12 }} />
            <label style={{ display:'block', fontSize:12, color:'#7A9A7A', marginBottom:4 }}>Method</label>
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
              style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #D4DDCC', fontSize:15, boxSizing:'border-box', marginBottom:12 }}>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
            <label style={{ display:'block', fontSize:12, color:'#7A9A7A', marginBottom:4 }}>Date</label>
            <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
              style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #D4DDCC', fontSize:15, boxSizing:'border-box', marginBottom:20 }} />
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button type="button" className="btn-secondary" disabled={payBusy} onClick={() => setShowPay(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={payBusy}>{payBusy ? 'Saving…' : 'Record payment'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
