import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { logAudit } from "./audit-logger.js";
import { EXFIL_QUERY_PATTERN, SUSPICIOUS_URL_PATTERNS } from "./patterns.js";

function isSuspiciousUrl(url: string): string | undefined {
  for (const { pattern, label } of SUSPICIOUS_URL_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(url)) {
      return label;
    }
  }
  return undefined;
}

function hasExfilQuery(url: string): boolean {
  EXFIL_QUERY_PATTERN.lastIndex = 0;
  return EXFIL_QUERY_PATTERN.test(url);
}

export function registerExtendedToolGating(api: OpenClawPluginApi): void {
  api.on(
    "before_tool_call",
    (event, ctx) => {
      const { toolName, params } = event;

      // === Browser tool gating ===
      if (toolName === "browser") {
        const action = typeof params.action === "string" ? params.action : undefined;
        const request = params.request as Record<string, unknown> | undefined;

        // Block action="act" with kind="evaluate" unconditionally (JS eval = exfil vector).
        if (action === "act" && request?.kind === "evaluate") {
          const reason = "Blocked browser JS evaluation (exfiltration vector)";
          logAudit("tool_call_blocked", {
            toolName,
            action,
            kind: "evaluate",
            agentId: ctx.agentId,
            sessionKey: ctx.sessionKey,
          });
          api.logger.warn(`[security] ${reason}`);
          return { block: true, blockReason: reason };
        }

        // Block action="navigate" to suspicious URLs.
        if (action === "navigate") {
          const url = typeof params.url === "string" ? params.url : undefined;
          if (url) {
            const suspiciousLabel = isSuspiciousUrl(url);
            if (suspiciousLabel) {
              const reason = `Blocked browser navigation to suspicious URL (${suspiciousLabel}): ${url.slice(0, 200)}`;
              logAudit("tool_call_blocked", {
                toolName,
                action,
                url: url.slice(0, 500),
                pattern: suspiciousLabel,
                agentId: ctx.agentId,
                sessionKey: ctx.sessionKey,
              });
              api.logger.warn(`[security] ${reason}`);
              return { block: true, blockReason: reason };
            }
          }
        }
      }

      // === web_fetch tool gating ===
      if (toolName === "web_fetch") {
        const url = typeof params.url === "string" ? params.url : undefined;
        if (url) {
          const suspiciousLabel = isSuspiciousUrl(url);
          if (suspiciousLabel) {
            const reason = `Blocked web_fetch to suspicious URL (${suspiciousLabel}): ${url.slice(0, 200)}`;
            logAudit("tool_call_blocked", {
              toolName,
              url: url.slice(0, 500),
              pattern: suspiciousLabel,
              agentId: ctx.agentId,
              sessionKey: ctx.sessionKey,
            });
            api.logger.warn(`[security] ${reason}`);
            return { block: true, blockReason: reason };
          }

          if (hasExfilQuery(url)) {
            const reason = `Blocked web_fetch with suspicious base64 query parameter (possible exfiltration): ${url.slice(0, 200)}`;
            logAudit("tool_call_blocked", {
              toolName,
              url: url.slice(0, 500),
              pattern: "exfil_query_base64",
              agentId: ctx.agentId,
              sessionKey: ctx.sessionKey,
            });
            api.logger.warn(`[security] ${reason}`);
            return { block: true, blockReason: reason };
          }
        }
      }

      // === message tool — audit only ===
      if (toolName === "message") {
        logAudit("cross_channel_message", {
          toolName,
          to: typeof params.to === "string" ? params.to : undefined,
          channel: typeof params.channel === "string" ? params.channel : undefined,
          agentId: ctx.agentId,
          sessionKey: ctx.sessionKey,
        });
      }
    },
    { priority: 100 },
  );
}
