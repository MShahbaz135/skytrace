import { loadConfig, type AppConfig } from '../../config/configuration';
import { OpenSkyAuthError } from './opensky.errors';
import { OpenSkyTokenService } from './opensky-token.service';

function configWith(clientId: string | null, clientSecret: string | null): AppConfig {
  const base = loadConfig();
  return { ...base, openSky: { ...base.openSky, clientId, clientSecret } };
}

function tokenResponse(accessToken: string, expiresIn = 1800): Response {
  return new Response(JSON.stringify({ access_token: accessToken, expires_in: expiresIn }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('OpenSkyTokenService', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports itself unconfigured without both credentials', () => {
    expect(new OpenSkyTokenService(configWith(null, null)).isConfigured).toBe(false);
    expect(new OpenSkyTokenService(configWith('id', null)).isConfigured).toBe(false);
    expect(new OpenSkyTokenService(configWith(null, 'secret')).isConfigured).toBe(false);
    expect(new OpenSkyTokenService(configWith('id', 'secret')).isConfigured).toBe(true);
  });

  it('falls back to anonymous access when unconfigured', async () => {
    const service = new OpenSkyTokenService(configWith(null, null));

    await expect(service.getToken()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts client credentials and returns the access token', async () => {
    fetchMock.mockResolvedValue(tokenResponse('token-1'));
    const service = new OpenSkyTokenService(configWith('my-id', 'my-secret'));

    await expect(service.getToken()).resolves.toBe('token-1');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = (init.body as URLSearchParams).toString();
    expect(init.method).toBe('POST');
    expect(body).toContain('grant_type=client_credentials');
    expect(body).toContain('client_id=my-id');
    expect(body).toContain('client_secret=my-secret');
  });

  it('reuses a cached token instead of re-authenticating on every call', async () => {
    fetchMock.mockResolvedValue(tokenResponse('token-1'));
    const service = new OpenSkyTokenService(configWith('id', 'secret'));

    await service.getToken();
    await service.getToken();
    await service.getToken();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes ahead of expiry rather than waiting for a 401', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse('token-1', 1800));
    fetchMock.mockResolvedValueOnce(tokenResponse('token-2', 1800));
    const service = new OpenSkyTokenService(configWith('id', 'secret'));

    await expect(service.getToken()).resolves.toBe('token-1');

    // Default margin is 300s, so a 30-minute token is treated as usable for 25 minutes.
    jest.advanceTimersByTime(24 * 60 * 1000);
    await expect(service.getToken()).resolves.toBe('token-1');

    jest.advanceTimersByTime(2 * 60 * 1000);
    await expect(service.getToken()).resolves.toBe('token-2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never lets the refresh margin consume the whole token lifetime', async () => {
    // A token shorter than the margin would otherwise be considered expired on arrival,
    // producing a refresh loop.
    fetchMock.mockResolvedValue(tokenResponse('short', 60));
    const service = new OpenSkyTokenService(configWith('id', 'secret'));

    await expect(service.getToken()).resolves.toBe('short');
    jest.advanceTimersByTime(25_000);
    await expect(service.getToken()).resolves.toBe('short');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('collapses concurrent requests into a single auth call', async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const service = new OpenSkyTokenService(configWith('id', 'secret'));

    const inFlight = Promise.all([service.getToken(), service.getToken(), service.getToken()]);
    resolveFetch?.(tokenResponse('token-1'));

    await expect(inFlight).resolves.toEqual(['token-1', 'token-1', 'token-1']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('re-authenticates after the cached token is invalidated', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse('token-1'));
    fetchMock.mockResolvedValueOnce(tokenResponse('token-2'));
    const service = new OpenSkyTokenService(configWith('id', 'secret'));

    await service.getToken();
    service.invalidate();

    await expect(service.getToken()).resolves.toBe('token-2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('surfaces a rejected credential pair as an auth error', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 401 }));
    const service = new OpenSkyTokenService(configWith('id', 'bad-secret'));

    await expect(service.getToken()).rejects.toThrow(OpenSkyAuthError);
  });

  it('surfaces a malformed token response as an auth error', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ expires_in: 1800 })));
    const service = new OpenSkyTokenService(configWith('id', 'secret'));

    await expect(service.getToken()).rejects.toThrow(OpenSkyAuthError);
  });

  it('retries cleanly after a failed attempt instead of caching the failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    fetchMock.mockResolvedValueOnce(tokenResponse('token-1'));
    const service = new OpenSkyTokenService(configWith('id', 'secret'));

    await expect(service.getToken()).rejects.toThrow(OpenSkyAuthError);
    await expect(service.getToken()).resolves.toBe('token-1');
  });
});
