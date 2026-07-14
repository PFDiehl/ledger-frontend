import { useState } from 'react';
import StatusBadge from '../components/ui/StatusBadge';
import { Spinner }  from '../components/ui/LoadingSpinner';
import { useAuth }  from '../lib/AuthContext';
import { orgApi }   from '../lib/api';
import { fmt }      from '../lib/utils';

export default function InvoiceDetailPage({ invoice, onBack, onEdit, onRefresh }) {
  const { org }   = useAuth();
  const [sending, setSending]   = useState(false);
  const [reminder, setReminder] = useState(false);
  const [msg, setMsg]           = useState(null); // { type: 'success'|'error', text }

  if (!invoice) return null;

  // Normalise field names between mock and live data
  const id       = invoice.invoiceNumber ?? invoice.id;
  const client   = invoice.contact?.name ?? invoice.client;
  const email    = invoice.contact?.email ?? invoice.email;
  const issued   = invoice.issueDate   ?? invoice.issued;
  const due      = invoice.dueDate     ?? invoice.due;
  const subtotal = Number(invoice.subtotal ?? invoice.items?.reduce((s, i) => s + i.amount, 0) ?? 0);
  const tax      = Number(invoice.taxAmount ?? 0);
  const total    = Number(invoice.total ?? subtotal + tax);
  const items    = invoice.lineItems ?? invoice.items ?? [];

  const canSend   = invoice.status === 'draft';
  const canRemind = ['sent','partial','overdue'].includes(invoice.status);
  const canPay    = ['sent','partial','overdue'].includes(invoice.status);

  async function handleSend() {
    if (!org) return;
    setSending(true); setMsg(null);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/orgs/${org.id}/invoices/${invoice.id}/send`, {
        method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
      });
      setMsg({ type: 'success', text: `Invoice sent to ${email} — a PDF is on its way.` });
      onRefresh?.();
    } catch (e) {
      setMsg({ type: 'error', text: 'Could not send invoice. Try again.' });
    } finally { setSending(false); }
  }

  async function handleReminder() {
    if (!org) return;
    setReminder(true); setMsg(null);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/orgs/${org.id}/invoices/${invoice.id}/send-reminder`, {
        method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
      });
      setMsg({ type: 'success', text: 'Reminder sent.' });
    } catch (e) {
      setMsg({ type: 'error', text: 'Could not send reminder.' });
    } finally { setReminder(false); }
  }

  function downloadPDF() {
    if (!org || !invoice.id) return;
    window.open(
      `${import.meta.env.VITE_API_URL}/orgs/${org.id}/invoices/${invoice.id}/pdf?download=1`,
      '_blank'
    );
  }

  function previewPDF() {
    if (!org || !invoice.id) return;
    window.open(
      `${import.meta.env.VITE_API_URL}/orgs/${org.id}/invoices/${invoice.id}/pdf`,
      '_blank'
    );
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
          {canSend && (
            <button className="btn-secondary" onClick={handleSend} disabled={sending}>
              {sending ? <Spinner size={14} /> : <i className="ti ti-send" />}
              {sending ? ' Sending…' : ' Send invoice'}
            </button>
          )}
          {canRemind && (
            <button className="btn-secondary" onClick={handleReminder} disabled={reminder}>
              {reminder ? <Spinner size={14} /> : <i className="ti ti-bell" />}
              {reminder ? ' Sending…' : ' Send reminder'}
            </button>
          )}
          {canPay && (
            <button className="btn-secondary success-btn"><i className="ti ti-check" /> Mark as paid</button>
          )}
          <button className="btn-secondary" onClick={() => onEdit?.(invoice)}>
            <i className="ti ti-edit" /> Edit
          </button>
          <button className="btn-secondary" onClick={downloadPDF}>
            <i className="ti ti-download" /> Download PDF
          </button>
          {invoice.id && (
            <button className="btn-secondary" onClick={previewPDF}>
              <i className="ti ti-eye" /> Preview
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div style={{
          background: msg.type === 'success' ? '#E1F5EE' : '#FCEBEB',
          color:      msg.type === 'success' ? '#0F6E56' : '#A32D2D',
          borderRadius: 8, padding: '10px 16px', fontSize: 13, marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className={`ti ti-${msg.type === 'success' ? 'check' : 'alert-circle'}`} />
          {msg.text}
        </div>
      )}

      <div className="invoice-doc">
        <div className="invoice-parties">
          <div className="invoice-from">
            <div className="party-label">From</div>
            <div className="party-name">Acme Co.</div>
            <div className="party-detail">123 Business Ave, Charlotte, NC 28201</div>
            <div className="party-detail">billing@acmeco.com</div>
          </div>
          <div className="invoice-to">
            <div className="party-label">Bill to</div>
            <div className="party-name">{client}</div>
            <div className="party-detail">{email}</div>
          </div>
          <div className="invoice-meta">
            <div className="meta-row"><span className="meta-label">Invoice #</span><span className="meta-val">{id}</span></div>
            <div className="meta-row"><span className="meta-label">Issued</span><span className="meta-val">{issued}</span></div>
            <div className="meta-row">
              <span className="meta-label">Due</span>
              <span className={`meta-val ${invoice.status === 'overdue' ? 'text-danger' : ''}`}>{due}</span>
            </div>
          </div>
        </div>

        <table className="line-items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th className="right">Qty</th>
              <th className="right">Rate</th>
              <th className="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td>{item.description}</td>
                <td className="right">{item.qty ?? item.quantity ?? 1}</td>
                <td className="right">{fmt(Number(item.rate ?? item.unitPrice ?? 0))}</td>
                <td className="right">{fmt(Number(item.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-totals">
          <div className="totals-row"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          <div className="totals-row"><span>Tax</span><span>{fmt(tax)}</span></div>
          <div className="totals-row total-due"><span>Total due</span><span>{fmt(total)}</span></div>
        </div>

        {invoice.notes && (
          <div className="invoice-notes">
            <div className="notes-label">Notes</div>
            <div className="notes-text">{invoice.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}
