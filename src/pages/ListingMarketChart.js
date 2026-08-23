import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, CrosshairMode } from 'lightweight-charts';
import toast from 'react-hot-toast';
import { useWeb3 } from '../hooks/useWeb3';
import { TOKEN_ADDRESSES, TOKEN_DECIMALS, ERC20_ABI } from '../abi/contract';
import { saveLocalTxHistory } from '../utils/localTxHistory';
import { RefreshCw, ArrowRightLeft, ChevronDown, ChevronUp, Maximize2, Minimize2, MoveVertical, MoveHorizontal, TrendingUp, Eraser } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════
//  BTC/USDC grafigi + ochiq pozitsiyalarni boshqarish (MetaTrader'ga
//  o'xshash tajriba) — narxni ko'rgan holda, o'sha yerning o'zida svop
//  amallarini bajarish.
//
//  MUHIM FARQ MetaTrader'dan: ListingMarket — P2P kredit bozori, "bozor
//  buyurtmasi" (darhol bajariladigan savdo) tushunchasi yo'q. Shuning
//  uchun bu yerda "darhol sotib olish/sotish" emas, balki ALLAQACHON
//  OCHIQ pozitsiyalarning SVOP amallari (garovni WBTC/WETH/USDC oralig'ida
//  aylantirish, yagona swapCollateral orqali) joylashtirilgan — bular
//  ListingMarket - Pozitsiyalarim sahifasidagi bilan bir xil, faqat endi
//  narx grafigi bilan birga ko'rinadi.
//
//  Narx grafigi manbai (Binance) va kontraktning garov/svop
//  hisoblashlari (Chainlink) — ikki MUSTAQIL manba, ataylab shunday: biri
//  umumiy bozor tendensiyasini, ikkinchisi esa haqiqiy svop natijasini
//  ko'rsatadi.
// ══════════════════════════════════════════════════════════════════════

const DEX_ADDRESS = '0x3F405B4203540474Cd8E45AFbdEa63Ea9d6c187e';

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
  'function positions(uint256) external view returns (address buyer, address seller, uint256 priceUSDC, uint256 dueDate, uint8 collateralTokenId, uint256 collateralAmount, uint16 bufferBps, uint8 status)',
  'function currentValue(uint256 positionId) external view returns (uint256)',
  'function isLiquidatable(uint256 positionId) external view returns (bool)',
  'function totalPositionsByBuyer(address buyer) external view returns (uint256)',
  'function getPositionsByBuyer(address buyer, uint256 offset, uint256 limit) external view returns (tuple(address buyer, address seller, uint256 priceUSDC, uint256 dueDate, uint8 collateralTokenId, uint256 collateralAmount, uint16 bufferBps, uint8 status)[] result, uint256[] ids)',
  'function PROTOCOL_FEE_BPS() external view returns (uint16)',
  'function swapCollateral(uint256 positionId, uint8 targetTokenId, uint256 minAmountOut) external',
  // Kontraktning maxsus xatolari
  'error BadChainlinkPrice()',
  'error BadTokenId()',
  'error NoPriceAvailable()',
  'error NotBuyer()',
  'error PositionNotOpen()',
  'error PositionWouldBeLiquidatable()',
  'error SameToken()',
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
  PositionWouldBeLiquidatable: "Narx o'zgargani sababli bu pozitsiya ochilgan zahoti likvidatsiya chegarasida bo'lar edi — birozdan keyin qayta urinib ko'ring",
  SameToken: "Garov allaqachon shu tokenda",
  BadTokenId: "Noto'g'ri token tanlandi",
  NoPriceAvailable: "Hech qanday narx manbai topilmadi",
  NotBuyer: "Bu amalni faqat pozitsiya xaridori bajara oladi",
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

// MT5'dagi kabi to'liq vaqt oraliqlari to'plami. Binance API'ning
// standart belgilashlari bilan bir xil (m=daqiqa, h=soat, d=kun,
// w=hafta, M=oy).
const INTERVALS = [
  { value: '1m',  label: 'M1'  },
  { value: '5m',  label: 'M5'  },
  { value: '15m', label: 'M15' },
  { value: '30m', label: 'M30' },
  { value: '1h',  label: 'H1'  },
  { value: '4h',  label: 'H4'  },
  { value: '1d',  label: 'D1'  },
  { value: '1w',  label: 'W1'  },
  { value: '1M',  label: 'MN'  },
];

