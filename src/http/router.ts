import { timingSafeEqual } from "crypto";
import TelegramBot, { Update } from "node-telegram-bot-api";
import logger from "../libs/logger";
import {
  parseBeforeId,
  parseLogLevel,
  parseLogLimit,
  pruneAppLogs,
  queryAppLogs,
} from "../libs/appLogStore";
import { MailingJob } from "../libs/mailingJob";
import { sendingPosts } from "../libs/sendingPosts";
import { BotRuntime, waitUntilReady } from "./runtime";

export const WEBHOOK_READY_WAIT_MS = 50000;
export const CRON_READY_WAIT_MS = 20000;

export type RouterRequest = {
  method: string;
  pathname: string;
  headers: Record<string, string | string[] | undefined>;
  body: string;
  searchParams?: Record<string, string>;
};

export type RouterResponse = {
  status: number;
  body: string;
  contentType: string;
};

export type RouterDeps = {
  runtime: BotRuntime;
  webhookSecret: string;
  cronSecret: string;
  readyWaitMs?: number;
  cronReadyWaitMs?: number;
  mailingJob: MailingJob;
  startMailing?: (bot: TelegramBot) => Promise<void>;
};

function json(status: number, payload: unknown): RouterResponse {
  return {
    status,
    body: JSON.stringify(payload),
    contentType: "application/json",
  };
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }
  return pathname.replace(/\/+$/, "") || "/";
}

function headerValue(headers: RouterRequest["headers"], name: string): string {
  const target = name.toLowerCase();
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === target,
  );
  if (!entry) {
    return "";
  }
  const value = entry[1];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export function secretsEqual(received: string, expected: string): boolean {
  if (!received || !expected) {
    return false;
  }
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function dispatch(
  request: RouterRequest,
  deps: RouterDeps,
): Promise<RouterResponse> {
  const pathname = normalizePath(request.pathname);
  const method = (request.method || "GET").toUpperCase();

  if (method === "GET" && pathname === "/health") {
    return json(200, { ok: true, ready: deps.runtime.ready });
  }

  if ((method === "GET" || method === "POST") && pathname === "/cron/send") {
    if (
      !secretsEqual(
        headerValue(request.headers, "X-Cron-Secret"),
        deps.cronSecret,
      )
    ) {
      return json(401, { ok: false, error: "unauthorized" });
    }
    const ready = await waitUntilReady(
      deps.runtime,
      deps.cronReadyWaitMs ?? CRON_READY_WAIT_MS,
    );
    if (!ready || !deps.runtime.bot) {
      return json(503, { ok: false, error: "not ready" });
    }
    try {
      await pruneAppLogs();
    } catch {
      // Mailing still runs if old logs cannot be deleted.
    }
    const { mailingJob } = deps;
    const startMailing = deps.startMailing ?? sendingPosts;
    const { bot } = deps.runtime;
    const result = mailingJob.start(() => startMailing(bot));
    if (result === "started") {
      return json(202, { ok: true, status: result });
    }
    return json(200, { ok: true, status: result });
  }

  if (method === "POST" && pathname === "/telegram/webhook") {
    if (
      !secretsEqual(
        headerValue(request.headers, "X-Telegram-Bot-Api-Secret-Token"),
        deps.webhookSecret,
      )
    ) {
      return json(401, { ok: false, error: "unauthorized" });
    }
    const ready = await waitUntilReady(
      deps.runtime,
      deps.readyWaitMs ?? WEBHOOK_READY_WAIT_MS,
    );
    if (!ready || !deps.runtime.bot) {
      return json(503, { ok: false, error: "not ready" });
    }
    let update: Update;
    try {
      update = JSON.parse(request.body) as Update;
    } catch (e) {
      logger.error("Invalid Telegram webhook payload", e);
      return json(400, { ok: false, error: "invalid json" });
    }
    deps.runtime.bot.processUpdate(update);
    return json(200, { ok: true });
  }

  if (method === "GET" && pathname === "/logs") {
    if (
      !secretsEqual(
        headerValue(request.headers, "X-Cron-Secret"),
        deps.cronSecret,
      )
    ) {
      return json(401, { ok: false, error: "unauthorized" });
    }
    try {
      const page = await queryAppLogs({
        limit: parseLogLimit(request.searchParams?.limit),
        level: parseLogLevel(request.searchParams?.level),
        beforeId: parseBeforeId(request.searchParams?.beforeId),
      });
      return json(200, page);
    } catch {
      return json(503, { ok: false, error: "not ready" });
    }
  }

  return json(404, { ok: false, error: "not found" });
}
