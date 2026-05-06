import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useWeb3 } from '../hooks/useWeb3';
import { useLang } from '../hooks/useLang';
import { X, Eye, AlertTriangle, Smartphone } from 'lucide-react';

export default function WalletModal({ onClose }) {
  const { connecting, connectMetaMask, connectWalletConnect, connectByAddress } = useWeb3();
  const { t } = useLang();
  const [step, setStep]       = useState('choose');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [wcLoading, setWcLoading] = useState(false);

  const handleMetaMask = async () => {
    await connectMetaMask();
    toast.success(t('walletConnected'));
    onClose();
  };

  const handleWalletConnect = async () => {
    setWcLoading(true);
    try {
      const ok = await connectWalletConnect();
      if (ok) {
        toast.success(t('walletConnected'));
        onClose();
      }
    } catch (e) {
      console.error('WC error:', e);
    } finally {
      setWcLoading(false);
    }
  };

  const handleAddress = async () => {
    setLoading(true);
    const ok = await connectByAddress(address.trim());
    if (ok) toast.success(t('walletConnected'));
    setLoading(false);
    if (ok) onClose();
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }} onClick={onClose}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-bright)', borderRadius:'20px', padding:'28px', width:'420px', boxShadow:'0 20px 60px rgba(0,0,0,0.5)', position:'relative' }} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4 }}><X size={18}/></button>

        {step === 'choose' && (
          <>
            <h2 style={{ fontSize:'20px', fontWeight:700, marginBottom:'6px' }}>{t('walletTitle')}</h2>
            <p style={{ fontSize:'13px', color:'var(--text-secondary)', marginBottom:'24px' }}>{t('walletSubtitle')}</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {/* MetaMask */}
              <button className="btn btn-outline btn-full" onClick={handleMetaMask} disabled={connecting || wcLoading}
                style={{ justifyContent:'flex-start', gap:'14px', padding:'14px 16px', height:'auto' }}>
                <div style={{ width:44, height:44, borderRadius:'12px', background:'rgba(245,130,32,0.15)', border:'1px solid rgba(245,130,32,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>🦊</div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>{t('walletMetaMask')}</div>
                  <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>{t('walletMetaMaskDesc')}</div>
                </div>
                {connecting && <div className="spinner" style={{ marginLeft:'auto' }}/>}
              </button>

              {/* WalletConnect — QR kod */}
              <button className="btn btn-outline btn-full" onClick={handleWalletConnect} disabled={connecting || wcLoading}
                style={{ justifyContent:'flex-start', gap:'14px', padding:'14px 16px', height:'auto' }}>
                <div style={{ width:44, height:44, borderRadius:'12px', background:'rgba(59,153,252,0.15)', border:'1px solid rgba(59,153,252,0.4)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Smartphone size={22} color="#3b99fc"/>
                </div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>{t('walletTrust')}</div>
                  <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>{t('walletTrustDesc')}</div>
                </div>
                {wcLoading && <div className="spinner" style={{ marginLeft:'auto' }}/>}
              </button>

              {/* Manzil bilan ko'rish */}
              <button className="btn btn-outline btn-full" onClick={() => setStep('address')} disabled={connecting || wcLoading}
                style={{ justifyContent:'flex-start', gap:'14px', padding:'14px 16px', height:'auto' }}>
                <div style={{ width:44, height:44, borderRadius:'12px', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.4)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Eye size={22} color="var(--accent-bright)"/>
                </div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>{t('walletView')}</div>
                  <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>{t('walletViewDesc')}</div>
                </div>
              </button>
            </div>
          </>
        )}

        {step === 'address' && (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
              <button onClick={()=>setStep('choose')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:'20px', padding:0 }}>←</button>
              <h2 style={{ fontSize:'18px', fontWeight:700 }}>{t('walletView')}</h2>
            </div>
            <div className="alert alert-warning" style={{ marginBottom:'16px' }}>
              <AlertTriangle size={14} style={{ flexShrink:0 }}/>
              <span style={{ fontSize:'12px' }}>{t('walletViewWarning')}</span>
            </div>
            <div className="input-group" style={{ marginBottom:'14px' }}>
              <label className="input-label">{t('walletAddress')}</label>
              <input className="input" placeholder="0x1234...abcd" value={address} onChange={e=>setAddress(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAddress()} />
            </div>
            <button className="btn btn-primary btn-full" onClick={handleAddress} disabled={loading||!address}>
              {loading ? <><div className="spinner"/> {t('walletChecking')}</> : <><Eye size={15}/> {t('walletViewBtn')}</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
