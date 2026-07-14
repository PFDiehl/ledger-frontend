import { useState, useRef } from 'react';
import { useToast } from '../lib/ToastContext';
import { fmt } from '../lib/utils';

const SEED_DOCS = [
  { id:'d1', filename:'AWS-invoice-jun-2026.pdf',   mimeType:'application/pdf', sizeBytes:124000, entityType:'bill',    entityId:'BILL-1008', ocrStatus:'done',    uploadedBy:{fullName:'Jane Doe'},    createdAt:'2026-06-01T10:00:00Z',
    ocrParsed:{ vendor:'Amazon Web Services', total:892.00, date:'June 1, 2026' } },
  { id:'d2', filename:'wework-receipt-may.png',      mimeType:'image/png',       sizeBytes: 84000, entityType:'bill',    entityId:'BILL-1002', ocrStatus:'done',    uploadedBy:{fullName:'Bob Smith'},   createdAt:'2026-05-31T14:22:00Z',
    ocrParsed:{ vendor:'WeWork', total:2400.00, date:'May 31, 2026' } },
  { id:'d3', filename:'delta-boarding-pass.jpg',     mimeType:'image/jpeg',      sizeBytes: 54000, entityType:'expense', entityId:'EXP-0040',  ocrStatus:'done',    uploadedBy:{fullName:'Jane Doe'},    createdAt:'2026-05-30T09:15:00Z',
    ocrParsed:{ vendor:'Delta Air Lines', total:312.00, date:'May 28, 2026' } },
  { id:'d4', filename:'amazon-receipt-042.pdf',      mimeType:'application/pdf', sizeBytes:210000, entityType:'expense', entityId:'EXP-0038',  ocrStatus:'processing', uploadedBy:{fullName:'Marcus Lee'}, createdAt:'2026-05-29T11:30:00Z',
    ocrParsed:null },
  { id:'d5', filename:'shopify-plan-invoice.pdf',    mimeType:'application/pdf', sizeBytes: 98000, entityType:'bill',    entityId:'BILL-1007', ocrStatus:'done',    uploadedBy:{fullName:'Jane Doe'},    createdAt:'2026-05-28T16:00:00Z',
    ocrParsed:{ vendor:'Shopify', total:299.00, date:'May 1, 2026' } },
  { id:'d6', filename:'hotel-receipt-marriott.jpg',  mimeType:'image/jpeg',      sizeBytes: 66000, entityType:'expense', entityId:'EXP-0037',  ocrStatus:'failed',  uploadedBy:{fullName:'Jane Doe'},    createdAt:'2026-05-27T08:45:00Z',
    ocrParsed:null },
];

const TYPE_ICONS = { 'application/pdf':'file-type-pdf', 'image/jpeg':'photo', 'image/png':'photo', 'image/webp':'photo' };
const OCR_COLORS = { done:'#0F6E56', processing:'#854F0B', pending:'#888780', failed:'#A32D2D' };
const OCR_BG     = { done:'#E1F5EE',  processing:'#FAEEDA',  pending:'#F1EFE8',  failed:'#FCEBEB' };

