# Fix policy links across all HTML files (excluding backups)
# - Rewrites anchors with text "Privacy Policy" and "Terms of Service" to correct relative hrefs
# - Computes directory depth per file to build the right prefix (./ or ../)
param()

$root = (Get-Location).Path

# Helper to build prefix like ./, ../, ../../
function Get-RelativePrefix([string]$fileFullPath) {
    $rel = $fileFullPath.Substring($root.Length).TrimStart('\','/')
    $parts = $rel -split '[\\/]'
    if ($parts.Length -le 1) { return './' }
    $depth = $parts.Length - 1
    return ([string]::Join('', (1..$depth | ForEach-Object { '../' })))
}

# Regex replace with a MatchEvaluator so we can inject per-file prefix
function Replace-Privacy([string]$html, [string]$prefix) {
    $pattern = '(?is)(<a\b[^>]*?href=")([^"]*)("[^>]*>\s*Privacy\s*Policy\s*</a>)'
    return [regex]::Replace($html, $pattern, { param($m) $m.Groups[1].Value + ($prefix + 'privacy.html') + $m.Groups[3].Value })
}

function Replace-Terms([string]$html, [string]$prefix) {
    # Supports: Terms of Service, Terms & Conditions, Terms &amp; Conditions, Terms and Conditions
    $pattern = '(?is)(<a\b[^>]*?href=")([^"]*)("[^>]*>\s*Terms\s*(?:of\s*Service|&amp;\s*Conditions|&\s*Conditions|and\s*Conditions)\s*</a>)'
    return [regex]::Replace($html, $pattern, { param($m) $m.Groups[1].Value + ($prefix + 'terms.html') + $m.Groups[3].Value })
}

# Process files
$files = Get-ChildItem -Path $root -Recurse -Filter *.html | Where-Object { $_.FullName -notmatch "\\backups\\" }

$changed = 0
foreach ($f in $files) {
    try {
        $prefix = Get-RelativePrefix $f.FullName
        $orig = Get-Content -LiteralPath $f.FullName -Raw
        $updated = $orig
        $updated = Replace-Privacy $updated $prefix
        $updated = Replace-Terms $updated $prefix

        if ($updated -ne $orig) {
            Set-Content -LiteralPath $f.FullName -Value $updated -NoNewline
            Write-Host "Updated: $($f.FullName)"
            $changed++
        }
    } catch {
        Write-Warning "Failed: $($f.FullName) - $($_.Exception.Message)"
    }
}

Write-Host "Done. Files updated: $changed"
