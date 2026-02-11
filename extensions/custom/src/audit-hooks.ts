import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { logAudit } from "./audit-logger.js";

function summarizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key === "command" && typeof value === "string") {
      summary[key] = value.slice(0, 500);
    } else if (typeof value === "string") {
      summary[key] = `string(${value.length})`;
    } else if (Array.isArray(value)) {
      summary[key] = `array(${value.length})`;
    } else if (value && typeof value === "object") {
      summary[key] = `object(${Object.keys(value).length} keys)`;
    } else {
      summary[key] = typeof value;
    }
  }
  return summary;
}

export function registerAuditHooks(api: OpenClawPluginApi): void {
  api.on("message_received", (event, ctx) => {
    logAudit("message_received", {
      from: event.from,
      contentLength: event.content.length,
      contentPreview: event.content.slice(0, 200),
      channel: ctx.channelId,
      timestamp: event.timestamp ?? Date.now(),
    });
  });

  api.on("after_tool_call", (event, ctx) => {
    logAudit("tool_call_executed", {
      toolName: event.toolName,
      params: summarizeParams(event.params),
      durationMs: event.durationMs,
      error: event.error,
      agentId: ctx.agentId,
      sessionKey: ctx.sessionKey,
    });
  });
}
