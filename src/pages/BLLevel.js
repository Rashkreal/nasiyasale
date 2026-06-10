import React, { useState } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { Search, AlertCircle, Copy, Check } from 'lucide-react';
import { useWeb3 } from '../hooks/useWeb3';
import { useLang } from '../hooks/useLang';

function fmtBL(value) {
  const n = Number(value || 0);
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export default function BLLevel() {
  const { account, contract, readOnlyContract } = useWeb3();
  const { t } = useLang();

  const [buyerAddr, setBuyerAddr] = useState('');
  const [sellerAddr, setSellerAddr] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  const [data, setData] = useState(null);

  const handleSetMyAddr = (field) => {
    if (!account) return toast.error(t('connectPrompt') || 'Wallet ulang');

    if (field === 'buyer') {
      setBuyerAddr(account);
    } else {
      setSellerAddr(account);
    }
  };

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    } catch (e) {
      toast.error('Copy xato');
    }
  };

  const handleCheck = async () => {
    const c = readOnlyContract || contract;
    if (!c) return toast.error(t('connectPrompt') || 'Contract topilmadi');

    const buyer = (buyerAddr.trim() || account || '').trim();
    const seller = sellerAddr.trim();

    if (!buyer || !seller) {
      return toast.error(t('blFillBoth') || 'Buyer va seller address kiriting');
    }

    if (!ethers.isAddress(buyer) || !ethers.isAddress(seller)) {
      return toast.error(t('blInvalidAddr') || 'Address noto‘g‘ri');
    }

    setLoading(true);

    try {
      const [
        pairwiseRaw,
        pendingRaw,
        totalLevelRaw,
        totalRaw,
        freeRaw,
        blacklisted,
        unpaidNoCollateralRaw,
        unpaidDefaultRaw,
      ] = await Promise.all([
        c.pairwiseBL(buyer, seller),
        c.pendingBuyNoCollateralBL(buyer),
        c.totalBLLevel(buyer),
        c.totalBL(buyer),
        c.freeTotalBL(buyer),
        c.isBlacklisted(buyer).catch(() => false),
        c.unpaidNoCollateralDefaultCount(buyer).catch(() => 0n),
        c.unpaidDefaultCount(buyer).catch(() => 0n),
      ]);

      setData({
        buyer,
        seller,
        pairwiseBL: ethers.formatUnits(pairwiseRaw, 18),
        pendingBL: Number(pendingRaw).toFixed(4),
        totalBLLevel: ethers.formatUnits(totalLevelRaw, 18),
        totalBL: ethers.formatUnits(totalRaw, 18),
        freeTotalBL: Number(freeRaw).toFixed(0),
        blacklisted,
        unpaidNoCollateralDefaultCount: String(unpaidNoCollateralRaw),
        unpaidDefaultCount: String(unpaidDefaultRaw),
      });
    } catch (e) {
      console.error('BL check error:', e);
      toast.error(t('errorOccurred') || 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px' }}>
      <div className="page-header">
        <h1 className="page-title">{t('blTitle') || 'BL daraja'}</h1>
        <p className="page-subtitle">
          Umumiy BL, erkin BL va seller bilan pairwise BL alohida ko‘rsatiladi.
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Buyer / Xaridor
              <button
                onClick={() => handleSetMyAddr('buyer')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-bright)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                Mening addressim
              </button>
            </label>

            <input
              className="input"
              type="text"
              placeholder="0x..."
              value={buyerAddr}
              onChange={(e) => setBuyerAddr(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Seller / Sotuvchi
              <button
                onClick={() => handleSetMyAddr('seller')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-bright)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                Mening addressim
              </button>
            </label>

            <input
              className="input"
              type="text"
              placeholder="0x..."
              value={sellerAddr}
              onChange={(e) => setSellerAddr(e.target.value)}
            />
          </div>

          <button className="btn btn-primary btn-full" onClick={handleCheck} disabled={loading}>
            {loading ? <div className="spinner" /> : <Search size={15} />}
            Tekshirish
          </button>
        </div>

        {data && (
          <div
            style={{
              marginTop: '20px',
              padding: '16px',
              background: 'var(--bg-secondary)',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Umumiy BL darajasi:</span>
              <span className="mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--success)' }}>
                {fmtBL(data.totalBLLevel)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total BL:</span>
              <span className="mono" style={{ fontSize: '14px', fontWeight: 600 }}>
                {fmtBL(data.totalBL)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Band qilingan BL:</span>
              <span className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--warning)' }}>
                {fmtBL(data.pendingBL)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Erkin umumiy BL:</span>
              <span className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-bright)' }}>
                {fmtBL(data.freeTotalBL)}
              </span>
            </div>

            <hr style={{ borderColor: 'var(--border)', width: '100%' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Shu seller bilan pairwise BL:</span>
              <span className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--success)' }}>
                {fmtBL(data.pairwiseBL)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Blacklist:</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: data.blacklisted ? 'var(--danger)' : 'var(--success)' }}>
                {data.blacklisted ? 'Ha' : 'Yo‘q'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Garovsiz default qarzlar:</span>
              <span className="mono" style={{ fontSize: '14px', fontWeight: 600 }}>
                {data.unpaidNoCollateralDefaultCount}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Jami unpaid default:</span>
              <span className="mono" style={{ fontSize: '14px', fontWeight: 600 }}>
                {data.unpaidDefaultCount}
              </span>
            </div>

            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button className="btn btn-outline btn-sm" onClick={() => copyText(data.buyer, 'buyer')}>
                {copied === 'buyer' ? <Check size={14} /> : <Copy size={14} />}
                Buyer copy
              </button>

              <button className="btn btn-outline btn-sm" onClick={() => copyText(data.seller, 'seller')}>
                {copied === 'seller' ? <Check size={14} /> : <Copy size={14} />}
                Seller copy
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="alert alert-info" style={{ marginTop: '16px' }}>
        <AlertCircle size={14} style={{ flexShrink: 0 }} />
        <span>
          Garovsiz e’lonni tasdiqlashda contract ko‘pincha umumiy BL emas, seller bilan pairwise BL yoki freeTotalBL shartini tekshiradi.
        </span>
      </div>
    </div>
  );
}

