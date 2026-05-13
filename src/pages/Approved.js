import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useLang } from '../hooks/useLang';
import { COLLATERAL_TOKENS, TOKEN_COLORS } from '../abi/contract';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { CheckCircle, RefreshCw, CreditCard, Shield, AlertTriangle, Copy, Check } from 'lucide-react';

function AddrCell({ addr }) {
  const [copied, setCopied] = React.useState(false);
  if (!addr || addr === ethers.ZeroAddress) return <span style={{ color:'var(--text-muted)' }}>—</span>;
  const short = addr.slice(0,6)+'...'+addr.slice(-4);
  const copy = () => { navigator.clipboard.writeText(addr); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'4px' }}>
      <span className='address' title={addr}>{short}</span>
      <button onClick={copy} style={{ background:'none', border:'none', cursor:'pointer', color: copied ? 'var(--success)' : 'var(--text-muted)', padding:'2px', display:'flex' }}>
        {copied ? <Check size={12}/> : <Copy size={12}/>}
      </button>
    </span>
  );
}

function shortAddr(a) { return !a || a === ethers.ZeroAddress ? '—' : a.slice(0,6)+'...'+a.slice(-4); }
function durFmt(r) { return parseFloat(ethers.formatUnits(r,18)).toLocaleString(undefined,{maximumFractionDigits:4}); }
function usdtFmt(r) { return parseFloat(ethers.formatUnits(r,6)).toLocaleString(undefined,{maximumFractionDigits:2}); }
function collateralTokenName(tokenId) { return COLLATERAL_TOKENS[tokenId] || `Token#${tokenId}`; }

