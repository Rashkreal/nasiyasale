import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { TOKEN_DECIMALS } from '../abi/contract';
import { RefreshCw, ExternalLink, Bot } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════
//  Barcha likvidatsiyalar — kim ishga tushirganidan qat'iy nazar (bizning
//  bot, boshqa birovning boti, yoki qo'lda). Bu sahifa localStorage'ga
//  emas, to'g'ridan-to'g'ri kontraktga tayanadi.
//
//  IKKI BOSQICHLI YONDASHUV (keng blok oralig'ini skanerlashdan qochish
//  uchun): avval getAllPositions() orqali QAYSI pozitsiyalar Liquidated
//  holatida ekanini bilib olamiz (bu — oddiy holat o'qish, arzon, deploy
//  blokini bilish shart emas). Keyin FAQAT o'sha aniq pozitsiyalar uchun,
//  positionId INDEKSLANGAN bo'lgani tufayli, nishonlangan voqea so'rovi
//  qilamiz — bu butun tarixni blok-bo'yicha kezishdan ancha samarali,
//  chunki RPC tugun indeksdan to'g'ridan-to'g'ri foydalana oladi.
// ══════════════════════════════════════════════════════════════════════

const DEX_ADDRESS = '0x8aC38A6C9E02EE75658ae6f2d6Fd93e8e43c247f';

const CONTRACT_ABI = [
  'function totalPositions() external view returns (uint256)',
  'function getAllPositions(uint256 offset, uint256 limit) external view returns (tuple(address buyer, address seller, uint256 priceUSDC, uint256 wbtcAmount, uint256 dueDate, uint8 collateralTokenId, uint256 collateralAmount, uint16 bufferBps, uint8 status)[] result, uint256[] ids)',
  'event Liquidated(uint256 indexed positionId, address indexed liquidator, bool deadlineTriggered, uint256 botReward, uint256 paidToSeller, uint256 returnedToBuyer, uint256 unswappedWbtcToSeller)',
];

const STATUS_LIQUIDATED = 2;
const PAGE_SIZE = 100;

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
      const contract = new ethers.Contract(DEX_ADDRESS, CONTRACT_ABI, provider);

      // Joriy blok + uning vaqti — vaqtni blok raqamiga taxminiy
      // aylantirish uchun bazaviy nuqta.
      const latestBlockInfo = await provider.getBlock('latest');
      const latestBlock = latestBlockInfo.number;
      const latestTimestamp = latestBlockInfo.timestamp;

      // 1-bosqich: barcha pozitsiyalarni sahifalab o'qib, qaysilari
      // Liquidated ekanini aniqlaymiz (arzon — oddiy holat o'qish),
      // shu bilan birga dueDate'ini ham saqlab qolamiz.
      setProgress('Pozitsiyalar tekshirilmoqda...');
      const total = await contract.totalPositions();
      const liquidated = [];
      for (let offset = 0n; offset < total; offset += BigInt(PAGE_SIZE)) {
        const [result, ids] = await contract.getAllPositions(offset, PAGE_SIZE);
        for (let i = 0; i < result.length; i++) {
          if (Number(result[i].status) === STATUS_LIQUIDATED) {
            liquidated.push({ id: ids[i], dueDate: result[i].dueDate });
          }
        }
      }

      if (liquidated.length === 0) {
        setEvents([]);
        return;
      }

      // 2-bosqich: har bir pozitsiya uchun kerakli oraliqni kichik
      // bo'laklarga bo'lib, hammasini PARALLEL so'raymiz. Bo'laklar
      // sonini xavfsiz chegarada ushlab turamiz (MAX_CHUNKS) — aks
      // holda son minglab bo'lishi mumkin (30 kunlik eng yomon holat),
      // va ularning barchasini bir vaqtda yuborish provayderni "bosib
      // qolishi" mumkin. Bu — kontrakt hali yosh, qisqa test
      // muddatlari bilan ishlatilayotgan joriy bosqich uchun oqilona
      // muvozanat; loyiha o'sib, uzoqroq (haqiqiy 30 kungacha) muddatlar
      // keng qo'llanila boshlagach, bu qiymatni qayta ko'rib chiqish
      // kerak bo'ladi.
      const MAX_PERIOD_SECONDS = 30 * 86400;
      const ASSUMED_BLOCK_TIME = 0.2; // soniya, xavfsizlik uchun tezroq taxmin
      const CHUNK_BLOCKS = 10_000; // Ankr uchun xavfsiz hajm
      const MAX_CHUNKS = 60; // ~600,000 blok ≈ Arbitrum'da bir necha kunlik zaxira

      setProgress(`${liquidated.length} ta likvidatsiya tafsiloti yuklanmoqda...`);
      const logsPerId = await Promise.all(
        liquidated.map(async ({ id, dueDate }) => {
          const earliestPossibleApproval = Number(dueDate) - MAX_PERIOD_SECONDS;
          const secondsAgo = Math.max(0, latestTimestamp - earliestPossibleApproval);
          const idealOldest = Math.max(0, latestBlock - Math.ceil(secondsAgo / ASSUMED_BLOCK_TIME) - 5000);
          const cappedOldest = Math.max(idealOldest, latestBlock - MAX_CHUNKS * CHUNK_BLOCKS);

          const chunkStarts = [];
          for (let end = latestBlock; end >= cappedOldest; end -= CHUNK_BLOCKS) {
            chunkStarts.push(Math.max(cappedOldest, end - CHUNK_BLOCKS + 1));
          }

          const chunkResults = await Promise.all(
            chunkStarts.map(async (chunkStart, i) => {
              const chunkEnd = i === 0 ? latestBlock : Math.min(latestBlock, chunkStart + CHUNK_BLOCKS - 1);
              try {
                return await contract.queryFilter(contract.filters.Liquidated(id), chunkStart, chunkEnd);
              } catch (e) {
                console.warn(`#${id}: bloklar ${chunkStart}-${chunkEnd} o'qishda xato:`, e.message);
                return [];
              }
            })
          );
          return chunkResults.flat();
        })
      );
      const logs = logsPerId.flat();

      const withTimestamps = await Promise.all(
        logs.map(async (log) => {
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
