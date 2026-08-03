import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { useWeb3 } from '../hooks/useWeb3';
import { TOKEN_ADDRESSES, TOKEN_DECIMALS, ERC20_ABI, ARBITRUM_ONE } from '../abi/contract';
import { Tag, ShoppingCart, Info, AlertCircle, Loader2 } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════
//  Yangi DEX kontrakti (ListingMarket) — CreditSale'dan alohida.
//  Naqshi Vault.js bilan bir xil: manzil/ABI shu sahifaning o'zida,
//  useWeb3'dagi umumiy `contract`ga tegilmaydi (u CreditSale uchun).
// ══════════════════════════════════════════════════════════════════════

// Arbitrum One'da deploy qilingan ListingMarket manzili (tuzatilgan versiya —
// swap slippage/likvidatsiya sog'liq tekshiruvi, PositionNotFound va boshqa
// audit tuzatishlari bilan). Arbiscan'da hali verify qilinmagan — bu muammo
// emas, frontend ABI orqali to'g'ridan-to'g'ri ishlaydi.
const DEX_ADDRESS = '0xcCD9825260728c29169171a415A34c113484Aa6C';

// Faqat shu sahifaga (elon yaratish) kerak bo'lgan qism — inson o'qiy
// oladigan ABI. Boshqa bo'limlar (elonlarni ko'rish, pozitsiya boshqaruvi)
// qo'shilganda shu ro'yxatga funksiyalar qo'shiladi.
const DEX_ABI = [
  'function postListing(uint256 durAmount, uint256 priceUSDC, uint256 paymentPeriodDays) external returns (uint256 listingId)',
  'function postBuyOffer(uint256 durAmount, uint256 priceUSDC, uint256 paymentPeriodDays) external returns (uint256 offerId)',
  'function checkpoint() external',
  'function getSafeDurPrice() external view returns (uint256)',
  'function isSafePriceAvailable() external view returns (bool)',
  'function MIN_PERIOD_DAYS() external view returns (uint256)',
  'function MAX_PERIOD_DAYS() external view returns (uint256)',
  'function MAX_PREMIUM_BPS() external view returns (uint16)',
  'function DEFAULT_BUFFER_BPS() external view returns (uint16)',
  'event ListingPosted(uint256 indexed listingId, address indexed seller, uint256 durAmount, uint256 priceUSDC, uint256 paymentPeriodDays)',
  'event BuyOfferPosted(uint256 indexed offerId, address indexed buyer, uint256 durAmount, uint256 priceUSDC, uint256 paymentPeriodDays, uint256 garov)',
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
  // ERC20 tokenning o'zidan keladi (masalan balans yetmasa).
  'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)',
  'error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)',
];

