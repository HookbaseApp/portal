// Shapes returned by the Hookbase portal API (api/src/routes/portal.ts, mounted at /portal).

export type CircuitState = 'closed' | 'open' | 'half_open';

/** An endpoint as `GET /portal/endpoints` lists it. */
export interface Endpoint {
  id: string;
  url: string;
  description: string | null;
  /** Identifies the secret without revealing it, e.g. `whsec_...`. */
  secretPrefix: string;
  /** Increments on every rotation. */
  secretVersion: number;
  isDisabled: boolean;
  circuitState: CircuitState;
  totalMessages: number;
  totalSuccesses: number;
  totalFailures: number;
  subscriptionCount: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A status code (200) or a class pattern ("2xx"). */
export type SuccessStatusCode = number | string;

export type BackoffType = 'exponential' | 'linear' | 'fixed';

/** `GET /portal/endpoints/:id`, and the create/update responses. */
export interface EndpointDetail extends Endpoint {
  successStatusCodes: SuccessStatusCode[] | null;
  backoffType: BackoffType;
  retryDelays: number[] | null;
  /** When the secret replaced by the last rotation stops verifying. */
  previousSecretExpiresAt: string | null;
}

/** `POST /portal/endpoints`: the only time the signing secret is returned. */
export interface EndpointWithSecret extends EndpointDetail {
  secret: string;
}

export interface EventType {
  id: string;
  name: string;
  displayName: string | null;
  description: string | null;
  category: string | null;
  /** JSON Schema for the payload, as stored (an object, or a JSON string for older rows). */
  schema: unknown;
  /** Example payload, as stored (an object, or a JSON string for older rows). */
  examplePayload: unknown;
  documentationUrl: string | null;
}

export interface Subscription {
  id: string;
  endpointId: string;
  eventTypeId: string;
  eventTypeName: string;
  isEnabled: boolean;
  createdAt: string;
}

/** Every status an outbound message can be in. */
export type MessageStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed'
  | 'awaiting_retry'
  | 'exhausted'
  | 'dlq';

/** A message as `GET /portal/messages` lists it. */
export interface OutboundMessage {
  id: string;
  eventType: string;
  endpointId: string;
  /** null once the endpoint has been deleted. */
  endpointUrl: string | null;
  status: MessageStatus;
  attempts: number;
  maxAttempts: number;
  lastResponseStatus: number | null;
  lastErrorMessage: string | null;
  lastAttemptAt: string | null;
  /** When the next retry is due (status `awaiting_retry`). */
  nextAttemptAt: string | null;
  /** Whether `POST /portal/messages/:id/replay` will accept this message. */
  replayable: boolean;
  createdAt: string;
  completedAt: string | null;
}

/** `GET /portal/messages/:id`. */
export interface OutboundMessageDetail extends OutboundMessage {
  eventId: string;
  firstAttemptAt: string | null;
  lastErrorType: string | null;
  payloadSizeBytes: number | null;
  /** The delivered payload; null once retention has removed it. */
  payload: unknown;
}

/** `GET /portal/messages/:id/attempts`. */
export interface MessageAttempt {
  id: string;
  messageId: string;
  attemptNumber: number;
  status: string;
  responseStatus: number | null;
  responseTimeMs: number | null;
  errorType: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

/** `GET /portal/application`. */
export interface Application {
  id: string;
  name: string;
  externalId: string | null;
  totalEndpoints: number;
  totalMessagesSent: number;
  totalMessagesFailed: number;
  /** Scopes granted to the portal token in use, e.g. `['read', 'write']`. */
  scopes: string[];
}

export interface HookbaseTheme {
  colors?: {
    primary?: string;
    background?: string;
    foreground?: string;
    muted?: string;
    mutedForeground?: string;
    border?: string;
    destructive?: string;
    success?: string;
    warning?: string;
  };
  borderRadius?: string;
  darkMode?: 'auto' | 'light' | 'dark';
}

export interface CreateEndpointInput {
  /** Must be https and not a private address. */
  url: string;
  description?: string;
  successStatusCodes?: SuccessStatusCode[];
  backoffType?: BackoffType;
  retryDelays?: number[];
}

export interface UpdateEndpointInput {
  url?: string;
  /** null clears it. */
  description?: string | null;
  isDisabled?: boolean;
  successStatusCodes?: SuccessStatusCode[] | null;
  backoffType?: BackoffType | null;
  retryDelays?: number[] | null;
}

export interface RotateSecretInput {
  /** How long the old secret keeps verifying, 0-86400 seconds. The API defaults to 86400 (24h). */
  gracePeriodSeconds?: number;
}

export interface RotateSecretResult {
  secret: string;
  secretVersion: number;
  previousSecretExpiresAt: string;
}

export interface CreateSubscriptionInput {
  endpointId: string;
  eventTypeId: string;
}

export interface MessagesQuery {
  endpointId?: string;
  status?: MessageStatus;
  /** 1-100, default 50. */
  limit?: number;
  /** `pagination.nextCursor` from the previous page, passed back verbatim. Omit for the first page. */
  cursor?: string;
}

export interface Pagination {
  hasMore: boolean;
  /** Opaque; null on the last page. */
  nextCursor: string | null;
}

/** A cursor-paged list response. */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface TestDeliveryResult {
  success: boolean;
  testEvent: {
    id: string;
    type: string;
    timestamp: string;
  };
  delivery: {
    status: 'success' | 'failed';
    responseStatus: number;
    responseTimeMs: number;
    responseBody: string;
    errorMessage: string | null;
  };
  signature: {
    header: string;
    value: string;
    timestamp: number;
  };
}

export interface ReplayResult {
  originalMessageId: string;
  newMessageId: string;
  status: string;
}

export interface BulkReplayResult {
  replayed: number;
  newMessageIds: string[];
}

export interface VerifyResult {
  verified: boolean;
  /** Why verification failed (the endpoint's response, a timeout, ...). */
  error?: string;
}

export interface ApiResponse<T> {
  data: T;
}
