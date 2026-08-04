import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { useWeb3 } from '../hooks/useWeb3';
import { TOKEN_ADDRESSES, TOKEN_DECIMALS, ERC20_ABI } from '../abi/contract';
import {
  ArrowRightLeft, PlusCircle, MinusCircle, CheckCircle2,
  AlertTriangle, Loader2, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════
//  Faol pozitsiya boshqaruvi — Dex.js / DexListings.js bilan bir xil
//  sahifa oilasi. Har bir sahifa o'zining manzil/ABI/yordamchi
//  funksiyalarini o'zida saqlaydi (Vault.js naqshi).
//
//  MUHIM TARIXIY ESLATMA: bu sahifaning birinchi versiyasi "mening
//  pozitsiyalarim"ni voqealarni (events, eth_getLogs) skanerlab topgan
//  edi. Bu mo'rt bo'lib chiqdi — RPC provayderlar blok oralig'iga
//  hujjatlashtirilmagan, kichik chegara qo'yadi (Ankr hatto 5000 blokni
//  ham rad etdi), va vaqt o'tishi bilan "so'nggi N blok" oynasi eski
//  pozitsiyalarni "unutib qo'yardi". CreditSale bu muammoni umuman
//  boshqacha yechgan ekan: kontraktning o'zi xaridor bo'yicha massiv
//  saqlaydi. Shu naqsh endi ListingMarket'ga ham qo'shildi
//  (getPositionsByBuyer / totalPositionsByBuyer) — oddiy eth_call, hech
//  qanday blok chegarasi yo'q. Shuning uchun bu versiya voqea-skanerlash,
//  sahifalab qidirish va "qo'lda topilganlarni saqlab qolish" kabi butun
//  murakkab qatlamni olib tashladi.
// ══════════════════════════════════════════════════════════════════════

const DEX_ADDRESS = '0xF3892fD31De58995bAA4A345B3c745612dbf9F95';

// Kontraktdagi kabi qattiq belgilangan token ID'lar — o'zgarmas konstanta,
// har safar so'rash shart emas.
const TOKEN_WBTC = 0;
const TOKEN_WETH = 1;
const TOKEN_USDC = 2;

function tokenSymbolFor(tokenId) {
  if (tokenId === TOKEN_WBTC) return 'WBTC';
  if (tokenId === TOKEN_WETH) return 'WETH';
  return 'USDC';
}
function tokenDecimalsFor(tokenId) {
  if (tokenId === TOKEN_WBTC) return TOKEN_DECIMALS.WBTC;
  if (tokenId === TOKEN_WETH) return TOKEN_DECIMALS.WETH;
  return TOKEN_DECIMALS.USDC;
}
function tokenKeyFor(tokenId) {
  if (tokenId === TOKEN_WBTC) return 'WBTC';
  if (tokenId === TOKEN_WETH) return 'WETH';
  return 'USDC';
}

const DEX_ABI = [
  // O'qish
  'function positions(uint256) external view returns (address buyer, address seller, uint256 priceUSDC, uint256 durAmount, uint256 dueDate, uint8 collateralTokenId, uint256 collateralAmount, uint16 bufferBps, uint8 status)',
  'function requiredFloor(uint256 positionId) external view returns (uint256)',
  'function liquidationThreshold(uint256 positionId) external view returns (uint256)',
  'function currentValue(uint256 positionId) external view returns (uint256)',
  'function isLiquidatable(uint256 positionId) external view returns (bool)',
  'function withdrawableMargin(uint256 positionId) external view returns (uint256)',
  'function getTokenPriceUSDC(uint8 tokenId) external view returns (uint256)',
  'function getSafeDurPrice() external view returns (uint256)',
  'function isSafePriceAvailable() external view returns (bool)',
  'function totalPositionsByBuyer(address buyer) external view returns (uint256)',
  'function getPositionsByBuyer(address buyer, uint256 offset, uint256 limit) external view returns (tuple(address buyer, address seller, uint256 priceUSDC, uint256 durAmount, uint256 dueDate, uint8 collateralTokenId, uint256 collateralAmount, uint16 bufferBps, uint8 status)[] result, uint256[] ids)',
  // Yozish
  'function addMargin(uint256 positionId, uint256 amount) external',
  'function removeMargin(uint256 positionId, uint256 amount) external',
  'function swapDurToUsdc(uint256 positionId, uint256 minUsdcOut) external',
  'function swapCollateralToToken(uint256 positionId, uint8 targetTokenId, uint256 minAmountOut) external',
  'function swapCollateralToUsdc(uint256 positionId, uint256 minUsdcOut) external',
  'function repay(uint256 positionId) external',
  'function liquidate(uint256 positionId) external',
  'function checkpoint() external',
  // Kontraktning BARCHA maxsus xatolari
  'error AlreadySwapped()',
  'error BadChainlinkPrice()',
  'error BadListingParams()',
  'error BadPeriod()',
  'error BadTokenId()',
  'error BelowRequiredFloor(uint256 remainingValue, uint256 requiredValue)',
  'error CannotApproveOwnListing()',
  'error ChainlinkPriceUnderflow()',
  'error CheckpointDeviationExceeded(uint256 prevPrice, uint256 currPrice)',
  'error CheckpointGapNotElapsed(uint256 gap, uint256 required)',
  'error CheckpointStale(uint256 age, uint256 maxAge)',
  'error CheckpointTooSoon(uint256 nextAllowedAt)',
  'error InsufficientCollateral()',
  'error ListingNotPending()',
  'error MustSwapDurFirst()',
  'error NoCheckpointYet()',
  'error NoPriceAvailable()',
  'error NotBuyer()',
  'error NotLiquidatable()',
  'error NotPoolManager()',
  'error NotSeller()',
  'error NothingToSwap()',
  'error PoolEmpty()',
  'error PositionNotFound()',
  'error PositionNotOpen()',
  'error PriceTooHigh(uint256 narx, uint256 maxAllowed)',
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

const ERROR_MESSAGES = {
  CannotApproveOwnListing: "O'zingiz joylagan e'lon/taklifni o'zingiz bajara olmaysiz — buni faqat boshqa hamyon amalga oshirishi mumkin",
  ListingNotPending: "Bu e'lon/taklif allaqachon tasdiqlangan yoki bekor qilingan",
  NoCheckpointYet: "Oracle hali umuman ishga tushirilmagan",
  CheckpointStale: 'Narx eskirgan — avval "Narxni yangilash" tugmasini bosing',
  CheckpointGapNotElapsed: "Checkpointlar orasida yetarli vaqt o'tmagan",
  CheckpointTooSoon: "Hali erta — bir necha soniyadan keyin qayta urinib ko'ring",
  CheckpointDeviationExceeded: "Narx juda keskin o'zgardi — birozdan keyin qayta urinib ko'ring",
  PriceTooHigh: "Narx tannarxdan +10%dan oshib ketgan",
  BadListingParams: "Miqdor yoki narx noto'g'ri kiritilgan",
  BadPeriod: "To'lov muddati 1-30 kun oralig'ida bo'lishi kerak",
  InsufficientCollateral: "Garov yetarli emas",
  BelowRequiredFloor: "Bu miqdorni olib qo'yish pozitsiyani xavfli holatga tashlaydi",
  SwapWouldLeaveLiquidatable: "Bu swap pozitsiyani darhol likvidatsiyaga tashlab yuboradi — avval garov qo'shing",
  NothingToSwap: "Swap qilish uchun DUR qolmagan",
  MustSwapDurFirst: "Avval DUR'ni USDC'ga swap qilish kerak",
  AlreadySwapped: "Garov allaqachon boshqa tokenga aylantirilgan",
  PositionNotFound: "Bunday pozitsiya topilmadi",
  PositionNotOpen: "Bu pozitsiya endi ochiq emas",
  NotBuyer: "Bu amalni faqat pozitsiya xaridori bajara oladi",
  NotSeller: "Bu amalni faqat e'lon egasi bajara oladi",
  NotLiquidatable: "Bu pozitsiya hali likvidatsiya qilinishi mumkin emas",
  ZeroAmount: "Miqdor 0 bo'lishi mumkin emas",
  BadTokenId: "Noto'g'ri token tanlandi",
  PoolEmpty: "Uniswap pool bo'sh yoki ishga tushirilmagan",
  SequencerDown: "Arbitrum sequencer vaqtincha ishlamayapti — birozdan keyin urinib ko'ring",
  SequencerGracePeriod: "Sequencer yaqinda tiklandi — bir necha daqiqa kutish kerak",
  SequencerFeedDead: "Sequencer holatini tekshirib bo'lmadi",
  BadChainlinkPrice: "Narx manbasidan noto'g'ri ma'lumot keldi",
  StaleChainlinkPrice: "Narx manbasi eskirgan",
  StaleChainlinkRound: "Narx manbasi to'liq yangilanmagan",
  ChainlinkPriceUnderflow: "Narx hisoblashda xato",
  NoPriceAvailable: "Hech qanday narx manbai topilmadi",
  NotPoolManager: "Ruxsatsiz chaqiruv",
  TooLittleReceived: "Swap natijasi kutilgandan kam — slippage juda yuqori",
};

const DEX_INTERFACE = new ethers.Interface(DEX_ABI);

function translateContractError(e, decimalsForBalanceErr = TOKEN_DECIMALS.USDC) {
  const rawMsg = (e?.reason || e?.shortMessage || e?.message || '').toLowerCase();
  if (rawMsg.includes('rejected') || rawMsg.includes('denied') || rawMsg.includes('user denied')) {
    return 'Rad etildi';
  }

  const candidates = [e?.data, e?.error?.data, e?.info?.error?.data, e?.error?.error?.data];
  for (const data of candidates) {
    if (!data || typeof data !== 'string') continue;
    try {
      const parsed = DEX_INTERFACE.parseError(data);
      if (parsed?.name === 'ERC20InsufficientBalance') {
        const balance = ethers.formatUnits(parsed.args.balance, decimalsForBalanceErr);
        const needed = ethers.formatUnits(parsed.args.needed, decimalsForBalanceErr);
        return `Token yetarli emas — sizda ${balance}, kerak ${needed}`;
      }
      if (parsed?.name === 'ERC20InsufficientAllowance') {
        return "Ruxsat yetarli emas — qayta urinib ko'ring";
      }
      if (parsed?.name) {
        return ERROR_MESSAGES[parsed.name] || `Kontrakt xatosi: ${parsed.name}`;
      }
    } catch { /* keyingisini sinaymiz */ }
  }

  for (const [name, msg] of Object.entries(ERROR_MESSAGES)) {
    if (rawMsg.includes(name.toLowerCase())) return msg;
  }

  return e?.reason || e?.shortMessage || "Noma'lum xatolik yuz berdi — birozdan keyin qayta urinib ko'ring";
}

const RPC        = 'https://rpc.ankr.com/arbitrum/e531710028d0852baae1e1de9993017d4025b2d30d21d0ac5f812150724416b5';
const RPC_BACKUP = 'https://arb1.arbitrum.io/rpc';

async function getReadProvider() {
  try {
    const p = new ethers.JsonRpcProvider(RPC, undefined, { batchMaxCount: 1 });
    await p.getBlockNumber();
    return p;
  } catch {
    return new ethers.JsonRpcProvider(RPC_BACKUP, undefined, { batchMaxCount: 1 });
  }
}

function withWalletTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message || "Wallet javob bermadi")), ms)),
  ]);
}
function withProgressToast(promise, toastId, stages) {
  const timers = stages.map(([ms, msg]) => setTimeout(() => toast.loading(msg, { id: toastId }), ms));
  return promise.finally(() => timers.forEach(clearTimeout));
}
const WALLET_STAGES = [
  [8000, "MetaMask'da tasdiqlashni kuting..."],
  [20000, "Sekin tarmoq — MetaMask'ni oching va tasdiqlang"],
  [45000, "Hali kutilmoqda. MetaMask ilovasini qayta oching."],
];
const CHAIN_STAGES = [
  [10000, "Blockchain'da tasdiqlanmoqda..."],
  [40000, "Hali kutilmoqda — Arbitrum tarmog'i band bo'lishi mumkin"],
];

