import { timingSafeEqual } from "crypto";
import { Update } from "node-telegram-bot-api";
import logger from "../libs/logger";
import { BotRuntime, waitUntilReady } from "./runtime";

export const WEBHOOK_READY_WAIT_MS = 50000;

export type RouterRequest = {
  method: string;
  pathname: string;
  headers: Record<string, string | string[] | undefined>;
  body: string;
};

export type RouterResponse = {
  status: number;
  body: string;
  contentType: string;
};

export type RouterDeps = {
  runtime: BotRuntime;
  webhookSecret: string;
  readyWaitMs?: number;
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

function headerValue(
  headers: RouterRequest["headers"],
  name: string,
): string {
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

  return json(404, { ok: false, error: "not found" });
}
