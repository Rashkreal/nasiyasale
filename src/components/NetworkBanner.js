import React from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function NetworkBanner() {
  const { account, isCorrectNetwork, switchToArbitrum, chainId, walletType } = useWeb3();

  if (!account || isCorrectNetwork) return null;

  // WalletConnect (mobil) bilan ulanganda tranzaksiyalar baribir Arbitrum'ga
  // yo'naltiriladi (setDefaultChain), va MetaMask mobil WC orqali tarmoq
  // almashtirishni ishonchli ko'rsatmaydi. Shuning uchun bu holatda banner
  // ko'rsatmaymiz - u faqat foydalanuvchini chalg'itadi. Banner faqat
  // injekt qilingan wallet (masofaviy MetaMask kengaytmasi) uchun qoladi.
  if (walletType === 'walletconnect') return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: 'var(--danger)',
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
      fontSize: '14px', fontWeight: 500
    }}>
      <AlertTriangle size={16} />
      <span>
        Noto'g'ri tarmoq (Chain ID: {chainId}). NasiyaSale faqat Arbitrum One da ishlaydi.
      </span>
      <button
        onClick={switchToArbitrum}
        style={{
          background: 'white', color: 'var(--danger)',
          border: 'none', borderRadius: '6px',
          padding: '4px 12px', cursor: 'pointer',
          fontWeight: 700, fontSize: '13px',
          display: 'flex', alignItems: 'center', gap: '4px'
        }}
      >
        <RefreshCw size={12} /> Arbitrum ga o'tish
      </button>
    </div>
  );
}