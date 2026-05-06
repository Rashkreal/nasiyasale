const fs = require("fs");
const path = "src/i18n.js";

if (!fs.existsSync(path)) {
  console.error("❌ src/i18n.js topilmadi");
  process.exit(1);
}

const backup = "src/i18n.backup-before-v5.js";
fs.copyFileSync(path, backup);
console.log("✅ Backup yaratildi:", backup);

let text = fs.readFileSync(path, "utf8");

// V4 claim textlarini V5 default claim textlariga almashtiramiz.
// Bu regexlar faqat key nomini topadi, eski qiymat qaysi tilda bo‘lsa ham ishlaydi.
const replacements = [
  [/approvedClaimCol:\s*"[^"]*",/g, 'approvedClaimCol: "Default claim qilish",'],
  [/approvedClaimBL:\s*"[^"]*",/g, 'approvedClaimBL: "Default claim qilish",'],
  [/approvedClaimColSuccess:\s*"[^"]*",/g, 'approvedClaimColSuccess: "Default claim muvaffaqiyatli bajarildi!",'],
  [/approvedClaimBLSuccess:\s*"[^"]*",/g, 'approvedClaimBLSuccess: "Default claim muvaffaqiyatli bajarildi!",'],

  [/statusClaimCol:\s*"[^"]*",/g, 'statusClaimCol: "Default",'],
  [/statusClaimBL:\s*"[^"]*",/g, 'statusClaimBL: "Default",'],

  [/historyBLClaimed:\s*"[^"]*",/g, 'historyBLClaimed: "Default claim qilindi",'],
  [/txEventBLClaimed:\s*"[^"]*",/g, 'txEventBLClaimed: "Default claim qilindi",'],

  [/aboutBLRow3Value:\s*"[^"]*",/g, 'aboutBLRow3Value: "Faqat o‘sha sotuvchi bilan BL = 0 bo‘ladi",'],
];

for (const [from, to] of replacements) {
  text = text.replace(from, to);
}

// Yangi V5 keylarni har bir til bo‘limiga qo‘shish.
// approvedDeadline dan keyin qo‘shamiz.
// Agar keylar oldin qo‘shilgan bo‘lsa, qayta qo‘shmaymiz.
if (!text.includes("approvedClaimDefault:")) {
  text = text.replace(
    /(approvedDeadline:\s*"[^"]*",)/g,
    `$1
    approvedClaimDefault: "Default claim qilish",
    approvedClaimDefaultSuccess: "Default claim muvaffaqiyatli bajarildi!",
    statusDefaulted: "Default / to‘lanmagan",
    payAfterDefault: "Keyin to‘lash",
    payAfterDefaultSuccess: "Default qarz to‘landi!",
    blacklistedWarning: "Siz qora ro‘yxatdasiz. Garovsiz sotib ololmaysiz.",
    unpaidDefaultLeft: "To‘lanmagan defaultlar",`
  );
}

// Agar approvedDeadline topilmasa, hech bo‘lmasa filterAll oldidan bir marta qo‘shadi.
if (!text.includes("payAfterDefault:")) {
  text = text.replace(
    /(filterAll:\s*"[^"]*",)/g,
    `$1
    approvedClaimDefault: "Default claim qilish",
    approvedClaimDefaultSuccess: "Default claim muvaffaqiyatli bajarildi!",
    statusDefaulted: "Default / to‘lanmagan",
    payAfterDefault: "Keyin to‘lash",
    payAfterDefaultSuccess: "Default qarz to‘landi!",
    blacklistedWarning: "Siz qora ro‘yxatdasiz. Garovsiz sotib ololmaysiz.",
    unpaidDefaultLeft: "To‘lanmagan defaultlar",`
  );
}

fs.writeFileSync(path, text, "utf8");

console.log("✅ src/i18n.js V5 uchun tuzatildi");
console.log("✅ Endi npm run build qiling");