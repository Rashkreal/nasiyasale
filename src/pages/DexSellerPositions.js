import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { useWeb3 } from '../hooks/useWeb3';
import { TOKEN_DECIMALS } from '../abi/contract';
import { saveLocalTxHistory } from '../utils/localTxHistory';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════
//  Sotuvchi tomoni: men sotgan (approveListing/fulfillBuyOffer orqali
//  boshqa birov xarid qilgan) pozitsiyalarim. DexPositions.js'ning
//  ko'zgu-sahifasi, lekin sotuvchi garov/swap/to'lovni boshqarmaydi —
//  faqat kuzatadi, va agar pozitsiya likvidatsiya holatiga tushsa, uni
//  ishga tushirishi mumkin (permissionless, lekin aynan sotuvchiga eng
//  foydali harakat, chunki qarzini qaytarib olishni tezlashtiradi).
// ══════════════════════════════════════════════════════════════════════

const DEX_ADDRESS = '0xA8c28410bD55bf85fdBa3240FcAE068B8Eeae2c4';

const TOKEN_WBTC = 0;
const TOKEN_WETH = 1;
const TOKEN_USDC = 2;

function tokenSymbolFor(tokenId) {
  if (tokenId === TOKEN_WBTC) return 'WBTC';
  if (tokenId === TOKEN_WETH) return 'WETH';
  return 'USDC';
}
function tokenDecimalsFor(tokenId) {
  if (tokenId === TOKEN_WBTC) return TOKEN_DECIMALS.WBTC;
  if (tokenId === TOKEN_WETH) return TOKEN_DECIMALS.WETH;
  return TOKEN_DECIMALS.USDC;
}

const DEX_ABI = [
  'function positions(uint256) external view returns (address buyer, address seller, uint256 priceUSDC, uint256 durAmount, uint256 dueDate, uint8 collateralTokenId, uint256 collateralAmount, uint16 bufferBps, uint8 status)',
  'function isLiquidatable(uint256 positionId) external view returns (bool)',
  'function liquidate(uint256 positionId) external',
  'function totalPositionsBySeller(address seller) external view returns (uint256)',
  'function getPositionsBySeller(address seller, uint256 offset, uint256 limit) external view returns (tuple(address buyer, address seller, uint256 priceUSDC, uint256 durAmount, uint256 dueDate, uint8 collateralTokenId, uint256 collateralAmount, uint16 bufferBps, uint8 status)[] result, uint256[] ids)',
  // Faqat shu sahifada ishlatiladigan xatolar
  'error PositionNotFound()',
  'error PositionNotOpen()',
  'error NotLiquidatable()',
];

const ERROR_MESSAGES = {
  PositionNotFound: "Bunday pozitsiya topilmadi",
  PositionNotOpen: "Bu pozitsiya endi ochiq emas",
  NotLiquidatable: "Bu pozitsiya hali likvidatsiya qilinishi mumkin emas",
};

const DEX_INTERFACE = new ethers.Interface(DEX_ABI);

function translateContractError(e) {
  const rawMsg = (e?.reason || e?.shortMessage || e?.message || '').toLowerCase();
  if (rawMsg.includes('rejected') || rawMsg.includes('denied') || rawMsg.includes('user denied')) {
    return 'Rad etildi';
  }
  const candidates = [e?.data, e?.error?.data, e?.info?.error?.data, e?.error?.error?.data];
  for (const data of candidates) {
    if (!data || typeof data !== 'string') continue;
    try {
      const parsed = DEX_INTERFACE.parseError(data);
      if (parsed?.name) return ERROR_MESSAGES[parsed.name] || `Kontrakt xatosi: ${parsed.name}`;
    } catch { /* keyingisini sinaymiz */ }
  }
  for (const [name, msg] of Object.entries(ERROR_MESSAGES)) {
    if (rawMsg.includes(name.toLowerCase())) return msg;
  }
  return e?.reason || e?.shortMessage || "Noma'lum xatolik yuz berdi — birozdan keyin qayta urinib ko'ring";
}

const RPC        = 'https://rpc.ankr.com/arbitrum/e531710028d0852baae1e1de9993017d4025b2d30d21d0ac5f812150724416b5';
const RPC_BACKUP = 'https://arb1.arbitrum.io/rpc';

