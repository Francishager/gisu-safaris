$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$files = Get-ChildItem -Path $root -Filter '*.html' -File -Recurse | Where-Object { $_.FullName -notmatch [regex]::Escape((Join-Path $root 'backups')) }

$updated = 0
foreach ($f in $files) {
  $c = Get-Content -Raw -Path $f.FullName
  $o = $c

  # Add inner content to empty booking anchors
  $c = [regex]::Replace($c,
    '(?is)(<a[^>]*href=\"[^\"]*booking/index\.html[^\"]*\"[^>]*>)[\s\r\n]*</a>',
    '$1<i class="fas fa-calendar-check me-1"></i>Book Now</a>')

  if ($c -ne $o) {
    try { Copy-Item -Path $f.FullName -Destination ($f.FullName + '.bak.emptyfix') -ErrorAction SilentlyContinue } catch {}
    Set-Content -Path $f.FullName -Value $c -Encoding UTF8
    $updated++
    Write-Host ("Updated: {0}" -f $f.FullName)
  }
}

Write-Host ("Done. Updated files: {0}" -f $updated)
