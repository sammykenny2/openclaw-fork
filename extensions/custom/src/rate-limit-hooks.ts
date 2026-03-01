import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { logAudit } from "./audit-logger.js";
import { SlidingWindowCounter } from "./rate-limiter.js";

const WINDOW_MS = 60_000; // 1 minute
const MAX_TOOL_CALLS = 30;
const MAX_OUTBOUND_MESSAGES = 20;

const toolCallLimiter = new SlidingWindowCounter(WINDOW_MS, MAX_TOOL_CALLS);
const outboundLimiter = new SlidingWindowCounter(WINDOW_MS, MAX_OUTBOUND_MESSAGES);
const inboundTracker = new SlidingWindowCounter(WINDOW_MS, Number.MAX_SAFE_INTEGER);

export function registerRateLimitHooks(api: OpenClawPluginApi): void {
  // Block tool calls exceeding 30/min per session.
  api.on(
    "before_tool_call",
    (_event, ctx) => {
      const key = ctx.sessionKey ?? "global";
      toolCallLimiter.record(key);

      if (toolCallLimiter.isExceeded(key)) {
        const reason = `Rate limit exceeded: >${MAX_TOOL_CALLS} tool calls/min for session ${key}`;
        logAudit("rate_limit_tool_call", {
          sessionKey: key,
          count: toolCallLimiter.getCount(key),
          agentId: ctx.agentId,
        });
        api.logger.warn(`[security] ${reason}`);
        return { block: true, blockReason: reason };
      }
    },
    { priority: 200 },
  );

  // Cancel outbound messages exceeding 20/min per channel.
  api.on(
    "message_sending",
    (_event, ctx) => {
      const key = ctx.channelId ?? "global";
      outboundLimiter.record(key);

      if (outboundLimiter.isExceeded(key)) {
        const reason = `Rate limit exceeded: >${MAX_OUTBOUND_MESSAGES} outbound messages/min for channel ${key}`;
        logAudit("rate_limit_outbound", {
          channelId: key,
          count: outboundLimiter.getCount(key),
        });
        api.logger.warn(`[security] ${reason}`);
        return { cancel: true };
      }
    },
    { priority: 200 },
  );

  // Track inbound message rate (observational only).
  api.on("message_received", (event, ctx) => {
    const key = `${ctx.channelId ?? "unknown"}:${event.from}`;
    inboundTracker.record(key);
  });
}
