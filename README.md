# @hookbase/portal

Embeddable React component library for managing webhook endpoints, subscriptions, and delivery history. Authenticated via portal tokens.

The components call the Hookbase portal API (`/portal/*`) straight from the browser, from any origin. Only the portal token (`whpt_...`) authenticates them, so mint short-lived tokens server-side for the signed-in customer and pass them in; never ship a long-lived token in your bundle.

## Installation

```bash
npm install @hookbase/portal
```

## Quick Start

```tsx
import {
  HookbasePortal,
  EndpointList,
  EndpointForm,
  SubscriptionManager,
  MessageLog,
} from '@hookbase/portal';
import '@hookbase/portal/styles.css';

function WebhookSettings({ portalToken }) {
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);

  return (
    <HookbasePortal token={portalToken}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2>Endpoints</h2>
          <EndpointList onEndpointClick={setSelectedEndpoint} />
          <EndpointForm />
        </div>
        {selectedEndpoint && (
          <div>
            <h2>Subscriptions</h2>
            <SubscriptionManager endpointId={selectedEndpoint.id} />
          </div>
        )}
      </div>
    </HookbasePortal>
  );
}
```

## Components

### HookbasePortal

Main provider component that wraps all portal components.

```tsx
<HookbasePortal
  token="whpt_xxx"              // Portal token (required)
  apiUrl="https://api.hookbase.app"  // API URL (optional)
  theme={{                      // Theme customization (optional): a HookbaseTheme
    colors: { primary: '217 91% 60%' },  // or a PortalBranding object (see Branding)
    darkMode: 'auto',
  }}
  useServerBranding             // Apply the org's branding from GET /portal/branding (optional, default false)
  locale="es"                   // UI locale (optional; see Localization)
  messages={{ 'common.cancel': 'Back' }}  // Override any UI string (optional)
  onError={(error) => {}}       // Error callback (optional)
>
  {children}
</HookbasePortal>
```

### EndpointList

Displays all webhook endpoints with status and statistics.

```tsx
<EndpointList
  showActions={true}                    // Show edit/delete buttons
  emptyState={<p>No endpoints</p>}     // Custom empty state
  onEndpointClick={(endpoint) => {}}   // Endpoint click handler
  onEditClick={(endpoint) => {}}       // Edit button handler
  onDeleteClick={(endpoint) => {}}     // Delete button handler
/>
```

### EndpointForm

Form to create or edit webhook endpoints.

```tsx
<EndpointForm
  mode="create"                         // 'create' or 'edit'
  endpoint={endpoint}                   // Endpoint to edit (for edit mode)
  onSuccess={(endpoint, secret) => {}} // Success callback
  onCancel={() => {}}                  // Cancel callback
/>
```

### EventTypeList

Browse available event types grouped by category.

```tsx
<EventTypeList
  showSearch={true}                    // Show search input
  selectedIds={new Set(['id1'])}       // Highlight selected types
  onEventTypeClick={(eventType) => {}} // Click handler
/>
```

### SubscriptionManager

Manage event subscriptions for an endpoint.

```tsx
<SubscriptionManager
  endpointId={endpoint.id}             // Endpoint ID (required)
  variant="full"                       // 'full' or 'compact'
  onChange={(subscribedIds) => {}}     // Change callback
/>
```

### MessageLog

View delivery history and message status.

```tsx
<MessageLog
  endpointId={endpoint.id}             // Filter by endpoint (optional)
  status="awaiting_retry"              // Filter by status (optional): pending, processing, success,
                                       //   failed, awaiting_retry, exhausted, dlq
  limit={50}                           // Messages per page (max 100)
  refreshInterval={30000}              // Auto-refresh in ms (0 to disable)
  showAttempts={true}                  // Per-message "Attempts" toggle
  onMessageClick={(message) => {}}     // Click handler
/>
```

History is paged with Previous/Next. The API pages by cursor, so there is no total count.

### EndpointSecretRotation

```tsx
<EndpointSecretRotation
  endpoint={endpoint}
  gracePeriodSeconds={3600}            // How long the old secret keeps verifying (0-86400, default 86400)
  onSuccess={(secret, { secretVersion, previousSecretExpiresAt }) => {}}
/>
```

## Theming

Customize the portal appearance using CSS variables or the theme prop:

```tsx
<HookbasePortal
  token={token}
  theme={{
    colors: {
      primary: '217 91% 60%',        // HSL values
      background: '0 0% 100%',
      foreground: '222 47% 11%',
      border: '214 32% 91%',
      destructive: '0 84% 60%',
      success: '142 76% 36%',
    },
    borderRadius: '0.5rem',
    darkMode: 'auto',                 // 'auto' | 'light' | 'dark'
  }}
>
  {children}
</HookbasePortal>
```

Or override CSS variables directly:

```css
.hookbase-portal {
  --hkb-primary: 217 91% 60%;
  --hkb-background: 0 0% 100%;
  --hkb-radius: 0.75rem;
}
```

## Branding

