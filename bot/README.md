# ListingMarket likvidatsiya bot'i

Bu bot barcha ochiq pozitsiyalarni muntazam tekshiradi va likvidatsiya
qilinishi kerak bo'lganlarini avtomatik `liquidate()` qiladi — buning
evaziga 1% mukofot bot hamyoniga tushadi.

## O'rnatish

Loyihaning **asosiy papkasida** (bu fayl joylashgan `bot/` papkasi emas,
balki `package.json` bor tashqi papkada):

```powershell
npm install dotenv
```

(`ethers` allaqachon o'rnatilgan, qayta o'rnatish shart emas.)

## Sozlash

1. `bot/bot.env.example` faylini `bot/.env` deb nusxalang
2. `.env` faylini oching, `PRIVATE_KEY=` qatoriga bot hamyonining
   private key'ini yozing (**alohida, faqat shu maqsad uchun yangi
   hamyon** yaratish tavsiya etiladi — asosiy hamyoningizni ishlatmang)
3. Shu hamyonga ozgina ETH yuboring (Arbitrum'da gaz uchun, bir necha
   dollar yetarli)

## Ishga tushirish

Avval **sinov rejimida** (hech qanday haqiqiy tranzaksiya yubormaydi,
faqat nima qilishini ko'rsatadi):

```powershell
# .env faylida DRY_RUN=true qiling, keyin:
node bot/liquidation-bot.js
```

Hammasi to'g'ri ishlayotganini ko'rgach, `.env`da `DRY_RUN=false` qilib,
qayta ishga tushiring:

```powershell
node bot/liquidation-bot.js
```

Bot konsolda ishlab turadi — to'xtatish uchun `Ctrl+C`.

## Doimiy ishlashi uchun (ixtiyoriy, keyinroq)

Hozircha bot faqat konsol ochiq turgan payt ishlaydi — kompyuter
o'chsa yoki konsol yopilsa, bot ham to'xtaydi. Agar 24/7 ishlashi
kerak bo'lsa, buni keyinroq (masalan arzon VPS serverga joylashtirib,
`pm2` yoki shunga o'xshash vosita bilan) muhokama qilishimiz mumkin.

## Muhim eslatmalar

- `.env` faylini **hech qachon** GitHub'ga yubormang — u sizning
  private key'ingizni saqlaydi. `.gitignore`ga tekshirib qo'ying.
- `liquidate()` — ruxsatsiz (permissionless) funksiya, ya'ni boshqa
  botlar/odamlar ham xuddi shu pozitsiyani sizdan oldin
  likvidatsiya qilishi mumkin. Bu holatda sizning urinishingiz
  shunchaki "o'tkazib yuboriladi" (xato emas) — konsolda ko'rasiz.
