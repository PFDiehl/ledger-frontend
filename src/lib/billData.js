export const bills = [
  {
    id: 'BILL-1008', vendor: 'Amazon Web Services', email: 'aws-billing@amazon.com',
    billDate: '2026-05-01', dueDate: '2026-05-31', status: 'paid',
    items: [{ description: 'EC2 instances — May', qty: 1, rate: 892, amount: 892 }],
    notes: 'Auto-charged to Amex.',
  },
  {
    id: 'BILL-1007', vendor: 'Shopify', email: 'billing@shopify.com',
    billDate: '2026-05-01', dueDate: '2026-05-31', status: 'paid',
    items: [{ description: 'Advanced plan — May', qty: 1, rate: 299, amount: 299 }],
    notes: '',
  },
  {
    id: 'BILL-1006', vendor: 'WeWork', email: 'invoices@wework.com',
    billDate: '2026-06-01', dueDate: '2026-06-15', status: 'pending',
    items: [{ description: 'Office space — June', qty: 1, rate: 2400, amount: 2400 }],
    notes: 'Hot desk × 3 desks.',
  },
  {
    id: 'BILL-1005', vendor: 'Adobe', email: 'billing@adobe.com',
    billDate: '2026-05-15', dueDate: '2026-06-14', status: 'overdue',
    items: [
      { description: 'Creative Cloud — 5 seats', qty: 5, rate: 60, amount: 300 },
    ],
    notes: '',
  },
  {
    id: 'BILL-1004', vendor: 'Stripe', email: 'billing@stripe.com',
    billDate: '2026-05-31', dueDate: '2026-06-30', status: 'pending',
    items: [{ description: 'Processing fees — May', qty: 1, rate: 418, amount: 418 }],
    notes: '',
  },
  {
    id: 'BILL-1003', vendor: 'Gusto', email: 'billing@gusto.com',
    billDate: '2026-05-31', dueDate: '2026-06-15', status: 'pending',
    items: [{ description: 'Payroll service — May', qty: 1, rate: 149, amount: 149 }],
    notes: '',
  },
  {
    id: 'BILL-1002', vendor: 'WeWork', email: 'invoices@wework.com',
    billDate: '2026-05-01', dueDate: '2026-05-15', status: 'paid',
    items: [{ description: 'Office space — May', qty: 1, rate: 2400, amount: 2400 }],
    notes: '',
  },
  {
    id: 'BILL-1001', vendor: 'Google Workspace', email: 'billing@google.com',
    billDate: '2026-06-01', dueDate: '2026-06-30', status: 'draft',
    items: [
      { description: 'Business Plus — 8 seats', qty: 8, rate: 18, amount: 144 },
    ],
    notes: 'Annual plan billed monthly.',
  },
];

export const vendors = [
  { id: 'v1', name: 'Amazon Web Services',  email: 'aws-billing@amazon.com'  },
  { id: 'v2', name: 'Shopify',              email: 'billing@shopify.com'      },
  { id: 'v3', name: 'WeWork',               email: 'invoices@wework.com'      },
  { id: 'v4', name: 'Adobe',                email: 'billing@adobe.com'        },
  { id: 'v5', name: 'Stripe',               email: 'billing@stripe.com'       },
  { id: 'v6', name: 'Gusto',                email: 'billing@gusto.com'        },
  { id: 'v7', name: 'Google Workspace',     email: 'billing@google.com'       },
  { id: 'v8', name: 'GitHub',               email: 'billing@github.com'       },
];
