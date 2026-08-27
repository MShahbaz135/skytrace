import type { AircraftEnrichment, AircraftState } from './aircraft';
import type { Bbox } from './geo';

export const SOCKET_NAMESPACE = '/stream';

/** Events the client emits. */
export const ClientEvent = {
  SetViewport: 'viewport:set',
} as const;

/** Events the server emits. */
export const ServerEvent = {
  Snapshot: 'states:snapshot',
  Delta: 'states:delta',
  Enriched: 'aircraft:enriched',
  Status: 'stream:status',
} as const;

/**
 * Where the positions currently being broadcast come from.
 *
 * `replay` means the upstream feed is unreachable or out of credits and the server is
 * looping a recorded fixture, which the UI must label so nobody mistakes it for live data.
 */
export type StreamSource = 'live' | 'replay' | 'starting' | 'unavailable';

export interface SetViewportPayload {
  bbox: Bbox;
  zoom: number;
}

export interface SnapshotPayload {
  aircraft: AircraftState[];
  /** Unix milliseconds on the server when this was assembled. */
  serverTime: number;
}

export interface DeltaPayload {
  updated: AircraftState[];
  /** icao24 addresses that left the feed or went stale. */
  removed: string[];
  serverTime: number;
}

export interface EnrichedPayload {
  items: AircraftEnrichment[];
}

export interface StatusPayload {
  source: StreamSource;
  /** Credits left in the OpenSky `/states/*` bucket, null before the first response. */
  creditsRemaining: number | null;
  /** Current gap between upstream polls, which widens as credits run low. */
  pollIntervalMs: number;
  /** Unix milliseconds of the last successful upstream poll. */
  lastPollAt: number | null;
  /** Total aircraft the server is currently holding across all subscribed viewports. */
  aircraftInFeed: number;
}

export interface ServerToClientEvents {
  [ServerEvent.Snapshot]: (payload: SnapshotPayload) => void;
  [ServerEvent.Delta]: (payload: DeltaPayload) => void;
  [ServerEvent.Enriched]: (payload: EnrichedPayload) => void;
  [ServerEvent.Status]: (payload: StatusPayload) => void;
}

export interface ClientToServerEvents {
  [ClientEvent.SetViewport]: (payload: SetViewportPayload) => void;
}
