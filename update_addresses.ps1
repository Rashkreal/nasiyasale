# Eski contract manzillarini yangi manzillarga almashtirish.
# About.js va public/nasiyasale.txt fayllarida.
#
# Foydalanish:
#   cd C:\Users\atuub\creditsale
#   .\update_addresses.ps1

# Eski -> Yangi manzillar
$OLD_CREDITSALE = "0x86808FFD1204C2BD9Ad5B79022968D11408d3efc"
$NEW_CREDITSALE = "0xc96A9D80E03BC97EDb7DB189c0bE233aD151F232"

$OLD_VAULT = "0x1B1F96f30B8F6265a299000Ab23862c35a41B4a9"
$NEW_VAULT = "0xaB7B9E2d539Bbcd6a8Bde434ab481D192DDC2Ba5"

$files = @(
    ".\src\pages\Tokenomics.js",
    ".\src\pages\About.js",
    ".\public\nasiyasale.txt"
)

$totalCS = 0
$totalV = 0

foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        Write-Host "DIQQAT: $file topilmadi, o'tkazib yuborildi" -ForegroundColor Yellow
        continue
    }

    # Backup
    Copy-Item $file "$file.before_addr"

    $content = Get-Content $file -Raw -Encoding UTF8

    # CreditSale almashtirish (case-insensitive emas - aniq mos)
    $csCount = ([regex]::Matches($content, [regex]::Escape($OLD_CREDITSALE))).Count
    $content = $content.Replace($OLD_CREDITSALE, $NEW_CREDITSALE)

    # Vault almashtirish
    $vCount = ([regex]::Matches($content, [regex]::Escape($OLD_VAULT))).Count
    $content = $content.Replace($OLD_VAULT, $NEW_VAULT)

    Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline

    $totalCS += $csCount
    $totalV += $vCount

    Write-Host "$file" -ForegroundColor Cyan
    Write-Host "  CreditSale: $csCount ta almashtirildi" -ForegroundColor Green
    Write-Host "  Vault:      $vCount ta almashtirildi" -ForegroundColor Green
    Write-Host ""
}

Write-Host "==================================================" -ForegroundColor Green
Write-Host "JAMI: CreditSale $totalCS ta, Vault $totalV ta almashtirildi" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backup fayllar: *.before_addr" -ForegroundColor Yellow
Write-Host "Endi npm run build qiling." -ForegroundColor Cyan
