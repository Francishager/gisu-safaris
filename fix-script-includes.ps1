# Normalize script includes across site to ensure main.js (with initPolicyFooterLinks) loads everywhere
# Rewrites any ../js/script.js, ./js/script.js, js/script.js, etc. to correct relative path to js/main.js
param()

$root = (Get-Location).Path

function Get-RelativePrefix([string]$fileFullPath) {
    $rel = $fileFullPath.Substring($root.Length).TrimStart('\','/')
    $parts = $rel -split '[\\/]'
    if ($parts.Length -le 1) { return './' }
    $depth = $parts.Length - 1
    return ([string]::Join('', (1..$depth | ForEach-Object { '../' })))
}

# Replace any script include that points to js/script.js with js/main.js using proper prefix
function Replace-ScriptInclude([string]$html, [string]$prefix) {
    $pattern = '(?is)(<script\b[^>]*?src=")([^"]*?)js/script\.js("[^>]*>\s*</script>)'
    return [regex]::Replace($html, $pattern, { param($m) $m.Groups[1].Value + ($prefix + 'js/main.js') + $m.Groups[3].Value })
}

$files = Get-ChildItem -Path $root -Recurse -Filter *.html | Where-Object { $_.FullName -notmatch "\\backups\\" }
$changed = 0
foreach ($f in $files) {
    try {
        $prefix = Get-RelativePrefix $f.FullName
        $orig = Get-Content -LiteralPath $f.FullName -Raw
        $updated = Replace-ScriptInclude $orig $prefix
        if ($updated -ne $orig) {
            Set-Content -LiteralPath $f.FullName -Value $updated -NoNewline
            Write-Host "Updated script include: $($f.FullName)"
            $changed++
        }
    } catch {
        Write-Warning "Failed: $($f.FullName) - $($_.Exception.Message)"
    }
}

Write-Host "Done. Files updated: $changed"
