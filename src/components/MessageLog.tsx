import { useState } from 'react';
import { useMessages, type UseMessagesOptions } from '../hooks/useMessages';
import { useReplay } from '../hooks/useReplay';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Skeleton } from './ui/Skeleton';
import type { OutboundMessage } from '../types';
import { cn } from '../utils/cn';

export interface MessageLogProps {
  /**
   * Filter by endpoint ID
   */
  endpointId?: string;
  /**
   * Filter by status
   */
  status?: 'pending' | 'success' | 'failed' | 'exhausted';
  /**
   * Number of messages to show
   * @default 25
   */
  limit?: number;
  /**
   * Auto-refresh interval in milliseconds (0 to disable)
   * @default 0
   */
  refreshInterval?: number;
  /**
   * Callback when a message is clicked
   */
  onMessageClick?: (message: OutboundMessage) => void;
  /**
   * Additional class name
   */
  className?: string;
}

function getStatusBadgeVariant(status: OutboundMessage['status']) {
  switch (status) {
    case 'success':
      return 'success';
    case 'failed':
    case 'exhausted':
      return 'destructive';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
}

function formatStatus(status: OutboundMessage['status']) {
  switch (status) {
    case 'success':
      return 'Delivered';
    case 'failed':
      return 'Failed';
    case 'exhausted':
      return 'Exhausted';
    case 'pending':
      return 'Pending';
    default:
      return status;
  }
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function formatRelativeTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

function MessageRow({
  message,
  onClick,
  onRetryClick,
  isRetrying,
}: {
  message: OutboundMessage;
  onClick?: () => void;
  onRetryClick?: (message: OutboundMessage) => void;
  isRetrying?: boolean;
}) {
  const canRetry = ['failed', 'exhausted'].includes(message.status);

  return (
    <div
      className={cn('hkb-message-row', onClick && 'hkb-message-row--clickable')}
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
      <div className="hkb-message-main">
        <div className="hkb-message-header">
          <code className="hkb-message-event-type">{message.eventType}</code>
          <Badge variant={getStatusBadgeVariant(message.status)}>
            {formatStatus(message.status)}
          </Badge>
        </div>
        <div className="hkb-message-meta">
          <span className="hkb-message-endpoint" title={message.endpointUrl}>
            {new URL(message.endpointUrl).hostname}
          </span>
          <span className="hkb-message-separator">•</span>
          <span className="hkb-message-attempts">
            {message.attempts} attempt{message.attempts !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="hkb-message-actions">
        {canRetry && onRetryClick && (
          <Button
            variant="outline"
            size="sm"
            disabled={isRetrying}
            onClick={(e) => {
              e.stopPropagation();
              onRetryClick(message);
            }}
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
        )}
        <div className="hkb-message-time">
          <span className="hkb-message-time-relative">
            {formatRelativeTime(message.createdAt)}
          </span>
          <span className="hkb-message-time-absolute">
            {formatTimestamp(message.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

function MessageLogSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="hkb-message-log">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="hkb-message-row">
          <div className="hkb-message-main">
            <div className="hkb-message-header">
              <Skeleton height={16} width={120} />
              <Skeleton height={20} width={60} />
            </div>
            <div className="hkb-message-meta">
              <Skeleton height={14} width={100} />
            </div>
          </div>
          <Skeleton height={14} width={60} />
        </div>
      ))}
    </div>
  );
}

export function MessageLog({
  endpointId,
  status,
  limit = 25,
  refreshInterval = 0,
  onMessageClick,
  className,
}: MessageLogProps) {
  const [offset, setOffset] = useState(0);
  const [replayingMessageId, setReplayingMessageId] = useState<string | null>(null);
  const { replayMessage, isReplaying } = useReplay();

  const queryOptions: UseMessagesOptions = {
    endpointId,
    status,
    limit,
    offset,
    refreshInterval,
  };

  const { messages, total, isLoading, isError, error, isFetching, refetch } =
    useMessages(queryOptions);

  const hasMore = offset + limit < total;
  const hasPrevious = offset > 0;

  const handleRetry = async (message: OutboundMessage) => {
    setReplayingMessageId(message.id);
    try {
      await replayMessage(message.id);
      refetch();
    } catch {
      // Error handled by hook
    } finally {
      setReplayingMessageId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className={cn('hkb-message-log-card', className)}>
        <CardHeader>
          <CardTitle>Delivery History</CardTitle>
        </CardHeader>
        <CardContent>
          <MessageLogSkeleton count={limit} />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className={cn('hkb-message-log-card', className)}>
        <CardHeader>
          <CardTitle>Delivery History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hkb-error">
            <p>Failed to load messages</p>
            <p className="hkb-error-message">{error?.message}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('hkb-message-log-card', className)}>
      <CardHeader>
        <div className="hkb-message-log-header">
          <CardTitle>Delivery History</CardTitle>
          <div className="hkb-message-log-actions">
            {refreshInterval > 0 && (
              <Badge variant="outline">
                {isFetching ? 'Updating...' : 'Auto-refresh'}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </div>
        <div className="hkb-message-log-summary">
          <span>{total} total messages</span>
        </div>
      </CardHeader>

      <CardContent>
        {messages.length === 0 ? (
          <div className="hkb-empty-state hkb-empty-state--small">
            <p>No messages found</p>
          </div>
        ) : (
          <>
            <div className="hkb-message-list">
              {messages.map((message) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  onClick={
                    onMessageClick ? () => onMessageClick(message) : undefined
                  }
                  onRetryClick={handleRetry}
                  isRetrying={replayingMessageId === message.id}
                />
              ))}
            </div>

            {(hasPrevious || hasMore) && (
              <div className="hkb-message-pagination">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={!hasPrevious}
                >
                  Previous
                </Button>
                <span className="hkb-pagination-info">
                  {offset + 1}-{Math.min(offset + limit, total)} of {total}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(offset + limit)}
                  disabled={!hasMore}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
