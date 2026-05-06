import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { NavLink, useLocation } from 'react-router-dom';
import { useWeb3 } from '../hooks/useWeb3';
import { useLang } from '../hooks/useLang';
import WalletModal from './WalletModal';
import LangSwitcher from './LangSwitcher';
import {
  LayoutDashboard, PlusSquare, List,
  CheckCircle, BarChart3, Zap, Clock,
  AlertTriangle, LogOut, Copy, Check, Info, Wallet, Menu, X, Sun, Moon, Lock, TrendingUp
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

function shortAddr(addr) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

export default function Layout({ children }) {
  const { account, disconnect, isCorrectNetwork, walletType, switchToOptimism } = useWeb3();
  const VAULT_OWNER = "0x0e86d8afaa0B77D732d89BD5ceC3dC9003b321dA";
  const isOwner = account?.toLowerCase() === VAULT_OWNER.toLowerCase();
  const location = useLocation();
  const isVaultPage = location.pathname === '/vault';
  const { t } = useLang();
  const { theme, toggleTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleDisconnect = () => { disconnect(); toast(t('walletDisconnected'), { icon: '👋' }); };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('navDashboard') },
    { to: '/create', icon: PlusSquare, label: t('navCreate') },
    { to: '/listings', icon: List, label: t('navListings') },
    { to: '/approved', icon: CheckCircle, label: t('navApproved') },
    { to: '/bl', icon: BarChart3, label: t('navBL') },
    { to: '/history', icon: Clock, label: t('navHistory') },
    { to: '/about', icon: Info, label: t('navAbout') || 'Haqida' },
    { to: '/vault', icon: Lock, label: 'Vault' },
    { to: '/tokenomics', icon: TrendingUp, label: 'Tokenomics' },
  ];

  // Pastki tab uchun asosiy 5 ta sahifa
  const bottomNavItems = [
    { to: '/', icon: LayoutDashboard, label: t('navDashboard') },
    { to: '/create', icon: PlusSquare, label: t('navCreate') },
    { to: '/listings', icon: List, label: t('navListings') },
    { to: '/approved', icon: CheckCircle, label: t('navApproved') },
  ];

  const copyAddress = () => {
    if (!account) return;
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="app-layout">
      {showModal && <WalletModal onClose={() => setShowModal(false)} />}

      {/* ═══ MOBILE SLIDE MENU ═══ */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer" onClick={e => e.stopPropagation()} style={{ overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="logo-icon"><Zap size={14} color="white" /></div>
                <span style={{ fontWeight: 700, fontSize: '16px' }}>{t('appName')}</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} end={to === '/'} onClick={() => setMobileMenuOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px', borderRadius: '10px', textDecoration: 'none', fontSize: '15px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--accent-bright)' : 'var(--text-secondary)',
                    background: isActive ? 'var(--accent-glow)' : 'transparent',
                  })}>
                  <Icon size={18} />{label}
                </NavLink>
              ))}
            </nav>

            {/* Vault mini-tabs — mobil drawer da, faqat /vault va owner uchun */}
            {isVaultPage && isOwner && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 16px 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Vault
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {[
                    { id: 'statistika', label: t('vaultTabBoshqaruv') },
                    { id: 'locklar',    label: t('vaultTabLocklar')    },
                    { id: 'nft',        label: t('vaultTabNFT')        },
                    { id: 'kiritish',   label: t('vaultTabKiritish')   },
                    { id: 'narxlar',    label: t('vaultTabBoshqaruv')  },
                  ].map(tab => {
                    const params = new URLSearchParams(location.search);
                    const active = (params.get('tab') || 'statistika') === tab.id;
                    return (
                      <NavLink
                        key={tab.id}
                        to={'/vault?tab=' + tab.id}
                        onClick={() => setMobileMenuOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '10px 16px 10px 28px', borderRadius: '10px',
                          textDecoration: 'none', fontSize: '14px',
                          fontWeight: active ? 600 : 400,
                          color: active ? 'var(--accent-bright)' : 'var(--text-secondary)',
                          background: active ? 'var(--accent-glow)' : 'transparent',
                        }}
                      >
                        {tab.label}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            )}
            <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <LangSwitcher />
              <button className="theme-toggle-btn" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              {account && (
                <button
                  onClick={() => { handleDisconnect(); setMobileMenuOpen(false); }}
                  style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'var(--danger-glow)', border: '1px solid var(--danger)',
                    borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                    color: 'var(--danger)', fontSize: '13px', fontWeight: 600,
                  }}>
                  <LogOut size={14} /> Chiqish
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <header className="app-header">
        {/* Mobile: hamburger */}
        <button className="mobile-only hamburger-btn" onClick={() => setMobileMenuOpen(true)}>
          <Menu size={20} />
        </button>

        <div className="header-logo">
          <div className="logo-icon"><Zap size={16} color="white" /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.3px' }}>{t('appName')}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '-2px' }}>{t('network')}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="desktop-only"><LangSwitcher /></div>
          <button className="theme-toggle-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {!account ? (
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
              <Wallet size={14} /> <span className="desktop-only">{t('connect')}</span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {!isCorrectNetwork && (
                <button onClick={switchToOptimism} className="network-warn-btn">
                  <AlertTriangle size={12} /> <span className="desktop-only">{t('wrongNetwork')}</span>
                </button>
              )}
              <div className="addr-chip">
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {walletType === 'metamask' ? '🦊' : walletType === 'walletconnect' ? '🔗' : '👁'}
                </span>
                <span className="mono" style={{ fontSize: '12px' }}>{shortAddr(account)}</span>
                <button onClick={copyAddress} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '1px', display: 'flex' }}>
                  {copied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                </button>
              </div>
              <button className="btn btn-outline btn-sm desktop-only" onClick={handleDisconnect} style={{ fontSize: '12px', gap: '5px', padding: '5px 10px' }}>
                <LogOut size={12} /> {t('disconnect')}
              </button>
              <button className="btn btn-outline btn-sm mobile-only" onClick={handleDisconnect} style={{ padding: '5px 8px', display: 'flex' }}>
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ═══ BODY ═══ */}
      <div className="app-body">
        {/* Desktop sidebar */}
        <aside className="app-sidebar desktop-only">
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end={to === '/'}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', borderRadius: '10px', textDecoration: 'none', fontSize: '14px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--accent-bright)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--accent-glow)' : 'transparent',
                  border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                })}>
                <Icon size={16} />{label}
              </NavLink>
            ))}
          </nav>

          {/* Vault mini-tabs — sidebar pastida, faqat /vault va owner uchun */}
          {isVaultPage && isOwner && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <div style={{
                fontSize: 11, color: 'var(--text-muted)',
                padding: '4px 14px 8px', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Vault
              </div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {[
                  { id: 'statistika', label: t('vaultTabBoshqaruv') },
                  { id: 'locklar',    label: t('vaultTabLocklar')    },
                  { id: 'nft',        label: t('vaultTabNFT')        },
                  { id: 'kiritish',   label: t('vaultTabKiritish')   },
                  { id: 'narxlar',    label: t('vaultTabBoshqaruv')  },
                ].map(tab => {
                  const params = new URLSearchParams(location.search);
                  const active = (params.get('tab') || 'statistika') === tab.id;
                  return (
                    <NavLink
                      key={tab.id}
                      to={'/vault?tab=' + tab.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '9px 14px 9px 26px', borderRadius: '10px',
                        textDecoration: 'none', fontSize: '13px',
                        fontWeight: active ? 600 : 400,
                        color: active ? 'var(--accent-bright)' : 'var(--text-secondary)',
                        background: active ? 'var(--accent-glow)' : 'transparent',
                        border: active ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tab.label}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="app-main">
          {children}
        </main>
      </div>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <nav className="bottom-nav mobile-only">
        {bottomNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className="bottom-nav-item">
            {({ isActive }) => (
              <>
                <Icon size={20} color={isActive ? 'var(--accent-bright)' : 'var(--text-muted)'} />
                <span style={{
                  fontSize: '10px', fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--accent-bright)' : 'var(--text-muted)',
                }}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
        {/* More menu */}
        <button className="bottom-nav-item" onClick={() => setMobileMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <Menu size={20} color="var(--text-muted)" />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>···</span>
        </button>
      </nav>
    </div>
  );
}