async function getReadProvider() {
  try {
    const p = new ethers.JsonRpcProvider(RPC, undefined, { batchMaxCount: 1 });
    await p.getBlockNumber();
    return p;
  } catch {
    return new ethers.JsonRpcProvider(RPC_BACKUP, undefined, { batchMaxCount: 1 });
  }
}

function withWalletTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message || "Wallet javob bermadi")), ms)),
  ]);
}
function withProgressToast(promise, toastId, stages) {
  const timers = stages.map(([ms, msg]) => setTimeout(() => toast.loading(msg, { id: toastId }), ms));
  return promise.finally(() => timers.forEach(clearTimeout));
}
const WALLET_STAGES = [
  [8000, "MetaMask'da tasdiqlashni kuting..."],
  [20000, "Sekin tarmoq — MetaMask'ni oching va tasdiqlang"],
  [45000, "Hali kutilmoqda. MetaMask ilovasini qayta oching."],
];
const CHAIN_STAGES = [
  [10000, "Blockchain'da tasdiqlanmoqda..."],
  [40000, "Hali kutilmoqda — Arbitrum tarmog'i band bo'lishi mumkin"],
];

// Dex.js'dagi bilan bir xil mantiq (DexPositions.js'da tuzatilgan) —
// toPrecision() kichik sonlarni "3.6e-7" ko'rinishida chiqarib
// yubormasligi uchun.
function fmt(raw, decimals, sigFigs = 4) {
  if (raw === null || raw === undefined) return '—';
  const num = parseFloat(ethers.formatUnits(raw, decimals));
  if (!isFinite(num)) return '—';
  if (num === 0) return '0';
  const abs = Math.abs(num);
  let str;
  if (abs >= 1) {
    str = num.toPrecision(sigFigs);
    if (str.includes('e') || str.includes('E')) str = num.toFixed(0);
  } else {
    const leadingZeros = Math.ceil(-Math.log10(abs));
    const places = Math.min(leadingZeros + sigFigs, 18);
    str = num.toFixed(places);
  }
  return str.replace(/\.?0+$/, '').replace(/\.$/, '');
}

