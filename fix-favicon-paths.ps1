# Fix favicon paths across all HTML files by converting absolute /favicon.ico
# to correct relative paths based on each file's directory depth.
# Usage: Run from the repository root: `powershell -ExecutionPolicy Bypass -File .\fix-favicon-paths.ps1`

param(
    [string]$Root = (Get-Location).Path
)

Write-Host "[fix-favicon-paths] Root:" $Root

$changed = 0
$total = 0

# Build list of HTML files, skipping backups and backup folders
$files = Get-ChildItem -Path $Root -Recurse -File -Include *.html |
    Where-Object {
        $_.FullName -notmatch "\\backups\\" -and
        $_.FullName -notmatch "\.bak(\.|$)" -and
        $_.FullName -notmatch "\.bak\.[^\\/]+$"
    }

foreach ($file in $files) {
    $total++

    $content = Get-Content -LiteralPath $file.FullName -Raw

    # Compute relative prefix to the repo root for this file
    $relDir = [System.IO.Path]::GetRelativePath($Root, $file.DirectoryName)
    $segments = if ([string]::IsNullOrWhiteSpace($relDir)) { @() } else { $relDir.Split([System.IO.Path]::DirectorySeparatorChar) | Where-Object { $_ -ne '' } }
    $depth = $segments.Count
    $prefix = if ($depth -eq 0) { './' } else { ('../' * $depth) }

    # Replace href="/favicon.ico" or href='/favicon.ico' with computed relative path
    $newContent = $content

    # Pattern 1: href attribute
    $patternHref = '(?is)(href\s*=\s*")/favicon\.ico(" )|(?is)(href\s*=\s*\')/favicon\.ico(\')'
    # We'll do two explicit replacements to avoid group juggling with alternation
    $newContent = $newContent -replace '(?is)(href\s*=\s*")/favicon\.ico(" )', ("`$1" + ($prefix + 'favicon.ico') + '" ')
    $newContent = $newContent -replace '(?is)(href\s*=\s*\')/favicon\.ico(\')', ("`$1" + ($prefix + 'favicon.ico') + "`$2")

    # Also handle self-closing or tag-end without trailing space: href="/favicon.ico"/?>
    $newContent = $newContent -replace '(?is)(href\s*=\s*")/favicon\.ico("\s*/?>)', ("`$1" + ($prefix + 'favicon.ico') + '"$2')
    $newContent = $newContent -replace '(?is)(href\s*=\s*\')/favicon\.ico(\'\s*/?>)', ("`$1" + ($prefix + 'favicon.ico') + "`$2")

    if ($newContent -ne $content) {
        Set-Content -LiteralPath $file.FullName -Value $newContent -Encoding UTF8
        $changed++
        Write-Host ("[UPDATED] " + [System.IO.Path]::GetRelativePath($Root, $file.FullName))
    }
}

Write-Host "[fix-favicon-paths] Processed:" $total "files. Updated:" $changed "files."
