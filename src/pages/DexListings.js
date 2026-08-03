import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { useWeb3 } from '../hooks/useWeb3';
import { TOKEN_ADDRESSES, TOKEN_DECIMALS, ERC20_ABI } from '../abi/contract';
import { Tag, ShoppingCart, RefreshCw, X, AlertCircle, Loader2 } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════
//  E'lonlarni ko'rish + tasdiqlash — Dex.js (E'lon yaratish) bilan bir
//  xil sahifa, shu bilan bog'liq. Har bir sahifa o'zining manzil/ABI/
//  yordamchi funksiyalarini o'zida saqlaydi (Vault.js/Dex.js naqshi).
// ══════════════════════════════════════════════════════════════════════

const DEX_ADDRESS = '0xcCD9825260728c29169171a415A34c113484Aa6C';

const DEX_ABI = [
  'function getPendingListings(uint256 offset, uint256 limit) external view returns (tuple(address seller, uint256 durAmount, uint256 priceUSDC, uint256 paymentPeriodDays, uint8 status)[] result, uint256[] ids)',
  'function getPendingBuyOffers(uint256 offset, uint256 limit) external view returns (tuple(address buyer, uint256 durAmount, uint256 priceUSDC, uint256 paymentPeriodDays, uint256 garov, uint8 status)[] result, uint256[] ids)',
  'function totalPendingListings() external view returns (uint256)',
  'function totalPendingBuyOffers() external view returns (uint256)',
  'function previewGarov(uint256 listingId) external view returns (uint256)',
  'function approveListing(uint256 listingId) external returns (uint256 positionId)',
  'function fulfillBuyOffer(uint256 offerId) external returns (uint256 positionId)',
  'function cancelListing(uint256 listingId) external',
  'function cancelBuyOffer(uint256 offerId) external',
  'function checkpoint() external',
  'function isSafePriceAvailable() external view returns (bool)',
  // Kontraktning BARCHA maxsus xatolari — buni to'liq qo'shmasak, ethers
  // revert sababini "unknown custom error" deb chiqaradi, chunki uni qaysi
  // ABI orqali dekod qilishni bilmaydi.
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
  // DUR/USDC tokenlarining o'z xatolari — bular ListingMarket emas,
  // ERC20 tokenning o'zidan keladi (masalan balans yetmasa), lekin
  // ular ham shu tranzaksiya ichida ro'y berishi mumkin.
  'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)',
  'error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)',
];

