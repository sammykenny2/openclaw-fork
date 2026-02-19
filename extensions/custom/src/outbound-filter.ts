import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { logAudit } from "./audit-logger.js";
import { hasRecentHighSeverityInjection } from "./injection-store.js";
import { COMPLIANCE_LEAK_PATTERNS, SENSITIVE_DATA_PATTERNS } from "./patterns.js";

function redactContent(content: string): { redacted: string; matchCount: number } {
  let result = content;
  let matchCount = 0;

  for (const pattern of SENSITIVE_DATA_PATTERNS) {
    // Clone the regex to reset lastIndex for each invocation.
    const re = new RegExp(pattern.source, pattern.flags);
    const before = result;
    result = result.replace(re, "[REDACTED]");
    if (result !== before) {
      matchCount++;
    }
  }

  return { redacted: result, matchCount };
}

function matchesComplianceLeak(content: string): string | undefined {
  for (const pattern of COMPLIANCE_LEAK_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    if (re.test(content)) {
      return pattern.source;
    }
  }
  return undefined;
}

export function registerOutboundFilter(api: OpenClawPluginApi): void {
  api.on(
    "message_sending",
    (event, ctx) => {
      const { redacted, matchCount } = redactContent(event.content);

      if (matchCount > 0) {
        logAudit("outbound_redacted", {
          to: event.to,
          matchCount,
          channel: ctx.channelId,
          contentLengthBefore: event.content.length,
          contentLengthAfter: redacted.length,
        });
        api.logger.warn(
          `[security] Redacted ${matchCount} sensitive pattern(s) from outbound message`,
        );
      }

      // Check for injection compliance leaks if high-severity injection was recent.
      const contentToCheck = matchCount > 0 ? redacted : event.content;
      if (hasRecentHighSeverityInjection()) {
        const leakPattern = matchesComplianceLeak(contentToCheck);
        if (leakPattern) {
          logAudit("outbound_compliance_leak_blocked", {
            to: event.to,
            channel: ctx.channelId,
            leakPattern,
            contentPreview: contentToCheck.slice(0, 200),
          });
          api.logger.warn(
            "[security] Blocked outbound message — suspected injection compliance leak",
          );
          return { cancel: true };
        }
      }

      if (matchCount > 0) {
        return { content: redacted };
      }
    },
    { priority: 100 },
  );
}
