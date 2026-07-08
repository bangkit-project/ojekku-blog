import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPostUrl,
  buildTelegramChunks,
  buildTelegramDeepLink,
  escapeHtml,
  getTelegramCoverStatus,
  isRemoteCoverImage,
  isStaleTelegramMessageError,
  isUnchangedTelegramMessageError,
  isTelegramPhotoCover,
  listPostFiles,
  resolveCoverImagePath,
  resolveCoverImageUrl,
  markdownToTelegramHtml,
  parseMessageIdFromTelegramUrl,
  parsePostFrontmatter,
  parseTelegramFields,
  upsertFrontmatterFields,
} from "./tg-sync";

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`Tom & Jerry <3>`)).toBe("Tom &amp; Jerry &lt;3&gt;");
  });
});

describe("isTelegramPhotoCover", () => {
  it("accepts raster extensions only", () => {
    expect(isTelegramPhotoCover("/assets/blog/cover.png")).toBe(true);
    expect(isTelegramPhotoCover("/assets/blog/cover.JPG")).toBe(true);
    expect(isTelegramPhotoCover("/assets/blog/salatiga-cover.svg")).toBe(false);
    expect(isTelegramPhotoCover(undefined)).toBe(false);
  });
});

describe("resolveCoverImagePath", () => {
  it("maps public asset paths to files under public/", () => {
    expect(resolveCoverImagePath("/assets/blog/cover.png")).toBe(
      join(process.cwd(), "public", "assets/blog/cover.png"),
    );
    expect(resolveCoverImagePath("assets/blog/cover.png")).toBe(
      join(process.cwd(), "public", "assets/blog/cover.png"),
    );
  });
});

describe("isRemoteCoverImage", () => {
  it("detects http(s) URLs", () => {
    expect(isRemoteCoverImage("https://cdn.example.com/cover.webp")).toBe(true);
    expect(isRemoteCoverImage("http://example.com/cover.jpg")).toBe(true);
    expect(isRemoteCoverImage("/assets/blog/cover.png")).toBe(false);
  });
});

describe("resolveCoverImageUrl", () => {
  it("builds absolute URL from site and public path", () => {
    expect(
      resolveCoverImageUrl(
        "/assets/blog/cover.png",
        "https://blog.ojekku.com",
      ),
    ).toBe("https://blog.ojekku.com/assets/blog/cover.png");
  });

  it("passes through absolute URLs", () => {
    expect(
      resolveCoverImageUrl(
        "https://cdn.example.com/cover.webp",
        "https://blog.ojekku.com",
      ),
    ).toBe("https://cdn.example.com/cover.webp");
  });
});

describe("getTelegramCoverStatus", () => {
  it("marks local raster covers for send-local and remote URLs for send-remote", () => {
    expect(getTelegramCoverStatus("/assets/blog/cover.png")).toEqual({
      kind: "send-local",
      path: join(process.cwd(), "public", "assets/blog/cover.png"),
    });
    expect(
      getTelegramCoverStatus("https://cdn.example.com/cover.webp"),
    ).toEqual({
      kind: "send-remote",
      url: "https://cdn.example.com/cover.webp",
    });
    expect(
      getTelegramCoverStatus("/assets/blog/salatiga-cover.svg"),
    ).toEqual({
      kind: "skip-svg",
      coverImage: "/assets/blog/salatiga-cover.svg",
    });
    expect(getTelegramCoverStatus(undefined)).toEqual({ kind: "none" });
  });
});

describe("isStaleTelegramMessageError", () => {
  it("detects stale Telegram message errors", () => {
    expect(
      isStaleTelegramMessageError("Bad Request: message to edit not found"),
    ).toBe(true);
    expect(
      isStaleTelegramMessageError("Bad Request: message to delete not found"),
    ).toBe(true);
    expect(isStaleTelegramMessageError("message can't be edited")).toBe(true);
    expect(
      isStaleTelegramMessageError("message identifier is not specified"),
    ).toBe(true);
    expect(
      isStaleTelegramMessageError("Bad Request: MESSAGE_ID_INVALID"),
    ).toBe(true);
  });

  it("returns false for other Telegram errors", () => {
    expect(isStaleTelegramMessageError("Bad Request: can't parse entities")).toBe(
      false,
    );
    expect(isStaleTelegramMessageError(undefined)).toBe(false);
  });
});

