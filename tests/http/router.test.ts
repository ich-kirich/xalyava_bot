import TelegramBot from "node-telegram-bot-api";
import { dispatch, RouterDeps } from "../../src/http/router";
import { createRuntime } from "../../src/http/runtime";
import { createMailingJob } from "../../src/libs/mailingJob";
import { pruneAppLogs, queryAppLogs } from "../../src/libs/appLogStore";

jest.mock("../../src/libs/appLogStore", () => {
  const actual = jest.requireActual("../../src/libs/appLogStore");
  return {
    ...actual,
    pruneAppLogs: jest.fn().mockResolvedValue(undefined),
    queryAppLogs: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
  };
});

function deps(overrides: Partial<RouterDeps> = {}): RouterDeps {
  const runtime = createRuntime();
  runtime.ready = true;
  runtime.bot = {
    processUpdate: jest.fn(),
  } as unknown as TelegramBot;
  return {
    runtime,
    webhookSecret: "webhook-secret",
    cronSecret: "cron-secret",
    mailingJob: createMailingJob(),
    startMailing: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("dispatch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test("POST /telegram/webhook waits until the bot is ready", async () => {
    const runtime = createRuntime();
    const routerDeps = deps({
      runtime,
      readyWaitMs: 500,
    });
    setTimeout(() => {
      runtime.bot = {
        processUpdate: jest.fn(),
      } as unknown as TelegramBot;
      runtime.ready = true;
    }, 80);
    const result = await dispatch(
      {
        method: "POST",
        pathname: "/telegram/webhook",
        headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
        body: JSON.stringify({ update_id: 2 }),
      },
      routerDeps,
    );
    expect(result.status).toBe(200);
    expect(runtime.bot?.processUpdate).toHaveBeenCalledWith({ update_id: 2 });
  });

  test("POST /telegram/webhook returns 503 when not ready", async () => {
    const routerDeps = deps({
      runtime: { bot: null, ready: false },
      readyWaitMs: 30,
    });
    const result = await dispatch(
      {
        method: "POST",
        pathname: "/telegram/webhook",
        headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
        body: "{}",
      },
      routerDeps,
    );
    expect(result.status).toBe(503);
  });

  test("POST /telegram/webhook rejects a bad secret", async () => {
    const routerDeps = deps();
    const result = await dispatch(
      {
        method: "POST",
        pathname: "/telegram/webhook",
        headers: { "X-Telegram-Bot-Api-Secret-Token": "wrong" },
        body: "{}",
      },
      routerDeps,
    );
    expect(result.status).toBe(401);
  });

  test("POST /telegram/webhook processes an update", async () => {
    const routerDeps = deps();
    const result = await dispatch(
      {
        method: "POST",
        pathname: "/telegram/webhook/",
        headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
        body: JSON.stringify({ update_id: 1 }),
      },
      routerDeps,
    );
    expect(result.status).toBe(200);
    expect(routerDeps.runtime.bot?.processUpdate).toHaveBeenCalledWith({
      update_id: 1,
    });
  });

  test("GET /cron/send rejects a bad secret", async () => {
    const result = await dispatch(
      {
        method: "GET",
        pathname: "/cron/send",
        headers: { "X-Cron-Secret": "wrong" },
        body: "",
      },
      deps(),
    );
    expect(result.status).toBe(401);
  });

  test("GET /cron/send returns 503 when not ready", async () => {
    const result = await dispatch(
      {
        method: "GET",
        pathname: "/cron/send",
        headers: { "X-Cron-Secret": "cron-secret" },
        body: "",
      },
      deps({
        runtime: { bot: null, ready: false },
        cronReadyWaitMs: 30,
      }),
    );
    expect(result.status).toBe(503);
  });

  test("GET /cron/send starts mailing in the background", async () => {
    let finish: () => void = () => undefined;
    const startMailing = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const routerDeps = deps({ startMailing });
    const result = await dispatch(
      {
        method: "GET",
        pathname: "/cron/send",
        headers: { "X-Cron-Secret": "cron-secret" },
        body: "",
      },
      routerDeps,
    );
    expect(result.status).toBe(202);
    expect(JSON.parse(result.body)).toEqual({ ok: true, status: "started" });
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(startMailing).toHaveBeenCalledTimes(1);

    const running = await dispatch(
      {
        method: "POST",
        pathname: "/cron/send",
        headers: { "X-Cron-Secret": "cron-secret" },
        body: "",
      },
      routerDeps,
    );
    expect(running.status).toBe(200);
    expect(JSON.parse(running.body)).toEqual({
      ok: true,
      status: "already_running",
    });

    finish();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    const sent = await dispatch(
      {
        method: "GET",
        pathname: "/cron/send",
        headers: { "X-Cron-Secret": "cron-secret" },
        body: "",
      },
      routerDeps,
    );
    expect(sent.status).toBe(200);
    expect(JSON.parse(sent.body)).toEqual({
      ok: true,
      status: "already_sent",
    });
    expect(startMailing).toHaveBeenCalledTimes(1);
  });

  test("GET /cron/send prunes old logs before mailing", async () => {
    const startMailing = jest.fn().mockResolvedValue(undefined);
    await dispatch(
      {
        method: "GET",
        pathname: "/cron/send",
        headers: { "X-Cron-Secret": "cron-secret" },
        body: "",
      },
      deps({ startMailing }),
    );
    expect(pruneAppLogs).toHaveBeenCalledTimes(1);
  });

  test("GET /logs rejects a bad secret", async () => {
    const result = await dispatch(
      {
        method: "GET",
        pathname: "/logs",
        headers: { "X-Cron-Secret": "wrong" },
        body: "",
      },
      deps(),
    );
    expect(result.status).toBe(401);
    expect(queryAppLogs).not.toHaveBeenCalled();
  });

  test("GET /logs returns a page for an admin screen", async () => {
    const createdAt = new Date("2026-09-15T10:00:00.000Z");
    (queryAppLogs as jest.Mock).mockResolvedValueOnce({
      items: [
        {
          id: 3,
          level: "error",
          message: "boom",
          meta: { status: 500 },
          createdAt,
        },
      ],
      nextCursor: null,
    });
    const result = await dispatch(
      {
        method: "GET",
        pathname: "/logs",
        headers: { "X-Cron-Secret": "cron-secret" },
        body: "",
        searchParams: { limit: "20", level: "error", beforeId: "40" },
      },
      deps(),
    );
    expect(result.status).toBe(200);
    expect(queryAppLogs).toHaveBeenCalledWith({
      limit: 20,
      level: "error",
      beforeId: 40,
    });
    expect(JSON.parse(result.body)).toEqual({
      items: [
        {
          id: 3,
          level: "error",
          message: "boom",
          meta: { status: 500 },
          createdAt: createdAt.toISOString(),
        },
      ],
      nextCursor: null,
    });
  });
});
