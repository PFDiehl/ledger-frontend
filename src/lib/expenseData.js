export const expenses = [
  { id: 'EXP-0041', date: '2026-06-01', vendor: 'Uber',         category: 'Travel',        amount: 24.50,  receipt: true,  status: 'approved',  employee: 'Bob Smith',     notes: 'Client meeting — Initech' },
  { id: 'EXP-0040', date: '2026-05-31', vendor: 'Delta Air',    category: 'Travel',        amount: 312.00, receipt: true,  status: 'approved',  employee: 'Jane Doe',      notes: 'NY conference' },
  { id: 'EXP-0039', date: '2026-05-30', vendor: 'Sweetgreen',   category: 'Meals',         amount: 87.40,  receipt: false, status: 'pending',   employee: 'Alice Johnson', notes: 'Team lunch' },
  { id: 'EXP-0038', date: '2026-05-29', vendor: 'Amazon',       category: 'Office',        amount: 156.32, receipt: true,  status: 'approved',  employee: 'Marcus Lee',    notes: 'Keyboard + mouse' },
  { id: 'EXP-0037', date: '2026-05-28', vendor: 'Marriott',     category: 'Travel',        amount: 429.00, receipt: true,  status: 'approved',  employee: 'Jane Doe',      notes: 'NY conference hotel' },
  { id: 'EXP-0036', date: '2026-05-27', vendor: 'Figma',        category: 'Software',      amount: 45.00,  receipt: true,  status: 'approved',  employee: 'Alice Johnson', notes: 'Monthly subscription' },
  { id: 'EXP-0035', date: '2026-05-26', vendor: 'Staples',      category: 'Office',        amount: 63.18,  receipt: false, status: 'pending',   employee: 'Bob Smith',     notes: 'Printer paper + toner' },
  { id: 'EXP-0034', date: '2026-05-22', vendor: 'Comcast',      category: 'Utilities',     amount: 189.99, receipt: true,  status: 'approved',  employee: 'Jane Doe',      notes: 'Office internet — May' },
  { id: 'EXP-0033', date: '2026-05-20', vendor: 'OpenTable',    category: 'Meals',         amount: 245.00, receipt: true,  status: 'reimbursed',employee: 'Jane Doe',      notes: 'Client dinner — Globex' },
  { id: 'EXP-0032', date: '2026-05-15', vendor: 'Home Depot',   category: 'Office',        amount: 92.44,  receipt: false, status: 'rejected',  employee: 'Marcus Lee',    notes: '' },
];

export const expenseCategories = [
  'Travel', 'Meals', 'Office', 'Software', 'Utilities',
  'Marketing', 'Professional Services', 'Training', 'Other',
];

export const expenseEmployees = ['Jane Doe', 'Bob Smith', 'Alice Johnson', 'Marcus Lee'];
