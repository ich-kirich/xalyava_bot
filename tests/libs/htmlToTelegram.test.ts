import {
  htmlToPlainText,
  htmlToTelegram,
  unwrapPikabuUrl,
} from "../../src/libs/htmlToTelegram";

describe("htmlToTelegram", () => {
  test("keeps paragraphs, bold and italic text of the story", () => {
    const html = `
      <div class="story-block story-block_type_text"><p>Первый абзац с <b>жирным</b> словом.</p></div>
      <div class="story-block story-block_type_text"><p><i>Второй</i> абзац.</p></div>
    `;

    expect(htmlToTelegram(html)).toBe(
      "Первый абзац с <b>жирным</b> словом.\n\n<i>Второй</i> абзац.",
    );
  });

  test("shows a link whose text is the address as a plain address", () => {
    const html =
      '<blockquote><p><a href="https://pikabu.ru/story/test_1?u=https%3A%2F%2Fstore.steampowered.com%2Fapp%2F447700%2F&amp;t=x" rel="nofollow">' +
      "<b>https://store.steampowered.com/app/447700/</b></a></p></blockquote>";

    expect(htmlToTelegram(html)).toBe(
      "https://store.steampowered.com/app/447700/",
    );
  });

  test("keeps a link that is attached to text", () => {
    const html =
      '<p><a href="/story/test_1?u=https%3A%2F%2Fwookbee.itch.io%2Fdominion&amp;t=x"><b>ЗАБРАТЬ</b></a></p>';

    expect(htmlToTelegram(html)).toBe(
      '<a href="https://wookbee.itch.io/dominion"><b>ЗАБРАТЬ</b></a>',
    );
  });

  test("turns headings into bold lines and list items into bullets", () => {
    const html =
      "<div><h2>Игровые особенности</h2></div>" +
      "<div><ul><li><p>Первый пункт</p></li><li><p>Второй пункт</p></li></ul></div>";

    expect(htmlToTelegram(html)).toBe(
      "<b>Игровые особенности</b>\n\n• Первый пункт\n• Второй пункт",
    );
  });

  test("keeps spaces around inline tags", () => {
    expect(
      htmlToTelegram("<p>Раздача продлится <b> до 22 Сентября </b>.</p>"),
    ).toBe("Раздача продлится <b>до 22 Сентября</b> .");
  });

  test("inserts a space before glued italic markup", () => {
    expect(
      htmlToTelegram(
        "<p>Quote и Curly Brace из<i>Cave Story</i>, Isaac из<i>The Binding of Isaac</i>.</p>",
      ),
    ).toBe(
      "Quote и Curly Brace из <i>Cave Story</i>, Isaac из <i>The Binding of Isaac</i>.",
    );
  });

  test("turns a thematic break into an empty line", () => {
    expect(htmlToTelegram("<p>Сначала</p><hr><p>Потом</p>")).toBe(
      "Сначала\n\nПотом",
    );
  });

  test("keeps a quote when it is not only a url", () => {
    expect(
      htmlToTelegram("<blockquote><p>Играйте до 22 сентября</p></blockquote>"),
    ).toBe("<blockquote>Играйте до 22 сентября</blockquote>");
  });

  test("drops images, carousels and site interface", () => {
    const html = `
      <div class="story-block story-block_type_image">
        <figure class="story-image"><img class="story-image__image" data-src="https://cs.pikabu.ru/pic.webp"></figure>
      </div>
      <div class="story-block story-block_type_carousel">
        <section class="carousel"><article class="carousel__item"><img data-src="https://cs.pikabu.ru/slide.jpg"></article></section>
      </div>
      <script>window.x = 1;</script>
      <div class="story-block story-block_type_text"><p>Текст поста</p></div>
      <a class="story__read-more" href="/story/test_1">Показать полностью</a>
    `;

    expect(htmlToTelegram(html)).toBe("Текст поста");
  });

  test("keeps every player in its place in the text as a video link", () => {
    const html = `
      <div class="story-block story-block_type_text"><p>Первый абзац</p></div>
      <div class="story-block story-block_type_video">
        <div data-role="player"><video><source src="https://cs2.pikabu.ru/one_low.mp4" type="video/mp4"></video></div>
        <a href="https://pikabu.ru/video/story/test_1/1" hidden>Перейти к видео</a>
      </div>
      <div class="story-block story-block_type_text"><p>Второй абзац</p></div>
      <div class="story-block story-block_type_video">
        <div class="player" data-source="https://cdn.example.com/legacy.mp4"></div>
      </div>
    `;

    expect(htmlToTelegram(html)).toBe(
      "Первый абзац\n\n" +
        '<a href="https://cs2.pikabu.ru/one_low.mp4">Видео</a>\n\n' +
        "Второй абзац\n\n" +
        '<a href="https://cdn.example.com/legacy.mp4">Видео</a>',
    );
  });

  test("falls back to the video page when the player has no file", () => {
    const html = `
      <div class="story-block story-block_type_video">
        <div data-role="player" data-type="video-file">Видео ● 00:28</div>
        <a href="https://pikabu.ru/video/story/test_1/1" hidden>Перейти к видео</a>
      </div>
    `;

    expect(htmlToTelegram(html)).toBe(
      '<a href="https://pikabu.ru/video/story/test_1/1">Видео</a>',
    );
  });

  test("escapes characters that telegram would read as markup", () => {
    expect(htmlToTelegram("<p>Скидка 5 &lt; 10 &amp; 20 &gt; 10</p>")).toBe(
      "Скидка 5 &lt; 10 &amp; 20 &gt; 10",
    );
  });
});

describe("unwrapPikabuUrl", () => {
  test("takes the target address out of the pikabu redirect", () => {
    expect(
      unwrapPikabuUrl(
        "https://pikabu.ru/story/test_1?u=https%3A%2F%2Fgog.com%2Fgame&amp;t=x",
      ),
    ).toBe("https://gog.com/game");
  });

  test("makes a site link absolute and keeps an external one", () => {
    expect(unwrapPikabuUrl("/story/test_1")).toBe(
      "https://pikabu.ru/story/test_1",
    );
    expect(unwrapPikabuUrl("https://itch.io/game")).toBe(
      "https://itch.io/game",
    );
  });
});

describe("htmlToPlainText", () => {
  test("removes the markup when telegram rejects it", () => {
    expect(
      htmlToPlainText('<b>Title</b>\n\n<a href="https://example.com">Link'),
    ).toBe("Title\n\nLink");
  });
});
