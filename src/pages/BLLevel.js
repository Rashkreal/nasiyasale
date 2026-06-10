import React, { useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useLang } from '../hooks/useLang';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { Search, Copy, Check, AlertCircle } from 'lucide-react';

function fmtBL(value) {
  const n = Number(value || 0);
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export default function BLLevel() {
  const { t } = useLang();
  const { account, readOnlyContract, contract } = useWeb3();
  const [buyerAddr, setBuyerAddr] = useState('');
  const [sellerAddr, setSellerAddr] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [data, setData] = useState(null);

  const handleSearch = async () => {
    const c = readOnlyContract || contract;
    if (!c) {
      toast.error('Wallet ulanmagan yoki tarmoq noto\'g\'ri');
      return;
    }

    const buyer = buyerAddr.trim();
    const seller = sellerAddr.trim();

    if (!ethers.isAddress(buyer)) {
      toast.error('Xaridor manzili noto\'g\'ri');
      return;
    }

    setLoading(true);
    try {
      let activeExposureRaw = 0n;
      try {
        activeExposureRaw = await c.activePairwiseExposure(buyer, seller || buyer);
      } catch {}

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
        c.pairwiseBL(buyer, seller || buyer),
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
        seller: seller || buyer,
        pairwiseBL: ethers.formatUnits(pairwiseRaw, 18),
        pendingBL: ethers.formatUnits(pendingRaw, 18),
        totalBLLevel: ethers.formatUnits(totalLevelRaw, 18),
        totalBL: ethers.formatUnits(totalRaw, 18),
        freeTotalBL: ethers.formatUnits(freeRaw, 18),
        activeExposure: (Number(ethers.formatUnits(activeExposureRaw, 18)) / 10).toFixed(4),
        blacklisted,
        unpaidNoCollateralDefaultCount: String(unpaidNoCollateralRaw),
        unpaidDefaultCount: String(unpaidDefaultRaw),
      });
    } catch (e) {
      console.error('BL fetch error:', e);
      toast.error('BL ma\'lumotlarini olishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div style={{ maxWidth: '750px' }}>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Search size={22} />
          {t('blTitle') || 'BL Darajasi'}
        </h1>
        <p className="page-subtitle">
          {t('blSubtitle') || 'Xaridorning ishonch darajasi (Business Level) haqida ma\'lumot.'}
        </p>
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ flex: '1 1 200px' }}>
            <label className="input-label">{t('blBuyerAddress') || 'Xaridor manzili'}</label>
            <input
              className="input"
              type="text"
              placeholder="0x..."
              value={buyerAddr}
              onChange={(e) => setBuyerAddr(e.target.value)}
            />
                    <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={() => setBuyerAddr(account)}
          style={{ fontSize: '11px', padding: '2px 8px', marginTop: '4px' }}
        >
          👤 Mening manzilim
        </button>
          </div>
          <div className="input-group" style={{ flex: '1 1 200px' }}>
            <label className="input-label">{t('blSellerAddress') || 'Sotuvchi manzili (ixtiyoriy)'}</label>
            <input
              className="input"
              type="text"
              placeholder="0x..."
              value={sellerAddr}
              onChange={(e) => setSellerAddr(e.target.value)}
            />
                    <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={() => setSellerAddr(account)}
          style={{ fontSize: '11px', padding: '2px 8px', marginTop: '4px' }}
        >
          👤 Mening manzilim
        </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={loading}
            style={{ height: '42px', whiteSpace: 'nowrap' }}
          >
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> {t('blSearching') || 'Qidirilmoqda...'}</> : t('blSearch') || 'Qidirish'}
          </button>
        </div>
      </div>

      {data && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('blBuyer') || 'Xaridor'}:</span>
              <span className="mono" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {data.buyer.slice(0, 6)}...{data.buyer.slice(-4)}
                <button
                  onClick={() => copyToClipboard(data.buyer, 'buyer')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {copied === 'buyer' ? <Check size={14} color="var(--success)" /> : <Copy size={14} color="var(--text-muted)" />}
                </button>
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('blSeller') || 'Sotuvchi'}:</span>
              <span className="mono" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {data.seller.slice(0, 6)}...{data.seller.slice(-4)}
                <button
                  onClick={() => copyToClipboard(data.seller, 'seller')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {copied === 'seller' ? <Check size={14} color="var(--success)" /> : <Copy size={14} color="var(--text-muted)" />}
                </button>
              </span>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('blTotalLevel') || 'Umumiy BL darajasi'}:</span>
              <span className="mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--success)' }}>
                {fmtBL(data.totalBLLevel)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('blTotalBL') || 'Total BL'}:</span>
              <span className="mono" style={{ fontSize: '14px', fontWeight: 600 }}>
                {fmtBL(data.totalBL)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('blPendingBL') || 'Band qilingan BL'}:</span>
              <span className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--warning)' }}>
                {fmtBL(data.pendingBL)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('blFreeTotal') || 'Erkin umumiy BL'}:</span>
              <span className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-bright)' }}>
                {fmtBL(data.freeTotalBL)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('blPairwise') || 'Shu seller bilan pairwise BL'}:</span>
              <span className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--success)' }}>
                {fmtBL(data.pairwiseBL)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('blActiveExposure') || 'Faol garovsiz qarz (shu seller)'}:</span>
              <span className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--danger)' }}>
                {fmtBL(data.activeExposure)}
              </span>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('blBlacklist') || 'Blacklist'}:</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: data.blacklisted ? 'var(--danger)' : 'var(--success)' }}>
                {data.blacklisted ? (t('blYes') || 'Ha') : (t('blNo') || 'Yo\'q')}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('blUnpaidNoCollateral') || 'Garovsiz default qarzlar'}:</span>
              <span className="mono" style={{ fontSize: '14px', fontWeight: 600 }}>
                {data.unpaidNoCollateralDefaultCount}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('blUnpaidDefault') || 'Jami unpaid default'}:</span>
              <span className="mono" style={{ fontSize: '14px', fontWeight: 600 }}>
                {data.unpaidDefaultCount}
              </span>
            </div>
          </div>

          <div className="alert alert-info" style={{ marginTop: '16px' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>
              {t('blInfo') || 'Garovsiz e\'lonni tasdiqlashda contract ko\'pincha umumiy BL emas, seller bilan pairwise BL yoki freeTotalBL shartini tekshiradi.'}
            </span>
          </div>
        </div>
      )}

      {!account && (
        <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
          {t('connectPrompt') || 'Avval walletni ulang'}
        </div>
      )}
    </div>
  );
}