export interface PollIntervalInput {
  baseIntervalMs: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  /** Credits left in the OpenSky states bucket, null before the first response. */
  creditsRemaining: number | null;
  /** Credits one full poll cycle consumes across all query boxes. */
  creditCostPerCycle: number;
  secondsUntilRefill: number;
}

/** OpenSky refills free-tier credits daily; assume the reset lands on UTC midnight. */
export function secondsUntilUtcMidnight(now: Date = new Date()): number {
  const nextMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(1, Math.round((nextMidnight - now.getTime()) / 1000));
}

/**
 * Spreads the remaining credit balance evenly across the time left before it refills.
 *
 * Polling at the base interval all day would exhaust a standard 4,000-credit account in a
 * few hours, so as the balance falls the interval stretches to make it last. The interval
 * never drops below the base rate — upstream data only changes every 5-10 seconds, so
 * polling faster spends credits for no extra freshness.
 */
export function computePollInterval(input: PollIntervalInput): number {
  const { baseIntervalMs, minIntervalMs, maxIntervalMs, creditsRemaining, secondsUntilRefill } =
    input;

  const clamp = (value: number) =>
    Math.min(maxIntervalMs, Math.max(minIntervalMs, Math.round(value)));

  if (creditsRemaining === null) return clamp(baseIntervalMs);
  if (creditsRemaining <= 0) return maxIntervalMs;

  const costPerCycle = Math.max(1, input.creditCostPerCycle);
  const affordablePolls = creditsRemaining / costPerCycle;
  const budgetedIntervalMs = (secondsUntilRefill * 1000) / affordablePolls;

  return clamp(Math.max(baseIntervalMs, budgetedIntervalMs));
}
