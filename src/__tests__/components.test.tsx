/**
 * Components against the portal API's real response shapes. fetch is answered by URL rather than
 * by call order, so the tests don't depend on how many requests a render happens to make.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HookbasePortal } from '../context/HookbaseContext';
import { MessageLog } from '../components/MessageLog';
import { EndpointList } from '../components/EndpointList';
import { EventTypeList } from '../components/EventTypeList';
import type { Endpoint, OutboundMessage } from '../types';

const API = 'https://api.test.com';
const EP = '33333333-3333-4333-8333-333333333333';

type Handler = (url: URL, init: RequestInit) => { status?: number; body: unknown } | undefined;
let handlers: Handler[] = [];
const requests: Array<{ url: URL; init: RequestInit }> = [];

const mockFetch = vi.fn(async (input: string, init: RequestInit = {}) => {
  const url = new URL(input);
  requests.push({ url, init });
  for (const h of handlers) {
    const r = h(url, init);
    if (r) {
      const status = r.status ?? 200;
      return { ok: status < 300, status, json: async () => r.body };
    }
  }
  return { ok: false, status: 404, json: async () => ({ error: `no handler for ${url.pathname}` }) };
});

function on(method: string, path: string | RegExp, reply: (url: URL) => { status?: number; body: unknown }): Handler {
  return (url, init) => {
    const m = (init.method ?? 'GET') === method;
    const p = typeof path === 'string' ? url.pathname === path : path.test(url.pathname);
    return m && p ? reply(url) : undefined;
  };
}

function message(id: string, over: Partial<OutboundMessage> = {}): OutboundMessage {
  return {
    id,
    eventType: 'order.created',
    endpointId: EP,
    endpointUrl: 'https://customer.example.com/hooks',
    status: 'success',
    attempts: 1,
    maxAttempts: 5,
    lastResponseStatus: 200,
    lastErrorMessage: null,
    lastAttemptAt: '2026-10-01T12:00:01.000Z',
    nextAttemptAt: null,
    replayable: false,
    createdAt: '2026-10-01T12:00:00.000Z',
    completedAt: '2026-10-01T12:00:01.000Z',
    ...over,
  };
}

function endpoint(over: Partial<Endpoint> = {}): Endpoint {
  return {
    id: EP,
    url: 'https://customer.example.com/hooks',
    description: null,
    secretPrefix: 'whsec_...',
    secretVersion: 1,
    isDisabled: false,
    circuitState: 'closed',
    totalMessages: 10,
    totalSuccesses: 8,
    totalFailures: 2,
    subscriptionCount: 1,
    lastSuccessAt: null,
    lastFailureAt: null,
    isVerified: false,
    verifiedAt: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...over,
  };
}

function renderInPortal(ui: React.ReactElement) {
  return render(
    <HookbasePortal token="whpt_test" apiUrl={API}>
      {ui}
    </HookbasePortal>
  );
}

beforeEach(() => {
  handlers = [];
  requests.length = 0;
  mockFetch.mockClear();
  global.fetch = mockFetch as unknown as typeof fetch;
});

describe('MessageLog', () => {
  it('pages with the API cursor, forwards the endpoint filter, and goes back', async () => {
    handlers.push(on('GET', '/portal/messages', (url) => {
      const cursor = url.searchParams.get('cursor');
      return cursor === 'k1.page2'
        ? { body: { data: [message('m3', { eventType: 'order.shipped' })], pagination: { hasMore: false, nextCursor: null } } }
        : { body: { data: [message('m1'), message('m2')], pagination: { hasMore: true, nextCursor: 'k1.page2' } } };
    }));

    renderInPortal(<MessageLog endpointId={EP} limit={2} showAttempts={false} />);

    await screen.findAllByText('order.created');
    const first = requests.find((r) => r.url.pathname === '/portal/messages')!;
    expect(first.url.searchParams.get('endpointId')).toBe(EP);
    expect(first.url.searchParams.get('limit')).toBe('2');
    expect(first.url.searchParams.has('cursor')).toBe(false);
    expect(first.url.searchParams.has('offset')).toBe(false);
    expect(screen.getByText('Page 1')).toBeTruthy();

    fireEvent.click(screen.getByText('Next'));
    await screen.findByText('order.shipped');
    const second = requests.filter((r) => r.url.pathname === '/portal/messages').pop()!;
    expect(second.url.searchParams.get('cursor')).toBe('k1.page2');
    expect(screen.getByText('Page 2')).toBeTruthy();
    expect((screen.getByText('Next') as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByText('Previous'));
    await waitFor(() => expect(screen.queryByText('order.shipped')).toBeNull());
    expect(screen.getByText('Page 1')).toBeTruthy();
  });

  it('labels every status, offers Retry only for replayable messages, and survives a deleted endpoint', async () => {
    handlers.push(on('GET', '/portal/messages', () => ({
      body: {
        data: [
          message('a', { status: 'awaiting_retry', replayable: false, nextAttemptAt: '2026-10-01T13:00:00.000Z', lastErrorMessage: 'HTTP 503' }),
          message('b', { status: 'dlq', replayable: true, endpointUrl: null }),
          message('c', { status: 'failed', replayable: false }),
        ],
        pagination: { hasMore: false, nextCursor: null },
      },
    })));
    handlers.push(on('POST', '/portal/messages/b/replay', () => ({
      status: 201, body: { data: { originalMessageId: 'b', newMessageId: 'n', status: 'queued' } },
    })));

    renderInPortal(<MessageLog showAttempts={false} />);

    expect(await screen.findByText('Retrying')).toBeTruthy();
    expect(screen.getByText('Dead-lettered')).toBeTruthy();
    expect(screen.getByText('Failed')).toBeTruthy();
    expect(screen.getByText('Deleted endpoint')).toBeTruthy();
    expect(screen.getByText('HTTP 503')).toBeTruthy();

    const retries = screen.getAllByText('Retry', { selector: 'button' });
    expect(retries).toHaveLength(1);
    fireEvent.click(retries[0]);
    await waitFor(() => expect(requests.some((r) => r.url.pathname === '/portal/messages/b/replay')).toBe(true));
  });

  it('shows the API reason when a replay is refused', async () => {
    handlers.push(on('GET', '/portal/messages', () => ({
      body: { data: [message('x', { status: 'exhausted', replayable: true })], pagination: { hasMore: false, nextCursor: null } },
    })));
    handlers.push(on('POST', '/portal/messages/x/replay', () => ({
      status: 400, body: { error: 'Cannot replay', message: 'Message status is "pending".' },
    })));

    renderInPortal(<MessageLog showAttempts={false} />);
    fireEvent.click(await screen.findByText('Retry', { selector: 'button' }));
    expect(await screen.findByText('Message status is "pending".')).toBeTruthy();
  });

  it('lists a message\'s attempts on demand', async () => {
    handlers.push(on('GET', '/portal/messages', () => ({
      body: { data: [message('m1', { status: 'awaiting_retry', attempts: 2 })], pagination: { hasMore: false, nextCursor: null } },
    })));
    handlers.push(on('GET', '/portal/messages/m1/attempts', () => ({
      body: { data: [
        { id: 'a1', messageId: 'm1', attemptNumber: 1, status: 'failed', responseStatus: 503, responseTimeMs: 40, errorType: 'http', errorMessage: 'Service Unavailable', createdAt: '2026-10-01T12:00:01.000Z', completedAt: null },
      ] },
    })));

    renderInPortal(<MessageLog />);
    fireEvent.click(await screen.findByText('Attempts'));
    expect(await screen.findByText('Service Unavailable')).toBeTruthy();
    expect(screen.getByText('HTTP 503')).toBeTruthy();
  });
});

describe('EndpointList', () => {
  it('shows why verification failed (a 200 with verified: false)', async () => {
    handlers.push(on('GET', '/portal/endpoints', () => ({ body: { data: [endpoint()] } })));
    handlers.push(on('POST', `/portal/endpoints/${EP}/verify`, () => ({
      body: { data: { verified: false, error: 'Challenge response did not match' } },
    })));

    renderInPortal(<EndpointList />);
    fireEvent.click(await screen.findByText('Verify'));
    expect(await screen.findByText('Verification failed: Challenge response did not match')).toBeTruthy();
  });

  it('shows test-send errors and bulk replay counts', async () => {
    handlers.push(on('GET', '/portal/endpoints', () => ({ body: { data: [endpoint()] } })));
    handlers.push(on('POST', `/portal/endpoints/${EP}/test`, () => ({ status: 400, body: { error: 'Endpoint is disabled' } })));
    handlers.push(on('POST', `/portal/endpoints/${EP}/replay-failed`, () => ({
      status: 201, body: { data: { replayed: 2, newMessageIds: ['n1', 'n2'] } },
    })));

    renderInPortal(<EndpointList />);
    fireEvent.click(await screen.findByText('Send Test'));
    expect(await screen.findByText('Endpoint is disabled')).toBeTruthy();

    fireEvent.click(screen.getByText('Retry All Failed'));
    expect(await screen.findByText('Replaying 2 messages')).toBeTruthy();
  });
});

describe('EventTypeList', () => {
  it('renders a JSONB example payload (an object, not a string)', async () => {
    handlers.push(on('GET', '/portal/event-types', () => ({
      body: { data: [{
        id: 'et1', name: 'order.created', displayName: 'Order created', description: null, category: 'Orders',
        schema: { type: 'object' }, examplePayload: { orderId: 'ord_1' }, documentationUrl: null,
      }] },
    })));

    const { container } = renderInPortal(<EventTypeList />);
    await screen.findByText('order.created');
    fireEvent.click(screen.getByLabelText('Expand'));
    await waitFor(() => expect(container.textContent).toContain('"orderId": "ord_1"'));
  });
});
