export interface EnrichmentTask {
  icao24: string;
  callsign: string | null;
}

export interface QueueOptions {
  requestsPerSecond: number;
  maxSize: number;
  worker: (task: EnrichmentTask) => Promise<void>;
  onError?: (error: unknown, task: EnrichmentTask) => void;
}

export function taskKey(task: EnrichmentTask): string {
  return `${task.icao24}|${task.callsign ?? ''}`;
}

/**
 * Serialises enrichment lookups at a fixed rate.
 *
 * A busy viewport can surface a thousand unseen aircraft in a single poll, but adsbdb is
 * a small volunteer service, so requests are spaced out and the backlog is bounded rather
 * than allowed to grow without limit. Dropping work is preferable to melting the upstream.
 */
export class RateLimitedQueue {
  private readonly pending: EnrichmentTask[] = [];
  private readonly queued = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private inFlight = false;
  private pausedUntilMs = 0;
  private droppedCount = 0;

  constructor(private readonly options: QueueOptions) {}

  get size(): number {
    return this.pending.length;
  }

  get dropped(): number {
    return this.droppedCount;
  }

  /** Returns false when the task was a duplicate or the backlog is full. */
  enqueue(task: EnrichmentTask): boolean {
    const key = taskKey(task);
    if (this.queued.has(key)) return false;

    if (this.pending.length >= this.options.maxSize) {
      this.droppedCount += 1;
      return false;
    }

    this.pending.push(task);
    this.queued.add(key);
    return true;
  }

  /** Stops draining for a while, used when adsbdb signals a rate limit. */
  pauseFor(ms: number): void {
    this.pausedUntilMs = Math.max(this.pausedUntilMs, Date.now() + ms);
  }

  start(): void {
    if (this.timer) return;
    const intervalMs = Math.max(1, Math.round(1000 / this.options.requestsPerSecond));
    this.timer = setInterval(() => void this.drainOne(), intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.pending.length = 0;
    this.queued.clear();
  }

  private async drainOne(): Promise<void> {
    if (this.inFlight || Date.now() < this.pausedUntilMs) return;

    const task = this.pending.shift();
    if (!task) return;

    this.queued.delete(taskKey(task));
    this.inFlight = true;
    try {
      await this.options.worker(task);
    } catch (error) {
      this.options.onError?.(error, task);
    } finally {
      this.inFlight = false;
    }
  }
}
