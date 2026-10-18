import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HookbasePortal } from '../context/HookbaseContext';
import { EndpointList } from '../components/EndpointList';
import { useTranslation } from '../context/I18nContext';
import {
  CATALOGS,
  SUPPORTED_LOCALES,
  createTranslator,
  matchLocale,
  resolveLocale,
} from '../i18n';
import { en } from '../i18n/locales/en';

describe('resolveLocale', () => {
  it.each([
    [['pt-PT'], 'pt-BR'],
    [['pt'], 'pt-BR'],
    [['pt-br'], 'pt-BR'],
    [['es-MX'], 'es'],
    [['fr-CA'], 'fr'],
    [['de-AT'], 'de'],
    [['ja-JP'], 'ja'],
    [['en-GB'], 'en'],
    [['xx'], 'en'],
    [[], 'en'],
    [[null, undefined, ''], 'en'],
    [['xx', 'de-CH'], 'de'],
    [['zh-CN', 'fr'], 'fr'],
  ] as const)('%j -> %s', (candidates, expected) => {
    expect(resolveLocale(candidates)).toBe(expected);
  });

  it('treats underscores like hyphens', () => {
    expect(matchLocale('pt_BR')).toBe('pt-BR');
  });
});

describe('catalogs', () => {
  const enKeys = Object.keys(en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    it(`${locale} has exactly the English keys, all non-empty`, () => {
      const catalog = CATALOGS[locale];
      expect(Object.keys(catalog).sort()).toEqual(enKeys);
      for (const value of Object.values(catalog)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });

    it(`${locale} keeps every {placeholder} of the English string`, () => {
      const catalog = CATALOGS[locale];
      for (const key of enKeys as Array<keyof typeof en>) {
        const placeholders = (en[key].match(/\{\w+\}/g) ?? []).sort();
        expect({ key, p: (catalog[key].match(/\{\w+\}/g) ?? []).sort() }).toEqual({ key, p: placeholders });
      }
    });
  }
});

describe('createTranslator', () => {
  it('interpolates placeholders', () => {
    const t = createTranslator('es');
    expect(t('messages.page', { page: 3 })).toBe('Página 3');
  });

  it('prefers overrides, then the locale catalog, then English, per key', () => {
    const t = createTranslator('fr', { 'common.cancel': 'Annuler maintenant' });
    expect(t('common.cancel')).toBe('Annuler maintenant');
    expect(t('common.delete')).toBe('Supprimer');
  });

  it('falls back to English for a key missing from a catalog or override', () => {
    const t = createTranslator('de', { 'common.done': '' });
    // An empty override does not blank the string.
    expect(t('common.done')).toBe('Fertig');

    const original = CATALOGS.ja['common.next'];
    try {
      delete (CATALOGS.ja as Record<string, string>)['common.next'];
      expect(createTranslator('ja')('common.next')).toBe(en['common.next']);
    } finally {
      (CATALOGS.ja as Record<string, string>)['common.next'] = original;
    }
  });
});

function LocaleProbe() {
  const { locale, t } = useTranslation();
  return (
    <p data-testid="probe">
      {locale}|{t('common.cancel')}
    </p>
  );
}

describe('HookbasePortal locale selection', () => {
  const originalLocation = window.location;
  let languages: string[] = ['ja-JP'];
  let languagesSpy: { mockRestore: () => void } | null = null;

  beforeEach(() => {
    languagesSpy = vi.spyOn(navigator, 'languages', 'get').mockImplementation(() => languages);
  });

  afterEach(() => {
    languagesSpy?.mockRestore();
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true });
  });

  function setSearch(search: string) {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, search },
      writable: true,
      configurable: true,
    });
  }

  it('uses the browser language when nothing else is set', () => {
    languages = ['ja-JP'];
    setSearch('');
    render(
      <HookbasePortal token="whpt_test" apiUrl="https://api.test.com">
        <LocaleProbe />
      </HookbasePortal>
    );
    expect(screen.getByTestId('probe').textContent).toBe('ja|キャンセル');
  });

  it('?locale= beats the browser language', () => {
    languages = ['ja-JP'];
    setSearch('?locale=fr-CA');
    render(
      <HookbasePortal token="whpt_test" apiUrl="https://api.test.com">
        <LocaleProbe />
      </HookbasePortal>
    );
    expect(screen.getByTestId('probe').textContent).toBe('fr|Annuler');
  });

  it('the locale prop beats ?locale=', () => {
    setSearch('?locale=fr');
    render(
      <HookbasePortal token="whpt_test" apiUrl="https://api.test.com" locale="de">
        <LocaleProbe />
      </HookbasePortal>
    );
    expect(screen.getByTestId('probe').textContent).toBe('de|Abbrechen');
  });

  it('applies the messages override with per-key fallback', () => {
    setSearch('');
    render(
      <HookbasePortal
        token="whpt_test"
        apiUrl="https://api.test.com"
        locale="es"
        messages={{ 'common.cancel': 'Volver' }}
      >
        <LocaleProbe />
      </HookbasePortal>
    );
    expect(screen.getByTestId('probe').textContent).toBe('es|Volver');
  });

  it('renders a component in Spanish', async () => {
    setSearch('');
    const fetchMock = vi.fn(async (input: string) => {
      const path = new URL(input).pathname;
      if (path === '/portal/endpoints') {
        return { ok: true, status: 200, json: async () => ({ data: [] }) };
      }
      return { ok: false, status: 404, json: async () => ({ error: 'nope' }) };
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <HookbasePortal token="whpt_test" apiUrl="https://api.test.com" locale="es">
        <EndpointList />
      </HookbasePortal>
    );
    await waitFor(() => expect(screen.getByText('Aún no hay endpoints')).toBeTruthy());
  });
});
