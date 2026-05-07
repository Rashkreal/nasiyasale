import React, { createContext, useContext, useState } from 'react';
import { translations, DEFAULT_LANG } from '../i18n';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('ns_lang') || DEFAULT_LANG;
  });

  const t = (key) => {
    return translations[lang]?.[key] || translations['uz']?.[key] || key;
  };

  const changeLang = (code) => {
    setLang(code);
    localStorage.setItem('ns_lang', code);
  };

  return (
    <LangContext.Provider value={{ lang, t, changeLang }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be inside LangProvider');
  return ctx;
};
