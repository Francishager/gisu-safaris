$ErrorActionPreference = 'Stop'

# Root is the repository folder; assume script is in booking/
$root = Split-Path -Parent $PSScriptRoot
$packagesDir = Join-Path $root 'packages'
$outFile = Join-Path $PSScriptRoot 'catalog.json'

if (-not (Test-Path $packagesDir)) { throw "Packages directory not found: $packagesDir" }

# Helper: trim/normalize whitespace
function Normalize-Text([string]$s) {
  if (-not $s) { return '' }
  return ($s -replace '\s+', ' ').Trim()
}

# Determine country from filename prefix (e.g., uganda-queen-elizabeth.html)
function Country-From-Filename([string]$fileName) {
  $n = [System.IO.Path]::GetFileNameWithoutExtension($fileName).ToLowerInvariant()
  if ($n.StartsWith('uganda-')) { return 'uganda' }
  if ($n.StartsWith('kenya-')) { return 'kenya' }
  if ($n.StartsWith('tanzania-')) { return 'tanzania' }
  if ($n.StartsWith('rwanda-')) { return 'rwanda' }
  return ''
}

# Infer one or more countries from page content (title/H1).
function Countries-From-Content([string]$html) {
  $countries = @()
  $text = ($html -replace '(?is)<script.*?</script>', '')
  $title = Extract-Title $text
  $hay = ($title + ' ' + ($text.Substring(0, [Math]::Min(5000, $text.Length))))
  if ($hay -match '(?i)uganda') { $countries += 'uganda' }
  if ($hay -match '(?i)kenya') { $countries += 'kenya' }
  if ($hay -match '(?i)tanzania') { $countries += 'tanzania' }
  if ($hay -match '(?i)rwanda') { $countries += 'rwanda' }
  # Unique preserve order
  return [string[]]([System.Linq.Enumerable]::ToArray([System.Linq.Enumerable]::Distinct($countries)))
}

# Extract <h1> or <title>
function Extract-Title([string]$html) {
  $m = [regex]::Match($html, '(?is)<h1[^>]*>(.*?)</h1>')
  if ($m.Success) { return Normalize-Text($m.Groups[1].Value) }
  $m2 = [regex]::Match($html, '(?is)<title>(.*?)</title>')
  if ($m2.Success) { return Normalize-Text($m2.Groups[1].Value) }
  return ''
}

# Extract first price like $1,200 or 1200 (fallback)
function Extract-Amount([string]$html) {
  # Try common labels like From $1,200 or Price: $1,200 first
  $m = [regex]::Match($html, '(?is)(?:From|Price)\s*:?\s*\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)')
  if (-not $m.Success) {
    $m = [regex]::Match($html, '(?is)\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)')
  }
  if ($m.Success) {
    $num = $m.Groups[1].Value.Replace(',', '')
    [double]$val = 0
    if ([double]::TryParse($num, [ref]$val)) { return [math]::Round($val,2) }
  }
  return 0
}

$safariCatalog = @{
  uganda = @();
  kenya = @();
  tanzania = @();
  rwanda = @();
}

Get-ChildItem -Path $packagesDir -Filter '*.html' -File | ForEach-Object {
  $file = $_.FullName
  $country = Country-From-Filename($_.Name)
  if (-not $country) { return }
  $html = Get-Content -Raw -Path $file
  $title = Extract-Title $html
  if (-not $title) { $title = $_.BaseName }
  $amount = Extract-Amount $html
  $id = $_.BaseName
  $entry = [ordered]@{ id = $id; title = $title; amount = $amount }
  $safariCatalog[$country] += ,$entry
}

# Second pass: include pages without filename prefix by inferring from content
Get-ChildItem -Path $packagesDir -Filter '*.html' -File | ForEach-Object {
  $n = $_.Name.ToLowerInvariant()
  if ($n -match '^(uganda|kenya|tanzania|rwanda)-') { return } # already handled
  # Skip obvious index/landing pages if needed, but include specific parks
  $html = Get-Content -Raw -Path $_.FullName
  $countries = Countries-From-Content $html
  if (-not $countries -or $countries.Count -eq 0) { return }
  $title = Extract-Title $html
  if (-not $title) { $title = $_.BaseName }
  $amount = Extract-Amount $html
  $id = $_.BaseName
  $entry = [ordered]@{ id = $id; title = $title; amount = $amount }
  foreach ($c in $countries) {
    if (-not $safariCatalog.ContainsKey($c)) { $safariCatalog[$c] = @() }
    # Avoid duplicate by id
    if (-not ($safariCatalog[$c] | Where-Object { $_.id -eq $id })) {
      $safariCatalog[$c] += ,$entry
    }
  }
}

# Remove empty countries
$safariCatalog.Keys | ForEach-Object {
  if (-not $safariCatalog[$_]) { $safariCatalog.Remove($_) | Out-Null }
}

# Basic services price seeds (can be edited later)
$servicePrices = [ordered]@{
  'hotel-reservation' = 450;
  'air-ticketing' = 300;
  'car-hire' = 120;
  'travel-insurance' = 60;
  'visa-processing' = 100
}

# Compose JSON
$result = [ordered]@{
  safariCatalog = $safariCatalog
  servicePrices = $servicePrices
}

# Convert to JSON (pretty)
$json = $result | ConvertTo-Json -Depth 6
Set-Content -Path $outFile -Value $json -Encoding UTF8
Write-Host "Wrote catalog: $outFile"

# Also emit JS fallback for file:// contexts
$outJs = Join-Path $PSScriptRoot 'catalog.js'
$jsContent = @(
  "// Auto-generated. Do not edit by hand.",
  "window.__SAFARI_CATALOG__ = " + (($safariCatalog | ConvertTo-Json -Depth 6)) + ";",
  "window.__SERVICE_PRICES__ = " + (($servicePrices | ConvertTo-Json -Depth 6)) + ";"
) -join "`n"
Set-Content -Path $outJs -Value $jsContent -Encoding UTF8
Write-Host "Wrote JS fallback: $outJs"