export default function ListingMarketChart() {
  const { account, signer, ensureCorrectChain, openWalletForRequest, refreshBalances } = useWeb3();

  const chartContainerRef = useRef(null);
  const fullscreenWrapperRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  // Har bir vaqt oralig'i (M1, H1, D1...) uchun ALOHIDA kattalashtirish
  // holatini saqlaydi — shunda bir taymfreymdan boshqasiga o'tib,
  // qaytib kelganda, oldin qanday kattalashtirgan bo'lsangiz, xuddi
  // o'sha holatda qoladi.
  const zoomStateByInterval = useRef({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Chizish vositalari (vertikal, diagonal, gorizontal chiziqlar) ───
  // lightweight-charts'da bular tayyor holda yo'q, shuning uchun
  // grafik ustiga alohida <canvas> qatlami qo'yib, sichqoncha
  // koordinatalarini vaqt/narxga o'zimiz aylantiramiz.
  const overlayCanvasRef = useRef(null);
  const redrawOverlayRef = useRef(null);
  const [activeDrawTool, setActiveDrawTool] = useState(null); // null | 'vertical' | 'diagonal' | 'horizontal'
  const [drawings, setDrawings] = useState([]); // {id, type, time?, price?, time1?, price1?, time2?, price2?}
  const diagonalStartRef = useRef(null); // diagonal chizish paytida birinchi bosilgan nuqta
  const [awaitingSecondPoint, setAwaitingSecondPoint] = useState(false); // faqat ko'rsatkich matni uchun

  const [interval, setInterval_] = useState('1h');
  const [chartLoading, setChartLoading] = useState(true);
  const [lastPrice, setLastPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);
  // WebSocket orqali real vaqtda kelayotgan narxlar uchun — foiz
  // o'zgarishini hisoblash bazasi (yuklangan ma'lumotlarning birinchi
  // shamining ochilish narxi) shu yerda saqlanadi, chunki har bir
  // "tick" da qayta hisoblash kerak, lekin bazaning o'zi o'zgarmaydi.
  const referenceOpenRef = useRef(null);
  const wsRef = useRef(null);

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
      // MT5 uslubidagi nishon chizig'i (crosshair) — sichqoncha turgan
      // joyda aniq narx va vaqtni ko'rsatadi, erkin harakatlanadi.
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { width: 1, color: 'rgba(255,255,255,0.4)', style: 3, labelBackgroundColor: '#4b5563' },
        horzLine: { width: 1, color: 'rgba(255,255,255,0.4)', style: 3, labelBackgroundColor: '#4b5563' },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,      // o'ng tomonda bo'sh joy — yangi shamlar uchun
        barSpacing: 8,
        fixLeftEdge: false,   // chapga cheksiz surish mumkin
        lockVisibleTimeRangeOnResize: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        scaleMargins: { top: 0.1, bottom: 0.25 }, // pastda hajm uchun joy
      },
      // MT5 kabi to'liq interaktivlik: sichqoncha g'ildiragi bilan zum,
      // ushlab surish (drag) bilan harakatlanish, ikki barmoq bilan
      // masshtablash (sensorli ekranlarda).
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { time: true, price: true },
        axisDoubleClickReset: { time: true, price: true }, // ikki marta bosish — asl holatga qaytarish
      },
      width: chartContainerRef.current.clientWidth,
      height: 480,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Hajm (volume) ustunlari — grafikning pastki qismida, alohida
    // masshtabda (narx masshtabiga aralashmasligi uchun).
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
        // setTimeout bilan — chart o'z ichki o'lchamini yangilab
        // bo'lgach chizish, aks holda eski koordinatalar bo'yicha
        // chizilib qolishi mumkin.
        setTimeout(() => redrawOverlayRef.current?.(), 0);
      }
    };
    window.addEventListener('resize', handleResize);
    // To'liq ekranga o'tish/chiqish ham o'lchamni o'zgartiradi, lekin
    // ba'zi brauzerlar buni oddiy "resize" hodisasi sifatida
    // yubormaydi — shuning uchun alohida tinglaymiz.
    document.addEventListener('fullscreenchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
      chart.remove();
    };
  }, []);

  // Chizilgan barcha elementlarni canvas'ga qayta chizadi — vaqt/narx
  // koordinatalarini HOZIRGI piksel koordinatalariga aylantirib
  // (grafik surilganda/kattalashtirilganda chiziqlar to'g'ri joyda
  // qolishi uchun har safar qayta hisoblanadi).
  const redrawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!canvas || !chart || !series) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const timeScale = chart.timeScale();

    for (const d of drawings) {
      ctx.strokeStyle = 'rgba(96,165,250,0.9)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash(d.type === 'diagonal' ? [] : [4, 4]);

      if (d.type === 'horizontal') {
        const y = series.priceToCoordinate(d.price);
        if (y === null) continue;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.fillStyle = 'rgba(96,165,250,0.9)';
        ctx.font = '11px sans-serif';
        ctx.fillText(d.price.toLocaleString(undefined, { maximumFractionDigits: 2 }), 4, y - 4);
      } else if (d.type === 'vertical') {
        const x = timeScale.timeToCoordinate(d.time);
        if (x === null) continue;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      } else if (d.type === 'diagonal') {
        const x1 = timeScale.timeToCoordinate(d.time1);
        const y1 = series.priceToCoordinate(d.price1);
        const x2 = timeScale.timeToCoordinate(d.time2);
        const y2 = series.priceToCoordinate(d.price2);
        if (x1 === null || y1 === null || x2 === null || y2 === null) continue;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
  }, [drawings]);

  useEffect(() => {
    redrawOverlayRef.current = redrawOverlay;
    redrawOverlay();
  }, [redrawOverlay]);

  // Grafik surilganda/kattalashtirilganda chiziqlarni qayta chizish
  // uchun obuna bo'lamiz — chart yaratilgandan keyin, bir marta.
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;
    const unsubscribe = () => {
      try { chart.timeScale().unsubscribeVisibleLogicalRangeChange(redrawOverlay); } catch { /* chart allaqachon yo'q qilingan bo'lishi mumkin */ }
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(redrawOverlay);
    return unsubscribe;
  }, [redrawOverlay, chartLoading]);

  // Canvas koordinatasini (piksel) vaqt/narxga aylantiradi.
  function pixelToTimePrice(clientX, clientY) {
    const canvas = overlayCanvasRef.current;
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!canvas || !chart || !series) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const time = chart.timeScale().coordinateToTime(x);
    const price = series.coordinateToPrice(y);
    if (time === null || price === null) return null;
    return { time, price };
  }

  function handleOverlayClick(e) {
    if (!activeDrawTool) return;
    const tp = pixelToTimePrice(e.clientX, e.clientY);
    if (!tp) return;

    if (activeDrawTool === 'horizontal') {
      setDrawings((prev) => [...prev, { id: Date.now(), type: 'horizontal', price: tp.price }]);
      setActiveDrawTool(null);
    } else if (activeDrawTool === 'vertical') {
      setDrawings((prev) => [...prev, { id: Date.now(), type: 'vertical', time: tp.time }]);
      setActiveDrawTool(null);
    } else if (activeDrawTool === 'diagonal') {
      if (!diagonalStartRef.current) {
        diagonalStartRef.current = tp;
        setAwaitingSecondPoint(true);
        toast.loading("Tugash nuqtasini bosing...", { id: 'diagonal-hint', duration: 4000 });
      } else {
        setDrawings((prev) => [...prev, {
          id: Date.now(),
          type: 'diagonal',
          time1: diagonalStartRef.current.time,
          price1: diagonalStartRef.current.price,
          time2: tp.time,
          price2: tp.price,
        }]);
        diagonalStartRef.current = null;
        setAwaitingSecondPoint(false);
        setActiveDrawTool(null);
        toast.dismiss('diagonal-hint');
      }
    }
  }

  function selectDrawTool(tool) {
    diagonalStartRef.current = null;
    setAwaitingSecondPoint(false);
    setActiveDrawTool((prev) => (prev === tool ? null : tool));
  }

  function clearDrawings() {
    setDrawings([]);
    diagonalStartRef.current = null;
    setAwaitingSecondPoint(false);
    setActiveDrawTool(null);
  }


  const loadChart = useCallback(async (targetInterval) => {
    const iv = targetInterval || interval;
    const isIntervalSwitch = targetInterval !== undefined && targetInterval !== interval;

    // MUHIM: har bir yangilanishda (30 soniyalik avtomatik yangilanish
    // HAM shu yerga kiradi), foydalanuvchi HOZIR ko'rib turgan ko'rinish
    // oralig'ini saqlab qolamiz — faqat oraliq (M1/M5/...) almashtirilganda
    // emas. Aks holda, hatto shunchaki kutib turgan payt ham 30 soniyada
    // bir "asl holatga" qaytib ketaverardi.
    const rangeBeforeReload = chartRef.current?.timeScale().getVisibleLogicalRange();
    if (rangeBeforeReload && !isIntervalSwitch) {
      zoomStateByInterval.current[iv] = rangeBeforeReload;
    }

    setChartLoading(true);
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=BTCUSDC&interval=${iv}&limit=1000`
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

      const volumes = raw.map((k) => ({
        time: Math.floor(k[0] / 1000),
        value: parseFloat(k[5]),
        color: parseFloat(k[4]) >= parseFloat(k[1]) ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
      }));

      if (seriesRef.current) seriesRef.current.setData(candles);
      if (volumeSeriesRef.current) volumeSeriesRef.current.setData(volumes);

      // Shu ANIQ oraliq uchun saqlangan ko'rinish bormi (yoki hozirgina
      // yuqorida saqlangan bo'lsa) — tiklaymiz; bo'lmasa (birinchi marta
      // ko'rilyapti), butun ma'lumotga moslashtiramiz.
      const savedRange = zoomStateByInterval.current[iv];
      if (savedRange) {
        chartRef.current?.timeScale().setVisibleLogicalRange(savedRange);
      } else {
        chartRef.current?.timeScale().fitContent();
      }

      if (candles.length >= 2) {
        const last = candles[candles.length - 1];
        const prev = candles[0];
        setLastPrice(last.close);
        setPriceChange(((last.close - prev.open) / prev.open) * 100);
        referenceOpenRef.current = prev.open; // WebSocket tick'lari uchun baza
      }
    } catch (e) {
      console.error('chart data load error:', e);
      toast.error("Grafik ma'lumotini yuklashda xato");
    } finally {
      setChartLoading(false);
    }
  }, [interval]);

  // Vaqt oralig'ini almashtirish: AVVAL joriy oraliqning kattalashtirish
  // holatini saqlab qolamiz, keyin yangi oraliqqa o'tamiz.
  const handleIntervalChange = useCallback((newInterval) => {
    if (chartRef.current) {
      const currentRange = chartRef.current.timeScale().getVisibleLogicalRange();
      if (currentRange) {
        zoomStateByInterval.current[interval] = currentRange;
      }
    }
    setInterval_(newInterval);
    loadChart(newInterval);
  }, [interval, loadChart]);

  // Tarixiy ma'lumotni FAQAT bir marta, komponent birinchi ochilganda
  // (REST orqali) yuklaymiz — shundan keyin WebSocket o'zi davom
  // ettiradi. Bo'sh bog'liqlik ro'yxati ataylab — aks holda, oraliq
  // almashtirilganda (handleIntervalChange O'ZI alohida chaqirgani
  // uchun) ma'lumot ikki marta so'ralib qolardi.

  useEffect(() => {
    loadChart();
  }, []);

  // WebSocket ulanishi — har bir "tick"da (narx o'zgarganda) darhol
  // yangilaydi, so'rov yuborib turishni kutish shart emas. Vaqt oralig'i
  // (M1, H1...) o'zgarganda, eski ulanishni yopib, yangisini ochamiz.
  useEffect(() => {
    let reconnectTimer = null;

    function connect() {
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/btcusdc@kline_${interval}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const k = msg.k;
          if (!k) return;

          const candle = {
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
          };
          seriesRef.current?.update(candle);

          volumeSeriesRef.current?.update({
            time: candle.time,
            value: parseFloat(k.v),
            color: candle.close >= candle.open ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
          });

          setLastPrice(candle.close);
          if (referenceOpenRef.current) {
            setPriceChange(((candle.close - referenceOpenRef.current) / referenceOpenRef.current) * 100);
          }
        } catch (e) {
          console.error('websocket message parse error:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('websocket error:', e);
      };

      // Ulanish uzilib qolsa (tarmoq muammosi, server qayta ishga
      // tushishi va h.k.), 3 soniyadan keyin avtomatik qayta ulanadi.
      ws.onclose = () => {
        if (wsRef.current === ws) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null; // onclose'ning qayta ulanishiga to'sqinlik qilish uchun
        ws.close();
      }
    };
  }, [interval]);

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

  // To'liq ekran holatini brauzerning o'zi bilan sinxronlab turadi
  // (masalan foydalanuvchi Esc bosib chiqib ketsa ham, tugma holati
  // to'g'ri yangilanadi).
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!fullscreenWrapperRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      fullscreenWrapperRef.current.requestFullscreen().catch((e) => {
        console.error('fullscreen error:', e);
        toast.error("To'liq ekran rejimi qo'llab-quvvatlanmaydi");
      });
    }
  }, []);

  function reportTxError(e, tid) {
    console.error('chart swap action error:', e);
    toast.error(translateContractError(e), { id: tid });
  }

  // swapCollateral endi yagona funksiya — WBTC/WETH/USDC oralig'idagi
  // barcha yo'nalishlar (shu jumladan USDC'ga qaytarish) shu orqali,
  // targetTokenId bilan.
  const handleSwapCollateral = async (position, targetTokenId) => {
    setActionLoading(position.id.toString() + '-swapcoll');
    const tid = toast.loading('Garov svop qilinmoqda...');
    try {
      await ensureCorrectChain();
      const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      openWalletForRequest();
      const tx = await withProgressToast(
        withWalletTimeout(dex.swapCollateral(position.id, targetTokenId, 0), 90000, "MetaMask ochilmadi yoki wallet javob bermadi"),
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

      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {INTERVALS.map((iv) => (
          <button
            key={iv.value}
            className={`btn btn-sm ${interval === iv.value ? 'btn-primary' : 'btn-outline'}`}
            style={{ minWidth: 44, padding: '4px 8px', fontWeight: 600 }}
            onClick={() => handleIntervalChange(iv.value)}
          >
            {iv.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 2 }}>Chizish:</span>
        <button
          className={`btn btn-sm ${activeDrawTool === 'vertical' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => selectDrawTool('vertical')}
          title="Vertikal chiziq"
        >
          <MoveVertical size={14} />
        </button>
        <button
          className={`btn btn-sm ${activeDrawTool === 'diagonal' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => selectDrawTool('diagonal')}
          title="Diagonal (trend) chiziq"
        >
          <TrendingUp size={14} />
        </button>
        <button
          className={`btn btn-sm ${activeDrawTool === 'horizontal' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => selectDrawTool('horizontal')}
          title="Gorizontal chiziq (narx darajasi)"
        >
          <MoveHorizontal size={14} />
        </button>
        {drawings.length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={clearDrawings} title="Barcha chiziqlarni tozalash">
            <Eraser size={14} />
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-outline btn-sm"
          onClick={() => chartRef.current?.timeScale().fitContent()}
          title="Ko'rinishni asl holatga qaytarish"
        >
          Sig'dirish
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={toggleFullscreen}
          title={isFullscreen ? "To'liq ekrandan chiqish" : "To'liq ekran"}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
        {activeDrawTool
          ? (activeDrawTool === 'diagonal' && awaitingSecondPoint
              ? "Ikkinchi (tugash) nuqtani bosing"
              : "Chiziq chizish uchun grafikda bosing")
          : "Sichqoncha g'ildiragi — kattalashtirish · Ushlab surish — harakatlanish · O'q/narx shkalasida ikki marta bosish — asl holat"}
      </div>

      <div
        ref={fullscreenWrapperRef}
        className="card"
        style={{
          padding: 12,
          marginBottom: 20,
          background: isFullscreen ? 'var(--bg-primary, #0a0a0f)' : undefined,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ position: 'relative', width: '100%', height: isFullscreen ? '100vh' : 480 }}>
          <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
          <canvas
            ref={overlayCanvasRef}
            onClick={handleOverlayClick}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              cursor: activeDrawTool ? 'crosshair' : 'default',
              pointerEvents: activeDrawTool ? 'auto' : 'none',
            }}
          />
        </div>
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
                  </div>

                  {p.collateralTokenId === TOKEN_USDC && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline btn-sm" style={{ flex: 1 }} disabled={actionLoading === idStr + '-swapcoll'} onClick={() => handleSwapCollateral(p, TOKEN_WBTC)}>
                        USDC → WBTC
                      </button>
                      <button className="btn btn-outline btn-sm" style={{ flex: 1 }} disabled={actionLoading === idStr + '-swapcoll'} onClick={() => handleSwapCollateral(p, TOKEN_WETH)}>
                        USDC → WETH
                      </button>
                    </div>
                  )}

                  {p.collateralTokenId !== TOKEN_USDC && (
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={actionLoading === idStr + '-swapcoll'}
                      onClick={() => handleSwapCollateral(p, TOKEN_USDC)}
                    >
                      <ArrowRightLeft size={14} /> {collSymbol} → USDC
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
