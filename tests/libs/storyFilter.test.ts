import { isRealStory } from "../../src/libs/storyFilter";

describe("isRealStory", () => {
  test("rejects an empty advertising placeholder", () => {
    const html = `
      <div class="story__main story__placeholder">
        <div id="adfox_d_feed_all_1_1_1"></div>
      </div>
    `;

    expect(isRealStory(html)).toBe(false);
  });

  test("accepts a story with a title and content", () => {
    const html = `
      <div class="story__main">
        <a class="story__title-link" href="https://example.com/post">
          Post title
        </a>
        <div class="story__content-inner">Post content</div>
      </div>
    `;

    expect(isRealStory(html)).toBe(true);
  });
});
