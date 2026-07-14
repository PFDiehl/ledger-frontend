import { useState } from 'react';
import { vendors } from '../lib/billData';
import { fmt } from '../lib/utils';

const today      = new Date().toISOString().slice(0, 10);
const thirtyDays = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
const emptyItem  = () => ({ description: '', qty: 1, rate: '', amount: 0 });

export default function BillFormPage({ bill, onBack, onSave }) {
  const isEdit = Boolean(bill);
  const [form, setForm] = useState(bill
    ? { ...bill, items: bill.items.map(i => ({ ...i })) }
    : { vendor: '', email: '', billDate: today, dueDate: thirtyDays, items: [emptyItem()], notes: '' }
  );
  const [errors, setErrors] = useState({});

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function setItem(idx, key, value) {
    setForm(f => {
      const items = f.items.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [key]: value };
        if (key === 'qty' || key === 'rate') {
          const qty  = parseFloat(key === 'qty'  ? value : item.qty)  || 0;
          const rate = parseFloat(key === 'rate' ? value : item.rate) || 0;
          updated.amount = Math.round(qty * rate * 100) / 100;
        }
        return updated;
      });
      return { ...f, items };
    });
  }

  function addItem()        { setForm(f => ({ ...f, items: [...f.items, emptyItem()] })); }
  function removeItem(idx)  { setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) })); }

  function selectVendor(name) {
    const v = vendors.find(v => v.name === name);
    setForm(f => ({ ...f, vendor: name, email: v?.email ?? f.email }));
  }

  const subtotal = form.items.reduce((s, i) => s + (i.amount || 0), 0);

  function validate() {
    const e = {};
    if (!form.vendor)   e.vendor   = 'Vendor is required';
    if (!form.billDate) e.billDate = 'Bill date is required';
    if (!form.dueDate)  e.dueDate  = 'Due date is required';
    if (form.items.some(i => !i.description)) e.items = 'All items need a description';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave(status) {
    if (!validate()) return;
    onSave?.({ ...form, status: status ?? (isEdit ? form.status : 'draft') });
  }

  return (
    <div className="page invoice-form-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="back-btn" onClick={onBack} aria-label="Back"><i className="ti ti-arrow-left" /></button>
          <h1 className="page-title">{isEdit ? `Edit ${form.id ?? 'bill'}` : 'New bill'}</h1>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => handleSave('draft')}>Save draft</button>
          <button className="btn-primary"   onClick={() => handleSave('pending')}>
            <i className="ti ti-check" aria-hidden="true" /> Save &amp; approve
          </button>
        </div>
      </div>

      <div className="form-layout">
        <div className="form-main">
          <div className="form-section">
            <div className="form-section-title">Vendor</div>
            <div className="form-row two-col">
              <div className="form-field">
                <label>Vendor name</label>
                <input list="vendor-list" value={form.vendor} onChange={e => selectVendor(e.target.value)}
                  placeholder="Select or type a vendor" className={errors.vendor ? 'input-error' : ''} />
                <datalist id="vendor-list">{vendors.map(v => <option key={v.id} value={v.name} />)}</datalist>
                {errors.vendor && <div className="field-error">{errors.vendor}</div>}
              </div>
              <div className="form-field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="billing@vendor.com" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Dates</div>
            <div className="form-row two-col">
              <div className="form-field">
                <label>Bill date</label>
                <input type="date" value={form.billDate} onChange={e => setField('billDate', e.target.value)} className={errors.billDate ? 'input-error' : ''} />
                {errors.billDate && <div className="field-error">{errors.billDate}</div>}
              </div>
              <div className="form-field">
                <label>Due date</label>
                <input type="date" value={form.dueDate} onChange={e => setField('dueDate', e.target.value)} className={errors.dueDate ? 'input-error' : ''} />
                {errors.dueDate && <div className="field-error">{errors.dueDate}</div>}
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Line items</div>
            {errors.items && <div className="field-error" style={{ marginBottom: 8 }}>{errors.items}</div>}
            <table className="line-items-form-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="right narrow">Qty</th>
                  <th className="right narrow">Rate</th>
                  <th className="right narrow">Amount</th>
                  <th className="narrow"></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => (
                  <tr key={idx}>
                    <td><input value={item.description} onChange={e => setItem(idx, 'description', e.target.value)} placeholder="Item description" className="inline-input" /></td>
                    <td><input type="number" min="1" step="1" value={item.qty} onChange={e => setItem(idx, 'qty', e.target.value)} className="inline-input right narrow-input" /></td>
                    <td><input type="number" min="0" step="0.01" value={item.rate} onChange={e => setItem(idx, 'rate', e.target.value)} placeholder="0.00" className="inline-input right narrow-input" /></td>
                    <td className="right amount-col">{fmt(item.amount)}</td>
                    <td>{form.items.length > 1 && (
                      <button className="remove-item-btn" onClick={() => removeItem(idx)} aria-label="Remove"><i className="ti ti-x" /></button>
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="add-item-btn" onClick={addItem}><i className="ti ti-plus" aria-hidden="true" /> Add line item</button>
          </div>

          <div className="form-section">
            <div className="form-section-title">Notes</div>
            <div className="form-field">
              <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Any notes about this bill…" rows={3} />
            </div>
          </div>
        </div>

        <div className="form-sidebar">
          <div className="totals-preview card">
            <div className="card-title" style={{ marginBottom: 14 }}>Summary</div>
            <div className="totals-row"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="totals-row"><span>Tax (0%)</span><span>{fmt(0)}</span></div>
            <div className="totals-row total-due"><span>Total</span><span>{fmt(subtotal)}</span></div>
          </div>
          <div className="form-help card" style={{ marginTop: 12 }}>
            <div className="card-title" style={{ marginBottom: 8 }}>Tips</div>
            <ul className="help-list">
              <li>Save as draft to review before approving.</li>
              <li>"Save &amp; approve" marks it ready for payment.</li>
              <li>Attach a PDF copy in the detail view.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
