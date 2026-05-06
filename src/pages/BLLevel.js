import React, { useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useLang } from '../hooks/useLang';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { BarChart3, Search, AlertCircle, Copy, Check } from 'lucide-react';

export default function BLLevel() {
  const { account, contract, readOnlyContract } = useWeb3();
  const { t } = useLang();
  const [buyerAddr, setBuyerAddr] = useState('');
  const [sellerAddr, setSellerAddr] = useState('');
  const [result, setResult] = useState(null);
  const [pendingBL, setPendingBL] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  const handleCheck = async () => {
    const c = contract || readOnlyContract;
    if (!c) return toast.error(t('connectPrompt'));
    const buyer = buyerAddr.trim() || account;
    const seller = sellerAddr.trim();
    if (!buyer || !seller) return toast.error(t('blFillBoth'));
    if (!ethers.isAddress(buyer) || !ethers.isAddress(seller)) return toast.error(t('blInvalidAddr'));
    setLoading(true);
    try {
      const [bl, pending] = await Promise.all([
        c.pairwiseBL(buyer, seller),
        c.pendingBuyNoCollateralBL(buyer),
      ]);
      setResult(ethers.formatUnits(bl, 18));
      setPendingBL(ethers.formatUnits(pending, 18));
    } catch (e) {
      console.error(e);
      toast.error(t('errorOccurred'));
    } finally { setLoading(false); }
  };

  const handleSetMyAddr = (field) => {
    if (!account) return toast.error(t('connectPrompt'));
    if (field === 'buyer') setBuyerAddr(account);
    else setSellerAddr(account);
  };

  const copyAddr = (addr, key) => {
    navigator.clipboard.writeText(addr);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      <div className="page-header">
        <h1 className="page-title">{t('blTitle')}</h1>
        <p className="page-subtitle">{t('blSubtitle')}</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              {t('blBuyer')}
              <button onClick={() => handleSetMyAddr('buyer')} style={{
                background: 'none', border: 'none', color: 'var(--accent-bright)',
                cursor: 'pointer', fontSize: '11px', fontWeight: 600,
              }}>{t('blMyAddr')}</button>
            </label>
            <input className="input" type="text" placeholder="0x..." value={buyerAddr}
              onChange={e => setBuyerAddr(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              {t('blSeller')}
              <button onClick={() => handleSetMyAddr('seller')} style={{
                background: 'none', border: 'none', color: 'var(--accent-bright)',
                cursor: 'pointer', fontSize: '11px', fontWeight: 600,
              }}>{t('blMyAddr')}</button>
            </label>
            <input className="input" type="text" placeholder="0x..." value={sellerAddr}
              onChange={e => setSellerAddr(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-full" onClick={handleCheck} disabled={loading}>
            {loading ? <div className="spinner" /> : <Search size={15} />}
            {t('blCheck')}
          </button>
        </div>

        {result !== null && (
          <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('blResultLevel')}:</span>
              <span className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--success)' }}>
                {parseFloat(result).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('blResultBusy')}:</span>
              <span className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--warning)' }}>
                {parseFloat(pendingBL).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('blResultFree')}:</span>
              <span className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-bright)' }}>
                {Math.max(0, parseFloat(result) - parseFloat(pendingBL)).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="alert alert-info" style={{ marginTop: '16px' }}>
        <AlertCircle size={14} style={{ flexShrink: 0 }} />
        <span>{t('blExplanation')}</span>
      </div>
    </div>
  );
}
