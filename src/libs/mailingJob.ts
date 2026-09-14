import logger from "./logger";

export type MailingJobStatus = "idle" | "already_running" | "already_sent";

export type MailingStartResult = "started" | "already_running" | "already_sent";

export type MailingJob = {
  status: () => MailingJobStatus;
  start: (run: () => Promise<void>) => MailingStartResult;
};

function calendarDate(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function createMailingJob(options?: {
  timeZone?: string;
  now?: () => Date;
}): MailingJob {
  const timeZone = options?.timeZone ?? "Europe/Moscow";
  const now = options?.now ?? (() => new Date());
  let running = false;
  let completedOn: string | null = null;

  const today = () => calendarDate(now(), timeZone);

  const status = (): MailingJobStatus => {
    if (running) {
      return "already_running";
    }
    if (completedOn === today()) {
      return "already_sent";
    }
    return "idle";
  };

  const start = (run: () => Promise<void>): MailingStartResult => {
    const current = status();
    if (current !== "idle") {
      return current;
    }
    running = true;
    void Promise.resolve()
      .then(run)
      .then(() => {
        completedOn = today();
        logger.info("External cron mailing finished");
      })
      .catch((e) => {
        logger.error("External cron mailing failed", e);
      })
      .finally(() => {
        running = false;
      });
    return "started";
  };

  return { status, start };
}
