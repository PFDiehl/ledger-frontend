export const CURRENCIES = ['USD','EUR','GBP','CAD','AUD','JPY','CHF','CNY','MXN','BRL'];

export default function CurrenciesPage() {
  return (
    <div className='page'>
      <div className='page-header'><h1 className='page-title'>Currencies</h1></div>
      <div className='card' style={{padding:20}}>
        <p style={{fontSize:14,color:'var(--color-text-secondary)',marginBottom:16}}>Multi-currency support lets you invoice clients in their local currency. Exchange rates update automatically.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
          {CURRENCIES.map(c => (
            <div key={c} style={{background:'var(--color-background-secondary)',borderRadius:8,padding:'12px 16px',fontSize:13,fontWeight:500}}>{c}</div>
          ))}
        </div>
      </div>
    </div>
  );
}