Organizations configure portal branding in the Hookbase dashboard (Outbound → Webhooks → Customer portal;
Starter plan and above): logo, primary and accent colours, light/dark/auto theme, display name,
support URL/email, default locale, and a fixed set of colour variables. The portal token API
serves it at `GET /portal/branding`:

```ts
interface PortalBranding {
  branded: boolean;              // false: default Hookbase styling (no config, or the plan no longer includes branding)
  displayName: string | null;
  logoUrl: string | null;        // https only
  primaryColor: string | null;   // '#rgb' | '#rrggbb'
  accentColor: string | null;    // links and focus rings
  theme: 'light' | 'dark' | 'auto';
  supportUrl: string | null;     // https only
  supportEmail: string | null;
  locale: PortalLocale | null;   // organization default locale
  cssVariables: {                // '#rgb' | '#rrggbb', radius as px/rem
    background?: string; foreground?: string; muted?: string; mutedForeground?: string;
    border?: string; destructive?: string; success?: string; warning?: string; radius?: string;
  };
  showPoweredBy: boolean;
  customDomain: string | null;   // the org's active custom portal hostname
}
```

Use it in one of two ways:

```tsx
// 1. Let the portal fetch and apply it.
<HookbasePortal token={token} useServerBranding>
  <PortalBrandHeader fallbackTitle="Webhooks" />   {/* logo + display name + support link */}
  <EndpointList />
  <PoweredBy />                                    {/* "Powered by Hookbase" unless branding turns it off */}
</HookbasePortal>

// 2. Pass a branding object you already have (e.g. fetched server-side) as `theme`.
<HookbasePortal token={token} theme={branding}>...</HookbasePortal>
```

With `useServerBranding`, an explicit `theme` still wins field by field, so you can pin individual
colours. An API that predates `/portal/branding` answers 404, which the portal treats as "no
branding". `useBranding()` returns `{ branding, isLoading }` for rendering your own header.

Branding values are re-validated in the browser (strict hex colours, px/rem radius, https-only
URLs; anything else is dropped) and are only applied as CSS custom properties on the portal
wrapper — never as injected CSS. `brandingToTheme(branding)` exposes the mapping onto
`HookbaseTheme` if you want to merge it yourself.

## Localization

The components ship with catalogs for `en`, `es`, `fr`, `de`, `ja` and `pt-BR`
(`SUPPORTED_LOCALES`). The locale is chosen in this order:

1. the `locale` prop
2. `?locale=` in the page URL
3. the organization's default locale (with `useServerBranding` or a branding `theme`)
4. the browser's languages (`navigator.languages`)
5. English

Tags are matched exactly, then by language: `es-MX` → `es`, `fr-CA` → `fr`, `pt`/`pt-PT` →
`pt-BR`; anything unsupported moves on to the next source. Dates, numbers and relative times are
formatted with `Intl` in the chosen locale.

Override individual strings with `messages` (keys are the English catalog's, e.g.
`'endpoint.empty.title'`); any key you leave out falls back to the locale's catalog, then English:

```tsx
<HookbasePortal token={token} locale="de" messages={{ 'brand.defaultTitle': 'Webhooks' }}>
```

`useTranslation()` returns `{ t, locale, formatDate, formatNumber, formatRelative }` for your own
components inside the portal; `resolveLocale([...candidates])` and `createTranslator(locale,
overrides)` are exported for use outside React.

## Hooks

Access data directly using React Query-powered hooks:

```tsx
import {
  useEndpoints,
  useEventTypes,
  useSubscriptions,
  useMessages,
  useApplication,
} from '@hookbase/portal';

function MyComponent() {
  const { endpoints, isLoading, createEndpoint } = useEndpoints();
  const { eventTypes, groupedByCategory } = useEventTypes();
  const { subscriptions, toggleSubscription } = useSubscriptions(endpointId);
  const { messages, hasMore, nextCursor } = useMessages({ limit: 25 });
  // Next page: useMessages({ limit: 25, cursor: nextCursor })

  // ...
}
```

## API Client

For advanced use cases, access the API client directly:

```tsx
import { useHookbase, PortalApiClient } from '@hookbase/portal';

function MyComponent() {
  const { api } = useHookbase();

  // Or create a standalone client
  const client = new PortalApiClient('https://api.hookbase.app', token);
  const endpoints = await client.getEndpoints();

  // Delivery history is cursor-paged: pass nextCursor back verbatim
  let cursor: string | undefined;
  do {
    const page = await client.getMessages({ limit: 100, cursor });
    // ... page.data
    cursor = page.pagination.nextCursor ?? undefined;
  } while (cursor);
}
```

Failed calls throw `PortalApiError` with `status`, a `message` taken from the API's error body, and `details` (field errors) for invalid input.

## TypeScript

All components and hooks are fully typed:

```typescript
import type {
  Endpoint,
  EventType,
  Subscription,
  OutboundMessage,
  HookbaseTheme,
  PortalBranding,
  PortalLocale,
  PortalMessages,
} from '@hookbase/portal';
```

## License

MIT
