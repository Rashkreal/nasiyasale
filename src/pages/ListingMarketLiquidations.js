import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { TOKEN_DECIMALS } from '../abi/contract';
import { RefreshCw, AlertTriangle, ExternalLink, Bot, User } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════
//  Barcha likvidatsiyalar — kim ishga tushirganidan qat'iy nazar (bizning
//  bot, boshqa birovning boti, yoki qo'lda). Bu sahifa localStorage'ga
//  emas, to'g'ridan-to'g'ri kontraktning Liquidated voqealariga (events)
//  tayanadi — shuning uchun hamyon ulash shart emas, va bu yerda
//  ko'rinadigan yozuv HECH KIMNING brauzeriga bog'liq emas.
// ══════════════════════════════════════════════════════════════════════

const DEX_ADDRESS = '0x8aC38A6C9E02EE75658ae6f2d6Fd93e8e43c247f';

const LIQUIDATED_EVENT_ABI = [
  'event Liquidated(uint256 indexed positionId, address indexed liquidator, bool deadlineTriggered, uint256 botReward, uint256 paidToSeller, uint256 returnedToBuyer, uint256 unswappedWbtcToSeller)',
];

const RPC        = 'https://rpc.ankr.com/arbitrum/e531710028d0852baae1e1de9993017d4025b2d30d21d0ac5f812150724416b5';
const RPC_BACKUP = 'https://arb1.arbitrum.io/rpc';

// Ba'zi RPC provayderlar bitta so'rovda juda katta blok oralig'ini rad
// etadi — shuning uchun bo'lib-bo'lib (chunk) so'raymiz.
const CHUNK_SIZE = 50000;
// Kontrakt bugun (2026-yil avgust) joylashtirilgan, shuning uchun bundan
// oldingi bloklarni qidirishning hojati yo'q — so'rovlar sonini keskin
// kamaytiradi. Agar kelajakda kerak bo'lsa, bu raqamni pasaytirish kifoya.
const DEPLOY_BLOCK_ESTIMATE = 0; // 0 = "aniq bilmayman, oxirgi ~2 mln blokni qidir" rejimi

async function getReadProvider() {
  try {
    const p = new ethers.JsonRpcProvider(RPC, undefined, { batchMaxCount: 1 });
    await p.getBlockNumber();
    return p;
  } catch {
    return new ethers.JsonRpcProvider(RPC_BACKUP, undefined, { batchMaxCount: 1 });
  }
}

function shortAddr(a) {
  if (!a) return '—';
  return a.slice(0, 6) + '...' + a.slice(-4);
}
function fmt(raw, decimals, sigFigs = 4) {
  if (raw === null || raw === undefined) return '—';
  const num = parseFloat(ethers.formatUnits(raw, decimals));
  if (!isFinite(num)) return '—';
  if (num === 0) return '0';
  return num.toPrecision(sigFigs).replace(/\.?0+$/, '').replace(/\.$/, '');
}

export default function ListingMarketLiquidations() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setEvents([]);
    try {
      const provider = await getReadProvider();
      const contract = new ethers.Contract(DEX_ADDRESS, LIQUIDATED_EVENT_ABI, provider);
      const latestBlock = await provider.getBlockNumber();
      const startBlock = Math.max(0, latestBlock - 2_000_000); // taxminan bir necha kunlik zaxira

      const allLogs = [];
      let from = startBlock;
      while (from <= latestBlock) {
        const to = Math.min(from + CHUNK_SIZE - 1, latestBlock);
        setProgress(`Bloklar tekshirilmoqda: ${from}–${to} (jami ${latestBlock})`);
        try {
          const logs = await contract.queryFilter(contract.filters.Liquidated(), from, to);
          allLogs.push(...logs);
        } catch (e) {
          // Ba'zi provayderlar hatto CHUNK_SIZE'ni ham rad etishi mumkin —
          // bitta bo'lakni o'tkazib yuboramiz, qolganini davom ettiramiz.
          console.warn(`Blok oralig'i ${from}-${to} o'qishda xato:`, e.message);
        }
        from = to + 1;
      }

      // Har bir voqea uchun blok vaqtini alohida so'raymiz (parallel).
      const withTimestamps = await Promise.all(
        allLogs.map(async (log) => {
          let timestamp = null;
          try {
            const block = await provider.getBlock(log.blockNumber);
            timestamp = block.timestamp;
          } catch { /* vaqt topilmasa ham, qolgan ma'lumot ko'rsatiladi */ }
          return {
            positionId: log.args.positionId,
            liquidator: log.args.liquidator,
            deadlineTriggered: log.args.deadlineTriggered,
            botReward: log.args.botReward,
            paidToSeller: log.args.paidToSeller,
            returnedToBuyer: log.args.returnedToBuyer,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp,
          };
        })
      );

      withTimestamps.sort((a, b) => b.blockNumber - a.blockNumber);
      setEvents(withTimestamps);
    } catch (e) {
      console.error('load liquidations error:', e);
      toast.error("Likvidatsiyalar tarixini yuklashda xato");
    } finally {
      setProgress('');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function fmtTime(unixSeconds) {
    if (!unixSeconds) return '—';
    const d = new Date(unixSeconds * 1000);
    return d.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}>Barcha likvidatsiyalar</h2>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
        Kim ishga tushirganidan qat'iy nazar — to'g'ridan-to'g'ri blokcheyndan, ochiq voqealar orqali.
      </p>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
          Yuklanmoqda... {progress && <div style={{ fontSize: 11, marginTop: 6 }}>{progress}</div>}
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
          Hozircha hech qanday likvidatsiya bo'lmagan.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {events.map((ev) => (
          <div key={ev.txHash} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ color: 'var(--accent-bright)', fontWeight: 700 }}>#{ev.positionId.toString()}</span>
                  <span className="badge" style={{
                    fontSize: 11,
                    background: ev.deadlineTriggered ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.12)',
                    color: ev.deadlineTriggered ? 'var(--warning)' : 'var(--danger)',
                    border: `1px solid ${ev.deadlineTriggered ? 'var(--warning)' : 'var(--danger)'}`,
                  }}>
                    {ev.deadlineTriggered ? 'Muddat tugagani uchun' : 'Narx pasaygani uchun'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtTime(ev.timestamp)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <Bot size={14} />
                <span className="mono">{shortAddr(ev.liquidator)}</span>
                <a href={`https://arbiscan.io/tx/${ev.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-bright)', display: 'flex', alignItems: 'center' }}>
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--bg-secondary)' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Bot mukofoti</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(ev.botReward, TOKEN_DECIMALS.USDC)} USDC</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sotuvchiga to'landi</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(ev.paidToSeller, TOKEN_DECIMALS.USDC)} USDC</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Xaridorga qaytdi</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(ev.returnedToBuyer, TOKEN_DECIMALS.USDC)} USDC</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
