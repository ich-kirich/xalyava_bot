import config from "config";

export type SleepWindow = {
  start: string;
  end: string;
  timezone: string;
};

export function getSleepWindow(): SleepWindow {
  return {
    start: String(config.get("sleep.start")),
    end: String(config.get("sleep.end")),
    timezone: String(config.get("sleep.timezone")),
  };
}

export function getSleepDelayHint(window: SleepWindow = getSleepWindow()): string {
  return `С ${window.start} до ${window.end} (${window.timezone}) бот может долго отвечать`;
}
