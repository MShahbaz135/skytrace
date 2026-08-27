import type { Bbox } from '@skytrace/shared';
import { loadConfig, type AppConfig } from '../../config/configuration';
import { OpenSkyClient } from './opensky.client';
import { OpenSkyRateLimitError, OpenSkyRequestError } from './opensky.errors';
import type { OpenSkyTokenService } from './opensky-token.service';

const EUROPE: Bbox = { south: 45, west: 0, north: 50, east: 5 };

function statesResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
}

function makeClient(config: AppConfig = loadConfig()) {
  const tokens = {
    getToken: jest.fn().mockResolvedValue('token-1'),
    invalidate: jest.fn(),
    isConfigured: true,
  };
  const client = new OpenSkyClient(config, tokens as unknown as OpenSkyTokenService);
  return { client, tokens };
}

describe('OpenSkyClient', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('sends the bounding box as OpenSky lamin/lomin/lamax/lomax parameters', async () => {
    fetchMock.mockResolvedValue(statesResponse({ time: 1, states: [] }));
    const { client } = makeClient();

    await client.fetchStates(EUROPE);

    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.pathname).toContain('/states/all');
    expect(url.searchParams.get('lamin')).toBe('45.0000');
    expect(url.searchParams.get('lomin')).toBe('0.0000');
    expect(url.searchParams.get('lamax')).toBe('50.0000');
    expect(url.searchParams.get('lomax')).toBe('5.0000');
  });

  it('omits the box for a world-sized request, which costs the same as the global feed', async () => {
    fetchMock.mockResolvedValue(statesResponse({ time: 1, states: [] }));
    const { client } = makeClient();

    await client.fetchStates({ south: -90, west: -180, north: 90, east: 180 });

    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.searchParams.has('lamin')).toBe(false);
  });

  it('attaches the bearer token', async () => {
    fetchMock.mockResolvedValue(statesResponse({ time: 1, states: [] }));
    const { client } = makeClient();

    await client.fetchStates(EUROPE);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-1');
  });

  it('sends no Authorization header when running anonymously', async () => {
    fetchMock.mockResolvedValue(statesResponse({ time: 1, states: [] }));
    const { client, tokens } = makeClient();
    tokens.getToken.mockResolvedValue(null);

    await client.fetchStates(EUROPE);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('reports the credit balance and the cost of the request', async () => {
    fetchMock.mockResolvedValue(
      statesResponse({ time: 1700000000, states: [] }, { headers: { 'X-Rate-Limit-Remaining': '3820' } }),
    );
    const { client } = makeClient();

    const result = await client.fetchStates(EUROPE);

    expect(result.creditsRemaining).toBe(3820);
    // 5x5 degrees stays inside the 25 sq deg band.
    expect(result.creditCost).toBe(1);
    expect(result.time).toBe(1700000000);
  });

  it('leaves the balance unknown when the header is absent', async () => {
    fetchMock.mockResolvedValue(statesResponse({ time: 1, states: [] }));
    const { client } = makeClient();

    await expect(client.fetchStates(EUROPE)).resolves.toMatchObject({
      creditsRemaining: null,
    });
  });

  it('maps returned state vectors', async () => {
    fetchMock.mockResolvedValue(
      statesResponse({
        time: 1700000000,
        states: [
          [
            '3c6444', 'DLH123  ', 'Germany', 1700000000, 1700000005,
            8.5, 50.1, 10500, false, 240, 91, -2, null, 10700, '1000', false, 0,
          ],
        ],
      }),
    );
    const { client } = makeClient();

    const result = await client.fetchStates(EUROPE);

    expect(result.states).toHaveLength(1);
    expect(result.states[0]).toMatchObject({ icao24: '3c6444', callsign: 'DLH123' });
  });

  it('raises a rate-limit error carrying the retry hint', async () => {
    fetchMock.mockResolvedValue(
      statesResponse(
        {},
        { status: 429, headers: { 'X-Rate-Limit-Retry-After-Seconds': '900' } },
      ),
    );
    const { client } = makeClient();

    await expect(client.fetchStates(EUROPE)).rejects.toMatchObject({
      name: 'OpenSkyRateLimitError',
      retryAfterSeconds: 900,
    });
  });

  it('defaults the retry delay when OpenSky omits the hint', async () => {
    fetchMock.mockResolvedValue(statesResponse({}, { status: 429 }));
    const { client } = makeClient();

    await expect(client.fetchStates(EUROPE)).rejects.toMatchObject({ retryAfterSeconds: 60 });
  });

  it('refreshes the token and retries once on a 401', async () => {
    fetchMock.mockResolvedValueOnce(statesResponse({}, { status: 401 }));
    fetchMock.mockResolvedValueOnce(statesResponse({ time: 1, states: [] }));
    const { client, tokens } = makeClient();

    await expect(client.fetchStates(EUROPE)).resolves.toMatchObject({ states: [] });

    expect(tokens.invalidate).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up if the retried request is also rejected', async () => {
    fetchMock.mockResolvedValue(statesResponse({}, { status: 401 }));
    const { client } = makeClient();

    await expect(client.fetchStates(EUROPE)).rejects.toThrow(OpenSkyRequestError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('surfaces upstream server errors', async () => {
    fetchMock.mockResolvedValue(statesResponse({}, { status: 503 }));
    const { client } = makeClient();

    await expect(client.fetchStates(EUROPE)).rejects.toMatchObject({ status: 503 });
  });

  it('checks the rate limit before treating the response as a failure', async () => {
    // A 429 must not be reported as a generic request error, or the poller would use
    // exponential backoff instead of honouring the retry-after window.
    fetchMock.mockResolvedValue(statesResponse({}, { status: 429 }));
    const { client } = makeClient();

    await expect(client.fetchStates(EUROPE)).rejects.not.toBeInstanceOf(OpenSkyRequestError);
    await expect(client.fetchStates(EUROPE)).rejects.toBeInstanceOf(OpenSkyRateLimitError);
  });
});
