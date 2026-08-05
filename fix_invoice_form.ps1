$file = "C:\Users\Paul\Desktop\ledger\src\pages\InvoiceFormPage.jsx"
$content = Get-Content $file -Raw

$old = "            </div>
            </div>
            <div style={{marginTop:12}}>
              <label style={{fontSize:12,color:'#7A9A7A',display:'block',marginBottom:4}}>Salesperson</label>"

$new = "            </div>
            <div style={{marginTop:12}}>
              <label style={{fontSize:12,color:'#7A9A7A',display:'block',marginBottom:4}}>Salesperson</label>"

$content.Replace($old, $new) | Set-Content $file
Write-Host "Done!"