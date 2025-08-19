$ErrorActionPreference = 'Stop'

$dir = Join-Path $PSScriptRoot 'packages'
$files = Get-ChildItem -Path $dir -Filter '*.html' -File -Recurse:$false

foreach ($f in $files) {
  $c = Get-Content -Raw -Path $f.FullName
  $o = $c

  # --- Navbar: only anchors with class containing nav-link ---
  $c = [regex]::Replace($c, '(?i)(<a[^>]*class="[^"]*nav-link[^"]*"[^>]*href=")(?:\./)?index\.html(")', '$1../index.html$2')
  $c = [regex]::Replace($c, '(?i)(<a[^>]*class="[^"]*nav-link[^"]*"[^>]*href=")(?:\./)?about\.html(")', '$1../about.html$2')
  $c = [regex]::Replace($c, '(?i)(<a[^>]*class="[^"]*nav-link[^"]*"[^>]*href=")(?:\./)?gallery\.html(")', '$1../gallery.html$2')
  $c = [regex]::Replace($c, '(?i)(<a[^>]*class="[^"]*nav-link[^"]*"[^>]*href=")(?:\./)?contact\.html(")', '$1../contact.html$2')
  $c = [regex]::Replace($c, '(?i)(<a[^>]*class="[^"]*nav-link[^"]*"[^>]*href=")(?:\./)?blog/index\.html(")', '$1../blog/index.html$2')

  # --- Footer Quick Links: convert ./root links to ../root ---
  $c = [regex]::Replace($c, '(?i)href="\./index\.html"', 'href="../index.html"')
  $c = [regex]::Replace($c, '(?i)href="\./about\.html"', 'href="../about.html"')
  $c = [regex]::Replace($c, '(?i)href="\./gallery\.html"', 'href="../gallery.html"')
  $c = [regex]::Replace($c, '(?i)href="\./contact\.html"', 'href="../contact.html"')
  $c = [regex]::Replace($c, '(?i)href="\./blog/index\.html"', 'href="../blog/index.html"')
  $c = [regex]::Replace($c, '(?i)href="\./destinations/index\.html"', 'href="../destinations/index.html"')

  if ($c -ne $o) {
    try { Copy-Item -Path $f.FullName -Destination ($f.FullName + '.bak.packlinks') -ErrorAction SilentlyContinue } catch {}
    Set-Content -Path $f.FullName -Value $c -Encoding UTF8
    Write-Host ("Updated: {0}" -f $f.Name)
  }
}

Write-Host 'Done.'
