import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  bboxCreditCost,
  normaliseBbox,
  type AircraftState,
  type Bbox,
} from '@skytrace/shared';
import { CONFIG_TOKEN, type AppConfig } from '../../config/configuration';
import { OpenSkyRateLimitError, OpenSkyRequestError } from './opensky.errors';
import { OpenSkyTokenService } from './opensky-token.service';
import { mapStatesResponse, type RawStatesResponse } from './state-vector.mapper';

export interface StatesResult {
  states: AircraftState[];
  /** Unix seconds the upstream snapshot was taken. */
  time: number;
  /** Value of X-Rate-Limit-Remaining, null when the header is absent. */
  creditsRemaining: number | null;
  /** Credits this request consumed, derived from the bounding box area. */
  creditCost: number;
}

const GLOBAL_AREA_SQ_DEG = 360 * 180;

@Injectable()
export class OpenSkyClient {
  private readonly logger = new Logger(OpenSkyClient.name);

  constructor(
    @Inject(CONFIG_TOKEN) private readonly config: AppConfig,
    private readonly tokens: OpenSkyTokenService,
  ) {}

  async fetchStates(bbox: Bbox): Promise<StatesResult> {
    const box = normaliseBbox(bbox);
    const url = new URL(`${this.config.openSky.baseUrl}/states/all`);

    // A world-sized box costs the same as an unbounded query, so skip the parameters
    // entirely and let OpenSky serve the global feed.
    const area = (box.north - box.south) * (box.east - box.west);
    if (area < GLOBAL_AREA_SQ_DEG) {
      url.searchParams.set('lamin', box.south.toFixed(4));
      url.searchParams.set('lomin', box.west.toFixed(4));
      url.searchParams.set('lamax', box.north.toFixed(4));
      url.searchParams.set('lomax', box.east.toFixed(4));
    }

    const response = await this.requestWithAuthRetry(url);
    const creditsRemaining = readIntHeader(response, 'x-rate-limit-remaining');

    if (response.status === 429) {
      const retryAfter = readIntHeader(response, 'x-rate-limit-retry-after-seconds') ?? 60;
      throw new OpenSkyRateLimitError(retryAfter);
    }

    if (!response.ok) {
      throw new OpenSkyRequestError(
        `OpenSky /states/all failed with HTTP ${response.status}`,
        response.status,
      );
    }

    const payload = (await response.json()) as RawStatesResponse;
    const states = mapStatesResponse(payload);

    return {
      states,
      time: payload.time ?? Math.floor(Date.now() / 1000),
      creditsRemaining,
      creditCost: bboxCreditCost(box),
    };
  }

  /** Sends the request, refreshing the token once if the cached one was rejected. */
  private async requestWithAuthRetry(url: URL): Promise<Response> {
    const first = await this.send(url);
    if (first.status !== 401) return first;

    this.logger.warn('OpenSky rejected the access token, refreshing and retrying once');
    this.tokens.invalidate();
    return this.send(url);
  }

  private async send(url: URL): Promise<Response> {
    const token = await this.tokens.getToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    return fetch(url, {
      headers,
      signal: AbortSignal.timeout(this.config.openSky.requestTimeoutMs),
    });
  }
}

function readIntHeader(response: Response, name: string): number | null {
  const raw = response.headers.get(name);
  if (raw === null) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
