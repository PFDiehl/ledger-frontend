$file = "C:\Users\Paul\Desktop\ledger\src\pages\CustomersPage.jsx"
$lines = Get-Content $file
$out = @()
$skip = $false
$braceDepth = 0
$i = 0

while ($i -lt $lines.Count) {
    if ($lines[$i] -match "^function CustomerForm\(") {
        $skip = $true
        $braceDepth = 0
    }
    if ($skip) {
        $braceDepth += ($lines[$i].ToCharArray() | Where-Object {$_ -eq '{'}).Count
        $braceDepth -= ($lines[$i].ToCharArray() | Where-Object {$_ -eq '}'}).Count
        if ($braceDepth -le 0 -and $lines[$i] -match "}") {
            $skip = $false
        }
    } else {
        $out += $lines[$i]
    }
    $i++
}

$out | Set-Content $file
Write-Host "Done! Lines: $($out.Count)"