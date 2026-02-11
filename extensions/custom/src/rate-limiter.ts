/**
 * Sliding window rate limiter. Tracks timestamps per key and checks
 * whether a key has exceeded the allowed count within the window.
 */
export class SlidingWindowCounter {
  private readonly windowMs: number;
  private readonly maxCount: number;
  private readonly counters = new Map<string, number[]>();
  private readonly pruneTimer: ReturnType<typeof setInterval>;

  constructor(windowMs: number, maxCount: number) {
    this.windowMs = windowMs;
    this.maxCount = maxCount;

    // Auto-prune stale entries every 60s to prevent memory leaks.
    this.pruneTimer = setInterval(() => this.pruneAll(), 60_000);
    // Allow the process to exit even if the timer is still running.
    if (typeof this.pruneTimer === "object" && "unref" in this.pruneTimer) {
      this.pruneTimer.unref();
    }
  }

  /** Record an event for the given key. */
  record(key: string): void {
    const now = Date.now();
    const timestamps = this.counters.get(key);
    if (timestamps) {
      timestamps.push(now);
    } else {
      this.counters.set(key, [now]);
    }
  }

  /** Check whether the key has exceeded the rate limit. */
  isExceeded(key: string): boolean {
    return this.getCount(key) > this.maxCount;
  }

  /** Get the number of events within the current window for a key. */
  getCount(key: string): number {
    const timestamps = this.counters.get(key);
    if (!timestamps) return 0;
    const cutoff = Date.now() - this.windowMs;
    // Prune old entries while counting.
    const recent = timestamps.filter((t) => t >= cutoff);
    this.counters.set(key, recent);
    return recent.length;
  }

  private pruneAll(): void {
    const cutoff = Date.now() - this.windowMs;
    for (const [key, timestamps] of this.counters) {
      const recent = timestamps.filter((t) => t >= cutoff);
      if (recent.length === 0) {
        this.counters.delete(key);
      } else {
        this.counters.set(key, recent);
      }
    }
  }
}
