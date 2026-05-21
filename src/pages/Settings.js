import React, { useState } from 'react';
import { useLang } from '../hooks/useLang';
import { useWeb3 } from '../hooks/useWeb3';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon, Clock, Check, Lock, Zap, ShieldOff, AlertTriangle } from 'lucide-react';

// ====================================================================
//  E'lon muddati (listingDurationDays) sozlamasi
//
//  Bu qiymat CreateListing.js'da postListing... chaqiriqlariga
//  expiresAt parametri sifatida uzatiladi (kunlar -> Unix timestamp).
//  localStorage'da saqlanadi, foydalanuvchi bir marta belgilab qo'yadi.
//  Default: 90 kun. Oraliq: 1-365 kun.
// ====================================================================
export const DURATION_STORAGE_KEY = 'nasiyasale_listing_duration_days';
export const DURATION_DEFAULT_DAYS = 90;
export const DURATION_MIN_DAYS = 1;
export const DURATION_MAX_DAYS = 365;

export function loadListingDurationDays() {
  try {
    const raw = localStorage.getItem(DURATION_STORAGE_KEY);
    if (raw === null) return DURATION_DEFAULT_DAYS;
    const n = parseInt(raw, 10);
    if (!isFinite(n) || n < DURATION_MIN_DAYS || n > DURATION_MAX_DAYS) {
      return DURATION_DEFAULT_DAYS;
    }
    return n;
  } catch {
    return DURATION_DEFAULT_DAYS;
  }
}

export function saveListingDurationDays(days) {
  try {
    localStorage.setItem(DURATION_STORAGE_KEY, String(days));
  } catch {}
}

// ====================================================================
//  Narx farqi cheklovi (maxPriceDeviationBps) sozlamasi
//
//  Listings.js'da approveListing(listingId, chosenToken, deviationBps)
//  chaqirig'iga uzatiladi. Tasdiqlash vaqtida bozor narxi e'londagi lock
//  narxidan shu foizdan ko'p farqlansa, tranzaksiya avtomatik bekor
//  qilinadi (flash loan himoyasi).
//  1 bps = 0.01%. Default: 300 (3%). Oraliq: 100-2000 (1-20%).
// ====================================================================
export const DEVIATION_STORAGE_KEY = 'nasiyasale_max_price_deviation_bps';
export const DEVIATION_DEFAULT_BPS = 300;
export const DEVIATION_MIN_BPS = 100;
export const DEVIATION_MAX_BPS = 2000;

export function loadDeviationBps() {
  try {
    const raw = localStorage.getItem(DEVIATION_STORAGE_KEY);
    if (raw === null) return DEVIATION_DEFAULT_BPS;
    const n = parseInt(raw, 10);
    if (!isFinite(n) || n < DEVIATION_MIN_BPS || n > DEVIATION_MAX_BPS) {
      return DEVIATION_DEFAULT_BPS;
    }
    return n;
  } catch {
    return DEVIATION_DEFAULT_BPS;
  }
}

export function saveDeviationBps(bps) {
  try {
    localStorage.setItem(DEVIATION_STORAGE_KEY, String(bps));
  } catch {}
}

// ====================================================================
//  Approve ko'paytirgichi sozlamasi
//
//  useWeb3.js'dagi ensureApproval bu qiymatni o'qiydi va approve
//  miqdorini ko'paytiradi. Qiymatlar: '1', '10', '100', 'max'.
//  '1' = aniq kerakli miqdor (eng xavfsiz, default).
//  'max' = cheksiz (MaxUint256, eng kam popup, lekin ko'p ishonch kerak).
// ====================================================================
export const APPROVE_MULT_STORAGE_KEY = 'nasiyasale_approve_multiplier';
export const APPROVE_MULT_DEFAULT = '1';
export const APPROVE_MULT_OPTIONS = ['1', '10', '100', 'max'];

export function loadApproveMultiplier() {
  try {
    const raw = localStorage.getItem(APPROVE_MULT_STORAGE_KEY);
    if (raw === null) return APPROVE_MULT_DEFAULT;
    if (APPROVE_MULT_OPTIONS.includes(raw)) return raw;
    return APPROVE_MULT_DEFAULT;
  } catch {
    return APPROVE_MULT_DEFAULT;
  }
}

