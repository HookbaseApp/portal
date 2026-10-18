import { useEffect, useState } from 'react';
import { useMessages, useMessageAttempts, type UseMessagesOptions } from '../hooks/useMessages';
import { useReplay } from '../hooks/useReplay';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Skeleton } from './ui/Skeleton';
import type { MessageStatus, OutboundMessage } from '../types';
import { cn } from '../utils/cn';
import { useTranslation, type TranslationValue } from '../context/I18nContext';
import type { PortalMessageKey } from '../i18n';

export interface MessageLogProps {
  /**
   * Filter by endpoint ID
   */
  endpointId?: string;
  /**
   * Filter by status
   */
  status?: MessageStatus;
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
   * Show an "Attempts" toggle on each message that lists its delivery attempts
   * @default true
   */
  showAttempts?: boolean;
  /**
   * Additional class name
   */
  className?: string;
}

function getStatusBadgeVariant(status: MessageStatus) {
  switch (status) {
    case 'success':
      return 'success';
    case 'failed':
    case 'exhausted':
    case 'dlq':
      return 'destructive';
    case 'pending':
    case 'processing':
    case 'awaiting_retry':
      return 'warning';
    default:
      return 'default';
  }
}

const STATUS_KEYS: Record<string, PortalMessageKey> = {
  success: 'messages.status.success',
  failed: 'messages.status.failed',
  awaiting_retry: 'messages.status.awaiting_retry',
  exhausted: 'messages.status.exhausted',
  dlq: 'messages.status.dlq',
  pending: 'messages.status.pending',
  processing: 'messages.status.processing',
};

function formatStatus(status: string, t: TranslationValue['t']) {
  const key = STATUS_KEYS[status];
  return key ? t(key) : status;
}

/**
 * Whether the replay route will accept the message. The API says so per message; the fallback (for
 * API versions without `replayable`) is its rule minus the "failed and untouched for an hour" case.
 */
function canReplay(message: OutboundMessage) {
  if (typeof message.replayable === 'boolean') return message.replayable;
  return message.status === 'exhausted' || message.status === 'dlq';
}

