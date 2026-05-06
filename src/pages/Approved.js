import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useLang } from '../hooks/useLang';
import { COLLATERAL_TOKENS, TOKEN_COLORS } from '../abi/contract';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
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

export default function Approved() {
  const {
    account,
    contract,
    readOnlyContract,
    signer,
    ensureApproval,
    refreshBalances,
    walletBalances
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
          // Buyer uchun keyin to‘lash, seller uchun default tarixini ko‘rish
          if (status === 7 && !item.isCollateral && (buyerIsMe || sellerIsMe)) {
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

  const doPayment = async (listing) => {
    if (!account) return toast.error(t('connectPrompt'));
    if (!signer) return toast.error(t('connectPrompt'));

    const id = Number(listing.id);

    setActionLoading(`pay-${id}`);

    const tid = toast.loading(t('clPaymentProcessing'));

    try {
      await ensureApproval('USDC', listing.priceUSDC);

      const tx = await contract.connect(signer).makePayment(id);
      await tx.wait();

      toast.success(t('approvedPaySuccess'), { id: tid });

      await refreshAll();
      refreshBalances();
    } catch (e) {
      const msg = e?.reason || e?.shortMessage || e?.message || '';

      if (msg.includes('user rejected') || msg.includes('User rejected')) {
        toast.error(t('walletRejected'), { id: tid });
      } else if (msg.includes('insufficient') || msg.includes('exceeds')) {
        toast.error(t('approvedUSDCInsufficient'), { id: tid });
      } else {
        console.error('makePayment error:', e);
        toast.error(t('errorOccurred'), { id: tid });
      }
    } finally {
      setActionLoading(null);
    }
  };

  // V5: garovli va garovsiz default uchun bitta claimDefault()
  const doClaimDefault = async (listing) => {
    if (!account) return toast.error(t('connectPrompt'));
    if (!signer) return toast.error(t('connectPrompt'));

    const id = Number(listing.id);

    setActionLoading(`claim-${id}`);

    const tid = toast.loading('...');

    try {
      const tx = await contract.connect(signer).claimDefault(id);
      await tx.wait();

      toast.success(
        t('approvedClaimDefaultSuccess') || 'Default claim muvaffaqiyatli bajarildi!',
        { id: tid }
      );

      await refreshAll();
      refreshBalances();
    } catch (e) {
      const msg = e?.reason || e?.shortMessage || e?.message || '';

      if (msg.includes('user rejected') || msg.includes('User rejected')) {
        toast.error(t('walletRejected'), { id: tid });
      } else {
        console.error('claimDefault error:', e);
        toast.error(msg || t('errorOccurred'), { id: tid });
      }
    } finally {
      setActionLoading(null);
    }
  };

  // V5: buyer garovsiz default qarzni keyin to‘laydi
  const doPayAfterDefault = async (listing) => {
    if (!account) return toast.error(t('connectPrompt'));
    if (!signer) return toast.error(t('connectPrompt'));

    const id = Number(listing.id);

    if (listing.isCollateral) {
      return toast.error('Garovli default uchun keyin to‘lash funksiyasi yo‘q');
    }

    setActionLoading(`after-${id}`);

    const tid = toast.loading(t('clPaymentProcessing'));

    try {
      await ensureApproval('USDC', listing.priceUSDC);

      const tx = await contract.connect(signer).payAfterDefault(id);
      await tx.wait();

      toast.success(
        t('payAfterDefaultSuccess') || 'Default qarz to‘landi!',
        { id: tid }
      );

      await refreshAll();
      refreshBalances();
    } catch (e) {
      const msg = e?.reason || e?.shortMessage || e?.message || '';

      if (msg.includes('user rejected') || msg.includes('User rejected')) {
        toast.error(t('walletRejected'), { id: tid });
      } else if (msg.includes('insufficient') || msg.includes('exceeds')) {
        toast.error(t('approvedUSDCInsufficient'), { id: tid });
      } else {
        console.error('payAfterDefault error:', e);
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
                {listing.isCollateral ? '🔒' : '🤝'}{' '}
                {listing.isCollateral
                  ? t('listingsCollateral')
                  : t('listingsNoCollateral')}
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
            {isBuyer && !time.expired && (
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

            {isSeller && time.expired && (
              <button
                className="btn btn-danger"
                disabled={actionLoading === `claim-${id}`}
                onClick={() => doClaimDefault(listing)}
              >
                {actionLoading === `claim-${id}` ? (
                  <div className="spinner" />
                ) : (
                  <Shield size={15} />
                )}
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
                Garovli default: garov sellerga o‘tadi, buyer blacklistga tushmaydi.
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
                Garovsiz default: buyer blacklistga tushadi.
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
                <Ban size={12} /> {t('statusDefaulted') || 'Default / to‘lanmagan'}
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
                {listing.isCollateral ? '🔒' : '🤝'}{' '}
                {listing.isCollateral
                  ? t('listingsCollateral')
                  : t('listingsNoCollateral')}
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
                ? 'Garovli default: garov sellerga o‘tgan, blacklist yo‘q.'
                : 'Garovsiz default: buyer blacklistga tushgan.'}
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
            {isBuyer && !listing.isCollateral && (
              <button
                className="btn btn-success"
                disabled={actionLoading === `after-${id}`}
                onClick={() => doPayAfterDefault(listing)}
              >
                {actionLoading === `after-${id}` ? (
                  <div className="spinner" />
                ) : (
                  <CreditCard size={15} />
                )}
                {t('payAfterDefault') || 'Keyin to‘lash'}
              </button>
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
                Garovli default uchun keyin to‘lash tugmasi yo‘q. Bu holatda garov sellerga o‘tgan.
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
                Default claim bajarilgan. Listing endi active approved ro‘yxatda emas.
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
          Faol shartnomalar
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
          Garovsiz default shartnomalar
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
              Garovsiz default shartnomalar yo‘q.
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