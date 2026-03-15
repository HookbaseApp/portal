import React, { useState, useMemo } from 'react';
import { useEventTypes } from '../hooks/useEventTypes';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Skeleton } from './ui/Skeleton';
import type { EventType } from '../types';
import { cn } from '../utils/cn';

export interface EventTypeListProps {
  /**
   * Callback when an event type is selected
   */
  onEventTypeClick?: (eventType: EventType) => void;
  /**
   * Event type IDs that are currently selected/subscribed
   */
  selectedIds?: Set<string>;
  /**
   * Whether to show search input
   * @default true
   */
  showSearch?: boolean;
  /**
   * Additional class name
   */
  className?: string;
}

function EventTypeCard({
  eventType,
  isSelected,
  onClick,
}: {
  eventType: EventType;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasExtra = eventType.examplePayload || eventType.documentationUrl;

  const handleToggle = (e: React.MouseEvent) => {
    if (hasExtra) {
      e.stopPropagation();
      setExpanded(!expanded);
    }
  };

  let parsedExample: string | null = null;
  if (eventType.examplePayload) {
    try {
      parsedExample = JSON.stringify(JSON.parse(eventType.examplePayload), null, 2);
    } catch {
      parsedExample = eventType.examplePayload;
    }
  }

  return (
    <div
      className={cn(
        'hkb-event-type-item',
        isSelected && 'hkb-event-type-item--selected',
        onClick && 'hkb-event-type-item--clickable'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="hkb-event-type-header">
        <div className="hkb-event-type-header-left">
          <code className="hkb-event-type-name">{eventType.name}</code>
          {hasExtra && (
            <button
              className="hkb-event-type-expand-btn"
              onClick={handleToggle}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? '▼' : '▶'}
            </button>
          )}
        </div>
        <div className="hkb-event-type-header-right">
          {isSelected && <Badge variant="success">Subscribed</Badge>}
          {eventType.documentationUrl && (
            <a
              href={eventType.documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hkb-event-type-doc-link"
              onClick={(e) => e.stopPropagation()}
            >
              Docs
            </a>
          )}
        </div>
      </div>
      {(eventType.displayName || eventType.description) && (
        <div className="hkb-event-type-details">
          {eventType.displayName && (
            <span className="hkb-event-type-display-name">
              {eventType.displayName}
            </span>
          )}
          {eventType.description && (
            <p className="hkb-event-type-description">{eventType.description}</p>
          )}
        </div>
      )}
      {expanded && parsedExample && (
        <div className="hkb-event-type-example">
          <h5 className="hkb-event-type-example-title">Example Payload</h5>
          <pre className="hkb-event-type-example-code">
            <code>{parsedExample}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

function EventTypeListSkeleton() {
  return (
    <div className="hkb-event-type-list">
      <Skeleton height={40} className="hkb-mb-4" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="hkb-event-type-category">
          <Skeleton height={20} width={100} className="hkb-mb-2" />
          {[1, 2].map((j) => (
            <div key={j} className="hkb-event-type-item">
              <Skeleton height={16} width="40%" />
              <Skeleton height={14} width="70%" className="hkb-mt-1" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function EventTypeList({
  onEventTypeClick,
  selectedIds,
  showSearch = true,
  className,
}: EventTypeListProps) {
  const { eventTypes, groupedByCategory, categories, isLoading, isError, error } =
    useEventTypes();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter event types by search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return { categories, groupedByCategory };
    }

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, EventType[]> = {};

    for (const [category, types] of Object.entries(groupedByCategory)) {
      const matchingTypes = types.filter(
        (et) =>
          et.name.toLowerCase().includes(query) ||
          et.displayName?.toLowerCase().includes(query) ||
          et.description?.toLowerCase().includes(query)
      );

      if (matchingTypes.length > 0) {
        filtered[category] = matchingTypes;
      }
    }

    return {
      categories: Object.keys(filtered).sort(),
      groupedByCategory: filtered,
    };
  }, [searchQuery, categories, groupedByCategory]);

  if (isLoading) {
    return <EventTypeListSkeleton />;
  }

  if (isError) {
    return (
      <div className="hkb-error">
        <p>Failed to load event types</p>
        <p className="hkb-error-message">{error?.message}</p>
      </div>
    );
  }

  if (eventTypes.length === 0) {
    return (
      <div className="hkb-empty-state">
        <p>No event types available</p>
      </div>
    );
  }

  return (
    <div className={cn('hkb-event-type-list', className)}>
      {showSearch && (
        <div className="hkb-event-type-search">
          <Input
            type="search"
            placeholder="Search event types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {filteredCategories.categories.length === 0 ? (
        <div className="hkb-empty-state hkb-empty-state--small">
          <p>No event types match your search</p>
        </div>
      ) : (
        filteredCategories.categories.map((category) => (
          <div key={category} className="hkb-event-type-category">
            <h4 className="hkb-event-type-category-title">{category}</h4>
            <div className="hkb-event-type-category-items">
              {filteredCategories.groupedByCategory[category].map((eventType) => (
                <EventTypeCard
                  key={eventType.id}
                  eventType={eventType}
                  isSelected={selectedIds?.has(eventType.id)}
                  onClick={
                    onEventTypeClick
                      ? () => onEventTypeClick(eventType)
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
