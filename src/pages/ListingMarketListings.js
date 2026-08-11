import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { useWeb3 } from '../hooks/useWeb3';
import { TOKEN_ADDRESSES, TOKEN_DECIMALS, ERC20_ABI } from '../abi/contract';
import { saveLocalTxHistory } from '../utils/localTxHistory';
import { loadApproveMultiplier } from './Settings';
import { Tag, ShoppingCart, RefreshCw, X } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════
//  E'lonlarni ko'rish + tasdiqlash — ListingMarket.js (e'lon joylash)
//  bilan bir xil sahifa oilasi. Har bir sahifa o'zining manzil/ABI/
//  yordamchi funksiyalarini o'zida saqlaydi.
//
//  Checkpoint oracle yo'q — WBTC narxi Chainlink orqali doim, darhol
//  mavjud, shuning uchun bu sahifada "narxni yangilash" degan tugma yoki
//  oracle holatini kutish umuman yo'q (avvalgi DUR-asosli versiyadan
//  farqli o'laroq).
// ══════════════════════════════════════════════════════════════════════

const DEX_ADDRESS = '0x8aC38A6C9E02EE75658ae6f2d6Fd93e8e43c247f';

const DEX_ABI = [
  'function getPendingListings(uint256 offset, uint256 limit) external view returns (tuple(address seller, uint256 wbtcAmount, uint256 priceUSDC, uint256 wbtcAmountRemaining, uint256 paymentPeriodDays, uint8 status)[] result, uint256[] ids)',
  'function getPendingBuyOffers(uint256 offset, uint256 limit) external view returns (tuple(address buyer, uint256 wbtcAmount, uint256 priceUSDC, uint256 paymentPeriodDays, uint256 garov, uint256 wbtcAmountRemaining, uint8 status)[] result, uint256[] ids)',
  'function totalPendingListings() external view returns (uint256)',
  'function totalPendingBuyOffers() external view returns (uint256)',
  'function previewGarov(uint256 listingId, uint256 wbtcAmountToTake) external view returns (uint256)',
  'function approveListing(uint256 listingId, uint256 wbtcAmountToTake) external returns (uint256 positionId)',
  'function fulfillBuyOffer(uint256 offerId, uint256 wbtcAmountToFulfill) external returns (uint256 positionId)',
  'function cancelListing(uint256 listingId) external',
  'function cancelBuyOffer(uint256 offerId) external',
  'function PROTOCOL_FEE_BPS() external view returns (uint16)',
  'function MIN_PARTIAL_FILL_USDC() external view returns (uint256)',
  'function getTokenPriceUSDC(uint8 tokenId) external view returns (uint256)',
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
  BelowMinimumFill: "Bu miqdor juda kichik — qisman olishda minimal chegaradan yuqori bo'lishi kerak (yoki qolganning hammasini oling)",
  ExceedsRemainingAmount: "So'ralgan miqdor mavjud qoldiqdan ko'p",
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
        return `WBTC yetarli emas — sizda ${balance}, kerak ${needed}`;
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

const PAGE_SIZE = 20;

export default function ListingMarketListings() {
  const { account, signer, isCorrectNetwork, ensureCorrectChain, openWalletForRequest, refreshBalances } = useWeb3();

  const [tab, setTab] = useState('listings'); // 'listings' | 'offers'
  const [listings, setListings] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [minFillUsdc, setMinFillUsdc] = useState(null);
  const [wbtcPrice, setWbtcPrice] = useState(null);
  const [feeBps, setFeeBps] = useState(5);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const provider = await getReadProvider();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, provider);

      dex.MIN_PARTIAL_FILL_USDC().then(setMinFillUsdc).catch(() => {});
      dex.PROTOCOL_FEE_BPS().then((f) => setFeeBps(Number(f))).catch(() => {});
      dex.getTokenPriceUSDC(0).then(setWbtcPrice).catch(() => setWbtcPrice(null));

      const [listingsRes, offersRes] = await Promise.all([
        dex.getPendingListings(0, PAGE_SIZE),
        dex.getPendingBuyOffers(0, PAGE_SIZE),
      ]);

      const [result, ids] = listingsRes;
      setListings(
        result
          .map((l, i) => ({
            id: ids[i],
            seller: l.seller,
            wbtcAmount: l.wbtcAmount,
            priceUSDC: l.priceUSDC,
            wbtcAmountRemaining: l.wbtcAmountRemaining,
            paymentPeriodDays: l.paymentPeriodDays,
          }))
          .reverse()
      );

      const [oResult, oIds] = offersRes;
      setOffers(
        oResult
          .map((o, i) => ({
            id: oIds[i],
            buyer: o.buyer,
            wbtcAmount: o.wbtcAmount,
            priceUSDC: o.priceUSDC,
            paymentPeriodDays: o.paymentPeriodDays,
            garov: o.garov,
            wbtcAmountRemaining: o.wbtcAmountRemaining,
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

  const handleApproveListing = async (listing, amountRaw) => {
    if (!account) { toast.error('Avval hamyonni ulang'); return; }
    setActionLoading(listing.id.toString());
    const tid = toast.loading("E'lon tasdiqlanmoqda...");
    try {
      await ensureCorrectChain();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      const garovRaw = await dex.previewGarov(listing.id, amountRaw);
      const partialPriceUSDC = (listing.priceUSDC * amountRaw) / listing.wbtcAmount;
      const feeRaw = (partialPriceUSDC * BigInt(feeBps)) / 10000n;

      const approved = await ensureDexApproval('USDC', signer, account, garovRaw + feeRaw, openWalletForRequest);
      if (!approved) { toast.dismiss(tid); return; }

      openWalletForRequest();
      const tx = await withProgressToast(
        withWalletTimeout(dex.approveListing(listing.id, amountRaw), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
        tid, WALLET_STAGES
      );
      await withProgressToast(
        withWalletTimeout(tx.wait(), 180000, "Tranzaksiya blockchain'da juda uzoq tasdiqlanmoqda"),
        tid, CHAIN_STAGES
      );

      toast.success("E'lon tasdiqlandi! Pozitsiya ochildi.", { id: tid });
      saveLocalTxHistory({
        type: 'listingMarketApproveListing',
        label: "ListingMarket: E'lon tasdiqlandi",
        listingId: listing.id.toString(),
        txHash: tx.hash,
        status: 'success',
        account,
        extra: `${fmt(amountRaw, TOKEN_DECIMALS.WBTC)} WBTC`,
      });
      refreshBalances();
      load();
    } catch (e) {
      reportTxError(e, tid);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFulfillOffer = async (offer, amountRaw) => {
    if (!account) { toast.error('Avval hamyonni ulang'); return; }
    setActionLoading('offer-' + offer.id.toString());
    const tid = toast.loading('Tekshirilmoqda...');
    try {
      await ensureCorrectChain();

      const feeRaw = (amountRaw * BigInt(feeBps)) / 10000n;
      const totalNeeded = amountRaw + feeRaw;

      // Tranzaksiya yuborishdan OLDIN balansni tekshiramiz.
      const wbtcToken = new ethers.Contract(TOKEN_ADDRESSES.WBTC, ERC20_ABI, signer);
      const balance = await wbtcToken.balanceOf(account);
      if (balance < totalNeeded) {
        const have = ethers.formatUnits(balance, TOKEN_DECIMALS.WBTC);
        const need = ethers.formatUnits(totalNeeded, TOKEN_DECIMALS.WBTC);
        toast.error(`WBTC yetarli emas — sizda ${have}, kerak ${need} (komissiya bilan)`, { id: tid });
        return;
      }

      toast.loading('Taklif bajarilmoqda...', { id: tid });
      const approved = await ensureDexApproval('WBTC', signer, account, totalNeeded, openWalletForRequest);
      if (!approved) { toast.dismiss(tid); return; }

      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withProgressToast(
        withWalletTimeout(dex.fulfillBuyOffer(offer.id, amountRaw), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
        tid, WALLET_STAGES
      );
      await withProgressToast(
        withWalletTimeout(tx.wait(), 180000, "Tranzaksiya blockchain'da juda uzoq tasdiqlanmoqda"),
        tid, CHAIN_STAGES
      );

      toast.success('Taklif bajarildi! Pozitsiya ochildi.', { id: tid });
      saveLocalTxHistory({
        type: 'listingMarketFulfillBuyOffer',
        label: 'ListingMarket: Taklif bajarildi',
        listingId: offer.id.toString(),
        txHash: tx.hash,
        status: 'success',
        account,
        extra: `${fmt(amountRaw, TOKEN_DECIMALS.WBTC)} WBTC`,
      });
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
      saveLocalTxHistory({
        type: kind === 'listing' ? 'listingMarketCancelListing' : 'listingMarketCancelBuyOffer',
        label: kind === 'listing' ? "ListingMarket: E'lon bekor qilindi" : 'ListingMarket: Taklif bekor qilindi',
        listingId: id.toString(),
        txHash: tx.hash,
        status: 'success',
        account,
      });
      refreshBalances();
      load();
    } catch (e) {
      reportTxError(e, tid);
    } finally {
      setActionLoading(null);
    }
  };

  function reportTxError(e, tid) {
    console.error('listing market action error:', e);
    toast.error(translateContractError(e), { id: tid });
  }

  const items = tab === 'listings' ? listings : offers;
  const isMine = (item) => account && (tab === 'listings' ? item.seller : item.buyer)?.toLowerCase() === account.toLowerCase();

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}>P2P Market — e'lonlar</h2>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
        Kutilayotgan e'lonlar va takliflarni ko'ring, tasdiqlang yoki bekor qiling.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <button
          className={`card ${tab === 'listings' ? 'card-selected' : ''}`}
          onClick={() => setTab('listings')}
          style={{ textAlign: 'left', cursor: 'pointer', border: tab === 'listings' ? '1px solid var(--accent)' : undefined }}
        >
          <Tag size={20} color="var(--accent-bright)" />
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
          const remaining = item.wbtcAmountRemaining;
          const isPartiallyTaken = remaining < item.wbtcAmount;

          // Listing: garov jonli Chainlink narxidan hisoblanadi, har
          // safar kontraktdan so'raladi. Offer: garov joylashda
          // qat'iylashtirilgan pot, faqat proportsional bo'linadi —
          // kontrakt chaqiruvi shart emas.
          const previewFn = tab === 'listings'
            ? async (amountRaw) => {
                const provider = await getReadProvider();
                const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, provider);
                return dex.previewGarov(item.id, amountRaw);
              }
            : async (amountRaw) => (item.garov * amountRaw) / item.wbtcAmount;

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
                    <b>{fmt(remaining, TOKEN_DECIMALS.WBTC)} WBTC</b>
                    {isPartiallyTaken && (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        {' '}(jami {fmt(item.wbtcAmount, TOKEN_DECIMALS.WBTC)} dan qoldi)
                      </span>
                    )}
                    {'-'}<b>{fmt(item.priceUSDC, TOKEN_DECIMALS.USDC)} USDC</b>
                    {tab === 'listings' ? ' (ga sotiladi)' : ' (ga sotib olinmoqchi)'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Muddat: {item.paymentPeriodDays.toString()} kun
                  </div>
                </div>

                {mine && (
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={actionLoading === idKey}
                    onClick={() => handleCancel(tab === 'listings' ? 'listing' : 'offer', item.id)}
                  >
                    <X size={14} /> Bekor qilish
                  </button>
                )}
              </div>

              {!mine && (
                <FillRow
                  remaining={remaining}
                  minFillUsdc={minFillUsdc}
                  wbtcPrice={wbtcPrice}
                  feeBps={feeBps}
                  tab={tab}
                  previewFn={previewFn}
                  disabled={actionLoading === idKey}
                  actionLabel={tab === 'listings' ? 'WBTC sotib olish' : 'WBTC sotish'}
                  actionIcon={tab === 'listings' ? <ShoppingCart size={14} /> : <Tag size={14} />}
                  onSubmit={(amountRaw) => (tab === 'listings' ? handleApproveListing(item, amountRaw) : handleFulfillOffer(item, amountRaw))}
                />
              )}
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

// Miqdor tanlash + garov (va komissiya) ko'rish + tasdiqlash tugmasi.
function FillRow({ remaining, minFillUsdc, wbtcPrice, feeBps, tab, previewFn, disabled, actionLabel, actionIcon, onSubmit }) {
  const [amountStr, setAmountStr] = useState(() => ethers.formatUnits(remaining, TOKEN_DECIMALS.WBTC));
  const [garovPreview, setGarovPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  let amountRaw = null;
  try { amountRaw = ethers.parseUnits(amountStr || '0', TOKEN_DECIMALS.WBTC); } catch { /* hali yozib tugatmagan */ }

  const isFull = amountRaw !== null && amountRaw === remaining;
  const minFillWbtc = (!isFull && minFillUsdc !== null && wbtcPrice !== null && wbtcPrice > 0n)
    ? (minFillUsdc * (10n ** 8n)) / wbtcPrice
    : null;
  const belowMin = !isFull && minFillWbtc !== null && amountRaw !== null && amountRaw > 0n && amountRaw < minFillWbtc;
  const valid = amountRaw !== null && amountRaw > 0n && amountRaw <= remaining && !belowMin;

  const feeRaw = amountRaw !== null && amountRaw > 0n ? (amountRaw * BigInt(feeBps)) / 10000n : null;

  useEffect(() => {
    if (!valid) { setGarovPreview(null); return; }
    let cancelled = false;
    setPreviewLoading(true);
    const t = setTimeout(async () => {
      try {
        const g = await previewFn(amountRaw);
        if (!cancelled) setGarovPreview(g);
      } catch {
        if (!cancelled) setGarovPreview(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [amountStr, valid]);

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--bg-secondary)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label className="input-label" style={{ fontSize: 12 }}>Miqdor (WBTC)</label>
          <input
            className="input"
            type="number"
            min="0"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => setAmountStr(ethers.formatUnits(remaining, TOKEN_DECIMALS.WBTC))}
        >
          Hammasi
        </button>
        <button
          className="btn btn-primary btn-sm"
          disabled={disabled || !valid}
          onClick={() => onSubmit(amountRaw)}
        >
          {actionIcon} {actionLabel}
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
        {previewLoading && 'Hisoblanmoqda...'}
        {!previewLoading && garovPreview !== null && (
          tab === 'listings'
            ? `Garov: ${fmt(garovPreview, TOKEN_DECIMALS.USDC)} USDC + komissiya`
            : `Garov (sizga tegishli emas): ${fmt(garovPreview, TOKEN_DECIMALS.USDC)} USDC · sizdan: ${fmt(amountRaw + (feeRaw || 0n), TOKEN_DECIMALS.WBTC)} WBTC (komissiya bilan)`
        )}
        {!previewLoading && garovPreview === null && belowMin && minFillWbtc !== null &&
          `Qisman olishda kamida ~${fmt(minFillWbtc, TOKEN_DECIMALS.WBTC)} WBTC kerak (yoki hammasini oling)`}
      </div>
    </div>
  );
}
