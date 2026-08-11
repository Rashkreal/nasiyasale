import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { useWeb3 } from '../hooks/useWeb3';
import { TOKEN_ADDRESSES, TOKEN_DECIMALS, ERC20_ABI, ARBITRUM_ONE } from '../abi/contract';
import { saveLocalTxHistory } from '../utils/localTxHistory';
import { loadApproveMultiplier } from './Settings';
import { Tag, ShoppingCart, Info, AlertCircle, Loader2 } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════
//  P2P nasiya bozori — WBTC'ni nasiya sotish/sotib olish uchun e'lon
//  joylash sahifasi. ListingMarketListings.js / ListingMarketPositions.js
//  / ListingMarketSellerPositions.js bilan bir xil sahifa oilasi.
//
//  MUHIM: bu — loyihaning ikkinchi avlod kontrakti. Birinchisida "nasiya"
//  aktivi DUR edi, va DUR yagona Uniswap havzasida savdo qilingani uchun
//  maxsus "checkpoint oracle" (ikkita, bir-biriga yaqin narx o'qishni
//  talab qiluvchi mexanizm) kerak edi. Endi nasiya aktivi WBTC — va
//  WBTC uchun ALLAQACHON ishonchli Chainlink narx manbai bor (garov
//  hisoblashda ham ishlatiladi). Shuning uchun bu versiyada checkpoint,
//  "narxni yangilash" tugmasi yoki oracle holatini kutish umuman yo'q —
//  narx doim, darhol mavjud.
// ══════════════════════════════════════════════════════════════════════

const DEX_ADDRESS = '0x8aC38A6C9E02EE75658ae6f2d6Fd93e8e43c247f';

const TOKEN_WBTC = 0;
const TOKEN_WETH = 1;
const TOKEN_USDC = 2;

const DEX_ABI = [
  'function postListing(uint256 wbtcAmount, uint256 priceUSDC, uint256 paymentPeriodDays) external returns (uint256 listingId)',
  'function postBuyOffer(uint256 wbtcAmount, uint256 priceUSDC, uint256 paymentPeriodDays) external returns (uint256 offerId)',
  'function getTokenPriceUSDC(uint8 tokenId) external view returns (uint256)',
  'function PROTOCOL_FEE_BPS() external view returns (uint16)',
  // Kontraktning BARCHA maxsus xatolari
  'error AlreadySwapped()',
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
  'error NothingToSwap()',
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
  PriceTooHigh: "Narx tannarxdan +10%dan oshib ketgan",
  BadListingParams: "Miqdor yoki narx noto'g'ri kiritilgan",
  BadPeriod: "To'lov muddati 1-30 kun oralig'ida bo'lishi kerak",
  InsufficientCollateral: "Garov yetarli emas",
  BelowRequiredFloor: "Bu miqdorni olib qo'yish pozitsiyani xavfli holatga tashlaydi",
  SwapWouldLeaveLiquidatable: "Bu svop pozitsiyani darhol likvidatsiyaga tashlab yuboradi — avval garov qo'shing",
  NothingToSwap: "Svop qilish uchun WBTC principal qolmagan",
  AlreadySwapped: "Garov allaqachon boshqa tokenga aylantirilgan",
  PositionNotFound: "Bunday pozitsiya topilmadi",
  PositionNotOpen: "Bu pozitsiya endi ochiq emas",
  NotBuyer: "Bu amalni faqat pozitsiya xaridori bajara oladi",
  NotSeller: "Bu amalni faqat e'lon egasi bajara oladi",
  NotLiquidatable: "Bu pozitsiya hali likvidatsiya qilinishi mumkin emas",
  ZeroAmount: "Miqdor 0 bo'lishi mumkin emas",
  BadTokenId: "Noto'g'ri token tanlandi",
  SequencerDown: "Arbitrum sequencer vaqtincha ishlamayapti — birozdan keyin urinib ko'ring",
  SequencerGracePeriod: "Sequencer yaqinda tiklandi — bir necha daqiqa kutish kerak",
  SequencerFeedDead: "Sequencer holatini tekshirib bo'lmadi",
  BadChainlinkPrice: "Narx manbasidan noto'g'ri ma'lumot keldi",
  StaleChainlinkPrice: "Narx manbasi eskirgan — birozdan keyin qayta urinib ko'ring",
  StaleChainlinkRound: "Narx manbasi to'liq yangilanmagan",
  ChainlinkPriceUnderflow: "Narx hisoblashda xato",
  NoPriceAvailable: "Hech qanday narx manbai topilmadi",
  NotPoolManager: "Ruxsatsiz chaqiruv",
  TooLittleReceived: "Svop natijasi kutilgandan kam — slippage juda yuqori",
  BelowMinimumFill: "Bu miqdor juda kichik — qisman olishda minimal chegaradan yuqori bo'lishi kerak (yoki qolganning hammasini oling)",
  ExceedsRemainingAmount: "So'ralgan miqdor mavjud qoldiqdan ko'p",
};

