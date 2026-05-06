import React from 'react';

// Loading spinner with text
export function LoadingState({ text = "Yuklanmoqda..." }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
      <div className="spinner" style={{ margin: '0 auto 14px', width: 28, height: 28, borderWidth: 3 }} />
      <div style={{ fontSize: '14px' }}>{text}</div>
    </div>
  );
}

// Empty state
export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
      {Icon && <Icon size={36} color="var(--text-muted)" style={{ marginBottom: 14 }} />}
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{subtitle}</div>}
    </div>
  );
}

// Connect wallet prompt
export function ConnectPrompt({ message = "Ko'rish uchun hamyonni ulang" }) {
  return (
    <EmptyState
      title={message}
      subtitle="MetaMask orqali ulaning"
    />
  );
}

// Token badge
export function TokenBadge({ token }) {
  const colors = { DUR: 'var(--dur-color)', USDT: 'var(--usdt-color)', BLT: 'var(--blt-color)' };
  const color = colors[token] || 'var(--text-secondary)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
      background: `${color}20`, color, border: `1px solid ${color}40`,
      fontFamily: 'Space Mono, monospace'
    }}>
      {token}
    </span>
  );
}

// Collateral badge
export function CollateralBadge({ isCollateral }) {
  return (
    <span className="badge" style={{
      background: isCollateral ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
      color: isCollateral ? 'var(--success)' : 'var(--warning)',
      border: `1px solid ${isCollateral ? 'var(--success)' : 'var(--warning)'}`,
      fontSize: '11px'
    }}>
      {isCollateral ? '🔒 Garovli' : '🤝 Garovsiz'}
    </span>
  );
}

// Short address display
export function ShortAddress({ address, style }) {
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return <span style={{ color: 'var(--text-muted)', ...style }}>—</span>;
  }
  const short = address.slice(0, 6) + '...' + address.slice(-4);
  return (
    <span className="address" style={style} title={address}>{short}</span>
  );
}

// Countdown timer display
export function DueDateBadge({ dueDate }) {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(dueDate) - now;
  const expired = diff <= 0;
  const days = Math.floor(Math.abs(diff) / 86400);
  const hrs = Math.floor((Math.abs(diff) % 86400) / 3600);

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '6px', fontSize: '12px',
      background: expired ? 'var(--danger-glow)' : 'var(--success-glow)',
      color: expired ? 'var(--danger)' : 'var(--success)',
      border: `1px solid ${expired ? 'var(--danger)' : 'var(--success)'}`,
    }}>
      {expired ? `⚠ Muddati o'tgan` : `⏱ ${days}k ${hrs}s qoldi`}
    </span>
  );
}

// Stat card
export function StatCard({ label, value, sub, color, style }) {
  return (
    <div className="stat-card" style={style}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: color || 'var(--text-primary)', fontSize: '22px' }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