const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
function fmtDate(unixSeconds) {
  if (!unixSeconds || unixSeconds === 0n) return '—';
  const d = new Date(Number(unixSeconds) * 1000);
  return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

// CreditSale'ning Approved.js'dagi timeLeft() bilan bir xil mantiq.
function timeLeft(dueDate) {
  const now = Math.floor(Date.now() / 1000);
  const due = Number(dueDate);
  const diff = due - now;

  if (diff <= 0) return { expired: true, text: "Muddati o'tgan" };

  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;

  if (d > 0) return { expired: false, text: `${d} kun ${h} soat qoldi` };
  if (h > 0) return { expired: false, text: `${h} soat ${m} daqiqa qoldi` };
  if (m > 0) return { expired: false, text: `${m} daqiqa ${s} soniya qoldi` };
  return { expired: false, text: `${s} soniya qoldi` };
}

function shortAddr(addr) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const STATUS_LABELS = ['Ochiq', "To'langan", 'Likvidatsiya qilingan'];

export default function DexSellerPositions() {
  const { account, signer, ensureCorrectChain, openWalletForRequest, refreshBalances } = useWeb3();

  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    if (!account) { setPositions([]); setLoading(false); return; }
    setLoading(true);
    try {
      const provider = await getReadProvider();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, provider);

      const total = await dex.totalPositionsBySeller(account);
      const [rawPositions, ids] = await dex.getPositionsBySeller(account, 0, total);

      const loaded = await Promise.all(
        rawPositions.map(async (p, i) => {
          const id = ids[i];
          let liquidatable = false;
          try { liquidatable = await dex.isLiquidatable(id); } catch { /* e'tiborsiz */ }
          return {
            id,
            buyer: p.buyer,
            seller: p.seller,
            priceUSDC: p.priceUSDC,
            durAmount: p.durAmount,
            dueDate: p.dueDate,
            collateralTokenId: Number(p.collateralTokenId),
            collateralAmount: p.collateralAmount,
            status: Number(p.status),
            liquidatable,
          };
        })
      );

      setPositions(loaded.sort((a, b) => Number(b.id - a.id)));
    } catch (e) {
      console.error('load seller positions error:', e);
      const rawMsg = e?.reason || e?.shortMessage || e?.info?.error?.message || e?.message || "Noma'lum";
      toast.error(`Yuklashda xato: ${rawMsg}`, { duration: 10000 });
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const handleLiquidate = async (position) => {
    setActionLoading(position.id.toString());
    const tid = toast.loading('Likvidatsiya qilinmoqda...');
    try {
      await ensureCorrectChain();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withProgressToast(
        withWalletTimeout(dex.liquidate(position.id), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
        tid, WALLET_STAGES
      );
      await withProgressToast(withWalletTimeout(tx.wait(), 180000, "Tranzaksiya juda uzoq tasdiqlanmoqda"), tid, CHAIN_STAGES);

      toast.success('Likvidatsiya bajarildi! Qarzingiz qaytarildi.', { id: tid });
      saveLocalTxHistory({
        type: 'dexLiquidate',
        label: 'DEX: Likvidatsiya qilindi (sotuvchi)',
        listingId: position.id.toString(),
        txHash: tx.hash,
        status: 'success',
        account,
      });
      refreshBalances();
      load();
    } catch (e) {
      console.error('liquidate error:', e);
      toast.error(translateContractError(e), { id: tid });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}>P2P Market — sotganlarim</h2>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
        DUR sotgan pozitsiyalaringizni kuzating — qarz, muddat va garov holati.
      </p>

      {loading && positions.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
      )}
      {!loading && positions.filter((p) => p.status === 0).length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
          Hozircha faol sotuvlaringiz yo'q. Elon joylab, birov tasdiqlagach, shu yerda paydo bo'ladi.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {positions.filter((p) => p.status === 0).map((p) => {
          const idStr = p.id.toString();
          const isExpanded = expandedId === idStr;
          const collSymbol = tokenSymbolFor(p.collateralTokenId);
          const collDecimals = tokenDecimalsFor(p.collateralTokenId);
          const overdue = Date.now() / 1000 > Number(p.dueDate);

          let healthColor = 'var(--success)';
          let healthLabel = 'Sog\'lom';
          if (p.liquidatable) { healthColor = 'var(--danger)'; healthLabel = overdue ? 'Muddati o\'tgan' : 'Likvidatsiya xavfi'; }
          else if (overdue) { healthColor = 'var(--danger)'; healthLabel = 'Muddati o\'tgan'; }

          return (
            <div key={idStr} className="card">
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpandedId(isExpanded ? null : idStr)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mono" style={{ color: 'var(--accent-bright)', fontWeight: 700 }}>#{idStr}</span>
                  <span className="badge" style={{ fontSize: 11, background: `${healthColor}22`, color: healthColor, border: `1px solid ${healthColor}` }}>
                    {healthLabel}
                  </span>
                  <span style={{ fontSize: 13 }}>
                    Qarzdor to'laydi: <b>{fmt(p.priceUSDC, TOKEN_DECIMALS.USDC)} USDC</b>
                  </span>
                </div>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {isExpanded && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Xaridor: <span className="mono">{shortAddr(p.buyer)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Muddat: {fmtDate(p.dueDate)}
                    {overdue
                      ? <span style={{ color: 'var(--danger)' }}> (o'tib ketgan)</span>
                      : <span style={{ color: 'var(--success)' }}> · {timeLeft(p.dueDate).text}</span>
                    }
                  </div>
                  <div style={{ fontSize: 13 }}>
                    Xaridorning garovi: <b>{fmt(p.collateralAmount, collDecimals)} {collSymbol}</b>
                    {p.durAmount > 0n && <> · Hali swap qilinmagan DUR: <b>{fmt(p.durAmount, TOKEN_DECIMALS.DUR)} DUR</b></>}
                  </div>

                  {p.liquidatable && (
                    <button
                      className="btn btn-sm"
                      style={{ background: 'var(--danger)', color: '#fff' }}
                      disabled={actionLoading === idStr}
                      onClick={() => handleLiquidate(p)}
                    >
                      <AlertTriangle size={14} /> Likvidatsiya qilish (qarzingizni qaytarib oling)
                    </button>
                  )}
                  {!p.liquidatable && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Xaridor hali muddatida — garov/to'lov faqat xaridorning o'zi tomonidan boshqariladi.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!account && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16 }}>
          Sotuvlaringizni ko'rish uchun hamyonni ulang
        </div>
      )}
    </div>
  );
}
