const fs = require("fs");

const path = "src/pages/Approved.js";

if (!fs.existsSync(path)) {
  console.error("❌ src/pages/Approved.js topilmadi");
  process.exit(1);
}

const backup = "src/pages/Approved.backup-before-garovsiz-default-only.js";
fs.copyFileSync(path, backup);

let text = fs.readFileSync(path, "utf8");

// 1) Faqat garovsiz defaultlarni chiqarish
text = text.replace(
  `if (status === 7 && (buyerIsMe || sellerIsMe)) {
            arr.push(item);
          }`,
  `if (status === 7 && !item.isCollateral && (buyerIsMe || sellerIsMe)) {
            arr.push(item);
          }`
);

// 2) Bo‘lim nomini almashtirish
text = text.replace(
  `Mening default qarzlarim`,
  `Garovsiz default shartnomalar`
);

// 3) Empty text almashtirish
text = text.replace(
  `Default qarzlar yo‘q.`,
  `Garovsiz default shartnomalar yo‘q.`
);

fs.writeFileSync(path, text, "utf8");

console.log("✅ Approved.js yangilandi");
console.log("✅ Backup:", backup);