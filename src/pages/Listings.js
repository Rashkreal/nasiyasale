import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useLang } from '../hooks/useLang';
import { tokensFromMask, TOKEN_IDS, TOKEN_COLORS, TOKEN_DECIMALS, COLLATERAL_TOKENS } from '../abi/contract';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { saveLocalTxHistory } from '../utils/localTxHistory';
import { loadDeviationBps } from './Settings';
import { List, RefreshCw, CheckCircle, Copy, Check, XCircle, Lock, AlertCircle, Search } from 'lucide-react';

// withWalletTimeout — tx.wait() ga timeout o'rovchisi (mobile WC sessiyada
// wallet javob bermay qolsa, foydalanuvchini cheksiz kutishdan qutqaradi).
function withWalletTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message || 'Wallet javob bermadi')), ms);
    }),
  ]);
}

// withProgressToast — uzoq kutilayotgan promise davomida toast'ni
// yangilab turadi. Sekin internet/WC kechikishi paytida foydali.
function withProgressToast(promise, toastId, stages) {
  const timers = [];
  stages.forEach(([ms, msg]) => {
    timers.push(setTimeout(() => {
      toast.loading(msg, { id: toastId });
    }, ms));
  });
  return promise.finally(() => {
    timers.forEach(clearTimeout);
  });
}

// formatTokenAmount — token miqdorini 4 muhim raqam bilan formatlaydi.
// WBTC/WETH kabi qimmat tokenlar uchun kichik garovlar 0 ko'rinishini
// oldini oladi. Misol:
//   123.456 -> "123.5", 0.0000001234 -> "0.0000001234"
function formatTokenAmount(value, sigFigs = 4) {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (!isFinite(num) || num === 0) return '0';
  const abs = Math.abs(num);
  const precisionStr = num.toPrecision(sigFigs);
  if (precisionStr.includes('e') || precisionStr.includes('E')) {
    const parsed = Number(precisionStr);
    if (abs < 1) {
      const exp = Math.floor(Math.log10(abs));
      const decimalPlaces = -exp + (sigFigs - 1);
      return parsed.toFixed(decimalPlaces);
    }
    return parsed.toFixed(0);
  }
  return precisionStr;
}

function shortAddr(a) {
  return !a || a === ethers.ZeroAddress ? '—' : a.slice(0, 6) + '...' + a.slice(-4);
}

function durFmt(r) {
  try {
    return parseFloat(ethers.formatUnits(r, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 });
  } catch {
    return '?';
  }
}

function usdtFmt(r) {
  try {
    return parseFloat(ethers.formatUnits(r, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch {
    return '?';
  }
}

function AddrCell({ addr }) {
  const [copied, setCopied] = useState(false);

  if (!addr || addr === ethers.ZeroAddress) {
    return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }

  const copy = () => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span className="address" title={addr}>
        {shortAddr(addr)}
      </span>

      <button
        onClick={copy}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: copied ? 'var(--success)' : 'var(--text-muted)',
          padding: '2px',
          display: 'flex'
        }}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  );
}

function getStatusLabel(status, t) {
  const s = Number(status);

  const statusLabels = {
    0: t('statusPendingSellerC'),
    1: t('statusPendingBuyerC'),
    2: t('statusPendingSellerN'),
    3: t('statusPendingBuyerN'),
    4: t('statusApproved'),
    5: t('statusRemoved'),
    6: t('statusPaid'),
    7: t('statusDefaulted') || 'Default / to\u2018lanmagan'
  };

  return statusLabels[s] || `Status ${s}`;
}

function PriceDiffBadge({ pctDiff, isUp, isDown, maxDeviationPct }) {
  if (pctDiff === null || pctDiff === undefined) return null;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span
        style={{
          fontSize: '10px',
          fontWeight: 700,
          color: isUp ? 'var(--success)' : isDown ? 'var(--danger)' : 'var(--text-muted)',
          background: isUp
            ? 'rgba(16,185,129,0.1)'
            : isDown
              ? 'rgba(239,68,68,0.1)'
              : 'transparent',
          padding: '1px 4px',
          borderRadius: '3px'
        }}
      >
        {isUp ? '+' : ''}
        {pctDiff}%
      </span>
      {maxDeviationPct !== undefined && (
        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
          chek: {maxDeviationPct}%
        </span>
      )}
    </span>
  );
}

