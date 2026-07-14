import StatusBadge from '../components/ui/StatusBadge';
import { fmt } from '../lib/utils';

export default function BillDetailPage({ bill, onBack, onEdit }) {
  if (!bill) return null;
  const subtotal = bill.items.reduce((s, i) => s + i.amount, 0);
  const canApprove = bill.status === 'draft';
  const canPay     = bill.status === 'pending' || bill.status === 'overdue';

  return (
    <div className="page invoice-detail-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="back-btn" onClick={onBack} aria-label="Back"><i className="ti ti-arrow-left" /></button>
          <h1 className="page-title">{bill.id}</h1>
          <StatusBadge status={bill.status} />
        </div>
        <div className="page-actions">
          {canApprove && (
            <button className="btn-secondary"><i className="ti ti-check" /> Approve for payment</button>
          )}
          {canPay && (
            <button className="btn-secondary success-btn"><i className="ti ti-credit-card" /> Record payment</button>
          )}
          <button className="btn-secondary" onClick={() => onEdit?.(bill)}><i className="ti ti-edit" /> Edit</button>
          <button className="btn-secondary"><i className="ti ti-download" /> Save PDF</button>
        </div>
      </div>

      <div className="invoice-doc">
        <div className="invoice-parties">
          <div className="invoice-from">
            <div className="party-label">Vendor</div>
            <div className="party-name">{bill.vendor}</div>
            <div className="party-detail">{bill.email}</div>
          </div>
          <div className="invoice-to">
            <div className="party-label">Bill to</div>
            <div className="party-name">Acme Co.</div>
            <div className="party-detail">123 Business Ave, Charlotte, NC 28201</div>
          </div>
          <div className="invoice-meta">
            <div className="meta-row"><span className="meta-label">Bill #</span><span className="meta-val">{bill.id}</span></div>
            <div className="meta-row"><span className="meta-label">Bill date</span><span className="meta-val">{bill.billDate}</span></div>
            <div className="meta-row">
              <span className="meta-label">Due</span>
              <span className={`meta-val ${bill.status === 'overdue' ? 'text-danger' : ''}`}>{bill.dueDate}</span>
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
            {bill.items.map((item, i) => (
              <tr key={i}>
                <td>{item.description}</td>
                <td className="right">{item.qty}</td>
                <td className="right">{fmt(item.rate)}</td>
                <td className="right">{fmt(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-totals">
          <div className="totals-row"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          <div className="totals-row"><span>Tax (0%)</span><span>{fmt(0)}</span></div>
          <div className="totals-row total-due"><span>Total due</span><span>{fmt(subtotal)}</span></div>
        </div>

        {bill.notes && (
          <div className="invoice-notes">
            <div className="notes-label">Notes</div>
            <div className="notes-text">{bill.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}
