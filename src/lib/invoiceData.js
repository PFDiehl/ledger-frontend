export const invoices = [
  {
    id: 'INV-1042', client: 'Globex Corp',      email: 'billing@globex.com',
    issued: '2026-05-28', due: '2026-06-27', status: 'sent',
    items: [
      { description: 'Web development — May', qty: 1, rate: 3200, amount: 3200 },
      { description: 'Hosting & infrastructure', qty: 1, rate: 1000, amount: 1000 },
    ],
    notes: 'Net 30. Thank you for your business.',
  },
  {
    id: 'INV-1041', client: 'Initech',           email: 'ap@initech.com',
    issued: '2026-05-20', due: '2026-06-19', status: 'paid',
    items: [
      { description: 'Consulting — 10 hrs', qty: 10, rate: 750, amount: 7500 },
    ],
    notes: '',
  },
  {
    id: 'INV-1040', client: 'Umbrella Ltd',      email: 'finance@umbrella.com',
    issued: '2026-04-16', due: '2026-05-16', status: 'overdue',
    items: [
      { description: 'Brand strategy workshop', qty: 1, rate: 2200, amount: 2200 },
      { description: 'Slide deck design',        qty: 1, rate: 900,  amount: 900  },
    ],
    notes: 'Payment terms: 30 days.',
  },
  {
    id: 'INV-1039', client: 'Wayne Enterprises', email: 'accounts@wayne.com',
    issued: '2026-05-25', due: '2026-06-24', status: 'overdue',
    items: [
      { description: 'Security audit',           qty: 1, rate: 3580, amount: 3580 },
    ],
    notes: '',
  },
  {
    id: 'INV-1038', client: 'Initech',           email: 'ap@initech.com',
    issued: '2026-04-20', due: '2026-05-20', status: 'paid',
    items: [
      { description: 'Monthly retainer — April', qty: 1, rate: 4500, amount: 4500 },
    ],
    notes: '',
  },
  {
    id: 'INV-1037', client: 'Stark Industries',  email: 'ap@stark.com',
    issued: '2026-05-10', due: '2026-05-25', status: 'overdue',
    items: [
      { description: 'API integration work',     qty: 1, rate: 2640, amount: 2640 },
    ],
    notes: 'Reference PO-2291.',
  },
  {
    id: 'INV-1036', client: 'Globex Corp',       email: 'billing@globex.com',
    issued: '2026-04-28', due: '2026-05-28', status: 'paid',
    items: [
      { description: 'Web development — April',  qty: 1, rate: 3200, amount: 3200 },
      { description: 'Hosting & infrastructure', qty: 1, rate: 1000, amount: 1000 },
    ],
    notes: '',
  },
  {
    id: 'INV-1035', client: 'Acme Partners',     email: 'billing@acmepartners.com',
    issued: '2026-03-01', due: '2026-03-31', status: 'draft',
    items: [
      { description: 'Market research report',   qty: 1, rate: 1800, amount: 1800 },
    ],
    notes: 'Draft — not yet sent.',
  },
];

export const clients = [
  { id: 'c1', name: 'Globex Corp',       email: 'billing@globex.com',       address: '742 Evergreen Terrace, Springfield, IL 62701' },
  { id: 'c2', name: 'Initech',           email: 'ap@initech.com',           address: '4120 Freidrich Ln, Austin, TX 73301' },
  { id: 'c3', name: 'Umbrella Ltd',      email: 'finance@umbrella.com',     address: '1407 Graymalkin Ln, Raccoon City, MO 63101' },
  { id: 'c4', name: 'Wayne Enterprises', email: 'accounts@wayne.com',       address: '1007 Mountain Drive, Gotham, NJ 07001' },
  { id: 'c5', name: 'Stark Industries',  email: 'ap@stark.com',             address: '200 Park Ave, Malibu, CA 90265' },
  { id: 'c6', name: 'Acme Partners',     email: 'billing@acmepartners.com', address: '123 Main Street, Looney, AZ 85001' },
];
