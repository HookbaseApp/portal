import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  createTranslator,
  DEFAULT_LOCALE,
  type PortalLocale,
  type PortalMessages,
  type Translate,
} from '../i18n';

export interface TranslationValue {
  /** Translate a catalog key, filling `{name}` placeholders from `vars`. */
  t: Translate;
  /** The resolved locale. */
  locale: PortalLocale;
  /** A date/time in the resolved locale (medium date, short time). */
  formatDate: (value: string | number | Date) => string;
  /** A number in the resolved locale. */
  formatNumber: (value: number) => string;
  /** "5 minutes ago"-style relative time in the resolved locale. */
  formatRelative: (value: string | number | Date) => string;
}

function buildValue(locale: PortalLocale, messages?: Partial<PortalMessages>): TranslationValue {
  const t = createTranslator(locale, messages);

  const formatDate = (value: string | number | Date) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    } catch {
      return date.toLocaleString();
    }
  };

  const formatNumber = (value: number) => {
    try {
      return new Intl.NumberFormat(locale).format(value);
    } catch {
      return String(value);
    }
  };

  const formatRelative = (value: string | number | Date) => {
    const date = value instanceof Date ? value : new Date(value);
    const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
    const abs = Math.abs(diffSeconds);
    if (Number.isNaN(diffSeconds)) return String(value);
    if (abs < 60) return t('common.justNow');
    try {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always', style: 'narrow' });
      if (abs < 3600) return rtf.format(Math.trunc(diffSeconds / 60), 'minute');
      if (abs < 86400) return rtf.format(Math.trunc(diffSeconds / 3600), 'hour');
      return rtf.format(Math.trunc(diffSeconds / 86400), 'day');
    } catch {
      return formatDate(date);
    }
  };

  return { t, locale, formatDate, formatNumber, formatRelative };
}

const I18nContext = createContext<TranslationValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: PortalLocale;
  messages?: Partial<PortalMessages>;
  children: ReactNode;
}) {
  const value = useMemo(() => buildValue(locale, messages), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

let fallbackValue: TranslationValue | null = null;

/**
 * The portal's translator. Outside a HookbasePortal it falls back to English rather than throwing,
 * so components rendered standalone (e.g. in tests or stories) still read correctly.
 */
export function useTranslation(): TranslationValue {
  const context = useContext(I18nContext);
  if (context) return context;
  fallbackValue ??= buildValue(DEFAULT_LOCALE);
  return fallbackValue;
}
