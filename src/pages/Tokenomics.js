import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useLang } from '../hooks/useLang';
import { ExternalLink, Copy, Check, Lock, Coins, BarChart3, RefreshCw } from 'lucide-react';

// ─── Konstantalar ─────────────────────────────────────────────────────────────
const RPC = "https://optimism.publicnode.com";

const STATE_VIEW_ABI = [
  "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"
];

const STATE_VIEW    = "0xc18a3169788F4F75A170290584ECA6395C75Ecdb";
const BLT_POOL_ID   = "0x87ba7c25a81c16f4a07d065099dc0821815282f42e25ca5b6a63096bcb6574d7";

const DUR_ADDRESS   = "0xf2f471dd1fBD278e54a81af7D5a22E3a38eA43Ff";
const BLT_ADDRESS   = "0xEac1b253E553E28c48535ed738dAB70204B5D28B";
const USDC_ADDRESS  = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";

const CREDITSALE_ADDRESS = "0x86808FFD1204C2BD9Ad5B79022968D11408d3efc";
const VAULT_ADDRESS      = "0x1B1F96f30B8F6265a299000Ab23862c35a41B4a9";

const Q96  = BigInt(2) ** BigInt(96);
const Q192 = BigInt(2) ** BigInt(192);

const TOTAL_SUPPLY  = 100_000_000;
const LOCKED_AMOUNT = 90_000_000;
const LOCKED_PCT    = 90;
const FREE_AMOUNT   = TOTAL_SUPPLY - LOCKED_AMOUNT;

// ─── Yordamchilar ─────────────────────────────────────────────────────────────
function fmtNum(n, digits = 2) {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(digits) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(digits) + "K";
  return n.toLocaleString("en", { maximumFractionDigits: digits });
}

function fmtUSD(n) {
  if (!n) return "—";
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "$" + (n / 1_000).toFixed(2) + "K";
  return "$" + n.toFixed(2);
}

function AddrChip({ addr, label }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const short = addr.slice(0, 8) + "..." + addr.slice(-6);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '6px 12px', fontSize: 13,
    }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{label}:</span>
      <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{short}</span>
      <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--success)' : 'var(--text-muted)', display: 'flex', padding: 0 }}>
        {copied ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
      </button>
      <a href={"https://optimistic.etherscan.io/address/" + addr} target="_blank" rel="noreferrer"
        style={{ color: 'var(--text-muted)', display: 'flex' }}>
        <ExternalLink size={13} />
      </a>
    </div>
  );
}

function TokenAddrChip({ addr, label }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const short = addr.slice(0, 8) + "..." + addr.slice(-6);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '6px 12px', fontSize: 13,
    }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{label}:</span>
      <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{short}</span>
      <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--success)' : 'var(--text-muted)', display: 'flex', padding: 0 }}>
        {copied ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
      </button>
      <a href={"https://optimistic.etherscan.io/token/" + addr} target="_blank" rel="noreferrer"
        style={{ color: 'var(--text-muted)', display: 'flex' }}>
        <ExternalLink size={13} />
      </a>
    </div>
  );
}

