# @hookbase/portal

Embeddable React component library for managing webhook endpoints, subscriptions, and delivery history. Authenticated via portal tokens.

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
  endpointId="wh_ep_xxx"               // Endpoint ID (required)
  variant="full"                       // 'full' or 'compact'
  onChange={(subscribedIds) => {}}     // Change callback
/>
```

### MessageLog

View delivery history and message status.

```tsx
<MessageLog
  endpointId="wh_ep_xxx"               // Filter by endpoint (optional)
  status="failed"                      // Filter by status (optional)
  limit={50}                           // Messages per page
  refreshInterval={30000}              // Auto-refresh in ms (0 to disable)
  onMessageClick={(message) => {}}     // Click handler
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
  const { messages, total } = useMessages({ limit: 25 });

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
}
```

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
