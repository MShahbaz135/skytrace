import { RateLimitedQueue, taskKey } from './enrichment.queue';

describe('RateLimitedQueue', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('refuses duplicates that are still waiting', () => {
    const queue = new RateLimitedQueue({
      requestsPerSecond: 4,
      maxSize: 10,
      worker: () => Promise.resolve(),
    });

    expect(queue.enqueue({ icao24: 'abc123', callsign: 'BAW1' })).toBe(true);
    expect(queue.enqueue({ icao24: 'abc123', callsign: 'BAW1' })).toBe(false);
    expect(queue.size).toBe(1);
  });

  it('treats the same airframe under a different callsign as separate work', () => {
    const queue = new RateLimitedQueue({
      requestsPerSecond: 4,
      maxSize: 10,
      worker: () => Promise.resolve(),
    });

    queue.enqueue({ icao24: 'abc123', callsign: 'BAW1' });

    expect(queue.enqueue({ icao24: 'abc123', callsign: 'BAW2' })).toBe(true);
    expect(queue.size).toBe(2);
  });

  it('drops work rather than growing without bound', () => {
    const queue = new RateLimitedQueue({
      requestsPerSecond: 4,
      maxSize: 2,
      worker: () => Promise.resolve(),
    });

    queue.enqueue({ icao24: 'a', callsign: null });
    queue.enqueue({ icao24: 'b', callsign: null });

    expect(queue.enqueue({ icao24: 'c', callsign: null })).toBe(false);
    expect(queue.size).toBe(2);
    expect(queue.dropped).toBe(1);
  });

  it('drains at the configured rate and no faster', async () => {
    jest.useFakeTimers();
    const seen: string[] = [];
    const queue = new RateLimitedQueue({
      requestsPerSecond: 4, // one task every 250ms
      maxSize: 10,
      worker: (task) => {
        seen.push(task.icao24);
        return Promise.resolve();
      },
    });

    queue.enqueue({ icao24: 'a', callsign: null });
    queue.enqueue({ icao24: 'b', callsign: null });
    queue.enqueue({ icao24: 'c', callsign: null });
    queue.start();

    await jest.advanceTimersByTimeAsync(260);
    expect(seen).toEqual(['a']);

    await jest.advanceTimersByTimeAsync(500);
    expect(seen).toEqual(['a', 'b', 'c']);

    queue.stop();
  });

  it('stops draining while paused after a rate-limit response', async () => {
    jest.useFakeTimers();
    const seen: string[] = [];
    const queue = new RateLimitedQueue({
      requestsPerSecond: 10,
      maxSize: 10,
      worker: (task) => {
        seen.push(task.icao24);
        return Promise.resolve();
      },
    });

    queue.enqueue({ icao24: 'a', callsign: null });
    queue.pauseFor(1_000);
    queue.start();

    await jest.advanceTimersByTimeAsync(500);
    expect(seen).toEqual([]);

    await jest.advanceTimersByTimeAsync(700);
    expect(seen).toEqual(['a']);

    queue.stop();
  });

  it('reports worker failures without stalling the queue', async () => {
    jest.useFakeTimers();
    const errors: string[] = [];
    const queue = new RateLimitedQueue({
      requestsPerSecond: 10,
      maxSize: 10,
      worker: (task) =>
        task.icao24 === 'bad' ? Promise.reject(new Error('boom')) : Promise.resolve(),
      onError: (_error, task) => errors.push(task.icao24),
    });

    queue.enqueue({ icao24: 'bad', callsign: null });
    queue.enqueue({ icao24: 'good', callsign: null });
    queue.start();

    await jest.advanceTimersByTimeAsync(400);

    expect(errors).toEqual(['bad']);
    expect(queue.size).toBe(0);

    queue.stop();
  });

  it('lets a key be re-queued once it has been taken off the backlog', async () => {
    jest.useFakeTimers();
    const queue = new RateLimitedQueue({
      requestsPerSecond: 10,
      maxSize: 10,
      worker: () => Promise.resolve(),
    });

    queue.enqueue({ icao24: 'a', callsign: null });
    queue.start();
    await jest.advanceTimersByTimeAsync(200);

    expect(queue.enqueue({ icao24: 'a', callsign: null })).toBe(true);

    queue.stop();
  });
});

describe('taskKey', () => {
  it('distinguishes a missing callsign from an empty one', () => {
    expect(taskKey({ icao24: 'abc', callsign: null })).toBe('abc|');
    expect(taskKey({ icao24: 'abc', callsign: 'BAW1' })).toBe('abc|BAW1');
  });
});
