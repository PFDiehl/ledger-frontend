export const kpiData = {
  revenue:     { value: 48200,  delta: 12,  trend: 'up' },
  expenses:    { value: 31450,  delta: 4,   trend: 'up' },
  netProfit:   { value: 16750,  delta: 22,  trend: 'up' },
  outstandingAR: { value: 9320, count: 3,   trend: 'neutral' },
};

export const incomeExpenseData = [
  { month: 'Jan', income: 32000, expenses: 24000 },
  { month: 'Feb', income: 38000, expenses: 27000 },
  { month: 'Mar', income: 29000, expenses: 25000 },
  { month: 'Apr', income: 44000, expenses: 31000 },
  { month: 'May', income: 41000, expenses: 29000 },
  { month: 'Jun', income: 48200, expenses: 31450 },
];

export const cashPositionData = [
  { name: 'Chase checking ••4821', type: 'checking', balance: 24180 },
  { name: 'Chase savings ••9204',  type: 'savings',  balance: 12500 },
  { name: 'Amex Business ••7731',  type: 'credit',   balance: -3240 },
];

export const recentActivity = [
  { id: 1, type: 'invoice',  title: 'Invoice #1042 — Globex Corp',    sub: 'Sent · 2h ago',       amount: 4200,  positive: true  },
  { id: 2, type: 'bill',     title: 'AWS bill — June',                sub: 'Paid · yesterday',     amount: -892,  positive: false },
  { id: 3, type: 'bank',     title: 'Bank import — Chase ••4821',     sub: '14 transactions · today', amount: null, action: 'Review' },
  { id: 4, type: 'invoice',  title: 'Payment received — Initech',     sub: 'Invoice #1038 · 2 days ago', amount: 7500, positive: true },
  { id: 5, type: 'bill',     title: 'Shopify subscription',           sub: 'Auto-paid · 3 days ago', amount: -79, positive: false },
];

export const overdueInvoices = [
  { id: 'INV-1031', client: 'Umbrella Ltd',       days: 45, amount: 3100, severity: 'danger' },
  { id: 'INV-1035', client: 'Stark Industries',   days: 18, amount: 2640, severity: 'warning' },
  { id: 'INV-1039', client: 'Wayne Enterprises',  days: 7,  amount: 3580, severity: 'warning' },
];
