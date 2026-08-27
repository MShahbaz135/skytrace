import { computePollInterval, secondsUntilUtcMidnight } from './poll-interval';

const BASE = {
  baseIntervalMs: 10_000,
  minIntervalMs: 5_000,
  maxIntervalMs: 120_000,
  creditCostPerCycle: 1,
  secondsUntilRefill: 86_400,
};

describe('computePollInterval', () => {
  it('polls at the base rate before any credit balance is known', () => {
    expect(computePollInterval({ ...BASE, creditsRemaining: null })).toBe(10_000);
  });

  it('never polls faster than the base rate even with credits to spare', () => {
    // 100,000 credits over a day could afford sub-second polling, but upstream data only
    // refreshes every 5-10s so anything faster is wasted spend.
    expect(computePollInterval({ ...BASE, creditsRemaining: 100_000 })).toBe(10_000);
  });

  it('stretches the interval so a small balance lasts until the refill', () => {
    // 400 credits across 24h works out to one poll every 216s, clamped to the 120s ceiling.
    expect(computePollInterval({ ...BASE, creditsRemaining: 400 })).toBe(120_000);
  });

  it('spreads a mid-sized balance evenly over the remaining window', () => {
    // 4,000 credits over 24h is one poll every 21.6s.
    expect(computePollInterval({ ...BASE, creditsRemaining: 4_000 })).toBe(21_600);
  });

  it('accounts for cycles that issue several requests', () => {
    // The same balance buys half as many cycles when each one costs two credits.
    expect(
      computePollInterval({ ...BASE, creditsRemaining: 4_000, creditCostPerCycle: 2 }),
    ).toBe(43_200);
  });

  it('backs all the way off once credits are exhausted', () => {
    expect(computePollInterval({ ...BASE, creditsRemaining: 0 })).toBe(120_000);
  });

  it('tightens as the refill approaches and the balance is healthy', () => {
    expect(
      computePollInterval({
        ...BASE,
        creditsRemaining: 3_000,
        secondsUntilRefill: 3_600,
      }),
    ).toBe(10_000);
  });
});

describe('secondsUntilUtcMidnight', () => {
  it('counts down to the next UTC day boundary', () => {
    expect(secondsUntilUtcMidnight(new Date('2026-05-01T23:00:00Z'))).toBe(3_600);
    expect(secondsUntilUtcMidnight(new Date('2026-05-01T00:00:00Z'))).toBe(86_400);
  });

  it('never returns zero, so callers cannot divide by it', () => {
    expect(secondsUntilUtcMidnight(new Date('2026-05-01T23:59:59Z'))).toBeGreaterThan(0);
  });
});
