import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { fmtShort } from '../../lib/utils';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="tooltip-row">
          <span className="tooltip-dot" style={{ background: p.fill }} />
          <span>{p.name === 'income' ? 'Income' : 'Expenses'}</span>
          <span className="tooltip-value">{fmtShort(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function IncomeExpenseChart({ data }) {
  return (
    <div className="chart-card card">
      <div className="card-header">
        <span className="card-title">Income vs expenses</span>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-dot income" />Income
          </span>
          <span className="legend-item">
            <span className="legend-dot expense" />Expenses
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} barCategoryGap="30%" barGap={3}>
          <CartesianGrid vertical={false} stroke="var(--color-border-tertiary)" strokeDasharray="0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtShort}
            tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-background-secondary)' }} />
          <Bar dataKey="income"   fill="#5DCAA5" radius={[3, 3, 0, 0]} />
          <Bar dataKey="expenses" fill="#F0997B" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
