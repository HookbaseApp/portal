/**
 * PortalApiClient against the portal API's real contract (api/src/routes/portal.ts).
 *
 * The fixtures are the shapes those routes return: errors are `{ error: string }` (plus `message`
 * or zod `details`), lists of messages are cursor-paged `{ data, pagination }`, and ids are UUIDs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PortalApiClient, PortalApiError } from '../api/client';

const EP = '33333333-3333-4333-8333-333333333333';
const MSG = '44444444-4444-4444-8444-444444444444';

const mockFetch = vi.fn();

function respond(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => (body === undefined ? Promise.reject(new SyntaxError('no body')) : Promise.resolve(body)),
  });
}

function lastCall(): { url: string; init: RequestInit } {
  const [url, init] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
  return { url, init };
}

describe('PortalApiClient', () => {
  let client: PortalApiClient;

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
    client = new PortalApiClient('https://api.hookbase.app', 'whpt_test_token');
  });

  it('sends the portal token as a bearer token, and no body or content type on bodiless calls', async () => {
    respond({ data: [] });
    await client.getEndpoints();
    const { url, init } = lastCall();
    expect(url).toBe('https://api.hookbase.app/portal/endpoints');
    expect(init.headers).toEqual({ Authorization: 'Bearer whpt_test_token' });
    expect(init.body).toBeUndefined();
  });

  it('tolerates a trailing slash on the API URL', async () => {
    client = new PortalApiClient('https://api.hookbase.app/', 'whpt_t');
    respond({ data: [] });
    await client.getEndpoints();
    expect(lastCall().url).toBe('https://api.hookbase.app/portal/endpoints');
  });

  describe('endpoints', () => {
    it('GET /portal/endpoints/:id', async () => {
      respond({ data: { id: EP, url: 'https://example.com', retryDelays: [5, 30] } });
      const result = await client.getEndpoint(EP);
      expect(lastCall().url).toBe(`https://api.hookbase.app/portal/endpoints/${EP}`);
      expect(lastCall().init.method).toBe('GET');
      expect(result.data.retryDelays).toEqual([5, 30]);
    });

    it('encodes ids into the path', async () => {
      respond({ data: {} });
      await client.getEndpoint('a/b?c');
      expect(lastCall().url).toBe('https://api.hookbase.app/portal/endpoints/a%2Fb%3Fc');
    });

    it('POST /portal/endpoints sends JSON and returns the secret', async () => {
      respond({ data: { id: EP, url: 'https://example.com', secret: 'whsec_x' }, warning: 'Save it' }, 201);
      const result = await client.createEndpoint({ url: 'https://example.com', backoffType: 'linear' });
      const { init } = lastCall();
      expect(init.method).toBe('POST');
      expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
      expect(JSON.parse(init.body as string)).toEqual({ url: 'https://example.com', backoffType: 'linear' });
      expect(result.data.secret).toBe('whsec_x');
    });

    it('PATCH /portal/endpoints/:id', async () => {
      respond({ data: { id: EP, description: null } });
      await client.updateEndpoint(EP, { description: null });
      expect(lastCall().init.method).toBe('PATCH');
      expect(JSON.parse(lastCall().init.body as string)).toEqual({ description: null });
    });

    it('DELETE /portal/endpoints/:id resolves to undefined on the API\'s 200 {success:true}', async () => {
      respond({ success: true });
      await expect(client.deleteEndpoint(EP)).resolves.toBeUndefined();
      expect(lastCall().init.method).toBe('DELETE');
    });

    it('rotate-secret: no body by default, gracePeriodSeconds when given, full result', async () => {
      const data = { secret: 'whsec_new', secretVersion: 4, previousSecretExpiresAt: '2026-10-19T00:00:00.000Z' };
      respond({ data, warning: 'Save it' });
      const result = await client.rotateEndpointSecret(EP);
      expect(lastCall().url).toBe(`https://api.hookbase.app/portal/endpoints/${EP}/rotate-secret`);
      expect(lastCall().init.method).toBe('POST');
      expect(lastCall().init.body).toBeUndefined();
      expect(result.data).toEqual(data);

      respond({ data });
      await client.rotateEndpointSecret(EP, { gracePeriodSeconds: 0 });
      expect(JSON.parse(lastCall().init.body as string)).toEqual({ gracePeriodSeconds: 0 });
    });

    it('POST test, verify and replay-failed', async () => {
      respond({ success: true, testEvent: { id: 't', type: 'test', timestamp: 'x' }, delivery: { status: 'success' } });
      const test = await client.testEndpoint(EP, 'order.created');
      expect(lastCall().url).toBe(`https://api.hookbase.app/portal/endpoints/${EP}/test`);
      expect(JSON.parse(lastCall().init.body as string)).toEqual({ eventType: 'order.created' });
      expect(test.success).toBe(true);

      respond({ data: { verified: false, error: 'Endpoint returned status 500' } });
      const verify = await client.verifyEndpoint(EP);
      expect(lastCall().url).toBe(`https://api.hookbase.app/portal/endpoints/${EP}/verify`);
      expect(verify.data).toEqual({ verified: false, error: 'Endpoint returned status 500' });

      respond({ data: { replayed: 2, newMessageIds: ['a', 'b'] } }, 201);
      const replay = await client.replayFailedForEndpoint(EP, { since: '2026-10-01T00:00:00.000Z', includeUnattempted: true });
      const url = new URL(lastCall().url);
      expect(url.pathname).toBe(`/portal/endpoints/${EP}/replay-failed`);
      expect(url.searchParams.get('since')).toBe('2026-10-01T00:00:00.000Z');
      expect(url.searchParams.get('includeUnattempted')).toBe('true');
      expect(replay.data.replayed).toBe(2);
    });
  });

  describe('subscriptions', () => {
    it('passes endpointId and keeps only that endpoint\'s subscriptions', async () => {
      // An API without the endpointId filter answers with every endpoint's subscriptions.
      respond({ data: [
        { id: 's1', endpointId: EP, eventTypeId: 'e1' },
        { id: 's2', endpointId: 'other', eventTypeId: 'e1' },
      ] });
      const result = await client.getSubscriptions(EP);
      expect(lastCall().url).toBe(`https://api.hookbase.app/portal/subscriptions?endpointId=${EP}`);
      expect(result.data.map((s) => s.id)).toEqual(['s1']);
    });

    it('lists all without a filter', async () => {
      respond({ data: [{ id: 's1', endpointId: EP }, { id: 's2', endpointId: 'other' }] });
      expect((await client.getSubscriptions()).data).toHaveLength(2);
    });

    it('create and delete', async () => {
      respond({ data: { id: 's1', endpointId: EP, eventTypeId: 'e1' } }, 201);
      await client.createSubscription({ endpointId: EP, eventTypeId: 'e1' });
      expect(JSON.parse(lastCall().init.body as string)).toEqual({ endpointId: EP, eventTypeId: 'e1' });

      respond({ success: true });
      await expect(client.deleteSubscription('s1')).resolves.toBeUndefined();
      expect(lastCall().url).toBe('https://api.hookbase.app/portal/subscriptions/s1');
    });
  });

  describe('messages', () => {
    it('sends endpointId, status, limit and cursor, and returns {data, pagination}', async () => {
      const page = { data: [{ id: MSG, status: 'awaiting_retry' }], pagination: { hasMore: true, nextCursor: 'k1.abc_-' } };
      respond(page);
      const result = await client.getMessages({ endpointId: EP, status: 'awaiting_retry', limit: 25, cursor: 'k1.prev+/=' });
      const url = new URL(lastCall().url);
      expect(url.pathname).toBe('/portal/messages');
      expect(url.searchParams.get('endpointId')).toBe(EP);
      expect(url.searchParams.get('status')).toBe('awaiting_retry');
      expect(url.searchParams.get('limit')).toBe('25');
      // Passed back verbatim (URL-encoded on the wire, decoded by the server).
      expect(url.searchParams.get('cursor')).toBe('k1.prev+/=');
      expect(url.searchParams.has('offset')).toBe(false);
      expect(result.pagination).toEqual({ hasMore: true, nextCursor: 'k1.abc_-' });
    });

    it('omits empty params', async () => {
      respond({ data: [], pagination: { hasMore: false, nextCursor: null } });
      await client.getMessages();
      expect(lastCall().url).toBe('https://api.hookbase.app/portal/messages');
    });

    it('GET /portal/messages/:id, /attempts, and replay', async () => {
      respond({ data: { id: MSG, payload: { a: 1 } } });
      const detail = await client.getMessage(MSG);
      expect(lastCall().url).toBe(`https://api.hookbase.app/portal/messages/${MSG}`);
      expect(detail.data.payload).toEqual({ a: 1 });

      respond({ data: [{ id: 'at1', attemptNumber: 1 }] });
      const attempts = await client.getMessageAttempts(MSG);
      expect(lastCall().url).toBe(`https://api.hookbase.app/portal/messages/${MSG}/attempts`);
      expect(attempts.data[0].attemptNumber).toBe(1);

      respond({ data: { originalMessageId: MSG, newMessageId: 'n', status: 'queued' } }, 201);
      const replay = await client.replayMessage(MSG);
      expect(lastCall().url).toBe(`https://api.hookbase.app/portal/messages/${MSG}/replay`);
      expect(lastCall().init.method).toBe('POST');
      expect(replay.data.status).toBe('queued');
    });
  });

  describe('errors', () => {
    async function errorOf(promise: Promise<unknown>): Promise<PortalApiError> {
      try {
        await promise;
      } catch (err) {
        expect(err).toBeInstanceOf(PortalApiError);
        return err as PortalApiError;
      }
      throw new Error('expected a rejection');
    }

    it('reads the message from the API\'s string `error` field', async () => {
      respond({ error: 'Endpoint not found' }, 404);
      const err = await errorOf(client.getEndpoint(EP));
      expect(err.message).toBe('Endpoint not found');
      expect(err.status).toBe(404);
      expect(err.body).toEqual({ error: 'Endpoint not found' });
    });

    it('prefers the longer `message` when the API gives one', async () => {
      respond({ error: 'Cannot replay', message: 'This message is still being retried.' }, 400);
      expect((await errorOf(client.replayMessage(MSG))).message).toBe('This message is still being retried.');
    });

    it('appends zod field errors from `details`', async () => {
      const details = { formErrors: [], fieldErrors: { url: ['URL must use HTTPS and not point to a private network'] } };
      respond({ error: 'Invalid input', details }, 400);
      const err = await errorOf(client.createEndpoint({ url: 'http://localhost' }));
      expect(err.message).toBe('Invalid input (url: URL must use HTTPS and not point to a private network)');
      expect(err.details).toEqual(details);
    });

    it('still reads a nested { error: { message } } body', async () => {
      respond({ error: { message: 'Nested', code: 'x' } }, 500);
      expect((await errorOf(client.getEndpoints())).message).toBe('Nested');
    });

    it('falls back to the status when the body is not JSON', async () => {
      respond(undefined, 502);
      const err = await errorOf(client.getEndpoints());
      expect(err.message).toBe('API error: 502');
      expect(err.status).toBe(502);
    });

    it('rate limiting and auth errors', async () => {
      respond({ error: 'Rate limit exceeded', retryAfter: 60 }, 429);
      const rl = await errorOf(client.getEndpoints());
      expect(rl.message).toBe('Rate limit exceeded');
      expect((rl.body as { retryAfter: number }).retryAfter).toBe(60);

      respond({ error: 'Token expired' }, 401);
      expect((await errorOf(client.getEndpoints())).message).toBe('Token expired');
    });
  });
});
