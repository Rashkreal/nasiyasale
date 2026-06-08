import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useLang } from '../hooks/useLang';
import { maskFromTokens, COLLATERAL_TOKENS, TOKEN_COLORS, TOKEN_IDS, TOKEN_DECIMALS, TOKEN_ADDRESSES, ERC20_ABI, CONTRACT_ADDRESS, OP_MAINNET } from '../abi/contract';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { saveLocalTxHistory } from '../utils/localTxHistory';
import { loadListingDurationDays } from './Settings';
import { PlusSquare, ShieldCheck, ShieldOff, Tag, ShoppingCart, Info, AlertCircle } from 'lucide-react';


// Eski metamask:// deep-link logikasi olib tashlandi —
// endi useWeb3 hook'idagi openWalletForRequest helper'i WalletConnect
// peer metadata'sidan to'g'ri deep-link'ni olib, har wallet (MetaMask,
// Trust, Rainbow va boshqalar) bilan to'g'ri ishlaydi.
function withWalletTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message || 'Wallet javob bermadi')), ms);
    }),
  ]);
}

// withProgressToast — uzoq kutilayotgan promise davomida toast'ni
// yangilab turadi. Sekin internet/WC kechikishi paytida foydalanuvchi
// nima qilishi kerakligini biladi.
function withProgressToast(promise, toastId, stages) {
  const timers = [];
  stages.forEach(([ms, msg]) => {
    timers.push(setTimeout(() => {
      toast.loading(msg, { id: toastId });
    }, ms));
  });
  return promise.finally(() => {
    timers.forEach(clearTimeout);
  });
}

// formatTokenAmount — token miqdorini 4 muhim raqam bilan formatlaydi.
// WBTC/WETH kabi qimmat tokenlar uchun kichik garovlar 0 ko'rinishini
// oldini oladi. Misol:
//   123.456 -> "123.5", 0.0000001234 -> "0.0000001234"
function formatTokenAmount(value, sigFigs = 4) {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (!isFinite(num) || num === 0) return '0';
  const abs = Math.abs(num);
  const precisionStr = num.toPrecision(sigFigs);
  if (precisionStr.includes('e') || precisionStr.includes('E')) {
    const parsed = Number(precisionStr);
    if (abs < 1) {
      const exp = Math.floor(Math.log10(abs));
      const decimalPlaces = -exp + (sigFigs - 1);
      return parsed.toFixed(decimalPlaces);
    }
    return parsed.toFixed(0);
  }
  return precisionStr;
}


