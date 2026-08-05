$file = "C:\Users\Paul\Desktop\ledger\src\pages\InvoiceFormPage.jsx"
$lines = Get-Content $file
$out = @()
$i = 0
$fixed = $false
while ($i -lt $lines.Count) {
    if (-not $fixed -and $lines[$i].Trim() -eq '</div>' -and $i+1 -lt $lines.Count -and $lines[$i+1].Trim() -eq '</div>' -and $i+2 -lt $lines.Count -and $lines[$i+2] -match 'marginTop:12') {
        $out += $lines[$i]
        $i += 2
        $fixed = $true
    } else {
        $out += $lines[$i]
        $i++
    }
}
$out | Set-Content $file
Write-Host "Done! Fixed: $fixed"