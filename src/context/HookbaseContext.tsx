import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PortalApiClient } from '../api/client';
import { ThemeProvider } from './ThemeContext';
import type { HookbaseTheme } from '../types';

interface HookbaseContextValue {
  api: PortalApiClient;
  token: string;
  apiUrl: string;
}

const HookbaseContext = createContext<HookbaseContextValue | null>(null);

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
   * Theme customization options
   */
  theme?: HookbaseTheme;
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
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </HookbaseContext.Provider>
    </QueryClientProvider>
  );
}