function calcPriceDiff(listing, tokenKey, tokenId, currentPrices) {
  try {
    const lockedRaw = listing.lockedPrices?.[tokenId];
    const lockedPrice = lockedRaw ? Number(lockedRaw) : 0;
    const currentPrice = currentPrices[tokenKey] || 0;

    if (lockedPrice > 0 && currentPrice > 0) {
      const pctDiff = ((currentPrice - lockedPrice) / lockedPrice * 100).toFixed(1);
      const pctNumber = Number(pctDiff);

      return {
        pctDiff,
        isUp: pctNumber > 0,
        isDown: pctNumber < 0
      };
    }
  } catch {}

  return {
    pctDiff: null,
    isUp: false,
    isDown: false
  };
}


function getErrorText(e) {
  try {
    const parts = [];

    const add = (v) => {
      if (v === undefined || v === null) return;

      if (typeof v === 'string') {
        parts.push(v);
        return;
      }

      if (v instanceof Error) {
        parts.push(v.message || String(v));
        if (v.reason) parts.push(v.reason);
        if (v.shortMessage) parts.push(v.shortMessage);
        if (v.code) parts.push(String(v.code));
        return;
      }

      try {
        parts.push(JSON.stringify(v));
      } catch {
        parts.push(String(v));
      }
    };

    add(e?.reason);
    add(e?.shortMessage);
    add(e?.message);
    add(e?.code);
    add(e?.info?.error?.message);
    add(e?.info?.error?.data?.message);
    add(e?.error?.message);
    add(e?.error?.data?.message);
    add(e?.data?.message);
    add(e?.data);
    add(e);

    return parts.filter(Boolean).join(' | ');
  } catch {
    return String(e?.reason || e?.shortMessage || e?.message || e || '');
  }
}

