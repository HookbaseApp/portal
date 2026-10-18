import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HookbasePortal, useBranding } from '../context/HookbaseContext';
import { PoweredBy, PortalBrandHeader } from '../components/Branding';
import { PortalApiClient } from '../api/client';
import {
  DEFAULT_BRANDING,
  brandingToTheme,
  hexToHslTriplet,
  mergeThemes,
  sanitizeBranding,
  type PortalBranding,
} from '../branding';

const API = 'https://api.test.com';

const branded = (over: Partial<PortalBranding> = {}): PortalBranding => ({
  ...DEFAULT_BRANDING,
  cssVariables: {},
  branded: true,
  displayName: 'Acme Webhooks',
  logoUrl: 'https://cdn.acme.test/logo.png',
  primaryColor: '#3b82f6',
  accentColor: '#f00',
  theme: 'dark',
  supportUrl: 'https://acme.test/support',
  supportEmail: 'help@acme.test',
  locale: 'es',
  showPoweredBy: false,
  ...over,
});

function mockFetch(handler: (path: string) => { status: number; body: unknown }) {
  const fn = vi.fn(async (input: string) => {
    const { status, body } = handler(new URL(input).pathname);
    return { ok: status < 300, status, json: async () => body };
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}


describe('hexToHslTriplet', () => {
  it('converts hex to the HSL-triplet form', () => {
    expect(hexToHslTriplet('#3b82f6')).toBe('217 91% 60%');
    expect(hexToHslTriplet('#fff')).toBe('0 0% 100%');
    expect(hexToHslTriplet('#000000')).toBe('0 0% 0%');
  });

  it('rejects anything that is not #rgb / #rrggbb', () => {
    expect(hexToHslTriplet('red')).toBeNull();
    expect(hexToHslTriplet('#12345')).toBeNull();
    expect(hexToHslTriplet('#3b82f6; background: url(x)')).toBeNull();
  });
});

describe('brandingToTheme', () => {
  it('maps colours, accent, css variables, radius and theme', () => {
    const theme = brandingToTheme(
      branded({ cssVariables: { background: '#ffffff', border: '#e2e8f0', radius: '12px' } })
    );
    expect(theme.darkMode).toBe('dark');
    expect(theme.colors?.primary).toBe('217 91% 60%');
    expect(theme.colors?.primaryForeground).toBe('0 0% 100%');
    expect(theme.colors?.accent).toBe('0 100% 50%');
    expect(theme.colors?.background).toBe('0 0% 100%');
    expect(theme.colors?.border).toBe('214 32% 91%');
    expect(theme.borderRadius).toBe('12px');
  });

  it('drops invalid values silently', () => {
    const theme = brandingToTheme(
      branded({
        primaryColor: 'javascript:alert(1)',
        accentColor: 'rgb(0,0,0)',
        cssVariables: { background: 'red', radius: '1em; color: red' } as PortalBranding['cssVariables'],
      })
    );
    expect(theme.colors).toBeUndefined();
    expect(theme.borderRadius).toBeUndefined();
  });

  it('ignores branding colours when branded is false (plan downgrade)', () => {
    const theme = brandingToTheme(branded({ branded: false, theme: 'light' }));
    expect(theme).toEqual({ darkMode: 'auto' });
  });
});

describe('sanitizeBranding', () => {
  it('keeps only https logo/support URLs and a valid email', () => {
    const b = sanitizeBranding(
      branded({ logoUrl: 'http://cdn.acme.test/logo.png', supportUrl: 'javascript:alert(1)', supportEmail: 'not an email' })
    );
    expect(b.logoUrl).toBeNull();
    expect(b.supportUrl).toBeNull();
    expect(b.supportEmail).toBeNull();
  });

  it('unbranded keeps locale but forces Powered by back on', () => {
    const b = sanitizeBranding(branded({ branded: false, showPoweredBy: false, locale: 'fr' }));
    expect(b.branded).toBe(false);
    expect(b.showPoweredBy).toBe(true);
    expect(b.logoUrl).toBeNull();
    expect(b.locale).toBe('fr');
  });

  it('returns defaults for garbage', () => {
    expect(sanitizeBranding(null)).toEqual({ ...DEFAULT_BRANDING, cssVariables: {} });
    expect(sanitizeBranding('x')).toEqual({ ...DEFAULT_BRANDING, cssVariables: {} });
  });
});

describe('mergeThemes', () => {
  it('lets the override win field by field', () => {
    const merged = mergeThemes(
      { colors: { primary: '1 1% 1%', border: '2 2% 2%' }, darkMode: 'dark', borderRadius: '4px' },
      { colors: { primary: '9 9% 9%' } }
    );
    expect(merged).toEqual({ colors: { primary: '9 9% 9%', border: '2 2% 2%' }, darkMode: 'dark', borderRadius: '4px' });
  });
});

describe('PortalApiClient.getBranding', () => {
  it('resolves to the defaults on 404 (older API)', async () => {
    mockFetch(() => ({ status: 404, body: { error: 'Not found' } }));
    const res = await new PortalApiClient(API, 'whpt_x').getBranding();
    expect(res.data).toEqual({ ...DEFAULT_BRANDING, cssVariables: {} });
  });

  it('re-validates what the API returns', async () => {
    mockFetch(() => ({ status: 200, body: { data: branded({ primaryColor: 'nope' }) } }));
    const res = await new PortalApiClient(API, 'whpt_x').getBranding();
    expect(res.data.branded).toBe(true);
    expect(res.data.primaryColor).toBeNull();
    expect(res.data.displayName).toBe('Acme Webhooks');
  });

  it('still throws other errors', async () => {
    mockFetch(() => ({ status: 401, body: { error: 'Invalid or revoked token' } }));
    await expect(new PortalApiClient(API, 'whpt_x').getBranding()).rejects.toThrow('Invalid or revoked token');
  });
});

describe('PoweredBy', () => {
  it('shows "Powered by Hookbase" by default', () => {
    render(
      <HookbasePortal token="whpt_x" apiUrl={API} locale="en">
        <PoweredBy />
      </HookbasePortal>
    );
    expect(screen.getByRole('contentinfo').textContent).toBe('Powered by Hookbase');
  });

  it('is hidden when the branding turns it off', () => {
    const { container } = render(
      <HookbasePortal token="whpt_x" apiUrl={API} theme={branded({ showPoweredBy: false })}>
        <PoweredBy />
      </HookbasePortal>
    );
    expect(container.querySelector('.hkb-powered-by')).toBeNull();
  });
});

function BrandingProbe() {
  const { branding } = useBranding();
  return <p data-testid="name">{branding.displayName ?? 'none'}</p>;
}

describe('useServerBranding', () => {
  it('fetches /portal/branding and applies colours, header and locale', async () => {
    mockFetch((path) =>
      path === '/portal/branding'
        ? { status: 200, body: { data: branded() } }
        : { status: 404, body: {} }
    );
    const { container } = render(
      <HookbasePortal token="whpt_x" apiUrl={API} useServerBranding>
        <PortalBrandHeader />
        <BrandingProbe />
      </HookbasePortal>
    );

    await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('Acme Webhooks'));
    const root = container.querySelector('.hookbase-portal') as HTMLElement;
    expect(root.style.getPropertyValue('--hkb-primary')).toBe('217 91% 60%');
    expect(root.className).toContain('dark');
    expect(screen.getByRole('heading').textContent).toBe('Acme Webhooks');
    expect((screen.getByRole('img') as HTMLImageElement).src).toBe('https://cdn.acme.test/logo.png');
    // Server default locale is es, and nothing more specific was set... except navigator (en-US in
    // jsdom), which ranks below it.
    expect(screen.getByText('Soporte').getAttribute('href')).toBe('https://acme.test/support');
  });

  it('an explicit theme wins over server branding field by field', async () => {
    mockFetch((path) =>
      path === '/portal/branding' ? { status: 200, body: { data: branded() } } : { status: 404, body: {} }
    );
    const { container } = render(
      <HookbasePortal token="whpt_x" apiUrl={API} useServerBranding theme={{ colors: { primary: '1 2% 3%' } }}>
        <BrandingProbe />
      </HookbasePortal>
    );
    await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('Acme Webhooks'));
    const root = container.querySelector('.hookbase-portal') as HTMLElement;
    expect(root.style.getPropertyValue('--hkb-primary')).toBe('1 2% 3%');
    expect(root.style.getPropertyValue('--hkb-accent')).toBe('0 100% 50%');
  });

  it('does not fetch branding unless asked', () => {
    const fetchMock = mockFetch(() => ({ status: 200, body: { data: branded() } }));
    render(
      <HookbasePortal token="whpt_x" apiUrl={API}>
        <BrandingProbe />
      </HookbasePortal>
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('name').textContent).toBe('none');
  });
});
