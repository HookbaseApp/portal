import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { HookbaseTheme } from '../types';

interface ThemeContextValue {
  theme: HookbaseTheme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  theme?: HookbaseTheme;
  children: ReactNode;
}

function getSystemDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ theme = {}, children }: ThemeProviderProps) {
  const [systemDark, setSystemDark] = useState(getSystemDarkMode);

  useEffect(() => {
    if (theme.darkMode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme.darkMode]);

  const isDark =
    theme.darkMode === 'dark' || (theme.darkMode === 'auto' && systemDark);

  const cssVars = buildCssVariables(theme, isDark);

  return (
    <ThemeContext.Provider value={{ theme, isDark }}>
      <div
        className={`hookbase-portal${isDark ? ' dark' : ''}`}
        style={cssVars}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

function buildCssVariables(
  theme: HookbaseTheme,
  isDark: boolean
): React.CSSProperties {
  const vars: Record<string, string> = {};

  if (theme.colors?.primary) {
    vars['--hkb-primary'] = theme.colors.primary;
  }
  if (theme.colors?.background) {
    vars['--hkb-background'] = theme.colors.background;
  }
  if (theme.colors?.foreground) {
    vars['--hkb-foreground'] = theme.colors.foreground;
  }
  if (theme.colors?.muted) {
    vars['--hkb-muted'] = theme.colors.muted;
  }
  if (theme.colors?.mutedForeground) {
    vars['--hkb-muted-foreground'] = theme.colors.mutedForeground;
  }
  if (theme.colors?.border) {
    vars['--hkb-border'] = theme.colors.border;
  }
  if (theme.colors?.destructive) {
    vars['--hkb-destructive'] = theme.colors.destructive;
  }
  if (theme.colors?.success) {
    vars['--hkb-success'] = theme.colors.success;
  }
  if (theme.colors?.warning) {
    vars['--hkb-warning'] = theme.colors.warning;
  }
  if (theme.borderRadius) {
    vars['--hkb-radius'] = theme.borderRadius;
  }

  return vars as React.CSSProperties;
}
