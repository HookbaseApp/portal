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
  theme={{                      // Theme customization (optional)
    colors: { primary: '217 91% 60%' },
    darkMode: 'auto',
  }}
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
} from '@hookbase/portal';
```

## License

MIT
