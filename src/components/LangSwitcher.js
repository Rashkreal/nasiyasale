import React, { useState, useEffect, useRef } from 'react';
import { useLang } from '../hooks/useLang';
import { LANGUAGES } from '../i18n';
import { ChevronDown, Globe } from 'lucide-react';

export default function LangSwitcher() {
  const { lang, changeLang } = useLang();
  const [open, setOpen]       = useState(false);
  const ref                   = useRef(null);
  const current               = LANGUAGES.find(l => l.code === lang);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '5px 10px', cursor: 'pointer',
          color: 'var(--text-secondary)', fontSize: '13px',
          fontFamily: 'Geologica, sans-serif',
          transition: 'border-color 0.15s',
        }}
      >
        <Globe size={13} color="var(--accent-bright)" />
        <span style={{ fontWeight: 500 }}>{current?.flag} {current?.label}</span>
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : '', transition: '0.2s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border-bright)',
          borderRadius: '10px', overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          minWidth: '150px', zIndex: 99999,
        }}>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { changeLang(l.code); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '10px 14px',
                background: lang === l.code ? 'var(--accent-glow)' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: lang === l.code ? 'var(--accent-bright)' : 'var(--text-secondary)',
                fontSize: '13px', fontFamily: 'Geologica, sans-serif',
                fontWeight: lang === l.code ? 600 : 400, textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '16px' }}>{l.flag}</span>
              <span>{l.label}</span>
              {lang === l.code && <span style={{ marginLeft: 'auto', color: 'var(--success)' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
