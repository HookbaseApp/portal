/**
 * Portal branding: the shape GET /portal/branding returns, its client-side re-validation, and the
 * mapping onto the portal's HookbaseTheme (HSL-triplet CSS custom properties).
 *
 * Branding values only ever reach the page as CSS custom property values on the portal wrapper's
 * inline style — never as a <style> block or arbitrary CSS — and every value is re-checked here
 * against a strict pattern even though the API validates on write. Anything that fails is dropped.
 */
import { matchLocale, type PortalLocale } from './i18n';
import type { HookbaseTheme } from './types';

export type BrandingCssVariable =
  | 'background'
  | 'foreground'
  | 'muted'
  | 'mutedForeground'
  | 'border'
  | 'destructive'
  | 'success'
  | 'warning';

export type BrandingCssVariables = Partial<Record<BrandingCssVariable, string>> & { radius?: string };

export interface PortalBranding {
  /** false => default Hookbase styling (no config, or the plan no longer allows branding). */
  branded: boolean;
  displayName: string | null;
  /** https only. */
  logoUrl: string | null;
  /** '#rgb' | '#rrggbb' */
  primaryColor: string | null;
  accentColor: string | null;
  theme: 'light' | 'dark' | 'auto';
  supportUrl: string | null;
  supportEmail: string | null;
  /** The organization's default locale. */
  locale: PortalLocale | null;
  cssVariables: BrandingCssVariables;
  showPoweredBy: boolean;
  /** The organization's active custom portal hostname, if any. */
  customDomain: string | null;
}

export const DEFAULT_BRANDING: PortalBranding = Object.freeze({
  branded: false,
  displayName: null,
  logoUrl: null,
  primaryColor: null,
  accentColor: null,
  theme: 'auto',
  supportUrl: null,
  supportEmail: null,
  locale: null,
  cssVariables: Object.freeze({}) as BrandingCssVariables,
  showPoweredBy: true,
  customDomain: null,
}) as PortalBranding;

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const RADIUS = /^(?:\d{1,2}(?:\.\d{1,3})?)(?:px|rem)$/;
const EMAIL = /^[^\s@<>()"',;:\\]+@[^\s@<>()"',;:\\]+\.[^\s@<>()"',;:\\]+$/;
const HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const CSS_VARIABLE_KEYS: readonly BrandingCssVariable[] = [
  'background',
  'foreground',
  'muted',
  'mutedForeground',
  'border',
  'destructive',
  'success',
  'warning',
];

export function isValidHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

export function isValidRadius(value: unknown): value is string {
  return typeof value === 'string' && RADIUS.test(value);
}

/** An absolute https: URL, or null. */
export function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/**
 * Whether `value` looks like a PortalBranding (from the API) rather than a HookbaseTheme. A theme
 * has only `colors` / `borderRadius` / `darkMode`; branding always carries `branded`.
 */
export function isPortalBranding(value: unknown): value is PortalBranding {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { branded?: unknown }).branded === 'boolean'
  );
}

/**
 * A copy of `input` with every field re-validated: anything malformed becomes null / default.
 * `branded: false` keeps only what is not branding styling (locale, custom domain) and forces
 * "Powered by Hookbase" back on — the render-time fallback after a plan downgrade.
 */
