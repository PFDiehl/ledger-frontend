export default function DataDeletionPage() {
  const H2 = { fontSize:22, fontWeight:600, color:'#2D4A35', marginTop:32 };
  return (
    <div style={{maxWidth:800,margin:'0 auto',padding:'48px 24px',fontFamily:'sans-serif',color:'#333',lineHeight:1.7}}>
      <div style={{marginBottom:32}}>
        <a href="/" style={{color:'#2D4A35',textDecoration:'none',fontSize:14}}>← Back to Mountain Top Ledger</a>
      </div>
      <h1 style={{fontSize:36,fontWeight:700,color:'#2D4A35',marginBottom:8}}>Delete Your Data</h1>
      <p style={{color:'#666',marginBottom:32}}>How to delete your Mountain Top Ledger account and data. Last updated: September 5, 2026</p>

      <p>You can delete your Mountain Top Ledger account and its associated data at any time. There are two ways to do it.</p>

      <h2 style={H2}>Option 1 — Delete in the app (fastest)</h2>
      <ol>
        <li>Sign in to Mountain Top Ledger.</li>
        <li>Go to <strong>Settings → Security</strong>.</li>
        <li>Choose <strong>Delete account</strong> and confirm.</li>
      </ol>
      <p>This permanently deletes your account and the organizations (companies) you own, along with their records.</p>

      <h2 style={H2}>Option 2 — Request deletion by email</h2>
      <p>Email <a href="mailto:support@mountaintopledger.com?subject=Delete%20my%20account%20and%20data" style={{color:'#2D4A35'}}>support@mountaintopledger.com</a> from the email address on your account and ask us to delete your account. We will verify your request and complete the deletion, and confirm when it is done.</p>

      <h2 style={H2}>What gets deleted</h2>
      <ul>
        <li>Your account profile (name, email, login credentials).</li>
        <li>The organizations you own and the financial records in them — invoices, expenses, bills, journal entries, contacts, and reports.</li>
        <li>Any bank connections you created (the link to your bank is removed).</li>
      </ul>

      <h2 style={H2}>What may be retained</h2>
      <p>We may retain a limited amount of information where we are legally required to (for example, certain tax or transaction records), and residual copies may remain in encrypted backups until those backups are purged on a rolling schedule. If you belong to a company that someone else owns, deleting your own account does not delete that company's records — the account owner controls those.</p>

      <h2 style={H2}>Timing</h2>
      <p>In-app deletions are immediate. Email requests are typically completed within 30 days.</p>

      <h2 style={H2}>Questions</h2>
      <p>Contact us any time at <a href="mailto:support@mountaintopledger.com" style={{color:'#2D4A35'}}>support@mountaintopledger.com</a>. See also our <a href="/privacy" style={{color:'#2D4A35'}}>Privacy Policy</a>.</p>

      <div style={{marginTop:48,paddingTop:24,borderTop:'1px solid #eee',color:'#999',fontSize:13}}>
        © 2026 Mountain Top Ledger. All rights reserved.
      </div>
    </div>
  );
}
