import { fmt } from '../../lib/utils';

const typeConfig = {
  invoice: { icon: 'file-invoice', colorClass: 'icon-teal' },
  bill:    { icon: 'receipt',      colorClass: 'icon-coral' },
  bank:    { icon: 'arrows-exchange', colorClass: 'icon-blue' },
};

function ActivityItem({ item }) {
  const config = typeConfig[item.type] ?? typeConfig.bank;

  return (
    <div className="activity-item">
      <div className={`activity-icon ${config.colorClass}`}>
        <i className={`ti ti-${config.icon}`} aria-hidden="true" />
      </div>
      <div className="activity-text">
        <div className="activity-title">{item.title}</div>
        <div className="activity-sub">{item.sub}</div>
      </div>
      <div className={`activity-amount ${item.positive ? 'positive' : item.amount === null ? 'action' : 'negative'}`}>
        {item.amount !== null
          ? (item.positive ? '+' : '') + fmt(item.amount)
          : item.action}
      </div>
    </div>
  );
}

export default function ActivityFeed({ items }) {
  return (
    <div className="card activity-card">
      <div className="card-header">
        <span className="card-title">Recent activity</span>
        <button className="card-link">View all →</button>
      </div>
      <div className="activity-list">
        {items.map((item) => (
          <ActivityItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