// Har bir xato nomi uchun tushunarli o'zbekcha xabar. Kontrakt qaysi
// sababdan revert bo'lgani aniq ma'lum bo'lganda, foydalanuvchi nima
// qilish kerakligini tushunadi — xom "unknown custom error" o'rniga.
const ERROR_MESSAGES = {
  CannotApproveOwnListing: "O'zingiz joylagan e'lon/taklifni o'zingiz bajara olmaysiz — buni faqat boshqa hamyon amalga oshirishi mumkin",
  ListingNotPending: "Bu e'lon/taklif allaqachon tasdiqlangan yoki bekor qilingan",
  NoCheckpointYet: "Oracle hali umuman ishga tushirilmagan",
  CheckpointStale: 'Narx eskirgan — avval "Narxni yangilash" tugmasini bosing',
  CheckpointGapNotElapsed: 'Checkpointlar orasida yetarli vaqt o\'tmagan',
  CheckpointTooSoon: "Hali erta — bir necha soniyadan keyin qayta urinib ko'ring",
  CheckpointDeviationExceeded: "Narx juda keskin o'zgardi — birozdan keyin qayta urinib ko'ring",
  PriceTooHigh: 'Narx tannarxdan +10%dan oshib ketgan',
  BadListingParams: "Miqdor yoki narx noto'g'ri kiritilgan",
  BadPeriod: "To'lov muddati 1-30 kun oralig'ida bo'lishi kerak",
  InsufficientCollateral: 'Garov yetarli emas',
  BelowRequiredFloor: 'Bu miqdorni olib qo\'yish pozitsiyani xavfli holatga tashlaydi',
  SwapWouldLeaveLiquidatable: 'Bu swap pozitsiyani darhol likvidatsiyaga tashlab yuboradi — avval garov qo\'shing',
  NothingToSwap: "Swap qilish uchun DUR qolmagan",
  MustSwapDurFirst: 'Avval DUR\'ni USDC\'ga swap qilish kerak',
  AlreadySwapped: 'Garov allaqachon boshqa tokenga aylantirilgan',
  PositionNotFound: 'Bunday pozitsiya topilmadi',
  PositionNotOpen: 'Bu pozitsiya endi ochiq emas',
  NotBuyer: "Bu amalni faqat pozitsiya xaridori bajara oladi",
  NotSeller: "Bu amalni faqat e'lon egasi bajara oladi",
  NotLiquidatable: 'Bu pozitsiya hali likvidatsiya qilinishi mumkin emas',
  ZeroAmount: "Miqdor 0 bo'lishi mumkin emas",
  BadTokenId: "Noto'g'ri token tanlandi",
  PoolEmpty: "Uniswap pool bo'sh yoki ishga tushirilmagan",
  SequencerDown: "Arbitrum sequencer vaqtincha ishlamayapti — birozdan keyin urinib ko'ring",
  SequencerGracePeriod: "Sequencer yaqinda tiklandi — bir necha daqiqa kutish kerak",
  SequencerFeedDead: 'Sequencer holatini tekshirib bo\'lmadi',
  BadChainlinkPrice: "Narx manbasidan noto'g'ri ma'lumot keldi",
  StaleChainlinkPrice: 'Narx manbasi eskirgan',
  StaleChainlinkRound: "Narx manbasi to'liq yangilanmagan",
  ChainlinkPriceUnderflow: "Narx hisoblashda xato",
  NoPriceAvailable: "Hech qanday narx manbai topilmadi",
  NotPoolManager: "Ruxsatsiz chaqiruv",
  TooLittleReceived: "Swap natijasi kutilgandan kam — slippage juda yuqori",
};

// Xato dekodlash uchun alohida Interface — kontrakt instance kerak emas,
// bu sof, tarmoqqa bog'liq bo'lmagan operatsiya.
const DEX_INTERFACE = new ethers.Interface(DEX_ABI);

/// Kontraktdan qaytgan xato ma'lumotini (mavjud bo'lsa) dekod qilib,
/// tushunarli o'zbekcha xabarga aylantiradi. Avval MetaMask'da rad
/// etilgan/bekor qilingan holatlarni ushlaydi, keyin DEX_INTERFACE orqali
/// xatoning aniq nomini o'qiydi (turli joylarda — e.data, e.info.error.data
/// va h.k. — saqlanishi mumkinligi uchun bir nechta joydan qidiradi).
function translateContractError(e) {
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
        const balance = ethers.formatUnits(parsed.args.balance, TOKEN_DECIMALS.DUR);
        const needed = ethers.formatUnits(parsed.args.needed, TOKEN_DECIMALS.DUR);
        return `DUR yetarli emas — sizda ${balance}, kerak ${needed}`;
      }
      if (parsed?.name === 'ERC20InsufficientAllowance') {
        return "Ruxsat yetarli emas — qayta urinib ko'ring (approve avtomatik so'raladi)";
      }
      if (parsed?.name) {
        return ERROR_MESSAGES[parsed.name] || `Kontrakt xatosi: ${parsed.name}`;
      }
    } catch { /* bu joydan dekod bo'lmadi, keyingisini sinaymiz */ }
  }

  // Nomi ma'lum bo'lmasa ham, matn ichida xato nomi ko'rinib turgan
  // hollar uchun (ba'zi walletlar/RPC'lar shu tarzda qaytaradi) —
  // lug'atdagi har bir nomni matn ichidan qidiramiz.
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
    toast.error(translateContractError(e), { id: tid });
    throw e;
  }
}

