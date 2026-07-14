import { fmt } from '../../lib/utils';

const accountIcons = {
  checking: 'building-bank',
  savings:  'building-bank',
  credit:   'credit-card',
};

export default function CashPositionCard({ accounts }) {
  const netCash = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="card cash-position-card">
      <div className="card-header">
        <span className="card-title">Cash position</span>
        <button className="card-link">Forecast →</button>
      </div>

      <div className="cash-rows">
        {accounts.map((account) => (
          <div key={account.name} className="cash-row">
            <span className="cash-label">
              <i className={`ti ti-${accountIcons[account.type]}`} aria-hidden="true" />
              {account.name}
            </span>
            <span className={`cash-value ${account.balance < 0 ? 'negative' : ''}`}>
              {fmt(account.balance)}
            </span>
          </div>
        ))}
      </div>

      <div className="cash-total">
        <span>Net cash</span>
        <span className="cash-total-value">{fmt(netCash)}</span>
      </div>
    </div>
  );
}
