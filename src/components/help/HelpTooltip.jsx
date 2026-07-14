import { useState, useRef, useEffect } from 'react';

// ── Plain English definitions for every financial term in the app ─────────────

export const HELP_CONTENT = {
  // Reports
  'net-profit': {
    term: 'Net profit',
    plain: 'What you actually kept',
    explain: 'This is the money left over after you paid all your bills. Revenue minus everything you spent. If it\'s positive, your business made money. If it\'s negative, you spent more than you earned.',
    example: 'You brought in $48,200 and spent $31,450, so you kept $16,750.',
    tip: 'A healthy small business typically keeps 10–30% of revenue as net profit.',
  },
  'gross-profit': {
    term: 'Gross profit',
    plain: 'Revenue minus cost of goods',
    explain: 'What you made from sales before subtracting overhead like rent and salaries. Useful for understanding if your products or services are priced right.',
    example: 'You sold $48,200 of services and it cost $12,000 to deliver them, so your gross profit is $36,200.',
  },
  'accounts-receivable': {
    term: 'Accounts receivable',
    plain: 'Money people owe you',
    explain: 'The total of all invoices you\'ve sent that haven\'t been paid yet. Think of it as a running tab that your clients owe you.',
    example: 'You\'ve sent invoices to Globex ($4,200) and Wayne Enterprises ($3,580) that haven\'t been paid. Your accounts receivable is $7,780.',
    tip: 'If this number keeps growing, it might be time to follow up on overdue invoices.',
  },
  'accounts-payable': {
    term: 'Accounts payable',
    plain: 'Money you owe others',
    explain: 'Bills you\'ve received but haven\'t paid yet. The flip side of accounts receivable.',
    example: 'You have an unpaid AWS bill for $892 and a WeWork invoice for $2,400. Your accounts payable is $3,292.',
  },
  'cash-flow': {
    term: 'Cash flow',
    plain: 'Money moving in and out',
    explain: 'The actual movement of money into and out of your business. Different from profit — a profitable business can still run out of cash if clients pay late.',
    example: 'You made $16,750 profit this month but your cash actually went down $2,100 because you paid for a big software subscription upfront.',
    tip: 'A business can be profitable and still go bankrupt if it runs out of cash. Watch this number carefully.',
  },
  'journal-entry': {
    term: 'Journal entry',
    plain: 'A record of a financial event',
    explain: 'Every time money moves in your business, it gets recorded as a journal entry. It always has two sides — where the money came from and where it went.',
    example: 'When Globex pays your invoice: money goes into your bank account (debit) and the amount they owed you goes down (credit).',
  },
  'double-entry': {
    term: 'Double-entry bookkeeping',
    plain: 'Every transaction recorded twice for accuracy',
    explain: 'A centuries-old accounting method where every transaction is recorded in two places. This makes it impossible for money to appear or disappear — if it went somewhere, it came from somewhere.',
    tip: 'This is why your books always "balance." Ledger enforces this automatically so you can\'t make a mistake.',
  },
  'balance-sheet': {
    term: 'Balance sheet',
    plain: 'A snapshot of what you own and what you owe',
    explain: 'Shows everything your business owns (assets) minus everything it owes (liabilities). What\'s left over is the net worth of your business.',
    example: 'Assets: $33,440 in bank + $7,780 people owe you = $41,220. Liabilities: $3,292 you owe others. Net worth: $37,928.',
  },
  'pl-report': {
    term: 'P&L (Profit & Loss)',
    plain: 'Did you make or lose money?',
    explain: 'A summary of all the money that came in (revenue) and went out (expenses) over a period. The bottom line tells you if you made money or lost it.',
    tip: 'This is the report your accountant looks at first, and the one banks want to see when you apply for a loan.',
  },
  'reconciliation': {
    term: 'Reconciliation',
    plain: 'Checking your records match your bank',
    explain: 'Comparing what\'s in your accounting records to what actually happened in your bank account. Like checking your checkbook against your bank statement.',
    tip: 'Do this monthly. It catches errors, fraud, and missing transactions before they become big problems.',
  },
  'depreciation': {
    term: 'Depreciation',
    plain: 'Spreading a big purchase over time',
    explain: 'When you buy something expensive that lasts years (like a computer), instead of recording the whole cost at once, you spread it over the item\'s useful life.',
    example: 'You bought a $3,000 laptop. Instead of recording a $3,000 expense, you record $600/year for 5 years.',
  },
  'accrual': {
    term: 'Accrual accounting',
    plain: 'Record when it happens, not when cash moves',
    explain: 'You record revenue when you earn it (send the invoice) rather than when you get paid. And expenses when you incur them, not when you pay the bill.',
    tip: 'This gives a more accurate picture of your business. Most businesses over $1M in revenue are required to use it.',
  },
  'chart-of-accounts': {
    term: 'Chart of accounts',
    plain: 'Your financial filing system',
    explain: 'A list of all the categories used to organize your financial transactions. Think of it like labeled folders — every dollar that comes in or goes out gets filed in the right folder.',
    example: 'Common accounts: Checking (where your money sits), Sales Revenue (money you earned), Rent (what you pay for your office), etc.',
  },
  'cogs': {
    term: 'Cost of goods sold (COGS)',
    plain: 'What it cost to make what you sold',
    explain: 'The direct costs tied to producing whatever you sell. For a product business, that\'s materials and manufacturing. For a service business, it\'s usually the time spent delivering the service.',
  },
  'ar-aging': {
    term: 'Aged AR report',
    plain: 'Who owes you money and how late they are',
    explain: 'Groups your unpaid invoices by how overdue they are — current, 1-30 days late, 31-60 days, 61-90 days, and 90+ days. The older a debt, the less likely you are to collect it.',
    tip: 'Anything over 90 days should get extra attention. The average recovery rate drops sharply after that.',
  },
  'ebitda': {
    term: 'EBITDA',
    plain: 'Profit before the accountant stuff',
    explain: 'Earnings Before Interest, Taxes, Depreciation, and Amortization. A measure of operating profitability that strips out financing and accounting decisions. Often used to compare businesses.',
  },
  'retained-earnings': {
    term: 'Retained earnings',
    plain: 'Profit you kept in the business',
    explain: 'The total of all profits your business has ever made, minus any money taken out by the owners. It grows every year when the business is profitable.',
  },
  'tax-liability': {
    term: 'Tax liability',
    plain: 'Taxes you owe but haven\'t paid yet',
    explain: 'As your business earns money, you accumulate a tax obligation even before you pay it. This shows up as a liability on your balance sheet until you write the check to the IRS.',
  },
};

