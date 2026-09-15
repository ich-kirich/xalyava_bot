import axios from "axios";
import * as iconv from "iconv-lite";
import { updatePosts } from "../../src/services/botServices";
import { getPostsFromWebsite } from "../../src/libs/parsingSite";

jest.mock("axios");
jest.mock("../../src/services/botServices");
jest.mock("../../src/libs/utils", () => ({
  ...jest.requireActual("../../src/libs/utils"),
  sleep: jest.fn().mockResolvedValue(undefined),
}));

function story(id: number): string {
  return `
    <article class="story" data-story-id="${id}">
      <a class="story__title-link" href="https://example.com/${id}">Post Title ${id}</a>
      <div class="story__content-inner">
        <p>Giveaway ${id}</p>
        <div class="story-image__image" data-src="https://example.com/pic${id}.jpg"></div>
        <div class="player" data-source="https://cdn.example.com/video_${id}.mp4"></div>
      </div>
    </article>
  `;
}

describe("getPostsFromWebsite assembly", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("builds telegram html text, images and video links for new posts", async () => {
    (axios.get as jest.Mock)
      .mockResolvedValueOnce({
        status: 200,
        data: iconv.encode(story(1), "win1251"),
        headers: {},
      })
      .mockResolvedValueOnce({
        status: 200,
        data: Buffer.from(""),
        headers: {},
      });
    (updatePosts as jest.Mock).mockResolvedValue([1]);

    const posts = await getPostsFromWebsite("https://example.com/community");

    expect(posts).toHaveLength(1);
    expect(posts[0].postId).toBe(1);
    expect(posts[0].imagesArray).toEqual(["https://example.com/pic1.jpg"]);
    expect(posts[0].postText).toContain("<b>Post Title 1</b>");
    expect(posts[0].postText).not.toContain("https://example.com/1");
    expect(posts[0].postText).toContain("Giveaway 1");
    expect(posts[0].postText).toContain(
      '<a href="https://cdn.example.com/video_1.mp4">Видео</a>',
    );
    expect(posts[0].postText).not.toContain(
      "https://cdn.example.com/video_1.mp4\n",
    );
    expect(posts[0].postText).not.toContain("story-image__image");
    expect(posts[0].postText).not.toContain("\\_");
  });

  test("builds a crystal crisis style post without site chrome", async () => {
    const crystalCrisis = `
      <article class="story" data-story-id="14329860">
        <a class="story__title-link" href="https://pikabu.ru/story/crystal_crisis__100_skidka_v_steam_14329860">
          Crystal Crisis — 100% скидка в STEAM!
        </a>
        <div class="story__content-inner">
          <div class="story-block story-block_type_image">
            <img class="story-image__image" data-src="https://cs20.pikabu.ru/cover.webp">
          </div>
          <p>Звёздный состав героев собрался испытать свою силу.</p>
          <hr>
          <p><b>Страница игры и раздачи в STEAM:</b></p>
          <blockquote><p><a href="https://pikabu.ru/story/crystal_crisis?u=https%3A%2F%2Fstore.steampowered.com%2Fapp%2F447700%2FCrystal_Crisis%2F">
            <b>https://store.steampowered.com/app/447700/Crystal_Crisis/</b>
          </a></p></blockquote>
          <ul><li><p>Раздача продлится <b>до 22 Сентября</b>.</p></li><li><p><b>Даёт +1</b>.</p></li></ul>
          <div class="story-block story-block_type_video">
            <div data-role="player">
              <video><source src="https://cs2.pikabu.ru/one_low.mp4" type="video/mp4"></video>
            </div>
            <a href="https://pikabu.ru/video/story/crystal_crisis/1756519" hidden>Перейти к видео</a>
          </div>
          <p><i><b>Crystal Crisis</b></i> – совершенная битва.</p>
          <div class="story-block story-block_type_carousel">
            <article class="carousel__item"><img data-src="https://cs2.pikabu.ru/slide1.jpg"></article>
            <article class="carousel__item"><img data-src="https://cs17.pikabu.ru/slide2.jpg"></article>
            <div class="carousel__cur-slide">1/5</div>
          </div>
          <h2>ИГРОВЫЕ ОСОБЕННОСТИ</h2>
          <ul><li><p>Quote и Curly Brace из<i>Cave Story</i>.</p></li></ul>
          <div class="story-block story-block_type_video">
            <div data-role="player">
              <video><source src="https://cs17.pikabu.ru/two_low.mp4" type="video/mp4"></video>
            </div>
            <a href="https://pikabu.ru/video/story/crystal_crisis/1756523" hidden>Перейти к видео</a>
          </div>
          <p>И запомни: <b>НИКОГДА НЕ СДАВАЙСЯ!</b></p>
        </div>
      </article>
    `;
    (axios.get as jest.Mock)
      .mockResolvedValueOnce({
        status: 200,
        data: iconv.encode(crystalCrisis, "win1251"),
        headers: {},
      })
      .mockResolvedValueOnce({
        status: 200,
        data: Buffer.from(""),
        headers: {},
      });
    (updatePosts as jest.Mock).mockResolvedValue([14329860]);

    const posts = await getPostsFromWebsite("https://example.com/community");

    expect(posts[0].imagesArray).toEqual([
      "https://cs20.pikabu.ru/cover.webp",
      "https://cs2.pikabu.ru/slide1.jpg",
      "https://cs17.pikabu.ru/slide2.jpg",
    ]);
    expect(posts[0].postText).toBe(
      "<b>Crystal Crisis — 100% скидка в STEAM!</b>\n\n" +
        "Звёздный состав героев собрался испытать свою силу.\n\n" +
        "<b>Страница игры и раздачи в STEAM:</b>\n\n" +
        "https://store.steampowered.com/app/447700/Crystal_Crisis/\n\n" +
        "• Раздача продлится <b>до 22 Сентября</b>.\n" +
        "• <b>Даёт +1</b>.\n\n" +
        "<i><b>Crystal Crisis</b></i> – совершенная битва.\n\n" +
        "<b>ИГРОВЫЕ ОСОБЕННОСТИ</b>\n\n" +
        "• Quote и Curly Brace из <i>Cave Story</i>.\n\n" +
        "И запомни: <b>НИКОГДА НЕ СДАВАЙСЯ!</b>\n\n" +
        '<a href="https://cs2.pikabu.ru/one_low.mp4">Видео 1</a>\n' +
        '<a href="https://cs17.pikabu.ru/two_low.mp4">Видео 2</a>',
    );
  });
});
