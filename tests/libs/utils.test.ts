import { splitHtmlText } from "../../src/libs/utils";

describe("splitHtmlText", () => {
  test("keeps a short message as one chunk", () => {
    expect(splitHtmlText("short")).toEqual(["short"]);
  });

  test("splits a long message on newlines", () => {
    const first = "a".repeat(100);
    const second = "b".repeat(100);
    expect(splitHtmlText(`${first}\n${second}`, 150)).toEqual([first, second]);
  });

  test("prefers a paragraph boundary", () => {
    const first = "a".repeat(60);
    const second = `${"b".repeat(30)}\n${"c".repeat(30)}`;
    expect(splitHtmlText(`${first}\n\n${second}`, 100)).toEqual([
      first,
      second,
    ]);
  });

  test("does not split inside a tag or an element that fits", () => {
    const prefix = "x".repeat(20);
    const link = '<a href="https://example.com/url">title</a>';
    const chunks = splitHtmlText(`${prefix} ${link}`, 45);
    expect(chunks).toEqual([prefix, link]);
  });

  test("closes and reopens a tag that is longer than the limit", () => {
    const bold = `<b>${"y".repeat(60)}</b>`;
    const chunks = splitHtmlText(bold, 45);
    chunks.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(45);
      expect(chunk.startsWith("<b>")).toBe(true);
      expect(chunk.endsWith("</b>")).toBe(true);
    });
    expect(chunks.join("").replace(/<\/b><b>/g, "")).toBe(bold);
  });

  test("never leaves an unfinished tag in a chunk", () => {
    const paragraph = `<b>${"a".repeat(50)}</b> ${"b".repeat(50)}`;
    const text = Array.from({ length: 5 }, () => paragraph).join("\n\n");
    const chunks = splitHtmlText(text, 200);
    chunks.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(200);
      expect(chunk.split("<b>").length).toBe(chunk.split("</b>").length);
      expect(chunk.lastIndexOf("<")).toBeLessThan(chunk.lastIndexOf(">") + 1);
    });
  });
});