const DEX_INTERFACE = new ethers.Interface(DEX_ABI);

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
        const balance = ethers.formatUnits(parsed.args.balance, TOKEN_DECIMALS.WBTC);
        const needed = ethers.formatUnits(parsed.args.needed, TOKEN_DECIMALS.WBTC);
        return `Token yetarli emas — sizda ${balance}, kerak ${needed}`;
      }
      if (parsed?.name === 'ERC20InsufficientAllowance') {
        return "Ruxsat yetarli emas — qayta urinib ko'ring (approve avtomatik so'raladi)";
      }
      if (parsed?.name) return ERROR_MESSAGES[parsed.name] || `Kontrakt xatosi: ${parsed.name}`;
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

// @returns true agar ruxsat allaqachon yetarli bo'lsa (chaqiruvchi darhol
//          davom etishi mumkin); false agar HOZIRGINA yangi ruxsat
//          so'ralgan bo'lsa (chaqiruvchi TO'XTASHI kerak — MetaMask
//          ketma-ket ikkinchi so'rovni ko'rsatmasligi mumkin).
async function ensureDexApproval(tokenKey, signer, account, amountRaw, openWalletForRequest) {
  const token = new ethers.Contract(TOKEN_ADDRESSES[tokenKey], ERC20_ABI, signer);
  const allowance = await token.allowance(account, DEX_ADDRESS);
  if (allowance >= amountRaw) return true;

  const tid = toast.loading(`${tokenKey} uchun ruxsat so'ralmoqda...`);
  try {
    const mult = loadApproveMultiplier();
    const approveAmount = mult === 'max' ? ethers.MaxUint256 : amountRaw * BigInt(mult);
    openWalletForRequest();
    const tx = await withWalletTimeout(
      token.approve(DEX_ADDRESS, approveAmount),
      90000,
      `${tokenKey} approval oynasi chiqmadi yoki wallet javob bermadi`
    );
    await withWalletTimeout(tx.wait(), 90000, `${tokenKey} approval tasdiqlanmadi`);
    toast.success(`${tokenKey} ruxsat berildi! Endi tugmani yana bosing.`, { id: tid });
    return false;
  } catch (e) {
    console.error('approval error:', e);
    toast.error(translateContractError(e), { id: tid });
    throw e;
  }
}

function fmt(raw, decimals, sigFigs = 4) {
  if (raw === null || raw === undefined) return '—';
  const num = parseFloat(ethers.formatUnits(raw, decimals));
  if (!isFinite(num)) return '—';
  if (num === 0) return '0';
  return num.toPrecision(sigFigs).replace(/\.?0+$/, '').replace(/\.$/, '');
}

