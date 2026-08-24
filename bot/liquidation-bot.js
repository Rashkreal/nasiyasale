#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════════════
 *  ListingMarket likvidatsiya bot'i
 * ════════════════════════════════════════════════════════════════════════
 *
 *  Bu skript barcha OCHIQ pozitsiyalarni muntazam tekshiradi, va agar
 *  qaysidir pozitsiya likvidatsiya qilinishi mumkin bo'lsa (narx pasaygan
 *  yoki muddat o'tgan), liquidate() ni chaqiradi — buning evaziga 1%
 *  mukofot (qarzning 1%i, WBTC yoki garov tokenida) botning hamyoniga
 *  tushadi.
 *
 *  liquidate() — RUXSATSIZ (permissionless): istalgan kishi chaqira oladi.
 *  Bu skript shunchaki buni AVTOMATLASHTIRADI, hech qanday maxsus huquq
 *  talab qilmaydi.
 *
 *  ISHGA TUSHIRISH:
 *    1. `npm install ethers dotenv` (agar hali o'rnatilmagan bo'lsa)
 *    2. Shu papkada `.env` fayl yarating (pastdagi namunaga qarang)
 *    3. `node liquidation-bot.js`
 *
 *  .env NAMUNASI (bot.env.example fayliga qarang):
 *    PRIVATE_KEY=0x...           (botning hamyoni — faqat gaz + mukofotlar uchun)
 *    RPC_URL=https://...         (ixtiyoriy, standart Ankr ishlatiladi)
 *    POLL_INTERVAL_SECONDS=30    (ixtiyoriy, standart 30)
 *    DRY_RUN=false               (true bo'lsa, hech qanday tranzaksiya YUBORILMAYDI, faqat log qiladi)
 *
 *  MUHIM: bu hamyonda GAZ uchun ozgina ETH bo'lishi kerak (Arbitrum'da
 *  bir necha dollar kifoya). Boshqa hech narsa (WBTC/USDC) oldindan
 *  kerak emas — mukofotlar avtomatik shu hamyonga tushadi.
 * ════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { ethers } = require('ethers');
const https = require('https');

// ── Sozlamalar ──────────────────────────────────────────────────────────
const CONTRACT_ADDRESS = '0x3F405B4203540474Cd8E45AFbdEa63Ea9d6c187e';
const RPC_URL = process.env.RPC_URL
  || 'https://rpc.ankr.com/arbitrum/e531710028d0852baae1e1de9993017d4025b2d30d21d0ac5f812150724416b5';
const RPC_BACKUP = 'https://arb1.arbitrum.io/rpc';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const POLL_INTERVAL_MS = (Number(process.env.POLL_INTERVAL_SECONDS) || 30) * 1000;
const DRY_RUN = (process.env.DRY_RUN || 'false').toLowerCase() === 'true';
const PAGE_SIZE = 50; // Har bir chaqiruvda nechta pozitsiya birga o'qiladi
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!PRIVATE_KEY) {
  console.error("XATO: .env faylida PRIVATE_KEY topilmadi. bot.env.example'ga qarang.");
  process.exit(1);
}

const ABI = [
  'function totalPositions() external view returns (uint256)',
  'function getAllPositions(uint256 offset, uint256 limit) external view returns (tuple(address buyer, address seller, uint256 priceUSDC, uint256 dueDate, uint8 collateralTokenId, uint256 collateralAmount, uint16 bufferBps, uint8 status)[] result, uint256[] ids)',
  'function isLiquidatable(uint256 positionId) external view returns (bool)',
  'function liquidate(uint256 positionId) external',
  // Kontraktning maxsus xatolari — bularsiz ethers "unknown custom error"
  // deb qisqartirib qo'yadi, aniq sababni ko'rsatolmaydi.
  'error BadChainlinkPrice()',
  'error BadListingParams()',
  'error BadPeriod()',
  'error BadTokenId()',
  'error BelowMinimumFill(uint256 fillValue, uint256 minimumRequired)',
  'error BelowRequiredFloor(uint256 remainingValue, uint256 requiredValue)',
  'error CannotApproveOwnListing()',
  'error ChainlinkPriceUnderflow()',
  'error ExceedsRemainingAmount(uint256 requested, uint256 remaining)',
  'error InsufficientCollateral()',
  'error ListingNotPending()',
  'error NoPriceAvailable()',
  'error NotBuyer()',
  'error NotLiquidatable()',
  'error NotPoolManager()',
  'error NotSeller()',
  'error PositionNotFound()',
  'error PositionNotOpen()',
  'error PositionWouldBeLiquidatable()',
  'error PriceTooHigh(uint256 narx, uint256 maxAllowed)',
  'error ReentrancyGuardReentrantCall()',
  'error SafeERC20FailedOperation(address token)',
  'error SameToken()',
  'error SequencerDown()',
  'error SequencerFeedDead()',
  'error SequencerGracePeriod()',
  'error StaleChainlinkPrice()',
  'error StaleChainlinkRound()',
  'error SwapWouldLeaveLiquidatable()',
  'error TooLittleReceived(uint256 minOut, uint256 actualOut)',
  'error ZeroAmount()',
  'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)',
  'error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)',
];

const STATUS_OPEN = 0;

// ── Yordamchi funksiyalar ───────────────────────────────────────────────
function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function getProvider() {
  try {
    const p = new ethers.JsonRpcProvider(RPC_URL);
    await p.getBlockNumber();
    return p;
  } catch (e) {
    log(`Asosiy RPC ishlamadi (${e.message}), zaxira RPC'ga o'tilmoqda...`);
    return new ethers.JsonRpcProvider(RPC_BACKUP);
  }
}

