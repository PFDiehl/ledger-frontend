$file = "C:\Users\Paul\Desktop\ledger\src\pages\CustomersPage.jsx"
$content = Get-Content $file -Raw

$content = $content -replace 'const res = await api\.get\(`/orgs/\$\{org\.id\}/contacts\?type=customer`\);', 'const res = await fetch(`${API}/orgs/${org.id}/contacts?type=customer`, { headers: { Authorization: `Bearer ${localStorage.getItem(''token'')}` } }); const data = await res.json();'

$content = $content -replace 'const res = await fetch', 'const res2 = await fetch'
$content = $content -replace 'const res2 = await fetch', 'const res = await fetch'

$content = $content -replace 'setCustomers\(res\.data\.data \|\| \[\]\);', 'setCustomers(data.data || []);'

$content = $content -replace 'await api\.patch\(`/orgs/\$\{org\.id\}/contacts/\$\{editing\.id\}`, \{ \.\.\.form, type:''customer'' \}\);', 'await fetch(`${API}/orgs/${org.id}/contacts/${editing.id}`, { method: ''PATCH'', headers: { ''Content-Type'': ''application/json'', Authorization: `Bearer ${localStorage.getItem(''token'')}` }, body: JSON.stringify({ ...form, type:''customer'' }) });'

$content = $content -replace 'await api\.post\(`/orgs/\$\{org\.id\}/contacts`, \{ \.\.\.form, type:''customer'' \}\);', 'await fetch(`${API}/orgs/${org.id}/contacts`, { method: ''POST'', headers: { ''Content-Type'': ''application/json'', Authorization: `Bearer ${localStorage.getItem(''token'')}` }, body: JSON.stringify({ ...form, type:''customer'' }) });'

$content = $content -replace 'await api\.delete\(`/orgs/\$\{org\.id\}/contacts/\$\{c\.id\}`\);', 'await fetch(`${API}/orgs/${org.id}/contacts/${c.id}`, { method: ''DELETE'', headers: { Authorization: `Bearer ${localStorage.getItem(''token'')}` } });'

$content | Set-Content $file
Write-Host "Done!"
