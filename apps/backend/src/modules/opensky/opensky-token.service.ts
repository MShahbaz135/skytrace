import { Inject, Injectable, Logger } from '@nestjs/common';
import { CONFIG_TOKEN, type AppConfig } from '../../config/configuration';
import { OpenSkyAuthError } from './opensky.errors';

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

/**
 * OpenSky dropped basic auth in March 2026; the REST API now only accepts OAuth2
 * client-credentials bearer tokens, which expire after 30 minutes.
 *
 * Tokens are refreshed ahead of expiry and concurrent callers share a single in-flight
 * request, so a burst of poll cycles cannot stampede the auth endpoint.
 */
@Injectable()
export class OpenSkyTokenService {
  private readonly logger = new Logger(OpenSkyTokenService.name);
  private accessToken: string | null = null;
  private expiresAtMs = 0;
  private inFlight: Promise<string> | null = null;

  constructor(@Inject(CONFIG_TOKEN) private readonly config: AppConfig) {}

  /** False when no client credentials are configured; callers then fall back to anonymous access. */
  get isConfigured(): boolean {
    return Boolean(this.config.openSky.clientId && this.config.openSky.clientSecret);
  }

  /** Drops the cached token so the next call re-authenticates. Used after a 401. */
  invalidate(): void {
    this.accessToken = null;
    this.expiresAtMs = 0;
  }

  async getToken(): Promise<string | null> {
    if (!this.isConfigured) return null;

    if (this.accessToken && Date.now() < this.expiresAtMs) {
      return this.accessToken;
    }

    this.inFlight ??= this.requestToken().finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  private async requestToken(): Promise<string> {
    const { authUrl, clientId, clientSecret, tokenRefreshMarginSec, requestTimeoutMs } =
      this.config.openSky;

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId!,
      client_secret: clientSecret!,
    });

    let response: Response;
    try {
      response = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
    } catch (cause) {
      throw new OpenSkyAuthError(
        `Token request failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }

    if (!response.ok) {
      throw new OpenSkyAuthError(`Token request rejected with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as Partial<TokenResponse>;
    if (!payload.access_token) {
      throw new OpenSkyAuthError('Token response did not contain an access_token');
    }

    const lifetimeSec = payload.expires_in ?? 1800;
    // Refresh early so a token never expires mid-request.
    const usableSec = Math.max(lifetimeSec - tokenRefreshMarginSec, Math.floor(lifetimeSec / 2));

    this.accessToken = payload.access_token;
    this.expiresAtMs = Date.now() + usableSec * 1000;
    this.logger.log(`Acquired OpenSky access token, refreshing in ${usableSec}s`);

    return this.accessToken;
  }
}
