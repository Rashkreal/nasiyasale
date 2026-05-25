# Approve ko'paytirgich va revoke uchun i18n kalitlarini qo'shish.
# settingsDeviationDesc dan keyin 4 tilda qo'shadi.
#
# Foydalanish:
#   cd C:\Users\atuub\creditsale
#   .\patch_approve_i18n.ps1

$file = ".\src\i18n.js"

if (-not (Test-Path $file)) {
    Write-Host "XATO: $file topilmadi" -ForegroundColor Red
    exit 1
}

Copy-Item $file "$file.before_approve"
Write-Host "Backup: $file.before_approve" -ForegroundColor Yellow

$content = Get-Content $file -Raw -Encoding UTF8

if ($content -match 'settingsApproveMultLabel:') {
    Write-Host "DIQQAT: settingsApproveMultLabel allaqachon mavjud. Patch o'tkazilmadi." -ForegroundColor Yellow
    exit 0
}

# settingsDeviationDesc — bu oldingi patch qo'shgan kalit. Undan keyin joylaymiz.
$pattern = 'settingsDeviationDesc: "'
$occurrences = [regex]::Matches($content, [regex]::Escape($pattern))

if ($occurrences.Count -ne 4) {
    Write-Host "XATO: 'settingsDeviationDesc' $($occurrences.Count) marta topildi (4 kerak)" -ForegroundColor Red
    Write-Host "Avval patch_settings_i18n.ps1 ishlatilganini tekshiring." -ForegroundColor Yellow
    exit 1
}

