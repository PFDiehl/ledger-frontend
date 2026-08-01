import jsPDF from 'jspdf';

export function generateInvoicePdf(invoice) {
  const doc = new jsPDF();
  const green = [26, 58, 26];
  const gold = [255, 209, 102];
  const gray = [100, 100, 100];
  const black = [30, 30, 30];

  // Header background
  doc.setFillColor(...green);
  doc.rect(0, 0, 210, 40, 'F');

  // Company name
  doc.setTextColor(...gold);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Mountain Top Ledger', 14, 18);

  // Tagline
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Built for where you are going', 14, 27);

  // Invoice title
  doc.setTextColor(...gold);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 160, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoiceNumber || 'INV-XXXX', 160, 27);

  // Client info
  doc.setTextColor(...black);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 14, 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(invoice.contact?.name || 'Client', 14, 63);
  if (invoice.contact?.email) doc.text(invoice.contact.email, 14, 70);

  // Invoice details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Invoice Date:', 130, 55);
  doc.text('Due Date:', 130, 63);
  if (invoice.poNumber) doc.text('PO Number:', 130, 71);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(invoice.issueDate).toLocaleDateString(), 175, 55);
  doc.text(new Date(invoice.dueDate).toLocaleDateString(), 175, 63);
  if (invoice.poNumber) doc.text(invoice.poNumber, 175, 71);

  // Line items header
  let y = 85;
  doc.setFillColor(...green);
  doc.rect(14, y, 182, 8, 'F');
  doc.setTextColor(...gold);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPTION', 16, y + 5.5);
  doc.text('QTY', 120, y + 5.5);
  doc.text('RATE', 140, y + 5.5);
  doc.text('AMOUNT', 170, y + 5.5);

  // Line items
  y += 12;
  doc.setTextColor(...black);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const lines = invoice.lines || [];
  lines.forEach((line, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(14, y - 4, 182, 8, 'F');
    }
    doc.text(String(line.description || ''), 16, y);
    doc.text(String(Number(line.quantity || 0)), 122, y);
    doc.text('$' + Number(line.unitPrice || 0).toFixed(2), 140, y);
    doc.text('$' + Number(line.amount || 0).toFixed(2), 170, y);
    y += 10;
  });

  // Totals
  y += 6;
  doc.setDrawColor(200, 200, 200);
  doc.line(120, y, 196, y);
  y += 8;

  const addTotal = (label, value, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 11 : 9);
    doc.setTextColor(...(bold ? green : gray));
    doc.text(label, 130, y);
    doc.text('$' + Number(value || 0).toFixed(2), 185, y, { align: 'right' });
    y += 8;
  };

  addTotal('Subtotal:', invoice.subtotal);
  if (Number(invoice.taxAmount || 0) > 0) addTotal(`Tax (${invoice.taxRate}%):`, invoice.taxAmount);
  if (Number(invoice.shipping || 0) > 0) addTotal('Shipping:', invoice.shipping);
  if (Number(invoice.discount || 0) > 0) addTotal('Discount:', -invoice.discount);
  doc.line(120, y, 196, y);
  y += 6;
  addTotal('AMOUNT DUE:', invoice.total, true);

  // Notes
  if (invoice.notes) {
    y += 10;
    doc.setFillColor(245, 250, 245);
    doc.rect(14, y, 182, 20, 'F');
    doc.setTextColor(...gray);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 16, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.notes, 16, y + 14);
  }

  // Footer
  doc.setFillColor(...green);
  doc.rect(0, 280, 210, 17, 'F');
  doc.setTextColor(...gold);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Mountain Top Ledger · mountaintopledger.com · Built for where you are going', 105, 290, { align: 'center' });

  doc.save(`${invoice.invoiceNumber || 'invoice'}.pdf`);
}