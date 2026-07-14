export const employees = [
  { id: 'e1', firstName: 'Jane',    lastName: 'Doe',      email: 'jane@acmeco.com',    status: 'active',     payType: 'salary', payRate: 95000,  payFrequency: 'biweekly', hireDate: '2022-03-01', title: 'CEO'               },
  { id: 'e2', firstName: 'Bob',     lastName: 'Smith',    email: 'bob@acmeco.com',     status: 'active',     payType: 'salary', payRate: 78000,  payFrequency: 'biweekly', hireDate: '2023-01-15', title: 'Lead Developer'    },
  { id: 'e3', firstName: 'Alice',   lastName: 'Johnson',  email: 'alice@acmeco.com',   status: 'active',     payType: 'salary', payRate: 72000,  payFrequency: 'biweekly', hireDate: '2023-06-01', title: 'Designer'          },
  { id: 'e4', firstName: 'Marcus',  lastName: 'Lee',      email: 'marcus@acmeco.com',  status: 'active',     payType: 'hourly', payRate: 55,     payFrequency: 'biweekly', hireDate: '2024-02-12', title: 'Part-time Dev'     },
  { id: 'e5', firstName: 'Priya',   lastName: 'Patel',    email: 'priya@acmeco.com',   status: 'terminated', payType: 'salary', payRate: 68000,  payFrequency: 'biweekly', hireDate: '2022-09-01', title: 'Marketing Manager' },
];

export const payRuns = [
  {
    id: 'pr1', periodStart: '2026-05-18', periodEnd: '2026-05-31', payDate: '2026-06-03',
    status: 'processed', totalGross: 14280, totalTaxes: 3570, totalNet: 10710,
    stubs: [
      { employee: 'Jane Doe',   gross: 3653.85, federal: 547.85, state: 182.70, ss: 226.54, medicare: 52.98, net: 2643.78 },
      { employee: 'Bob Smith',  gross: 3000.00, federal: 450.00, state: 150.00, ss: 186.00, medicare: 43.50, net: 2170.50 },
      { employee: 'Alice Johnson', gross: 2769.23, federal: 415.38, state: 138.46, ss: 171.69, medicare: 40.15, net: 2003.55 },
      { employee: 'Marcus Lee', gross: 1980.00, federal: 297.00, state: 99.00,  ss: 122.76, medicare: 28.71, net: 1432.53 },
    ],
  },
  {
    id: 'pr2', periodStart: '2026-05-04', periodEnd: '2026-05-17', payDate: '2026-05-20',
    status: 'processed', totalGross: 14280, totalTaxes: 3570, totalNet: 10710,
    stubs: [],
  },
  {
    id: 'pr3', periodStart: '2026-06-01', periodEnd: '2026-06-14', payDate: '2026-06-17',
    status: 'draft', totalGross: 0, totalTaxes: 0, totalNet: 0,
    stubs: [],
  },
];
