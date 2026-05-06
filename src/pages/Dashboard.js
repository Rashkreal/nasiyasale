import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../abi/contract';
import { useLang } from '../hooks/useLang';
import { Link } from 'react-router-dom';
import { Wallet, List, CheckCircle, PlusSquare, ArrowRight, Activity, RefreshCw, Users, Copy, Check, Wifi } from 'lucide-react';
import { useOnline } from '../hooks/useOnline';

function AddrItem({ addr }) {
  const [copied, setCopied] = React.useState(false);
  const short = addr.slice(0, 6) + '...' + addr.slice(-4);
  const copy = () => { navigator.clipboard.writeText(addr); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
      <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{short}</span>
      <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--success)' : 'var(--text-muted)', padding: '2px', display: 'flex' }}>
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { account, contract, readOnlyContract, connectMetaMask, connecting, refreshBalances } = useWeb3();
  const { t } = useLang();
  const { onlineCount, onlineUsers, isOwner } = useOnline(account);
  const [stats, setStats] = useState({ pendingSeller: 0, pendingBuyer: 0, approved: 0 });
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(() => {
    let c = contract || readOnlyContract;
    if (!c) {
      try {
        const p = new ethers.JsonRpcProvider('https://optimism.publicnode.com');
        c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, p);
      } catch { setLoading(false); return; }
    }
    setLoading(true);
    Promise.all([
      c.pendingSellerCount(),
      c.pendingBuyerCount(),
      c.approvedCount(),
    ]).then(async ([s, b, a]) => {
      const ps = Number(s), pb = Number(b), pa = Number(a);
      setStats({ pendingSeller: ps, pendingBuyer: pb, approved: pa });

    }).catch(console.error).finally(() => setLoading(false));
  }, [contract, readOnlyContract]);

  useEffect(() => { fetchStats(); }, [fetchStats]);


  const handleRefresh = () => { fetchStats(); refreshBalances(); };

  return (
    <div>
      {/* Wallet ulanmagan banner — faqat desktop da */}
      {!account && (
        <div className="desktop-only" style={{
          background: 'linear-gradient(135deg, var(--accent-glow), transparent)',
          border: '1px solid var(--accent)',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: 44, height: 44, background: 'var(--accent-glow)',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: '2px solid var(--accent)', flexShrink: 0
            }}>
              <Wallet size={20} color="var(--accent-bright)" />
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>{t('dashWelcome')}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('dashWelcomeDesc')}</div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={connectMetaMask} disabled={connecting}>
            {connecting ? <><div className="spinner" /> {t('loading')}</> : <><Wallet size={16} /> {t('connect')}</>}
          </button>
        </div>
      )}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">{t('dashTitle')}</h1>
          <p className="page-subtitle">{t('dashSubtitle')}</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw size={14} /> {t('refresh') || 'Yangilash'}
        </button>
      </div>

      <p className="section-title">{t('dashStats')}</p>
      <div className="grid-4" style={{ marginBottom: '28px' }}>
        <div className="stat-card" style={{ position: 'relative' }}>
          <div className="stat-label">
            <Wifi size={12} style={{ display: 'inline', marginRight: 4, color: 'var(--success)' }} />
            Onlayn foydalanuvchilar
          </div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {onlineCount}
          </div>
          <div className="stat-sub">Hozir saytda</div>

          {/* Owner uchun — batafsil ma'lumot */}
          {isOwner && onlineUsers.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
              {onlineUsers.map((u, i) => (
                <div key={i} style={{
                  padding: '10px 12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  fontSize: '12px',
                }}>
                  {/* Hamyon */}
                  <div style={{ marginBottom: '6px' }}>
                    {u.address ? (
                      <AddrItem addr={u.address} />
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Hamyon ulanmagan
                      </span>
                    )}
                  </div>
                  {/* Qurilma */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', color: 'var(--text-secondary)' }}>
                    <span>Qurilma: <b style={{color:'var(--text-primary)'}}>{u.device || '—'}</b></span>
                    <span>OS: <b style={{color:'var(--text-primary)'}}>{u.os || '—'}</b></span>
                    <span>Brauzer: <b style={{color:'var(--text-primary)'}}>{u.browser || '—'}</b></span>
                    <span>Ekran: <b style={{color:'var(--text-primary)'}}>{u.screen || '—'}</b></span>
                    <span>Til: <b style={{color:'var(--text-primary)'}}>{u.lang || '—'}</b></span>
                    <span>Vaqt zonasi: <b style={{color:'var(--text-primary)'}}>{u.timezone || '—'}</b></span>
                  </div>
                  {/* Joylashuv */}
                  {(u.city || u.country) && (
                    <div style={{ marginTop: '6px', padding: '6px 8px', background: 'var(--bg-card)', borderRadius: '6px', color: 'var(--text-secondary)' }}>
                      Joylashuv: <b style={{color:'var(--success)'}}>
                        {[u.city, u.region, u.country].filter(Boolean).join(', ')}
                      </b>
                      {u.isp && <span style={{marginLeft:8, color:'var(--text-muted)', fontSize:11}}>{u.isp}</span>}
                    </div>
                  )}
                  {/* IP */}
                  {u.ip && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      IP: {u.ip}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label"><Activity size={12} style={{ display: 'inline', marginRight: 4 }} />{t('dashSellerL')}</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{loading ? '...' : stats.pendingSeller}</div>
          <div className="stat-sub">{t('dashPending')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Activity size={12} style={{ display: 'inline', marginRight: 4 }} />{t('dashBuyerR')}</div>
          <div className="stat-value" style={{ color: 'var(--accent-bright)' }}>{loading ? '...' : stats.pendingBuyer}</div>
          <div className="stat-sub">{t('dashPendingR')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><CheckCircle size={12} style={{ display: 'inline', marginRight: 4 }} />{t('dashApprovedS')}</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{loading ? '...' : stats.approved}</div>
          <div className="stat-sub">{t('dashActive')}</div>
        </div>
      </div>

      <p className="section-title">{t('dashActions')}</p>
      <div className="grid-2">
        {[
          { to: '/create', icon: PlusSquare, title: t('dashCreateT'), desc: t('dashCreateD'), color: 'var(--success)' },
          { to: '/listings', icon: List, title: t('dashListingsT'), desc: t('dashListingsD'), color: 'var(--warning)' },
          { to: '/approved', icon: CheckCircle, title: t('dashApprovedT'), desc: t('dashApprovedD'), color: 'var(--dur-color)' },
        ].map(({ to, icon: Icon, title, desc, color }) => (
          <Link key={to} to={to} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '12px',
                background: `${color}20`, border: `1px solid ${color}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Icon size={20} color={color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {title} <ArrowRight size={15} color="var(--text-muted)" />
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{desc}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
