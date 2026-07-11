import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useLang } from '../hooks/useLang';
import { COLLATERAL_TOKENS, TOKEN_COLORS } from '../abi/contract';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, TOKEN_ADDRESSES, ERC20_ABI, ARBITRUM_ONE } from '../abi/contract';
import toast from 'react-hot-toast';
import { saveLocalTxHistory } from '../utils/localTxHistory';
import {
  CheckCircle,
  RefreshCw,
  CreditCard,
  Shield,
  AlertTriangle,
  Copy,
  Check,
  Clock,
  Ban
} from 'lucide-react';

// ====================================================================
//  withWalletTimeout — har tx.wait() chaqiruvi uchun timeout o'rovchisi
// ====================================================================
function withWalletTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message || 'Wallet javob bermadi')), ms);
    }),
  ]);
}

function AddrCell({ addr }) {
  const [copied, setCopied] = React.useState(false);

  if (!addr || addr === ethers.ZeroAddress) {
    return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }

  const short = addr.slice(0, 6) + '...' + addr.slice(-4);

  const copy = () => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span className="address" title={addr}>{short}</span>
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
    </span>
  );
}

function durFmt(r) {
  try {
    return parseFloat(ethers.formatUnits(r, 18)).toLocaleString(undefined, {
      maximumFractionDigits: 4
    });
  } catch {
    return '0';
  }
}

function usdcFmt(r) {
  try {
    return parseFloat(ethers.formatUnits(r, 6)).toLocaleString(undefined, {
      maximumFractionDigits: 2
    });
  } catch {
    return '0';
  }
}

function collateralTokenName(tokenId) {
  return COLLATERAL_TOKENS[tokenId] || `Token#${tokenId}`;
}

