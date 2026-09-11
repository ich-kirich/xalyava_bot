import TelegramBot from "node-telegram-bot-api";

export type BotRuntime = {
  bot: TelegramBot | null;
  ready: boolean;
};

export function createRuntime(): BotRuntime {
  return {
    bot: null,
    ready: false,
  };
}

export async function waitUntilReady(
  runtime: BotRuntime,
  timeoutMs: number,
  intervalMs = 50,
): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (runtime.ready && runtime.bot) {
      return true;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }
  return Boolean(runtime.ready && runtime.bot);
}
