import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Subject } from 'rxjs';
import type { AircraftEnrichment, AircraftState } from '@skytrace/shared';
import { CONFIG_TOKEN, type AppConfig } from '../../config/configuration';
import { AdsbdbClient, AdsbdbRateLimitError } from './adsbdb.client';
import { EnrichmentStore } from './enrichment.store';
import { RateLimitedQueue, taskKey, type EnrichmentTask } from './enrichment.queue';

/** Cap on cache lookups triggered by one poll cycle, so a dense viewport cannot stall the tick. */
const MAX_CACHE_LOOKUPS_PER_TICK = 250;

/** Emissions are buffered briefly so trickling lookups arrive as batches, not one message each. */
const EMIT_BUFFER_MS = 500;

/** Upper bound on resolved entries held in memory before the oldest are evicted. */
const MAX_RESOLVED_ENTRIES = 20_000;

@Injectable()
export class EnrichmentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EnrichmentService.name);
  private readonly queue: RateLimitedQueue;

  /** Fully resolved enrichments, keyed by icao24 plus callsign. */
  private readonly resolved = new Map<string, AircraftEnrichment>();
  /** Keys currently queued or being looked up. */
  private readonly inProgress = new Set<string>();
  /** Keys that resolved to nothing, with the timestamp after which a retry is allowed. */
  private readonly negative = new Map<string, number>();

  private emitBuffer: AircraftEnrichment[] = [];
  private emitTimer: NodeJS.Timeout | null = null;

  readonly enriched$ = new Subject<AircraftEnrichment[]>();

  constructor(
    @Inject(CONFIG_TOKEN) private readonly config: AppConfig,
    private readonly client: AdsbdbClient,
    private readonly store: EnrichmentStore,
  ) {
    this.queue = new RateLimitedQueue({
      requestsPerSecond: config.adsbdb.requestsPerSecond,
      maxSize: config.adsbdb.maxQueueSize,
      worker: (task) => this.resolveTask(task),
      onError: (error, task) => this.handleWorkerError(error, task),
    });
  }

  onModuleInit(): void {
    this.queue.start();
  }

  onModuleDestroy(): void {
    this.queue.stop();
    if (this.emitTimer) clearTimeout(this.emitTimer);
    this.enriched$.complete();
  }

  get queueSize(): number {
    return this.queue.size;
  }

  /** Enrichment already known for the given aircraft, for priming a newly connected client. */
  knownFor(states: AircraftState[]): AircraftEnrichment[] {
    const out: AircraftEnrichment[] = [];
    for (const state of states) {
      const found = this.resolved.get(keyFor(state.icao24, state.callsign));
      if (found) out.push(found);
    }
    return out;
  }

  /**
   * Notes every aircraft seen in a poll and schedules lookups for the ones not yet resolved.
   * Never awaited by the caller: positions must not wait on reference data.
   */
  async observe(states: AircraftState[]): Promise<void> {
    let lookups = 0;
    const fromCache: AircraftEnrichment[] = [];

    for (const state of states) {
      if (lookups >= MAX_CACHE_LOOKUPS_PER_TICK) break;

      const key = keyFor(state.icao24, state.callsign);
      if (this.resolved.has(key) || this.inProgress.has(key)) continue;

      const retryAfter = this.negative.get(key);
      if (retryAfter !== undefined && Date.now() < retryAfter) continue;

      lookups += 1;
      this.inProgress.add(key);

      const cached = await this.readCache(state.icao24, state.callsign);
      if (cached) {
        this.inProgress.delete(key);
        this.remember(key, cached);
        fromCache.push(cached);
      } else {
        // Cache miss: hand it to the rate-limited queue and let the position stream move on.
        const accepted = this.queue.enqueue({ icao24: state.icao24, callsign: state.callsign });
        if (!accepted) this.inProgress.delete(key);
      }
    }

    if (fromCache.length > 0) this.enqueueEmit(fromCache);
  }

  /** Reads both halves from the store, returning null if either is missing or stale. */
  private async readCache(
    icao24: string,
    callsign: string | null,
  ): Promise<AircraftEnrichment | null> {
    const aircraftRow = await this.store.getAircraft(icao24);
    if (!aircraftRow) return null;
    if (!this.isAircraftFresh(aircraftRow.info, aircraftRow.fetchedAtMs)) return null;

    if (!callsign) {
      return { icao24, callsign: null, aircraft: aircraftRow.info, route: null };
    }

    const routeRow = await this.store.getRoute(callsign);
    if (!routeRow) return null;
    if (!this.isRouteFresh(routeRow.route, routeRow.fetchedAtMs)) return null;

    return {
      icao24,
      callsign,
      aircraft: aircraftRow.info,
      route: routeRow.route,
    };
  }

  /** Airframe data never changes, but a confirmed miss is retried after the negative TTL. */
  private isAircraftFresh(info: unknown, fetchedAtMs: number): boolean {
    if (info !== null) return true;
    return Date.now() - fetchedAtMs < this.config.adsbdb.negativeTtlMs;
  }

  private isRouteFresh(route: unknown, fetchedAtMs: number): boolean {
    const ttl =
      route !== null ? this.config.adsbdb.routeTtlMs : this.config.adsbdb.negativeTtlMs;
    return Date.now() - fetchedAtMs < ttl;
  }

  private async resolveTask(task: EnrichmentTask): Promise<void> {
    const key = taskKey(task);
    try {
      const result = await this.client.lookup(task.icao24, task.callsign);

      await this.store.putAircraft(task.icao24, result.aircraft);
      if (task.callsign) await this.store.putRoute(task.callsign, result.route);

      const enrichment: AircraftEnrichment = {
        icao24: task.icao24,
        callsign: task.callsign,
        aircraft: result.aircraft,
        route: result.route,
      };

      if (result.aircraft === null && result.route === null) {
        this.negative.set(key, Date.now() + this.config.adsbdb.negativeTtlMs);
      } else {
        this.remember(key, enrichment);
        this.enqueueEmit([enrichment]);
      }
    } finally {
      this.inProgress.delete(key);
    }
  }

  private handleWorkerError(error: unknown, task: EnrichmentTask): void {
    this.inProgress.delete(taskKey(task));

    if (error instanceof AdsbdbRateLimitError) {
      this.queue.pauseFor(error.retryAfterSeconds * 1000);
      this.logger.warn(`adsbdb rate limited, pausing lookups for ${error.retryAfterSeconds}s`);
      return;
    }

    // Transient failures get one more chance later rather than a permanent negative entry.
    this.negative.set(taskKey(task), Date.now() + 60_000);
    this.logger.debug(
      `Enrichment failed for ${task.icao24}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  private remember(key: string, enrichment: AircraftEnrichment): void {
    if (this.resolved.size >= MAX_RESOLVED_ENTRIES) {
      const oldest = this.resolved.keys().next();
      if (!oldest.done) this.resolved.delete(oldest.value);
    }
    this.resolved.set(key, enrichment);
  }

  private enqueueEmit(items: AircraftEnrichment[]): void {
    this.emitBuffer.push(...items);
    if (this.emitTimer) return;

    this.emitTimer = setTimeout(() => {
      this.emitTimer = null;
      const batch = this.emitBuffer;
      this.emitBuffer = [];
      if (batch.length > 0) this.enriched$.next(batch);
    }, EMIT_BUFFER_MS);
  }
}

function keyFor(icao24: string, callsign: string | null): string {
  return `${icao24}|${callsign ?? ''}`;
}