export function sanitizeBranding(input: unknown): PortalBranding {
  if (!input || typeof input !== 'object') return { ...DEFAULT_BRANDING, cssVariables: {} };
  const raw = input as Record<string, unknown>;

  const locale = matchLocale(typeof raw.locale === 'string' ? raw.locale : null);
  const customDomain =
    typeof raw.customDomain === 'string' && HOSTNAME.test(raw.customDomain) ? raw.customDomain.toLowerCase() : null;

  if (raw.branded !== true) {
    return { ...DEFAULT_BRANDING, cssVariables: {}, locale, customDomain };
  }

  const cssVariables: BrandingCssVariables = {};
  const rawVars = raw.cssVariables && typeof raw.cssVariables === 'object'
    ? (raw.cssVariables as Record<string, unknown>)
    : {};
  for (const key of CSS_VARIABLE_KEYS) {
    if (isValidHexColor(rawVars[key])) cssVariables[key] = rawVars[key] as string;
  }
  if (isValidRadius(rawVars.radius)) cssVariables.radius = rawVars.radius as string;

  const supportEmail =
    typeof raw.supportEmail === 'string' && raw.supportEmail.length <= 254 && EMAIL.test(raw.supportEmail.trim())
      ? raw.supportEmail.trim()
      : null;

  return {
    branded: true,
    displayName: safeText(raw.displayName, 100),
    logoUrl: safeHttpsUrl(raw.logoUrl),
    primaryColor: isValidHexColor(raw.primaryColor) ? raw.primaryColor : null,
    accentColor: isValidHexColor(raw.accentColor) ? raw.accentColor : null,
    theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : 'auto',
    supportUrl: safeHttpsUrl(raw.supportUrl),
    supportEmail,
    locale,
    cssVariables,
    showPoweredBy: raw.showPoweredBy !== false,
    customDomain,
  };
}

function expandHex(hex: string): [number, number, number] {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** '#3b82f6' -> '217 91% 60%', the HSL-triplet form the portal's CSS variables use. */
export function hexToHslTriplet(hex: string): string | null {
  if (!isValidHexColor(hex)) return null;
  const [r, g, b] = expandHex(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h) % 360} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** A readable foreground (near-black or white) for text on `hex`, as an HSL triplet. */
export function contrastForegroundTriplet(hex: string): string {
  const [r, g, b] = expandHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? '222 47% 11%' : '0 0% 100%';
}

/**
 * Map branding onto a HookbaseTheme. `branded: false` (or anything that fails validation) yields a
 * theme with only the light/dark preference, i.e. default Hookbase styling.
 */
export function brandingToTheme(input: PortalBranding): HookbaseTheme {
  const branding = sanitizeBranding(input);
  const theme: HookbaseTheme = { darkMode: branding.theme };
  if (!branding.branded) return theme;

  const colors: NonNullable<HookbaseTheme['colors']> = {};
  if (branding.primaryColor) {
    colors.primary = hexToHslTriplet(branding.primaryColor) ?? undefined;
    colors.primaryForeground = contrastForegroundTriplet(branding.primaryColor);
  }
  if (branding.accentColor) colors.accent = hexToHslTriplet(branding.accentColor) ?? undefined;
  for (const key of CSS_VARIABLE_KEYS) {
    const value = branding.cssVariables[key];
    if (value) colors[key] = hexToHslTriplet(value) ?? undefined;
  }
  for (const key of Object.keys(colors) as Array<keyof typeof colors>) {
    if (colors[key] === undefined) delete colors[key];
  }
  if (Object.keys(colors).length > 0) theme.colors = colors;
  if (branding.cssVariables.radius) theme.borderRadius = branding.cssVariables.radius;
  return theme;
}

/** `override` on top of `base`, field by field (undefined fields in `override` don't erase). */
export function mergeThemes(base: HookbaseTheme | undefined, override: HookbaseTheme | undefined): HookbaseTheme {
  const colors = { ...(base?.colors ?? {}) };
  for (const [key, value] of Object.entries(override?.colors ?? {})) {
    if (value !== undefined) (colors as Record<string, string>)[key] = value;
  }
  const merged: HookbaseTheme = {};
  if (Object.keys(colors).length > 0) merged.colors = colors;
  const borderRadius = override?.borderRadius ?? base?.borderRadius;
  if (borderRadius !== undefined) merged.borderRadius = borderRadius;
  const darkMode = override?.darkMode ?? base?.darkMode;
  if (darkMode !== undefined) merged.darkMode = darkMode;
  return merged;
}
