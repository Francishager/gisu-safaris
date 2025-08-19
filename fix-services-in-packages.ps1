$ErrorActionPreference = 'Stop'

$dir = Join-Path $PSScriptRoot 'packages'
$files = Get-ChildItem -Path $dir -Filter '*.html' -File -Recurse:$false

foreach ($f in $files) {
  $c = Get-Content -Raw -Path $f.FullName
  $o = $c

  # Normalize service links inside packages pages to point one level up
  $c = $c.Replace('href="./services/', 'href="../services/')
  $c = $c.Replace('href="services/', 'href="../services/')

  if ($c -ne $o) {
    try { Copy-Item -Path $f.FullName -Destination ($f.FullName + '.bak.servlinks') -ErrorAction SilentlyContinue } catch {}
    Set-Content -Path $f.FullName -Value $c -Encoding UTF8
    Write-Host ("Updated: {0}" -f $f.Name)
  }
}

Write-Host 'Done.'
