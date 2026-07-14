export const bankAccounts = [
  { id: 'ba1', name: 'Chase Checking',  institution: 'Chase',       type: 'checking', mask: '4821', balance: 24180.42, lastSynced: '2026-06-01T08:00:00Z', status: 'active'  },
  { id: 'ba2', name: 'Chase Savings',   institution: 'Chase',       type: 'savings',  mask: '9204', balance: 12500.00, lastSynced: '2026-06-01T08:00:00Z', status: 'active'  },
  { id: 'ba3', name: 'Amex Business',   institution: 'Amex',        type: 'credit',   mask: '7731', balance: -3240.18, lastSynced: '2026-06-01T07:45:00Z', status: 'active'  },
];

export const transactions = [
  { id: 't1',  accountId: 'ba1', date: '2026-06-01', description: 'Stripe payout',             amount: 7420.00,  status: 'categorized', category: 'Revenue',         merchant: 'Stripe'               },
  { id: 't2',  accountId: 'ba1', date: '2026-05-31', description: 'AWS',                        amount: -892.00,  status: 'reconciled',  category: 'Software',        merchant: 'Amazon Web Services'  },
  { id: 't3',  accountId: 'ba1', date: '2026-05-31', description: 'Gusto payroll',              amount: -14280.00,status: 'reconciled',  category: 'Payroll',         merchant: 'Gusto'                },
  { id: 't4',  accountId: 'ba1', date: '2026-05-30', description: 'WeWork rent',                amount: -2400.00, status: 'reconciled',  category: 'Rent',            merchant: 'WeWork'               },
  { id: 't5',  accountId: 'ba1', date: '2026-05-29', description: 'ACH TRANSFER INITECH',       amount: 7500.00,  status: 'categorized', category: 'Revenue',         merchant: null                   },
  { id: 't6',  accountId: 'ba1', date: '2026-05-28', description: 'GOOGLE *GSUITE',             amount: -144.00,  status: 'unreviewed',  category: null,              merchant: 'Google'               },
  { id: 't7',  accountId: 'ba1', date: '2026-05-28', description: 'SHOPIFY* MONTHLY',           amount: -299.00,  status: 'unreviewed',  category: null,              merchant: 'Shopify'              },
  { id: 't8',  accountId: 'ba1', date: '2026-05-27', description: 'ACH GLOBEX CORP',            amount: 4200.00,  status: 'unreviewed',  category: null,              merchant: null                   },
  { id: 't9',  accountId: 'ba3', date: '2026-05-31', description: 'Adobe Creative Cloud',       amount: -300.00,  status: 'unreviewed',  category: null,              merchant: 'Adobe'                },
  { id: 't10', accountId: 'ba3', date: '2026-05-30', description: 'Stripe fees',                amount: -418.00,  status: 'unreviewed',  category: null,              merchant: 'Stripe'               },
  { id: 't11', accountId: 'ba3', date: '2026-05-28', description: 'ZOOM.US',                    amount: -15.99,   status: 'categorized', category: 'Software',        merchant: 'Zoom'                 },
  { id: 't12', accountId: 'ba3', date: '2026-05-25', description: 'NOTION.SO ANNUAL',           amount: -96.00,   status: 'categorized', category: 'Software',        merchant: 'Notion'               },
];

export const expenseCategories = [
  'Revenue', 'Payroll', 'Rent', 'Software', 'Marketing',
  'Travel', 'Office Supplies', 'Utilities', 'Professional Services',
  'Bank Fees', 'Other',
];