// ── Help tooltip component ────────────────────────────────────────────────────

export function HelpTooltip({ termKey, children }) {
  const [open, setOpen]       = useState(false);
  const [position, setPos]    = useState('below'); // 'below' | 'above'
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  const content = HELP_CONTENT[termKey];
  if (!content) return <>{children}</>;

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos(rect.top > 300 ? 'above' : 'below');
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (!tooltipRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {children}
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        aria-label={`Explain ${content.term}`}
        style={{
          width: 16, height: 16, borderRadius: '50%',
          background: open ? 'var(--brand-primary,#2D4A35)' : 'var(--color-background-secondary)',
          border: '0.5px solid var(--color-border-secondary)',
          color: open ? '#fff' : 'var(--color-text-tertiary)',
          fontSize: 10, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, lineHeight: 1,
          transition: 'all 0.15s',
        }}
      >?</button>

      {open && (
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            [position === 'below' ? 'top' : 'bottom']: '100%',
            left: 0,
            marginTop: position === 'below' ? 6 : 0,
            marginBottom: position === 'above' ? 6 : 0,
            width: 300,
            background: 'var(--color-background-primary)',
            border: '0.5px solid var(--color-border-secondary)',
            borderRadius: 10,
            padding: '14px 16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            zIndex: 200,
            animation: 'fadeUp 0.12s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{content.term}</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#EBF2E8', color: 'var(--brand-primary,#2D4A35)', fontWeight: 500 }}>
              {content.plain}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: content.example ? 10 : 0 }}>
            {content.explain}
          </p>
          {content.example && (
            <div style={{ fontSize: 12, background: 'var(--color-background-secondary)', borderRadius: 6, padding: '8px 10px', marginBottom: content.tip ? 8 : 0, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Example: </span>
              {content.example}
            </div>
          )}
          {content.tip && (
            <div style={{ fontSize: 12, color: 'var(--brand-primary,#2D4A35)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0 }}>💡</span>
              {content.tip}
            </div>
          )}
        </div>
      )}
    </span>
  );
}

// ── Inline term — use this to wrap any financial term in text ─────────────────
// Usage: <Term id="net-profit">Net profit</Term>

export function Term({ id, children }) {
  return (
    <HelpTooltip termKey={id}>
      <span style={{
        borderBottom: '1px dashed var(--color-border-secondary)',
        cursor: 'help',
      }}>
        {children}
      </span>
    </HelpTooltip>
  );
}

// ── Help panel — full glossary ────────────────────────────────────────────────

export function HelpGlossary() {
  const [search, setSearch] = useState('');
  const [open,   setOpen]   = useState(null);

  const filtered = Object.entries(HELP_CONTENT).filter(([, v]) =>
    !search ||
    v.term.toLowerCase().includes(search.toLowerCase()) ||
    v.plain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="Search financial terms…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '0.5px solid var(--color-border-secondary)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map(([key, content]) => (
          <div key={key} style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setOpen(open === key ? null : key)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: open === key ? 'var(--color-background-secondary)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{content.term}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{content.plain}</span>
              </div>
              <i className={`ti ti-chevron-${open === key ? 'up' : 'down'}`} style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }} />
            </button>
            {open === key && (
              <div style={{ padding: '0 14px 14px', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                <p style={{ marginBottom: content.example ? 10 : 0 }}>{content.explain}</p>
                {content.example && (
                  <div style={{ background: 'var(--color-background-secondary)', borderRadius: 6, padding: '8px 10px', marginBottom: content.tip ? 8 : 0 }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Example: </span>{content.example}
                  </div>
                )}
                {content.tip && (
                  <div style={{ color: 'var(--brand-primary,#2D4A35)', display: 'flex', gap: 6, marginTop: 8 }}>
                    <span>💡</span>{content.tip}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