function fmtSize(bytes) {
  if (bytes >= 1e6) return (bytes/1e6).toFixed(1) + ' MB';
  return Math.round(bytes/1000) + ' KB';
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function OCRPanel({ doc, onClose }) {
  return (
    <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:500 }}>OCR results</div>
        <button onClick={onClose} style={{ fontSize:16, color:'var(--color-text-secondary)', background:'none', border:'none', cursor:'pointer' }}>
          <i className="ti ti-x" />
        </button>
      </div>

      {doc.ocrStatus === 'processing' && (
        <div style={{ textAlign:'center', padding:'20px 0', color:'var(--color-text-secondary)', fontSize:13 }}>
          <i className="ti ti-loader" style={{ fontSize:24, marginBottom:8, display:'block' }} />
          Processing…
        </div>
      )}

      {doc.ocrStatus === 'failed' && (
        <div style={{ background:'#FCEBEB', color:'#A32D2D', borderRadius:8, padding:'10px 12px', fontSize:12 }}>
          <i className="ti ti-alert-circle" style={{ marginRight:6 }} />
          OCR failed — the image may be too low resolution or in an unsupported format.
        </div>
      )}

      {doc.ocrStatus === 'done' && doc.ocrParsed && (
        <>
          <div style={{ display:'grid', gap:8, marginBottom:14 }}>
            {[
              ['Vendor',  doc.ocrParsed.vendor],
              ['Total',   doc.ocrParsed.total != null ? fmt(doc.ocrParsed.total) : null],
              ['Date',    doc.ocrParsed.date],
            ].filter(([,v]) => v).map(([label, value]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'7px 10px', background:'var(--color-background-secondary)', borderRadius:6 }}>
                <span style={{ color:'var(--color-text-secondary)' }}>{label}</span>
                <span style={{ fontWeight:500 }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize:11, color:'var(--color-text-tertiary)', marginBottom:6 }}>Extracted text</div>
          <div style={{ fontSize:11, color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', borderRadius:6, padding:'8px 10px', lineHeight:1.7, fontFamily:'var(--font-mono)', maxHeight:140, overflowY:'auto' }}>
            {doc.ocrParsed.vendor} · {doc.ocrParsed.date}<br/>
            {doc.filename.replace(/\.[^.]+$/, '').replace(/-/g, ' ')}<br/>
            Amount: {fmt(doc.ocrParsed.total ?? 0)}<br/>
            THANK YOU FOR YOUR BUSINESS
          </div>
        </>
      )}
    </div>
  );
}

function DocRow({ doc, selected, onSelect, onView }) {
  const icon = TYPE_ICONS[doc.mimeType] ?? 'file';
  return (
    <tr className="table-row" onClick={() => onSelect(doc.id)} style={{ cursor:'pointer', background: selected ? 'var(--color-background-secondary)' : '' }}>
      <td style={{ padding:'10px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'var(--color-background-secondary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'var(--color-text-secondary)', flexShrink:0 }}>
            <i className={`ti ti-${icon}`} />
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:500 }}>{doc.filename}</div>
            <div style={{ fontSize:11, color:'var(--color-text-tertiary)' }}>{fmtSize(doc.sizeBytes)} · {doc.entityType} · {doc.entityId}</div>
          </div>
        </div>
      </td>
      <td style={{ padding:'10px 14px', fontSize:12, color:'var(--color-text-secondary)' }}>{doc.uploadedBy.fullName}</td>
      <td style={{ padding:'10px 14px', fontSize:12, color:'var(--color-text-secondary)' }}>{fmtDate(doc.createdAt)}</td>
      <td style={{ padding:'10px 14px' }}>
        <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:OCR_BG[doc.ocrStatus], color:OCR_COLORS[doc.ocrStatus] }}>
          {doc.ocrStatus === 'done' ? 'OCR done' : doc.ocrStatus === 'processing' ? 'Processing…' : doc.ocrStatus === 'failed' ? 'OCR failed' : 'Pending'}
        </span>
      </td>
      <td style={{ padding:'10px 14px', textAlign:'right' }}>
        <button className="row-action" onClick={e => { e.stopPropagation(); onView(doc); }} aria-label="Download">
          <i className="ti ti-download" />
        </button>
      </td>
    </tr>
  );
}