$blocks = @{
    'uz' = @"
    settingsApproveMultLabel: "Approve miqdori",
    settingsApproveMultDesc: "Har e'lon uchun qancha token approve qilinsin. Yuqori qiymat = kelgusi e'lonlarda approve qayta so'ralmaydi (gaz tejaydi), lekin kontraktga ko'proq ishonish kerak.",
    settingsApproveMult1: "1x (kerakli)",
    settingsApproveMultMax: "Cheksiz",
    settingsApproveMultMaxWarn: "Cheksiz approve \u2014 kontrakt istalgan vaqtda shu tokendan cheksiz miqdor yecha oladi. Faqat ishonchli kontraktlar uchun.",
    settingsRevokeLabel: "Barcha approve'larni bekor qilish",
    settingsRevokeDesc: "Kontraktga berilgan barcha token ruxsatlarini 0 ga tushiradi. Faqat ruxsat berilgan tokenlar uchun tranzaksiya yuboriladi (har biri uchun alohida tasdiq). Xavfsizlik uchun savdoni tugatgandan keyin foydalaning.",
    settingsRevokeBtn: "Barchasini bekor qilish",
    settingsRevoking: "Bekor qilinmoqda...",
    settingsRevokeChecking: "Approve'lar tekshirilmoqda...",
    settingsRevokeProgress: "bekor qilinmoqda...",
    settingsRevokeNone: "Bekor qilinadigan approve yo'q",
    settingsRevokeDone: "approve bekor qilindi",
    settingsRevokeRejected: "Bekor qilish rad etildi",
    settingsRevokeConfirmQ: "Ishonchingiz komilmi? Har bir token uchun alohida tasdiq so'raladi.",
    settingsRevokeConfirmYes: "Ha, bekor qil",
    settingsRevokeConfirmNo: "Yo'q",
"@

    'kr' = @"
    settingsApproveMultLabel: "Approve миқдори",
    settingsApproveMultDesc: "Ҳар эълон учун қанча токен approve қилинсин. Юқори қиймат = келгуси эълонларда approve қайта сўралмайди (газ тежайди), лекин контрактга кўпроқ ишониш керак.",
    settingsApproveMult1: "1x (керакли)",
    settingsApproveMultMax: "Чексиз",
    settingsApproveMultMaxWarn: "Чексиз approve \u2014 контракт исталган вақтда шу токендан чексиз миқдор еча олади. Фақат ишончли контрактлар учун.",
    settingsRevokeLabel: "Барча approve'ларни бекор қилиш",
    settingsRevokeDesc: "Контрактга берилган барча токен рухсатларини 0 га туширади. Фақат рухсат берилган токенлар учун транзаксия юборилади (ҳар бири учун алоҳида тасдиқ). Хавфсизлик учун савдони тугатгандан кейин фойдаланинг.",
    settingsRevokeBtn: "Барчасини бекор қилиш",
    settingsRevoking: "Бекор қилинмоқда...",
    settingsRevokeChecking: "Approve'лар текширилмоқда...",
    settingsRevokeProgress: "бекор қилинмоқда...",
    settingsRevokeNone: "Бекор қилинадиган approve йўқ",
    settingsRevokeDone: "approve бекор қилинди",
    settingsRevokeRejected: "Бекор қилиш рад этилди",
    settingsRevokeConfirmQ: "Ишончингиз комилми? Ҳар бир токен учун алоҳида тасдиқ сўралади.",
    settingsRevokeConfirmYes: "Ҳа, бекор қил",
    settingsRevokeConfirmNo: "Йўқ",
"@

    'ru' = @"
    settingsApproveMultLabel: "Сумма approve",
    settingsApproveMultDesc: "Сколько токенов одобрять для каждого объявления. Большее значение = approve не запрашивается повторно (экономит газ), но требует большего доверия к контракту.",
    settingsApproveMult1: "1x (точно)",
    settingsApproveMultMax: "Бесконечно",
    settingsApproveMultMaxWarn: "Бесконечный approve \u2014 контракт сможет в любой момент списать неограниченное количество этого токена. Только для доверенных контрактов.",
    settingsRevokeLabel: "Отозвать все approve",
    settingsRevokeDesc: "Сбрасывает все разрешения токенов, выданные контракту, до 0. Транзакция отправляется только для токенов с разрешением (отдельное подтверждение для каждого). Используйте после завершения торговли для безопасности.",
    settingsRevokeBtn: "Отозвать все",
    settingsRevoking: "Отзыв...",
    settingsRevokeChecking: "Проверка approve...",
    settingsRevokeProgress: "отзыв...",
    settingsRevokeNone: "Нет approve для отзыва",
    settingsRevokeDone: "approve отозвано",
    settingsRevokeRejected: "Отзыв отклонён",
    settingsRevokeConfirmQ: "Вы уверены? Для каждого токена будет запрошено отдельное подтверждение.",
    settingsRevokeConfirmYes: "Да, отозвать",
    settingsRevokeConfirmNo: "Нет",
"@

    'en' = @"
    settingsApproveMultLabel: "Approve amount",
    settingsApproveMultDesc: "How much token to approve per listing. Higher value = approve is not requested again on future listings (saves gas), but requires more trust in the contract.",
    settingsApproveMult1: "1x (exact)",
    settingsApproveMultMax: "Unlimited",
    settingsApproveMultMaxWarn: "Unlimited approve \u2014 the contract can withdraw an unlimited amount of this token at any time. Only for trusted contracts.",
    settingsRevokeLabel: "Revoke all approvals",
    settingsRevokeDesc: "Resets all token allowances granted to the contract to 0. A transaction is sent only for tokens that have an allowance (separate confirmation for each). Use after finishing trading for safety.",
    settingsRevokeBtn: "Revoke all",
    settingsRevoking: "Revoking...",
    settingsRevokeChecking: "Checking approvals...",
    settingsRevokeProgress: "revoking...",
    settingsRevokeNone: "No approvals to revoke",
    settingsRevokeDone: "approvals revoked",
    settingsRevokeRejected: "Revoke rejected",
    settingsRevokeConfirmQ: "Are you sure? A separate confirmation will be requested for each token.",
    settingsRevokeConfirmYes: "Yes, revoke",
    settingsRevokeConfirmNo: "No",
"@
}

$languages = @('uz', 'kr', 'ru', 'en')

# Oxiridan boshlab joylaymiz (offset saqlanishi uchun)
for ($i = 3; $i -ge 0; $i--) {
    $lang = $languages[$i]
    $occ = $occurrences[$i]

    # settingsDeviationDesc qatorining oxirini topamiz (keyingi \n)
    $lineEnd = $content.IndexOf("`n", $occ.Index)
    if ($lineEnd -lt 0) { $lineEnd = $content.Length }

    $block = "`r`n" + $blocks[$lang]
    $content = $content.Substring(0, $lineEnd + 1) + $block + $content.Substring($lineEnd + 1)
}

Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "MUVAFFAQIYAT: 4 tilga approve/revoke kalitlari qo'shildi (17 ta kalit har til)" -ForegroundColor Green
Write-Host ""
Write-Host "Endi npm run build qiling." -ForegroundColor Cyan
