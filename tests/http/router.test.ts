import { dispatch, RouterDeps } from "../../src/http/router";
import { createRuntime } from "../../src/http/runtime";
import TelegramBot from "node-telegram-bot-api";

function deps(overrides: Partial<RouterDeps> = {}): RouterDeps {
  const runtime = createRuntime();
  runtime.ready = true;
  runtime.bot = {
    processUpdate: jest.fn(),
  } as unknown as TelegramBot;
  return {
    runtime,
    webhookSecret: "webhook-secret",
    ...overrides,
  };
}

describe("dispatch", () => {
  test("GET /health returns ok while not ready", async () => {
    const routerDeps = deps({
      runtime: { bot: null, ready: false },
    });
    const result = await dispatch(
      { method: "GET", pathname: "/health", headers: {}, body: "" },
      routerDeps,
    );
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ ok: true, ready: false });
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
});
