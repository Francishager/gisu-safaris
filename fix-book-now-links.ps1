$ErrorActionPreference = 'Stop'

# Root of the site
$root = $PSScriptRoot

# Enumerate HTML files, excluding backups directory
$files = Get-ChildItem -Path $root -Filter '*.html' -File -Recurse | Where-Object { $_.FullName -notmatch [regex]::Escape((Join-Path $root 'backups')) }

$updated = 0
foreach ($f in $files) {
  $c = Get-Content -Raw -Path $f.FullName
  $o = $c
  
  # Compute correct relative path to booking/index.html for this file
  $isRootLevel = [System.IO.Path]::GetFullPath($f.DirectoryName).TrimEnd([System.IO.Path]::DirectorySeparatorChar) -eq [System.IO.Path]::GetFullPath($root).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
  $bookingRel = if ($isRootLevel) { './booking/index.html' } else { '../booking/index.html' }

  # 1) Service-specific hotel booking pages -> unified booking page with bookingType=service
  #    Handle ../, ./, or bare relative variants
  $c = [regex]::Replace($c,
    '(?i)href=\"(?:\./|\.\./)?booking/hotel-booking\.html\?title=([^\"&]+)&amount=([^\"&]+)\"',
    ('href=\"' + $bookingRel + '?bookingType=service&title=$1&amount=$2\"'))
  $c = [regex]::Replace($c,
    '(?i)href=\"booking/hotel-booking\.html\?title=([^\"&]+)&amount=([^\"&]+)\"',
    ('href=\"' + $bookingRel + '?bookingType=service&title=$1&amount=$2\"'))

  # 2) Convert only the href attribute when the anchor contains "Book Now"
  #    contact.html -> bookingRel
  $c = [regex]::Replace($c,
    ('(?is)(<a[^>]*href=\")((?:\./|\.\./)?contact\.html)(\"[^>]*>)(?:(?!</a>).)*?Book\s*Now'),
    ('$1' + $bookingRel + '$3'))

  # 3) #contact-form -> bookingRel (only when anchor contains Book Now)
  $c = [regex]::Replace($c,
    ('(?is)(<a[^>]*href=\")#contact-form(\"[^>]*>)(?:(?!</a>).)*?Book\s*Now'),
    ('$1' + $bookingRel + '$2'))

  # 4) Normalize ./booking/index.html in nested pages to ../booking/index.html when used with Book Now
  if (-not $isRootLevel) {
    $c = [regex]::Replace($c,
      ('(?is)(<a[^>]*href=\")\./booking/index\.html(\"[^>]*>)(?:(?!</a>).)*?Book\s*Now'),
      ('$1' + $bookingRel + '$2'))
  }

  if ($c -ne $o) {
    try { Copy-Item -Path $f.FullName -Destination ($f.FullName + '.bak.booknow') -ErrorAction SilentlyContinue } catch {}
    Set-Content -Path $f.FullName -Value $c -Encoding UTF8
    $updated++
    Write-Host ("Updated: {0}" -f $f.FullName)
  }
}

Write-Host ("Done. Updated files: {0}" -f $updated)
