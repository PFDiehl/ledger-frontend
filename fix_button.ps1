$file = "C:\Users\Paul\Desktop\ledger\src\pages\CustomersPage.jsx"
$lines = Get-Content $file
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "alignItems:'center',gap:6\}\}$") {
        $lines[$i] = $lines[$i] + ">"
    }
}
$lines | Set-Content $file
Write-Host "Done!"