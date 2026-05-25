# Settings sahifa uchun i18n kalitlarini qo'shish skripti.
# 4 tilda (uz, kr, ru, en) txEventBLClaimed yoki txLabelPayAfterDefault dan keyin qo'shadi.
#
# Foydalanish:
#   cd C:\Users\atuub\creditsale
#   .\patch_settings_i18n.ps1

$file = ".\src\i18n.js"

if (-not (Test-Path $file)) {
    Write-Host "XATO: $file topilmadi" -ForegroundColor Red
    exit 1
}

Copy-Item $file "$file.before_settings"
Write-Host "Backup: $file.before_settings" -ForegroundColor Yellow

$content = Get-Content $file -Raw -Encoding UTF8

if ($content -match 'settingsTitle:') {
    Write-Host "DIQQAT: settingsTitle allaqachon mavjud. Patch o'tkazilmadi." -ForegroundColor Yellow
    exit 0
}

# Har til uchun qo'shiladigan kalitlar.
# Ilgari qo'shilgan txLabelPayAfterDefault dan keyin joylaymiz.
$blocks = @{
    'uz' = @"
    navSettings: "Sozlamalar",
    settingsTitle: "Sozlamalar",
    settingsSubtitle: "E'lon berish sozlamalari. Bir marta belgilang \u2014 har e'lon uchun avtomatik ishlatiladi.",
    settingsDurationLabel: "E'lon muddati",
    settingsDurationDesc: "Yangi e'lon shu muddat ichida tasdiqlanmasa, avtomatik bekor bo'ladi. Default: 90 kun.",
    settingsDurationRange: "Oraliq",
    settingsDays: "kun",
    settingsSaved: "Saqlandi",
    settingsDeviationLabel: "Narx farqi cheklovi",
    settingsDeviationDesc: "E'lonni tasdiqlash vaqtida bozor narxi lock narxidan shuncha foizdan ko'p farqlansa, tranzaksiya avtomatik bekor qilinadi (flash loan himoyasi). Default: 3%.",
"@

    'kr' = @"
    navSettings: "Созламалар",
    settingsTitle: "Созламалар",
    settingsSubtitle: "Эълон бериш созламалари. Бир марта белгиланг \u2014 ҳар эълон учун автоматик ишлатилади.",
    settingsDurationLabel: "Эълон муддати",
    settingsDurationDesc: "Янги эълон шу муддат ичида тасдиқланмаса, автоматик бекор бўлади. Default: 90 кун.",
    settingsDurationRange: "Оралиқ",
    settingsDays: "кун",
    settingsSaved: "Сақланди",
    settingsDeviationLabel: "Нарх фарқи чеклови",
    settingsDeviationDesc: "Эълонни тасдиқлаш вақтида бозор нархи лок нархидан шунча фоиздан кўп фарқланса, транзаксия автоматик бекор қилинади (flash loan ҳимояси). Default: 3%.",
"@

    'ru' = @"
    navSettings: "Настройки",
    settingsTitle: "Настройки",
    settingsSubtitle: "Настройки создания объявлений. Задайте один раз \u2014 применяется автоматически к каждому объявлению.",
    settingsDurationLabel: "Срок объявления",
    settingsDurationDesc: "Если объявление не подтверждено в этот срок, оно автоматически отменяется. По умолчанию: 90 дней.",
    settingsDurationRange: "Диапазон",
    settingsDays: "дн.",
    settingsSaved: "Сохранено",
    settingsDeviationLabel: "Лимит отклонения цены",
    settingsDeviationDesc: "Если при подтверждении рыночная цена отклоняется от зафиксированной более чем на этот процент, транзакция автоматически отменяется (защита от flash loan). По умолчанию: 3%.",
"@

    'en' = @"
    navSettings: "Settings",
    settingsTitle: "Settings",
    settingsSubtitle: "Listing creation settings. Set once \u2014 applied automatically to every listing.",
    settingsDurationLabel: "Listing duration",
    settingsDurationDesc: "If a new listing is not approved within this period, it is automatically cancelled. Default: 90 days.",
    settingsDurationRange: "Range",
    settingsDays: "days",
    settingsSaved: "Saved",
    settingsDeviationLabel: "Price deviation limit",
    settingsDeviationDesc: "If the market price at approval deviates from the locked price by more than this percent, the transaction is automatically reverted (flash loan protection). Default: 3%.",
"@
}

$languages = @('uz', 'kr', 'ru', 'en')
$pattern = 'txLabelPayAfterDefault: "'
$occurrences = [regex]::Matches($content, [regex]::Escape($pattern))

if ($occurrences.Count -ne 4) {
    Write-Host "XATO: 'txLabelPayAfterDefault' $($occurrences.Count) marta topildi (4 kerak)" -ForegroundColor Red
    Write-Host "Avtomatik patch o'tkazilmadi." -ForegroundColor Yellow
    exit 1
}

# Har bir uchrash uchun: o'sha qatorning oxiriga (keyingi newline'gacha) yetib,
# undan keyin yangi kalitlarni qo'shamiz. Oxiridan boshlab (offset saqlanishi uchun).
for ($i = 3; $i -ge 0; $i--) {
    $lang = $languages[$i]
    $occ = $occurrences[$i]

    # txLabelPayAfterDefault qatorining oxirini topamiz (keyingi \n)
    $lineEnd = $content.IndexOf("`n", $occ.Index)
    if ($lineEnd -lt 0) { $lineEnd = $content.Length }

    $block = "`r`n" + $blocks[$lang]
    $content = $content.Substring(0, $lineEnd + 1) + $block + $content.Substring($lineEnd + 1)
}

Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "MUVAFFAQIYAT: 4 tilga Settings kalitlari qo'shildi:" -ForegroundColor Green
Write-Host "  navSettings, settingsTitle, settingsSubtitle,"
Write-Host "  settingsDurationLabel, settingsDurationDesc, settingsDurationRange,"
Write-Host "  settingsDays, settingsSaved, settingsDeviationLabel, settingsDeviationDesc"
Write-Host ""
Write-Host "Endi npm run build qiling." -ForegroundColor Cyan
