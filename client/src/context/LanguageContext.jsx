/**
 * LanguageContext — Spheral i18n system
 *
 * Zero external dependencies. Mirrors ThemeContext architecture exactly.
 *
 * Usage:
 *   const { t, lang, setLanguage } = useLanguage();
 *   t('nav.home')           → 'Home' / 'Accueil' / 'الرئيسية' etc.
 *   t('time.minutesAgo', { count: 3 }) → '3 minutes ago'
 *
 * ⚠️ MAINTENANCE NOTE: Any new UI text added to the app must also be added
 *   to EVERY locale file in client/src/locales/. Untranslated keys fall back
 *   to English automatically — but make it a habit to translate immediately.
 */

import { createContext, useContext, useState, useLayoutEffect, useCallback } from 'react';
import { locales, RTL_LANGUAGES } from '../locales/index';
import { usersAPI } from '../api/users';

const LanguageContext = createContext(null);

// ─── DOM helpers ──────────────────────────────────────────────────────────────

/** Apply RTL direction + font to <html> immediately (no flash) */
const applyLangDOM = (langCode) => {
  const isRTL = RTL_LANGUAGES.includes(langCode);
  // Set lang for accessibility / screen readers
  document.documentElement.setAttribute('lang', langCode);
  // Set dir — CSS rule html[dir="rtl"] handles all visual flipping
  document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
};

// Apply saved language immediately before React mounts (prevents flash)
const initialLang = localStorage.getItem('spheral_lang') || 'en';
applyLangDOM(initialLang);

// ─── Deep-get a dot-notation key from nested locale object ────────────────────
function getNestedValue(obj, keyPath) {
  return keyPath.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);
  const [userId, setUserId] = useState(null);

  // Apply DOM effects whenever lang changes
  useLayoutEffect(() => {
    applyLangDOM(lang);
    localStorage.setItem('spheral_lang', lang);
  }, [lang]);

  /**
   * t(key, vars?)
   * Translate a dot-notation key, with optional variable interpolation.
   *
   * Examples:
   *   t('nav.home')
   *   t('time.minutesAgo', { count: 5 }) → replaces {{count}} with 5
   *   t('notifications.liked')
   *
   * Falls back to English if key is missing in current locale.
   * Returns the raw key string if missing in both (so you always see something).
   */
  const t = useCallback((key, vars = {}) => {
    const currentLocale = locales[lang] || locales.en;
    let value = getNestedValue(currentLocale, key);

    // Fallback chain: current locale → English → raw key
    if (value === undefined) {
      value = getNestedValue(locales.en, key);
    }
    if (value === undefined) {
      console.warn(`[i18n] Missing translation key: "${key}" for lang "${lang}"`);
      return key;
    }

    // Variable interpolation: replace {{varName}} patterns
    if (vars && typeof value === 'string') {
      return value.replace(/\{\{(\w+)\}\}/g, (_, name) =>
        vars[name] !== undefined ? String(vars[name]) : `{{${name}}}`
      );
    }

    return value;
  }, [lang]);

  /**
   * setLanguage(code, options?)
   * Switch language, persist to localStorage + MongoDB.
   */
  const setLanguage = useCallback(async (code, options = {}) => {
    if (!locales[code]) {
      console.warn(`[i18n] Unknown language code: "${code}"`);
      return;
    }
    setLangState(code);

    const activeUserId = options.userId || userId;
    if (activeUserId) {
      try {
        await usersAPI.updateLanguagePreference(activeUserId, code);
      } catch (err) {
        console.error('[i18n] Failed to sync language to DB:', err);
      }
    }
  }, [userId]);

  /**
   * Called from AppContext after login to sync DB preference.
   */
  const syncWithDatabase = useCallback((dbLang, loggedInUserId) => {
    setUserId(loggedInUserId);
    if (dbLang && dbLang !== lang && locales[dbLang]) {
      setLangState(dbLang);
    }
  }, [lang]);

  const isRTL = RTL_LANGUAGES.includes(lang);

  return (
    <LanguageContext.Provider value={{ t, lang, setLanguage, syncWithDatabase, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