// Har bir xato nomi uchun tushunarli o'zbekcha xabar.
const ERROR_MESSAGES = {
  CannotApproveOwnListing: "O'zingiz joylagan e'lon/taklifni o'zingiz bajara olmaysiz — buni faqat boshqa hamyon amalga oshirishi mumkin",
  ListingNotPending: "Bu e'lon/taklif allaqachon tasdiqlangan yoki bekor qilingan",
  NoCheckpointYet: "Oracle hali umuman ishga tushirilmagan",
  CheckpointStale: 'Narx eskirgan — avval "Narxni yangilash" tugmasini bosing',
  CheckpointGapNotElapsed: "Checkpointlar orasida yetarli vaqt o'tmagan",
  CheckpointTooSoon: "Hali erta — bir necha soniyadan keyin qayta urinib ko'ring",
  CheckpointDeviationExceeded: "Narx juda keskin o'zgardi — birozdan keyin qayta urinib ko'ring",
  PriceTooHigh: "Narx tannarxdan +10%dan oshib ketgan — narxni kamaytiring",
  BadListingParams: "Miqdor yoki narx noto'g'ri kiritilgan",
  BadPeriod: "To'lov muddati 1-30 kun oralig'ida bo'lishi kerak",
  InsufficientCollateral: 'Garov yetarli emas',
  BelowRequiredFloor: "Bu miqdorni olib qo'yish pozitsiyani xavfli holatga tashlaydi",
  SwapWouldLeaveLiquidatable: "Bu swap pozitsiyani darhol likvidatsiyaga tashlab yuboradi — avval garov qo'shing",
  NothingToSwap: 'Swap qilish uchun DUR qolmagan',
  MustSwapDurFirst: "Avval DUR'ni USDC'ga swap qilish kerak",
  AlreadySwapped: 'Garov allaqachon boshqa tokenga aylantirilgan',
  PositionNotFound: 'Bunday pozitsiya topilmadi',
  PositionNotOpen: 'Bu pozitsiya endi ochiq emas',
  NotBuyer: 'Bu amalni faqat pozitsiya xaridori bajara oladi',
  NotSeller: "Bu amalni faqat e'lon egasi bajara oladi",
  NotLiquidatable: 'Bu pozitsiya hali likvidatsiya qilinishi mumkin emas',
  ZeroAmount: "Miqdor 0 bo'lishi mumkin emas",
  BadTokenId: "Noto'g'ri token tanlandi",
  PoolEmpty: "Uniswap pool bo'sh yoki ishga tushirilmagan",
  SequencerDown: "Arbitrum sequencer vaqtincha ishlamayapti — birozdan keyin urinib ko'ring",
  SequencerGracePeriod: 'Sequencer yaqinda tiklandi — bir necha daqiqa kutish kerak',
  SequencerFeedDead: "Sequencer holatini tekshirib bo'lmadi",
  BadChainlinkPrice: "Narx manbasidan noto'g'ri ma'lumot keldi",
  StaleChainlinkPrice: 'Narx manbasi eskirgan',
  StaleChainlinkRound: "Narx manbasi to'liq yangilanmagan",
  ChainlinkPriceUnderflow: 'Narx hisoblashda xato',
  NoPriceAvailable: 'Hech qanday narx manbai topilmadi',
  NotPoolManager: 'Ruxsatsiz chaqiruv',
  TooLittleReceived: 'Swap natijasi kutilgandan kam — slippage juda yuqori',
};

// Xato dekodlash uchun alohida Interface — kontrakt instance kerak emas,
// bu sof, tarmoqqa bog'liq bo'lmagan operatsiya.
const DEX_INTERFACE = new ethers.Interface(DEX_ABI);

/// Kontraktdan qaytgan xato ma'lumotini (mavjud bo'lsa) dekod qilib,
/// tushunarli o'zbekcha xabarga aylantiradi.
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
      if (parsed?.name === 'ERC20InsufficientBalance' || parsed?.name === 'ERC20InsufficientAllowance') {
        // Qaysi token ekanini bu yerda bilmaymiz (DUR yoki USDC bo'lishi
        // mumkin) — aniq miqdorni handleSubmit'dagi oldindan tekshiruv
        // ko'rsatadi, bu yerda faqat umumiy holat aytiladi.
        return "Balans yoki ruxsat yetarli emas — qayta urinib ko'ring";
      }
      if (parsed?.name) {
        return ERROR_MESSAGES[parsed.name] || `Kontrakt xatosi: ${parsed.name}`;
      }
    } catch { /* bu joydan dekod bo'lmadi, keyingisini sinaymiz */ }
  }

  for (const [name, msg] of Object.entries(ERROR_MESSAGES)) {
    if (rawMsg.includes(name.toLowerCase())) return msg;
  }

  return e?.reason || e?.shortMessage || "Noma'lum xatolik yuz berdi — birozdan keyin qayta urinib ko'ring";
}

// Bir xil ikkilamchi RPC naqshi — Vault.js'dagi bilan bir xil manzillar,
// hamyon ulanmagan holatda ham (masalan sahifa ochilishida) narxni
// o'qiy olish uchun.
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

// CreateListing.js bilan bir xil naqsh: sekin tarmoq/wallet uchun
// bosqichma-bosqich toast xabarlari.
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

// DEX_ADDRESS uchun alohida approve — useWeb3'dagi ensureApproval
// CreditSale manziliga qattiq bog'langan, shuning uchun bu yerga
// o'zimiznikini yozamiz (xuddi Vault.js har bir joyda o'zi qilgani kabi).
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

