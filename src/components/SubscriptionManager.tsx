import { useState } from 'react';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useEventTypes } from '../hooks/useEventTypes';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Switch } from './ui/Switch';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { Skeleton } from './ui/Skeleton';
import type { EventType } from '../types';
import { cn } from '../utils/cn';

export interface SubscriptionManagerProps {
  /**
   * Endpoint ID to manage subscriptions for
   */
  endpointId: string;
  /**
   * Display variant
   * @default 'full'
   */
  variant?: 'full' | 'compact';
  /**
   * Callback when subscriptions change
   */
  onChange?: (subscribedEventTypeIds: string[]) => void;
  /**
   * Additional class name
   */
  className?: string;
}

function SubscriptionRow({
  eventType,
  isSubscribed,
  isToggling,
  onToggle,
}: {
  eventType: EventType;
  isSubscribed: boolean;
  isToggling: boolean;
  onToggle: () => void;
}) {
  let examplePreview: string | null = null;
  if (eventType.examplePayload) {
    try {
      examplePreview = JSON.stringify(JSON.parse(eventType.examplePayload), null, 2);
    } catch {
      examplePreview = eventType.examplePayload;
    }
  }

  return (
    <div className="hkb-subscription-row" title={examplePreview ? `Example:\n${examplePreview}` : undefined}>
      <div className="hkb-subscription-info">
        <code className="hkb-subscription-name">{eventType.name}</code>
        {eventType.description && (
          <p className="hkb-subscription-description">{eventType.description}</p>
        )}
      </div>
      <Switch
        checked={isSubscribed}
        onChange={onToggle}
        disabled={isToggling}
        aria-label={`Toggle ${eventType.name} subscription`}
      />
    </div>
  );
}

function SubscriptionManagerSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton height={24} width={150} />
      </CardHeader>
      <CardContent>
        <Skeleton height={40} className="hkb-mb-4" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="hkb-subscription-row">
            <div className="hkb-subscription-info">
              <Skeleton height={16} width="40%" />
              <Skeleton height={14} width="60%" className="hkb-mt-1" />
            </div>
            <Skeleton height={24} width={44} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SubscriptionManager({
  endpointId,
  variant = 'full',
  onChange,
  className,
}: SubscriptionManagerProps) {
  const {
    subscriptions,
    subscribedEventTypeIds,
    toggleSubscription,
    isCreating,
    isDeleting,
  } = useSubscriptions(endpointId);

  const { eventTypes, groupedByCategory, categories, isLoading: isLoadingTypes } =
    useEventTypes();

  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const isLoading = isLoadingTypes;
  const isToggling = isCreating || isDeleting;

  const handleToggle = async (eventType: EventType) => {
    setTogglingId(eventType.id);
    try {
      await toggleSubscription(eventType.id, endpointId);
      // Get updated list for callback
      const newSubscribed = subscribedEventTypeIds.has(eventType.id)
        ? [...subscribedEventTypeIds].filter((id) => id !== eventType.id)
        : [...subscribedEventTypeIds, eventType.id];
      onChange?.(newSubscribed);
    } finally {
      setTogglingId(null);
    }
  };

  if (isLoading) {
    return <SubscriptionManagerSkeleton />;
  }

  // Filter event types by search
  const filteredEventTypes = searchQuery.trim()
    ? eventTypes.filter(
        (et) =>
          et.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          et.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : eventTypes;

  // For compact variant, show flat list
  if (variant === 'compact') {
    return (
      <div className={cn('hkb-subscription-manager hkb-subscription-manager--compact', className)}>
        <div className="hkb-subscription-search">
          <Input
            type="search"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="hkb-subscription-summary">
          <Badge>{subscribedEventTypeIds.size} subscribed</Badge>
        </div>

        <div className="hkb-subscription-list">
          {filteredEventTypes.map((eventType) => (
            <SubscriptionRow
              key={eventType.id}
              eventType={eventType}
              isSubscribed={subscribedEventTypeIds.has(eventType.id)}
              isToggling={togglingId === eventType.id}
              onToggle={() => handleToggle(eventType)}
            />
          ))}
        </div>
      </div>
    );
  }

  // Full variant with categories
  return (
    <Card className={cn('hkb-subscription-manager', className)}>
      <CardHeader>
        <CardTitle>Event Subscriptions</CardTitle>
        <Badge>{subscribedEventTypeIds.size} subscribed</Badge>
      </CardHeader>

      <CardContent>
        <div className="hkb-subscription-search">
          <Input
            type="search"
            placeholder="Search event types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {searchQuery.trim() ? (
          // Flat list when searching
          <div className="hkb-subscription-list">
            {filteredEventTypes.length === 0 ? (
              <p className="hkb-text-muted">No matching event types</p>
            ) : (
              filteredEventTypes.map((eventType) => (
                <SubscriptionRow
                  key={eventType.id}
                  eventType={eventType}
                  isSubscribed={subscribedEventTypeIds.has(eventType.id)}
                  isToggling={togglingId === eventType.id}
                  onToggle={() => handleToggle(eventType)}
                />
              ))
            )}
          </div>
        ) : (
          // Categorized list
          categories.map((category) => (
            <div key={category} className="hkb-subscription-category">
              <h4 className="hkb-subscription-category-title">{category}</h4>
              <div className="hkb-subscription-list">
                {groupedByCategory[category].map((eventType) => (
                  <SubscriptionRow
                    key={eventType.id}
                    eventType={eventType}
                    isSubscribed={subscribedEventTypeIds.has(eventType.id)}
                    isToggling={togglingId === eventType.id}
                    onToggle={() => handleToggle(eventType)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
