import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { registerAuditHooks } from "./src/audit-hooks.js";
import { registerOutboundFilter } from "./src/outbound-filter.js";
import { registerPromptInjectionDetection } from "./src/prompt-injection.js";
import { registerRateLimitHooks } from "./src/rate-limit-hooks.js";
import { registerSecurityPrompt } from "./src/security-prompt.js";
import { registerExtendedToolGating } from "./src/tool-gating-extended.js";
import { registerToolGating } from "./src/tool-gating.js";

const plugin = {
  id: "custom",
  name: "Custom Security",
  description:
    "Security auditing, tool gating, data leak prevention, rate limiting, and prompt injection detection",
  configSchema: emptyPluginConfigSchema(),

  register(api: OpenClawPluginApi) {
    registerRateLimitHooks(api);
    registerToolGating(api);
    registerExtendedToolGating(api);
    registerAuditHooks(api);
    registerOutboundFilter(api);
    registerPromptInjectionDetection(api);
    registerSecurityPrompt(api);

    api.logger.info("Custom security extension loaded");
  },
};

export default plugin;
