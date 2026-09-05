export default function TermsPage() {
  const H2 = { fontSize:22, fontWeight:600, color:'#2D4A35', marginTop:32 };
  return (
    <div style={{maxWidth:800,margin:'0 auto',padding:'48px 24px',fontFamily:'sans-serif',color:'#333',lineHeight:1.7}}>
      <div style={{marginBottom:32}}>
        <a href="/" style={{color:'#2D4A35',textDecoration:'none',fontSize:14}}>← Back to MountainTop Ledger</a>
      </div>
      <h1 style={{fontSize:36,fontWeight:700,color:'#2D4A35',marginBottom:8}}>Terms of Service</h1>
      <p style={{color:'#666',marginBottom:32}}>Last updated: August 22, 2026</p>

      <p>These Terms of Service ("Terms") govern your access to and use of MountainTop Ledger (the "Service"), operated by MountainTop Ledger ("we," "us," or "our"). By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service.</p>

      <h2 style={H2}>1. The Service</h2>
      <p>MountainTop Ledger provides online bookkeeping and invoicing tools, including customer and vendor records, invoices, expenses, bills, reporting, and optional integrations with third-party services such as QuickBooks Online and Stripe. We may add, change, or remove features over time.</p>

      <h2 style={H2}>2. Accounts and Security</h2>
      <p>You must provide accurate information when creating an account and keep it current. You are responsible for safeguarding your password and for all activity under your account. We recommend enabling two-factor authentication. Notify us promptly at support@mountaintopledger.com if you suspect unauthorized access. You must be at least 18 years old and authorized to act on behalf of any business you register.</p>

      <h2 style={H2}>3. Subscriptions, Billing, and Trials</h2>
      <p>Paid plans are billed in advance on a recurring basis (for example, monthly) through our payment processor. If a free trial is offered, your paid subscription begins automatically when the trial ends unless you cancel before then. You authorize us to charge your payment method for applicable fees and taxes. Fees are non-refundable except where required by law. You may cancel at any time; cancellation takes effect at the end of the current billing period. We may change pricing with reasonable advance notice.</p>

      <h2 style={H2}>4. Your Data and Ownership</h2>
      <p>You retain all rights to the data you enter into the Service ("Your Data"). You grant us a limited license to store, process, and display Your Data solely to provide and improve the Service. You can export Your Data at any time from the app. You are responsible for the accuracy and legality of Your Data and for maintaining your own copies.</p>

      <h2 style={H2}>5. Acceptable Use</h2>
      <p>You agree not to misuse the Service, including by: violating any law; uploading malicious code; attempting to gain unauthorized access to the Service or other users' data; reverse-engineering or disrupting the Service; or using it to store or transmit unlawful, infringing, or fraudulent content. We may suspend or terminate accounts that violate these Terms.</p>

      <h2 style={H2}>6. Third-Party Services</h2>
      <p>The Service may connect to third-party services (such as QuickBooks Online, Stripe, and email delivery providers) at your direction. Your use of those services is governed by their own terms and privacy policies. We are not responsible for third-party services and do not control the data you choose to share with them.</p>

      <h2 style={H2}>7. Not Financial, Tax, or Legal Advice</h2>
      <p>MountainTop Ledger is a software tool, not an accountant, tax preparer, or financial or legal advisor. The Service does not provide financial, tax, accounting, or legal advice. You are responsible for the accuracy of your records and for any filings or decisions you make. Consult a qualified professional for advice specific to your situation.</p>

      <h2 style={H2}>8. Service Availability</h2>
      <p>We work to keep the Service available and reliable but do not guarantee uninterrupted or error-free operation. The Service is provided "as is" and "as available," without warranties of any kind, whether express or implied, to the fullest extent permitted by law.</p>

      <h2 style={H2}>9. Limitation of Liability</h2>
      <p>To the fullest extent permitted by law, MountainTop Ledger and its owners will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of profits, revenue, data, or goodwill, arising out of or related to your use of the Service. Our total liability for any claim relating to the Service will not exceed the amount you paid us in the twelve months before the claim.</p>

      <h2 style={H2}>10. Termination</h2>
      <p>You may stop using the Service and delete your account at any time. We may suspend or terminate your access if you violate these Terms or if required to protect the Service or other users. Upon termination, your right to use the Service ends; you may export Your Data before deleting your account, and we will handle remaining data as described in our Privacy Policy.</p>

      <h2 style={H2}>11. Changes to These Terms</h2>
      <p>We may update these Terms from time to time. If we make material changes, we will notify you by posting the updated Terms on this page and updating the date above. Your continued use of the Service after changes take effect constitutes acceptance of the revised Terms.</p>

      <h2 style={H2}>12. Contact</h2>
      <p>Questions about these Terms? Contact us at:</p>
      <p><strong>MountainTop Ledger</strong><br/>
      Email: support@mountaintopledger.com<br/>
      Website: mountaintopledger.com</p>

      <div style={{marginTop:48,paddingTop:24,borderTop:'1px solid #eee',color:'#999',fontSize:13}}>
        © 2026 MountainTop Ledger. All rights reserved.
      </div>
    </div>
  );
}
