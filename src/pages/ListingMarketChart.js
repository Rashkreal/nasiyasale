import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════
//  BTC/USDC sham (candlestick) grafigi — ListingMarket foydalanuvchilari
//  elon joylashdan oldin bozor holatini ko'rishi uchun.
//
//  Ma'lumot manbai: Binance'ning ochiq (kalitsiz) REST API'si. Bu —
//  ListingMarket kontraktining o'zi ishlatadigan Chainlink narxidan
//  MUSTAQIL, alohida manba — shuning uchun bu sahifa faqat umumiy bozor
//  ma'lumoti sifatida qaraladi, kontraktning aniq hisob-kitoblarida
//  ishlatilmaydi.
// ══════════════════════════════════════════════════════════════════════

const INTERVALS = [
  { value: '15m', label: '15 daqiqa' },
  { value: '1h', label: '1 soat' },
  { value: '4h', label: '4 soat' },
  { value: '1d', label: '1 kun' },
  { value: '1w', label: '1 hafta' },
];

export default function ListingMarketChart() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  const [interval, setInterval_] = useState('1h');
  const [loading, setLoading] = useState(true);
  const [lastPrice, setLastPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);

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
      height: 480,
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

  // ── Ma'lumotni yuklash (Binance ochiq API) ──────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [interval]);

  useEffect(() => {
    loadData();
    const id = window.setInterval(loadData, 30000); // 30s'da yangilanadi
    return () => window.clearInterval(id);
  }, [loadData]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0 }}>BTC/USDC grafigi</h2>
        <button className="btn btn-outline btn-sm" onClick={loadData} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
        Bozor ma'lumoti (Binance) — elon joylashdan oldin narx tendensiyasini ko'rish uchun.
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

      <div className="card" style={{ padding: 12 }}>
        <div ref={chartContainerRef} style={{ width: '100%' }} />
      </div>
    </div>
  );
}
