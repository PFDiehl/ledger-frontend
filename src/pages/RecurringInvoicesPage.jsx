import { useState } from 'react';
import StatusBadge from '../components/ui/StatusBadge';
import { useToast } from '../lib/ToastContext';
import { fmt } from '../lib/utils';

const STATUS_MAP = { active: 'sent', paused: 'pending', cancelled: 'void', completed: 'paid' };
const FREQ_LABELS = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual' };
const FREQ_NEXT   = { weekly: 7, monthly: 30, quarterly: 90, annual: 365 };

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const today = new Date().toISOString().slice(0, 10);

const seedSchedules = [
  {
    id: 'rec-1', status: 'active', frequency: 'monthly',
    nextInvoiceAt: '2026-07-01', autoSend: true, invoicesCreated: 6,
    contact: { name: 'Globex Corp', email: 'billing@globex.com' },
    templateData: {
      currency: 'USD', notes: 'Monthly retainer',
      lineItems: [{ description: 'Web dev retainer', quantity: 1, unitPrice: 4200 }],
    },
  },
  {
    id: 'rec-2', status: 'active', frequency: 'monthly',
    nextInvoiceAt: '2026-07-01', autoSend: false, invoicesCreated: 3,
    contact: { name: 'Initech', email: 'ap@initech.com' },
    templateData: {
      currency: 'USD', notes: '',
      lineItems: [{ description: 'SaaS platform access', quantity: 1, unitPrice: 1500 }],
    },
  },
  {
    id: 'rec-3', status: 'paused', frequency: 'quarterly',
    nextInvoiceAt: '2026-09-01', autoSend: false, invoicesCreated: 2,
    contact: { name: 'Wayne Enterprises', email: 'accounts@wayne.com' },
    templateData: {
      currency: 'USD', notes: 'Quarterly security review',
      lineItems: [{ description: 'Security audit — Q3', quantity: 1, unitPrice: 3580 }],
    },
  },
  {
    id: 'rec-4', status: 'completed', frequency: 'annual',
    nextInvoiceAt: '2027-01-01', autoSend: true, invoicesCreated: 1,
    endDate: '2026-12-31',
    contact: { name: 'Acme Partners', email: 'billing@acmepartners.com' },
    templateData: {
      currency: 'USD', notes: 'Annual licence',
      lineItems: [{ description: 'Platform licence', quantity: 1, unitPrice: 9600 }],
    },
  },
];

const clients = ['Globex Corp', 'Initech', 'Umbrella Ltd', 'Wayne Enterprises', 'Stark Industries', 'Acme Partners'];