function shortAddr(a) {
  if (!a) return '';
  return a.slice(0, 6) + '...' + a.slice(-4);
}
function fmt(raw, decimals, sigFigs = 4) {
  if (raw === null || raw === undefined) return '—';
  const num = parseFloat(ethers.formatUnits(raw, decimals));
  if (!isFinite(num)) return '—';
  if (num === 0) return '0';
  return num.toPrecision(sigFigs).replace(/\.?0+$/, '').replace(/\.$/, '');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGE_SIZE = 20;

export default function DexListings() {
  const { account, signer, isCorrectNetwork, ensureCorrectChain, openWalletForRequest, refreshBalances } = useWeb3();

  const [tab, setTab] = useState('listings'); // 'listings' | 'offers'
  const [listings, setListings] = useState([]); // [{ id, seller, durAmount, priceUSDC, paymentPeriodDays, garovRaw }]
  const [offers, setOffers] = useState([]);     // [{ id, buyer, durAmount, priceUSDC, paymentPeriodDays, garov }]
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // id currently acting on
  const [oracleReady, setOracleReady] = useState(true); // birinchi load tugagach aniqlashadi
  const [checkpointing, setCheckpointing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const provider = await getReadProvider();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, provider);

      const ready = await dex.isSafePriceAvailable();
      setOracleReady(ready);

      const [listingsRes, offersRes] = await Promise.all([
        dex.getPendingListings(0, PAGE_SIZE),
        dex.getPendingBuyOffers(0, PAGE_SIZE),
      ]);

      // previewGarov requires a per-listing call (garov moves with the
      // oracle price), so it's fetched alongside each listing rather than
      // being part of the struct itself. Buy offers already carry a
      // fixed garov (escrowed at posting), so no extra call is needed.
      const [result, ids] = listingsRes;
      const withGarov = await Promise.all(
        result.map(async (l, i) => {
          let garovRaw = null;
          try { garovRaw = await dex.previewGarov(ids[i]); } catch { /* oracle not ready */ }
          return {
            id: ids[i],
            seller: l.seller,
            durAmount: l.durAmount,
            priceUSDC: l.priceUSDC,
            paymentPeriodDays: l.paymentPeriodDays,
            garovRaw,
          };
        })
      );
      setListings(withGarov.reverse()); // eng yangisi tepada

      const [oResult, oIds] = offersRes;
      setOffers(
        oResult
          .map((o, i) => ({
            id: oIds[i],
            buyer: o.buyer,
            durAmount: o.durAmount,
            priceUSDC: o.priceUSDC,
            paymentPeriodDays: o.paymentPeriodDays,
            garov: o.garov,
          }))
          .reverse()
      );
    } catch (e) {
      console.error('load pending error:', e);
      toast.error("E'lonlarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  // MUHIM: MetaMask ba'zan ketma-ket ikkita so'rovni (bitta JS funksiyasi
  // ichida, orada YANGI bosish bo'lmasa) yashirin navbatga qo'yib, ikkinchi
  // oynani avtomatik ochmaydi. Shuning uchun checkpoint() Dex.js'dagi kabi
  // o'zining aniq tugma bosishiga bog'liq — approveListing'dan mustaqil.
  const handleCheckpoint = async () => {
    setCheckpointing(true);
    const tid = toast.loading("Narx yangilanmoqda...");
    try {
      await ensureCorrectChain();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withWalletTimeout(dex.checkpoint(), 90000, "MetaMask ochilmadi yoki wallet javob bermadi");
      await withWalletTimeout(tx.wait(), 90000, "Checkpoint tasdiqlanmadi");

      // Xuddi Dex.js'dagi kabi: o'qish uchun ishlatiladigan RPC (Ankr/
      // public) MetaMask yuborgan tugundan farqli bo'lgani uchun yangi
      // blokni bir necha soniya kechikib ko'rishi mumkin. Bitta tekshirish
      // o'rniga HAQIQATAN tasdiqlanguncha qayta-qayta tekshiramiz.
      let confirmed = false;
      for (let i = 1; i <= 15; i++) {
        toast.loading(`Tasdiqlanmoqda... (${i * 2}s)`, { id: tid });
        await sleep(2000);
        try {
          const readDex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, await getReadProvider());
          if (await readDex.isSafePriceAvailable()) { confirmed = true; break; }
        } catch { /* keyingi urinishda qayta tekshiriladi */ }
      }

      toast.success(confirmed ? "Narx yangilandi!" : "Tasdiqlandi — ro'yxat tez orada o'zi yangilanadi", { id: tid });
      load();
    } catch (e) {
      reportTxError(e, tid);
    } finally {
      setCheckpointing(false);
    }
  };

  const handleApproveListing = async (listing) => {
    if (!account) { toast.error('Avval hamyonni ulang'); return; }
    if (!oracleReady) { toast.error("Avval yuqoridagi 'Narxni yangilash' tugmasini bosing"); return; }
    setActionLoading(listing.id.toString());
    const tid = toast.loading("E'lon tasdiqlanmoqda...");
    try {
      await ensureCorrectChain();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      const garovRaw = await dex.previewGarov(listing.id);

      await ensureDexApproval('USDC', signer, account, garovRaw, openWalletForRequest);

      openWalletForRequest();
      const tx = await withProgressToast(
        withWalletTimeout(dex.approveListing(listing.id), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
        tid, WALLET_STAGES
      );
      await withProgressToast(
        withWalletTimeout(tx.wait(), 180000, "Tranzaksiya blockchain'da juda uzoq tasdiqlanmoqda"),
        tid, CHAIN_STAGES
      );

      toast.success("E'lon tasdiqlandi! Pozitsiya ochildi.", { id: tid });
      refreshBalances();
      load();
    } catch (e) {
      reportTxError(e, tid);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFulfillOffer = async (offer) => {
    if (!account) { toast.error('Avval hamyonni ulang'); return; }
    setActionLoading('offer-' + offer.id.toString());
    const tid = toast.loading('Tekshirilmoqda...');
    try {
      await ensureCorrectChain();

      // Tranzaksiya yuborishdan OLDIN balansni tekshiramiz — aks holda
      // foydalanuvchi behuda MetaMask oynasini ko'radi va tushunarsiz
      // "unknown custom error" bilan duch keladi (chunki bu DUR
      // tokenining o'zidan keladigan ERC20InsufficientBalance xatosi,
      // MetaMask uni tranzaksiya simulyatsiyasida oldindan ko'rsatadi).
      const durToken = new ethers.Contract(TOKEN_ADDRESSES.DUR, ERC20_ABI, signer);
      const balance = await durToken.balanceOf(account);
      if (balance < offer.durAmount) {
        const have = ethers.formatUnits(balance, TOKEN_DECIMALS.DUR);
        const need = ethers.formatUnits(offer.durAmount, TOKEN_DECIMALS.DUR);
        toast.error(`DUR yetarli emas — sizda ${have}, kerak ${need}`, { id: tid });
        return;
      }

      toast.loading('Taklif bajarilmoqda...', { id: tid });
      await ensureDexApproval('DUR', signer, account, offer.durAmount, openWalletForRequest);

      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withProgressToast(
        withWalletTimeout(dex.fulfillBuyOffer(offer.id), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
        tid, WALLET_STAGES
      );
      await withProgressToast(
        withWalletTimeout(tx.wait(), 180000, "Tranzaksiya blockchain'da juda uzoq tasdiqlanmoqda"),
        tid, CHAIN_STAGES
      );

      toast.success('Taklif bajarildi! Pozitsiya ochildi.', { id: tid });
      refreshBalances();
      load();
    } catch (e) {
      reportTxError(e, tid);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (kind, id) => {
    setActionLoading((kind === 'listing' ? '' : 'offer-') + id.toString());
    const tid = toast.loading('Bekor qilinmoqda...');
    try {
      await ensureCorrectChain();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withWalletTimeout(
        kind === 'listing' ? dex.cancelListing(id) : dex.cancelBuyOffer(id),
        90000, "MetaMask ochilmadi yoki wallet javob bermadi"
      );
      await withWalletTimeout(tx.wait(), 90000, 'Bekor qilish tasdiqlanmadi');
      toast.success('Bekor qilindi', { id: tid });
      refreshBalances();
      load();
    } catch (e) {
      reportTxError(e, tid);
    } finally {
      setActionLoading(null);
    }
  };

  function reportTxError(e, tid) {
    console.error('dex action error:', e);
    toast.error(translateContractError(e), { id: tid });
  }

  const items = tab === 'listings' ? listings : offers;
  const isMine = (item) => account && (tab === 'listings' ? item.seller : item.buyer)?.toLowerCase() === account.toLowerCase();

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}>DEX — e'lonlar</h2>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
        Kutilayotgan e'lonlar va takliflarni ko'ring, tasdiqlang yoki bekor qiling.
      </p>

      {!oracleReady && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16, borderColor: 'var(--warning)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={18} color="var(--warning)" />
            <span style={{ fontSize: 13 }}>Narx eskirgan — sotuv e'lonini tasdiqlashdan oldin yangilash kerak.</span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleCheckpoint} disabled={checkpointing}>
            {checkpointing ? <Loader2 className="spin" size={14} /> : 'Narxni yangilash'}
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <button
          className={`card ${tab === 'listings' ? 'card-selected' : ''}`}
          onClick={() => setTab('listings')}
          style={{ textAlign: 'left', cursor: 'pointer', border: tab === 'listings' ? '1px solid var(--accent)' : undefined }}
        >
          <Tag size={20} color="var(--dur-color)" />
          <div style={{ fontWeight: 600, marginTop: 8 }}>Sotuv e'lonlari</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{listings.length} ta kutilmoqda</div>
        </button>
        <button
          className={`card ${tab === 'offers' ? 'card-selected' : ''}`}
          onClick={() => setTab('offers')}
          style={{ textAlign: 'left', cursor: 'pointer', border: tab === 'offers' ? '1px solid var(--accent)' : undefined }}
        >
          <ShoppingCart size={20} color="var(--accent-bright)" />
          <div style={{ fontWeight: 600, marginTop: 8 }}>Xarid takliflari</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{offers.length} ta kutilmoqda</div>
        </button>
      </div>

      {loading && items.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
          Yuklanmoqda...
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
          {tab === 'listings' ? "Hozircha kutilayotgan e'lon yo'q" : "Hozircha kutilayotgan taklif yo'q"}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item) => {
          const idKey = (tab === 'listings' ? '' : 'offer-') + item.id.toString();
          const mine = isMine(item);
          const garovRaw = tab === 'listings' ? item.garovRaw : item.garov;
          return (
            <div key={idKey} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="mono" style={{ color: 'var(--accent-bright)', fontWeight: 700 }}>#{item.id.toString()}</span>
                    <span className="address mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {shortAddr(tab === 'listings' ? item.seller : item.buyer)}
                    </span>
                    {mine && (
                      <span className="badge" style={{ fontSize: 11, background: 'rgba(99,102,241,0.1)', color: 'var(--accent-bright)', border: '1px solid var(--accent)' }}>
                        Sizniki
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    <b>{fmt(item.durAmount, TOKEN_DECIMALS.DUR)} DUR</b>{' '}
                    {tab === 'listings' ? 'sotiladi' : 'sotib olinmoqchi'}
                    {' — jami narxi '}<b>{fmt(item.priceUSDC, TOKEN_DECIMALS.USDC)} USDC</b>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Muddat: {item.paymentPeriodDays.toString()} kun · Garov: {garovRaw !== null ? fmt(garovRaw, TOKEN_DECIMALS.USDC) + ' USDC' : "narxni yangilang"}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {mine ? (
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={actionLoading === idKey}
                      onClick={() => handleCancel(tab === 'listings' ? 'listing' : 'offer', item.id)}
                    >
                      <X size={14} /> Bekor qilish
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={actionLoading === idKey || (tab === 'listings' && !oracleReady)}
                      onClick={() => (tab === 'listings' ? handleApproveListing(item) : handleFulfillOffer(item))}
                    >
                      {tab === 'listings' ? <ShoppingCart size={14} /> : <Tag size={14} />}
                      {' '}{tab === 'listings' ? 'DUR sotib olish' : 'DUR sotish'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!account && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16 }}>
          Tasdiqlash yoki bekor qilish uchun hamyonni ulang
        </div>
      )}
    </div>
  );
}