// Barcha OCHIQ pozitsiyalarni sahifalab yig'ib chiqadi.
async function fetchOpenPositions(contract) {
  const total = await contract.totalPositions();
  const open = [];
  for (let offset = 0n; offset < total; offset += BigInt(PAGE_SIZE)) {
    const [result, ids] = await contract.getAllPositions(offset, PAGE_SIZE);
    for (let i = 0; i < result.length; i++) {
      if (Number(result[i].status) === STATUS_OPEN) {
        open.push({ id: ids[i], position: result[i] });
      }
    }
  }
  return open;
}

// Xato obyektidan, agar mumkin bo'lsa, kontraktning aniq maxsus xato
// nomini chiqarib oladi (masalan "NotLiquidatable") — buning uchun ABI'da
// error ta'riflari BO'LISHI SHART, aks holda ethers "unknown custom
// error" deb qisqartirib qo'yadi.
function describeError(e) {
  if (e?.reason) return e.reason;
  if (e?.shortMessage) return e.shortMessage;
  return e?.message || "noma'lum xato";
}

// Telegram'ga oddiy xabar yuboradi (POLLING EMAS — shuning uchun Aave
// botining 409 muammosiga aloqasi yo'q; bu shunchaki bir martalik HTTP
// so'rov, hech kim bilan "navbat" talashmaydi). Agar token/chat_id
// sozlanmagan bo'lsa, jimgina o'tkazib yuboriladi (xato bermaydi).
function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const payload = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' });
  const req = https.request(
    {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    },
    (res) => {
      if (res.statusCode !== 200) {
        log(`[Telegram] Xabar yuborilmadi (status ${res.statusCode})`);
      }
    }
  );
  req.on('error', (e) => log(`[Telegram] Xabar yuborishda xato: ${e.message}`));
  req.write(payload);
  req.end();
}
async function tryLiquidate(contract, wallet, positionId) {
  if (DRY_RUN) {
    log(`  [DRY RUN] #${positionId} likvidatsiya qilinardi (haqiqiy tranzaksiya yuborilmadi)`);
    return;
  }
  try {
    const tx = await contract.connect(wallet).liquidate(positionId);
    log(`  #${positionId}: tranzaksiya yuborildi (${tx.hash}), tasdiqlanishi kutilmoqda...`);
    const receipt = await tx.wait();
    log(`  #${positionId}: LIKVIDATSIYA MUVAFFAQIYATLI (blok ${receipt.blockNumber})`);
    sendTelegramMessage(
      `✅ <b>Likvidatsiya muvaffaqiyatli</b>\n` +
      `Pozitsiya: #${positionId}\n` +
      `Blok: ${receipt.blockNumber}\n` +
      `Tx: <a href="https://arbiscan.io/tx/${tx.hash}">${tx.hash.slice(0, 10)}...</a>`
    );
  } catch (e) {
    // Boshqa bot/odam bizdan oldin ulgurgan bo'lishi mumkin — bu normal
    // holat, xato sifatida hisoblanmaydi, shunchaki keyingisiga o'tamiz.
    log(`  #${positionId}: o'tkazib yuborildi (${describeError(e)})`);
  }
}

async function runOnce(contract, wallet) {
  const openPositions = await fetchOpenPositions(contract);
  log(`${openPositions.length} ta ochiq pozitsiya tekshirilmoqda...`);

  let liquidatableCount = 0;
  for (const { id } of openPositions) {
    let liquidatable = false;
    try {
      liquidatable = await contract.isLiquidatable(id);
    } catch (e) {
      log(`  #${id}: holatini tekshirishda xato (${describeError(e)}) — o'tkazib yuborildi`);
      continue;
    }
    if (liquidatable) {
      liquidatableCount++;
      log(`  #${id}: LIKVIDATSIYA QILINISHI MUMKIN — harakat qilinmoqda`);
      await tryLiquidate(contract, wallet, id);
    }
  }

  if (liquidatableCount === 0) {
    log('Likvidatsiya qilinishi kerak bo\'lgan pozitsiya topilmadi.');
  }
}

// ── Asosiy dastur ───────────────────────────────────────────────────────
async function main() {
  log('Likvidatsiya bot ishga tushmoqda...');
  log(`Rejim: ${DRY_RUN ? "SINOV (DRY RUN — tranzaksiya yuborilmaydi)" : 'HAQIQIY'}`);
  log(`Tekshirish oralig'i: ${POLL_INTERVAL_MS / 1000} soniya`);

  const provider = await getProvider();
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  log(`Bot hamyoni: ${wallet.address}`);
  const ethBalance = await provider.getBalance(wallet.address);
  log(`ETH balansi (gaz uchun): ${ethers.formatEther(ethBalance)} ETH`);
  if (ethBalance === 0n && !DRY_RUN) {
    console.warn('OGOHLANTIRISH: hamyonda ETH yo\'q — tranzaksiyalar gaz yetishmasligi sababli muvaffaqiyatsiz bo\'ladi!');
  }
  sendTelegramMessage(`🤖 <b>ListingMarket likvidatsiya bot ishga tushdi</b>\nRejim: ${DRY_RUN ? 'SINOV' : 'HAQIQIY'}`);

  // Birinchi tekshiruv darhol, keyin muntazam oraliqda.
  while (true) {
    try {
      await runOnce(contract, wallet);
    } catch (e) {
      log(`Umumiy xato (davom etilmoqda): ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

process.on('SIGINT', () => {
  log('To\'xtatilmoqda (Ctrl+C)...');
  process.exit(0);
});

main().catch((e) => {
  console.error('O\'LIK XATO:', e);
  process.exit(1);
});
