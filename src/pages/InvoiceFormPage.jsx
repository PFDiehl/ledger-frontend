import { useState } from 'react';
import { clients } from '../lib/invoiceData';
import { fmt } from '../lib/utils';

const today      = new Date().toISOString().slice(0, 10);
const thirtyDays = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

const emptyItem = () => ({ description: '', qty: 1, rate: '', amount: 0 });

const emptyInvoice = {
  client: '', email: '', issued: today, due: thirtyDays,
  items: [emptyItem()], notes: '',
};

export default function InvoiceFormPage({ invoice, onBack, onSave }) {
  const isEdit = Boolean(invoice);
  const [form, setForm] = useState(invoice ? { ...invoice, items: invoice.items.map(i => ({ ...i })) } : emptyInvoice);
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

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));
  }

  function removeItem(idx) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  function selectClient(name) {
    const client = clients.find(c => c.name === name);
    setForm(f => ({ ...f, client: name, email: client?.email ?? f.email }));
  }

  const subtotal = form.items.reduce((s, i) => s + (i.amount || 0), 0);

  function validate() {
    const e = {};
    if (!form.client) e.client = 'Client is required';
    if (!form.issued) e.issued = 'Issue date is required';
    if (!form.due)    e.due    = 'Due date is required';
    if (form.items.some(i => !i.description)) e.items = 'All line items need a description';
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
          <button className="back-btn" onClick={onBack} aria-label="Back">
            <i className="ti ti-arrow-left" />
          </button>
          <h1 className="page-title">{isEdit ? `Edit ${form.id ?? 'invoice'}` : 'New invoice'}</h1>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => handleSave('draft')}>Save draft</button>
          <button className="btn-primary"   onClick={() => handleSave('sent')}>
            <i className="ti ti-send" aria-hidden="true" /> Save &amp; send
          </button>
        </div>
      </div>

      <div className="form-layout">
        {/* Left: form */}
        <div className="form-main">

          {/* Client */}
          <div className="form-section">
            <div className="form-section-title">Client</div>
            <div className="form-row two-col">
              <div className="form-field">
                <label>Client name</label>
                <input
                  list="client-list"
                  value={form.client}
                  onChange={e => selectClient(e.target.value)}
                  placeholder="Select or type a client"
                  className={errors.client ? 'input-error' : ''}
                />
                <datalist id="client-list">
                  {clients.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
                {errors.client && <div className="field-error">{errors.client}</div>}
              </div>
              <div className="form-field">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  placeholder="billing@client.com"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="form-section">
            <div className="form-section-title">Dates</div>
            <div className="form-row two-col">
              <div className="form-field">
                <label>Issue date</label>
                <input
                  type="date"
                  value={form.issued}
                  onChange={e => setField('issued', e.target.value)}
                  className={errors.issued ? 'input-error' : ''}
                />
                {errors.issued && <div className="field-error">{errors.issued}</div>}
              </div>
              <div className="form-field">
                <label>Due date</label>
                <input
                  type="date"
                  value={form.due}
                  onChange={e => setField('due', e.target.value)}
                  className={errors.due ? 'input-error' : ''}
                />
                {errors.due && <div className="field-error">{errors.due}</div>}
              </div>
            </div>
          </div>

          {/* Line items */}
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
                    <td>
                      <input
                        value={item.description}
                        onChange={e => setItem(idx, 'description', e.target.value)}
                        placeholder="Item description"
                        className="inline-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number" min="1" step="1"
                        value={item.qty}
                        onChange={e => setItem(idx, 'qty', e.target.value)}
                        className="inline-input right narrow-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number" min="0" step="0.01"
                        value={item.rate}
                        onChange={e => setItem(idx, 'rate', e.target.value)}
                        placeholder="0.00"
                        className="inline-input right narrow-input"
                      />
                    </td>
                    <td className="right amount-col">{fmt(item.amount)}</td>
                    <td>
                      {form.items.length > 1 && (
                        <button className="remove-item-btn" onClick={() => removeItem(idx)} aria-label="Remove line item">
                          <i className="ti ti-x" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button className="add-item-btn" onClick={addItem}>
              <i className="ti ti-plus" aria-hidden="true" /> Add line item
            </button>
          </div>

          {/* Notes */}
          <div className="form-section">
            <div className="form-section-title">Notes</div>
            <div className="form-field">
              <textarea
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                placeholder="Payment terms, thank-you message, or any additional notes…"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Right: preview totals */}
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
              <li>Save as draft to finish later.</li>
              <li>"Save &amp; send" emails the invoice immediately.</li>
              <li>You can add tax rates in Settings.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