async function ensureDexApproval(tokenKey, signer, account, amountRaw, openWalletForRequest) {
  const token = new ethers.Contract(TOKEN_ADDRESSES[tokenKey], ERC20_ABI, signer);
  const allowance = await token.allowance(account, DEX_ADDRESS);
  if (allowance >= amountRaw) return;

  const tid = toast.loading(`${tokenKey} uchun ruxsat so'ralmoqda...`);
  try {
    openWalletForRequest();
    const tx = await withWalletTimeout(
      token.approve(DEX_ADDRESS, ethers.MaxUint256),
      90000,
      `${tokenKey} approval oynasi chiqmadi yoki wallet javob bermadi`
    );
    await withWalletTimeout(tx.wait(), 90000, `${tokenKey} approval tasdiqlanmadi`);
    toast.success(`${tokenKey} ruxsat berildi`, { id: tid });
  } catch (e) {
    console.error('approval error:', e);
    toast.error(translateContractError(e, TOKEN_DECIMALS[tokenKey]), { id: tid });
    throw e;
  }
}

// toPrecision() silently switches to exponential notation for very small
// numbers (e.g. "3.6e-7" for a small WBTC amount) - this rebuilds the
// same significant-figure rounding using toFixed() instead, which never
// produces exponential notation, so small token amounts always show as
// plain decimals like "0.00000036".
function fmt(raw, decimals, sigFigs = 4) {
  if (raw === null || raw === undefined) return '—';
  const num = parseFloat(ethers.formatUnits(raw, decimals));
  if (!isFinite(num)) return '—';
  if (num === 0) return '0';

  const abs = Math.abs(num);
  let str;
  if (abs >= 1) {
    str = num.toPrecision(sigFigs);
    if (str.includes('e') || str.includes('E')) str = num.toFixed(0);
  } else {
    const leadingZeros = Math.ceil(-Math.log10(abs));
    const places = Math.min(leadingZeros + sigFigs, 18);
    str = num.toFixed(places);
  }
  return str.replace(/\.?0+$/, '').replace(/\.$/, '');
}