// ─── Token kartochkasi ─────────────────────────────────────────────────────────
function TokenCard({ symbol, color, price, loading, t }) {
  const priceUSD  = price || 0;
  const totalMcap = TOTAL_SUPPLY * priceUSD;
  const circMcap  = FREE_AMOUNT * priceUSD;

  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid ${color}30`,
      borderRadius: 'var(--radius)', padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${color}20`, border: `1px solid ${color}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Coins size={22} color={color} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 20, fontFamily: 'Space Mono, monospace' }}>{symbol}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Optimism Mainnet</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{t('tokenPrice')}</div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 16, fontWeight: 700, color }}>
            {loading ? "..." : priceUSD > 0 ? "$" + priceUSD.toFixed(6) : "—"}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="stat-card" style={{ padding: 14 }}>
          <div className="stat-label">{t('tokenTotalSupply')}</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmtNum(TOTAL_SUPPLY, 0)}</div>
          <div className="stat-sub">{symbol}</div>
        </div>
        <div className="stat-card" style={{ padding: 14 }}>
          <div className="stat-label">{t('tokenCirculating')}</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--success)' }}>{fmtNum(FREE_AMOUNT, 0)}</div>
          <div className="stat-sub">{symbol} · {100 - LOCKED_PCT}%</div>
        </div>
        <div className="stat-card" style={{ padding: 14 }}>
          <div className="stat-label">Total Market Cap</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{loading ? "..." : fmtUSD(totalMcap)}</div>
          <div className="stat-sub">{t('tokenTotalSupply')} × {t('tokenPrice')}</div>
        </div>
        <div className="stat-card" style={{ padding: 14 }}>
          <div className="stat-label">Circulating Market Cap</div>
          <div className="stat-value" style={{ fontSize: 18, color: 'var(--accent-bright)' }}>{loading ? "..." : fmtUSD(circMcap)}</div>
          <div className="stat-sub">{t('tokenCirculating')} × {t('tokenPrice')}</div>
        </div>
      </div>

      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 14,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            <Lock size={14} color={color} />
            {t('tokenLocked')}
          </div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 13, fontWeight: 700, color }}>
            {LOCKED_PCT}% · {fmtNum(LOCKED_AMOUNT, 0)} {symbol}
          </div>
        </div>
        <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            width: LOCKED_PCT + "%", height: '100%', borderRadius: 4,
            background: `linear-gradient(90deg, ${color}, ${color}88)`,
            transition: 'width 1s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          <span>{t('tokenLocked')}: {fmtNum(LOCKED_AMOUNT, 0)}</span>
          <span>{t('tokenCirculating')}: {fmtNum(FREE_AMOUNT, 0)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Asosiy sahifa ─────────────────────────────────────────────────────────────
export default function Tokenomics() {
  const { t } = useLang();
  const [durPrice, setDurPrice] = useState(null);
  const [bltPrice, setBltPrice] = useState(null);
  const [loading,  setLoading]  = useState(true);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      // DUR narxi — statik $0.01
      setDurPrice(0.01);
      // BLT narxi — Uniswap V4 dan
      try {
        const provider  = new ethers.JsonRpcProvider(RPC);
        const sv        = new ethers.Contract(STATE_VIEW, STATE_VIEW_ABI, provider);
        const [sqrtP]   = await sv.getSlot0(BLT_POOL_ID);
        const sqrtBig   = BigInt(sqrtP.toString());
        const BLT_ADDR  = "0xEac1b253E553E28c48535ed738dAB70204B5D28B".toLowerCase();
        const USDC_ADDR = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85".toLowerCase();
        let price;
        if (BLT_ADDR < USDC_ADDR) {
          price = Number((sqrtBig * sqrtBig * BigInt(1e18)) / Q192) / 1e12;
        } else {
          const a = Number((sqrtBig * sqrtBig) / BigInt(2 ** 96));
          price = a > 0 ? Number(BigInt(2 ** 96) * BigInt(1e18) / (sqrtBig * sqrtBig / BigInt(2 ** 96))) / 1e18 : 1.0;
        }
        setBltPrice(price > 0 ? price : 1.0);
      } catch {
        setBltPrice(1.0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrices(); }, []);

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Tokenomics</h1>
          <p className="page-subtitle">{t('tokenSubtitle')}</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchPrices} disabled={loading}>
          <RefreshCw size={14} /> {t('vaultRefresh')}
        </button>
      </div>

      {/* Token kartochkalari */}
      <div className="grid-2" style={{ marginBottom: 28 }}>
        <TokenCard symbol="DUR" color="var(--dur-color)" price={durPrice} loading={loading} t={t} />
        <TokenCard symbol="BLT" color="var(--blt-color)" price={bltPrice} loading={loading} t={t} />
      </div>

      {/* Umumiy taqsimot */}
      <p className="section-title">{t('tokenDistribution')}</p>
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'Space Mono, monospace', color: 'var(--accent-bright)' }}>90%</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('tokenLocked')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              80M — 10+ {t('approvedDays')}<br />10M — 3 {t('approvedDays')}
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'Space Mono, monospace', color: 'var(--success)' }}>10%</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('tokenCirculating')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Likvidlik va savdo<br />uchun mavjud
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'Space Mono, monospace', color: 'var(--warning)' }}>100M</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('tokenTotalSupply')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Har bir token uchun<br />o'zgarmas
            </div>
          </div>
        </div>
      </div>

      {/* Loyiha haqida */}
      <p className="section-title">{t('tokenAbout')}</p>
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'var(--accent-glow)', border: '1px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart3 size={20} color="var(--accent-bright)" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>NasiyaSale</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>
              NasiyaSale — DUR tokenini nasiya asosida sotish va sotib olish uchun
              ishlab chiqilgan markazlashmagan platforma. Barcha savdolar smart kontrakt
              orqali amalga oshiriladi. Hech qanday vositachi yoki boshqaruvchi talab etilmaydi.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <div className="badge badge-accent">Optimism Mainnet</div>
              <div className="badge badge-success">Decentralized</div>
              <div className="badge badge-muted">No Admin</div>
              <div className="badge badge-muted">Onchain</div>
              <div className="badge badge-muted">Uniswap V4</div>
            </div>
          </div>
        </div>
      </div>

      {/* Kontrakt manzillari */}
      <p className="section-title">Smart Kontraktlar</p>
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AddrChip addr={CREDITSALE_ADDRESS} label="CreditSale" />
          <AddrChip addr={VAULT_ADDRESS} label="PrivateTimeLockVault" />
          <div style={{ marginTop: 4, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Tarmoq: <strong style={{ color: 'var(--text-secondary)' }}>Optimism Mainnet</strong> · Chain ID: <strong style={{ color: 'var(--text-secondary)' }}>10</strong>
          </div>
        </div>
      </div>

      {/* Token manzillari */}
      <p className="section-title">{t('tokenAddresses')}</p>
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <TokenAddrChip addr={DUR_ADDRESS}  label="DUR" />
          <TokenAddrChip addr={BLT_ADDRESS}  label="BLT" />
          <TokenAddrChip addr={USDC_ADDRESS} label="USDC" />
          <div style={{ marginTop: 4, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Tarmoq: <strong style={{ color: 'var(--text-secondary)' }}>Optimism Mainnet</strong> · Chain ID: <strong style={{ color: 'var(--text-secondary)' }}>10</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
