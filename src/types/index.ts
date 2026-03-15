export interface Endpoint {
  id: string;
  url: string;
  description: string | null;
  isDisabled: boolean;
  circuitState: 'closed' | 'open' | 'half_open';
  totalMessages: number;
  totalSuccesses: number;
  totalFailures: number;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EndpointWithSecret extends Endpoint {
  secret: string;
}

export interface EventType {
  id: string;
  name: string;
  displayName: string | null;
  description: string | null;
  category: string | null;
  schema: string | null;
  examplePayload: string | null;
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

export interface OutboundMessage {
  id: string;
  eventType: string;
  endpointId: string;
  endpointUrl: string;
  status: 'pending' | 'success' | 'failed' | 'exhausted';
  attempts: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
}

export interface Application {
  id: string;
  name: string;
  organizationId: string;
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
  url: string;
  description?: string;
}

export interface UpdateEndpointInput {
  url?: string;
  description?: string;
  isDisabled?: boolean;
}

export interface CreateSubscriptionInput {
  endpointId: string;
  eventTypeId: string;
}

export interface MessagesQuery {
  endpointId?: string;
  status?: 'pending' | 'success' | 'failed' | 'exhausted';
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
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
  error?: string;
}

export interface ApiResponse<T> {
  data: T;
}
