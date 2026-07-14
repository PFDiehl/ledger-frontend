import { fmt } from '../../lib/utils';

const icons = {
  revenue:      'trending-up',
  expenses:     'trending-down',
  netProfit:    'report-money',
  outstandingAR: 'clock',
};

const labels = {
  revenue:       'Revenue',
  expenses:      'Expenses',
  netProfit:     'Net profit',
  outstandingAR: 'Outstanding AR',
};

function KPICard({ id, data }) {
  const isUp = data.trend === 'up';
  const isNeutral = data.trend === 'neutral';
  const deltaPositive = id !== 'expenses' ? isUp : !isUp;

  return (
    <div className="kpi-card">
      <div className="kpi-label">
        <i className={`ti ti-${icons[id]}`} aria-hidden="true" />
        {labels[id]}
      </div>
      <div className="kpi-value">{fmt(data.value)}</div>
      <div className={`kpi-delta ${isNeutral ? 'neutral' : deltaPositive ? 'positive' : 'negative'}`}>
        {isNeutral ? (
          `${data.count} invoices unpaid`
        ) : (
          <>
            <i className={`ti ti-arrow-${isUp ? 'up' : 'down'}`} aria-hidden="true" />
            {data.delta}% vs last month
          </>
        )}
      </div>
    </div>
  );
}

export default function KPIGrid({ data }) {
  return (
    <div className="kpi-grid">
      {Object.entries(data).map(([id, kpi]) => (
        <KPICard key={id} id={id} data={kpi} />
      ))}
    </div>
  );
}
