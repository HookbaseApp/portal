import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PortalApiClient, PortalApiError } from '../api/client';

describe('PortalApiClient', () => {
  let client: PortalApiClient;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    client = new PortalApiClient('https://api.hookbase.app', 'whpt_test_token');
  });

  describe('authentication', () => {
    it('should send authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [] }),
      });

      await client.getEndpoints();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer whpt_test_token',
          }),
        })
      );
    });
  });

  describe('endpoints', () => {
    it('should list endpoints', async () => {
      const mockData = [{ id: 'ep_1', url: 'https://example.com' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: mockData }),
      });

      const result = await client.getEndpoints();

      expect(result.data).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.hookbase.app/portal/endpoints',
        expect.any(Object)
      );
    });

    it('should get single endpoint', async () => {
      const mockEndpoint = { id: 'ep_123', url: 'https://example.com' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: mockEndpoint }),
      });

      const result = await client.getEndpoint('ep_123');

      expect(result.data).toEqual(mockEndpoint);
    });

    it('should create endpoint', async () => {
      const mockEndpoint = {
        id: 'ep_123',
        url: 'https://example.com',
        secret: 'whsec_test',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ data: mockEndpoint }),
      });

      const result = await client.createEndpoint({
        url: 'https://example.com',
      });

      expect(result.data.secret).toBe('whsec_test');
    });

    it('should update endpoint', async () => {
      const mockEndpoint = { id: 'ep_123', url: 'https://new-url.com' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: mockEndpoint }),
      });

      const result = await client.updateEndpoint('ep_123', {
        url: 'https://new-url.com',
      });

      expect(result.data.url).toBe('https://new-url.com');
    });

    it('should delete endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await client.deleteEndpoint('ep_123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.hookbase.app/portal/endpoints/ep_123',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should rotate secret', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { secret: 'whsec_new' } }),
      });

      const result = await client.rotateEndpointSecret('ep_123');

      expect(result.data.secret).toBe('whsec_new');
    });
  });

  describe('event types', () => {
    it('should list event types', async () => {
      const mockData = [{ id: 'evt_1', name: 'order.created' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: mockData }),
      });

      const result = await client.getEventTypes();

      expect(result.data).toEqual(mockData);
    });
  });

  describe('subscriptions', () => {
    it('should list subscriptions', async () => {
      const mockData = [{ id: 'sub_1', endpointId: 'ep_1' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: mockData }),
      });

      const result = await client.getSubscriptions();

      expect(result.data).toEqual(mockData);
    });

    it('should filter subscriptions by endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [] }),
      });

      await client.getSubscriptions('ep_123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.hookbase.app/portal/subscriptions?endpointId=ep_123',
        expect.any(Object)
      );
    });

    it('should create subscription', async () => {
      const mockSub = { id: 'sub_1', endpointId: 'ep_1', eventTypeId: 'evt_1' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ data: mockSub }),
      });

      const result = await client.createSubscription({
        endpointId: 'ep_1',
        eventTypeId: 'evt_1',
      });

      expect(result.data).toEqual(mockSub);
    });

    it('should delete subscription', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await client.deleteSubscription('sub_123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.hookbase.app/portal/subscriptions/sub_123',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('messages', () => {
    it('should list messages with pagination', async () => {
      const mockData = {
        data: [{ id: 'msg_1' }],
        total: 100,
        limit: 25,
        offset: 0,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      });

      const result = await client.getMessages({ limit: 25 });

      expect(result.total).toBe(100);
    });

    it('should filter messages by status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [], total: 0, limit: 25, offset: 0 }),
      });

      await client.getMessages({ status: 'failed' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=failed'),
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should throw PortalApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Unauthorized' } }),
      });

      await expect(client.getEndpoints()).rejects.toThrow(PortalApiError);
    });

    it('should include status code in error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      });

      try {
        await client.getEndpoint('invalid');
      } catch (error) {
        expect(error).toBeInstanceOf(PortalApiError);
        expect((error as PortalApiError).status).toBe(404);
      }
    });
  });
});
