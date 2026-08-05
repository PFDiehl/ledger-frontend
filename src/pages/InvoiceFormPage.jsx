import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { fmt } from '../lib/utils';

const API = 'https://ledger-accounting-production.up.railway.app/api';
const today = new Date().toISOString().slice(0, 10);
const thirtyDays = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
const emptyLine = () => ({ description: '', qty: '1', rate: '', amount: 0 });

export default function InvoiceFormPage({ invoice, onBack, onSave }) {
  const { org } = useAuth();
  const isEdit = Boolean(invoice);
  const [form, setForm] = useState({
    clientName: invoice?.contact?.name || '',
    clientEmail: invoice?.contact?.email || '',
    poNumber: invoice?.poNumber || '',
    notes: invoice?.notes || '',
    issued: invoice?.issueDate ? invoice.issueDate.slice(0,10) : today,
    due: invoice?.dueDate ? invoice.dueDate.slice(0,10) : thirtyDays,
    taxRate: invoice?.taxRate || '',
    shipping: invoice?.shipping || '',
    discount: invoice?.discount || '',salesperson: invoice?.salesperson || '',
    shipToName: invoice?.shipToName || '',
    shipToAddress: invoice?.shipToAddress || '',
    currency: invoice?.currency || 'USD',
  });
  const [lines, setLines] = useState(
    invoice?.lines?.length
      ? invoice.lines.map(l => ({ description: l.description, qty: String(l.quantity), rate: String(l.unitPrice), amount: Number(l.amount) }))
      : [emptyLine()]
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});

  function setField(k, v) { setForm(f => ({...f, [k]: v})); }
  function addLine() { setLines(l => [...l, emptyLine()]); }
  function removeLine(i) { setLines(l => l.filter((_, idx) => idx !== i)); }
  function updateLine(i, key, value) {
    setLines(l => l.map((line, idx) => {
      if (idx !== i) return line;
      const updated = {...line, [key]: value};
      const qty = parseFloat(key === 'qty' ? value : line.qty) || 0;
      const rate = parseFloat(key === 'rate' ? value : line.rate) || 0;
      updated.amount = Math.round(qty * rate * 100) / 100;
      return updated;
    }));
  }

  const subtotal = lines.reduce((s, l) => s + (Math.round((Number(l.qty||0) * Number(l.rate||0)) * 100) / 100), 0);
  const taxAmount = subtotal * (parseFloat(form.taxRate || 0) / 100);
  const total = subtotal + taxAmount + parseFloat(form.shipping || 0) - parseFloat(form.discount || 0);

  function validate() {
    const e = {};
    if (!form.clientName) e.clientName = 'Client name is required';
    if (lines.some(l => !l.description)) e.lines = 'All line items need a description';
    if (lines.some(l => !l.rate)) e.lines = 'All line items need a rate';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave(sendNow = false) {
    if (!validate()) return;
    if (!org) return alert('No organization found');
    if (saved) return;
    setSaved(true);
    setLoading(true);
    try {
      const payload = {
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        poNumber: form.poNumber,salesperson: form.salesperson,
        shipToName: form.shipToName,
        shipToAddress: form.shipToAddress,
        currency: form.currency,
        notes: form.notes,
        dueDate: form.due,
        taxRate: form.taxRate,
        shipping: form.shipping,
        discount: form.discount,
        lines: lines.map(l => ({ description: l.description, quantity: l.qty, unitPrice: l.rate }))
      };
      const method = isEdit ? 'PATCH' : 'POST';
      const url = isEdit
        ? `${API}/orgs/${org.id}/invoices/${invoice.id}`
        : `${API}/orgs/${org.id}/invoices`;
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (j.success) {
        if (sendNow && j.data?.id) {
          await fetch(`${API}/orgs/${org.id}/invoices/${j.data.id}/send`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken') ?? ''}` }
          });
        }
        onSave?.();
      } else {
        alert('Error: ' + (j.message || 'Failed to save'));
      }
    } catch(e) { alert('Error: Cannot connect to server'); }
    finally { setLoading(false); }
  }

  return (
    <div className="page invoice-form-page">
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button className="back-btn" onClick={onBack} aria-label="Back"><i className="ti ti-arrow-left" /></button>
          <h1 className="page-title">{isEdit ? 'Edit Invoice' : 'New Invoice'}</h1>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={()=>handleSave(false)} disabled={loading}>
            {loading ? 'Saving...' : 'Save draft'}
          </button>
          <button className="btn-primary" onClick={()=>handleSave(true)} disabled={loading}>
            <i className="ti ti-send" /> {loading ? 'Saving...' : 'Save & send'}
          </button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:20}}>
        <div>

          {/* Client */}
          <div className="card" style={{padding:24,marginBottom:16}}>
            <h3 style={{fontSize:14,fontWeight:600,marginBottom:16,color:'#2D4A35'}}>Client</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div>
                <label style={{fontSize:12,color:'#7A9A7A',display:'block',marginBottom:4}}>Client Name *</label>
                <input value={form.clientName} onChange={e=>setField('clientName',e.target.value)}
                  placeholder="Acme Corp" style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:14,boxSizing:'border-box'}} />
                {errors.clientName && <span style={{color:'#c0392b',fontSize:12}}>{errors.clientName}</span>}
              </div>
              <div>
                <label style={{fontSize:12,color:'#7A9A7A',display:'block',marginBottom:4}}>Client Email</label>
                <input value={form.clientEmail} onChange={e=>setField('clientEmail',e.target.value)}
                  placeholder="billing@client.com" type="email" style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:14,boxSizing:'border-box'}} />
              </div>
            </div>
            </div>
            <div style={{marginTop:12}}>
              <label style={{fontSize:12,color:'#7A9A7A',display:'block',marginBottom:4}}>Salesperson</label>
              <input value={form.salesperson} onChange={e=>setField('salesperson',e.target.value)} placeholder="Jane Smith" style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:14,boxSizing:'border-box'}} />
            </div>
            <div style={{marginTop:12}}>
              <label style={{fontSize:12,color:'#7A9A7A',display:'block',marginBottom:4}}>Ship To Name</label>
              <input value={form.shipToName} onChange={e=>setField('shipToName',e.target.value)} placeholder="Recipient name" style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:14,boxSizing:'border-box'}} />
            </div>
            <div style={{marginTop:12}}>
              <label style={{fontSize:12,color:'#7A9A7A',display:'block',marginBottom:4}}>Ship To Address</label>
              <input value={form.shipToAddress} onChange={e=>setField('shipToAddress',e.target.value)} placeholder="123 Main St, Miami FL 33101" style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:14,boxSizing:'border-box'}} />
            </div>
            <div style={{marginTop:12}}>
              <label style={{fontSize:12,color:'#7A9A7A',display:'block',marginBottom:4}}>Currency</label>
              <select value={form.currency} onChange={e=>setField('currency',e.target.value)} style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:14,boxSizing:'border-box',background:'#fff'}}>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="AUD">AUD — Australian Dollar</option>
                <option value="MXN">MXN — Mexican Peso</option>
                <option value="JPY">JPY — Japanese Yen</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="card" style={{padding:24,marginBottom:16}}>
            <h3 style={{fontSize:14,fontWeight:600,marginBottom:16,color:'#2D4A35'}}>Dates</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div>
                <label style={{fontSize:12,color:'#7A9A7A',display:'block',marginBottom:4}}>Issue Date</label>
                <input type="date" value={form.issued} onChange={e=>setField('issued',e.target.value)}
                  style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:14,boxSizing:'border-box'}} />
              </div>
              <div>
                <label style={{fontSize:12,color:'#7A9A7A',display:'block',marginBottom:4}}>Due Date</label>
                <input type="date" value={form.due} onChange={e=>setField('due',e.target.value)}
                  style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:14,boxSizing:'border-box'}} />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="card" style={{padding:24,marginBottom:16}}>
            <h3 style={{fontSize:14,fontWeight:600,marginBottom:16,color:'#2D4A35'}}>Line Items</h3>
            {errors.lines && <div style={{color:'#c0392b',fontSize:12,marginBottom:8}}>{errors.lines}</div>}
            <table style={{width:'100%',borderCollapse:'collapse',marginBottom:12}}>
              <thead>
                <tr style={{borderBottom:'1px solid #D4DDCC'}}>
                  <th style={{padding:'8px 0',textAlign:'left',fontSize:11,color:'#7A9A7A',fontWeight:500}}>DESCRIPTION</th>
                  <th style={{padding:'8px 8px',textAlign:'center',fontSize:11,color:'#7A9A7A',fontWeight:500,width:60}}>QTY</th>
                  <th style={{padding:'8px 8px',textAlign:'right',fontSize:11,color:'#7A9A7A',fontWeight:500,width:100}}>RATE ($)</th>
                  <th style={{padding:'8px 8px',textAlign:'right',fontSize:11,color:'#7A9A7A',fontWeight:500,width:100}}>AMOUNT</th>
                  <th style={{width:30}}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} style={{borderBottom:'0.5px solid #EBF2E8'}}>
                    <td style={{padding:'8px 0'}}>
                      <input value={line.description} onChange={e=>updateLine(i,'description',e.target.value)}
                        placeholder="Item description" style={{width:'100%',padding:'8px',borderRadius:6,border:'1px solid #D4DDCC',fontSize:13}} />
                    </td>
                    <td style={{padding:'8px'}}>
                      <input value={line.qty} onChange={e=>updateLine(i,'qty',e.target.value)}
                        type="number" min="0" style={{width:'100%',padding:'8px',borderRadius:6,border:'1px solid #D4DDCC',fontSize:13,textAlign:'center'}} />
                    </td>
                    <td style={{padding:'8px'}}>
                      <input value={line.rate} onChange={e=>updateLine(i,'rate',e.target.value)}
                        type="number" min="0" step="0.01" placeholder="0.00" style={{width:'100%',padding:'8px',borderRadius:6,border:'1px solid #D4DDCC',fontSize:13,textAlign:'right'}} />
                    </td>
                    <td style={{padding:'8px',textAlign:'right',fontWeight:500,fontSize:13}}>
                      {fmt(line.amount)}
                    </td>
                    <td style={{padding:'8px'}}>
                      {lines.length > 1 && (
                        <button onClick={()=>removeLine(i)} style={{background:'none',border:'none',cursor:'pointer',color:'#c0392b',fontSize:16}}>×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addLine} style={{background:'none',border:'1px dashed #D4DDCC',borderRadius:8,padding:'8px 16px',cursor:'pointer',color:'#2D4A35',fontSize:13,width:'100%'}}>
              + Add line item
            </button>
          </div>

          {/* Additional charges */}
          <div className="card" style={{padding:24,marginBottom:16}}>
            <h3 style={{fontSize:14,fontWeight:600,marginBottom:16,color:'#2D4A35'}}>Additional Charges</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
              <div>
                <label style={{fontSize:12,color:'#7A9A7A',display:'block',marginBottom:4}}>Tax Rate (%)</label>
                <input value={form.taxRate} onChange={e=>setField('taxRate',e.target.value)}
                  type="number" min="0" placeholder="0" style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:14,boxSizing:'border-box'}} />
              </div>
              <div>
                <label style={{fontSize:12,color:'#7A9A7A',display:'block',marginBottom:4}}>Shipping ($)</label>
                <input value={form.shipping} onChange={e=>setField('shipping',e.target.value)}
                  type="number" min="0" placeholder="0.00" style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:14,boxSizing:'border-box'}} />
              </div>
              <div>
                <label style={{fontSize:12,color:'#7A9A7A',display:'block',marginBottom:4}}>Discount ($)</label>
                <input value={form.discount} onChange={e=>setField('discount',e.target.value)}
                  type="number" min="0" placeholder="0.00" style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:14,boxSizing:'border-box'}} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card" style={{padding:24,marginBottom:16}}>
            <h3 style={{fontSize:14,fontWeight:600,marginBottom:16,color:'#2D4A35'}}>Notes</h3>
            <textarea value={form.notes} onChange={e=>setField('notes',e.target.value)}
              placeholder="Payment terms, thank-you message, or additional notes..."
              rows={4} style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:14,boxSizing:'border-box',resize:'vertical'}} />
          </div>

        </div>

        {/* Summary sidebar */}
        <div>
          <div className="card" style={{padding:24,position:'sticky',top:20}}>
            <h3 style={{fontSize:14,fontWeight:600,marginBottom:16,color:'#2D4A35'}}>Summary</h3>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span style={{color:'#7A9A7A',fontSize:14}}>Subtotal</span>
              <span style={{fontSize:14}}>{fmt(subtotal)}</span>
            </div>
            {parseFloat(form.taxRate||0) > 0 && (
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{color:'#7A9A7A',fontSize:14}}>Tax ({form.taxRate}%)</span>
                <span style={{fontSize:14}}>{fmt(taxAmount)}</span>
              </div>
            )}
            {parseFloat(form.shipping||0) > 0 && (
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{color:'#7A9A7A',fontSize:14}}>Shipping</span>
                <span style={{fontSize:14}}>{fmt(parseFloat(form.shipping))}</span>
              </div>
            )}
            {parseFloat(form.discount||0) > 0 && (
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{color:'#7A9A7A',fontSize:14}}>Discount</span>
                <span style={{fontSize:14,color:'#c0392b'}}>-{fmt(parseFloat(form.discount))}</span>
              </div>
            )}
            <div style={{display:'flex',justifyContent:'space-between',paddingTop:12,borderTop:'2px solid #2D4A35',marginTop:8}}>
              <span style={{fontSize:16,fontWeight:700}}>Total</span>
              <span style={{fontSize:16,fontWeight:700,color:'#2D4A35'}}>{fmt(total)}</span>
            </div>
            <div style={{marginTop:20}}>
              <button onClick={()=>handleSave(false)} disabled={loading}
                style={{width:'100%',padding:'10px',borderRadius:8,border:'1px solid #D4DDCC',background:'#fff',cursor:'pointer',fontSize:14,marginBottom:8}}>
                {loading ? 'Saving...' : 'Save draft'}
              </button>
              <button onClick={()=>handleSave(true)} disabled={loading}
                style={{width:'100%',padding:'10px',borderRadius:8,border:'none',background:'#2D4A35',color:'#A8D4A8',cursor:'pointer',fontSize:14,fontWeight:600}}>
                <i className="ti ti-send" /> {loading ? 'Saving...' : 'Save & send'}
              </button>
            </div>
            <div style={{marginTop:12,fontSize:12,color:'#7A9A7A'}}>
              <p style={{margin:'4px 0'}}>• Save as draft to finish later</p>
              <p style={{margin:'4px 0'}}>• "Save & send" emails the invoice immediately</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



