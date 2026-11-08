// Dangerous command patterns — matched against tool call command strings.
export const DANGEROUS_COMMAND_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // Destructive filesystem operations
  { pattern: /\brm\s+-[^\s]*r[^\s]*f[^\s]*\s+\//, label: "recursive force delete from root" },
  { pattern: /\brm\s+-[^\s]*f[^\s]*r[^\s]*\s+\//, label: "recursive force delete from root" },
  { pattern: /\bmkfs\b/, label: "filesystem format" },
  { pattern: /\bdd\s+if=/, label: "raw disk write" },
  { pattern: /:\(\)\s*\{\s*:\|:&\s*\}\s*;?\s*:/, label: "fork bomb" },

  // Remote code execution via piped download
  { pattern: /\bcurl\b[^|]*\|\s*(sh|bash|zsh)\b/, label: "curl pipe to shell" },
  { pattern: /\bwget\b[^|]*\|\s*(sh|bash|zsh)\b/, label: "wget pipe to shell" },
  { pattern: /\beval\s+\$\(\s*curl\b/, label: "eval curl" },

  // Credential access
  { pattern: /~\/\.openclaw\/credentials/, label: "openclaw credentials access" },
  { pattern: /~\/\.ssh\//, label: "SSH directory access" },
  { pattern: /~\/\.aws\//, label: "AWS credentials access" },
  { pattern: /~\/\.gnupg\//, label: "GPG keyring access" },
  { pattern: /\/etc\/shadow/, label: "/etc/shadow access" },

  // Permission abuse
  { pattern: /\bchmod\s+(-R\s+)?777\b/, label: "world-writable permission" },
  { pattern: /\bchown\s+root\b/, label: "chown to root" },

  // Network exfiltration (exec-based)
  { pattern: /\bnc\s+-e\b/, label: "netcat exec" },
  { pattern: /\bncat\s+-e\b/, label: "ncat exec" },

  // === Command obfuscation detection ===
  {
    pattern: /\becho\b.*\|\s*base64\s+-d\s*\|\s*(bash|sh|zsh)\b/,
    label: "base64 decode pipe to shell",
  },
  { pattern: /\becho\b.*\|\s*xxd\s+-r\s*\|\s*(bash|sh|zsh)\b/, label: "xxd decode pipe to shell" },
  { pattern: /\bprintf\s+['"]\\x.*\|\s*(bash|sh|zsh)\b/, label: "printf hex pipe to shell" },
  { pattern: /\beval\s+"\$\(\s*echo\b/, label: "eval echo subshell" },
  { pattern: /\beval\s+"\$\(\s*base64\b/, label: "eval base64 subshell" },
  {
    pattern: /\bpython3?\s+-c\s+['"].*\b(requests|socket|urllib|subprocess|os)\b/,
    label: "python inline with dangerous import",
  },
  { pattern: /\bperl\s+-e\s+['"].*\b(system|socket|exec)\b/, label: "perl inline exec" },
  { pattern: /\bruby\s+-e\s+['"].*\b(system|exec)\b/, label: "ruby inline exec" },

  // === Network exfiltration detection ===
  { pattern: /\bcurl\b.*\s+(-d|--data|--data-\w+)\s/, label: "curl POST data" },
  { pattern: /\bcurl\b.*\s+(-F|--form)\s/, label: "curl form upload" },
  { pattern: /\bcurl\b.*\s+(-T|--upload-file)\s/, label: "curl file upload" },
  { pattern: /\bwget\b.*\s+(--post-data|--post-file)\s/, label: "wget POST data" },
  { pattern: /\bscp\b.*\s+\S+@\S+:/, label: "scp to remote host" },
  { pattern: /\brsync\b.*\s+\S+@\S+:/, label: "rsync to remote host" },
  { pattern: /\brsync\b.*\s+\S+::/, label: "rsync daemon transfer" },
  { pattern: /\bssh\b.*\s+\S+@\S+/, label: "ssh outbound" },
  { pattern: /\bnc\b(?!.*\s+-l)\s+\S+\s+\d+/, label: "netcat outbound connection" },
  { pattern: /\bncat\b(?!.*\s+-l)\s+\S+\s+\d+/, label: "ncat outbound connection" },

  // === File path traversal — credential directories ===
  // $HOME / ~ style
  { pattern: /\$HOME\/\.ssh\//, label: "$HOME/.ssh access" },
  { pattern: /\$HOME\/\.aws\//, label: "$HOME/.aws access" },
  { pattern: /\$HOME\/\.openclaw\/credentials/, label: "$HOME/.openclaw/credentials access" },
  { pattern: /\$HOME\/\.gnupg\//, label: "$HOME/.gnupg access" },
  // /home/<user>/ style (Linux)
  { pattern: /\/home\/[^/]+\/\.ssh\//, label: "/home/<user>/.ssh access" },
  { pattern: /\/home\/[^/]+\/\.aws\//, label: "/home/<user>/.aws access" },
  { pattern: /\/home\/[^/]+\/\.gnupg\//, label: "/home/<user>/.gnupg access" },
  // /Users/<user>/ style (macOS)
  { pattern: /\/Users\/[^/]+\/\.ssh\//, label: "/Users/<user>/.ssh access" },
  { pattern: /\/Users\/[^/]+\/\.aws\//, label: "/Users/<user>/.aws access" },
  { pattern: /\/Users\/[^/]+\/\.gnupg\//, label: "/Users/<user>/.gnupg access" },
  // Windows paths (case-insensitive)
  { pattern: /C:\\Users\\[^\\]+\\\.ssh/i, label: "C:\\Users\\<user>\\.ssh access" },
  { pattern: /C:\\Users\\[^\\]+\\\.aws/i, label: "C:\\Users\\<user>\\.aws access" },
  { pattern: /C:\\Users\\[^\\]+\\\.gnupg/i, label: "C:\\Users\\<user>\\.gnupg access" },
  // %USERPROFILE% style (Windows env var)
  { pattern: /%USERPROFILE%\\\.ssh/i, label: "%USERPROFILE%\\.ssh access" },
  { pattern: /%USERPROFILE%\\\.aws/i, label: "%USERPROFILE%\\.aws access" },
  { pattern: /%USERPROFILE%\\\.gnupg/i, label: "%USERPROFILE%\\.gnupg access" },
];

// Tool names that execute shell commands.
export const COMMAND_TOOL_PATTERNS = /exec|bash|shell|command/i;

// Sensitive data patterns for outbound filtering.
// Mirrors DEFAULT_REDACT_PATTERNS from src/logging/redact.ts plus extras.
export const SENSITIVE_DATA_PATTERNS: RegExp[] = [
  // ENV-style assignments
  /\b[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD)\b\s*[=:]\s*(["']?)([^\s"'\\]+)\1/g,
  // JSON fields
  /"(?:apiKey|token|secret|password|passwd|accessToken|refreshToken)"\s*:\s*"([^"]+)"/g,
  // Authorization headers
  /Authorization\s*[:=]\s*Bearer\s+([A-Za-z0-9._\-+=]+)/g,
  /\bBearer\s+([A-Za-z0-9._\-+=]{18,})\b/g,
  // PEM blocks
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----/g,
  // Common token prefixes
  /\b(sk-[A-Za-z0-9_-]{8,})\b/g,
  /\b(ghp_[A-Za-z0-9]{20,})\b/g,
  /\b(github_pat_[A-Za-z0-9_]{20,})\b/g,
  /\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/g,
  /\b(xapp-[A-Za-z0-9-]{10,})\b/g,
  /\b(gsk_[A-Za-z0-9_-]{10,})\b/g,
  /\b(AIza[0-9A-Za-z\-_]{20,})\b/g,
  /\b(pplx-[A-Za-z0-9_-]{10,})\b/g,
  /\b(npm_[A-Za-z0-9]{10,})\b/g,
  /\b(\d{6,}:[A-Za-z0-9_-]{20,})\b/g,
  // Additional: IPv4:port (potential exfil endpoints)
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{2,5}\b/g,
];

// Prompt injection detection patterns (case-insensitive) — backward compat.
export const INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /ignore\s+(all\s+)?previous\s+instructions/i, label: "ignore previous instructions" },
  { pattern: /ignore\s+all\s+prior/i, label: "ignore all prior" },
  { pattern: /disregard\s+(the\s+)?above/i, label: "disregard above" },
  { pattern: /you\s+are\s+now\b/i, label: "role reassignment" },
  { pattern: /pretend\s+you\s+are\b/i, label: "role pretend" },
  { pattern: /act\s+as\s+if\b/i, label: "act as if" },
  { pattern: /system\s+prompt/i, label: "system prompt reference" },
  { pattern: /reveal\s+your\s+instructions/i, label: "instruction reveal" },
  { pattern: /show\s+me\s+your\s+prompt/i, label: "prompt reveal" },
  { pattern: /base64[:\s]+[A-Za-z0-9+/=]{40,}/i, label: "base64 instruction block" },
];

// Severity-aware injection patterns.
export type InjectionSeverity = "high" | "medium" | "low";

export const INJECTION_PATTERNS_WITH_SEVERITY: Array<{
  pattern: RegExp;
  label: string;
  severity: InjectionSeverity;
}> = [
  // High severity — direct instruction override / jailbreak
  {
    pattern: /ignore\s+(all\s+)?previous\s+instructions/i,
    label: "ignore previous instructions",
    severity: "high",
  },
  { pattern: /ignore\s+all\s+prior/i, label: "ignore all prior", severity: "high" },
  { pattern: /disregard\s+(the\s+)?above/i, label: "disregard above", severity: "high" },
  { pattern: /DAN\b.*jailbreak/i, label: "DAN jailbreak", severity: "high" },
  { pattern: /developer\s+mode\s+enabled/i, label: "developer mode enabled", severity: "high" },
  {
    pattern: /override\s+(all\s+)?(safety|security|guidelines)/i,
    label: "override safety",
    severity: "high",
  },
  {
    pattern: /forget\s+(everything|all|your\s+(instructions|rules|guidelines))/i,
    label: "forget instructions",
    severity: "high",
  },
  {
    pattern: /new\s+(instructions|rules|persona)\s*[:=]/i,
    label: "new instructions assignment",
    severity: "high",
  },
  {
    pattern: /base64[:\s]+[A-Za-z0-9+/=]{40,}/i,
    label: "base64 instruction block",
    severity: "high",
  },

  // Medium severity — role manipulation
  { pattern: /you\s+are\s+now\b/i, label: "role reassignment", severity: "medium" },
  { pattern: /pretend\s+you\s+are\b/i, label: "role pretend", severity: "medium" },
  { pattern: /act\s+as\s+if\b/i, label: "act as if", severity: "medium" },
  {
    pattern: /don'?t\s+mention\s+(that|this|the\s+above)/i,
    label: "suppression instruction",
    severity: "medium",
  },

  // Low severity — information probing
  { pattern: /system\s+prompt/i, label: "system prompt reference", severity: "low" },
  { pattern: /reveal\s+your\s+instructions/i, label: "instruction reveal", severity: "low" },
  { pattern: /show\s+me\s+your\s+prompt/i, label: "prompt reveal", severity: "low" },
];

// Suspicious URL patterns for browser/web_fetch tool gating.
export const SUSPICIOUS_URL_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // Non-HTTPS (except localhost)
  { pattern: /^http:\/\/(?!localhost|127\.0\.0\.1)/, label: "non-HTTPS URL" },
  // IP-based URLs (not localhost)
  { pattern: /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, label: "IP-based URL" },
  // Known exfiltration services
  { pattern: /requestbin\.\w+/i, label: "requestbin exfil service" },
  { pattern: /webhook\.site/i, label: "webhook.site exfil service" },
  { pattern: /ngrok\.\w+/i, label: "ngrok tunnel" },
  { pattern: /pipedream\.\w+/i, label: "pipedream exfil service" },
  { pattern: /hookbin\.\w+/i, label: "hookbin exfil service" },
  { pattern: /burpcollaborator\.\w+/i, label: "burp collaborator" },
  { pattern: /interact\.sh/i, label: "interactsh exfil service" },
  { pattern: /oastify\.\w+/i, label: "oastify exfil service" },
];

// Exfiltration via long base64 in query parameters.
export const EXFIL_QUERY_PATTERN = /[?&]\w+=[\w+/=]{100,}/;

// Compliance leak patterns — detect agent echoing system prompt or complying with injection.
export const COMPLIANCE_LEAK_PATTERNS: RegExp[] = [
  /\[SECURITY POLICY\]/i,
  /\[ACTIVE INJECTION ALERT\]/i,
  /my\s+(system\s+)?instructions\s+(are|say|tell)/i,
  /here\s+(are|is)\s+my\s+(system\s+)?prompt/i,
  /as\s+instructed,?\s+I\s+will\s+(now\s+)?ignore/i,
  /I('?m|\s+am)\s+now\s+in\s+developer\s+mode/i,
  /DAN\s+mode\s+(activated|enabled)/i,
  /sure,?\s+I('?ll|\s+will)\s+(ignore|disregard|forget)\s+(my|the|all)\s+(rules|instructions|guidelines)/i,
];
