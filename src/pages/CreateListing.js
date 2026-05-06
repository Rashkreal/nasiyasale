import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useLang } from '../hooks/useLang';
import { maskFromTokens, COLLATERAL_TOKENS, TOKEN_COLORS, TOKEN_IDS, TOKEN_DECIMALS } from '../abi/contract';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { PlusSquare, ShieldCheck, ShieldOff, Tag, ShoppingCart, Info, AlertCircle } from 'lucide-react';

export default function CreateListing() {
  const { account, contract, signer, walletBalances, ensureApproval, refreshBalances } = useWeb3();
  const { t } = useLang();
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ durAmount: '', priceUSDC: '', paymentPeriod: '' });
  const [loading, setLoading] = useState(false);
  const [selectedCollaterals, setSelectedCollaterals] = useState(['USDC']);

  const [buyChosenToken, setBuyChosenToken] = useState('USDC');
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
        { label: t('infoRequiredBL'), value: 'DUR × 10' },
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
        { label: t('infoRequiredBL'), value: 'DUR × 10' },
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
        const colAmt = await contract.previewCollateral(priceRaw, tokenId);
        const dec = TOKEN_DECIMALS[buyChosenToken];
        setCollateralPreview(parseFloat(ethers.formatUnits(colAmt, dec)).toFixed(dec <= 8 ? 6 : 4));
      } catch (e) {
        setCollateralPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    };
    const timer = setTimeout(fetchPreview, 500);
    return () => clearTimeout(timer);
  }, [selected, form.priceUSDC, buyChosenToken, contract]);

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
            const colAmt = await contract.previewCollateral(priceRaw, tokenId);
            const dec = TOKEN_DECIMALS[tk];
            results[tk] = parseFloat(ethers.formatUnits(colAmt, dec)).toFixed(dec <= 8 ? 6 : 4);
          } catch { results[tk] = null; }
        }));
        setSellPreviews(results);
      } catch { setSellPreviews({}); }
      finally { setSellPreviewLoading(false); }
    };
    const timer = setTimeout(fetchSellPreviews, 500);
    return () => clearTimeout(timer);
  }, [selected, form.priceUSDC, selectedCollaterals, contract]);

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
      const c = contract.connect(signer);
      let tx;

      if (selected === 'collateral-sell') {
        await ensureApproval('DUR', durRaw);
        tx = await c.postListingCollateralSell(durRaw, usdcRaw, period, maskFromTokens(selectedCollaterals));

      } else if (selected === 'collateral-buy') {
        const tokenId = TOKEN_IDS[buyChosenToken];
        const dec = TOKEN_DECIMALS[buyChosenToken];
        const colAmtRaw = await contract.previewCollateral(usdcRaw, tokenId);
        await ensureApproval(buyChosenToken, colAmtRaw);
        const singleMask = 1 << tokenId;
        tx = await c.postListingCollateralBuy(durRaw, usdcRaw, period, singleMask, tokenId);

      } else if (selected === 'nocollateral-sell') {
        await ensureApproval('DUR', durRaw);
        tx = await c.postListingNoCollateralSell(durRaw, usdcRaw, period);

      } else if (selected === 'nocollateral-buy') {
        tx = await c.postListingNoCollateralBuy(durRaw, usdcRaw, period);
      }

      await tx.wait();
      toast.success(t('createSuccess'), { id: tid });
      setForm({ durAmount: '', priceUSDC: '', paymentPeriod: '' });
      setCollateralPreview(null);
      refreshBalances();
    } catch (e) {
      const msg = e?.reason || e?.message || '';
      let m = t('errorOccurred');
      if (msg.includes('user rejected')) m = t('createRejected');
      else if (msg.includes('insufficient') || msg.includes('exceeds balance')) m = t('clWalletInsufficient');
      else if (msg.includes('zero collateral')) m = t('clZeroCollateral');
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
                      {isActive ? '✓ ' : ''}{token}
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
                            {sellPreviewLoading ? '...' : amt ? amt : '—'}
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
                      {isActive ? '✓ ' : ''}{token}
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
                    {previewLoading ? '...' : collateralPreview ? `${collateralPreview} ${buyChosenToken}` : '—'}
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
                      {ok ? '✓' : '✗'} {t('clWalletBalance')} {bal.toFixed(4)} {buyChosenToken}
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
