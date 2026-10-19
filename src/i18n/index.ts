import { en, type PortalMessageKey, type PortalMessages } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { de } from './locales/de';
import { ja } from './locales/ja';
import { ptBR } from './locales/pt-BR';

export type { PortalMessageKey, PortalMessages };

export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'ja', 'pt-BR'] as const;
export type PortalLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: PortalLocale = 'en';

export const CATALOGS: Record<PortalLocale, PortalMessages> = {
  en,
  es,
  fr,
  de,
  ja,
  'pt-BR': ptBR,
};

/**
 * The supported locale a single BCP 47 tag maps to, or null. Exact match first (case-insensitive),
 * then the base language: `pt`/`pt-PT` -> pt-BR (the one Portuguese catalog), `es-MX` -> es,
 * `fr-CA` -> fr, `en-GB` -> en.
 */
export function matchLocale(tag: string | null | undefined): PortalLocale | null {
  if (typeof tag !== 'string') return null;
  const normalized = tag.trim().replace(/_/g, '-').toLowerCase();
  if (!normalized) return null;

  const exact = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === normalized);
  if (exact) return exact;

  const base = normalized.split('-')[0];
  return SUPPORTED_LOCALES.find((l) => l.toLowerCase().split('-')[0] === base) ?? null;
}

/**
 * The first candidate that maps to a supported locale, else 'en'. Pass candidates in priority
 * order; null/undefined entries are skipped.
 */
export function resolveLocale(candidates: ReadonlyArray<string | null | undefined>): PortalLocale {
  for (const candidate of candidates) {
    const match = matchLocale(candidate);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

/** `?locale=` from the current page URL; null during SSR or when absent. */
export function getQueryLocale(): string | null {
  if (typeof window === 'undefined' || !window.location) return null;
  try {
    return new URLSearchParams(window.location.search).get('locale');
  } catch {
    return null;
  }
}

/** The browser's preferred languages; empty during SSR. */
export function getNavigatorLocales(): string[] {
  if (typeof navigator === 'undefined') return [];
  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return [...navigator.languages];
  }
  return navigator.language ? [navigator.language] : [];
}

export type TranslateVars = Record<string, string | number>;
export type Translate = (key: PortalMessageKey, vars?: TranslateVars) => string;

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
  );
}

/**
 * A translator for `locale`. Lookup order per key: `overrides` -> the locale's catalog -> English,
 * so a partial `messages` prop or an incomplete catalog never shows a raw key.
 */
export function createTranslator(
  locale: PortalLocale,
  overrides?: Partial<PortalMessages>
): Translate {
  const catalog = CATALOGS[locale] ?? en;
  return (key, vars) => {
    const override = overrides?.[key];
    const template =
      (typeof override === 'string' && override) || catalog[key] || en[key] || key;
    return interpolate(template, vars);
  };
}