function ScheduleFormModal({ schedule, onClose, onSave }) {
  const isEdit = Boolean(schedule?.id);
  const [form, setForm] = useState({
    contact:       schedule?.contact?.name ?? '',
    frequency:     schedule?.frequency    ?? 'monthly',
    nextInvoiceAt: schedule?.nextInvoiceAt ?? addDays(today, 30),
    endDate:       schedule?.endDate       ?? '',
    autoSend:      schedule?.autoSend      ?? false,
    description:   schedule?.templateData?.lineItems?.[0]?.description ?? '',
    unitPrice:     schedule?.templateData?.lineItems?.[0]?.unitPrice   ?? '',
    notes:         schedule?.templateData?.notes ?? '',
  });

  const subtotal = parseFloat(form.unitPrice) || 0;

  function save() {
    if (!form.contact || !form.description || !form.unitPrice) return;
    onSave({
      ...schedule,
      contact:       { name: form.contact, email: '' },
      frequency:     form.frequency,
      nextInvoiceAt: form.nextInvoiceAt,
      endDate:       form.endDate || null,
      autoSend:      form.autoSend,
      status:        schedule?.status ?? 'active',
      invoicesCreated: schedule?.invoicesCreated ?? 0,
      templateData: {
        currency: 'USD',
        notes:    form.notes,
        lineItems: [{ description: form.description, quantity: 1, unitPrice: subtotal }],
      },
    });
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
      <div style={{ background:'var(--color-background-primary)', borderRadius:12, padding:28, width:480, border:'0.5px solid var(--color-border-tertiary)', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontSize:16, fontWeight:500 }}>{isEdit ? 'Edit schedule' : 'New recurring invoice'}</h2>
          <button style={{ fontSize:18, color:'var(--color-text-secondary)', background:'none', border:'none', cursor:'pointer' }} onClick={onClose}><i className="ti ti-x" /></button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="form-field">
            <label>Client</label>
            <select value={form.contact} onChange={e => setForm(f=>({...f,contact:e.target.value}))}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-row two-col">
            <div className="form-field">
              <label>Frequency</label>
              <select value={form.frequency} onChange={e => setForm(f=>({...f,frequency:e.target.value}))}>
                {Object.entries(FREQ_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>First invoice date</label>
              <input type="date" value={form.nextInvoiceAt} onChange={e => setForm(f=>({...f,nextInvoiceAt:e.target.value}))} />
            </div>
          </div>

          <div className="form-row two-col">
            <div className="form-field">
              <label>End date (optional)</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f=>({...f,endDate:e.target.value}))} />
            </div>
            <div className="form-field">
              <label>Amount</label>
              <input type="number" min="0" step="0.01" value={form.unitPrice}
                onChange={e => setForm(f=>({...f,unitPrice:e.target.value}))} placeholder="0.00" />
            </div>
          </div>

          <div className="form-field">
            <label>Line item description</label>
            <input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
              placeholder="e.g. Monthly retainer — web development" />
          </div>

          <div className="form-field">
            <label>Notes (shown on invoice)</label>
            <input value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional" />
          </div>

          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer' }}>
            <input type="checkbox" checked={form.autoSend} onChange={e => setForm(f=>({...f,autoSend:e.target.checked}))} />
            Auto-send invoice when generated
          </label>
        </div>

        <div style={{ background:'var(--color-background-secondary)', borderRadius:8, padding:'12px 14px', marginTop:16, fontSize:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, color:'var(--color-text-secondary)' }}>
            <span>Recurring amount</span>
            <span style={{ fontWeight:500, color:'var(--color-text-primary)' }}>{fmt(subtotal)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', color:'var(--color-text-secondary)' }}>
            <span>Annual value</span>
            <span style={{ fontWeight:500, color:'var(--color-text-primary)' }}>
              {fmt(subtotal * (365 / (FREQ_NEXT[form.frequency] || 30)))}
            </span>
          </div>
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20 }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save}>
            {isEdit ? 'Save changes' : 'Create schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScheduleCard({ schedule, onEdit, onToggle, onCancel }) {
  const total   = schedule.templateData.lineItems.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const isActive = schedule.status === 'active';
  const isPaused = schedule.status === 'paused';

  const annualValue = total * (365 / FREQ_NEXT[schedule.frequency]);

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: `0.5px solid ${isActive ? 'var(--color-border-secondary)' : 'var(--color-border-tertiary)'}`,
      borderRadius: 12, padding: '18px 20px',
      opacity: schedule.status === 'cancelled' || schedule.status === 'completed' ? 0.6 : 1,
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:500, marginBottom:3 }}>{schedule.contact.name}</div>
          <div style={{ fontSize:12, color:'var(--color-text-tertiary)' }}>{schedule.contact.email}</div>
        </div>
        <StatusBadge status={STATUS_MAP[schedule.status] ?? 'draft'} />
      </div>

      <div style={{ background:'var(--color-background-secondary)', borderRadius:8, padding:'10px 12px', marginBottom:14, fontSize:12 }}>
        {schedule.templateData.lineItems.map((li, i) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', color:'var(--color-text-secondary)' }}>
            <span>{li.description}</span>
            <span style={{ fontWeight:500, color:'var(--color-text-primary)' }}>{fmt(li.unitPrice)}</span>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14, fontSize:12 }}>
        <div>
          <div style={{ color:'var(--color-text-tertiary)', marginBottom:2 }}>Frequency</div>
          <div style={{ fontWeight:500 }}>{FREQ_LABELS[schedule.frequency]}</div>
        </div>
        <div>
          <div style={{ color:'var(--color-text-tertiary)', marginBottom:2 }}>Next invoice</div>
          <div style={{ fontWeight:500, color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
            {isActive || isPaused ? schedule.nextInvoiceAt : '—'}
          </div>
        </div>
        <div>
          <div style={{ color:'var(--color-text-tertiary)', marginBottom:2 }}>Annual value</div>
          <div style={{ fontWeight:500 }}>{fmt(annualValue)}</div>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:11, color:'var(--color-text-tertiary)' }}>
          {schedule.autoSend
            ? <span style={{ color:'#0F6E56' }}><i className="ti ti-send" style={{ marginRight:4 }} />Auto-send on</span>
            : <span><i className="ti ti-send" style={{ marginRight:4 }} />Manual send</span>
          }
          &nbsp;· {schedule.invoicesCreated} invoice{schedule.invoicesCreated !== 1 ? 's' : ''} created
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {(isActive || isPaused) && (
            <button className="btn-secondary" style={{ fontSize:12, padding:'4px 10px' }} onClick={() => onToggle(schedule)}>
              {isActive ? <><i className="ti ti-player-pause" /> Pause</> : <><i className="ti ti-player-play" /> Resume</>}
            </button>
          )}
          {(isActive || isPaused) && (
            <button className="btn-secondary" style={{ fontSize:12, padding:'4px 10px' }} onClick={() => onEdit(schedule)}>
              <i className="ti ti-edit" /> Edit
            </button>
          )}
          {(isActive || isPaused) && (
            <button className="btn-secondary" style={{ fontSize:12, padding:'4px 10px', color:'#A32D2D', borderColor:'#F09595' }} onClick={() => onCancel(schedule.id)}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RecurringInvoicesPage() {
  const toast = useToast();
  const [schedules, setSchedules] = useState(seedSchedules);
  const [modal, setModal]         = useState(null);

  const active    = schedules.filter(s => s.status === 'active');
  const paused    = schedules.filter(s => s.status === 'paused');
  const inactive  = schedules.filter(s => s.status === 'cancelled' || s.status === 'completed');

  const monthlyRecurring = active.reduce((sum, s) => {
    const t = s.templateData.lineItems.reduce((a, l) => a + l.unitPrice * l.quantity, 0);
    return sum + t * (30 / FREQ_NEXT[s.frequency]);
  }, 0);

  function handleSave(data) {
    if (data.id) {
      setSchedules(prev => prev.map(s => s.id === data.id ? data : s));
      toast.success('Schedule updated');
    } else {
      setSchedules(prev => [{ ...data, id: `rec-${Date.now()}` }, ...prev]);
      toast.success('Recurring schedule created');
    }
    setModal(null);
  }

  function handleToggle(schedule) {
    const next = schedule.status === 'active' ? 'paused' : 'active';
    setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, status: next } : s));
    toast.info(next === 'paused' ? 'Schedule paused' : 'Schedule resumed');
  }

  function handleCancel(id) {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelled' } : s));
    toast.info('Schedule cancelled');
  }

  return (
    <div className="page recurring-page">
      {modal && (
        <ScheduleFormModal
          schedule={modal.schedule}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      <div className="page-header">
        <h1 className="page-title">Recurring invoices</h1>
        <button className="btn-primary" onClick={() => setModal({ schedule: null })}>
          <i className="ti ti-plus" /> New schedule
        </button>
      </div>

      <div className="inv-summary-strip" style={{ marginBottom: 20 }}>
        <div className="inv-summary-card">
          <div className="inv-summary-label">Active schedules</div>
          <div className="inv-summary-value">{active.length}</div>
        </div>
        <div className="inv-summary-card success">
          <div className="inv-summary-label">Monthly recurring</div>
          <div className="inv-summary-value" style={{ fontSize:17 }}>{fmt(monthlyRecurring)}</div>
        </div>
        <div className="inv-summary-card">
          <div className="inv-summary-label">Annual recurring</div>
          <div className="inv-summary-value" style={{ fontSize:17 }}>{fmt(monthlyRecurring * 12)}</div>
        </div>
        <div className="inv-summary-card muted">
          <div className="inv-summary-label">Paused</div>
          <div className="inv-summary-value">{paused.length}</div>
        </div>
      </div>

      {active.length > 0 && (
        <>
          <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--color-text-tertiary)', marginBottom:10 }}>Active</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:12, marginBottom:20 }}>
            {active.map(s => <ScheduleCard key={s.id} schedule={s} onEdit={s => setModal({ schedule: s })} onToggle={handleToggle} onCancel={handleCancel} />)}
          </div>
        </>
      )}

      {paused.length > 0 && (
        <>
          <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--color-text-tertiary)', marginBottom:10 }}>Paused</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:12, marginBottom:20 }}>
            {paused.map(s => <ScheduleCard key={s.id} schedule={s} onEdit={s => setModal({ schedule: s })} onToggle={handleToggle} onCancel={handleCancel} />)}
          </div>
        </>
      )}

      {inactive.length > 0 && (
        <>
          <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--color-text-tertiary)', marginBottom:10 }}>Completed & cancelled</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:12 }}>
            {inactive.map(s => <ScheduleCard key={s.id} schedule={s} onEdit={() => {}} onToggle={() => {}} onCancel={() => {}} />)}
          </div>
        </>
      )}
    </div>
  );
}
