// src/utils/rpcRetry.js
// RPC chaqiruvlarini "429 Too Many Requests" (yoki shunga o'xshash
// vaqtinchalik) xatolardan keyin avtomatik qayta urinadigan yordamchi.
//
// NEGA KERAK: bir nechta sahifa (yoki bir nechta ochiq tab) bir vaqtda
// 30 soniyalik so'rovlarni yuborganda, umumiy hajm Ankr'ning bepul
// chegarasidan oshib ketishi mumkin. Bunday holatda ethers ba'zan
// chalkash xato beradi (masalan "StaleChainlinkPrice" — garchi narx
// aslida yangi bo'lsa ham) — bu shunchaki 429'ning noto'g'ri
// "tarjima qilingan" ko'rinishi. Bu funksiya bunday holatlarni aniqlab,
// qisqa kutib, qayta so'raydi — foydalanuvchi ekranida bekorga xato
// ko'rinmasligi uchun.

function looksLikeRateLimit(e) {
  const msg = (e?.message || e?.shortMessage || e?.reason || '').toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('too many requests') ||
    msg.includes('stalechainlinkprice') // Ankr rate-limit shu ko'rinishda ham chiqishi kuzatilgan
  );
}

/**
 * @param {() => Promise<any>} fn - qayta urinish kerak bo'lgan async funksiya
 * @param {{maxRetries?: number, baseDelayMs?: number}} options
 */
export async function withRetry(fn, { maxRetries = 3, baseDelayMs = 800 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (!looksLikeRateLimit(e) || attempt === maxRetries) throw e;
      const delay = baseDelayMs * Math.pow(2, attempt); // 800ms, 1.6s, 3.2s...
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
