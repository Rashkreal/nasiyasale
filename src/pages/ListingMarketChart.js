import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import toast from 'react-hot-toast';
import { useWeb3 } from '../hooks/useWeb3';
import { TOKEN_ADDRESSES, TOKEN_DECIMALS, ERC20_ABI } from '../abi/contract';
import { saveLocalTxHistory } from '../utils/localTxHistory';
import { RefreshCw, ArrowRightLeft, ChevronDown, ChevronUp } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════
//  BTC/USDC grafigi + ochiq pozitsiyalarni boshqarish (MetaTrader'ga
//  o'xshash tajriba) — narxni ko'rgan holda, o'sha yerning o'zida svop
//  amallarini bajarish.
//
//  MUHIM FARQ MetaTrader'dan: ListingMarket — P2P kredit bozori, "bozor
//  buyurtmasi" (darhol bajariladigan savdo) tushunchasi yo'q. Shuning
//  uchun bu yerda "darhol sotib olish/sotish" emas, balki ALLAQACHON
//  OCHIQ pozitsiyalarning SVOP amallari (garovni WBTC/WETH'ga aylantirish,
//  WBTC principal'ni birlashtirish) joylashtirilgan — bular ListingMarket
//  - Pozitsiyalarim sahifasidagi bilan bir xil, faqat endi narx grafigi
//  bilan birga ko'rinadi.
//
//  Narx grafigi manbai (Binance) va kontraktning garov/svop
//  hisoblashlari (Chainlink) — ikki MUSTAQIL manba, ataylab shunday: biri
//  umumiy bozor tendensiyasini, ikkinchisi esa haqiqiy svop natijasini
//  ko'rsatadi.
// ══════════════════════════════════════════════════════════════════════

const DEX_ADDRESS = '0x8aC38A6C9E02EE75658ae6f2d6Fd93e8e43c247f';

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
  'function positions(uint256) external view returns (address buyer, address seller, uint256 priceUSDC, uint256 wbtcAmount, uint256 dueDate, uint8 collateralTokenId, uint256 collateralAmount, uint16 bufferBps, uint8 status)',
  'function currentValue(uint256 positionId) external view returns (uint256)',
  'function isLiquidatable(uint256 positionId) external view returns (bool)',
  'function totalPositionsByBuyer(address buyer) external view returns (uint256)',
  'function getPositionsByBuyer(address buyer, uint256 offset, uint256 limit) external view returns (tuple(address buyer, address seller, uint256 priceUSDC, uint256 wbtcAmount, uint256 dueDate, uint8 collateralTokenId, uint256 collateralAmount, uint16 bufferBps, uint8 status)[] result, uint256[] ids)',
  'function PROTOCOL_FEE_BPS() external view returns (uint16)',
  'function mergeWbtcPrincipal(uint256 positionId, uint256 minUsdcOut) external',
  'function swapCollateralToToken(uint256 positionId, uint8 targetTokenId, uint256 minAmountOut) external',
  'function swapCollateralToUsdc(uint256 positionId, uint256 minUsdcOut) external',
  // Kontraktning maxsus xatolari
  'error AlreadySwapped()',
  'error BadChainlinkPrice()',
  'error BadTokenId()',
  'error NoPriceAvailable()',
  'error NotBuyer()',
  'error NothingToSwap()',
  'error PositionNotOpen()',
  'error SequencerDown()',
  'error SequencerFeedDead()',
  'error SequencerGracePeriod()',
  'error StaleChainlinkPrice()',
  'error StaleChainlinkRound()',
  'error SwapWouldLeaveLiquidatable()',
  'error TooLittleReceived(uint256 minOut, uint256 actualOut)',
  'error ZeroAmount()',
];

