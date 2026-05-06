import React from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function NetworkBanner() {
  const { account, isCorrectNetwork, switchToOptimism, chainId } = useWeb3();

  if (!account || isCorrectNetwork) return null;

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
        Noto'g'ri tarmoq (Chain ID: {chainId}). NasiyaSale faqat Optimism Mainnet da ishlaydi.
      </span>
      <button
        onClick={switchToOptimism}
        style={{
          background: 'white', color: 'var(--danger)',
          border: 'none', borderRadius: '6px',
          padding: '4px 12px', cursor: 'pointer',
          fontWeight: 700, fontSize: '13px',
          display: 'flex', alignItems: 'center', gap: '4px'
        }}
      >
        <RefreshCw size={12} /> Optimism ga o'tish
      </button>
    </div>
  );
}