export default function DocumentsPage() {
  const toast = useToast();
  const fileRef = useRef(null);
  const [docs,     setDocs]     = useState(SEED_DOCS);
  const [selected, setSelected] = useState(null);
  const [filter,   setFilter]   = useState('All');
  const [dragging, setDragging] = useState(false);

  const selectedDoc = docs.find(d => d.id === selected);
  const FILTERS = ['All', 'invoice', 'bill', 'expense'];

  const filtered = filter === 'All' ? docs : docs.filter(d => d.entityType === filter);

  const stats = {
    total:   docs.length,
    done:    docs.filter(d => d.ocrStatus === 'done').length,
    pending: docs.filter(d => d.ocrStatus === 'pending' || d.ocrStatus === 'processing').length,
    size:    docs.reduce((s, d) => s + d.sizeBytes, 0),
  };

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const files = [...e.dataTransfer.files];
    processFiles(files);
  }

  function handleFileInput(e) {
    processFiles([...e.target.files]);
  }

  function processFiles(files) {
    const newDocs = files.map((f, i) => ({
      id:          `d${Date.now()}-${i}`,
      filename:    f.name,
      mimeType:    f.type || 'application/octet-stream',
      sizeBytes:   f.size,
      entityType:  'expense',
      entityId:    'EXP-NEW',
      ocrStatus:   'processing',
      uploadedBy:  { fullName: 'Jane Doe' },
      createdAt:   new Date().toISOString(),
      ocrParsed:   null,
    }));
    setDocs(prev => [...newDocs, ...prev]);
    toast.success(`${files.length} file${files.length !== 1 ? 's' : ''} uploaded — OCR processing`);

    // Simulate OCR completing after 2s
    setTimeout(() => {
      setDocs(prev => prev.map(d =>
        newDocs.find(n => n.id === d.id)
          ? { ...d, ocrStatus: 'done', ocrParsed: { vendor: d.filename.split('-')[0], total: 0, date: new Date().toLocaleDateString() } }
          : d
      ));
    }, 2000);
  }

  return (
    <div className="page documents-page">
      <div className="page-header">
        <h1 className="page-title">Documents</h1>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => fileRef.current?.click()}>
            <i className="ti ti-upload" /> Upload file
          </button>
          <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:'none' }} onChange={handleFileInput} />
        </div>
      </div>

      <div className="inv-summary-strip" style={{ marginBottom:18 }}>
        <div className="inv-summary-card"><div className="inv-summary-label">Total documents</div><div className="inv-summary-value">{stats.total}</div></div>
        <div className="inv-summary-card success"><div className="inv-summary-label">OCR complete</div><div className="inv-summary-value">{stats.done}</div></div>
        <div className="inv-summary-card muted"><div className="inv-summary-label">Pending OCR</div><div className="inv-summary-value">{stats.pending}</div></div>
        <div className="inv-summary-card"><div className="inv-summary-label">Total size</div><div className="inv-summary-value" style={{fontSize:17}}>{fmtSize(stats.size)}</div></div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragging ? 'var(--brand-primary,#2D4A35)' : 'var(--color-border-secondary)'}`,
          borderRadius: 10,
          padding: '20px 0',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: 16,
          background: dragging ? '#EBF2E8' : 'transparent',
          transition: 'all 0.15s',
        }}
      >
        <i className="ti ti-cloud-upload" style={{ fontSize:28, color: dragging ? 'var(--brand-primary,#2D4A35)' : 'var(--color-text-tertiary)', display:'block', marginBottom:6 }} />
        <div style={{ fontSize:13, fontWeight:500, color: dragging ? 'var(--brand-primary,#2D4A35)' : 'var(--color-text-secondary)' }}>
          Drop files here or click to upload
        </div>
        <div style={{ fontSize:11, color:'var(--color-text-tertiary)', marginTop:3 }}>PDF, JPG, PNG, WEBP · Max 20 MB · OCR auto-extracted</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: selectedDoc ? 'minmax(0,1fr) 280px' : '1fr', gap:14, alignItems:'start' }}>
        <div>
          <div className="table-toolbar" style={{ marginBottom:10 }}>
            <div className="filter-tabs">
              {FILTERS.map(f => (
                <button key={f} className={`filter-tab ${filter===f?'active':''}`} onClick={() => setFilter(f)} style={{textTransform:'capitalize'}}>{f}</button>
              ))}
            </div>
          </div>

          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Uploaded by</th>
                  <th>Date</th>
                  <th>OCR</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={5} className="empty-row">No documents found.</td></tr>}
                {filtered.map(doc => (
                  <DocRow key={doc.id} doc={doc} selected={selected === doc.id}
                    onSelect={id => setSelected(prev => prev === id ? null : id)}
                    onView={() => toast.info(`Downloading ${doc.filename}…`)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedDoc && (
          <OCRPanel doc={selectedDoc} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}
