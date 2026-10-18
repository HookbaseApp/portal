import { type ReactNode, useState } from 'react';
import { useEndpoints } from '../hooks/useEndpoints';
import { useTestEndpoint } from '../hooks/useTestEndpoint';
import { useReplay } from '../hooks/useReplay';
import { useHookbase } from '../hooks/useHookbase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Skeleton } from './ui/Skeleton';
import type { Endpoint, TestDeliveryResult } from '../types';
import { cn } from '../utils/cn';
import { useTranslation, type TranslationValue } from '../context/I18nContext';

export interface EndpointListProps {
  /**
   * Whether to show action buttons (edit, delete)
   * @default true
   */
  showActions?: boolean;
  /**
   * Custom empty state to render when no endpoints exist
   */
  emptyState?: ReactNode;
  /**
   * Callback when an endpoint is clicked
   */
  onEndpointClick?: (endpoint: Endpoint) => void;
  /**
   * Callback when edit is clicked
   */
  onEditClick?: (endpoint: Endpoint) => void;
  /**
   * Callback when delete is clicked
   */
  onDeleteClick?: (endpoint: Endpoint) => void;
  /**
   * Additional class name
   */
  className?: string;
}

function getCircuitBadgeVariant(state: Endpoint['circuitState']) {
  switch (state) {
    case 'closed':
      return 'success';
    case 'open':
      return 'destructive';
    case 'half_open':
      return 'warning';
    default:
      return 'default';
  }
}

function formatCircuitState(state: Endpoint['circuitState'], t: TranslationValue['t']) {
  switch (state) {
    case 'closed':
      return t('endpoint.circuit.closed');
    case 'open':
      return t('endpoint.circuit.open');
    case 'half_open':
      return t('endpoint.circuit.halfOpen');
    default:
      return state;
  }
}

function TestResultInline({ result }: { result: TestDeliveryResult }) {
  const { t } = useTranslation();
  return (
    <div className={cn('hkb-test-result', result.success ? 'hkb-test-result--success' : 'hkb-test-result--failure')}>
      <div className="hkb-test-result-header">
        <Badge variant={result.success ? 'success' : 'destructive'}>
          {result.success ? t('endpoint.test.success') : t('endpoint.test.failed')}
        </Badge>
        <span className="hkb-test-result-meta">
          {result.delivery.responseStatus > 0 && `${result.delivery.responseStatus} · `}
          {result.delivery.responseTimeMs}ms
        </span>
      </div>
      {result.delivery.errorMessage && (
        <p className="hkb-test-result-error">{result.delivery.errorMessage}</p>
      )}
    </div>
  );
}

/** The outcome of the last verify / test / replay action on an endpoint, shown on its card. */
interface EndpointNotice {
  kind: 'success' | 'error';
  text: string;
}

