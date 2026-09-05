export default function PrivacyPage() {
  const H2 = { fontSize:22, fontWeight:600, color:'#2D4A35', marginTop:32 };
  return (
    <div style={{maxWidth:800,margin:'0 auto',padding:'48px 24px',fontFamily:'sans-serif',color:'#333',lineHeight:1.7}}>
      <div style={{marginBottom:32}}>
        <a href="/" style={{color:'#2D4A35',textDecoration:'none',fontSize:14}}>← Back to Mountain Top Ledger</a>
      </div>
      <h1 style={{fontSize:36,fontWeight:700,color:'#2D4A35',marginBottom:8}}>Privacy Policy</h1>
      <p style={{color:'#666',marginBottom:32}}>Last updated: September 5, 2026</p>

      <p>This Privacy Policy explains how Mountain Top Ledger ("we," "us," or "our") collects, uses, and protects information when you use the Mountain Top Ledger website and mobile app (together, the "Service"). By using the Service, you agree to this policy.</p>

      <h2 style={H2}>1. Information We Collect</h2>
      <p>We collect the following categories of information:</p>
      <ul>
        <li><strong>Account information</strong> — your name, email address, and password (stored in an encrypted, hashed form).</li>
        <li><strong>Business information</strong> — your company name and the profile details you add (address, contact details, tax ID if you enter one).</li>
        <li><strong>Financial data you enter</strong> — the bookkeeping records you create in the Service, such as invoices, expenses, bills, and journal entries.</li>
        <li><strong>Bank connection data</strong> — if you choose to connect a bank account, transaction and account information imported through our banking provider (see Section 4). You may use the Service without connecting a bank.</li>
        <li><strong>Payment information</strong> — if you accept invoice payments or subscribe to a paid plan, payments are processed by our payment provider (see Section 4). We do not store full card numbers.</li>
        <li><strong>Technical and usage data</strong> — limited diagnostic and log data (such as error reports) used to keep the Service reliable and secure.</li>
      </ul>

      <h2 style={H2}>2. How We Use Your Information</h2>
      <p>We use your information only to provide, maintain, secure, and improve the Service — for example, to run your account, keep your books, connect your bank at your direction, process payments you initiate, provide support, and meet legal obligations. <strong>We do not sell or rent your personal information or financial data, and we do not use it for advertising.</strong></p>

      <h2 style={H2}>3. Legal Basis and Your Control</h2>
      <p>Your data is yours. You control what you enter, and you can export it or delete your account at any time (see Section 7). Where you grant a bookkeeper access to your books, that access is given by you and can be revoked by you at any time from within the Service.</p>

      <h2 style={H2}>4. Service Providers We Share Data With</h2>
      <p>We share limited data only with trusted service providers who process it on our behalf to deliver the Service, under contracts that require them to protect it. These include:</p>
      <ul>
        <li><strong>Plaid</strong> — securely connects your bank account and imports transactions, only if you choose to link a bank.</li>
        <li><strong>Stripe</strong> — processes invoice payments and subscription billing. Card details are handled directly by Stripe.</li>
        <li><strong>Cloud hosting and email providers</strong> — host the Service and send transactional emails (such as password resets and notifications).</li>
      </ul>
      <p>These providers are not permitted to use your data for their own purposes. We may also disclose information if required by law, or to protect the rights, safety, and security of our users and the Service.</p>

      <h2 style={H2}>5. Data Storage and Security</h2>
      <p>Your data is stored securely in the cloud. We use encryption in transit (HTTPS/TLS), hashed passwords, access controls, and secure authentication (including optional two-factor authentication) to protect your information. No method of transmission or storage is 100% secure, but we work to protect your data using industry-standard safeguards.</p>

      <h2 style={H2}>6. Data Retention</h2>
      <p>We retain your data for as long as your account is active. If you delete your account, we delete your personal information and the financial records you own, except for limited information we are required to keep by law or for legitimate business records (such as tax or transaction records). Backups are purged on a rolling schedule.</p>

      <h2 style={H2} id="delete-your-data">7. Deleting Your Data</h2>
      <p>You can delete your account and its associated data at any time:</p>
      <ul>
        <li><strong>In the app</strong> — go to Settings → Security and choose to delete your account. This permanently removes your account and the organizations you own.</li>
        <li><strong>By request</strong> — email us at <a href="mailto:support@mountaintopledger.com" style={{color:'#2D4A35'}}>support@mountaintopledger.com</a> from your account email and we will process the deletion.</li>
      </ul>
      <p>For full details on what is deleted and what may be retained, see our <a href="/delete-data" style={{color:'#2D4A35'}}>Data Deletion page</a>.</p>

      <h2 style={H2}>8. Cookies</h2>
      <p>We use essential cookies and similar technologies to keep you logged in and maintain your session. We do not use tracking or advertising cookies.</p>

      <h2 style={H2}>9. Children's Privacy</h2>
      <p>Mountain Top Ledger is a business tool and is not directed at children under 13. We do not knowingly collect personal information from children under 13.</p>

      <h2 style={H2}>10. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will post the updated policy on this page and revise the "Last updated" date above.</p>

      <h2 style={H2}>11. Contact Us</h2>
      <p>If you have any questions about this Privacy Policy or your data, contact us at:</p>
      <p><strong>Mountain Top Ledger</strong><br/>
      Email: support@mountaintopledger.com<br/>
      Website: mountaintopledger.com</p>

      <div style={{marginTop:48,paddingTop:24,borderTop:'1px solid #eee',color:'#999',fontSize:13}}>
        © 2026 Mountain Top Ledger. All rights reserved.
      </div>
    </div>
  );
}