describe("isUnchangedTelegramMessageError", () => {
  it("detects unchanged Telegram message errors", () => {
    expect(
      isUnchangedTelegramMessageError(
        "Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message",
      ),
    ).toBe(true);
  });

  it("returns false for other Telegram errors", () => {
    expect(
      isUnchangedTelegramMessageError("Bad Request: can't parse entities"),
    ).toBe(false);
    expect(
      isUnchangedTelegramMessageError("Bad Request: message to edit not found"),
    ).toBe(false);
    expect(isUnchangedTelegramMessageError(undefined)).toBe(false);
  });
});

describe("buildPostUrl", () => {
  it("builds locale blog URL without trailing slash on site", () => {
    expect(
      buildPostUrl("https://blog.ojekku.com", "id", "kenapa-ojekku-dimulai-di-salatiga"),
    ).toBe(
      "https://blog.ojekku.com/id/blog/kenapa-ojekku-dimulai-di-salatiga",
    );
  });

  it("strips trailing slash from site URL", () => {
    expect(buildPostUrl("https://blog.ojekku.com/", "en", "hello")).toBe(
      "https://blog.ojekku.com/en/blog/hello",
    );
  });
});

describe("markdownToTelegramHtml", () => {
  it("converts headings, bold, links, and lists", () => {
    const md = `## Section

Some **bold** text.

1. First item
2. Second item

Visit [ojekku.com](https://ojekku.com).`;

    expect(markdownToTelegramHtml(md)).toBe(
      [
        "<b>Section</b>",
        "Some <b>bold</b> text.",
        "1. First item",
        "2. Second item",
        'Visit <a href="https://ojekku.com">ojekku.com</a>.',
      ].join("\n\n"),
    );
  });

  it("drops standalone images but keeps alt text", () => {
    expect(markdownToTelegramHtml("![Alt text](/assets/cover.svg)")).toBe(
      "(Alt text)",
    );
  });
});

describe("buildTelegramChunks", () => {
  const postUrl = "https://blog.ojekku.com/id/blog/judul";

  it("puts raw URL first, then separator, then bold title and body", () => {
    const { chunks, truncated } = buildTelegramChunks(
      "Judul",
      "Isi artikel.",
      postUrl,
    );

    expect(truncated).toBe(false);
    expect(chunks).toEqual([
      `${postUrl}\n\n---\n\n<b>Judul</b>\n\nIsi artikel.`,
    ]);
    expect(chunks[0].startsWith(postUrl)).toBe(true);
    expect(chunks[0]).toContain("\n\n---\n\n<b>Judul</b>\n\n");
  });

  it("truncates long content into one chunk with a warning flag", () => {
    const body = "Paragraph.\n\n".repeat(500);
    const { chunks, truncated } = buildTelegramChunks(
      "Judul",
      body,
      postUrl,
      500,
    );

    expect(truncated).toBe(true);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].length).toBeLessThanOrEqual(500);
    expect(chunks[0]).toContain(`${postUrl}\n\n---\n\n<b>Judul</b>\n\n`);
    expect(chunks[0]).toMatch(/…$/);
  });
});

describe("buildTelegramDeepLink", () => {
  it("builds public channel links from @username", () => {
    expect(buildTelegramDeepLink("@ojekku_channel", 42)).toBe(
      "https://t.me/ojekku_channel/42",
    );
  });

  it("builds private channel links from numeric id", () => {
    expect(buildTelegramDeepLink("-1001234567890", 7)).toBe(
      "https://t.me/c/1234567890/7",
    );
  });
});

