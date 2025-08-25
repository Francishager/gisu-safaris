param(
  [switch]$DryRun
)

# Batch-convert internal <a href="..."> links from .html to clean URLs.
# - Converts "/path/index.html" -> "/path/"
# - Converts "/path/page.html" -> "/path/page"
# Skips external links (http/https), mailto:, tel:, javascript:, and hash-only links.
# Excludes the backups/ directory.

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Scanning for HTML files under: $Root" -ForegroundColor Cyan

$files = Get-ChildItem -Path $Root -Recurse -File -Include *.html -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch "\\backups\\" }

$changed = New-Object System.Collections.Generic.List[string]

foreach ($file in $files) {
  $original = Get-Content -Raw -LiteralPath $file.FullName
  $content = $original

  # Pattern: capture href quote (" or '), and URL up to the same quote (avoid PowerShell escape issues)
  $pattern = '(?is)(<a\b[^>]*?\shref=)(["''])([^"''>]+)(\2)'

  $content = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, {
    param([System.Text.RegularExpressions.Match]$m)
    $prefix = $m.Groups[1].Value
    $q = $m.Groups[2].Value
    $url = $m.Groups[3].Value
    $suffix = $m.Groups[4].Value

    # Skip unsupported or external forms
    if ($url -match '^(?i)(https?:|mailto:|tel:|javascript:|#)') {
      return $m.Value
    }

    # Normalize URL, keep query/hash
    $path = $url
    $query = ''
    $hash = ''
    if ($path -match '^(.*?)(\?[^#]*)?(#.*)?$') {
      $path = $Matches[1]
      if ($Matches[2]) { $query = $Matches[2] }
      if ($Matches[3]) { $hash = $Matches[3] }
    }

    # Handle index.html -> trailing slash
    if ($path -match '(?i)^(.*?/)?index\.html$') {
      $base = $Matches[1]
      if (-not $base) { $base = '' }
      if ($base -and ($base -notmatch '/$')) { $base = $base + '/' }
      $newUrl = $base + $query + $hash
      return $prefix + $q + $newUrl + $q
    }

    # Handle *.html -> *
    if ($path -match '(?i)^(.*)\.html$') {
      $stem = $Matches[1]
      $newUrl = $stem + $query + $hash
      return $prefix + $q + $newUrl + $q
    }

    return $m.Value
  })

  if ($content -ne $original) {
    if ($DryRun) {
      Write-Host "[DRY-RUN] Would update: $($file.FullName)" -ForegroundColor Yellow
      $changed.Add($file.FullName) | Out-Null
    } else {
      Set-Content -LiteralPath $file.FullName -Value $content -NoNewline -Encoding utf8
      Write-Host "Updated: $($file.FullName)" -ForegroundColor Green
      $changed.Add($file.FullName) | Out-Null
    }
  }
}

Write-Host "`nTotal files changed: $($changed.Count)" -ForegroundColor Cyan
if ($DryRun -and $changed.Count -gt 0) {
  Write-Host "Run again without -DryRun to apply changes." -ForegroundColor Magenta
}
