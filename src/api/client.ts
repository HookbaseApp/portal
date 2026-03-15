import type {
  Application,
  Endpoint,
  EndpointWithSecret,
  EventType,
  Subscription,
  OutboundMessage,
  CreateEndpointInput,
  UpdateEndpointInput,
  CreateSubscriptionInput,
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
    public code?: string
  ) {
    super(message);
    this.name = 'PortalApiError';
  }
}

export class PortalApiClient {
  constructor(
    private baseUrl: string,
    private token: string
  ) {}

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
      let errorMessage = `API error: ${res.status}`;
      let errorCode: string | undefined;

      try {
        const errorData = await res.json();
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
        errorCode = errorData.error?.code || errorData.code;
      } catch {
        // Ignore JSON parse errors
      }

      throw new PortalApiError(errorMessage, res.status, errorCode);
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

  async getEndpoint(id: string): Promise<ApiResponse<Endpoint>> {
    return this.request('GET', `/portal/endpoints/${id}`);
  }

  async createEndpoint(data: CreateEndpointInput): Promise<ApiResponse<EndpointWithSecret>> {
    return this.request('POST', '/portal/endpoints', data);
  }

  async updateEndpoint(id: string, data: UpdateEndpointInput): Promise<ApiResponse<Endpoint>> {
    return this.request('PATCH', `/portal/endpoints/${id}`, data);
  }

  async deleteEndpoint(id: string): Promise<void> {
    return this.request('DELETE', `/portal/endpoints/${id}`);
  }

  async rotateEndpointSecret(id: string): Promise<ApiResponse<{ secret: string }>> {
    return this.request('POST', `/portal/endpoints/${id}/rotate-secret`);
  }

  // Event Types
  async getEventTypes(): Promise<ApiResponse<EventType[]>> {
    return this.request('GET', '/portal/event-types');
  }

  // Subscriptions
  async getSubscriptions(endpointId?: string): Promise<ApiResponse<Subscription[]>> {
    const query = endpointId ? `?endpointId=${endpointId}` : '';
    return this.request('GET', `/portal/subscriptions${query}`);
  }

  async createSubscription(data: CreateSubscriptionInput): Promise<ApiResponse<Subscription>> {
    return this.request('POST', '/portal/subscriptions', data);
  }

  async deleteSubscription(id: string): Promise<void> {
    return this.request('DELETE', `/portal/subscriptions/${id}`);
  }

  // Messages
  async getMessages(params?: MessagesQuery): Promise<PaginatedResponse<OutboundMessage>> {
    const searchParams = new URLSearchParams();
    if (params?.endpointId) searchParams.set('endpointId', params.endpointId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    return this.request('GET', `/portal/messages${query ? `?${query}` : ''}`);
  }

  async getMessage(id: string): Promise<ApiResponse<OutboundMessage>> {
    return this.request('GET', `/portal/messages/${id}`);
  }

  // Test Events
  async testEndpoint(id: string, eventType?: string): Promise<TestDeliveryResult> {
    return this.request('POST', `/portal/endpoints/${id}/test`, eventType ? { eventType } : {});
  }

  // Replay
  async replayMessage(id: string): Promise<ApiResponse<ReplayResult>> {
    return this.request('POST', `/portal/messages/${id}/replay`);
  }

  async replayFailedForEndpoint(endpointId: string): Promise<ApiResponse<BulkReplayResult>> {
    return this.request('POST', `/portal/endpoints/${endpointId}/replay-failed`);
  }

  // Verification
  async verifyEndpoint(id: string): Promise<ApiResponse<VerifyResult>> {
    return this.request('POST', `/portal/endpoints/${id}/verify`);
  }
}