/** Host of the endpoint URL; the URL is null once the endpoint has been deleted. */
function endpointLabel(url: string | null | undefined, t: TranslationValue['t']) {
  if (!url) return t('messages.deletedEndpoint');
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function MessageAttempts({ messageId }: { messageId: string }) {
  const { data: attempts, isLoading, isError, error } = useMessageAttempts(messageId);
  const { t, formatDate } = useTranslation();

  if (isLoading) {
    return <Skeleton height={14} width={160} />;
  }
  if (isError) {
    return <p className="hkb-error-message">{error?.message ?? t('messages.attemptsLoadFailed')}</p>;
  }
  if (!attempts || attempts.length === 0) {
    return <p className="hkb-text-muted">{t('messages.noAttempts')}</p>;
  }
  return (
    <ol className="hkb-message-attempts">
      {attempts.map((attempt) => (
        <li key={attempt.id} className="hkb-message-attempt">
          <span className="hkb-message-attempt-number">#{attempt.attemptNumber}</span>
          <Badge variant={attempt.status === 'success' ? 'success' : attempt.status === 'failed' ? 'destructive' : 'default'}>
            {formatStatus(attempt.status, t)}
          </Badge>
          {attempt.responseStatus != null && <span>HTTP {attempt.responseStatus}</span>}
          {attempt.responseTimeMs != null && <span>{attempt.responseTimeMs}ms</span>}
          {attempt.errorMessage && <span className="hkb-message-attempt-error">{attempt.errorMessage}</span>}
          <span className="hkb-message-time-absolute">{formatDate(attempt.createdAt)}</span>
        </li>
      ))}
    </ol>
  );
}

function MessageRow({
  message,
  onClick,
  onRetryClick,
  isRetrying,
  showAttempts,
}: {
  message: OutboundMessage;
  onClick?: () => void;
  onRetryClick?: (message: OutboundMessage) => void;
  isRetrying?: boolean;
  showAttempts?: boolean;
}) {
  const canRetry = canReplay(message);
  const [attemptsOpen, setAttemptsOpen] = useState(false);
  const { t, formatDate, formatRelative } = useTranslation();

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
            {formatStatus(message.status, t)}
          </Badge>
        </div>
        <div className="hkb-message-meta">
          <span className="hkb-message-endpoint" title={message.endpointUrl ?? undefined}>
            {endpointLabel(message.endpointUrl, t)}
          </span>
          <span className="hkb-message-separator">•</span>
          <span className="hkb-message-attempts">
            {t(message.attempts === 1 ? 'messages.attemptCountOne' : 'messages.attemptCountOther', { count: message.attempts })}
          </span>
          {message.status === 'awaiting_retry' && message.nextAttemptAt && (
            <>
              <span className="hkb-message-separator">•</span>
              <span className="hkb-message-next-attempt">
                {t('messages.nextRetry', { date: formatDate(message.nextAttemptAt) })}
              </span>
            </>
          )}
        </div>
        {message.lastErrorMessage && message.status !== 'success' && (
          <p className="hkb-message-error">{message.lastErrorMessage}</p>
        )}
        {attemptsOpen && (
          <div className="hkb-message-attempts-panel" onClick={(e) => e.stopPropagation()}>
            <MessageAttempts messageId={message.id} />
          </div>
        )}
      </div>
      <div className="hkb-message-actions">
        {showAttempts && message.attempts > 0 && (
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={attemptsOpen}
            onClick={(e) => {
              e.stopPropagation();
              setAttemptsOpen((open) => !open);
            }}
          >
            {attemptsOpen ? t('messages.hideAttempts') : t('messages.attempts')}
          </Button>
        )}
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
            {isRetrying ? t('messages.retrying') : t('common.retry')}
          </Button>
        )}
        <div className="hkb-message-time">
          <span className="hkb-message-time-relative">
            {formatRelative(message.createdAt)}
          </span>
          <span className="hkb-message-time-absolute">
            {formatDate(message.createdAt)}
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
  showAttempts = true,
  className,
}: MessageLogProps) {
  // Cursor of each page visited so far; the last one is the page shown (undefined = first page).
  // The API pages by opaque cursor, so "Previous" goes back through the ones already seen.
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const [replayingMessageId, setReplayingMessageId] = useState<string | null>(null);
  const { replayMessage, replayError } = useReplay();
  const { t } = useTranslation();

  // A new filter starts again from the first page.
  useEffect(() => {
    setCursors([undefined]);
  }, [endpointId, status, limit]);

  const cursor = cursors[cursors.length - 1];
  const page = cursors.length;

  const queryOptions: UseMessagesOptions = {
    endpointId,
    status,
    limit,
    cursor,
    refreshInterval,
  };

  const { messages, hasMore, nextCursor, isLoading, isError, error, isFetching, refetch } =
    useMessages(queryOptions);

  const hasPrevious = page > 1;

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
          <CardTitle>{t('messages.title')}</CardTitle>
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
          <CardTitle>{t('messages.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hkb-error">
            <p>{t('messages.loadFailed')}</p>
            <p className="hkb-error-message">{error?.message}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t('common.retry')}
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
          <CardTitle>{t('messages.title')}</CardTitle>
          <div className="hkb-message-log-actions">
            {refreshInterval > 0 && (
              <Badge variant="outline">
                {isFetching ? t('messages.updating') : t('messages.autoRefresh')}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              {t('common.refresh')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {replayError && (
          <p className="hkb-form-error" role="alert">
            {replayError.message}
          </p>
        )}
        {messages.length === 0 ? (
          <div className="hkb-empty-state hkb-empty-state--small">
            <p>{t('messages.empty')}</p>
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
                  showAttempts={showAttempts}
                />
              ))}
            </div>

            {(hasPrevious || hasMore) && (
              <div className="hkb-message-pagination">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCursors((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))}
                  disabled={!hasPrevious || isFetching}
                >
                  {t('common.previous')}
                </Button>
                <span className="hkb-pagination-info">{t('messages.page', { page })}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (nextCursor) setCursors((prev) => [...prev, nextCursor]);
                  }}
                  disabled={!hasMore || !nextCursor || isFetching}
                >
                  {t('common.next')}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
