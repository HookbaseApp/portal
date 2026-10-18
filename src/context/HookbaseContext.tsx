import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { PortalApiClient } from '../api/client';
import { ThemeProvider } from './ThemeContext';
import { I18nProvider } from './I18nContext';
import type { HookbaseTheme } from '../types';
import {
  DEFAULT_BRANDING,
  brandingToTheme,
  isPortalBranding,
  mergeThemes,
  sanitizeBranding,
  type PortalBranding,
} from '../branding';
import {
  getNavigatorLocales,
  getQueryLocale,
  resolveLocale,
  type PortalMessages,
} from '../i18n';

interface HookbaseContextValue {
  api: PortalApiClient;
  token: string;
  apiUrl: string;
}

const HookbaseContext = createContext<HookbaseContextValue | null>(null);

export interface BrandingContextValue {
  /** The resolved branding: server branding (useServerBranding) or the `theme` prop's branding. */
  branding: PortalBranding;
  /** True while server branding is loading. */
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

/**
 * The portal's resolved branding, for rendering the logo, display name and support links.
 * Returns the defaults (unbranded, "Powered by Hookbase" on) when there is none.
 */
export function useBranding(): BrandingContextValue {
  return useContext(BrandingContext) ?? { branding: DEFAULT_BRANDING, isLoading: false };
}

export const BRANDING_QUERY_KEY = ['portal', 'branding'] as const;

function BrandedShell({
  theme,
  useServerBranding,
  locale,
  messages,
  children,
}: {
  theme?: HookbaseTheme | PortalBranding;
  useServerBranding: boolean;
  locale?: string;
  messages?: Partial<PortalMessages>;
  children: ReactNode;
}) {
  const { api } = useHookbase();
  const serverQuery = useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: async () => (await api.getBranding()).data,
    enabled: useServerBranding,
    staleTime: 5 * 60 * 1000,
  });

  const serverBranding = useServerBranding && serverQuery.data ? serverQuery.data : null;
  const propBranding = useMemo(
    () => (isPortalBranding(theme) ? sanitizeBranding(theme) : null),
    [theme]
  );

  const branding = propBranding ?? serverBranding ?? DEFAULT_BRANDING;

  const resolvedTheme = useMemo(() => {
    const serverTheme = serverBranding ? brandingToTheme(serverBranding) : undefined;
    const propTheme = propBranding ? brandingToTheme(propBranding) : (theme as HookbaseTheme | undefined);
    return mergeThemes(serverTheme, propTheme);
  }, [serverBranding, propBranding, theme]);

  const resolvedLocale = resolveLocale([
    locale,
    getQueryLocale(),
    propBranding?.locale ?? serverBranding?.locale,
    ...getNavigatorLocales(),
  ]);

  const brandingValue = useMemo(
    () => ({ branding, isLoading: useServerBranding && serverQuery.isLoading }),
    [branding, useServerBranding, serverQuery.isLoading]
  );

  return (
    <BrandingContext.Provider value={brandingValue}>
      <I18nProvider locale={resolvedLocale} messages={messages}>
        <ThemeProvider theme={resolvedTheme}>{children}</ThemeProvider>
      </I18nProvider>
    </BrandingContext.Provider>
  );
}

export function useHookbase() {
  const context = useContext(HookbaseContext);
  if (!context) {
    throw new Error('useHookbase must be used within a HookbasePortal provider');
  }
  return context;
}

export interface HookbasePortalProps {
  /**
   * Portal authentication token (whpt_xxx)
   */
  token: string;
  /**
   * Hookbase API URL
   * @default 'https://api.hookbase.app'
   */
  apiUrl?: string;
  /**
   * Theme customization: either a HookbaseTheme (HSL triplets), or a PortalBranding object (the
   * shape GET /portal/branding returns, hex colours) which is mapped with brandingToTheme().
   * Fields set here win over server branding (useServerBranding), field by field.
   */
  theme?: HookbaseTheme | PortalBranding;
  /**
   * Fetch the organization's branding from GET /portal/branding and apply it (colours, light/dark
   * preference, default locale). Off by default.
   * @default false
   */
  useServerBranding?: boolean;
  /**
   * UI locale, e.g. 'es' or 'pt-BR'. Unset: `?locale=` in the page URL, then the organization's
   * default (with useServerBranding), then the browser's languages, then English.
   */
  locale?: string;
  /**
   * Override any catalog string; missing keys fall back to the locale's catalog, then English.
   */
  messages?: Partial<PortalMessages>;
  /**
   * Child components to render inside the portal
   */
  children: ReactNode;
  /**
   * Error callback for API errors
   */
  onError?: (error: Error) => void;
}

// Create an isolated QueryClient for the portal
function createPortalQueryClient(onError?: (error: Error) => void) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error instanceof Error && 'status' in error) {
            const status = (error as { status: number }).status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          return failureCount < 2;
        },
      },
      mutations: {
        onError: (error) => {
          onError?.(error instanceof Error ? error : new Error(String(error)));
        },
      },
    },
  });
}

export function HookbasePortal({
  token,
  apiUrl = 'https://api.hookbase.app',
  theme,
  useServerBranding = false,
  locale,
  messages,
  children,
  onError,
}: HookbasePortalProps) {
  // Create isolated QueryClient
  const queryClient = useMemo(
    () => createPortalQueryClient(onError),
    [onError]
  );

  // Create API client
  const api = useMemo(
    () => new PortalApiClient(apiUrl, token),
    [apiUrl, token]
  );

  const contextValue = useMemo(
    () => ({ api, token, apiUrl }),
    [api, token, apiUrl]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <HookbaseContext.Provider value={contextValue}>
        <BrandedShell
          theme={theme}
          useServerBranding={useServerBranding}
          locale={locale}
          messages={messages}
        >
          {children}
        </BrandedShell>
      </HookbaseContext.Provider>
    </QueryClientProvider>
  );
}
