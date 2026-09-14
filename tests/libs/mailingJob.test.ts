import { createMailingJob } from "../../src/libs/mailingJob";

describe("createMailingJob", () => {
  test("starts once and marks the calendar day as sent", async () => {
    const now = new Date("2026-09-14T12:00:00+03:00");
    const job = createMailingJob({
      timeZone: "Europe/Moscow",
      now: () => now,
    });
    let finish: (error?: Error) => void = () => undefined;
    const run = jest.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          finish = (error?: Error) => (error ? reject(error) : resolve());
        }),
    );

    expect(job.start(run)).toBe("started");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(job.start(run)).toBe("already_running");
    finish();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(job.status()).toBe("already_sent");
    expect(job.start(run)).toBe("already_sent");
    expect(run).toHaveBeenCalledTimes(1);
  });

  test("allows a retry after a failed run", async () => {
    const job = createMailingJob({
      now: () => new Date("2026-09-14T12:00:00+03:00"),
    });
    const run = jest
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);

    expect(job.start(run)).toBe("started");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(job.status()).toBe("idle");
    expect(job.start(run)).toBe("started");
  });
});
