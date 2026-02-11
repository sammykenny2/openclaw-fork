import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

const LOG_DIR = join(homedir(), ".openclaw", "logs");
const LOG_PREFIX = "security-audit";
const LOG_SUFFIX = ".jsonl";
const MAX_LOG_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

let dirEnsured = false;
let pruneDone = false;

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayLogPath(): string {
  return join(LOG_DIR, `${LOG_PREFIX}-${formatLocalDate(new Date())}${LOG_SUFFIX}`);
}

function ensureDir(): void {
  if (dirEnsured) return;
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
  dirEnsured = true;
}

function pruneOldLogs(): void {
  if (pruneDone) return;
  pruneDone = true;
  try {
    const entries = readdirSync(LOG_DIR, { withFileTypes: true });
    const cutoff = Date.now() - MAX_LOG_AGE_MS;
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.startsWith(`${LOG_PREFIX}-`) || !entry.name.endsWith(LOG_SUFFIX)) continue;
      const fullPath = join(LOG_DIR, entry.name);
      try {
        const stat = statSync(fullPath);
        if (stat.mtimeMs < cutoff) {
          rmSync(fullPath, { force: true });
        }
      } catch {
        // ignore per-file errors during pruning
      }
    }
  } catch {
    // ignore missing dir or read errors
  }
}

function rotateIfNeeded(filePath: string): string {
  try {
    const stat = statSync(filePath);
    if (stat.size >= MAX_FILE_SIZE) {
      const base = basename(filePath, LOG_SUFFIX);
      const rotated = join(LOG_DIR, `${base}.1${LOG_SUFFIX}`);
      renameSync(filePath, rotated);
    }
  } catch {
    // file doesn't exist yet or stat error — no rotation needed
  }
  return filePath;
}

export function logAudit(event: string, payload: Record<string, unknown>): void {
  ensureDir();
  pruneOldLogs();
  const filePath = rotateIfNeeded(todayLogPath());
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), event, ...payload });
  appendFileSync(filePath, `${entry}\n`, "utf8");
}
