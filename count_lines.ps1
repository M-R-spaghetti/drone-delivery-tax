$extensions = @("*.ts", "*.tsx", "*.js", "*.jsx", "*.css", "*.html", "*.json")
$excludeRegex = "node_modules|dist|build|.next|.vite"

function Get-LineCount($path, $recurse) {
    if ($recurse) {
        $files = Get-ChildItem -Path $path -Recurse | Where-Object { 
            $_.FullName -notmatch $excludeRegex -and 
            $_.Extension -match "^\.(ts|tsx|js|jsx|css|html|json)$" -and 
            $_.Name -ne "package-lock.json" 
        }
    } else {
        $files = Get-ChildItem -Path $path | Where-Object { 
            $_.Extension -match "^\.(ts|tsx|js|jsx|css|html|json)$" -and 
            $_.Name -ne "package-lock.json" 
        }
    }
    
    $totalLines = 0
    foreach ($file in $files) {
        $lines = (Get-Content $file.FullName | Measure-Object -Line).Lines
        $totalLines += $lines
    }
    return $totalLines
}

$clientLines = Get-LineCount ".\client" $true
$serverLines = Get-LineCount ".\server" $true
$rootLines = Get-LineCount "." $false

Write-Host "Client lines: $clientLines"
Write-Host "Server lines: $serverLines"
Write-Host "Root lines: $rootLines"
Write-Host "Total lines: $($clientLines + $serverLines + $rootLines)"
