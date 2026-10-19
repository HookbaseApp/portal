import type { ReactNode } from 'react';
import { useBranding } from '../context/HookbaseContext';
import { useTranslation } from '../context/I18nContext';
import { cn } from '../utils/cn';

export interface PortalBrandHeaderProps {
  /** Title when the branding has no display name (e.g. your application's name). */
  fallbackTitle?: string;
  /** Extra content on the right, before the support link. */
  actions?: ReactNode;
  className?: string;
}

/**
 * Logo, display name and support link from the resolved branding. Unbranded (or after a plan
 * downgrade) it shows only the fallback title.
 */
export function PortalBrandHeader({ fallbackTitle, actions, className }: PortalBrandHeaderProps) {
  const { branding } = useBranding();
  const { t } = useTranslation();

  const title = (branding.branded && branding.displayName) || fallbackTitle || t('brand.defaultTitle');
  const supportHref = branding.branded
    ? branding.supportUrl ?? (branding.supportEmail ? `mailto:${branding.supportEmail}` : null)
    : null;

  return (
    <header className={cn('hkb-brand-header', className)}>
      <div className="hkb-brand-identity">
        {branding.branded && branding.logoUrl && (
          <img
            className="hkb-brand-logo"
            src={branding.logoUrl}
            alt={t('brand.logoAlt', { name: title })}
            referrerPolicy="no-referrer"
          />
        )}
        <h1 className="hkb-brand-name">{title}</h1>
      </div>
      {(actions || supportHref) && (
        <div className="hkb-brand-actions">
          {actions}
          {supportHref && (
            <a
              className="hkb-brand-support"
              href={supportHref}
              target={supportHref.startsWith('mailto:') ? undefined : '_blank'}
              rel="noopener noreferrer"
            >
              {t('brand.support')}
            </a>
          )}
        </div>
      )}
    </header>
  );
}

export interface PoweredByProps {
  className?: string;
}

/** "Powered by Hookbase", shown unless the branding turns it off (branded plans only). */
export function PoweredBy({ className }: PoweredByProps) {
  const { branding } = useBranding();
  const { t } = useTranslation();

  if (!branding.showPoweredBy) return null;

  const [before, after] = t('brand.poweredBy', { name: '\u0000' }).split('\u0000');
  return (
    <footer className={cn('hkb-powered-by', className)}>
      {before}
      <a href="https://hookbase.app" target="_blank" rel="noopener noreferrer">
        Hookbase
      </a>
      {after}
    </footer>
  );
}