// Hardcoded rather than toLocaleDateString('uz-UZ', ...): this runtime's
// locale data doesn't have proper Uzbek month abbreviations, so that
// approach silently fell back to "M08" instead of "avgust". Spelling the
// months out here guarantees correct output regardless of the browser's
// locale-data completeness.
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
function fmtDate(unixSeconds) {
  if (!unixSeconds || unixSeconds === 0n) return '—';
  const d = new Date(Number(unixSeconds) * 1000);
  return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STATUS_LABELS = ['Ochiq', "To'langan", 'Likvidatsiya qilingan'];

export default function DexPositions() {
  const { account, signer, isCorrectNetwork, ensureCorrectChain, openWalletForRequest, refreshBalances } = useWeb3();

  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [checkpointing, setCheckpointing] = useState(false);
  const [oracleReady, setOracleReady] = useState(true);
  // Swap tugmalari yonida taxminiy natijani ko'rsatish uchun — load()
  // ichida bir marta o'qiladi, har bosishda qayta so'ralmaydi.
  const [durPrice, setDurPrice] = useState(null);
  const [wbtcPrice, setWbtcPrice] = useState(null);
  const [wethPrice, setWethPrice] = useState(null);

  // ── Pozitsiyalarni yuklash: to'g'ridan-to'g'ri kontraktdan, bitta
  //    sahifalab qaytaradigan chaqiruv orqali. Voqea-skanerlash yo'q.
  const load = useCallback(async () => {
    if (!account) { setPositions([]); setLoading(false); return; }
    setLoading(true);
    try {
      const provider = await getReadProvider();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, provider);

      const ready = await dex.isSafePriceAvailable();
      setOracleReady(ready);

      // Swap tugmalari uchun taxminiy narxlar — har biri mustaqil,
      // biri muvaffaqiyatsiz bo'lsa boshqalariga (yoki pozitsiyalarni
      // yuklashga) ta'sir qilmaydi.
      if (ready) {
        dex.getSafeDurPrice().then(setDurPrice).catch(() => setDurPrice(null));
      } else {
        setDurPrice(null);
      }
      dex.getTokenPriceUSDC(TOKEN_WBTC).then(setWbtcPrice).catch(() => setWbtcPrice(null));
      dex.getTokenPriceUSDC(TOKEN_WETH).then(setWethPrice).catch(() => setWethPrice(null));

      const total = await dex.totalPositionsByBuyer(account);
      const [rawPositions, ids] = await dex.getPositionsByBuyer(account, 0, total);

      const loaded = await Promise.all(
        rawPositions.map(async (p, i) => {
          const id = ids[i];

          let liquidatable = false;
          try { liquidatable = await dex.isLiquidatable(id); } catch { /* e'tiborsiz */ }
          let floor = null, threshold = null, value = null, withdrawable = null;
          try {
            [floor, threshold, value, withdrawable] = await Promise.all([
              dex.requiredFloor(id),
              dex.liquidationThreshold(id),
              dex.currentValue(id),
              dex.withdrawableMargin(id),
            ]);
          } catch { /* narx manbai vaqtincha mavjud bo'lmasligi mumkin */ }

          return {
            id,
            buyer: p.buyer,
            seller: p.seller,
            priceUSDC: p.priceUSDC,
            durAmount: p.durAmount,
            dueDate: p.dueDate,
            collateralTokenId: Number(p.collateralTokenId),
            collateralAmount: p.collateralAmount,
            bufferBps: p.bufferBps,
            status: Number(p.status),
            liquidatable,
            floor, threshold, value, withdrawable,
          };
        })
      );

      setPositions(loaded.sort((a, b) => Number(b.id - a.id)));
    } catch (e) {
      console.error('load positions error:', e);
      const rawMsg = e?.reason || e?.shortMessage || e?.info?.error?.message || e?.message || "Noma'lum";
      toast.error(`Yuklashda xato: ${rawMsg}`, { duration: 10000 });
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  // MUHIM: MetaMask ba'zan ketma-ket ikkita so'rovni bitta funksiya
  // ichida yashirin navbatga qo'yadi — checkpoint() shuning uchun
  // o'zining aniq tugma bosishiga bog'liq, boshqa amaldan mustaqil.
  const handleCheckpoint = async () => {
    setCheckpointing(true);
    const tid = toast.loading('Narx yangilanmoqda...');
    try {
      await ensureCorrectChain();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withWalletTimeout(dex.checkpoint(), 90000, "MetaMask ochilmadi yoki wallet javob bermadi");
      await withWalletTimeout(tx.wait(), 90000, 'Checkpoint tasdiqlanmadi');

      let confirmed = false;
      for (let i = 1; i <= 15; i++) {
        toast.loading(`Tasdiqlanmoqda... (${i * 2}s)`, { id: tid });
        await sleep(2000);
        try {
          const readDex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, await getReadProvider());
          if (await readDex.isSafePriceAvailable()) { confirmed = true; break; }
        } catch { /* keyingi urinishda qayta tekshiriladi */ }
      }
      toast.success(confirmed ? 'Narx yangilandi!' : "Tasdiqlandi — ro'yxat tez orada o'zi yangilanadi", { id: tid });
      load();
    } catch (e) {
      console.error('checkpoint error:', e);
      toast.error(translateContractError(e), { id: tid });
    } finally {
      setCheckpointing(false);
    }
  };

  function reportTxError(e, tid, decimalsHint) {
    console.error('position action error:', e);
    toast.error(translateContractError(e, decimalsHint), { id: tid });
  }

  const handleAddMargin = async (position, amountStr) => {
    const decimals = tokenDecimalsFor(position.collateralTokenId);
    const tokenKey = tokenKeyFor(position.collateralTokenId);
    let amountRaw;
    try { amountRaw = ethers.parseUnits(amountStr, decimals); } catch { toast.error("Noto'g'ri miqdor"); return; }
    if (amountRaw <= 0n) { toast.error("Miqdor 0 dan katta bo'lishi kerak"); return; }

    setActionLoading(position.id.toString() + '-add');
    const tid = toast.loading('Tekshirilmoqda...');
    try {
      await ensureCorrectChain();
      const token = new ethers.Contract(TOKEN_ADDRESSES[tokenKey], ERC20_ABI, signer);
      const balance = await token.balanceOf(account);
      if (balance < amountRaw) {
        toast.error(`${tokenKey} yetarli emas — sizda ${fmt(balance, decimals)}, kerak ${fmt(amountRaw, decimals)}`, { id: tid });
        return;
      }

      await ensureDexApproval(tokenKey, signer, account, amountRaw, openWalletForRequest);
      toast.loading('Garov qo\'shilmoqda...', { id: tid });

      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withProgressToast(
        withWalletTimeout(dex.addMargin(position.id, amountRaw), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
        tid, WALLET_STAGES
      );
      await withProgressToast(withWalletTimeout(tx.wait(), 180000, "Tranzaksiya juda uzoq tasdiqlanmoqda"), tid, CHAIN_STAGES);

      toast.success('Garov qo\'shildi!', { id: tid });
      refreshBalances();
      load();
    } catch (e) {
      reportTxError(e, tid, decimals);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMargin = async (position, amountStr) => {
    const decimals = tokenDecimalsFor(position.collateralTokenId);
    let amountRaw;
    try { amountRaw = ethers.parseUnits(amountStr, decimals); } catch { toast.error("Noto'g'ri miqdor"); return; }
    if (amountRaw <= 0n) { toast.error("Miqdor 0 dan katta bo'lishi kerak"); return; }
    if (position.withdrawable !== null && amountRaw > position.withdrawable) {
      toast.error(`Maksimal olib qo'yish mumkin: ${fmt(position.withdrawable, decimals)}`);
      return;
    }

    setActionLoading(position.id.toString() + '-remove');
    const tid = toast.loading("Garov olib qo'yilmoqda...");
    try {
      await ensureCorrectChain();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withProgressToast(
        withWalletTimeout(dex.removeMargin(position.id, amountRaw), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
        tid, WALLET_STAGES
      );
      await withProgressToast(withWalletTimeout(tx.wait(), 180000, "Tranzaksiya juda uzoq tasdiqlanmoqda"), tid, CHAIN_STAGES);

      toast.success("Garov olib qo'yildi!", { id: tid });
      refreshBalances();
      load();
    } catch (e) {
      reportTxError(e, tid, decimals);
    } finally {
      setActionLoading(null);
    }
  };

  // minUsdcOut/minAmountOut sifatida 0 uzatiladi — kontraktning o'zi
  // (oracle floor + sog'liq tekshiruvi) himoya qiladi, frontend qayta
  // hisoblashi shart emas. Lekin DUR swap uchun narx FRESH bo'lishi kerak.
  const handleSwapDurToUsdc = async (position) => {
    if (!oracleReady) { toast.error("Avval 'Narxni yangilash' tugmasini bosing"); return; }
    setActionLoading(position.id.toString() + '-swapdur');
    const tid = toast.loading('DUR swap qilinmoqda...');
    try {
      await ensureCorrectChain();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withProgressToast(
        withWalletTimeout(dex.swapDurToUsdc(position.id, 0), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
        tid, WALLET_STAGES
      );
      await withProgressToast(withWalletTimeout(tx.wait(), 180000, "Tranzaksiya juda uzoq tasdiqlanmoqda"), tid, CHAIN_STAGES);

      toast.success('DUR muvaffaqiyatli swap qilindi!', { id: tid });
      load();
    } catch (e) {
      reportTxError(e, tid);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSwapCollateral = async (position, targetTokenId) => {
    setActionLoading(position.id.toString() + '-swapcoll');
    const tid = toast.loading('Garov swap qilinmoqda...');
    try {
      await ensureCorrectChain();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withProgressToast(
        withWalletTimeout(dex.swapCollateralToToken(position.id, targetTokenId, 0), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
        tid, WALLET_STAGES
      );
      await withProgressToast(withWalletTimeout(tx.wait(), 180000, "Tranzaksiya juda uzoq tasdiqlanmoqda"), tid, CHAIN_STAGES);

      toast.success(`Garov ${tokenSymbolFor(targetTokenId)}'ga aylantirildi!`, { id: tid });
      load();
    } catch (e) {
      reportTxError(e, tid);
    } finally {
      setActionLoading(null);
    }
  };

  // Teskari yo'nalish: WBTC/WETH -> USDC. To'g'ridan-to'g'ri WBTC<->WETH
  // yo'q — agar boshqa tokenga o'tish kerak bo'lsa, avval shu orqali
  // USDC'ga qaytib, keyin handleSwapCollateral bilan davom etiladi.
  const handleSwapCollateralToUsdc = async (position) => {
    setActionLoading(position.id.toString() + '-swapback');
    const tid = toast.loading("USDC'ga qaytarilmoqda...");
    try {
      await ensureCorrectChain();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withProgressToast(
        withWalletTimeout(dex.swapCollateralToUsdc(position.id, 0), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
        tid, WALLET_STAGES
      );
      await withProgressToast(withWalletTimeout(tx.wait(), 180000, "Tranzaksiya juda uzoq tasdiqlanmoqda"), tid, CHAIN_STAGES);

      toast.success("Garov USDC'ga qaytarildi!", { id: tid });
      load();
    } catch (e) {
      reportTxError(e, tid);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRepay = async (position) => {
    setActionLoading(position.id.toString() + '-repay');
    const tid = toast.loading('Tekshirilmoqda...');
    try {
      await ensureCorrectChain();
      const usdc = new ethers.Contract(TOKEN_ADDRESSES.USDC, ERC20_ABI, signer);
      const balance = await usdc.balanceOf(account);
      if (balance < position.priceUSDC) {
        toast.error(`USDC yetarli emas — sizda ${fmt(balance, TOKEN_DECIMALS.USDC)}, kerak ${fmt(position.priceUSDC, TOKEN_DECIMALS.USDC)}`, { id: tid });
        return;
      }

      await ensureDexApproval('USDC', signer, account, position.priceUSDC, openWalletForRequest);
      toast.loading("To'lanmoqda...", { id: tid });

      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withProgressToast(
        withWalletTimeout(dex.repay(position.id), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
        tid, WALLET_STAGES
      );
      await withProgressToast(withWalletTimeout(tx.wait(), 180000, "Tranzaksiya juda uzoq tasdiqlanmoqda"), tid, CHAIN_STAGES);

      toast.success("To'lov amalga oshirildi! Garov qaytarildi.", { id: tid });
      refreshBalances();
      load();
    } catch (e) {
      reportTxError(e, tid);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLiquidate = async (position) => {
    setActionLoading(position.id.toString() + '-liquidate');
    const tid = toast.loading('Likvidatsiya qilinmoqda...');
    try {
      await ensureCorrectChain();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withProgressToast(
        withWalletTimeout(dex.liquidate(position.id), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
        tid, WALLET_STAGES
      );
      await withProgressToast(withWalletTimeout(tx.wait(), 180000, "Tranzaksiya juda uzoq tasdiqlanmoqda"), tid, CHAIN_STAGES);

      toast.success('Likvidatsiya bajarildi!', { id: tid });
      refreshBalances();
      load();
    } catch (e) {
      reportTxError(e, tid);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}>P2P Market — pozitsiyalarim</h2>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
        Ochiq pozitsiyalaringizni boshqaring — garov qo'shing, swap qiling yoki to'lang.
      </p>

      {!oracleReady && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16, borderColor: 'var(--warning)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18} color="var(--warning)" />
            <span style={{ fontSize: 13 }}>Narx eskirgan — DUR swap qilishdan oldin yangilash kerak.</span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleCheckpoint} disabled={checkpointing}>
            {checkpointing ? <Loader2 className="spin" size={14} /> : 'Narxni yangilash'}
          </button>
        </div>
      )}

      {loading && positions.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
      )}
      {!loading && positions.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
          Hozircha pozitsiyalaringiz yo'q. Bir e'lonni tasdiqlagach, shu yerda paydo bo'ladi.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {positions.filter((p) => p.status === 0).map((p) => {
          const idStr = p.id.toString();
          const isExpanded = expandedId === idStr;
          const collSymbol = tokenSymbolFor(p.collateralTokenId);
          const collDecimals = tokenDecimalsFor(p.collateralTokenId);
          const isOpen = p.status === 0;
          const overdue = isOpen && Date.now() / 1000 > Number(p.dueDate);

          let healthColor = 'var(--success)';
          let healthLabel = 'Sog\'lom';
          if (!isOpen) { healthColor = 'var(--text-muted)'; healthLabel = STATUS_LABELS[p.status]; }
          else if (p.liquidatable) { healthColor = 'var(--danger)'; healthLabel = overdue ? 'Muddati o\'tgan' : 'Likvidatsiya xavfi'; }
          else if (overdue) { healthColor = 'var(--danger)'; healthLabel = 'Muddati o\'tgan'; }
          else if (p.value !== null && p.threshold !== null && p.floor !== null) {
            const buffer = p.value - p.threshold;
            const range = p.floor - p.threshold;
            if (range > 0n && buffer * 100n / range < 25n) { healthColor = 'var(--warning)'; healthLabel = 'Ehtiyot bo\'ling'; }
          }

          return (
            <div key={idStr} className="card">
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpandedId(isExpanded ? null : idStr)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mono" style={{ color: 'var(--accent-bright)', fontWeight: 700 }}>#{idStr}</span>
                  <span className="badge" style={{ fontSize: 11, background: `${healthColor}22`, color: healthColor, border: `1px solid ${healthColor}` }}>
                    {healthLabel}
                  </span>
                  <span style={{ fontSize: 13 }}>
                    Qarz: <b>{fmt(p.priceUSDC, TOKEN_DECIMALS.USDC)} USDC</b>
                  </span>
                </div>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {isExpanded && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Muddat: {fmtDate(p.dueDate)} {overdue && isOpen && <span style={{ color: 'var(--danger)' }}>(o'tib ketgan)</span>}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    Garov: <b>{fmt(p.collateralAmount, collDecimals)} {collSymbol}</b>
                    {p.durAmount > 0n && <> · Swap qilinmagan DUR: <b>{fmt(p.durAmount, TOKEN_DECIMALS.DUR)} DUR</b></>}
                  </div>
                  {p.floor !== null && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Talab qilinadigan minimal: {fmt(p.floor, TOKEN_DECIMALS.USDC)} USDC · Likvidatsiya chegarasi: {fmt(p.threshold, TOKEN_DECIMALS.USDC)} USDC
                    </div>
                  )}

                  {isOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                      {p.durAmount > 0n && (
                        <div>
                          <button className="btn btn-outline btn-sm" style={{ width: '100%' }} disabled={actionLoading === idStr + '-swapdur' || !oracleReady} onClick={() => handleSwapDurToUsdc(p)}>
                            <ArrowRightLeft size={14} /> DUR'ni USDC'ga swap qilish
                          </button>
                          {durPrice !== null && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>
                              Taxminan: ~{fmt((p.durAmount * durPrice) / (10n ** 18n), TOKEN_DECIMALS.USDC)} USDC
                            </div>
                          )}
                        </div>
                      )}
                      {p.durAmount === 0n && p.collateralTokenId === TOKEN_USDC && (
                        <div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-outline btn-sm" style={{ flex: 1 }} disabled={actionLoading === idStr + '-swapcoll'} onClick={() => handleSwapCollateral(p, TOKEN_WBTC)}>
                              → WBTC
                            </button>
                            <button className="btn btn-outline btn-sm" style={{ flex: 1 }} disabled={actionLoading === idStr + '-swapcoll'} onClick={() => handleSwapCollateral(p, TOKEN_WETH)}>
                              → WETH
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <div style={{ flex: 1, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                              {wbtcPrice !== null ? `~${fmt((p.collateralAmount * (10n ** 8n)) / wbtcPrice, TOKEN_DECIMALS.WBTC)} WBTC` : ''}
                            </div>
                            <div style={{ flex: 1, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                              {wethPrice !== null ? `~${fmt((p.collateralAmount * (10n ** 18n)) / wethPrice, TOKEN_DECIMALS.WETH)} WETH` : ''}
                            </div>
                          </div>
                        </div>
                      )}
                      {p.durAmount === 0n && p.collateralTokenId !== TOKEN_USDC && (
                        <div>
                          <button className="btn btn-outline btn-sm" style={{ width: '100%' }} disabled={actionLoading === idStr + '-swapback'} onClick={() => handleSwapCollateralToUsdc(p)}>
                            <ArrowRightLeft size={14} /> {collSymbol}'ni USDC'ga qaytarish
                          </button>
                          {p.collateralTokenId === TOKEN_WBTC && wbtcPrice !== null && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>
                              Taxminan: ~{fmt((p.collateralAmount * wbtcPrice) / (10n ** 8n), TOKEN_DECIMALS.USDC)} USDC
                            </div>
                          )}
                          {p.collateralTokenId === TOKEN_WETH && wethPrice !== null && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>
                              Taxminan: ~{fmt((p.collateralAmount * wethPrice) / (10n ** 18n), TOKEN_DECIMALS.USDC)} USDC
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>
                            Boshqa tokenga o'tish uchun: avval USDC'ga qaytaring, keyin qayta swap qiling
                          </div>
                        </div>
                      )}

                      <MarginRow
                        label={`Garov qo'shish (${collSymbol})`}
                        icon={<PlusCircle size={14} />}
                        onSubmit={(amt) => handleAddMargin(p, amt)}
                        disabled={actionLoading === idStr + '-add'}
                      />
                      {p.withdrawable !== null && p.withdrawable > 0n && (
                        <MarginRow
                          label={`Garov olib qo'yish (max ${fmt(p.withdrawable, collDecimals)} ${collSymbol})`}
                          icon={<MinusCircle size={14} />}
                          onSubmit={(amt) => handleRemoveMargin(p, amt)}
                          disabled={actionLoading === idStr + '-remove'}
                        />
                      )}

                      <button className="btn btn-primary btn-sm" disabled={actionLoading === idStr + '-repay'} onClick={() => handleRepay(p)}>
                        <CheckCircle2 size={14} /> To'lash ({fmt(p.priceUSDC, TOKEN_DECIMALS.USDC)} USDC)
                      </button>

                      {p.liquidatable && (
                        <button className="btn btn-sm" style={{ background: 'var(--danger)', color: '#fff' }} disabled={actionLoading === idStr + '-liquidate'} onClick={() => handleLiquidate(p)}>
                          <AlertTriangle size={14} /> Likvidatsiya qilish (1% mukofot)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!account && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16 }}>
          Pozitsiyalaringizni ko'rish uchun hamyonni ulang
        </div>
      )}
    </div>
  );
}

// Kichik yordamchi komponent: miqdor kiritish + tasdiqlash tugmasi, har
// safar takrorlanmasligi uchun addMargin/removeMargin ikkalasida ham
// ishlatiladi.
function MarginRow({ label, icon, onSubmit, disabled }) {
  const [value, setValue] = useState('');
  return (
    <div>
      <label className="input-label" style={{ fontSize: 12 }}>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" type="number" min="0" placeholder="0.0" value={value} onChange={(e) => setValue(e.target.value)} style={{ flex: 1 }} />
        <button
          className="btn btn-outline btn-sm"
          disabled={disabled || !value || parseFloat(value) <= 0}
          onClick={() => { onSubmit(value); setValue(''); }}
        >
          {icon}
        </button>
      </div>
    </div>
  );
}
