import React from 'react';
import { useLang } from '../hooks/useLang';
import { CONTRACT_ADDRESS } from '../abi/contract';
import { Shield, Zap, Users, Lock, ExternalLink, Code, AlertTriangle, Download } from 'lucide-react';

export default function About() {
  const { t } = useLang();

  return (
    <div style={{ maxWidth: '750px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">{t('aboutPageTitle')}</h1>
          <p className="page-subtitle">{t('aboutPageSubtitle')}</p>
        </div>
        <a
          href="https://nasiyasale.vercel.app/nasiyasale.txt"
          download="nasiyasale.txt"
          className="btn btn-outline btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0 }}
        >
          <Download size={14} />
          {t("aboutDoc")}
        </a>
      </div>

      {/* Asosiy tushuntirish */}
      <div className="card" style={{ marginBottom: '16px', padding: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--accent-bright)' }}>
          {t('aboutWhatIs')}
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '12px' }}>
          {t('aboutWhatIsDesc1')}
        </p>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
          {t('aboutWhatIsDesc2')}
        </p>
      </div>

      {/* Smart kontrakt haqida */}
      <div className="card" style={{ marginBottom: '16px', padding: '24px', border: '1px solid var(--success)', background: 'rgba(16,185,129,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Lock size={20} color="var(--success)" />
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--success)' }}>
            {t('aboutSmartTitle')}
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '12px' }}>
          {t('aboutSmartDesc1')}
        </p>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '12px' }}>
          {t('aboutSmartDesc2')}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <Code size={14} color="var(--text-muted)" />
          <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
            {CONTRACT_ADDRESS}
          </span>
          <a href={`https://optimistic.etherscan.io/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--accent-bright)', flexShrink: 0 }}>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Qanday ishlaydi */}
      <div className="card" style={{ marginBottom: '16px', padding: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>{t('aboutHowTitle')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { icon: Zap, color: 'var(--accent-bright)', title: t('aboutStep1Title'), desc: t('aboutStep1Desc') },
            { icon: Users, color: 'var(--success)', title: t('aboutStep2Title'), desc: t('aboutStep2Desc') },
            { icon: Shield, color: 'var(--warning)', title: t('aboutStep3Title'), desc: t('aboutStep3Desc') },
            { icon: AlertTriangle, color: 'var(--danger)', title: t('aboutStep4Title'), desc: t('aboutStep4Desc') },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: '14px' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                background: `${color}20`, border: `1px solid ${color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={16} color={color} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BL tizimi */}
      <div className="card" style={{ marginBottom: '16px', padding: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>{t('aboutBLTitle')}</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '12px' }}>
          {t('aboutBLDesc')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { label: t('aboutBLRow1Label'), value: t('aboutBLRow1Value') },
            { label: t('aboutBLRow2Label'), value: t('aboutBLRow2Value') },
            { label: t('aboutBLRow3Label'), value: t('aboutBLRow3Value') },
            { label: t('aboutBLRow4Label'), value: t('aboutBLRow4Value') },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
              <span className="mono" style={{ fontSize: '12px', fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Garov tokenlari */}
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>{t('aboutTokensTitle')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { token: 'DUR', desc: t('aboutTokenDUR'), role: t('aboutRoleTrade') },
            { token: 'USDC', desc: t('aboutTokenUSDC'), role: t('aboutRolePayCol') },
            { token: 'USDT', desc: t('aboutTokenUSDT'), role: t('aboutRoleCol') },
            { token: 'BLT', desc: t('aboutTokenBLT'), role: t('aboutRoleCol') },
            { token: 'WBTC', desc: t('aboutTokenWBTC'), role: t('aboutRoleCol') },
            { token: 'WETH', desc: t('aboutTokenWETH'), role: t('aboutRoleCol') },
          ].map(({ token, desc, role }) => (
            <div key={token} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{token}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{desc}</span>
              </div>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--accent-glow)', color: 'var(--accent-bright)', fontWeight: 600 }}>{role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
