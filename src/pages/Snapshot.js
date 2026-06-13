import React, { useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useLang } from '../hooks/useLang';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { Search, RefreshCw, Info } from 'lucide-react';

export default function Snapshot() {
  const { t } = useLang();
  const { account, readOnlyContract, contract, signer } = useWeb3();
  const [snapshotListingId, setSnapshotListingId] = useState('');
  const [snapshotData, setSnapshotData] = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  const fetchSnapshot = async () => {
    const id = parseInt(snapshotListingId);
    if (isNaN(id)) return toast.error('Noto‘g‘ri listing ID');
    if (!readOnlyContract && !contract) return toast.error('Kontrakt ulanmagan');
    const c = readOnlyContract || contract;
    
    setSnapshotLoading(true);
    try {
      const listing = await c.getListingById(id);
      const status = Number(listing.status);
      if (status !== 4) return toast.error('Bu listing tasdiqlanmagan yoki muddati o‘tgan');
      if (!listing.isCollateral) return toast.error('Bu listing garovli emas');

      let fallbackPrice = null;
      try { fallbackPrice = await c.claimFallbackPrice(id); } catch {}

      const tokenName = ['WBTC', 'WETH'][Number(listing.collateralTokenId)] || 'Token';
      const lockedPrice = listing.lockedPrices?.[Number(listing.collateralTokenId)] 
        ? ethers.formatUnits(listing.lockedPrices[Number(listing.collateralTokenId)], 6) 
        : '—';
      const fallbackPriceFormatted = fallbackPrice && fallbackPrice > 0n 
        ? ethers.formatUnits(fallbackPrice, 6) 
        : '—';

      setSnapshotData({ id, tokenName, lockedPrice, fallbackPrice: fallbackPriceFormatted, collateralTokenId: Number(listing.collateralTokenId) });
      toast.success('Snapshot ma\'lumotlari yuklandi');
    } catch (e) {
      console.error('fetchSnapshot:', e);
      toast.error('Snapshot yuklashda xato');
      setSnapshotData(null);
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleRefreshSnapshot = async () => {
    if (!snapshotData) return;
    if (!contract && !signer) return toast.error('Wallet ulanmagan');
    const toastId = toast.loading('Snapshot yangilanmoqda...');
    try {
      const tx = await contract.connect(signer).refreshSnapshot(snapshotData.id);
      await tx.wait();
      toast.success('Snapshot yangilandi!', { id: toastId });
      fetchSnapshot();
    } catch (e) {
      console.error('refreshSnapshot:', e);
      toast.error('Snapshot yangilashda xato', { id: toastId });
    }
  };

  return (
    <div style={{ maxWidth: '750px' }}>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RefreshCw size={22} />
          Snapshot (zaxira narx)
        </h1>
        <p className="page-subtitle">
          Tasdiqlangan garovli listing uchun lock narx va zaxira narxni ko'rish va yangilash.
        </p>
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            type="number"
            placeholder="Listing ID"
            value={snapshotListingId}
            onChange={(e) => setSnapshotListingId(e.target.value)}
            className="input"
            style={{ flex: '1 1 150px' }}
          />
          <button className="btn btn-primary" onClick={fetchSnapshot} disabled={snapshotLoading}>
            {snapshotLoading ? '...' : <><Search size={14} /> Ko'rish</>}
          </button>
        </div>

        {snapshotData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Token:</span><br /><strong>{snapshotData.tokenName}</strong></div>
              <div><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Lock narx (USDC):</span><br /><strong className="mono">{snapshotData.lockedPrice}</strong></div>
              <div><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Zaxira narx (USDC):</span><br /><strong className="mono">{snapshotData.fallbackPrice}</strong></div>
            </div>
            {account && (
              <button className="btn btn-outline btn-sm" onClick={handleRefreshSnapshot} style={{ alignSelf: 'flex-start' }}>
                <RefreshCw size={14} /> Snapshotni yangilash
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}