function isSameAddress(a, b) {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
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


export default function Approved() {
  const handleMakePayment = async (listing) => {
  const id = listing.id;
  if (!contract || !signer) return toast.error('Wallet ulanmagan');
  const toastId = toast.loading('To‘lov amalga oshirilmoqda...');
  try {
    const tx = await contract.connect(signer).makePayment(id);
    await tx.wait();
    toast.success('To‘lov muvaffaqiyatli!', { id: toastId });
    refreshAll();
  } catch (e) {
    console.error('makePayment error:', e);
    toast.error('To‘lov amalga oshmadi', { id: toastId });
  }
};
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

  const [listings, setListings] = useState([]);
  const [defaultListings, setDefaultListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [defaultLoading, setDefaultLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchApproved = useCallback(async () => {
    const c = contract || readOnlyContract;
    if (!c) return;

    setLoading(true);

    try {
      const rows = await c.getApprovedListings(0, 100);
      setListings(rows);
    } catch (e) {
      console.error('fetchApproved error:', e);
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  }, [contract, readOnlyContract, t]);

  const fetchDefaultListings = useCallback(async () => {
    const c = contract || readOnlyContract;
    if (!c) return;

    setDefaultLoading(true);

    try {
      const next = await c.nextListingId();
      const total = Number(next.toString());

      const arr = [];

      for (let i = 0; i < total; i++) {
        try {
          const item = await c.getListingById(i);

          const status = Number(item.status);
          const buyerIsMe = account && isSameAddress(item.buyer, account);
          const sellerIsMe = account && isSameAddress(item.seller, account);

          // V5 status 7 = Defaulted
          // Buyer uchun keyin to'lash, seller uchun default tarixini ko'rish
          const isExpired = Number(item.dueDate) * 1000 < Date.now();
if ((status === 7 || (status === 4 && isExpired)) && !item.isCollateral && (buyerIsMe || sellerIsMe)) {
            arr.push(item);
          }
        } catch (innerErr) {
          console.warn('getListingById skipped:', i, innerErr);
        }
      }

      arr.sort((a, b) => Number(b.id) - Number(a.id));
      setDefaultListings(arr);
    } catch (e) {
      console.error('fetchDefaultListings error:', e);
      toast.error(t('errorOccurred'));
    } finally {
      setDefaultLoading(false);
    }
  }, [contract, readOnlyContract, account, t]);

  const refreshAll = useCallback(async () => {
    await fetchApproved();
    await fetchDefaultListings();
  }, [fetchApproved, fetchDefaultListings]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const timeLeft = (dueDate) => {
    const now = Math.floor(Date.now() / 1000);
    const due = Number(dueDate);
    const diff = due - now;

    if (diff <= 0) {
      return {
        expired: true,
        text: t('approvedExpired') || "Muddati o'tgan"
      };
    }

    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;

    if (d > 0) {
      return {
        expired: false,
        text: `${d} ${t('approvedDays')} ${h} ${t('approvedHours')} ${t('approvedTimeLeft')}`
      };
    }

    if (h > 0) {
      return {
        expired: false,
        text: `${h} ${t('approvedHours')} ${m} daqiqa ${t('approvedTimeLeft')}`
      };
    }

    if (m > 0) {
      return {
        expired: false,
        text: `${m} daqiqa ${s} soniya ${t('approvedTimeLeft')}`
      };
    }

    return {
      expired: false,
      text: `${s} soniya ${t('approvedTimeLeft')}`
    };
  };

  // ====================================================================
  //  doPayment — xaridor to'lov qiladi (faol shartnoma)
  // ====================================================================
  const doPayment = async (listing) => {
    if (!account) return toast.error(t('connectPrompt'));
    if (!signer) return toast.error(t('connectPrompt'));

    const id = Number(listing.id);
    const lid = listing?.id ?? listing?.listingId ?? null;

    setActionLoading(`pay-${id}`);

    const tid = toast.loading(t('clPaymentProcessing'));

    try {
      // 1) Tarmoq Arbitrum ekanligini tasdiqlash
      await ensureCorrectChain();

      // 2) USDC approve (ensureApproval ichida polling bor — allowance
      //    blockchain'da tasdiqlanmaguncha kutadi)
      await ensureApproval('USDC', listing.priceUSDC);

      // 3) Asosiy tx — wallet'ni oldindan ochib qo'yish (mobile uchun)
      openWalletForRequest && openWalletForRequest();

      const txPromise = contract.connect(signer).makePayment(id);
      const tx = await withProgressToast(
        withWalletTimeout(
          txPromise,
          90000,
          'MetaMask ochilmadi yoki wallet javob bermadi'
        ),
        tid,
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
        tid,
        [
          [10000, "Blockchain'da tasdiqlanmoqda..."],
          [40000, "Arbitrum tarmog'i band bo'lishi mumkin..."],
        ]
      );

      saveLocalTxHistory({
        type: 'payment',
        label: 'Payment made',
        listingId: lid !== null ? lid.toString() : null,
        txHash: receipt?.hash || tx?.hash,
        status: 'success',
        account: account || '',
        extra: '',
      });

      toast.success(t('approvedPaySuccess'), { id: tid });

      await refreshAll();
      refreshBalances();
    } catch (e) {
      const msg = (e?.reason || e?.shortMessage || e?.message || '').toString();
      const lower = msg.toLowerCase();

      if (lower.includes('user rejected') || lower.includes('rejected')) {
        toast.error(t('walletRejected'), { id: tid });
      } else if (lower.includes('insufficient') || lower.includes('exceeds')) {
        toast.error(t('approvedUSDCInsufficient'), { id: tid });
      } else if (lower.includes('timeout') || lower.includes('javob bermadi')) {
        toast.error('Wallet javob bermadi. Qaytadan urinib ko\'ring.', { id: tid });
      } else {
        console.error('makePayment error:', e);
        toast.error(t('errorOccurred'), { id: tid });
      }
    } finally {
      setActionLoading(null);
    }
  };

  // ====================================================================
  //  doClaimDefault — sotuvchi muddati o'tgan e'londan garov/blacklist olib qo'yadi
  //  V5: garovli va garovsiz default uchun bitta claimDefault()
  // ====================================================================
  const doClaimDefault = async (listing) => {
    if (!account) return toast.error(t('connectPrompt'));
    if (!signer) return toast.error(t('connectPrompt'));

    const id = Number(listing.id);
    const lid = listing?.id ?? listing?.listingId ?? null;

    setActionLoading(`claim-${id}`);

    const tid = toast.loading('...');

    try {
      await ensureCorrectChain();

      openWalletForRequest && openWalletForRequest();

      const txPromise = contract.connect(signer).claimDefault(id);
      const tx = await withProgressToast(
        withWalletTimeout(
          txPromise,
          90000,
          'MetaMask ochilmadi yoki wallet javob bermadi'
        ),
        tid,
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
        tid,
        [
          [10000, "Blockchain'da tasdiqlanmoqda..."],
          [40000, "Arbitrum tarmog'i band bo'lishi mumkin..."],
        ]
      );

      saveLocalTxHistory({
        type: 'defaultClaim',
        label: 'Default claimed',
        listingId: lid !== null ? lid.toString() : null,
        txHash: receipt?.hash || tx?.hash,
        status: 'success',
        account: account || '',
        extra: '',
      });

       saveLocalTxHistory({
  type: 'listingDefault',
  label: 'Default claim',
  listingId: id !== null ? id.toString() : null,
  hash: receipt.hash,
  date: new Date().toISOString()
});

toast.success(t('approvedClaimDefaultSuccess') || 'Default claim muvaffaqiyatli bajarildi!', { id: toastId });

      await refreshAll();
      refreshBalances();
    } catch (e) {
      const msg = (e?.reason || e?.shortMessage || e?.message || '').toString();
      const lower = msg.toLowerCase();

      if (lower.includes('user rejected') || lower.includes('rejected')) {
        toast.error(t('walletRejected'), { id: tid });
      } else if (lower.includes('timeout') || lower.includes('javob bermadi')) {
        toast.error('Wallet javob bermadi. Qaytadan urinib ko\'ring.', { id: tid });
      } else {
        console.error('claimDefault error:', e);
        toast.error(msg || t('errorOccurred'), { id: tid });
      }
    } finally {
      setActionLoading(null);
    }
  };

  // ====================================================================
  //  doPayAfterDefault — buyer garovsiz default qarzni keyin to'laydi (V5)
  // ====================================================================
  const doPayAfterDefault = async (listing) => {
    if (!account) return toast.error(t('connectPrompt'));
    if (!signer) return toast.error(t('connectPrompt'));

    const id = Number(listing.id);
    const lid = listing?.id ?? listing?.listingId ?? null;

    if (listing.isCollateral) {
      return toast.error("Garov sellerga o'tib bo‘lgan, qo‘shimcha to‘lov kerak emas");
    }

    setActionLoading(`after-${id}`);

    const tid = toast.loading(t('clPaymentProcessing'));

    try {
      await ensureCorrectChain();

      await ensureApproval('USDC', listing.priceUSDC);

      openWalletForRequest && openWalletForRequest();

      const txPromise = contract.connect(signer).payAfterDefault(id);
      const tx = await withProgressToast(
        withWalletTimeout(
          txPromise,
          90000,
          'MetaMask ochilmadi yoki wallet javob bermadi'
        ),
        tid,
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
        tid,
        [
          [10000, "Blockchain'da tasdiqlanmoqda..."],
          [40000, "Arbitrum tarmog'i band bo'lishi mumkin..."],
        ]
      );

      saveLocalTxHistory({
        type: 'payAfterDefault',
        label: 'Paid after default',
        listingId: lid !== null ? lid.toString() : null,
        txHash: receipt?.hash || tx?.hash,
        status: 'success',
        account: account || '',
        extra: '',
      });

      toast.success(
        t('payAfterDefaultSuccess') || 'Default qarz to‘landi!',
        { id: tid }
      );

      await refreshAll();
      refreshBalances();
    } catch (e) {
      const msg = (e?.reason || e?.shortMessage || e?.message || '').toString();
      const lower = msg.toLowerCase();

      if (lower.includes('user rejected') || lower.includes('rejected')) {
        toast.error(t('walletRejected'), { id: tid });
      } else if (lower.includes('insufficient') || lower.includes('exceeds')) {
        toast.error(t('approvedUSDCInsufficient'), { id: tid });
      } else if (lower.includes('timeout') || lower.includes('javob bermadi')) {
        toast.error('Wallet javob bermadi. Qaytadan urinib ko\'ring.', { id: tid });
      } else {
        toast.error(msg || t('errorOccurred'), { id: tid });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const renderListingCard = (listing) => {
    const id = Number(listing.id);
    const isBuyer = isSameAddress(listing.buyer, account);
    const isSeller = isSameAddress(listing.seller, account);
    const time = timeLeft(listing.dueDate);

    const colTokenName = listing.isCollateral
      ? collateralTokenName(Number(listing.collateralTokenId))
      : '';

    const colColor = TOKEN_COLORS[colTokenName] || 'var(--text-muted)';

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                  background: listing.isCollateral
                    ? 'rgba(16,185,129,0.1)'
                    : 'rgba(245,158,11,0.1)',
                  color: listing.isCollateral
                    ? 'var(--success)'
                    : 'var(--warning)',
                  border: `1px solid ${
                    listing.isCollateral ? 'var(--success)' : 'var(--warning)'
                  }`
                }}
              >
                {listing.isCollateral ? 'Collateral' : 'No Collateral'}
              </span>

              {listing.isCollateral && (
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: `${colColor}20`,
                    color: colColor,
                    border: `1px solid ${colColor}40`,
                    fontWeight: 600
                  }}
                >
                  {t('approvedCollateralLabel')} {colTokenName}
                </span>
              )}

              {isBuyer && (
                <span className="badge badge-accent">
                  {t('approvedYouBuyer')}
                </span>
              )}

              {isSeller && (
                <span className="badge badge-muted">
                  {t('approvedYouSeller')}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
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
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  USDC
                </div>
                <div
                  className="mono"
                  style={{
                    color: 'var(--usdt-color)',
                    fontWeight: 600
                  }}
                >
                  {usdcFmt(listing.priceUSDC)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {t('listingsColSeller')}
                </div>
                <div className="address">
                  <AddrCell addr={listing.seller} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {t('listingsColBuyer')}
                </div>
                <div className="address">
                  <AddrCell addr={listing.buyer} />
                </div>
              </div>
            </div>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                width: 'fit-content',
                background: time.expired
                  ? 'var(--danger-glow)'
                  : 'var(--success-glow)',
                color: time.expired ? 'var(--danger)' : 'var(--success)',
                border: `1px solid ${
                  time.expired ? 'var(--danger)' : 'var(--success)'
                }`
              }}
            >
              {time.expired ? (
                <AlertTriangle size={12} />
              ) : (
                <CheckCircle size={12} />
              )}
              {time.text}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              alignItems: 'flex-end'
            }}
          >
            {isBuyer  && (
              <button
                className="btn btn-success"
                disabled={actionLoading === `pay-${id}`}
                onClick={() => doPayment(listing)}
              >
                {actionLoading === `pay-${id}` ? (
                  <div className="spinner" />
                ) : (
                  <CreditCard size={15} />
                )}
                {t('approvedPay')}
              </button>
            )}
            {isBuyer && time.expired && listing.isCollateral && (
  <>
    <button
      className="btn btn-warning"
      disabled={actionLoading === `claim-${id}`}
      onClick={() => {
        const ok = window.confirm(
          "Diqqat: \"Ortiqcha garovni qaytarish\" ni bossangiz, to'lov qilinmaydi va sotuvchi qarz miqdoricha garovni oladi. Eng muhimi — bu sotuvchi bilan yiqqan Business Level (BL) ballingiz 0 ga tushadi.\n\nAgar BL ni saqlamoqchi bo'lsangiz, buning o'rniga \"To'lov qilish\" ni tanlang.\n\nDavom etasizmi?"
        );
        if (ok) doClaimDefault(listing);
      }}
      style={{ marginTop: '8px' }}
    >
      Ortiqcha garovni qaytarish (Claim)
    </button>
    <div style={{ fontSize: '11px', color: 'var(--warning)', maxWidth: '220px', textAlign: 'right', marginTop: '4px' }}>
      Eslatma: bu BL ballingizni 0 ga tushiradi.
    </div>
  </>
)}

                        {isSeller && time.expired && (
              <button
                className="btn btn-danger"
                disabled={actionLoading === `claim-${id}`}
                onClick={() => doClaimDefault(listing)}
              >
                {t('approvedClaimDefault') || 'Default claim qilish'}
              </button>
            )}

            {isSeller && time.expired && listing.isCollateral && (
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  maxWidth: '220px',
                  textAlign: 'right'
                }}
              >
                Garov sellerga o'tadi, buyer blacklistga tushmaydi.
              </div>
            )}

            {isSeller && time.expired && !listing.isCollateral && (
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  maxWidth: '220px',
                  textAlign: 'right'
                }}
              >
                Muddati o'tdi. Default claim qilsangiz, buyer qora ro'yxatga tushadi.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDefaultCard = (listing) => {
    const id = Number(listing.id);
    const isBuyer = isSameAddress(listing.buyer, account);
    const isSeller = isSameAddress(listing.seller, account);

    const colTokenName = listing.isCollateral
      ? collateralTokenName(Number(listing.collateralTokenId))
      : '';

    return (
      <div key={`default-${id}`} className="card" style={{ borderColor: 'var(--danger)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                  color: 'var(--danger)',
                  fontWeight: 700
                }}
              >
                #{id}
              </span>

              <span
                className="badge"
                style={{
                  background: 'var(--danger-glow)',
                  color: 'var(--danger)',
                  border: '1px solid var(--danger)'
                }}
              >
                <Ban size={12} /> To'lanmagan
              </span>

              <span
                className="badge"
                style={{
                  background: listing.isCollateral
                    ? 'rgba(16,185,129,0.1)'
                    : 'rgba(245,158,11,0.1)',
                  color: listing.isCollateral
                    ? 'var(--success)'
                    : 'var(--warning)',
                  border: `1px solid ${
                    listing.isCollateral ? 'var(--success)' : 'var(--warning)'
                  }`
                }}
              >
                {listing.isCollateral ? 'Collateral' : 'No Collateral'}
              </span>

              {isBuyer && (
                <span className="badge badge-accent">
                  {t('approvedYouBuyer')}
                </span>
              )}

              {isSeller && (
                <span className="badge badge-muted">
                  {t('approvedYouSeller')}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
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
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  USDC
                </div>
                <div
                  className="mono"
                  style={{
                    color: 'var(--usdt-color)',
                    fontWeight: 600
                  }}
                >
                  {usdcFmt(listing.priceUSDC)}
                </div>
              </div>

              {listing.isCollateral && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Garov
                  </div>
                  <div className="mono" style={{ fontWeight: 600 }}>
                    {colTokenName}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {t('listingsColSeller')}
                </div>
                <div className="address">
                  <AddrCell addr={listing.seller} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {t('listingsColBuyer')}
                </div>
                <div className="address">
                  <AddrCell addr={listing.buyer} />
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                width: 'fit-content',
                background: 'var(--danger-glow)',
                color: 'var(--danger)',
                border: '1px solid var(--danger)'
              }}
            >
              <Clock size={12} />
              {listing.isCollateral
                ? "Garov sellerga o'tadi, buyer blacklistga tushmaydi."
                : (Number(listing.status) === 7
                    ? "Buyer blacklistga tushgan."
                    : "Muddati o'tdi — default claim qilinishi kutilmoqda.")}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              alignItems: 'flex-end'
            }}
          >
            {isBuyer && !listing.isCollateral && Number(listing.status) === 7 && (
              <button
                className="btn btn-success"
                disabled={actionLoading === `after-${id}`}
                onClick={() => doPayAfterDefault(listing)}
                style={{
                  fontSize: '12px',
                  lineHeight: '1.25',
                  padding: '8px 12px',
                  maxWidth: '180px',
                  whiteSpace: 'normal',
                  textAlign: 'left',
                }}
              >
                {actionLoading === `after-${id}` ? (
                  <div className="spinner" style={{ flexShrink: 0 }} />
                ) : (
                  <CreditCard size={15} style={{ flexShrink: 0 }} />
                )}
                Qarzni to‘lab qora ro‘yxatdan chiqish
              </button>
            )}

            {isBuyer && !listing.isCollateral && Number(listing.status) !== 7 && (
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  maxWidth: '240px',
                  textAlign: 'right'
                }}
              >
                Muddati o'tdi. Seller default claim qilmaguncha to'lov kutilmoqda.
              </div>
            )}

            {isBuyer && listing.isCollateral && (
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  maxWidth: '240px',
                  textAlign: 'right'
                }}
              >
                Garov sellerga o'tib bo‘lgan.
              </div>
            )}

            {isSeller && (
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  maxWidth: '240px',
                  textAlign: 'right'
                }}
              >
                {Number(listing.status) === 7
                  ? "Default claim bajarilgan."
                  : "Expired — claim this listing's default from the \"Active Contracts\" section."}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const pageIsLoading = loading || defaultLoading;

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
          <h1 className="page-title">{t('approvedTitle')}</h1>
          <p className="page-subtitle">{t('approvedSubtitle')}</p>
        </div>

        <button
          className="btn btn-outline btn-sm"
          onClick={refreshAll}
          disabled={pageIsLoading}
        >
          <RefreshCw size={14} /> {t('approvedRefresh')}
        </button>
      </div>

      {account && (
        <div className="alert alert-info" style={{ marginBottom: '20px' }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>
            {t('approvedUSDCAlert')}{' '}
            <strong className="mono">
              {parseFloat(walletBalances.USDC || '0').toFixed(2)} USDC
            </strong>
          </span>
        </div>
      )}

      {!account && (
        <div className="alert alert-info" style={{ marginBottom: '20px' }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>{t('connectPrompt')}</span>
        </div>
      )}

      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>
          Active Contracts
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <div
              className="spinner"
              style={{
                margin: '0 auto 12px',
                width: 24,
                height: 24,
                borderWidth: 3
              }}
            />
            {t('txLoading')}
          </div>
        ) : listings.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <CheckCircle size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--text-secondary)' }}>{t('approvedEmpty')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {listings.map(renderListingCard)}
          </div>
        )}
      </div>

      <div>
        <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>
          Unpaid Uncollateralized Contracts
        </h2>

        {defaultLoading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <div
              className="spinner"
              style={{
                margin: '0 auto 12px',
                width: 24,
                height: 24,
                borderWidth: 3
              }}
            />
            {t('txLoading')}
          </div>
        ) : defaultListings.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <CheckCircle size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--text-secondary)' }}>
              No unpaid uncollateralized contracts.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {defaultListings.map(renderDefaultCard)}
          </div>
        )}
      </div>
    </div>
  );
}

