import { splitTelegramText } from "../../src/libs/utils";

describe("splitTelegramText", () => {
  test("keeps a short message as one chunk", () => {
    expect(splitTelegramText("short")).toEqual(["short"]);
  });

  test("splits a long message on newlines", () => {
    const first = "a".repeat(100);
    const second = "b".repeat(100);
    expect(splitTelegramText(`${first}\n${second}`, 150)).toEqual([
      first,
      second,
    ]);
  });

  test("does not split inside a markdown link", () => {
    const prefix = "x".repeat(20);
    const link = "[title](https://example.com/very-long-url)";
    const chunks = splitTelegramText(`${prefix}${link}`, 30);
    expect(chunks[0].includes("[title]")).toBe(false);
    expect(chunks.join("")).toContain(link);
  });
});