async function waitAllowanceForCreateListing(tokenKey, owner, neededRaw) {
  const tokenAddress = TOKEN_ADDRESSES[tokenKey];
  if (!tokenAddress || !owner) return false;

  const provider = new ethers.JsonRpcProvider(OP_MAINNET.rpcUrl);
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

  for (let i = 0; i < 15; i++) {
    try {
      const allowance = await token.allowance(owner, CONTRACT_ADDRESS);
      if (allowance >= neededRaw) {
        return true;
      }
    } catch (e) {
      console.warn('allowance wait error:', e?.message || e);
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return false;
}

export default function CreateListing() {
  const { account, contract, readOnlyContract, signer, walletBalances, ensureApproval, ensureCorrectChain, refreshBalances, openWalletForRequest } = useWeb3();
  const { t } = useLang();
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ durAmount: '', priceUSDC: '', paymentPeriod: '' });
  const [loading, setLoading] = useState(false);
  const [selectedCollaterals, setSelectedCollaterals] = useState(['WBTC']);
  const [collateralBufferPct, setCollateralBufferPct] = useState(0);

  const collateralBufferBps = Math.min(
    2000,
    Math.max(0, Math.round(Number(collateralBufferPct || 0) * 100))
  );

  const [creatorDeviationPct, setCreatorDeviationPct] = useState(0.01);
  const creatorDevBps = Math.min(
    2000,
    Math.max(1, Math.round(Number(creatorDeviationPct || 0.01) * 100))
  );
  const [buyChosenToken, setBuyChosenToken] = useState('WBTC');
  const [collateralPreview, setCollateralPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [sellPreviews, setSellPreviews] = useState({});
  const [sellPreviewLoading, setSellPreviewLoading] = useState(false);

  const isCollateralType = selected === 'collateral-sell' || selected === 'collateral-buy';

  const LISTING_TYPES = [
    {
      key: 'collateral-sell', icon: ShieldCheck, color: 'var(--success)',
      title: t('lt1Title'), desc: t('lt1Desc'), fn: 'postListingCollateralSell',
      info: [
        { label: t('infoYouPut'), value: t('clInfoDURFromWallet') },
        { label: t('infoBuyerPut'), value: t('clInfoCollateralOnApproval') },
        { label: t('infoBuyerPaid'), value: t('clInfoBuyerPaidCollateral') },
        { label: t('infoBuyerNotPaid'), value: t('clInfoBuyerNotPaidCollateral') },
        { label: t('infoNeedBL'), value: t('clInfoNoNeedBL') },
      ]
    },
    {
      key: 'collateral-buy', icon: ShoppingCart, color: 'var(--blt-color)',
      title: t('lt2Title'), desc: t('lt2Desc'), fn: 'postListingCollateralBuy',
      info: [
        { label: t('infoYouPut'), value: t('clInfoCollateralTakenOnPost') },
        { label: t('infoSellerPut'), value: t('clInfoSellerDUROnApproval') },
        { label: t('infoIfPaid'), value: t('clInfoYouPaidCollateral') },
        { label: t('infoIfNotPaid'), value: t('clInfoYouNotPaidCollateral') },
        { label: t('infoNeedBL'), value: t('clInfoNoNeedBL') },
      ]
    },
    {
      key: 'nocollateral-sell', icon: ShieldOff, color: 'var(--warning)',
      title: t('lt3Title'), desc: t('lt3Desc'), fn: 'postListingNoCollateralSell',
      info: [
        { label: t('infoYouPut'), value: t('clInfoDURFromWallet') },
        { label: t('infoBuyerPut'), value: t('clInfoOnlyBLNeeded') },
        { label: t('infoRequiredBL'), value: 'DUR \u0413\u2014 10' },
        { label: t('infoBuyerPaid'), value: t('clInfoBuyerPaidNoColl') },
        { label: t('infoBuyerNotPaid'), value: t('clInfoBuyerNotPaidNoColl') },
        { label: t('infoRisk'), value: t('clInfoRiskHigh') },
      ]
    },
    {
      key: 'nocollateral-buy', icon: Tag, color: 'var(--dur-color)',
      title: t('lt4Title'), desc: t('lt4Desc'), fn: 'postListingNoCollateralBuy',
      info: [
        { label: t('infoYouPut'), value: t('clInfoOnlyBLNeeded') },
        { label: t('infoRequiredBL'), value: 'DUR \u0413\u2014 10' },
        { label: t('infoWhereBL'), value: t('clInfoBLFromPrevious') },
        { label: t('infoIfPaid'), value: t('clInfoYouPaidNoColl') },
        { label: t('infoIfNotPaid'), value: t('clInfoYouNotPaidNoColl') },
      ]
    },
  ];

  const selectedType = LISTING_TYPES.find(lt => lt.key === selected);
  const handle = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const toggleCollateral = (token) => {
    setSelectedCollaterals(prev =>
      prev.includes(token) ? prev.filter(t => t !== token) : [...prev, token]
    );
  };

  useEffect(() => {
    if (selected !== 'collateral-buy' || !contract || !form.priceUSDC || parseFloat(form.priceUSDC) <= 0) {
      setCollateralPreview(null);
      return;
    }
    const fetchPreview = async () => {
      setPreviewLoading(true);
      try {
        const priceRaw = ethers.parseUnits(form.priceUSDC, 6);
        const tokenId = TOKEN_IDS[buyChosenToken];
const livePrice = await readOnlyContract.getTokenPriceUSDC(tokenId);
const colAmt = await readOnlyContract.requiredCollateralLocked(priceRaw, tokenId, livePrice, collateralBufferBps);
        const dec = TOKEN_DECIMALS[buyChosenToken];
        setCollateralPreview(formatTokenAmount(ethers.formatUnits(colAmt, dec)));
      } catch (e) {
        setCollateralPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    };
    const timer = setTimeout(fetchPreview, 500);
    return () => clearTimeout(timer);
  }, [selected, form.priceUSDC, buyChosenToken, contract, collateralBufferBps]);

  useEffect(() => {
    if (selected !== 'collateral-sell' || !contract || !form.priceUSDC || parseFloat(form.priceUSDC) <= 0 || selectedCollaterals.length === 0) {
      setSellPreviews({});
      return;
    }
    const fetchSellPreviews = async () => {
      setSellPreviewLoading(true);
      try {
        const priceRaw = ethers.parseUnits(form.priceUSDC, 6);
        const results = {};
        await Promise.all(selectedCollaterals.map(async tk => {
          try {
            const tokenId = TOKEN_IDS[tk];
const livePrice = await readOnlyContract.getTokenPriceUSDC(tokenId);
const colAmt = await readOnlyContract.requiredCollateralLocked(priceRaw, tokenId, livePrice, collateralBufferBps);
            const dec = TOKEN_DECIMALS[tk];
            results[tk] = formatTokenAmount(ethers.formatUnits(colAmt, dec));
          } catch { results[tk] = null; }
        }));
        setSellPreviews(results);
      } catch { setSellPreviews({}); }
      finally { setSellPreviewLoading(false); }
    };
    const timer = setTimeout(fetchSellPreviews, 500);
    return () => clearTimeout(timer);
  }, [selected, form.priceUSDC, selectedCollaterals, contract, collateralBufferBps]);

  const submit = async () => {
    if (!account || !contract || !signer) return toast.error(t('connectPrompt'));
    if (!selectedType) return toast.error(t('createSelectErr'));
    if (!form.durAmount || parseFloat(form.durAmount) <= 0) return toast.error(t('clEnterDUR'));
    if (!form.priceUSDC || parseFloat(form.priceUSDC) <= 0) return toast.error(t('clEnterPrice'));
    if (!form.paymentPeriod || parseInt(form.paymentPeriod) <= 0) return toast.error(t('clEnterPeriod'));

    if (selected === 'collateral-sell' && selectedCollaterals.length === 0)
      return toast.error(t('clSelectOneToken'));

    const durRaw = ethers.parseUnits(form.durAmount, 18);
    const usdcRaw = ethers.parseUnits(form.priceUSDC, 6);
    const period = parseInt(form.paymentPeriod);

    // E'lon muddati (expiresAt) — Settings sahifasidagi sozlamadan o'qiladi.
    // Kunlar -> Unix timestamp (hozirgi vaqt + kunlar).
    const durationDays = loadListingDurationDays();
    const expiresAt = Math.floor(Date.now() / 1000) + durationDays * 24 * 3600;

    const needsDUR = selected === 'collateral-sell' || selected === 'nocollateral-sell';
    if (needsDUR) {
      const durBal = parseFloat(walletBalances.DUR || '0');
      if (durBal < parseFloat(form.durAmount))
        return toast.error(`${t('clDURInsufficient')} ${durBal.toFixed(4)} DUR`);
    }

    if (selected === 'collateral-buy') {
      const tokenBal = parseFloat(walletBalances[buyChosenToken] || '0');
      const needed = parseFloat(collateralPreview || '0');
      if (needed > 0 && tokenBal < needed)
        return toast.error(`${buyChosenToken} ${t('clTokenInsufficient')} ${tokenBal.toFixed(4)}, ${t('clTokenNeeded')} ${needed}`);
    }

    setLoading(true);
    const tid = toast.loading(t('createPosting'));
    try {
      await ensureCorrectChain();

      // ====================================================================
      // BL/blacklist precheck — FAQAT garovsiz xaridor e'loni uchun.
      // Kontrakt qoidasi: nocollateral-sell (sotuvchi garovsiz) uchun
      // BL talab qilinmaydi. Faqat nocollateral-buy (xaridor garovsiz)
      // uchun BL = DUR \u00d7 10 talab qilinadi.
      // ====================================================================
      const needsBLCheck = selected === 'nocollateral-buy';

      if (needsBLCheck) {
        const c0 = readOnlyContract || contract;
        if (c0) {
          try {
            // Blacklist tekshirish
            let isBL = false;
            try {
              isBL = await c0.isBlacklisted(account);
            } catch (_) {
              // Eski versiya kontraktda bu funksiya bo'lmasligi mumkin
            }

            if (isBL) {
              toast.error(
                'Wallet blacklist holatida. Avval mavjud default qarzlarni to\'lang.',
                { id: tid }
              );
              setLoading(false);
              return;
            }

            // Required BL = DUR miqdori \u00d7 10 (raw wei, 18 decimals)
            const requiredBLRaw = durRaw * 10n;

            // freeTotalBL — band qilinmagan BL
            // (totalBL - barcha pending va aktiv garovsiz qarzlardagi BL)
            const freeBLRaw = await c0.freeTotalBL(account);

            if (freeBLRaw < requiredBLRaw) {
              const freeFmt = parseFloat(
                ethers.formatUnits(freeBLRaw, 18)
              ).toFixed(2);
              const needFmt = parseFloat(
                ethers.formatUnits(requiredBLRaw, 18)
              ).toFixed(2);

              toast.error(
                `BL yetarli emas. Sizning bo'sh BL: ${freeFmt}, kerak: ${needFmt}.`,
                { id: tid }
              );
              setLoading(false);
              return;
            }
          } catch (precheckErr) {
            // Precheck o'zi xato bersa — to'xtatmaymiz, davom etamiz va
            // kontraktning haqiqiy javobini olamiz
            console.warn('BL precheck failed (davom etamiz):', precheckErr);
          }
        }
      }

      const c = contract.connect(signer);
      let tx;

      if (selected === 'collateral-sell') {
        await ensureApproval('DUR', durRaw);
        openWalletForRequest();
        tx = await withProgressToast(
          withWalletTimeout(
            c.postListingCollateralSell(durRaw, usdcRaw, period, maskFromTokens(selectedCollaterals), collateralBufferBps, creatorDevBps, expiresAt),
            90000,
            'MetaMask ochilmadi yoki wallet javob bermadi'
          ),
          tid,
          [
            [8000, "MetaMask'da tasdiqlashni kuting..."],
            [20000, "Sekin tarmoq — MetaMask'ni oching va tasdiqlang"],
            [45000, "Hali kutilmoqda. MetaMask ilovasini qayta oching."],
          ]
        );

      } else if (selected === 'collateral-buy') {
        const tokenId = TOKEN_IDS[buyChosenToken];
        const dec = TOKEN_DECIMALS[buyChosenToken];
        const livePrice = await readOnlyContract.getTokenPriceUSDC(tokenId);
const colAmt = await readOnlyContract.requiredCollateralLocked(priceRaw, tokenId, livePrice, collateralBufferBps);

(usdcRaw, tokenId, collateralBufferBps);
        await ensureApproval(buyChosenToken, colAmtRaw);
        const singleMask = 1 << tokenId;
        openWalletForRequest();
        tx = await withProgressToast(
          withWalletTimeout(
            c.postListingCollateralBuy(durRaw, usdcRaw, period, tokenId, collateralBufferBps, creatorDevBps, expiresAt),
            90000,
            'MetaMask ochilmadi yoki wallet javob bermadi'
          ),
          tid,
          [
            [8000, "MetaMask'da tasdiqlashni kuting..."],
            [20000, "Sekin tarmoq — MetaMask'ni oching va tasdiqlang"],
            [45000, "Hali kutilmoqda. MetaMask ilovasini qayta oching."],
          ]
        );

      } else if (selected === 'nocollateral-sell') {
        await ensureApproval('DUR', durRaw);
        openWalletForRequest();
        tx = await withProgressToast(
          withWalletTimeout(
            c.postListingNoCollateralSell(durRaw, usdcRaw, period, expiresAt),
            90000,
            'MetaMask ochilmadi yoki wallet javob bermadi'
          ),
          tid,
          [
            [8000, "MetaMask'da tasdiqlashni kuting..."],
            [20000, "Sekin tarmoq — MetaMask'ni oching va tasdiqlang"],
            [45000, "Hali kutilmoqda. MetaMask ilovasini qayta oching."],
          ]
        );

      } else if (selected === 'nocollateral-buy') {
        openWalletForRequest();
        tx = await withProgressToast(
          withWalletTimeout(
            c.postListingNoCollateralBuy(durRaw, usdcRaw, period, expiresAt),
            90000,
            'MetaMask ochilmadi yoki wallet javob bermadi'
          ),
          tid,
          [
            [8000, "MetaMask'da tasdiqlashni kuting..."],
            [20000, "Sekin tarmoq — MetaMask'ni oching va tasdiqlang"],
            [45000, "Hali kutilmoqda. MetaMask ilovasini qayta oching."],
          ]
        );
      }

      const receipt = await withProgressToast(
        withWalletTimeout(
          tx.wait(),
          180000,
          'Transaction blockchain\'da juda uzoq tasdiqlanmoqda'
        ),
        tid,
        [
          [10000, "Blockchain'da tasdiqlanmoqda..."],
          [40000, "Hali kutilmoqda — Optimism tarmog'i band bo'lishi mumkin"],
        ]
      );

      // Listing ID ni receipt.logs ichidan kontrakt event'i orqali olamiz.
      // Kontraktda ListingPosted yoki shunga o'xshash event bo'lishi kerak —
      // birinchi indekslangan argument odatda listing ID bo'ladi.
      let newListingId = null;
      try {
        if (receipt && Array.isArray(receipt.logs)) {
          for (const log of receipt.logs) {
            try {
              const parsed = contract.interface.parseLog({
                topics: log.topics,
                data: log.data,
              });
              if (parsed && /listing/i.test(parsed.name) && parsed.args && parsed.args.length > 0) {
                // Birinchi argument odatda listing ID (uint256)
                const idArg = parsed.args[0];
                if (idArg !== undefined && idArg !== null) {
                  newListingId = idArg.toString();
                  break;
                }
              }
            } catch (_) {
              // Ushbu log bizning kontrakt event'i emas — keyingisiga o'tamiz
            }
          }
        }
      } catch (e) {
        console.warn('Listing ID ni log\'lardan olib bo\'lmadi:', e);
      }

      saveLocalTxHistory({
        type: 'createListing',
        label: 'CreateListing transaction',
        listingId: newListingId,
        txHash: receipt?.hash || tx?.hash,
        status: 'success',
        account: account || '',
        extra: '',
      });
      toast.success(t('createSuccess'), { id: tid });
      setForm({ durAmount: '', priceUSDC: '', paymentPeriod: '' });
      setCollateralPreview(null);
      refreshBalances();
    } catch (e) {
      const raw = [
        e?.reason,
        e?.shortMessage,
        e?.message,
        e?.info?.error?.message,
        e?.error?.message,
        e?.data?.message,
        e?.code,
      ]
        .filter(Boolean)
        .join(' | ');

      const msg = raw.toLowerCase();

      console.error('CreateListing error raw:', raw || e);

      let m = t('errorOccurred');

      if (
        msg.includes('metamask ochilmadi') ||
        msg.includes('wallet javob bermadi') ||
        msg.includes('timeout')
      ) {
        m = 'MetaMask ochilmadi yoki wallet javob bermadi. WalletConnect sessiyasini uzib, qayta ulang.';
      } else if (
        msg.includes('user rejected') ||
        msg.includes('user denied') ||
        msg.includes('rejected')
      ) {
        m = t('createRejected') || 'Transaction walletda rad etildi.';
      } else if (
        msg.includes('insufficient') ||
        msg.includes('exceeds balance') ||
        msg.includes('insufficient funds')
      ) {
        m = t('clWalletInsufficient') || 'Hamyonda yetarli token yoki gas yo\u2018q.';
      } else if (msg.includes('zero collateral')) {
        m = t('clZeroCollateral') || 'Garov miqdori 0 bo\u2018lib qoldi.';
      } else if (msg.includes('wrong network') || msg.includes('unsupported chain')) {
        m = 'Optimism Mainnet tarmog\u2018iga o\u2018ting.';
      } else if (msg.includes('total bl limit') || msg.includes('bl low')) {
        m = "BL yetarli emas. Garovsiz e'lon uchun bo'sh BL limitingiz yetmayapti.";
      } else if (msg.includes('blacklist')) {
        m = 'Wallet blacklist holatida.';
      } else if (raw) {
        m = raw.slice(0, 220);
      }

      toast.error(m, { id: tid });
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: '750px' }}>
      {/* Wallet ulanmagan banner */}
      {!account && (
        <div className="alert alert-info" style={{ marginBottom: '20px' }}>
          <PlusSquare size={15} style={{ flexShrink: 0 }} />
          <span>{t('connectPrompt')}</span>
        </div>
      )}
      <div className="page-header">
        <h1 className="page-title">{t('createTitle')}</h1>
        <p className="page-subtitle">{t('createSubtitle')}</p>
      </div>

      <p className="section-title">{t('createSelectType')}</p>
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        {LISTING_TYPES.map(({ key, icon: Icon, title, desc, color }) => (
          <div key={key} onClick={() => setSelected(key)} style={{
            background: selected === key ? `${color}15` : 'var(--bg-card)',
            border: `1px solid ${selected === key ? color : 'var(--border)'}`,
            borderRadius: 'var(--radius)', padding: '16px', cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <Icon size={18} color={color} />
              <span style={{ fontWeight: 600, fontSize: '14px', color: selected === key ? color : 'var(--text-primary)' }}>{title}</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{desc}</p>
          </div>
        ))}
      </div>

      {selectedType && (
        <>
          {/* Info panel */}
          <div className="card" style={{ marginBottom: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Info size={15} color={selectedType.color} />
              <span style={{ fontWeight: 600, fontSize: '14px', color: selectedType.color }}>{t('createAbout')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedType.info.map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)', textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sotuvchi DUR alert */}
          {(selected === 'collateral-sell' || selected === 'nocollateral-sell') && (
            <div className="alert alert-info" style={{ marginBottom: '16px' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{t('clDURFromWalletAlert')} <strong className="mono">{parseFloat(walletBalances.DUR || '0').toFixed(4)} DUR</strong></span>
            </div>
          )}

          {/* collateral-buy warning */}
          {selected === 'collateral-buy' && (
            <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>
                <strong>{t('clCollateralBuyWarningTitle')}</strong> {t('clCollateralBuyWarning')}
              </span>
            </div>
          )}


          {/* Qo'shimcha garov buffer */}
          {isCollateralType && (
            <div className="card" style={{ marginBottom: '16px', padding: '20px' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>
                Qo'shimcha garov
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                0-20%. Garov qiymatini tanlangan foizga oshiradi.
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[0, 5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setCollateralBufferPct(pct)}
                    className={`btn btn-sm ${Number(collateralBufferPct) === pct ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {form.priceUSDC && parseFloat(form.priceUSDC) > 0 && Number(collateralBufferPct) > 0 && (
                <div
                  style={{
                    marginTop: '12px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)'
                  }}
                >
                  {form.priceUSDC} USDC savdo uchun garov taxminan{' '}
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--accent-bright)' }}>
                    {(parseFloat(form.priceUSDC) * (1 + Number(collateralBufferPct) / 100)).toFixed(2)} USDC
                  </span>{' '}
                  qiymatida hisoblanadi.
                </div>
              )}
            </div>
          )}

          {/* collateral-sell: multi token select */}
          {selected === 'collateral-sell' && (
            <div className="card" style={{ marginBottom: '16px', padding: '20px' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px' }}>
                {t('clSelectCollateralTokens')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {COLLATERAL_TOKENS.map(token => {
                  const isActive = selectedCollaterals.includes(token);
                  const color = TOKEN_COLORS[token];
                  return (
                    <button key={token} onClick={() => toggleCollateral(token)} style={{
                      padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                      border: `1.5px solid ${isActive ? color : 'var(--border)'}`,
                      background: isActive ? `${color}20` : 'var(--bg-secondary)',
                      color: isActive ? color : 'var(--text-muted)',
                      fontWeight: isActive ? 700 : 500, fontSize: '13px', transition: 'all 0.15s',
                    }}>
                      {isActive ? '\u2713 ' : ''}{token}
                    </button>
                  );
                })}
              </div>
              {form.priceUSDC && parseFloat(form.priceUSDC) > 0 && selectedCollaterals.length > 0 && (
                <div style={{ marginTop: '4px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {t('clCurrentPricePreview')}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedCollaterals.map(tk => {
                      const color = TOKEN_COLORS[tk];
                      const amt = sellPreviews[tk];
                      return (
                        <div key={tk} style={{
                          padding: '6px 12px', borderRadius: '8px',
                          background: `${color}15`, border: `1px solid ${color}40`,
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                          <span style={{ fontWeight: 700, color, fontSize: '13px' }}>{tk}</span>
                          <span style={{ fontFamily: 'Space Mono, monospace', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                            {sellPreviewLoading ? '...' : amt ? amt : '\u2014'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {t('clPriceLockWarning')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* collateral-buy: single token select */}
          {selected === 'collateral-buy' && (
            <div className="card" style={{ marginBottom: '16px', padding: '20px' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px' }}>
                {t('clSelectCollateralToken')} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '12px' }}>{t('clTokenTakenOnPost')}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {COLLATERAL_TOKENS.map(token => {
                  const isActive = buyChosenToken === token;
                  const color = TOKEN_COLORS[token];
                  const bal = parseFloat(walletBalances[token] || '0');
                  return (
                    <button key={token} onClick={() => setBuyChosenToken(token)} style={{
                      padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                      border: `1.5px solid ${isActive ? color : 'var(--border)'}`,
                      background: isActive ? `${color}20` : 'var(--bg-secondary)',
                      color: isActive ? color : 'var(--text-muted)',
                      fontWeight: isActive ? 700 : 500, fontSize: '13px', transition: 'all 0.15s',
                    }}>
                      {isActive ? '\u2713 ' : ''}{token}
                      <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.7 }}>({bal.toFixed(2)})</span>
                    </button>
                  );
                })}
              </div>
              {form.priceUSDC && parseFloat(form.priceUSDC) > 0 && (
                <div style={{
                  padding: '10px 14px', borderRadius: '8px',
                  background: `${TOKEN_COLORS[buyChosenToken]}15`,
                  border: `1px solid ${TOKEN_COLORS[buyChosenToken]}40`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('clRequiredCollateral')}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: TOKEN_COLORS[buyChosenToken], fontFamily: 'Space Mono, monospace' }}>
                    {previewLoading ? "..." : collateralPreview ? `${collateralPreview} ${buyChosenToken}` : "\u2014"}
                  </span>
                </div>
              )}
              {collateralPreview && (
                (() => {
                  const bal = parseFloat(walletBalances[buyChosenToken] || '0');
                  const needed = parseFloat(collateralPreview);
                  const ok = bal >= needed;
                  return (
                    <div style={{
                      marginTop: '8px', fontSize: '12px',
                      color: ok ? 'var(--success)' : 'var(--danger)',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      {ok ? '\u2713' : '\u2717'} {t('clWalletBalance')} {bal.toFixed(4)} {buyChosenToken}
                      {!ok && <span> {t('clInsufficientToken')}</span>}
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* Form */}
          <div className="card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">{t('createDUR')}</label>
                <input className="input" type="number" min="0" placeholder="0.00" value={form.durAmount} onChange={handle('durAmount')} />
                {selected?.includes('nocollateral') && form.durAmount && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {t('createRequiredBL')} <span className="mono" style={{ color: 'var(--dur-color)', fontWeight: 600 }}>{(parseFloat(form.durAmount) * 10).toFixed(2)} BL</span>
                  </span>
                )}
              </div>
              <div className="input-group">
                <label className="input-label">{t('createPrice')}</label>
                <input className="input" type="number" min="0" placeholder="0.00" value={form.priceUSDC} onChange={handle('priceUSDC')} />

              </div>
              <div className="input-group">
                <label className="input-label">{t('createPeriod')}</label>
                <input className="input" type="number" min="1" placeholder="30" value={form.paymentPeriod} onChange={handle('paymentPeriod')} />
                {form.paymentPeriod && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {t('createPeriodNote')} <strong>{form.paymentPeriod} {t('createPeriodNote2')}</strong>
                  </span>
                )}
              </div>
              <button className="btn btn-primary btn-full" style={{ marginTop: '8px' }} onClick={submit} disabled={loading}>
                {loading ? <><div className="spinner" /> {t('createPosting')}</> : <><PlusSquare size={16} /> {t('createBtn')}</>}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
