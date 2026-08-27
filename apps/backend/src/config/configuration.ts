function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseReplayMode(value: string | undefined): 'auto' | 'always' | 'off' {
  return value === 'always' || value === 'off' ? value : 'auto';
}

export interface AppConfig {
  port: number;
  corsOrigins: string[];
  database: {
    /** False when DB_HOST is unset; enrichment then caches in memory only. */
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  openSky: {
    baseUrl: string;
    authUrl: string;
    clientId: string | null;
    clientSecret: string | null;
    /** Seconds before nominal expiry at which the access token is refreshed. */
    tokenRefreshMarginSec: number;
    requestTimeoutMs: number;
  };
  polling: {
    baseIntervalMs: number;
    minIntervalMs: number;
    maxIntervalMs: number;
    /** Aircraft not seen for this long are dropped from the feed. */
    staleAfterMs: number;
    /** Upper bound on upstream requests issued per poll cycle. */
    maxRequestsPerCycle: number;
  };
  replay: {
    /**
     * `auto` falls back to the recorded fixture whenever the upstream feed fails,
     * `always` forces it (used by the end-to-end tests), `off` disables it entirely.
     */
    mode: 'auto' | 'always' | 'off';
    fixturePath: string;
    /** Length of one loop through the fixture before it restarts. */
    loopSeconds: number;
  };
  adsbdb: {
    baseUrl: string;
    requestsPerSecond: number;
    requestTimeoutMs: number;
    /** How long a resolved callsign route stays valid before re-lookup. */
    routeTtlMs: number;
    /** Backoff before retrying an address adsbdb had no record for. */
    negativeTtlMs: number;
    maxQueueSize: number;
  };
}

export function loadConfig(): AppConfig {
  const clientId = process.env.OPENSKY_CLIENT_ID?.trim();
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET?.trim();

  const dbHost = process.env.DB_HOST?.trim();

  return {
    port: num(process.env.PORT, 3000),
    corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    database: {
      enabled: Boolean(dbHost),
      host: dbHost ?? 'localhost',
      port: num(process.env.DB_PORT, 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_DATABASE ?? 'skytrace',
    },
    openSky: {
      baseUrl: process.env.OPENSKY_BASE_URL ?? 'https://opensky-network.org/api',
      authUrl:
        process.env.OPENSKY_AUTH_URL ??
        'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
      clientId: clientId || null,
      clientSecret: clientSecret || null,
      tokenRefreshMarginSec: num(process.env.OPENSKY_TOKEN_REFRESH_MARGIN_SEC, 300),
      requestTimeoutMs: num(process.env.OPENSKY_REQUEST_TIMEOUT_MS, 15_000),
    },
    polling: {
      baseIntervalMs: num(process.env.POLL_BASE_INTERVAL_MS, 10_000),
      minIntervalMs: num(process.env.POLL_MIN_INTERVAL_MS, 5_000),
      maxIntervalMs: num(process.env.POLL_MAX_INTERVAL_MS, 120_000),
      staleAfterMs: num(process.env.AIRCRAFT_STALE_MS, 120_000),
      maxRequestsPerCycle: num(process.env.POLL_MAX_REQUESTS_PER_CYCLE, 3),
    },
    replay: {
      mode: parseReplayMode(process.env.REPLAY_MODE),
      fixturePath: process.env.REPLAY_FIXTURE_PATH ?? 'fixtures/states-replay.json',
      loopSeconds: num(process.env.REPLAY_LOOP_SECONDS, 1_800),
    },
    adsbdb: {
      baseUrl: process.env.ADSBDB_BASE_URL ?? 'https://api.adsbdb.com/v0',
      requestsPerSecond: num(process.env.ADSBDB_REQUESTS_PER_SECOND, 4),
      requestTimeoutMs: num(process.env.ADSBDB_REQUEST_TIMEOUT_MS, 10_000),
      routeTtlMs: num(process.env.ADSBDB_ROUTE_TTL_MS, 30 * 24 * 60 * 60 * 1000),
      negativeTtlMs: num(process.env.ADSBDB_NEGATIVE_TTL_MS, 7 * 24 * 60 * 60 * 1000),
      maxQueueSize: num(process.env.ADSBDB_MAX_QUEUE_SIZE, 5_000),
    },
  };
}

export const CONFIG_TOKEN = 'APP_CONFIG';