function EndpointCard({
  endpoint,
  notice,
  showActions,
  onEndpointClick,
  onEditClick,
  onDeleteClick,
  onTestClick,
  testResult,
  isTesting,
  onVerifyClick,
  isVerifying,
  onRetryAllClick,
  isRetrying,
}: {
  endpoint: Endpoint;
  notice?: EndpointNotice | null;
  showActions: boolean;
  onEndpointClick?: (endpoint: Endpoint) => void;
  onEditClick?: (endpoint: Endpoint) => void;
  onDeleteClick?: (endpoint: Endpoint) => void;
  onTestClick?: (endpoint: Endpoint) => void;
  testResult?: TestDeliveryResult | null;
  isTesting?: boolean;
  onVerifyClick?: (endpoint: Endpoint) => void;
  isVerifying?: boolean;
  onRetryAllClick?: (endpoint: Endpoint, options?: { since?: string; includeUnattempted?: boolean }) => void;
  isRetrying?: boolean;
}) {
  const successRate =
    endpoint.totalMessages > 0
      ? Math.round((endpoint.totalSuccesses / endpoint.totalMessages) * 100)
      : 100;
  const { t, formatNumber } = useTranslation();
  const [showRecoverPanel, setShowRecoverPanel] = useState(false);
  const [recoverSince, setRecoverSince] = useState('');
  const [recoverIncludeUnattempted, setRecoverIncludeUnattempted] = useState(false);

  return (
    <Card
      className={cn(
        'hkb-endpoint-card',
        onEndpointClick && 'hkb-endpoint-card--clickable'
      )}
      onClick={() => onEndpointClick?.(endpoint)}
    >
      <CardContent className="hkb-endpoint-card-content">
        <div className="hkb-endpoint-card-main">
          <div className="hkb-endpoint-card-header">
            <code className="hkb-endpoint-url">{endpoint.url}</code>
            <div className="hkb-endpoint-badges">
              {endpoint.isDisabled && (
                <Badge variant="outline">{t('endpoint.disabled')}</Badge>
              )}
              <Badge variant={getCircuitBadgeVariant(endpoint.circuitState)}>
                {formatCircuitState(endpoint.circuitState, t)}
              </Badge>
              {endpoint.isVerified ? (
                <Badge variant="success">{t('endpoint.verified')}</Badge>
              ) : (
                <Badge variant="outline">{t('endpoint.unverified')}</Badge>
              )}
            </div>
          </div>

          {endpoint.description && (
            <p className="hkb-endpoint-description">{endpoint.description}</p>
          )}

          <div className="hkb-endpoint-stats">
            <span className="hkb-stat">
              <span className="hkb-stat-value">{formatNumber(endpoint.totalMessages)}</span>
              <span className="hkb-stat-label">{t('endpoint.stats.messages')}</span>
            </span>
            <span className="hkb-stat">
              <span className="hkb-stat-value">{successRate}%</span>
              <span className="hkb-stat-label">{t('endpoint.stats.success')}</span>
            </span>
            <span className="hkb-stat">
              <span className="hkb-stat-value">{formatNumber(endpoint.totalFailures)}</span>
              <span className="hkb-stat-label">{t('endpoint.stats.failed')}</span>
            </span>
          </div>

          {testResult && <TestResultInline result={testResult} />}
          {notice && (
            <p
              className={notice.kind === 'error' ? 'hkb-form-error' : 'hkb-text-muted'}
              role={notice.kind === 'error' ? 'alert' : 'status'}
            >
              {notice.text}
            </p>
          )}
        </div>

        {showActions && (
          <div className="hkb-endpoint-actions">
            {onTestClick && (
              <Button
                variant="outline"
                size="sm"
                disabled={isTesting || endpoint.isDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onTestClick(endpoint);
                }}
              >
                {isTesting ? t('endpoint.sending') : t('endpoint.sendTest')}
              </Button>
            )}
            {onVerifyClick && !endpoint.isVerified && (
              <Button
                variant="outline"
                size="sm"
                disabled={isVerifying || endpoint.isDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onVerifyClick(endpoint);
                }}
              >
                {isVerifying ? t('endpoint.verifying') : t('endpoint.verify')}
              </Button>
            )}
            {onRetryAllClick && endpoint.totalFailures > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isRetrying}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetryAllClick(endpoint);
                  }}
                >
                  {isRetrying ? t('endpoint.retrying') : t('endpoint.retryAllFailed')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isRetrying}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRecoverPanel((v) => !v);
                  }}
                >
                  {t('endpoint.recoverSince')}
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick?.(endpoint);
              }}
            >
              {t('common.edit')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick?.(endpoint);
              }}
            >
              {t('common.delete')}
            </Button>
          </div>
        )}

        {showRecoverPanel && (
          <div className="hkb-recover-panel" onClick={(e) => e.stopPropagation()}>
            <label className="hkb-recover-panel-field">
              <span>{t('endpoint.recover.label')}</span>
              <input
                type="datetime-local"
                className="hkb-input"
                value={recoverSince}
                onChange={(e) => setRecoverSince(e.target.value)}
              />
            </label>
            <label className="hkb-recover-panel-checkbox">
              <input
                type="checkbox"
                checked={recoverIncludeUnattempted}
                onChange={(e) => setRecoverIncludeUnattempted(e.target.checked)}
              />
              <span>{t('endpoint.recover.includeUnattempted')}</span>
            </label>
            <div className="hkb-recover-panel-actions">
              <Button
                variant="outline"
                size="sm"
                disabled={isRetrying || !recoverSince}
                onClick={() => {
                  onRetryAllClick?.(endpoint, {
                    since: new Date(recoverSince).toISOString(),
                    includeUnattempted: recoverIncludeUnattempted,
                  });
                  setShowRecoverPanel(false);
                }}
              >
                {isRetrying ? t('endpoint.recover.submitting') : t('endpoint.recover.submit')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowRecoverPanel(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EndpointListSkeleton() {
  return (
    <div className="hkb-endpoint-list">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="hkb-endpoint-card">
          <CardContent className="hkb-endpoint-card-content">
            <div className="hkb-endpoint-card-main">
              <Skeleton height={20} width="60%" />
              <Skeleton height={16} width="80%" className="hkb-mt-2" />
              <div className="hkb-endpoint-stats hkb-mt-4">
                <Skeleton height={32} width={60} />
                <Skeleton height={32} width={60} />
                <Skeleton height={32} width={60} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DefaultEmptyState() {
  const { t } = useTranslation();
  return (
    <div className="hkb-empty-state">
      <div className="hkb-empty-state-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </div>
      <h3 className="hkb-empty-state-title">{t('endpoint.empty.title')}</h3>
      <p className="hkb-empty-state-description">
        {t('endpoint.empty.description')}
      </p>
    </div>
  );
}

export function EndpointList({
  showActions = true,
  emptyState,
  onEndpointClick,
  onEditClick,
  onDeleteClick,
  className,
}: EndpointListProps) {
  const { endpoints, isLoading, isError, error, refetch } = useEndpoints();
  const { testEndpoint, clearResult } = useTestEndpoint();
  const { replayFailedForEndpoint } = useReplay();
  const { api } = useHookbase();
  const { t } = useTranslation();
  const [testingEndpointId, setTestingEndpointId] = useState<string | null>(null);
  const [verifyingEndpointId, setVerifyingEndpointId] = useState<string | null>(null);
  const [retryingEndpointId, setRetryingEndpointId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestDeliveryResult>>({});
  const [notices, setNotices] = useState<Record<string, EndpointNotice | null>>({});

  const setNotice = (endpointId: string, notice: EndpointNotice | null) =>
    setNotices((prev) => ({ ...prev, [endpointId]: notice }));
  const errorText = (err: unknown, fallback: string) =>
    err instanceof Error && err.message ? err.message : fallback;

  const handleTest = async (endpoint: Endpoint) => {
    setTestingEndpointId(endpoint.id);
    setNotice(endpoint.id, null);
    clearResult();
    try {
      const result = await testEndpoint(endpoint.id);
      setTestResults(prev => ({ ...prev, [endpoint.id]: result }));
    } catch (err) {
      setNotice(endpoint.id, { kind: 'error', text: errorText(err, t('endpoint.notice.testFailed')) });
    } finally {
      setTestingEndpointId(null);
    }
  };

  const handleVerify = async (endpoint: Endpoint) => {
    setVerifyingEndpointId(endpoint.id);
    setNotice(endpoint.id, null);
    try {
      // A failed verification is a 200 with verified: false and the reason in error.
      const { data } = await api.verifyEndpoint(endpoint.id);
      setNotice(endpoint.id, data.verified
        ? { kind: 'success', text: t('endpoint.notice.verified') }
        : { kind: 'error', text: t('endpoint.notice.verifyFailedReason', { reason: data.error ?? t('endpoint.notice.unknownError') }) });
      if (data.verified) refetch();
    } catch (err) {
      setNotice(endpoint.id, { kind: 'error', text: errorText(err, t('endpoint.notice.verifyFailed')) });
    } finally {
      setVerifyingEndpointId(null);
    }
  };

  const handleRetryAll = async (
    endpoint: Endpoint,
    options?: { since?: string; includeUnattempted?: boolean }
  ) => {
    setRetryingEndpointId(endpoint.id);
    setNotice(endpoint.id, null);
    try {
      const result = await replayFailedForEndpoint(endpoint.id, options);
      setNotice(endpoint.id, {
        kind: 'success',
        text: result.replayed === 0
          ? t('endpoint.notice.nothingToReplay')
          : t(result.replayed === 1 ? 'endpoint.notice.replayingOne' : 'endpoint.notice.replayingOther', { count: result.replayed }),
      });
      refetch();
    } catch (err) {
      setNotice(endpoint.id, { kind: 'error', text: errorText(err, t('endpoint.notice.replayFailed')) });
    } finally {
      setRetryingEndpointId(null);
    }
  };

  if (isLoading) {
    return <EndpointListSkeleton />;
  }

  if (isError) {
    return (
      <div className="hkb-error">
        <p>{t('endpoint.loadFailed')}</p>
        <p className="hkb-error-message">{error?.message}</p>
      </div>
    );
  }

  if (endpoints.length === 0) {
    return <>{emptyState ?? <DefaultEmptyState />}</>;
  }

  return (
    <div className={cn('hkb-endpoint-list', className)}>
      {endpoints.map((endpoint) => (
        <EndpointCard
          key={endpoint.id}
          endpoint={endpoint}
          notice={notices[endpoint.id] ?? null}
          showActions={showActions}
          onEndpointClick={onEndpointClick}
          onEditClick={onEditClick}
          onDeleteClick={onDeleteClick}
          onTestClick={handleTest}
          testResult={testResults[endpoint.id] || null}
          isTesting={testingEndpointId === endpoint.id}
          onVerifyClick={handleVerify}
          isVerifying={verifyingEndpointId === endpoint.id}
          onRetryAllClick={handleRetryAll}
          isRetrying={retryingEndpointId === endpoint.id}
        />
      ))}
    </div>
  );
}
