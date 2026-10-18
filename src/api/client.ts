import type {
  Application,
  Endpoint,
  EndpointDetail,
  EndpointWithSecret,
  EventType,
  Subscription,
  OutboundMessage,
  OutboundMessageDetail,
  MessageAttempt,
  CreateEndpointInput,
  UpdateEndpointInput,
  CreateSubscriptionInput,
  RotateSecretInput,
  RotateSecretResult,
  MessagesQuery,
  PaginatedResponse,
  ApiResponse,
  TestDeliveryResult,
  ReplayResult,
  BulkReplayResult,
  VerifyResult,
} from '../types';

export class PortalApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    /** Validation detail for 400s: zod's flatten() output (`{ formErrors, fieldErrors }`). */
    public details?: unknown,
    /** The parsed error body, when there was one. */
    public body?: unknown
  ) {
    super(message);
    this.name = 'PortalApiError';
  }
}

/**
 * The message for an error body. The API answers `{ error: string }`, sometimes with a longer
 * `message` (e.g. why a replay was refused) and, for invalid input, zod's flattened `details`.
 */
function errorMessageFrom(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const b = body as Record<string, unknown>;
  let message: string | undefined;
  if (typeof b.message === 'string' && b.message) message = b.message;
  else if (typeof b.error === 'string' && b.error) message = b.error;
  else if (b.error && typeof b.error === 'object' && typeof (b.error as { message?: unknown }).message === 'string') {
    message = (b.error as { message: string }).message;
  }
  if (!message) return fallback;

  const fieldErrors = (b.details as { fieldErrors?: Record<string, unknown> } | undefined)?.fieldErrors;
  if (fieldErrors && typeof fieldErrors === 'object') {
    const parts = Object.entries(fieldErrors)
      .filter(([, errs]) => Array.isArray(errs) && errs.length > 0)
      .map(([field, errs]) => `${field}: ${(errs as string[]).join(', ')}`);
    if (parts.length > 0) message = `${message} (${parts.join('; ')})`;
  }
  return message;
}

const seg = (id: string) => encodeURIComponent(id);

export class PortalApiClient {
  private baseUrl: string;

  constructor(
    baseUrl: string,
    private token: string
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let errorBody: unknown;
      try {
        errorBody = await res.json();
      } catch {
        // Not JSON (e.g. an edge error page)
      }
      const b = (errorBody && typeof errorBody === 'object' ? errorBody : {}) as Record<string, unknown>;
      throw new PortalApiError(
        errorMessageFrom(errorBody, `API error: ${res.status}`),
        res.status,
        typeof b.code === 'string' ? b.code : undefined,
        b.details,
        errorBody
      );
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return res.json();
  }

  // Application
  async getApplication(): Promise<ApiResponse<Application>> {
    return this.request('GET', '/portal/application');
  }

  // Endpoints
  async getEndpoints(): Promise<ApiResponse<Endpoint[]>> {
    return this.request('GET', '/portal/endpoints');
  }

  async getEndpoint(id: string): Promise<ApiResponse<EndpointDetail>> {
    return this.request('GET', `/portal/endpoints/${seg(id)}`);
  }

  async createEndpoint(data: CreateEndpointInput): Promise<ApiResponse<EndpointWithSecret>> {
    return this.request('POST', '/portal/endpoints', data);
  }

  async updateEndpoint(id: string, data: UpdateEndpointInput): Promise<ApiResponse<EndpointDetail>> {
    return this.request('PATCH', `/portal/endpoints/${seg(id)}`, data);
  }

  async deleteEndpoint(id: string): Promise<void> {
    await this.request('DELETE', `/portal/endpoints/${seg(id)}`);
  }

  async rotateEndpointSecret(id: string, options?: RotateSecretInput): Promise<ApiResponse<RotateSecretResult>> {
    const body = options?.gracePeriodSeconds !== undefined
      ? { gracePeriodSeconds: options.gracePeriodSeconds }
      : undefined;
    return this.request('POST', `/portal/endpoints/${seg(id)}/rotate-secret`, body);
  }

  // Event Types
  async getEventTypes(): Promise<ApiResponse<EventType[]>> {
    return this.request('GET', '/portal/event-types');
  }

  // Subscriptions
  async getSubscriptions(endpointId?: string): Promise<ApiResponse<Subscription[]>> {
    const query = endpointId ? `?endpointId=${encodeURIComponent(endpointId)}` : '';
    const res = await this.request<ApiResponse<Subscription[]>>('GET', `/portal/subscriptions${query}`);
    // API versions before the endpointId filter returned every endpoint's subscriptions.
    return endpointId ? { ...res, data: res.data.filter((s) => s.endpointId === endpointId) } : res;
  }

  async createSubscription(data: CreateSubscriptionInput): Promise<ApiResponse<Subscription>> {
    return this.request('POST', '/portal/subscriptions', data);
  }

  async deleteSubscription(id: string): Promise<void> {
    await this.request('DELETE', `/portal/subscriptions/${seg(id)}`);
  }

  // Messages
  /**
   * One page of delivery history, newest first. Pass `pagination.nextCursor` back as `cursor` for
   * the next page while `pagination.hasMore` is true.
   */
  async getMessages(params?: MessagesQuery): Promise<PaginatedResponse<OutboundMessage>> {
    const searchParams = new URLSearchParams();
    if (params?.endpointId) searchParams.set('endpointId', params.endpointId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.cursor) searchParams.set('cursor', params.cursor);

    const query = searchParams.toString();
    return this.request('GET', `/portal/messages${query ? `?${query}` : ''}`);
  }

  async getMessage(id: string): Promise<ApiResponse<OutboundMessageDetail>> {
    return this.request('GET', `/portal/messages/${seg(id)}`);
  }

  async getMessageAttempts(id: string): Promise<ApiResponse<MessageAttempt[]>> {
    return this.request('GET', `/portal/messages/${seg(id)}/attempts`);
  }

  // Test Events
  async testEndpoint(id: string, eventType?: string): Promise<TestDeliveryResult> {
    return this.request('POST', `/portal/endpoints/${seg(id)}/test`, eventType ? { eventType } : {});
  }

  // Replay
  async replayMessage(id: string): Promise<ApiResponse<ReplayResult>> {
    return this.request('POST', `/portal/messages/${seg(id)}/replay`);
  }

  async replayFailedForEndpoint(
    endpointId: string,
    options?: { since?: string; includeUnattempted?: boolean }
  ): Promise<ApiResponse<BulkReplayResult>> {
    const searchParams = new URLSearchParams();
    if (options?.since) searchParams.set('since', options.since);
    if (options?.includeUnattempted) searchParams.set('includeUnattempted', 'true');
    const query = searchParams.toString();
    return this.request('POST', `/portal/endpoints/${seg(endpointId)}/replay-failed${query ? `?${query}` : ''}`);
  }

  // Verification
  /**
   * Sends the endpoint a challenge. A failed verification is still a 200: check `data.verified`
   * and `data.error`.
   */
  async verifyEndpoint(id: string): Promise<ApiResponse<VerifyResult>> {
    return this.request('POST', `/portal/endpoints/${seg(id)}/verify`);
  }
}
