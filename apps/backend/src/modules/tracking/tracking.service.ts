import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  bboxContains,
  normaliseBbox,
  WORLD_BBOX,
  type AircraftState,
  type Bbox,
  type StatusPayload,
  type StreamSource,
} from '@skytrace/shared';
import { CONFIG_TOKEN, type AppConfig } from '../../config/configuration';
import { OpenSkyClient } from '../opensky/opensky.client';
import { OpenSkyRateLimitError } from '../opensky/opensky.errors';
import { computePollInterval, secondsUntilUtcMidnight } from './poll-interval';
import { ReplaySource } from './replay.source';
import { planQueries } from './viewport';

export interface TrackingTick {
  updated: AircraftState[];
  removed: string[];
  serverTime: number;
}

interface StoreEntry {
  state: AircraftState;
  seenAtMs: number;
}

/**
 * Owns the single upstream connection to OpenSky.
 *
 * Every connected client shares this one poller: per-client fetching would multiply credit
 * spend by the number of viewers and exhaust the daily budget almost immediately. The
 * poller only runs while at least one client is subscribed.
 */
@Injectable()
export class TrackingService implements OnModuleDestroy {
  private readonly logger = new Logger(TrackingService.name);
  private readonly subscriptions = new Map<string, Bbox>();
  private readonly store = new Map<string, StoreEntry>();

  private timer: NodeJS.Timeout | null = null;
  private polling = false;
  private disposed = false;
  private lastQueryBoxes: Bbox[] = [];

  private creditsRemaining: number | null = null;
  private lastPollAtMs: number | null = null;
  private lastCycleCost = 1;
  private backoffUntilMs = 0;
  private consecutiveFailures = 0;
  private source: StreamSource = 'starting';
  private currentIntervalMs: number;

  readonly ticks$ = new Subject<TrackingTick>();
  readonly status$: BehaviorSubject<StatusPayload>;

  constructor(
    @Inject(CONFIG_TOKEN) private readonly config: AppConfig,
    private readonly client: OpenSkyClient,
    private readonly replay: ReplaySource,
  ) {
    this.currentIntervalMs = config.polling.baseIntervalMs;
    this.status$ = new BehaviorSubject<StatusPayload>(this.buildStatus());
  }

  onModuleDestroy(): void {
    this.disposed = true;
    this.clearTimer();
    this.ticks$.complete();
    this.status$.complete();
  }

  get subscriberCount(): number {
    return this.subscriptions.size;
  }

  /** Registers or updates a client viewport, waking the poller if it was idle. */
  setViewport(clientId: string, bbox: Bbox): void {
    const box = normaliseBbox(bbox);
    const previous = this.subscriptions.get(clientId);
    this.subscriptions.set(clientId, box);

    if (!previous) {
      this.logger.log(`Client ${clientId} subscribed (${this.subscriptions.size} total)`);
      this.pollSoon();
      return;
    }

    // Panning into territory the last cycle did not cover should not wait a full interval.
    if (!this.isCovered(box)) this.pollSoon();
  }

  removeViewport(clientId: string): void {
    if (!this.subscriptions.delete(clientId)) return;

    this.logger.log(`Client ${clientId} unsubscribed (${this.subscriptions.size} remaining)`);
    if (this.subscriptions.size === 0) {
      this.clearTimer();
      this.source = 'starting';
      this.publishStatus();
      this.logger.log('No subscribers left, upstream polling paused');
    }
  }

  getState(icao24: string): AircraftState | null {
    return this.store.get(icao24)?.state ?? null;
  }

  /** Current known aircraft, optionally limited to a bounding box. */
  snapshot(bbox?: Bbox): AircraftState[] {
    const out: AircraftState[] = [];
    for (const { state } of this.store.values()) {
      if (!bbox || bboxContains(bbox, state.lat, state.lng)) out.push(state);
    }
    return out;
  }

  private isCovered(bbox: Bbox): boolean {
    if (this.lastPollAtMs === null) return false;
    return this.lastQueryBoxes.some(
      (box) =>
        bbox.south >= box.south &&
        bbox.north <= box.north &&
        bbox.west >= box.west &&
        bbox.east <= box.east,
    );
  }

  /** Schedules the next poll, never sooner than the configured minimum gap. */
  private pollSoon(): void {
    if (this.disposed || this.subscriptions.size === 0) return;

    const sinceLastPoll = this.lastPollAtMs === null ? Infinity : Date.now() - this.lastPollAtMs;
    const waitForRateLimit = Math.max(0, this.backoffUntilMs - Date.now());
    const waitForMinGap = Math.max(0, this.config.polling.minIntervalMs - sinceLastPoll);

    this.scheduleIn(Math.max(waitForRateLimit, waitForMinGap));
  }