function extractContractReason(raw) {
  const text = String(raw || '');

  const patterns = [
    /CreditSale:\s*([^"'|,\n\r]+)/i,
    /execution reverted:\s*([^"'|,\n\r]+)/i,
    /reverted with reason string\s*['"]([^'"]+)['"]/i,
    /reason="([^"]+)"/i,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].trim();
  }

  return '';
}

function getFriendlyTxError(e, fallback) {
  const raw = getErrorText(e);
  const rawLower = raw.toLowerCase();
  const reason = extractContractReason(raw);
  const r = reason.toLowerCase();

  console.error('TX ERROR RAW:', raw);
  console.error('TX CONTRACT REASON:', reason || '(reason topilmadi)');

  if (r.includes('total bl limit') || rawLower.includes('total bl limit')) {
    return 'Contract rad etdi: total BL limit \u2014 aktiv garovsiz qarzlar yoki band BL sabab yangi garovsiz e\u2019lon uchun bo\u2018sh BL limiti yetmayapti.';
  }

  if (r.includes('bl low') || rawLower.includes('bl low')) {
    return 'Contract rad etdi: BL low \u2014 BL darajangiz bu garovsiz e\u2019lon uchun talab qilingan darajadan past.';
  }

  if (r.includes('buyer bl') || rawLower.includes('buyer bl')) {
    return 'Contract rad etdi: buyer BL \u2014 xaridorning BL limiti yoki pairwise BL talabi yetarli emas.';
  }

  if (r.includes('seller bl') || rawLower.includes('seller bl')) {
    return 'Contract rad etdi: seller BL \u2014 sotuvchining BL limiti yoki pairwise BL talabi yetarli emas.';
  }

  if (r.includes('blacklist') || rawLower.includes('blacklist')) {
    return 'Contract rad etdi: wallet blacklist/default holatida.';
  }

  if (r.includes('default') || rawLower.includes('defaulted')) {
    return 'Contract rad etdi: e\u2019lon yoki foydalanuvchi default holati sabab amal bajarilmadi.';
  }

  if (
    rawLower.includes('user rejected') ||
    rawLower.includes('user denied') ||
    rawLower.includes('rejected') ||
    rawLower.includes('denied transaction')
  ) {
    return 'Tranzaksiya walletda rad etildi.';
  }

  if (
    rawLower.includes('insufficient funds') ||
    rawLower.includes('insufficient balance') ||
    rawLower.includes('exceeds balance')
  ) {
    return "Hamyonda yetarli token yo\u2018q.";
  }

  if (
    rawLower.includes('wrong network') ||
    rawLower.includes('unsupported chain') ||
    (rawLower.includes('chain') && rawLower.includes('optimism'))
  ) {
    return 'Optimism Mainnet tarmog\u2018iga o\u2018ting.';
  }

  if (reason) {
    return `Contract rad etdi: ${reason}`;
  }

  return fallback || 'Xatolik yuz berdi';
}



export default function Listings() {
  const {
    account,
    contract,
    readOnlyContract,
    signer,
    ensureApproval,
    refreshBalances,
    walletBalances,
    ensureCorrectChain,
    openWalletForRequest
  } = useWeb3();

  const { t } = useLang();

  const [tab, setTab] = useState('seller');
  const [sellerListings, setSellerListings] = useState([]);
  const [buyerListings, setBuyerListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  const [chosenTokens, setChosenTokens] = useState({});
  const [collateralPreviews, setCollateralPreviews] = useState({});
  const [previewLoading, setPreviewLoading] = useState({});
  const [currentPrices, setCurrentPrices] = useState({});

  const fetchListings = useCallback(async () => {
    const c = readOnlyContract || contract;
    if (!c) return;

    setLoading(true);

    try {
      const [seller, buyer] = await Promise.all([
        c.getPendingSellerListings(0, 100),
        c.getPendingBuyerListings(0, 100)
      ]);

      setSellerListings(seller);
      setBuyerListings(buyer);
    } catch (e) {
      console.error(e);
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  }, [contract, readOnlyContract, t]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const fetchCollateralPreview = useCallback(async (listingId, tokenKey) => {
    const c = readOnlyContract || contract;
    if (!c) return;

    setPreviewLoading(prev => ({
      ...prev,
      [`${listingId}_${tokenKey}`]: true
    }));

    try {
      const tokenId = TOKEN_IDS[tokenKey];

      const colAmt = await c.getCollateralAmount(listingId, tokenId);
      const dec = TOKEN_DECIMALS[tokenKey];

      const formatted = formatTokenAmount(ethers.formatUnits(colAmt, dec));

      setCollateralPreviews(prev => ({
        ...prev,
        [listingId]: {
          ...prev[listingId],
          [tokenKey]: formatted
        }
      }));
    } catch (e) {
      console.error('preview err:', e);
    } finally {
      setPreviewLoading(prev => ({
        ...prev,
        [`${listingId}_${tokenKey}`]: false
      }));
    }
  }, [contract, readOnlyContract]);

  useEffect(() => {
    const c = readOnlyContract || contract;
    if (!c) return;

        const TOKEN_IDS_LIST = {
      WBTC: 0,
      WETH: 1
    };

    const fetchPrices = async () => {
      try {
        const prices = {};

        await Promise.all(
          Object.entries(TOKEN_IDS_LIST).map(async ([tk, id]) => {
            try {
              const p = await c.getTokenPriceUSDC(id);
              prices[tk] = Number(p);
            } catch {}
          })
        );

        setCurrentPrices(prices);
      } catch {}
    };

    fetchPrices();
  }, [contract, readOnlyContract]);

  const fetchedRef = React.useRef(new Set());

  useEffect(() => {
    const allListings = [...sellerListings, ...buyerListings];

    allListings.forEach(listing => {
      const status = Number(listing.status);

      if (status === 0 && listing.isCollateral) {
        const accepted = tokensFromMask(Number(listing.collateralMask));

        accepted.forEach(tk => {
          const id = Number(listing.id);
          const key = `${id}_${tk}`;

          if (!fetchedRef.current.has(key)) {
            fetchedRef.current.add(key);
            fetchCollateralPreview(id, tk);
          }
        });
      }
    });
  }, [sellerListings, buyerListings, fetchCollateralPreview]);

  const handleChooseToken = (listingId, tokenKey) => {
    setChosenTokens(prev => ({
      ...prev,
      [listingId]: tokenKey
    }));

    if (!collateralPreviews[listingId]?.[tokenKey]) {
      fetchCollateralPreview(listingId, tokenKey);
    }
  };

  const handleApprove = async (listingId, listing) => {
    if (!account) {
      toast.error(t('connectPrompt'));
      return;
    }

    if (!contract || !signer) {
      toast.error(t('connectPrompt'));
      return;
    }

    const status = Number(listing.status);
    const lid = listing?.id ?? listing?.listingId ?? null;

    // ====================================================================
    // BL/blacklist precheck — FAQAT xaridor tasdiqlanda.
    //
    // Kontrakt qoidalari:
    //   status === 2 (pendingSellerN): sotuvchi garovsiz e'lon bergan
    //                                  -> tasdiqlovchi = XARIDOR
    //                                  -> BL kerak (DUR x 10)
    //   status === 3 (pendingBuyerN):  xaridor garovsiz e'lon bergan
    //                                  -> tasdiqlovchi = SOTUVCHI
    //                                  -> BL kerak EMAS
    // ====================================================================
    const isApproverBuyer = !listing.isCollateral && status === 2;

    if (isApproverBuyer) {
      const c0 = readOnlyContract || contract;
      if (c0) {
        try {
          // 1) Blacklist tekshirish
          let isBL = false;
          try {
            isBL = await c0.isBlacklisted(account);
          } catch (_) {}

          if (isBL) {
            toast.error(
              "Wallet blacklist holatida. Avval mavjud default qarzlarni to'lang."
            );
            return;
          }

          // 2) Required BL = DUR × 10
          const durRaw = listing.durAmount;
          const requiredBLRaw = durRaw * 10n;

          // 3) freeTotalBL — band qilinmagan BL
          const freeBLRaw = await c0.freeTotalBL(account);

          if (freeBLRaw < requiredBLRaw) {
            const freeFmt = parseFloat(
              ethers.formatUnits(freeBLRaw, 18)
            ).toFixed(2);
            const needFmt = parseFloat(
              ethers.formatUnits(requiredBLRaw, 18)
            ).toFixed(2);

            toast.error(
              `BL yetarli emas. Sizning bo'sh BL: ${freeFmt}, kerak: ${needFmt}.`
            );
            return;
          }
        } catch (precheckErr) {
          // Precheck o'zi xato bersa — to'xtatmaymiz
          console.warn('BL precheck failed (davom etamiz):', precheckErr);
        }
      }
    }

    let chosenTokenId = 0;

    if (listing.isCollateral && status === 0) {
      const chosenKey = chosenTokens[listingId];

      if (!chosenKey) {
        toast.error('Garov tokenini tanlang!');
        return;
      }

      chosenTokenId = TOKEN_IDS[chosenKey];

      const colAmt = await contract.getCollateralAmount(listingId, chosenTokenId);
      await ensureApproval(chosenKey, colAmt);
    }

    if (status === 1 || status === 3) {
      await ensureApproval('DUR', listing.durAmount);
    }

    setActionLoading(listingId);

    const toastId = toast.loading(t('listingsApproving'));

    try {
            await ensureCorrectChain();

      // Narx farqini oldindan tekshirish (Metamask ochilmasdan oldin)
      if (listing.isCollateral) {
        const deviationBps = Number(listing.creatorMaxDeviationBps) || 300;
        if (deviationBps > 0) {
          const tokenKey = status === 0 ? chosenTokens[listingId] : COLLATERAL_TOKENS[listing.collateralTokenId];
          if (tokenKey) {
            const tokenId = TOKEN_IDS[tokenKey];
            const lockedPrice = listing.lockedPrices?.[tokenId] ? Number(listing.lockedPrices[tokenId]) : 0;
            const currentPrice = currentPrices[tokenKey] || 0;
            if (lockedPrice > 0 && currentPrice > 0) {
              const diffBps = Math.round(Math.abs(currentPrice - lockedPrice) / lockedPrice * 10000);
              if (diffBps > deviationBps) {
                toast.error('Narx farqi cheklovdan oshib ketdi. Qayta urining.');
                setActionLoading(null);
                toast.dismiss(toastId);
                return;
              }
            }
          }
        }
      }

      openWalletForRequest && openWalletForRequest();

      openWalletForRequest && openWalletForRequest();
      // Narx farqi cheklovi Settings sahifasidan o'qiladi (localStorage)
      const txPromise = contract.connect(signer).approveListing(listingId, chosenTokenId, Number(listing.creatorMaxDeviationBps) || 300);
      const tx = await withProgressToast(
        withWalletTimeout(
          txPromise,
          90000,
          'MetaMask ochilmadi yoki wallet javob bermadi'
        ),
        toastId,
        [
          [8000, "MetaMask'da tasdiqlashni kuting..."],
          [20000, "Sekin tarmoq — MetaMask'ni oching va tasdiqlang"],
          [45000, "Hali kutilmoqda. MetaMask ilovasini qayta oching."],
        ]
      );

      const receipt = await withProgressToast(
        withWalletTimeout(
          tx.wait(),
          180000,
          'Transaction blockchain\'da juda uzoq tasdiqlanmoqda'
        ),
        toastId,
        [
          [10000, "Blockchain'da tasdiqlanmoqda..."],
          [40000, "Optimism tarmog'i band bo'lishi mumkin..."],
        ]
      );

      saveLocalTxHistory({
        type: 'listingApprove',
        label: 'Listings transaction',
        listingId: lid !== null ? lid.toString() : null,
        txHash: receipt?.hash || tx?.hash,
        status: 'success',
        account: account || '',
        extra: '',
      });

      toast.success(t('listingsApproved'), { id: toastId });

      fetchListings();
      refreshBalances();
    } catch (e) {
      const userMsg = getFriendlyTxError(e, t('errorOccurred'));

      console.error('approve listing error:', e);
      toast.error(userMsg, { id: toastId });
      return;
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (listingId, listing) => {
    if (!account) {
      toast.error(t('connectPrompt'));
      return;
    }

    if (!contract || !signer) {
      toast.error(t('connectPrompt'));
      return;
    }

    const lid = listing?.id ?? listing?.listingId ?? null;

    setActionLoading(listingId);

    const toastId = toast.loading('Bekor qilinmoqda...');

    try {
      await ensureCorrectChain();

            // Narx farqini oldindan tekshirish
      openWalletForRequest && openWalletForRequest();

      const txPromise = contract.connect(signer).cancelListing(listingId);
      const tx = await withProgressToast(
        withWalletTimeout(
          txPromise,
          90000,
          'MetaMask ochilmadi yoki wallet javob bermadi'
        ),
        toastId,
        [
          [8000, "MetaMask'da tasdiqlashni kuting..."],
          [20000, "Sekin tarmoq — MetaMask'ni oching va tasdiqlang"],
        ]
      );

      const receipt = await withProgressToast(
        withWalletTimeout(
          tx.wait(),
          180000,
          'Transaction blockchain\'da juda uzoq tasdiqlanmoqda'
        ),
        toastId,
        [
          [10000, "Blockchain'da tasdiqlanmoqda..."],
        ]
      );

      saveLocalTxHistory({
        type: 'listingCancel',
        label: 'Listings cancel',
        listingId: lid !== null ? lid.toString() : null,
        txHash: receipt?.hash || tx?.hash,
        status: 'success',
        account: account || '',
        extra: '',
      });

      const status = Number(listing.status);

      const msg = status === 1
        ? "E'lon bekor qilindi! Garov hamyoningizga qaytarildi."
        : "E'lon bekor qilindi!";

      toast.success(msg, { id: toastId });

      fetchListings();
      refreshBalances();
    } catch (e) {
      const userMsg = getFriendlyTxError(e, t('errorOccurred'));
      console.error('cancel listing error:', e);
      toast.error(userMsg, { id: toastId });
    } finally {
      setActionLoading(null);
    }
  };

  const currentList = tab === 'seller' ? sellerListings : buyerListings;

  const filteredList = currentList.filter(listing => {
    if (filterType === 'collateral' && !listing.isCollateral) return false;
    if (filterType === 'nocollateral' && listing.isCollateral) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();

      const id = String(Number(listing.id));
      const seller = (listing.seller || '').toLowerCase();
      const buyer = (listing.buyer || '').toLowerCase();
      const dur = durFmt(listing.durAmount);
      const usdc = usdtFmt(listing.priceUSDC);

      if (
        !id.includes(q) &&
        !seller.includes(q) &&
        !buyer.includes(q) &&
        !dur.includes(q) &&
        !usdc.includes(q)
      ) {
        return false;
      }
    }

    return true;
  });

  return (
    <div>
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}
      >
        <div>
          <h1 className="page-title">{t('listingsTitle')}</h1>
          <p className="page-subtitle">{t('listingsSubtitle')}</p>
        </div>

        <button
          className="btn btn-outline btn-sm"
          onClick={fetchListings}
          disabled={loading}
        >
          <RefreshCw size={14} /> {t('approvedRefresh')}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '12px'
        }}
      >
        {[
          { key: 'seller', label: t('listingsSellerTab'), count: sellerListings.length },
          { key: 'buyer', label: t('listingsBuyerTab'), count: buyerListings.length }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`btn ${tab === key ? 'btn-primary' : 'btn-outline'}`}
          >
            {label}

            <span
              style={{
                background: tab === key ? 'rgba(255,255,255,0.2)' : 'var(--border)',
                padding: '0 7px',
                borderRadius: '10px',
                fontSize: '12px'
              }}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: 1,
            minWidth: '180px'
          }}
        >
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />

          <input
            className="input"
            placeholder={t('searchPlaceholder') || 'ID, manzil yoki miqdor...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: '32px',
              fontSize: '13px'
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: '4px'
          }}
        >
          {[
            { key: 'all', label: t('filterAll') || 'Barchasi' },
            { key: 'collateral', label: 'Garovli' },
            { key: 'nocollateral', label: 'Garovsiz' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={`btn btn-sm ${filterType === f.key ? 'btn-primary' : 'btn-outline'}`}
              style={{
                fontSize: '12px',
                padding: '5px 10px'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px',
            color: 'var(--text-muted)'
          }}
        >
          <div
            className="spinner"
            style={{
              margin: '0 auto 12px',
              width: 24,
              height: 24,
              borderWidth: 3
            }}
          />

          {t('loading')}
        </div>
      ) : filteredList.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '48px'
          }}
        >
          <List
            size={32}
            color="var(--text-muted)"
            style={{
              marginBottom: 12
            }}
          />

          <p style={{ color: 'var(--text-secondary)' }}>
            {t('listingsEmpty')}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {filteredList.map(listing => {
            const id = Number(listing.id);
            const status = Number(listing.status);

            const isSeller = listing.seller?.toLowerCase() === account?.toLowerCase();
            const isBuyer = listing.buyer?.toLowerCase() === account?.toLowerCase();
            const isOwner = isSeller || isBuyer;
            const canApprove = !isOwner;

            const isPendingBuyerCollateral = status === 1 && listing.isCollateral;

            const lockedTokenName = isPendingBuyerCollateral
              ? (COLLATERAL_TOKENS[Number(listing.collateralTokenId)] || '')
              : '';

            const lockedColAmt = isPendingBuyerCollateral && listing.collateralAmount > 0
              ? formatTokenAmount(
                  ethers.formatUnits(
                    listing.collateralAmount,
                    TOKEN_DECIMALS[lockedTokenName] || 18
                  )
                )
              : null;

            const buyerPriceDiff = isPendingBuyerCollateral && lockedTokenName
              ? calcPriceDiff(
                  listing,
                  lockedTokenName,
                  Number(listing.collateralTokenId),
                  currentPrices
                )
              : {
                  pctDiff: null,
                  isUp: false,
                  isDown: false
                };

            const isPendingSellerCollateral = status === 0 && listing.isCollateral;

            const acceptedTokens = isPendingSellerCollateral
              ? tokensFromMask(Number(listing.collateralMask))
              : [];

            const chosenKey = chosenTokens[id];

            return (
              <div key={id} className="card">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      flex: 1
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <span
                        className="mono"
                        style={{
                          color: 'var(--accent-bright)',
                          fontWeight: 700
                        }}
                      >
                        #{id}
                      </span>

                      <span
                        className="badge"
                        style={{
                          background: listing.isCollateral ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                          color: listing.isCollateral ? 'var(--success)' : 'var(--warning)',
                          border: `1px solid ${listing.isCollateral ? 'var(--success)' : 'var(--warning)'}`,
                          fontSize: '11px'
                        }}
                      >
                        {listing.isCollateral
                          ? t('listingsCollateral')
                          : t('listingsNoCollateral')}
                      </span>

                      <span className="badge badge-warning">
                        {getStatusLabel(status, t)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '20px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)'
                          }}
                        >
                          DUR
                        </div>

                        <div
                          className="mono"
                          style={{
                            color: 'var(--dur-color)',
                            fontWeight: 600
                          }}
                        >
                          {durFmt(listing.durAmount)}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)'
                          }}
                        >
                          USDC
                        </div>

                        <div
                          className="mono"
                          style={{
                            color: 'var(--usdt-color)',
                            fontWeight: 600
                          }}
                        >
                          {usdtFmt(listing.priceUSDC)}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)'
                          }}
                        >
                          {t('listingsColSeller')}
                        </div>

                        <AddrCell addr={listing.seller} />
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)'
                          }}
                        >
                          {t('listingsColBuyer')}
                        </div>

                        <AddrCell addr={listing.buyer} />
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)'
                          }}
                        >
                          {t('listingsColPeriod')}
                        </div>

                        <div style={{ fontSize: '13px' }}>
                          {Number(listing.paymentPeriod)} {t('days')}
                        </div>
                      </div>
                    </div>

                    {isPendingSellerCollateral && acceptedTokens.length > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Lock size={11} color="var(--warning)" />
                          E'lon paytidagi narx bo'yicha garov miqdorlari:
                        </div>
                        
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px'
                          }}
                        >
                          {acceptedTokens.map(tk => {
                            const amt = collateralPreviews[id]?.[tk];
                            const isLoading = previewLoading[`${id}_${tk}`];
                            const color = TOKEN_COLORS[tk];

                            const tokenId = TOKEN_IDS[tk];
                            const priceDiff = calcPriceDiff(listing, tk, tokenId, currentPrices);

                            return (
                              <div
                                key={tk}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '7px',
                                  fontSize: '12px',
                                  background: `${color}15`,
                                  border: `1px solid ${color}40`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 700,
                                    color
                                  }}
                                >
                                  {tk}
                                </span>

                                <span
                                  style={{
                                    color: 'var(--text-primary)',
                                    fontFamily: 'Space Mono, monospace',
                                    fontWeight: 600
                                  }}
                                >
                                  {isLoading ? '...' : amt ? amt : '—'}
                                </span>

                                <PriceDiffBadge
  maxDeviationPct={Number(Number(listing.creatorMaxDeviationBps) || 300).toFixed(2)}
  pctDiff={priceDiff.pctDiff}
  isUp={priceDiff.isUp}
  isDown={priceDiff.isDown}
/>
                              </div>
                            );
                          })}
                        </div>

                        <div
                          style={{
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                            marginTop: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <AlertCircle size={10} />
                          Narxlar e'lon berilgan vaqtda lock qilingan — hozirgi bozor narxidan farq qilishi mumkin
                        </div>
                      </div>
                    )}

                    {isPendingBuyerCollateral && lockedTokenName && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '4px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <Lock size={12} color="var(--success)" />

                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)'
                          }}
                        >
                          Contractdagi garov:
                        </span>

                        <span
                          style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: `${TOKEN_COLORS[lockedTokenName]}20`,
                            color: TOKEN_COLORS[lockedTokenName],
                            border: `1px solid ${TOKEN_COLORS[lockedTokenName]}40`,
                            fontWeight: 700,
                            fontFamily: 'Space Mono, monospace',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                                                    {lockedColAmt ? `${lockedColAmt} ` : ''}
                          {lockedTokenName}

                          <PriceDiffBadge
                            maxDeviationPct={Number(Number(listing.creatorMaxDeviationBps) || 300).toFixed(2)}
                            pctDiff={buyerPriceDiff.pctDiff}
                            isUp={buyerPriceDiff.isUp}
                            isDown={buyerPriceDiff.isDown}
                          />
                        </span>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      alignItems: 'flex-end'
                    }}
                  >
                    {canApprove && isPendingSellerCollateral && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          alignItems: 'flex-end'
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)'
                          }}
                        >
                          Garov tokenini tanlang:
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            gap: '4px',
                            flexWrap: 'wrap',
                            justifyContent: 'flex-end'
                          }}
                        >
                          {acceptedTokens.map(tk => {
                            const amt = collateralPreviews[id]?.[tk];
                            const color = TOKEN_COLORS[tk];

                            return (
                              <button
                                key={tk}
                                onClick={() => handleChooseToken(id, tk)}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  background: chosenKey === tk ? `${color}20` : 'transparent',
                                  fontWeight: chosenKey === tk ? 700 : 500,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '1px'
                                }}
                              >
                                <span>{tk}</span>

                                {amt && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      opacity: 0.8
                                    }}
                                  >
                                    {amt}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {chosenKey && collateralPreviews[id]?.[chosenKey] && (
                          <div
                            style={{
                              fontSize: '12px',
                              textAlign: 'right',
                              padding: '6px 10px',
                              borderRadius: '7px',
                              background: `${TOKEN_COLORS[chosenKey]}15`,
                              border: `1px solid ${TOKEN_COLORS[chosenKey]}40`
                            }}
                          >
                            <div
                              style={{
                                color: TOKEN_COLORS[chosenKey],
                                fontWeight: 700,
                                fontFamily: 'Space Mono, monospace'
                              }}
                            >
                              {collateralPreviews[id][chosenKey]} {chosenKey}
                            </div>

                            <div
                              style={{
                                fontSize: '10px',
                                color: 'var(--text-muted)',
                                marginTop: '2px'
                              }}
                            >
                              Hamyonda: {parseFloat(walletBalances?.[chosenKey] || '0')} {chosenKey}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {canApprove && isPendingBuyerCollateral && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--success)',
                          textAlign: 'right',
                          maxWidth: '150px'
                        }}
                      >
                        ✓ Garov contractda saqlangan. Faqat DUR approve kerak.
                      </div>
                    )}

                    {canApprove && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleApprove(id, listing)}
                        disabled={
                          actionLoading === id ||
                          (isPendingSellerCollateral && !chosenTokens[id])
                        }
                      >
                        {actionLoading === id
                          ? <div className="spinner" style={{ width: 13, height: 13 }} />
                          : <CheckCircle size={13} />
                        }

                        {t('listingsApprove')}

                        {isPendingSellerCollateral && !chosenTokens[id] && (
                          <span
                            style={{
                              fontSize: '10px',
                              opacity: 0.7
                            }}
                          >
                            (token tanlang)
                          </span>
                        )}
                      </button>
                    )}

                    {isOwner && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{
                          color: 'var(--danger)',
                          borderColor: 'var(--danger)'
                        }}
                        onClick={() => handleCancel(id, listing)}
                        disabled={actionLoading === id}
                      >
                        {actionLoading === id
                          ? <div className="spinner" style={{ width: 13, height: 13 }} />
                          : <XCircle size={13} />
                        }

                        Bekor qilish
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}













