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

function formatCircuitState(state: Endpoint['circuitState']) {
  switch (state) {
    case 'closed':
      return 'Healthy';
    case 'open':
      return 'Circuit Open';
    case 'half_open':
      return 'Recovering';
    default:
      return state;
  }
}

function TestResultInline({ result }: { result: TestDeliveryResult }) {
  return (
    <div className={cn('hkb-test-result', result.success ? 'hkb-test-result--success' : 'hkb-test-result--failure')}>
      <div className="hkb-test-result-header">
        <Badge variant={result.success ? 'success' : 'destructive'}>
          {result.success ? 'Success' : 'Failed'}
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

function EndpointCard({
  endpoint,
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
  showActions: boolean;
  onEndpointClick?: (endpoint: Endpoint) => void;
  onEditClick?: (endpoint: Endpoint) => void;
  onDeleteClick?: (endpoint: Endpoint) => void;
  onTestClick?: (endpoint: Endpoint) => void;
  testResult?: TestDeliveryResult | null;
  isTesting?: boolean;
  onVerifyClick?: (endpoint: Endpoint) => void;
  isVerifying?: boolean;
  onRetryAllClick?: (endpoint: Endpoint) => void;
  isRetrying?: boolean;
}) {
  const successRate =
    endpoint.totalMessages > 0
      ? Math.round((endpoint.totalSuccesses / endpoint.totalMessages) * 100)
      : 100;

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
                <Badge variant="outline">Disabled</Badge>
              )}
              <Badge variant={getCircuitBadgeVariant(endpoint.circuitState)}>
                {formatCircuitState(endpoint.circuitState)}
              </Badge>
              {endpoint.isVerified ? (
                <Badge variant="success">Verified</Badge>
              ) : (
                <Badge variant="outline">Unverified</Badge>
              )}
            </div>
          </div>

          {endpoint.description && (
            <p className="hkb-endpoint-description">{endpoint.description}</p>
          )}

          <div className="hkb-endpoint-stats">
            <span className="hkb-stat">
              <span className="hkb-stat-value">{endpoint.totalMessages}</span>
              <span className="hkb-stat-label">Messages</span>
            </span>
            <span className="hkb-stat">
              <span className="hkb-stat-value">{successRate}%</span>
              <span className="hkb-stat-label">Success</span>
            </span>
            <span className="hkb-stat">
              <span className="hkb-stat-value">{endpoint.totalFailures}</span>
              <span className="hkb-stat-label">Failed</span>
            </span>
          </div>

          {testResult && <TestResultInline result={testResult} />}
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
                {isTesting ? 'Sending...' : 'Send Test'}
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
                {isVerifying ? 'Verifying...' : 'Verify'}
              </Button>
            )}
            {onRetryAllClick && endpoint.totalFailures > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={isRetrying}
                onClick={(e) => {
                  e.stopPropagation();
                  onRetryAllClick(endpoint);
                }}
              >
                {isRetrying ? 'Retrying...' : 'Retry All Failed'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick?.(endpoint);
              }}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick?.(endpoint);
              }}
            >
              Delete
            </Button>
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
      <h3 className="hkb-empty-state-title">No endpoints yet</h3>
      <p className="hkb-empty-state-description">
        Create your first webhook endpoint to start receiving events.
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
  const { testEndpoint, isTesting, testResult, clearResult } = useTestEndpoint();
  const { replayFailedForEndpoint, isReplaying } = useReplay();
  const { api } = useHookbase();
  const [testingEndpointId, setTestingEndpointId] = useState<string | null>(null);
  const [verifyingEndpointId, setVerifyingEndpointId] = useState<string | null>(null);
  const [retryingEndpointId, setRetryingEndpointId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestDeliveryResult>>({});

  const handleTest = async (endpoint: Endpoint) => {
    setTestingEndpointId(endpoint.id);
    clearResult();
    try {
      const result = await testEndpoint(endpoint.id);
      setTestResults(prev => ({ ...prev, [endpoint.id]: result }));
    } catch {
      // Error handled by hook
    } finally {
      setTestingEndpointId(null);
    }
  };

  const handleVerify = async (endpoint: Endpoint) => {
    setVerifyingEndpointId(endpoint.id);
    try {
      await api.verifyEndpoint(endpoint.id);
      refetch();
    } catch {
      // Silently fail
    } finally {
      setVerifyingEndpointId(null);
    }
  };

  const handleRetryAll = async (endpoint: Endpoint) => {
    setRetryingEndpointId(endpoint.id);
    try {
      await replayFailedForEndpoint(endpoint.id);
      refetch();
    } catch {
      // Error handled by hook
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
        <p>Failed to load endpoints</p>
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
