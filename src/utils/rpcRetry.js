// src/utils/rpcRetry.js
// RPC chaqiruvlarini "429 Too Many Requests" (yoki shunga o'xshash
// vaqtinchalik) xatolardan keyin avtomatik qayta urinadigan yordamchi.
//
// NEGA KERAK: bir nechta sahifa (yoki bir nechta ochiq tab) bir vaqtda
// 30 soniyalik so'rovlarni yuborganda, umumiy hajm Ankr'ning bepul
// chegarasidan oshib ketishi mumkin. Bunday holatda ethers ba'zan
// chalkash xato beradi (masalan "StaleChainlinkPrice" — garchi narx
// aslida yangi bo'lsa ham) — bu shunchaki 429'ning noto'g'ri
// "tarjima qilingan" ko'rinishi.
//
// MUHIM: shunchaki BIR XIL, band bo'lgan provayderni qayta-qayta so'rash
// yetarli emas — agar u haqiqatan tezlik chegarasiga yetgan bo'lsa,
// bir necha soniyalik kutish ham yordam bermaydi (chegara odatda daqiqa
// darajasida hisoblanadi). Shuning uchun bu funksiya har bir qayta
// urinishda ALOHIDA, YANGI kontrakt nusxasini (boshqa RPC manzili bilan)
// ishlatishga imkon beradi — bandligi PROVIDERS ro'yxati orqali.

function looksLikeRateLimit(e) {
  const msg = (e?.message || e?.shortMessage || e?.reason || '').toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('too many requests') ||
    msg.includes('stalechainlinkprice') // Ankr rate-limit shu ko'rinishda ham chiqishi kuzatilgan
  );
}

/**
 * @param {(providerIndex: number) => Promise<any>} fn - qayta urinish kerak
 *        bo'lgan async funksiya. providerIndex (0, 1, 2...) qaysi
 *        provayderdan foydalanish kerakligini bildiradi — chaqiruvchi
 *        buni o'zining kontrakt/provider tanlovida ishlatadi.
 * @param {{maxRetries?: number, baseDelayMs?: number, providerCount?: number}} options
 */
export async function withRetry(fn, { maxRetries = 4, baseDelayMs = 500, providerCount = 2 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const providerIndex = attempt % providerCount; // 0,1,0,1,0... - provayderlarni almashtirib turadi
    try {
      return await fn(providerIndex);
    } catch (e) {
      lastError = e;
      if (!looksLikeRateLimit(e) || attempt === maxRetries) throw e;
      // Provayder ALMASHTIRILGANDA qisqa kutish kifoya (bir xil
      // provayderni qayta so'rashdan farqli o'laroq, endi YANGI
      // manzilga murojaat qilinadi, shuning uchun uzoq kutish shart emas).
      const delay = baseDelayMs * (attempt + 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// Har ikkala (Ankr + rasmiy Arbitrum) provayderni oldindan tayyorlab
// beradi — withRetry shu ro'yxatdan providerIndex bo'yicha tanlab
// ishlatadi.
export function buildProviderList(ethers, primaryUrl, backupUrl) {
  return [
    new ethers.JsonRpcProvider(primaryUrl, undefined, { batchMaxCount: 1 }),
    new ethers.JsonRpcProvider(backupUrl, undefined, { batchMaxCount: 1 }),
  ];
}