describe("parsePostFrontmatter", () => {
  it("parses unquoted title and description", () => {
    const content = `---
title: Kenapa Ojekku dimulai di Salatiga
description: Ringkasan singkat.
publishDate: "2026-06-22T10:00:00"
draft: false
---

Body`;
    expect(parsePostFrontmatter(content)).toEqual({
      title: "Kenapa Ojekku dimulai di Salatiga",
      description: "Ringkasan singkat.",
      draft: false,
      publishDate: new Date("2026-06-22T10:00:00"),
    });
  });

  it("allows missing description", () => {
    expect(
      parsePostFrontmatter(`---
title: Only title
publishDate: "2026-06-22T10:00:00"
draft: false
---

Body`),
    ).toEqual({
      title: "Only title",
      description: undefined,
      draft: false,
      publishDate: new Date("2026-06-22T10:00:00"),
    });
  });

  it("allows empty description", () => {
    expect(
      parsePostFrontmatter(`---
title: Post title
description: ""
publishDate: "2026-06-22T10:00:00"
draft: false
---

Body`),
    ).toEqual({
      title: "Post title",
      description: "",
      draft: false,
      publishDate: new Date("2026-06-22T10:00:00"),
    });
  });
});

describe("listPostFiles", () => {
  it("lists non-draft posts for locale sorted by publishDate", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ojekku-blog-tg-"));

    try {
      const subdir = join(dir, "2026", "06");
      await mkdir(subdir, { recursive: true });

      await writeFile(
        join(subdir, "2026-06-20_09-00-00_newer.id.md"),
        `---
title: Newer
description: Newer post
publishDate: "2026-06-20T09:00:00"
draft: false
---

Body`,
      );

      await writeFile(
        join(subdir, "2026-06-17_09-00-00_older.id.md"),
        `---
title: Older
description: Older post
publishDate: "2026-06-17T09:00:00"
draft: false
---

Body`,
      );

      await writeFile(
        join(subdir, "2026-06-18_09-00-00_draft.id.md"),
        `---
title: Draft
description: Draft post
publishDate: "2026-06-18T09:00:00"
draft: true
---

Body`,
      );

      await writeFile(
        join(subdir, "2026-06-19_09-00-00_english.en.md"),
        `---
title: English
description: English post
publishDate: "2026-06-19T09:00:00"
draft: false
---

Body`,
      );

      const entries = await listPostFiles(dir, "id");
      expect(entries.map((entry) => entry.slug)).toEqual(["older", "newer"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("parseTelegramFields", () => {
  it("reads telegramUrl and telegramMessageIds from frontmatter", () => {
    const content = `---
title: Test
description: Summary
telegramUrl: "https://t.me/ojekku_channel/42"
telegramMessageIds: [42, 43]
---

Body`;

    expect(parseTelegramFields(content)).toEqual({
      telegramUrl: "https://t.me/ojekku_channel/42",
      telegramMessageIds: [42, 43],
    });
  });

  it("derives message id from telegramUrl when ids array is missing", () => {
    const content = `---
title: Test
description: Summary
telegramUrl: "https://t.me/ojekku_channel/99"
---

Body`;

    expect(parseTelegramFields(content)).toEqual({
      telegramUrl: "https://t.me/ojekku_channel/99",
      telegramMessageIds: [99],
    });
  });
});

describe("parseMessageIdFromTelegramUrl", () => {
  it("extracts trailing message id", () => {
    expect(parseMessageIdFromTelegramUrl("https://t.me/ojekku_channel/42")).toBe(
      42,
    );
  });
});

describe("upsertFrontmatterFields", () => {
  it("adds telegram fields to existing frontmatter", () => {
    const original = `---
title: Test
description: Summary
draft: false
---

Body`;

    const updated = upsertFrontmatterFields(original, {
      telegramUrl: "https://t.me/ojekku_channel/42",
      telegramMessageIds: [42],
    });

    expect(updated).toContain('telegramUrl: "https://t.me/ojekku_channel/42"');
    expect(updated).toContain("telegramMessageIds: [42]");
    expect(parseTelegramFields(updated)).toEqual({
      telegramUrl: "https://t.me/ojekku_channel/42",
      telegramMessageIds: [42],
    });
  });

  it("updates existing telegram fields", () => {
    const original = `---
title: Test
description: Summary
telegramUrl: "https://t.me/ojekku_channel/1"
telegramMessageIds: [1]
---

Body`;

    const updated = upsertFrontmatterFields(original, {
      telegramUrl: "https://t.me/ojekku_channel/42",
      telegramMessageIds: [42, 43],
    });

    expect(updated).not.toContain("ojekku_channel/1");
    expect(parseTelegramFields(updated)).toEqual({
      telegramUrl: "https://t.me/ojekku_channel/42",
      telegramMessageIds: [42, 43],
    });
  });
});
