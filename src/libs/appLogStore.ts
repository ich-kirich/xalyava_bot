import TransportStream from "winston-transport";
import { Op, WhereOptions } from "sequelize";
import AppLog from "../models/appLog";
import {
  LOG_DEDUP_MS,
  LOG_LIST_DEFAULT,
  LOG_LIST_MAX,
  LOG_MESSAGE_MAX,
  LOG_QUEUE_LIMIT,
  LOG_RETENTION_DAYS,
  LOG_STACK_MAX,
} from "./constants";

type PersistedLevel = "warn" | "error";

export type AppLogMeta = {
  status?: number;
  stack?: string;
};

export type AppLogEntry = {
  level: PersistedLevel;
  message: string;
  meta: AppLogMeta | null;
};

export type AppLogDto = {
  id: number;
  level: string;
  message: string;
  meta: AppLogMeta | null;
  createdAt: Date;
};

export type AppLogsPage = {
  items: AppLogDto[];
  nextCursor: number | null;
};

const SPLAT = Symbol.for("splat");

let ready = false;
const queue: AppLogEntry[] = [];
let lastWrite: { key: string; at: number } | null = null;

export function clipLogText(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
}

function compactError(value: unknown): AppLogMeta | null {
  if (!(value instanceof Error)) {
    return null;
  }
  const err = value as Error & { status?: number };
  const meta: AppLogMeta = {};
  if (typeof err.status === "number") {
    meta.status = err.status;
  }
  if (err.stack) {
    meta.stack = clipLogText(err.stack, LOG_STACK_MAX);
  }
  return Object.keys(meta).length > 0 ? meta : null;
}

export function serializeLogMeta(
  info: Record<string | symbol, unknown>,
): AppLogMeta | null {
  const splat = info[SPLAT];
  if (Array.isArray(splat)) {
    for (const item of splat) {
      const fromError = compactError(item);
      if (fromError) {
        return fromError;
      }
    }
  }
  const fromInfo = compactError(info);
  if (fromInfo) {
    return fromInfo;
  }
  const { status, stack } = info as {
    status?: unknown;
    stack?: unknown;
  };
  const meta: AppLogMeta = {};
  if (typeof status === "number") {
    meta.status = status;
  }
  if (typeof stack === "string" && stack.length > 0) {
    meta.stack = clipLogText(stack, LOG_STACK_MAX);
  }
  return Object.keys(meta).length > 0 ? meta : null;
}

function enqueue(entry: AppLogEntry): void {
  if (queue.length >= LOG_QUEUE_LIMIT) {
    queue.shift();
  }
  queue.push(entry);
}

function isDuplicate(
  level: PersistedLevel,
  message: string,
  now: number,
): boolean {
  const key = `${level}:${message}`;
  if (lastWrite && lastWrite.key === key && now - lastWrite.at < LOG_DEDUP_MS) {
    return true;
  }
  lastWrite = { key, at: now };
  return false;
}

export function persistAppLog(
  level: string,
  message: string,
  meta: AppLogMeta | null,
): void {
  if (level !== "error") {
    return;
  }
  const entry: AppLogEntry = {
    level,
    message: clipLogText(message, LOG_MESSAGE_MAX),
    meta,
  };
  if (isDuplicate(entry.level, entry.message, Date.now())) {
    return;
  }
  if (!ready) {
    enqueue(entry);
    return;
  }
  void AppLog.create(entry).catch(() => undefined);
}

export async function enableAppLogPersistence(): Promise<void> {
  ready = true;
  const pending = queue.splice(0);
  for (const entry of pending) {
    try {
      await AppLog.create(entry);
    } catch {
      // Writing logs must not break startup.
    }
  }
}

export async function pruneAppLogs(now = new Date()): Promise<void> {
  const cutoff = new Date(
    now.getTime() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  await AppLog.destroy({
    where: {
      createdAt: {
        [Op.lt]: cutoff,
      },
    },
  });
}

export function parseLogLimit(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    return LOG_LIST_DEFAULT;
  }
  return Math.min(Math.floor(n), LOG_LIST_MAX);
}

export function parseLogLevel(
  raw: string | undefined,
): PersistedLevel | undefined {
  if (raw === "warn" || raw === "error") {
    return raw;
  }
  return undefined;
}

export function parseBeforeId(raw: string | undefined): number | undefined {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    return undefined;
  }
  return Math.floor(n);
}

function toDto(row: AppLog): AppLogDto {
  return {
    id: row.id,
    level: row.level,
    message: row.message,
    meta: row.meta as AppLogMeta | null,
    createdAt: row.createdAt,
  };
}

export async function queryAppLogs(options: {
  limit: number;
  level?: PersistedLevel;
  beforeId?: number;
}): Promise<AppLogsPage> {
  const where: WhereOptions = {};
  if (options.level) {
    where.level = options.level;
  }
  if (options.beforeId) {
    where.id = { [Op.lt]: options.beforeId };
  }
  const rows = await AppLog.findAll({
    where,
    order: [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
    limit: options.limit,
    attributes: ["id", "level", "message", "meta", "createdAt"],
  });
  return {
    items: rows.map(toDto),
    nextCursor: rows.length === options.limit ? rows[rows.length - 1].id : null,
  };
}

export class PostgresLogTransport extends TransportStream {
  log(info: Record<string | symbol, unknown>, callback: () => void): void {
    setImmediate(() => this.emit("logged", info));
    const level = String(info.level ?? "");
    if (level === "error") {
      persistAppLog(level, String(info.message ?? ""), serializeLogMeta(info));
    }
    callback();
  }
}

export function resetAppLogPersistenceForTests(): void {
  ready = false;
  queue.length = 0;
  lastWrite = null;
}

export function queuedAppLogsForTests(): AppLogEntry[] {
  return [...queue];
}