export default function Approved() {
  const { account, contract, readOnlyContract, signer, ensureApproval, refreshBalances, walletBalances } = useWeb3();
  const { t } = useLang();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchApproved = useCallback(async () => {
    const c = contract || readOnlyContract;
    if (!c) return;
    setLoading(true);
    try { setListings(await c.getApprovedListings(0, 100)); }
    catch { toast.error(t('errorOccurred')); }
    finally { setLoading(false); }
  }, [contract, readOnlyContract, t]);

  useEffect(() => { fetchApproved(); }, [fetchApproved]);

  const timeLeft = (dueDate) => {
    const diff = Number(dueDate) - Math.floor(Date.now()/1000);
    if (diff <= 0) return { expired: true, text: t('approvedExpired') };
    const d = Math.floor(diff/86400), h = Math.floor((diff%86400)/3600);
    return { expired: false, text: `${d} ${t('approvedDays')} ${h} ${t('approvedHours')} ${t('approvedTimeLeft')}` };
  };

  const doPayment = async (listing) => {
    if (!account) return toast.error(t('connectPrompt'));
    if (!signer) return toast.error(t('connectPrompt'));
    const id = Number(listing.id);
    setActionLoading(id);
    const tid = toast.loading(t('clPaymentProcessing'));
    try {
      await ensureApproval('USDC', listing.priceUSDC);
      const tx = await contract.connect(signer).makePayment(id);
      await tx.wait();
      toast.success(t('approvedPaySuccess'), { id: tid });
      fetchApproved(); refreshBalances();
    } catch(e) {
      const msg = e?.reason || e?.message || '';
      if (msg.includes('user rejected')) toast.error(t('walletRejected'), { id: tid });
      else if (msg.includes('insufficient') || msg.includes('exceeds')) toast.error(t('approvedUSDCInsufficient'), { id: tid });
      else toast.error(t('errorOccurred'), { id: tid });
    } finally { setActionLoading(null); }
  };

  const doClaim = async (fn, id, successMsg) => {
    if (!account) return toast.error(t('connectPrompt'));
    if (!signer) return toast.error(t('connectPrompt'));
    setActionLoading(id);
    const tid = toast.loading('...');
    try {
      const tx = await fn();
      await tx.wait();
      toast.success(successMsg, { id: tid });
      fetchApproved(); refreshBalances();
    } catch(e) {
      const msg = e?.reason || e?.message || '';
      toast.error(msg.includes('user rejected') ? t('walletRejected') : t('errorOccurred'), { id: tid });
    } finally { setActionLoading(null); }
  };



  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 className="page-title">{t('approvedTitle')}</h1>
          <p className="page-subtitle">{t('approvedSubtitle')}</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchApproved} disabled={loading}>
          <RefreshCw size={14} /> {t('approvedRefresh')}
        </button>
      </div>

      {account && (
        <div className="alert alert-info" style={{ marginBottom:'20px' }}>
          <AlertTriangle size={15} style={{ flexShrink:0 }} />
          <span>{t('approvedUSDCAlert')} <strong className="mono">{parseFloat(walletBalances.USDC || '0').toFixed(2)} USDC</strong></span>
        </div>
      )}
      {!account && (
        <div className="alert alert-info" style={{ marginBottom:'20px' }}>
          <AlertTriangle size={15} style={{ flexShrink:0 }} />
          <span>{t('connectPrompt')}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>
          <div className="spinner" style={{ margin:'0 auto 12px', width:24, height:24, borderWidth:3 }} />
          {t('txLoading')}
        </div>
      ) : listings.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'48px' }}>
          <CheckCircle size={32} color="var(--text-muted)" style={{ marginBottom:12 }} />
          <p style={{ color:'var(--text-secondary)' }}>{t('approvedEmpty')}</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {listings.map(listing => {
            const id = Number(listing.id);
            const isBuyer = listing.buyer?.toLowerCase() === account?.toLowerCase();
            const isSeller = listing.seller?.toLowerCase() === account?.toLowerCase();
            const time = timeLeft(listing.dueDate);
            const colTokenName = listing.isCollateral ? collateralTokenName(Number(listing.collateralTokenId)) : '';
            const colColor = TOKEN_COLORS[colTokenName] || 'var(--text-muted)';

            return (
              <div key={id} className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px' }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
                      <span className="mono" style={{ color:'var(--accent-bright)', fontWeight:700 }}>#{id}</span>
                      <span className="badge" style={{
                        background: listing.isCollateral ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        color: listing.isCollateral ? 'var(--success)' : 'var(--warning)',
                        border: `1px solid ${listing.isCollateral ? 'var(--success)' : 'var(--warning)'}`,
                      }}>
                        {listing.isCollateral ? '🔒' : '🤝'} {listing.isCollateral ? t('listingsCollateral') : t('listingsNoCollateral')}
                      </span>
                      {listing.isCollateral && (
                        <span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'4px', background:`${colColor}20`, color:colColor, border:`1px solid ${colColor}40`, fontWeight:600 }}>
                          {t('approvedCollateralLabel')} {colTokenName}
                        </span>
                      )}
                      {isBuyer && <span className="badge badge-accent">{t('approvedYouBuyer')}</span>}
                      {isSeller && <span className="badge badge-muted">{t('approvedYouSeller')}</span>}
                    </div>
                    <div style={{ display:'flex', gap:'20px', flexWrap:'wrap' }}>
                      <div><div style={{ fontSize:'11px', color:'var(--text-muted)' }}>DUR</div><div className="mono" style={{ color:'var(--dur-color)', fontWeight:600 }}>{durFmt(listing.durAmount)}</div></div>
                      <div><div style={{ fontSize:'11px', color:'var(--text-muted)' }}>USDC</div><div className="mono" style={{ color:'var(--usdt-color)', fontWeight:600 }}>{usdtFmt(listing.priceUSDC)}</div></div>
                      <div><div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{t('listingsColSeller')}</div><div className="address">{shortAddr(listing.seller)}</div></div>
                      <div><div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{t('listingsColBuyer')}</div><div className="address">{shortAddr(listing.buyer)}</div></div>
                    </div>
                    <span style={{
                      display:'inline-flex', alignItems:'center', gap:'6px', padding:'4px 10px',
                      borderRadius:'6px', fontSize:'12px', width:'fit-content',
                      background: time.expired ? 'var(--danger-glow)' : 'var(--success-glow)',
                      color: time.expired ? 'var(--danger)' : 'var(--success)',
                      border: `1px solid ${time.expired ? 'var(--danger)' : 'var(--success)'}`,
                    }}>
                      {time.expired ? <AlertTriangle size={12}/> : <CheckCircle size={12}/>}
                      {time.text}
                    </span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px', alignItems:'flex-end' }}>
                    {isBuyer && !time.expired && (
                      <button className="btn btn-success" disabled={actionLoading===id}
                        onClick={() => doPayment(listing)}>
                        {actionLoading===id ? <div className="spinner"/> : <CreditCard size={15}/>}
                        {t('approvedPay')}
                      </button>
                    )}
                    {isSeller && time.expired && listing.isCollateral && (
                      <button className="btn btn-danger" disabled={actionLoading===id}
                        onClick={() => doClaim(() => contract.connect(signer).claimCollateral(id), id, t('approvedClaimColSuccess'))}>
                        {actionLoading===id ? <div className="spinner"/> : <Shield size={15}/>}
                        {t('approvedClaimCol')}
                      </button>
                    )}
                    {isSeller && time.expired && !listing.isCollateral && (
                      <button className="btn btn-danger" disabled={actionLoading===id}
                        onClick={() => doClaim(() => contract.connect(signer).claimBL(id), id, t('approvedClaimBLSuccess'))}>
                        {actionLoading===id ? <div className="spinner"/> : <Shield size={15}/>}
                        {t('approvedClaimBL')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
