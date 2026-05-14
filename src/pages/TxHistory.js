import React, { useEffect, useState } from 'react';
import { useLang } from '../hooks/useLang';
import { useWeb3 } from '../hooks/useWeb3';
import { Clock, RefreshCw, Trash2, Globe2 } from 'lucide-react';
import { loadLocalTxHistory, clearLocalTxHistory } from '../utils/localTxHistory';
import { listenGlobalTxHistory, clearGlobalTxHistory, isOwnerAddress } from '../utils/globalTxHistory';

// Transaction type → i18n kalit xaritasi
// Eski tarixlar bu xaritada yo'q type'larga ega bo'lishi mumkin —
// shu holda fallback sifatida ev.label ishlatiladi (inglizcha qoladi).
const TX_TYPE_TO_I18N_KEY = {
  createListing: 'txLabelCreateListing',
  listingApprove: 'txLabelListingApprove',
  listingCancel: 'txLabelListingCancel',
  payment: 'txLabelPayment',
  defaultClaim: 'txLabelDefaultClaim',
  payAfterDefault: 'txLabelPayAfterDefault',
};

export default function TxHistory() {
  const { t } = useLang();
  const { account } = useWeb3();

  const [items, setItems] = useState([]);
  const [globalItems, setGlobalItems] = useState([]);

  const isOwner = isOwnerAddress(account);

  const loadHistory = () => {
    setItems(loadLocalTxHistory());
  };

  useEffect(() => {
    loadHistory();

    const onStorage = () => loadHistory();

    window.addEventListener('storage', onStorage);
    window.addEventListener('nasiyasale:tx-history-updated', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('nasiyasale:tx-history-updated', onStorage);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = listenGlobalTxHistory(account, setGlobalItems);
    return () => unsubscribe();
  }, [account]);

  const clearHistory = () => {
    if (!window.confirm('Browser transaction history tozalansinmi?')) return;
    clearLocalTxHistory();
    setItems([]);
  };

  const clearGlobal = async () => {
    if (!isOwner) return;
    if (!window.confirm('Owner global transaction history tozalansinmi?')) return;

    try {
      await clearGlobalTxHistory(account);
      setGlobalItems([]);
    } catch (e) {
      console.error('clearGlobal:', e);
      alert('Global history tozalashda xato bo‘ldi');
    }
  };

  const formatTime = (ms) => {
    if (!ms) return '—';
    try {
      return new Date(Number(ms)).toLocaleString();
    } catch {
      return '—';
    }
  };

  const shortHash = (hash) => {
    if (!hash) return '';
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
  };

  const shortAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const eventColor = (status) => {
    const map = {
      success: 'var(--success)',
      pending: 'var(--warning)',
      failed: 'var(--danger)',
      error: 'var(--danger)',
    };

    return map[status] || 'var(--accent-bright)';
  };

  // ev.type orqali tarjima, agar yo'q bo'lsa ev.label (eski tarixlar)
  const getEventLabel = (ev) => {
    const i18nKey = TX_TYPE_TO_I18N_KEY[ev.type];
    if (i18nKey) {
      const translated = t(i18nKey);
      // t() agar topa olmasa kalitni o'zini qaytaradi — shuni tekshiramiz
      if (translated && translated !== i18nKey) {
        return translated;
      }
    }
    return ev.label || ev.type || 'Transaction';
  };

  const renderList = (list, mode) => {
    if (list.length === 0) {
      return (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <Clock size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
          <p style={{ color: 'var(--text-secondary)' }}>
            {mode === 'global'
              ? 'Hali global saqlangan amal yo‘q.'
              : 'Hali bu browserda saqlangan amal yo‘q.'}
          </p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {list.map((ev, i) => (
          <div
            key={`${ev.firebaseKey || ev.id || ev.txHash || i}`}
            className="card"
            style={{ padding: '14px 18px' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: eventColor(ev.status),
                  }}
                />

                <span
                  style={{
                    fontWeight: 600,
                    fontSize: '13px',
                    color: eventColor(ev.status),
                  }}
                >
                  {getEventLabel(ev)}
                </span>

                {ev.listingId !== null && ev.listingId !== undefined && (
                  <span
                    className="mono"
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    #{String(ev.listingId)}
                  </span>
                )}

                {mode === 'global' && ev.account && (
                  <span
                    className="mono"
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                    title={ev.account}
                  >
                    {shortAddress(ev.account)}
                  </span>
                )}

                {ev.extra && (
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {ev.extra}
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {formatTime(ev.time)}
                </span>

                {ev.txHash ? (
                  <a
                    href={`https://optimistic.etherscan.io/tx/${ev.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '11px',
                      color: 'var(--accent-bright)',
                      textDecoration: 'none',
                    }}
                    title={ev.txHash}
                  >
                    {shortHash(ev.txHash)} ↗
                  </a>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    No tx hash
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 className="page-title">{t('txTitle') || 'Transaction History'}</h1>
          <p className="page-subtitle">
            Oxirgi 20 ta amal shu browser ichida saqlanadi. RPC log scan ishlatilmaydi.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={loadHistory} type="button">
            <RefreshCw size={14} />
            {t('txRefresh') || 'Refresh'}
          </button>

          <button className="btn btn-outline btn-sm" onClick={clearHistory} type="button">
            <Trash2 size={14} />
            Clear
          </button>
        </div>
      </div>

      {isOwner && (
        <div style={{ marginBottom: 24 }}>
          <div
            className="page-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 12,
            }}
          >
            <div>
              <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Globe2 size={16} />
                Owner global oxirgi 20 amal
              </h2>
              <p className="page-subtitle">
                Bu bo‘lim faqat owner wallet uchun ko‘rinadi. Barcha userlardan Firebase orqali kelgan oxirgi amallar.
              </p>
            </div>

            <button className="btn btn-outline btn-sm" onClick={clearGlobal} type="button">
              <Trash2 size={14} />
              Clear Global
            </button>
          </div>

          {renderList(globalItems, 'global')}
        </div>
      )}

      <div>
        <h2 className="section-title">Browser tarixi</h2>
        {renderList(items, 'local')}
      </div>
    </div>
  );
}
