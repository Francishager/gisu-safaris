$ErrorActionPreference = 'Stop'

$dir = Join-Path $PSScriptRoot 'payments'
$files = Get-ChildItem -Path $dir -Filter '*.html' -File -Recurse:$false

foreach ($f in $files) {
  $c = Get-Content -Raw -Path $f.FullName
  $o = $c

  # Convert leading-slash assets to relative one level up
  $c = $c.Replace('src="/js/main.js"', 'src="../js/main.js"')
  $c = $c.Replace('src="/js/script.js"', 'src="../js/script.js"')
  $c = $c.Replace('href="/css/style.css"', 'href="../css/style.css"')
  $c = $c.Replace('href="/favicon.ico"', 'href="../favicon.ico"')
  $c = $c.Replace('src="/images/', 'src="../images/')
  $c = $c.Replace('src="/img/', 'src="../img/')
  $c = $c.Replace('href="/images/', 'href="../images/')
  $c = $c.Replace('href="/img/', 'href="../img/')

  # Root page links inside payments should use ../
  $c = $c.Replace('href="/index.html"', 'href="../index.html"')
  $c = $c.Replace('href="/about.html"', 'href="../about.html"')
  $c = $c.Replace('href="/gallery.html"', 'href="../gallery.html"')
  $c = $c.Replace('href="/contact.html"', 'href="../contact.html"')
  $c = $c.Replace('href="/blog/index.html"', 'href="../blog/index.html"')

  if ($c -ne $o) {
    try { Copy-Item -Path $f.FullName -Destination ($f.FullName + '.bak.paylinks') -ErrorAction SilentlyContinue } catch {}
    Set-Content -Path $f.FullName -Value $c -Encoding UTF8
    Write-Host ("Updated: {0}" -f $f.Name)
  }
}

Write-Host 'Done.'
