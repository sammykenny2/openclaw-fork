import type { InjectionSeverity } from "./patterns.js";

export interface InjectionRecord {
  from: string;
  channelId: string;
  label: string;
  severity: InjectionSeverity;
  timestamp: number;
}

const MAX_ENTRIES = 50;
const DEFAULT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const buffer: InjectionRecord[] = [];

export function recordInjection(record: InjectionRecord): void {
  if (buffer.length >= MAX_ENTRIES) {
    buffer.shift();
  }
  buffer.push(record);
}

export function getRecentInjections(withinMs: number = DEFAULT_WINDOW_MS): InjectionRecord[] {
  const cutoff = Date.now() - withinMs;
  return buffer.filter((r) => r.timestamp >= cutoff);
}

export function hasRecentHighSeverityInjection(withinMs: number = DEFAULT_WINDOW_MS): boolean {
  const cutoff = Date.now() - withinMs;
  return buffer.some((r) => r.severity === "high" && r.timestamp >= cutoff);
}
