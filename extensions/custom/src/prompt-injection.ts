import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { InjectionSeverity } from "./patterns.js";
import { logAudit } from "./audit-logger.js";
import { recordInjection } from "./injection-store.js";
import { INJECTION_PATTERNS_WITH_SEVERITY } from "./patterns.js";

const SEVERITY_RANK: Record<InjectionSeverity, number> = { high: 3, medium: 2, low: 1 };

export function registerPromptInjectionDetection(api: OpenClawPluginApi): void {
  api.on("message_received", (event, ctx) => {
    const content = event.content;
    if (!content) return;

    let highestSeverity: InjectionSeverity | undefined;
    const matches: Array<{ label: string; severity: InjectionSeverity }> = [];

    // Check all patterns — find highest severity.
    for (const { pattern, label, severity } of INJECTION_PATTERNS_WITH_SEVERITY) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        matches.push({ label, severity });
        if (!highestSeverity || SEVERITY_RANK[severity] > SEVERITY_RANK[highestSeverity]) {
          highestSeverity = severity;
        }
      }
    }

    if (matches.length === 0) return;

    // Record to in-memory store for downstream hooks.
    recordInjection({
      from: event.from,
      channelId: ctx.channelId,
      label: matches.map((m) => m.label).join(", "),
      severity: highestSeverity!,
      timestamp: event.timestamp ?? Date.now(),
    });

    logAudit("prompt_injection_detected", {
      from: event.from,
      severity: highestSeverity,
      patterns: matches.map((m) => m.label),
      matchCount: matches.length,
      contentPreview: content.slice(0, 200),
      channel: ctx.channelId,
      timestamp: event.timestamp ?? Date.now(),
    });

    api.logger.warn(
      `[security] Prompt injection detected (${highestSeverity}) from ${event.from}: ${matches.map((m) => m.label).join(", ")}`,
    );
  });
}
