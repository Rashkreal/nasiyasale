import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useLang } from '../hooks/useLang';
import { ExternalLink, Copy, Check, Coins, BarChart3, RefreshCw } from 'lucide-react';

// ─── Konstantalar (Arbitrum One) ───────────────────────────────────────────────
const RPC = "https://arb1.arbitrum.io/rpc";

// Uniswap V4 — DUR jonli narxi uchun (Vault kontraktidan o'qilgan)
const STATE_VIEW   = "0x76Fd297e2D437cd7f76d50F01AfE6160f86e9990";
const DUR_POOL_ID  = "0x3c9073128da676c6e7e916fdbfcc18a2e08c09e672d01b69913fb68c44fae1cd";
const STATE_VIEW_ABI = [
  "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"
];

// Token va kontrakt manzillari (zanjirdan tasdiqlangan)
const DUR_ADDRESS        = "0x92E1EbD0Cfac092047AB4a69B6E6a8ECA0687e26";
const USDC_ADDRESS       = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const WBTC_ADDRESS       = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";
const WETH_ADDRESS       = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const CREDITSALE_ADDRESS = "0x61a011ca9a21Ec4073fA7E20448cbec86958B182";
const VAULT_ADDRESS      = "0x334ABa8643C7B7C97d5CeF5b73991e2af7D43462";

const TOTAL_SUPPLY  = 100_000_000;

const Q192 = BigInt(2) ** BigInt(192);

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

// DUR jonli narxi: Uniswap V4 sqrtPriceX96 dan (DUR currency0, USDC currency1)
// DUR=18 dec, USDC=6 dec. price = (sqrtP^2 * 10^12 / 2^192) [USDC/DUR]
function priceFromSqrt(sqrtP) {
  try {
    const s = BigInt(sqrtP.toString());
    const num = s * s * (10n ** 12n) * (10n ** 6n);
    return Number(num / Q192) / 1e6;
  } catch {
    return 0;
  }
}

function AddrChip({ addr, label, isToken }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const short = addr.slice(0, 8) + "..." + addr.slice(-6);
  const base = isToken
    ? "https://arbiscan.io/token/"
    : "https://arbiscan.io/address/";
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
      <a href={base + addr} target="_blank" rel="noreferrer"
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
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Arbitrum One</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Narx</div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 16, fontWeight: 700, color }}>
            {loading ? "..." : priceUSD > 0 ? "$" + priceUSD.toFixed(6) : "—"}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="stat-card" style={{ padding: 14 }}>
          <div className="stat-label">{t("tokenTotalSupply")}</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmtNum(TOTAL_SUPPLY, 0)}</div>
          <div className="stat-sub">{symbol} · fixed</div>
        </div>
        <div className="stat-card" style={{ padding: 14 }}>
          <div className="stat-label">Total Market Cap</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{loading ? "..." : fmtUSD(totalMcap)}</div>
          <div className="stat-sub">{t("tokenTotalSupply")} × {t("tokenPrice")}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Asosiy sahifa ─────────────────────────────────────────────────────────────
export default function Tokenomics() {
  const { t } = useLang();
  const [durPrice, setDurPrice] = useState(null);
  const [loading,  setLoading]  = useState(true);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(RPC, undefined, { batchMaxCount: 1 });
      const sv = new ethers.Contract(STATE_VIEW, STATE_VIEW_ABI, provider);
      const [sqrtP] = await sv.getSlot0(DUR_POOL_ID);
      const price = priceFromSqrt(sqrtP);
      setDurPrice(price > 0 ? price : null);
    } catch (e) {
      console.error("DUR narx o'qishda xato:", e);
      setDurPrice(null);
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
          <p className="page-subtitle">
            DUR token haqida to'liq ma'lumot — taklif, lock va bozor qiymati
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchPrices} disabled={loading}>
          <RefreshCw size={14} /> {t('vaultRefresh')}
        </button>
      </div>

      {/* Token kartochkasi */}
      <div style={{ marginBottom: 28 }}>
        <TokenCard symbol="DUR" color="var(--dur-color)" price={durPrice} loading={loading} t={t} />
      </div>

      {/* Umumiy taklif */}
      <p className="section-title">{t("tokenDistribution")}</p>
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', padding: '8px 16px' }}>
            <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'Space Mono, monospace', color: 'var(--warning)' }}>100M</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("tokenTotalSupply")}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              O'zgarmas — mint funksiyasi yo'q
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 240, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            DUR jami taklifi <strong>100,000,000</strong> — qat'iy belgilangan va ko'paytirib bo'lmaydi.
            Taqsimot tasdiqlangan: <strong>99% Vault'da qulflangan</strong>, 1% likvidlik va muomala uchun.
            <div style={{ marginTop: 10 }}>
              <div>• <strong>50M (50%)</strong> — stream, 5-yildan 10-yilgacha ochiladi</div>
              <div>• <strong>30M (30%)</strong> — stream, 3-yildan 5-yilgacha ochiladi</div>
              <div>• <strong>15M (15%)</strong> — stream, 2-yildan 3-yilgacha ochiladi</div>
              <div>• <strong>4M (4%)</strong> — muddatli lock, 2026-yil sentabrgacha</div>
              <div>• <strong>1M (1%)</strong> — likvidlik va erkin muomala</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              Har bir lock'ning zanjirdagi tranzaksiya havolasi Whitepaper'ning
              "Security &amp; Locks" bo'limida keltirilgan.
            </div>
          </div>
        </div>
      </div>

      {/* Loyiha haqida */}
      <p className="section-title">{t("tokenAbout")}</p>
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
              <div className="badge badge-accent">Arbitrum One</div>
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
          <AddrChip addr={VAULT_ADDRESS}      label="PrivateTimeLockVault" />
          <div style={{ marginTop: 4, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Tarmoq: <strong style={{ color: 'var(--text-secondary)' }}>Arbitrum One</strong> · Chain ID: <strong style={{ color: 'var(--text-secondary)' }}>42161</strong>
          </div>
        </div>
      </div>

      {/* Token manzillari */}
      <p className="section-title">{t("tokenAddresses")}</p>
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AddrChip addr={DUR_ADDRESS}  label="DUR"  isToken />
          <AddrChip addr={USDC_ADDRESS} label="USDC" isToken />
          <AddrChip addr={WBTC_ADDRESS} label="WBTC (garov)" isToken />
          <AddrChip addr={WETH_ADDRESS} label="WETH (garov)" isToken />
          <div style={{ marginTop: 4, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Tarmoq: <strong style={{ color: 'var(--text-secondary)' }}>Arbitrum One</strong> · Chain ID: <strong style={{ color: 'var(--text-secondary)' }}>42161</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
