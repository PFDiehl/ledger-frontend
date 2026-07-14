import { fmt } from '../../lib/utils';

export default function OverdueInvoices({ invoices }) {
  const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="card overdue-card">
      <div className="card-header">
        <span className="card-title">Overdue invoices</span>
        <button className="card-link">Send reminders →</button>
      </div>

      <div className="overdue-list">
        {invoices.map((inv) => (
          <div key={inv.id} className="overdue-item">
            <div className="overdue-info">
              <div className="overdue-client">{inv.client}</div>
              <div className="overdue-id">{inv.id}</div>
            </div>
            <span className={`overdue-badge badge-${inv.severity}`}>
              {inv.days}d
            </span>
            <div className="overdue-amount">{fmt(inv.amount)}</div>
          </div>
        ))}
      </div>

      <div className="overdue-total">
        <span>Total overdue</span>
        <span className="overdue-total-value">{fmt(total)}</span>
      </div>
    </div>
  );
}
