import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { TOKEN_DECIMALS } from '../abi/contract';
import { RefreshCw, ExternalLink, AlertTriangle, Info } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════
//  Barcha likvidatsiyalar — kim ishga tushirganidan qat'iy nazar.
//
//  NEGA VOQEALAR (events) ISHLATILMAYDI: oldingi versiyalar Liquidated
//  voqealarini eth_getLogs orqali qidirardi, lekin Arbitrum'da bu amalda
//  ishlamadi — RPC provayderlar (Ankr ham, zaxira ham) katta blok
//  oralig'ini rad etadi ("Block range is too large"), va oraliqni kichik
//  bo'laklarga bo'lish esa minglab so'rovni talab qilib, sahifani
//  daqiqalab osib qo'yardi.
//
//  YECHIM: voqealar UMUMAN so'ralmaydi. Kontraktning O'Z HOLATIDA
//  status = Liquidated (2) allaqachon yozilgan, shuning uchun oddiy
//  getAllPositions() chaqiruvi barcha likvidatsiya qilingan
//  pozitsiyalarni beradi — bir necha arzon so'rov, blok qidirish yo'q,
//  RPC'ga deyarli yuk yo'q.
//
//  BU YONDASHUVNING CHEKLOVI (ochiq aytilgan): likvidatorning manzili,
//  bot mukofotining aniq miqdori va likvidatsiya sodir bo'lgan aniq
//  vaqt — bular FAQAT voqealarda saqlanadi, holatda emas. Shuning uchun
//  bu yerda ko'rsatilmaydi. Ularni ko'rish uchun Arbiscan havolasi
//  berilgan — Arbiscan o'zining indekslangan bazasidan o'qiydi, shuning
//  uchun bizning RPC cheklovlarimiz unga taalluqli emas.
// ══════════════════════════════════════════════════════════════════════

const DEX_ADDRESS = '0x3F405B4203540474Cd8E45AFbdEa63Ea9d6c187e';

const CONTRACT_ABI = [
  'function totalPositions() external view returns (uint256)',
  'function getAllPositions(uint256 offset, uint256 limit) external view returns (tuple(address buyer, address seller, uint256 priceUSDC, uint256 dueDate, uint8 collateralTokenId, uint256 collateralAmount, uint16 bufferBps, uint8 status)[] result, uint256[] ids)',
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

const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
function fmtDate(unixSeconds) {
  if (!unixSeconds || unixSeconds === 0n) return '—';
  const d = new Date(Number(unixSeconds) * 1000);
  return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

export default function ListingMarketLiquidations() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const provider = await getReadProvider();
      const contract = new ethers.Contract(DEX_ADDRESS, CONTRACT_ABI, provider);

      const total = await contract.totalPositions();
      const found = [];
      for (let offset = 0n; offset < total; offset += BigInt(PAGE_SIZE)) {
        const [result, ids] = await contract.getAllPositions(offset, PAGE_SIZE);
        for (let i = 0; i < result.length; i++) {
          if (Number(result[i].status) === STATUS_LIQUIDATED) {
            found.push({
              id: ids[i],
              buyer: result[i].buyer,
              seller: result[i].seller,
              priceUSDC: result[i].priceUSDC,
              dueDate: result[i].dueDate,
            });
          }
        }
      }

      found.sort((a, b) => Number(b.id - a.id));
      setItems(found);
    } catch (e) {
      console.error('load liquidations error:', e);
      toast.error("Likvidatsiyalar ro'yxatini yuklashda xato");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}>Barcha likvidatsiyalar</h2>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
        Kim ishga tushirganidan qat'iy nazar — to'g'ridan-to'g'ri kontrakt holatidan.
      </p>

      <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, background: 'var(--bg-secondary)' }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} color="var(--text-muted)" />
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Likvidator manzili, bot mukofoti va aniq vaqt bu yerda ko'rsatilmaydi — ular kontraktning
          voqealarida saqlanadi. To'liq tafsilot uchun "Arbiscan'da ko'rish" havolasidan foydalaning.
        </div>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
          Yuklanmoqda...
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
          Hozircha hech qanday likvidatsiya bo'lmagan.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it) => (
          <div key={it.id.toString()} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono" style={{ color: 'var(--accent-bright)', fontWeight: 700 }}>#{it.id.toString()}</span>
                <span className="badge" style={{
                  fontSize: 11,
                  background: 'rgba(239,68,68,0.12)',
                  color: 'var(--danger)',
                  border: '1px solid var(--danger)',
                }}>
                  <AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
                  Likvidatsiya qilingan
                </span>
              </div>
              
              
              <a
                href={`https://arbiscan.io/address/${DEX_ADDRESS}#events`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent-bright)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                Arbiscan'da ko'rish <ExternalLink size={12} />
              </a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--bg-secondary)' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Qarz miqdori</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(it.priceUSDC, TOKEN_DECIMALS.USDC)} USDC</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>To'lov muddati edi</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtDate(it.dueDate)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Xaridor</div>
                <div className="mono" style={{ fontSize: 13 }}>{shortAddr(it.buyer)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sotuvchi</div>
                <div className="mono" style={{ fontSize: 13 }}>{shortAddr(it.seller)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