  private scheduleIn(delayMs: number): void {
    if (this.disposed || this.subscriptions.size === 0) return;
    this.clearTimer();
    this.timer = setTimeout(() => {
      void this.poll();
    }, delayMs);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async poll(): Promise<void> {
    if (this.polling || this.disposed) return;
    if (this.subscriptions.size === 0) return;

    this.polling = true;
    try {
      if (this.replay.forced) {
        this.serveReplay();
        return;
      }

      const plan = planQueries(
        [...this.subscriptions.values()],
        this.config.polling.maxRequestsPerCycle,
      );
      const boxes = plan.boxes.length > 0 ? plan.boxes : [WORLD_BBOX];
      this.lastQueryBoxes = boxes;
      this.lastCycleCost = Math.max(1, plan.totalCost);

      const seen: AircraftState[] = [];
      for (const box of boxes) {
        const result = await this.client.fetchStates(box);
        seen.push(...result.states);
        if (result.creditsRemaining !== null) this.creditsRemaining = result.creditsRemaining;
      }

      this.consecutiveFailures = 0;
      this.backoffUntilMs = 0;
      this.source = 'live';
      this.lastPollAtMs = Date.now();
      this.ingest(seen);
    } catch (error) {
      this.handlePollError(error);
    } finally {
      this.polling = false;
      this.currentIntervalMs = this.nextInterval();
      this.publishStatus();
      this.scheduleIn(Math.max(this.currentIntervalMs, this.backoffUntilMs - Date.now()));
    }
  }

  /** Publishes a frame from the recorded fixture, flagged so the UI can label it. */
  private serveReplay(): void {
    this.source = 'replay';
    this.lastPollAtMs = Date.now();
    this.lastCycleCost = 1;
    this.ingest(this.replay.getStates());
  }

  private handlePollError(error: unknown): void {
    this.consecutiveFailures += 1;

    if (this.replay.allowedAsFallback) {
      // Better to show clearly-labelled recorded traffic than an empty map. Backoff is
      // still applied below so the upstream feed is retried once it recovers.
      this.serveReplay();
    } else {
      this.source = 'unavailable';
    }

    if (error instanceof OpenSkyRateLimitError) {
      this.creditsRemaining = 0;
      this.backoffUntilMs = Date.now() + error.retryAfterSeconds * 1000;
      this.logger.warn(
        `OpenSky credits exhausted, backing off for ${error.retryAfterSeconds}s`,
      );
      return;
    }

    // Exponential backoff on transient upstream failures, capped at the max interval.
    const backoffMs = Math.min(
      this.config.polling.maxIntervalMs,
      this.config.polling.baseIntervalMs * 2 ** Math.min(this.consecutiveFailures, 5),
    );
    this.backoffUntilMs = Date.now() + backoffMs;
    this.logger.warn(
      `Poll failed (${this.consecutiveFailures} in a row), retrying in ${Math.round(backoffMs / 1000)}s: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  /** Merges a poll result into the store and emits only what actually changed. */
  private ingest(states: AircraftState[]): void {
    const now = Date.now();
    const updated: AircraftState[] = [];

    for (const state of states) {
      const existing = this.store.get(state.icao24);
      this.store.set(state.icao24, { state, seenAtMs: now });
      if (!existing || hasMeaningfulChange(existing.state, state)) updated.push(state);
    }

    const removed: string[] = [];
    const staleBefore = now - this.config.polling.staleAfterMs;
    for (const [icao24, entry] of this.store) {
      if (entry.seenAtMs < staleBefore) {
        this.store.delete(icao24);
        removed.push(icao24);
      }
    }

    if (updated.length > 0 || removed.length > 0) {
      this.ticks$.next({ updated, removed, serverTime: now });
    }
  }

  private nextInterval(): number {
    return computePollInterval({
      baseIntervalMs: this.config.polling.baseIntervalMs,
      minIntervalMs: this.config.polling.minIntervalMs,
      maxIntervalMs: this.config.polling.maxIntervalMs,
      creditsRemaining: this.creditsRemaining,
      creditCostPerCycle: this.lastCycleCost,
      secondsUntilRefill: secondsUntilUtcMidnight(),
    });
  }

  private buildStatus(): StatusPayload {
    return {
      source: this.source,
      creditsRemaining: this.creditsRemaining,
      pollIntervalMs: this.currentIntervalMs,
      lastPollAt: this.lastPollAtMs,
      aircraftInFeed: this.store.size,
    };
  }

  private publishStatus(): void {
    if (!this.disposed) this.status$.next(this.buildStatus());
  }
}

/**
 * Suppresses no-op updates. Aircraft frequently reappear in a poll with an identical
 * state vector, and rebroadcasting those wastes bandwidth on every connected client.
 */
function hasMeaningfulChange(previous: AircraftState, next: AircraftState): boolean {
  return (
    previous.lat !== next.lat ||
    previous.lng !== next.lng ||
    previous.trueTrack !== next.trueTrack ||
    previous.velocity !== next.velocity ||
    previous.baroAltitude !== next.baroAltitude ||
    previous.verticalRate !== next.verticalRate ||
    previous.onGround !== next.onGround ||
    previous.callsign !== next.callsign ||
    previous.lastContact !== next.lastContact
  );
}
