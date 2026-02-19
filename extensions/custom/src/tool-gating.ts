import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { logAudit } from "./audit-logger.js";
import { COMMAND_TOOL_PATTERNS, DANGEROUS_COMMAND_PATTERNS } from "./patterns.js";

export function registerToolGating(api: OpenClawPluginApi): void {
  api.on(
    "before_tool_call",
    (event, ctx) => {
      const { toolName, params } = event;

      // Only inspect tools that execute commands.
      if (!COMMAND_TOOL_PATTERNS.test(toolName)) {
        return;
      }

      const command = typeof params.command === "string" ? params.command : undefined;
      if (!command) return;

      for (const { pattern, label } of DANGEROUS_COMMAND_PATTERNS) {
        // Reset lastIndex for stateful regexps (global flag).
        pattern.lastIndex = 0;
        if (pattern.test(command)) {
          const reason = `Blocked dangerous command (${label}): ${command.slice(0, 200)}`;
          logAudit("tool_call_blocked", {
            toolName,
            command: command.slice(0, 500),
            pattern: label,
            agentId: ctx.agentId,
            sessionKey: ctx.sessionKey,
          });
          api.logger.warn(`[security] ${reason}`);
          return { block: true, blockReason: reason };
        }
      }

      // Allowed — log the call for audit trail.
      logAudit("tool_call_allowed", {
        toolName,
        command: command.slice(0, 500),
        agentId: ctx.agentId,
        sessionKey: ctx.sessionKey,
      });
    },
    { priority: 100 },
  );
}
