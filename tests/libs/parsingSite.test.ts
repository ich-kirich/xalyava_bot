import { updatePosts } from "../../src/services/botServices";
import {
  addNamePost,
  addVideoLinks,
  deleteImages,
  extractImages,
  fixMarkdown,
  getLinksVideos,
  getPosts,
} from "../../src/libs/parsingSite";

jest.mock("../../src/services/botServices");

function story(
  id: number,
  inner = `<p>Content ${id}</p>`,
): string {
  return `
    <article class="story" data-story-id="${id}">
      <a class="story__title-link" href="https://example.com/${id}">
        Post ${id}
      </a>
      <div class="story__content-inner">${inner}</div>
    </article>
  `;
}

const advertisement = `
  <article class="story" data-story-id="999">
    <div class="story__main story__placeholder">
      <div id="adfox_d_feed_all_1_1_1"></div>
    </div>
  </article>
`;

describe("getLinksVideos", () => {
  test("reads data-source from .player and escapes markdown underscores", () => {
    const html = `
      <div class="player" data-source="https://cdn.example.com/video_1.mp4"></div>
      <div class="player" data-source="video2"></div>
      <div class="player"></div>
    `;

    expect(getLinksVideos(html)).toEqual([
      "https://cdn.example.com/video\\_1.mp4",
      "video2",
    ]);
  });
});

describe("getPosts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("extracts content-inner, videos and skips ads and already stored posts", async () => {
    const html = [
      advertisement,
      story(
        1,
        `
          <p>Giveaway 1</p>
          <div class="player" data-source="video1"></div>
        `,
      ),
      story(2, "<p>Giveaway 2</p>"),
    ].join("");
    (updatePosts as jest.Mock).mockResolvedValue([1]);

    const posts = await getPosts(html);

    expect(updatePosts).toHaveBeenCalledWith([1, 2]);
    expect(posts).toHaveLength(1);
    expect(posts[0].postId).toBe(1);
    expect(posts[0].postBlock).toContain("story__title-link");
    expect(posts[0].postContent).toContain("Giveaway 1");
    expect(posts[0].postContent).toContain('data-source="video1"');
    expect(posts[0].postContent).not.toContain("story__title-link");
    expect(posts[0].linksVideos).toEqual(["video1"]);
  });

  test("returns an empty array if there are no new posts", async () => {
    (updatePosts as jest.Mock).mockResolvedValue([]);

    const result = await getPosts(story(1) + story(2));

    expect(result).toHaveLength(0);
  });
});

describe("extractImages", () => {
  test("reads data-src from story images and ignores nodes without it", () => {
    const html = `
      <div class="story-image__image" data-src="https://example.com/image1.jpg"></div>
      <div class="story-image__image"></div>
      <div class="story-image__image" data-src="https://example.com/image2.jpg"></div>
    `;

    expect(extractImages(html)).toEqual([
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
    ]);
  });
});

describe("deleteImages", () => {
  test("removes .story-image__image and keeps the rest of the markup", () => {
    const html = `
      <div class="story__content-inner">
        <div class="story-image__image" data-src="https://example.com/image1.jpg"></div>
        <p>Keep me</p>
      </div>
    `;

    const result = deleteImages(html);

    expect(result).not.toContain("story-image__image");
    expect(result).toContain("Keep me");
    expect(result).toContain("story__content-inner");
  });
});

describe("addNamePost", () => {
  test("prepends a markdown link from the title and strips special characters", () => {
    const html =
      '<a class="story__title-link" href="https://example.com/post">Post Title!</a>';

    expect(addNamePost("This is the post content.", html)).toEqual(
      "[Post Title](https://example.com/post)\n\nThis is the post content.",
    );
  });
});

describe("addVideoLinks", () => {
  test("should add video links to postText", () => {
    expect(addVideoLinks("This is a post.", ["video1", "video2"])).toEqual(
      "This is a post.\n\nvideo1\nvideo2",
    );
  });

  test("should handle an empty linksVideos array", () => {
    expect(addVideoLinks("This is a post.", [])).toEqual("This is a post.\n\n");
  });

  test("should handle an empty postText", () => {
    expect(addVideoLinks("", ["video1", "video2"])).toEqual("\n\nvideo1\nvideo2");
  });

  test("should handle both empty postText and linksVideos", () => {
    expect(addVideoLinks("", [])).toEqual("\n\n");
  });
});

describe("fixMarkdown", () => {
  test("should remove bold formatting", () => {
    expect(fixMarkdown("This is **bold** text.")).toEqual("This is bold text.");
  });

  test("should escape Markdown asterisks", () => {
    expect(fixMarkdown("This *is* some *text*.")).toEqual(
      "This \\*is\\* some \\*text\\*.",
    );
  });

  test("should remove escaped closing brackets", () => {
    expect(fixMarkdown("This is a \\] bracket.")).toEqual(
      "This is a ] bracket.",
    );
  });

  test("should add spaces to Markdown links", () => {
    expect(fixMarkdown("[link1](url1)[link2](url2)")).toEqual(
      " [link1](url1)  [link2](url2) ",
    );
  });

  test("should handle an empty input string", () => {
    expect(fixMarkdown("")).toEqual("");
  });

  test("should handle a string without Markdown formatting", () => {
    expect(fixMarkdown("This is a plain text.")).toEqual(
      "This is a plain text.",
    );
  });
});