export default function ListingMarket() {
  const { account, signer, isCorrectNetwork, ensureCorrectChain, openWalletForRequest, refreshBalances } = useWeb3();

  const [mode, setMode] = useState('sell'); // 'sell' = WBTC sotish, 'buy' = WBTC sotib olish taklifi
  const [wbtcAmount, setWbtcAmount] = useState('');
  const [priceUSDC, setPriceUSDC] = useState('');
  const [periodDays, setPeriodDays] = useState('7');
  const [loading, setLoading] = useState(false);

  // Chainlink WBTC narxi — checkpoint kerak emas, doim darhol mavjud.
  const [fairPriceRaw, setFairPriceRaw] = useState(null); // 1e6 USDC per 1 whole WBTC
  const [feeBps, setFeeBps] = useState(5); // PROTOCOL_FEE_BPS o'qilmaguncha standart qiymat
  const [priceLoading, setPriceLoading] = useState(true);

  const refreshPrice = useCallback(async () => {
    setPriceLoading(true);
    try {
      const provider = await getReadProvider();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, provider);
      const [price, fee] = await Promise.all([
        dex.getTokenPriceUSDC(TOKEN_WBTC),
        dex.PROTOCOL_FEE_BPS(),
      ]);
      setFairPriceRaw(price);
      setFeeBps(Number(fee));
    } catch (e) {
      console.error('price read error:', e);
      setFairPriceRaw(null);
    } finally {
      setPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPrice();
    const id = setInterval(refreshPrice, 30000); // 30s'da bir yangilanadi
    return () => clearInterval(id);
  }, [refreshPrice]);

  // ── Jonli hisob-kitoblar (kontraktdagi _computeGarov bilan bir xil) ────
  const preview = useMemo(() => {
    if (!fairPriceRaw || !wbtcAmount || parseFloat(wbtcAmount) <= 0) return null;
    try {
      const wbtcRaw = ethers.parseUnits(wbtcAmount, TOKEN_DECIMALS.WBTC);
      const fairValueRaw = (wbtcRaw * fairPriceRaw) / (10n ** 8n); // WBTC 8 xonali
      const maxAllowedRaw = (fairValueRaw * 11000n) / 10000n; // +10%

      let garovRaw = null;
      let priceRaw = null;
      let feeRaw = null;
      let overCap = false;
      if (priceUSDC && parseFloat(priceUSDC) > 0) {
        priceRaw = ethers.parseUnits(priceUSDC, TOKEN_DECIMALS.USDC);
        overCap = priceRaw > maxAllowedRaw;
        const ustamaRaw = priceRaw > fairValueRaw ? priceRaw - fairValueRaw : 0n;
        const bufferRaw = (priceRaw * 700n) / 10000n; // DEFAULT_BUFFER_BPS = 7%
        garovRaw = bufferRaw + ustamaRaw;
        feeRaw = (priceRaw * BigInt(feeBps)) / 10000n;
      }

      return { fairValueRaw, maxAllowedRaw, garovRaw, feeRaw, overCap };
    } catch {
      return null; // foydalanuvchi hali yozib tugatmagan bo'lishi mumkin
    }
  }, [fairPriceRaw, wbtcAmount, priceUSDC, feeBps]);

  const canSubmit = account && isCorrectNetwork && fairPriceRaw && wbtcAmount && priceUSDC && periodDays
    && parseFloat(wbtcAmount) > 0 && parseFloat(priceUSDC) > 0
    && Number(periodDays) >= 1 && Number(periodDays) <= 30
    && preview && !preview.overCap && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    const tid = toast.loading('Tekshirilmoqda...');
    try {
      await ensureCorrectChain();

      const wbtcRaw = ethers.parseUnits(wbtcAmount, TOKEN_DECIMALS.WBTC);
      const priceRaw = ethers.parseUnits(priceUSDC, TOKEN_DECIMALS.USDC);
      const period = BigInt(periodDays);

      // Tranzaksiya yuborishdan OLDIN kerakli tokenning balansini
      // tekshiramiz. "sell" uchun WBTC, "buy" uchun garov+komissiya
      // sifatida USDC kerak bo'ladi.
      const neededToken    = mode === 'sell' ? 'WBTC' : 'USDC';
      const neededAmount   = mode === 'sell' ? wbtcRaw : (preview.garovRaw + preview.feeRaw);
      const neededDecimals = mode === 'sell' ? TOKEN_DECIMALS.WBTC : TOKEN_DECIMALS.USDC;
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
        // postListing komissiya olmaydi — komissiya faqat approveListing
        // (tasdiqlash) vaqtida, xaridordan olinadi.
        const approved = await ensureDexApproval('WBTC', signer, account, wbtcRaw, openWalletForRequest);
        if (!approved) { toast.dismiss(tid); return; }
        openWalletForRequest();
        tx = await withProgressToast(
          withWalletTimeout(dex.postListing(wbtcRaw, priceRaw, period), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
          tid, WALLET_STAGES
        );
      } else {
        // postBuyOffer garovni escrow qiladi — komissiya bu yerda emas,
        // fulfillBuyOffer vaqtida sotuvchidan (WBTC'da) olinadi.
        const approved = await ensureDexApproval('USDC', signer, account, preview.garovRaw, openWalletForRequest);
        if (!approved) { toast.dismiss(tid); return; }
        openWalletForRequest();
        tx = await withProgressToast(
          withWalletTimeout(dex.postBuyOffer(wbtcRaw, priceRaw, period), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
          tid, WALLET_STAGES
        );
      }

      await withProgressToast(
        withWalletTimeout(tx.wait(), 180000, "Tranzaksiya blockchain'da juda uzoq tasdiqlanmoqda"),
        tid, CHAIN_STAGES
      );

      toast.success(mode === 'sell' ? "E'lon joylandi!" : 'Taklif joylandi!', { id: tid });
      saveLocalTxHistory({
        type: mode === 'sell' ? 'listingMarketPostListing' : 'listingMarketPostBuyOffer',
        label: mode === 'sell' ? "ListingMarket: WBTC sotuvga qo'yildi" : "ListingMarket: WBTC uchun taklif qo'yildi",
        txHash: tx.hash,
        status: 'success',
        account,
        extra: `${wbtcAmount} WBTC — ${priceUSDC} USDC`,
      });
      setWbtcAmount('');
      setPriceUSDC('');
      refreshBalances();
      refreshPrice();
    } catch (e) {
      console.error('listing market submit error:', e);
      toast.error(translateContractError(e), { id: tid });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>
      <h2 style={{ marginBottom: 4 }}>P2P Market — e'lon joylash</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
        WBTC'ni nasiya sotish yoki sotib olish taklifini joylang.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <button
          className={`card ${mode === 'sell' ? 'card-selected' : ''}`}
          onClick={() => setMode('sell')}
          style={{ textAlign: 'left', cursor: 'pointer', border: mode === 'sell' ? '1px solid var(--accent)' : undefined }}
        >
          <Tag size={20} color="var(--accent-bright)" />
          <div style={{ fontWeight: 600, marginTop: 8 }}>WBTC sotish</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>WBTC bor, USDC kerak</div>
        </button>
        <button
          className={`card ${mode === 'buy' ? 'card-selected' : ''}`}
          onClick={() => setMode('buy')}
          style={{ textAlign: 'left', cursor: 'pointer', border: mode === 'buy' ? '1px solid var(--accent)' : undefined }}
        >
          <ShoppingCart size={20} color="var(--accent-bright)" />
          <div style={{ fontWeight: 600, marginTop: 8 }}>WBTC sotib olish taklifi</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>USDC bor, WBTC kerak</div>
        </button>
      </div>

      {priceLoading ? (
        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
          Narx yuklanmoqda...
        </div>
      ) : !fairPriceRaw && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, borderColor: 'var(--warning)' }}>
          <AlertCircle size={18} color="var(--warning)" />
          <span style={{ fontSize: 13 }}>WBTC narxini olishda xato — birozdan keyin qayta urinib ko'ring.</span>
        </div>
      )}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="input-label">WBTC miqdori</label>
          <input
            className="input"
            type="number"
            min="0"
            placeholder="0.0"
            value={wbtcAmount}
            onChange={(e) => setWbtcAmount(e.target.value)}
          />
          {fairPriceRaw && wbtcAmount && preview && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Taxminiy tannarx: ~{fmt(preview.fairValueRaw, TOKEN_DECIMALS.USDC)} USDC
            </div>
          )}
        </div>

        <div>
          <label className="input-label">Narx (USDC)</label>
          <input
            className="input"
            type="number"
            min="0"
            placeholder="0.0"
            value={priceUSDC}
            onChange={(e) => setPriceUSDC(e.target.value)}
          />
          {preview && preview.overCap && (
            <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>
              Narx tannarxdan +10%dan oshib ketdi (max: {fmt(preview.maxAllowedRaw, TOKEN_DECIMALS.USDC)} USDC)
            </div>
          )}
        </div>

        <div>
          <label className="input-label">To'lov muddati (kun, 1-30)</label>
          <input
            className="input"
            type="number"
            min="1"
            max="30"
            value={periodDays}
            onChange={(e) => setPeriodDays(e.target.value)}
          />
        </div>

        {preview && preview.garovRaw !== null && !preview.overCap && (
          <div className="card" style={{ background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <Info size={14} />
              {mode === 'sell' ? "Xaridor to'laydigan garov" : "Escrow qilinadigan garov"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(preview.garovRaw, TOKEN_DECIMALS.USDC)} USDC</div>
            {mode === 'buy' && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                + protokol komissiyasi ({(feeBps / 100).toFixed(2)}%): taklif bajarilganda sotuvchidan WBTC'da olinadi
              </div>
            )}
          </div>
        )}

        <button className="btn btn-primary" disabled={!canSubmit} onClick={handleSubmit}>
          {loading ? <Loader2 className="spin" size={16} /> : (mode === 'sell' ? "E'lon joylash" : 'Taklif joylash')}
        </button>

        {!account && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            Davom etish uchun hamyonni ulang
          </div>
        )}
      </div>
    </div>
  );
}