const ERROR_MESSAGES = {
  AlreadySwapped: "Garov allaqachon boshqa tokenga aylantirilgan",
  BadTokenId: "Noto'g'ri token tanlandi",
  NoPriceAvailable: "Hech qanday narx manbai topilmadi",
  NotBuyer: "Bu amalni faqat pozitsiya xaridori bajara oladi",
  NothingToSwap: "Svop qilish uchun WBTC principal qolmagan",
  PositionNotOpen: "Bu pozitsiya endi ochiq emas",
  SequencerDown: "Arbitrum sequencer vaqtincha ishlamayapti — birozdan keyin urinib ko'ring",
  SequencerGracePeriod: "Sequencer yaqinda tiklandi — bir necha daqiqa kutish kerak",
  SequencerFeedDead: "Sequencer holatini tekshirib bo'lmadi",
  BadChainlinkPrice: "Narx manbasidan noto'g'ri ma'lumot keldi",
  StaleChainlinkPrice: "Narx manbasi eskirgan — birozdan keyin qayta urinib ko'ring",
  StaleChainlinkRound: "Narx manbasi to'liq yangilanmagan",
  SwapWouldLeaveLiquidatable: "Bu svop pozitsiyani darhol likvidatsiyaga tashlab yuboradi — avval garov qo'shing",
  TooLittleReceived: "Svop natijasi kutilgandan kam — slippage juda yuqori",
  ZeroAmount: "Miqdor 0 bo'lishi mumkin emas",
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

const INTERVALS = [
  { value: '15m', label: '15 daqiqa' },
  { value: '1h', label: '1 soat' },
  { value: '4h', label: '4 soat' },
  { value: '1d', label: '1 kun' },
  { value: '1w', label: '1 hafta' },
];

export default function ListingMarketChart() {
  const { account, signer, ensureCorrectChain, openWalletForRequest, refreshBalances } = useWeb3();

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  const [interval, setInterval_] = useState('1h');
  const [chartLoading, setChartLoading] = useState(true);
  const [lastPrice, setLastPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);

  const [positions, setPositions] = useState([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // ── Grafikni bir marta yaratish ─────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.06)' },
        horzLines: { color: 'rgba(255,255,255,0.06)' },
      },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      width: chartContainerRef.current.clientWidth,
      height: 420,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  const loadChart = useCallback(async () => {
    setChartLoading(true);
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=BTCUSDC&interval=${interval}&limit=500`
      );
      if (!res.ok) throw new Error(`Binance API xato: ${res.status}`);
      const raw = await res.json();

      const candles = raw.map((k) => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
      }));

      if (seriesRef.current) {
        seriesRef.current.setData(candles);
        chartRef.current?.timeScale().fitContent();
      }

      if (candles.length >= 2) {
        const last = candles[candles.length - 1];
        const prev = candles[0];
        setLastPrice(last.close);
        setPriceChange(((last.close - prev.open) / prev.open) * 100);
      }
    } catch (e) {
      console.error('chart data load error:', e);
      toast.error("Grafik ma'lumotini yuklashda xato");
    } finally {
      setChartLoading(false);
    }
  }, [interval]);

  useEffect(() => {
    loadChart();
    const id = window.setInterval(loadChart, 30000);
    return () => window.clearInterval(id);
  }, [loadChart]);

  // ── Pozitsiyalarni yuklash ───────────────────────────────────────────
  const loadPositions = useCallback(async () => {
    if (!account) { setPositions([]); setPositionsLoading(false); return; }
    setPositionsLoading(true);
    try {
      const provider = await getReadProvider();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, provider);

      const total = await dex.totalPositionsByBuyer(account);
      const [rawPositions, ids] = await dex.getPositionsByBuyer(account, 0, total);

      const loaded = await Promise.all(
        rawPositions.map(async (p, i) => {
          let value = null;
          try { value = await dex.currentValue(ids[i]); } catch { /* narx manbai vaqtincha mavjud emas */ }
          return {
            id: ids[i],
            priceUSDC: p.priceUSDC,
            wbtcAmount: p.wbtcAmount,
            collateralTokenId: Number(p.collateralTokenId),
            collateralAmount: p.collateralAmount,
            status: Number(p.status),
            value,
          };
        })
      );

      setPositions(loaded.filter((p) => p.status === 0).sort((a, b) => Number(b.id - a.id)));
    } catch (e) {
      console.error('load positions error:', e);
    } finally {
      setPositionsLoading(false);
    }
  }, [account]);

  useEffect(() => {
    loadPositions();
    const id = setInterval(loadPositions, 30000);
    return () => clearInterval(id);
  }, [loadPositions]);

  function reportTxError(e, tid) {
    console.error('chart swap action error:', e);
    toast.error(translateContractError(e), { id: tid });
  }

  const handleMergeWbtcPrincipal = async (position) => {
    setActionLoading(position.id.toString() + '-merge');
    const tid = toast.loading('WBTC birlashtirilmoqda...');
    try {
      await ensureCorrectChain();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withProgressToast(
        withWalletTimeout(dex.mergeWbtcPrincipal(position.id, 0), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
        tid, WALLET_STAGES
      );
      await withProgressToast(withWalletTimeout(tx.wait(), 180000, "Tranzaksiya juda uzoq tasdiqlanmoqda"), tid, CHAIN_STAGES);

      toast.success('WBTC muvaffaqiyatli birlashtirildi!', { id: tid });
      saveLocalTxHistory({
        type: 'listingMarketMergeWbtcPrincipal',
        label: 'ListingMarket: WBTC principal birlashtirildi',
        listingId: position.id.toString(),
        txHash: tx.hash,
        status: 'success',
        account,
      });
      loadPositions();
    } catch (e) {
      reportTxError(e, tid);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSwapCollateral = async (position, targetTokenId) => {
    setActionLoading(position.id.toString() + '-swapcoll');
    const tid = toast.loading('Garov svop qilinmoqda...');
    try {
      await ensureCorrectChain();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withProgressToast(
        withWalletTimeout(dex.swapCollateralToToken(position.id, targetTokenId, 0), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
        tid, WALLET_STAGES
      );
      await withProgressToast(withWalletTimeout(tx.wait(), 180000, "Tranzaksiya juda uzoq tasdiqlanmoqda"), tid, CHAIN_STAGES);

      toast.success(`Garov ${tokenSymbolFor(targetTokenId)}'ga aylantirildi!`, { id: tid });
      saveLocalTxHistory({
        type: 'listingMarketSwapCollateral',
        label: `ListingMarket: Garov ${tokenSymbolFor(targetTokenId)}'ga aylantirildi`,
        listingId: position.id.toString(),
        txHash: tx.hash,
        status: 'success',
        account,
      });
      loadPositions();
    } catch (e) {
      reportTxError(e, tid);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSwapCollateralToUsdc = async (position) => {
    setActionLoading(position.id.toString() + '-swapback');
    const tid = toast.loading("USDC'ga qaytarilmoqda...");
    try {
      await ensureCorrectChain();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withProgressToast(
        withWalletTimeout(dex.swapCollateralToUsdc(position.id, 0), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
        tid, WALLET_STAGES
      );
      await withProgressToast(withWalletTimeout(tx.wait(), 180000, "Tranzaksiya juda uzoq tasdiqlanmoqda"), tid, CHAIN_STAGES);

      toast.success("Garov USDC'ga qaytarildi!", { id: tid });
      saveLocalTxHistory({
        type: 'listingMarketSwapCollateralBack',
        label: "ListingMarket: Garov USDC'ga qaytarildi",
        listingId: position.id.toString(),
        txHash: tx.hash,
        status: 'success',
        account,
      });
      loadPositions();
    } catch (e) {
      reportTxError(e, tid);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0 }}>BTC/USDC grafigi</h2>
        <button className="btn btn-outline btn-sm" onClick={() => { loadChart(); loadPositions(); }} disabled={chartLoading}>
          <RefreshCw size={14} className={chartLoading ? 'spin' : ''} />
        </button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
        Bozor ma'lumoti (Binance) — narxni ko'rgan holda, ochiq pozitsiyalaringizning svop amallarini shu yerda bajaring.
      </p>

      {lastPrice !== null && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Joriy narx</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>${lastPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
          {priceChange !== null && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>O'zgarish</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: priceChange >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {INTERVALS.map((iv) => (
          <button
            key={iv.value}
            className={`btn btn-sm ${interval === iv.value ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setInterval_(iv.value)}
          >
            {iv.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 12, marginBottom: 20 }}>
        <div ref={chartContainerRef} style={{ width: '100%' }} />
      </div>

      {/* ── Ochiq pozitsiyalar + svop amallari ──────────────────────── */}
      <h3 style={{ marginBottom: 4 }}>Ochiq pozitsiyalarim</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
        Garov qo'shish, olib qo'yish, to'lash yoki likvidatsiya — "ListingMarket - Pozitsiyalarim" sahifasida.
        Bu yerda faqat svop amallari mavjud.
      </p>

      {!account && (
        <div className="card" style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
          Pozitsiyalaringizni ko'rish uchun hamyonni ulang
        </div>
      )}

      {account && positionsLoading && positions.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
      )}

      {account && !positionsLoading && positions.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
          Ochiq pozitsiyalaringiz yo'q.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {positions.map((p) => {
          const idStr = p.id.toString();
          const isExpanded = expandedId === idStr;
          const collSymbol = tokenSymbolFor(p.collateralTokenId);
          const collDecimals = tokenDecimalsFor(p.collateralTokenId);
          const hasWbtcPrincipal = p.wbtcAmount > 0n;

          return (
            <div key={idStr} className="card">
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpandedId(isExpanded ? null : idStr)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mono" style={{ color: 'var(--accent-bright)', fontWeight: 700 }}>#{idStr}</span>
                  <span style={{ fontSize: 13 }}>
                    Qarz: <b>{fmt(p.priceUSDC, TOKEN_DECIMALS.USDC)} USDC</b>
                  </span>
                  {p.value !== null && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      · Qiymat: {fmt(p.value, TOKEN_DECIMALS.USDC)} USDC
                    </span>
                  )}
                </div>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {isExpanded && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 13 }}>
                    Garov: <b>{fmt(p.collateralAmount, collDecimals)} {collSymbol}</b>
                    {hasWbtcPrincipal && <> · Birlashtirilmagan WBTC: <b>{fmt(p.wbtcAmount, TOKEN_DECIMALS.WBTC)} WBTC</b></>}
                  </div>

                  {hasWbtcPrincipal && (
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={actionLoading === idStr + '-merge'}
                      onClick={() => handleMergeWbtcPrincipal(p)}
                    >
                      <ArrowRightLeft size={14} /> WBTC principal'ni USDC'ga birlashtirish
                    </button>
                  )}

                  {p.collateralTokenId === TOKEN_USDC && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline btn-sm" style={{ flex: 1 }} disabled={actionLoading === idStr + '-swapcoll'} onClick={() => handleSwapCollateral(p, TOKEN_WBTC)}>
                        → WBTC
                      </button>
                      <button className="btn btn-outline btn-sm" style={{ flex: 1 }} disabled={actionLoading === idStr + '-swapcoll'} onClick={() => handleSwapCollateral(p, TOKEN_WETH)}>
                        → WETH
                      </button>
                    </div>
                  )}

                  {p.collateralTokenId !== TOKEN_USDC && (
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={actionLoading === idStr + '-swapback'}
                      onClick={() => handleSwapCollateralToUsdc(p)}
                    >
                      <ArrowRightLeft size={14} /> {collSymbol}'ni USDC'ga qaytarish
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
