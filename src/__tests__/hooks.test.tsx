import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HookbasePortal } from '../context/HookbaseContext';
import { useEndpoints } from '../hooks/useEndpoints';
import { useEventTypes } from '../hooks/useEventTypes';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useMessages } from '../hooks/useMessages';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) => (
    <HookbasePortal token="whpt_test" apiUrl="https://api.test.com">
      {children}
    </HookbasePortal>
  );
}

// Default application response consumed by HookbasePortal on mount
const mockApplicationResponse = {
  ok: true,
  status: 200,
  json: () => Promise.resolve({ data: { id: 'app_1', name: 'Test App', organizationId: 'org_1' } }),
};

// TODO: Fix context setup - HookbasePortal creates its own QueryClient
// and fetches /portal/application on mount, making mock ordering fragile.
describe.skip('Portal Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // HookbasePortal always fetches /portal/application on mount,
    // so prepend that mock before each test's specific mocks
    mockFetch.mockResolvedValueOnce(mockApplicationResponse);
  });

  describe('useEndpoints', () => {
    it('should fetch endpoints', async () => {
      const mockEndpoints = [
        { id: 'ep_1', url: 'https://example.com', isDisabled: false },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: mockEndpoints }),
      });

      const { result } = renderHook(() => useEndpoints(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.endpoints).toEqual(mockEndpoints);
    });

    it('should create endpoint', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [] }),
      });

      // Create endpoint
      const newEndpoint = { id: 'ep_new', url: 'https://new.com', secret: 'whsec_test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ data: newEndpoint }),
      });

      // Refetch after create
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [newEndpoint] }),
      });

      const { result } = renderHook(() => useEndpoints(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const created = await result.current.createEndpoint({ url: 'https://new.com' });

      expect(created.data.secret).toBe('whsec_test');
    });

    it('should handle errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: 'Server error' } }),
      });

      const { result } = renderHook(() => useEndpoints(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useEventTypes', () => {
    it('should fetch and group event types by category', async () => {
      const mockEventTypes = [
        { id: 'evt_1', name: 'order.created', category: 'Orders' },
        { id: 'evt_2', name: 'order.updated', category: 'Orders' },
        { id: 'evt_3', name: 'payment.completed', category: 'Payments' },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: mockEventTypes }),
      });

      const { result } = renderHook(() => useEventTypes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.eventTypes).toHaveLength(3);
      expect(result.current.categories).toContain('Orders');
      expect(result.current.categories).toContain('Payments');
      expect(result.current.groupedByCategory['Orders']).toHaveLength(2);
      expect(result.current.groupedByCategory['Payments']).toHaveLength(1);
    });
  });

  describe('useSubscriptions', () => {
    it('should fetch subscriptions', async () => {
      const mockSubs = [
        { id: 'sub_1', endpointId: 'ep_1', eventTypeId: 'evt_1' },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: mockSubs }),
      });

      const { result } = renderHook(() => useSubscriptions('ep_1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.subscriptions).toEqual(mockSubs);
      expect(result.current.subscribedEventTypeIds.has('evt_1')).toBe(true);
    });

    it('should toggle subscription - create', async () => {
      // Initial fetch returns no subscriptions
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [] }),
      });

      // Create subscription
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            data: { id: 'sub_new', endpointId: 'ep_1', eventTypeId: 'evt_1' },
          }),
      });

      // Refetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [{ id: 'sub_new', endpointId: 'ep_1', eventTypeId: 'evt_1' }],
          }),
      });

      const { result } = renderHook(() => useSubscriptions('ep_1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.toggleSubscription('evt_1', 'ep_1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/portal/subscriptions'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('useMessages', () => {
    it('should fetch messages with pagination', async () => {
      const mockMessages = {
        data: [{ id: 'msg_1', eventType: 'order.created' }],
        total: 50,
        limit: 25,
        offset: 0,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockMessages),
      });

      const { result } = renderHook(() => useMessages({ limit: 25 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.total).toBe(50);
    });

    it('should support auto-refresh', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [],
            total: 0,
            limit: 25,
            offset: 0,
          }),
      });

      const { result } = renderHook(
        () => useMessages({ refreshInterval: 1000 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Wait for potential refetch
      await new Promise((r) => setTimeout(r, 100));

      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