function formatPreview(raw, decimals = 6, sigFigs = 4) {
  if (raw === null || raw === undefined) return null;
  const num = parseFloat(ethers.formatUnits(raw, decimals));
  if (!isFinite(num)) return null;
  if (num === 0) return '0';
  return num.toPrecision(sigFigs).replace(/\.?0+$/, '').replace(/\.$/, '');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function Dex() {
  const { account, signer, isCorrectNetwork, ensureCorrectChain, openWalletForRequest, refreshBalances } = useWeb3();

  const [mode, setMode] = useState('sell'); // 'sell' = postListing, 'buy' = postBuyOffer
  const [durAmount, setDurAmount] = useState('');
  const [priceUSDC, setPriceUSDC] = useState('');
  const [periodDays, setPeriodDays] = useState('7');
  const [loading, setLoading] = useState(false);

  const [fairPriceRaw, setFairPriceRaw] = useState(null); // 1e6 USDC per 1 whole DUR
  const [oracleReady, setOracleReady] = useState(null); // null = hali tekshirilmagan
  const [oracleLoading, setOracleLoading] = useState(true);

  // ── Checkpoint oracle holatini o'qish (hamyon shart emas) ─────────────
  const refreshOracle = useCallback(async () => {
    setOracleLoading(true);
    try {
      const provider = await getReadProvider();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, provider);
      const ready = await dex.isSafePriceAvailable();
      setOracleReady(ready);
      if (ready) {
        const price = await dex.getSafeDurPrice();
        setFairPriceRaw(price);
      } else {
        setFairPriceRaw(null);
      }
    } catch (e) {
      console.error('oracle read error:', e);
      setOracleReady(false);
      setFairPriceRaw(null);
    } finally {
      setOracleLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshOracle();
    const id = setInterval(refreshOracle, 30000); // 30s'da bir yangilanadi
    return () => clearInterval(id);
  }, [refreshOracle]);

  // ── Jonli hisob-kitoblar (kontraktdagi _computeGarov bilan bir xil) ────
  const preview = useMemo(() => {
    if (!fairPriceRaw || !durAmount || parseFloat(durAmount) <= 0) return null;
    try {
      const durRaw = ethers.parseUnits(durAmount, TOKEN_DECIMALS.DUR);
      const fairValueRaw = (durRaw * fairPriceRaw) / (10n ** 18n);
      const maxAllowedRaw = (fairValueRaw * 11000n) / 10000n; // +10%

      let garovRaw = null;
      let priceRaw = null;
      let overCap = false;
      if (priceUSDC && parseFloat(priceUSDC) > 0) {
        priceRaw = ethers.parseUnits(priceUSDC, TOKEN_DECIMALS.USDC);
        overCap = priceRaw > maxAllowedRaw;
        const ustamaRaw = priceRaw > fairValueRaw ? priceRaw - fairValueRaw : 0n;
        const bufferRaw = (priceRaw * 700n) / 10000n; // DEFAULT_BUFFER_BPS = 7%
        garovRaw = bufferRaw + ustamaRaw;
      }

      return { fairValueRaw, maxAllowedRaw, garovRaw, overCap };
    } catch {
      return null; // foydalanuvchi hali yozib tugatmagan bo'lishi mumkin
    }
  }, [fairPriceRaw, durAmount, priceUSDC]);

  const canSubmit = account && isCorrectNetwork && oracleReady && durAmount && priceUSDC && periodDays
    && parseFloat(durAmount) > 0 && parseFloat(priceUSDC) > 0
    && Number(periodDays) >= 1 && Number(periodDays) <= 30
    && preview && !preview.overCap && !loading;

  const [checkpointing, setCheckpointing] = useState(false);

  // MUHIM: MetaMask ba'zan ketma-ket ikkita so'rovni (bitta JS funksiyasi
  // ichida, orada YANGI bosish bo'lmasa) yashirin navbatga qo'yib,
  // ikkinchi oynani avtomatik ochmaydi. Shuning uchun checkpoint()ni
  // asosiy amaldan MUSTAQIL, o'zining aniq tugma bosishiga bog'liq holda
  // yuboramiz — har bir wallet so'rovi haqiqiy, yangi bosishdan keladi.
  const handleCheckpoint = async () => {
    setCheckpointing(true);
    const tid = toast.loading("Narx yangilanmoqda...");
    try {
      await ensureCorrectChain();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withWalletTimeout(dex.checkpoint(), 90000, "MetaMask ochilmadi yoki wallet javob bermadi");
      await withWalletTimeout(tx.wait(), 90000, "Checkpoint tasdiqlanmadi");

      // Checkpoint zanjirda muvaffaqiyatli yozildi, lekin men narxni
      // O'QISH uchun boshqa RPC (Ankr/public) ishlataman — bu MetaMask
      // yuborgan tugundan farqli bo'lgani uchun yangi blokni ko'rishi
      // bir necha soniya kechikishi mumkin. Shuning uchun bitta tekshirish
      // o'rniga, HAQIQATAN tasdiqlanguncha qayta-qayta tekshiramiz —
      // shu tufayli "E'lon joylash" tugmasi qachon yoqilishi aniq bo'ladi,
      // taxminiy kutish vaqti emas.
      let confirmed = false;
      for (let i = 1; i <= 15; i++) {
        toast.loading(`Tasdiqlanmoqda... (${i * 2}s)`, { id: tid });
        await sleep(2000);
        try {
          const readDex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, await getReadProvider());
          if (await readDex.isSafePriceAvailable()) { confirmed = true; break; }
        } catch { /* keyingi urinishda qayta tekshiriladi */ }
      }

      toast.success(confirmed ? "Narx yangilandi!" : "Tasdiqlandi — sahifa tez orada o'zi yangilanadi", { id: tid });
      refreshOracle();
    } catch (e) {
      console.error('checkpoint error:', e);
      toast.error(translateContractError(e), { id: tid });
    } finally {
      setCheckpointing(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    const tid = toast.loading('Tekshirilmoqda...');
    try {
      await ensureCorrectChain();

      const durRaw = ethers.parseUnits(durAmount, TOKEN_DECIMALS.DUR);
      const priceRaw = ethers.parseUnits(priceUSDC, TOKEN_DECIMALS.USDC);
      const period = BigInt(periodDays);

      // Tranzaksiya yuborishdan OLDIN kerakli tokenning balansini
      // tekshiramiz — aks holda foydalanuvchi behuda MetaMask oynasini
      // ko'radi va tushunarsiz xato bilan duch keladi ("sell" uchun DUR,
      // "buy" uchun garov sifatida USDC kerak bo'ladi).
      const neededToken   = mode === 'sell' ? 'DUR' : 'USDC';
      const neededAmount  = mode === 'sell' ? durRaw : preview.garovRaw;
      const neededDecimals = mode === 'sell' ? TOKEN_DECIMALS.DUR : TOKEN_DECIMALS.USDC;
      const checkToken = new ethers.Contract(TOKEN_ADDRESSES[neededToken], ERC20_ABI, signer);
      const balance = await checkToken.balanceOf(account);
      if (balance < neededAmount) {
        const have = ethers.formatUnits(balance, neededDecimals);
        const need = ethers.formatUnits(neededAmount, neededDecimals);
        toast.error(`${neededToken} yetarli emas — sizda ${have}, kerak ${need}`, { id: tid });
        setLoading(false);
        return;
      }

      toast.loading(mode === 'sell' ? "E'lon joylanmoqda..." : "Taklif joylanmoqda...", { id: tid });

      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      let tx;
      if (mode === 'sell') {
        await ensureDexApproval('DUR', signer, account, durRaw, openWalletForRequest);
        openWalletForRequest();
        tx = await withProgressToast(
          withWalletTimeout(dex.postListing(durRaw, priceRaw, period), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
          tid, WALLET_STAGES
        );
      } else {
        await ensureDexApproval('USDC', signer, account, preview.garovRaw, openWalletForRequest);
        openWalletForRequest();
        tx = await withProgressToast(
          withWalletTimeout(dex.postBuyOffer(durRaw, priceRaw, period), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
          tid, WALLET_STAGES
        );
      }

      await withProgressToast(
        withWalletTimeout(tx.wait(), 180000, "Tranzaksiya blockchain'da juda uzoq tasdiqlanmoqda"),
        tid, CHAIN_STAGES
      );

      toast.success(mode === 'sell' ? "E'lon joylandi!" : 'Taklif joylandi!', { id: tid });
      setDurAmount('');
      setPriceUSDC('');
      refreshBalances();
      refreshOracle();
    } catch (e) {
      console.error('dex submit error:', e);
      toast.error(translateContractError(e), { id: tid });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>
      <h2 style={{ marginBottom: 4 }}>Yangi DEX — e'lon yaratish</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
        DUR'ni nasiya sotish yoki sotib olish taklifini joylang.
      </p>

      {/* ── Rejim tanlash: sotish vs sotib olish ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <button
          className={`card ${mode === 'sell' ? 'card-selected' : ''}`}
          onClick={() => setMode('sell')}
          style={{ textAlign: 'left', cursor: 'pointer', border: mode === 'sell' ? '1px solid var(--accent)' : undefined }}
        >
          <Tag size={20} color="var(--dur-color)" />
          <div style={{ fontWeight: 600, marginTop: 8 }}>Sotaman</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>DUR bor, USDC kerak</div>
        </button>
        <button
          className={`card ${mode === 'buy' ? 'card-selected' : ''}`}
          onClick={() => setMode('buy')}
          style={{ textAlign: 'left', cursor: 'pointer', border: mode === 'buy' ? '1px solid var(--accent)' : undefined }}
        >
          <ShoppingCart size={20} color="var(--accent-bright)" />
          <div style={{ fontWeight: 600, marginTop: 8 }}>Sotib olaman</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>USDC bor, DUR kerak</div>
        </button>
      </div>

      {oracleLoading ? (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Loader2 className="spin" size={16} /> Narx tekshirilmoqda...
        </div>
      ) : !oracleReady && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16, borderColor: 'var(--warning)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={18} color="var(--warning)" />
            <span style={{ fontSize: 13 }}>Narx eskirgan — avval yangilash kerak (ozgina gaz talab qiladi).</span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleCheckpoint} disabled={checkpointing}>
            {checkpointing ? <Loader2 className="spin" size={14} /> : 'Narxni yangilash'}
          </button>
        </div>
      )}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="input-group">
          <label className="input-label">DUR miqdori</label>
          <input className="input" type="number" min="0" placeholder="0.0" value={durAmount}
            onChange={(e) => setDurAmount(e.target.value)} />
        </div>

        <div className="input-group">
          <label className="input-label">Narx (USDC)</label>
          <input className="input" type="number" min="0" placeholder="0.0" value={priceUSDC}
            onChange={(e) => setPriceUSDC(e.target.value)} />
          {preview?.overCap && (
            <span style={{ fontSize: 12, color: 'var(--danger)' }}>
              <AlertCircle size={12} style={{ verticalAlign: 'middle' }} /> Tannarxdan +10%dan oshib ketdi — maksimal {formatPreview(preview.maxAllowedRaw)} USDC
            </span>
          )}
        </div>

        <div className="input-group">
          <label className="input-label">To'lov muddati (1-30 kun)</label>
          <input className="input" type="number" min="1" max="30" value={periodDays}
            onChange={(e) => setPeriodDays(e.target.value)} />
        </div>

        {preview && (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Hozirgi tannarx</span>
              <span>{formatPreview(preview.fairValueRaw)} USDC</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Maksimal narx (+10%)</span>
              <span>{formatPreview(preview.maxAllowedRaw)} USDC</span>
            </div>
            {preview.garovRaw !== null && mode === 'buy' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>To'lanadigan garov</span>
                <span>{formatPreview(preview.garovRaw)} USDC</span>
              </div>
            )}
            {mode === 'sell' && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                <Info size={12} style={{ verticalAlign: 'middle' }} /> Garov miqdori xaridor tasdiqlaganda hisoblanadi (hozirgi narxga qarab).
              </div>
            )}
          </div>
        )}

        <button className="btn btn-primary btn-full btn-lg" disabled={!canSubmit} onClick={handleSubmit}>
          {loading ? <Loader2 className="spin" size={18} /> : (mode === 'sell' ? "E'lon joylash" : 'Taklif joylash')}
        </button>

        {!account && <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Avval hamyonni ulang</div>}
      </div>
    </div>
  );
}
