import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useLang } from '../hooks/useLang';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../abi/contract';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { Clock, RefreshCw } from 'lucide-react';

export default function TxHistory() {
  const { account, provider } = useWeb3();
  const { t } = useLang();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!provider || !account) return;
    setLoading(true);
    try {
      const iface = new ethers.Interface(CONTRACT_ABI);
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000);

      const logs = await provider.getLogs({
        address: CONTRACT_ADDRESS,
        fromBlock,
        toBlock: 'latest',
      });

      const parsed = [];
      for (const log of logs) {
        try {
          const ev = iface.parseLog({ topics: log.topics, data: log.data });
          if (!ev) continue;
          const block = await provider.getBlock(log.blockNumber);
          const isRelated = ev.args && Object.values(ev.args).some(
            v => typeof v === 'string' && v.toLowerCase() === account.toLowerCase()
          );
          if (isRelated) {
            parsed.push({
              name: ev.name,
              args: ev.args,
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
              timestamp: block?.timestamp || 0,
            });
          }
        } catch { /* skip unparseable */ }
      }

      parsed.sort((a, b) => b.blockNumber - a.blockNumber);
      setEvents(parsed);
    } catch (e) {
      console.error('fetchEvents:', e);
      toast.error(t('errorOccurred'));
    } finally { setLoading(false); }
  }, [provider, account, t]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const formatTime = (ts) => {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleString();
  };

  const eventLabel = (name) => {
    const map = {
      ListingCreated: t('txEventCreated'),
      ListingApproved: t('txEventApproved'),
      ListingCancelled: t('txEventCancelled'),
      PaymentCompleted: t('txEventPaid'),
      CollateralClaimed: t('txEventCollateral'),
      BLClaimed: t('txEventBLClaimed'),
    };
    return map[name] || name;
  };

  const eventColor = (name) => {
    const map = {
      ListingCreated: 'var(--accent-bright)',
      ListingApproved: 'var(--success)',
      ListingCancelled: 'var(--warning)',
      PaymentCompleted: 'var(--success)',
      CollateralClaimed: 'var(--danger)',
      BLClaimed: 'var(--danger)',
    };
    return map[name] || 'var(--text-secondary)';
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">{t('txTitle')}</h1>
          <p className="page-subtitle">{t('txSubtitle')}</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchEvents} disabled={loading}>
          <RefreshCw size={14} /> {t('txRefresh')}
        </button>
      </div>

      {!account ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <Clock size={40} color="var(--text-muted)" style={{ marginBottom: 16 }} />
          <p style={{ color: 'var(--text-secondary)' }}>{t('connectPrompt')}</p>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px', width: 24, height: 24, borderWidth: 3 }} />
          {t('txLoading')}
        </div>
      ) : events.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <Clock size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
          <p style={{ color: 'var(--text-secondary)' }}>{t('txEmpty')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.map((ev, i) => (
            <div key={`${ev.txHash}-${i}`} className="card" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: eventColor(ev.name),
                  }} />
                  <span style={{ fontWeight: 600, fontSize: '13px', color: eventColor(ev.name) }}>
                    {eventLabel(ev.name)}
                  </span>
                  {ev.args?.listingId !== undefined && (
                    <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      #{Number(ev.args.listingId)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatTime(ev.timestamp)}</span>
                  <a href={`https://optimistic.etherscan.io/tx/${ev.txHash}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '11px', color: 'var(--accent-bright)', textDecoration: 'none' }}>
                    Etherscan ↗
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