export function saveApproveMultiplier(mult) {
  try {
    localStorage.setItem(APPROVE_MULT_STORAGE_KEY, String(mult));
  } catch {}
}

export default function Settings() {
  const { t } = useLang();
  const { account, revokeAllApprovals } = useWeb3();

  const [approveMult, setApproveMult] = useState(loadApproveMultiplier);
  const [multSavedFlash, setMultSavedFlash] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  const [durationDays, setDurationDays] = useState(loadListingDurationDays);
  const [durationInput, setDurationInput] = useState(
    () => String(loadListingDurationDays())
  );
  const [deviationBps, setDeviationBps] = useState(loadDeviationBps);
  const [deviationInput, setDeviationInput] = useState(
    () => (loadDeviationBps() / 100).toFixed(1)
  );
  const [savedFlash, setSavedFlash] = useState(false);
  const [devSavedFlash, setDevSavedFlash] = useState(false);

  // Saqlangani haqida 2 soniya ✓ belgi ko'rsatadi
  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleDurationChange = (val) => {
    setDurationInput(val);
    const num = parseInt(val, 10);
    if (!isFinite(num)) return;
    if (num < DURATION_MIN_DAYS || num > DURATION_MAX_DAYS) return;
    setDurationDays(num);
    saveListingDurationDays(num);
    flashSaved();
  };

  const handleDurationBlur = () => {
    // Maydondagi qiymat noto'g'ri bo'lsa, oxirgi to'g'ri qiymatga qaytaramiz
    const num = parseInt(durationInput, 10);
    if (!isFinite(num) || num < DURATION_MIN_DAYS || num > DURATION_MAX_DAYS) {
      setDurationInput(String(durationDays));
    } else {
      setDurationInput(String(num));
    }
  };

  const flashDevSaved = () => {
    setDevSavedFlash(true);
    setTimeout(() => setDevSavedFlash(false), 2000);
  };

  const handleDeviationChange = (val) => {
    setDeviationInput(val);
    const num = parseFloat(val);
    if (!isFinite(num)) return;
    const bps = Math.round(num * 100);
    if (bps < DEVIATION_MIN_BPS || bps > DEVIATION_MAX_BPS) return;
    setDeviationBps(bps);
    saveDeviationBps(bps);
    flashDevSaved();
  };

  const handleDeviationBlur = () => {
    const num = parseFloat(deviationInput);
    const bps = Math.round(num * 100);
    if (!isFinite(num) || bps < DEVIATION_MIN_BPS || bps > DEVIATION_MAX_BPS) {
      setDeviationInput((deviationBps / 100).toFixed(1));
    } else {
      setDeviationInput((deviationBps / 100).toFixed(1));
    }
  };

  const handleMultChange = (val) => {
    setApproveMult(val);
    saveApproveMultiplier(val);
    setMultSavedFlash(true);
    setTimeout(() => setMultSavedFlash(false), 2000);
  };

  const handleRevokeAll = async () => {
    if (!account) {
      toast.error(t('connectPrompt') || 'Avval walletni ulang');
      return;
    }
    setShowRevokeConfirm(false);
    setRevoking(true);
    const tid = toast.loading(t('settingsRevokeChecking') || "Approve'lar tekshirilmoqda...");
    try {
      const result = await revokeAllApprovals((done, total, tokenKey) => {
        if (tokenKey) {
          toast.loading(
            `${done + 1}/${total} ${tokenKey} ${t('settingsRevokeProgress') || 'bekor qilinmoqda...'}`,
            { id: tid }
          );
        }
      });

      if (result.message === 'no_approvals' || result.total === 0) {
        toast.success(t('settingsRevokeNone') || "Bekor qilinadigan approve yo'q", { id: tid });
      } else if (result.failed && result.failed.length > 0) {
        toast.error(
          `${result.revoked}/${result.total} bekor qilindi. Xato: ${result.failed.join(', ')}`,
          { id: tid }
        );
      } else {
        toast.success(
          `${result.revoked} ${t('settingsRevokeDone') || "approve bekor qilindi"}`,
          { id: tid }
        );
      }
    } catch (e) {
      const msg = String(e?.message || '').toLowerCase();
      if (msg.includes('rejected') || msg.includes('denied')) {
        toast.error(t('settingsRevokeRejected') || 'Bekor qilish rad etildi', { id: tid });
      } else {
        toast.error(t('errorOccurred') || 'Xatolik yuz berdi', { id: tid });
      }
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div style={{ maxWidth: '750px' }}>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SettingsIcon size={22} />
          {t('settingsTitle') || 'Sozlamalar'}
        </h1>
        <p className="page-subtitle">
          {t('settingsSubtitle') || "E'lon berish sozlamalari. Bir marta belgilang — har e'lon uchun avtomatik ishlatiladi."}
        </p>
      </div>

      {/* E'lon muddati sozlamasi */}
      <div className="card" style={{ padding: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: '1 1 auto', minWidth: '220px' }}>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
              }}
            >
              <Clock size={16} color="var(--accent-bright)" />
              {t('settingsDurationLabel') || "E'lon muddati"}

              {savedFlash && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: 'var(--success)',
                    fontWeight: 600,
                  }}
                >
                  <Check size={14} />
                  {t('settingsSaved') || 'Saqlandi'}
                </span>
              )}
            </div>

            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
              }}
            >
              {t('settingsDurationDesc') ||
                "Yangi e'lon shu muddat ichida tasdiqlanmasa, avtomatik bekor bo'ladi. Default: 90 kun."}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            <input
              type="number"
              className="input"
              value={durationInput}
              onChange={(e) => handleDurationChange(e.target.value)}
              onBlur={handleDurationBlur}
              min={DURATION_MIN_DAYS}
              max={DURATION_MAX_DAYS}
              step="1"
              style={{
                width: '90px',
                textAlign: 'center',
                fontSize: '15px',
                fontWeight: 600,
                padding: '8px 10px',
              }}
            />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {t('settingsDays') || 'kun'}
            </span>
          </div>
        </div>

        <div
          style={{
            marginTop: '12px',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          {t('settingsDurationRange') || 'Oraliq'}: {DURATION_MIN_DAYS}–{DURATION_MAX_DAYS} {t('settingsDays') || 'kun'}
        </div>
      </div>

      {/* Narx farqi cheklovi sozlamasi */}
      <div className="card" style={{ padding: '20px', marginTop: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: '1 1 auto', minWidth: '220px' }}>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
              }}
            >
              <Lock size={16} color="var(--accent-bright)" />
              {t('settingsDeviationLabel') || 'Narx farqi cheklovi'}

              {devSavedFlash && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: 'var(--success)',
                    fontWeight: 600,
                  }}
                >
                  <Check size={14} />
                  {t('settingsSaved') || 'Saqlandi'}
                </span>
              )}
            </div>

            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
              }}
            >
              {t('settingsDeviationDesc') ||
                "E'lonni tasdiqlash vaqtida bozor narxi lock narxidan shuncha foizdan ko'p farqlansa, tranzaksiya avtomatik bekor qilinadi (flash loan himoyasi). Default: 3%."}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            <input
              type="number"
              className="input"
              value={deviationInput}
              onChange={(e) => handleDeviationChange(e.target.value)}
              onBlur={handleDeviationBlur}
              min={(DEVIATION_MIN_BPS / 100).toFixed(1)}
              max={(DEVIATION_MAX_BPS / 100).toFixed(1)}
              step="0.1"
              style={{
                width: '90px',
                textAlign: 'center',
                fontSize: '15px',
                fontWeight: 600,
                padding: '8px 10px',
              }}
            />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>%</span>
          </div>
        </div>

        <div
          style={{
            marginTop: '12px',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          {t('settingsDurationRange') || 'Oraliq'}: {DEVIATION_MIN_BPS / 100}–{DEVIATION_MAX_BPS / 100}%
        </div>
      </div>

      {/* Approve ko'paytirgich sozlamasi */}
      <div className="card" style={{ padding: '20px', marginTop: '16px' }}>
        <div
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '6px',
          }}
        >
          <Zap size={16} color="var(--accent-bright)" />
          {t('settingsApproveMultLabel') || "Approve miqdori"}

          {multSavedFlash && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: 'var(--success)',
                fontWeight: 600,
              }}
            >
              <Check size={14} />
              {t('settingsSaved') || 'Saqlandi'}
            </span>
          )}
        </div>

        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            marginBottom: '14px',
          }}
        >
          {t('settingsApproveMultDesc') ||
            "Har e'lon uchun qancha token approve qilinsin. Yuqori qiymat = kelgusi e'lonlarda approve qayta so'ralmaydi (gaz tejaydi), lekin kontraktga ko'proq ishonish kerak."}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {APPROVE_MULT_OPTIONS.map((opt) => {
            const isActive = approveMult === opt;
            const label =
              opt === '1'
                ? (t('settingsApproveMult1') || '1x (kerakli)')
                : opt === 'max'
                  ? (t('settingsApproveMultMax') || 'Cheksiz')
                  : `${opt}x`;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleMultChange(opt)}
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '13px', padding: '7px 14px' }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {approveMult === 'max' && (
          <div
            style={{
              marginTop: '12px',
              fontSize: '11px',
              color: 'var(--warning)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px',
              lineHeight: 1.5,
            }}
          >
            <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            {t('settingsApproveMultMaxWarn') ||
              "Cheksiz approve — kontrakt istalgan vaqtda shu tokendan cheksiz miqdor yecha oladi. Faqat ishonchli kontraktlar uchun."}
          </div>
        )}
      </div>

      {/* Barcha approve'larni bekor qilish */}
      <div
        className="card"
        style={{
          padding: '20px',
          marginTop: '16px',
          borderColor: 'var(--danger)',
        }}
      >
        <div
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '6px',
          }}
        >
          <ShieldOff size={16} color="var(--danger)" />
          {t('settingsRevokeLabel') || "Barcha approve'larni bekor qilish"}
        </div>

        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            marginBottom: '14px',
          }}
        >
          {t('settingsRevokeDesc') ||
            "Kontraktga berilgan barcha token ruxsatlarini 0 ga tushiradi. Faqat ruxsat berilgan tokenlar uchun tranzaksiya yuboriladi (har biri uchun alohida tasdiq). Xavfsizlik uchun savdoni tugatgandan keyin foydalaning."}
        </div>

        {!showRevokeConfirm ? (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setShowRevokeConfirm(true)}
            disabled={revoking || !account}
            style={{
              fontSize: '13px',
              padding: '8px 16px',
              color: 'var(--danger)',
              borderColor: 'var(--danger)',
              background: 'transparent',
              border: '1px solid var(--danger)',
            }}
          >
            {revoking ? (
              <><div className="spinner" style={{ width: 13, height: 13 }} /> {t('settingsRevoking') || 'Bekor qilinmoqda...'}</>
            ) : (
              <><ShieldOff size={14} /> {t('settingsRevokeBtn') || "Barchasini bekor qilish"}</>
            )}
          </button>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '12px',
              borderRadius: '8px',
              background: 'var(--danger-glow)',
              border: '1px solid var(--danger)',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
              {t('settingsRevokeConfirmQ') || "Ishonchingiz komilmi? Har bir token uchun alohida tasdiq so'raladi."}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleRevokeAll}
                style={{
                  fontSize: '13px',
                  padding: '8px 16px',
                  background: 'var(--danger)',
                  color: 'white',
                  border: 'none',
                }}
              >
                {t('settingsRevokeConfirmYes') || "Ha, bekor qil"}
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowRevokeConfirm(false)}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              >
                {t('settingsRevokeConfirmNo') || 'Yo\'q'}
              </button>
            </div>
          </div>
        )}

        {!account && (
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
            {t('connectPrompt') || 'Avval walletni ulang'}
          </div>
        )}
      </div>
    </div>
  );
}
