import { describe, expect, it } from "vitest";
import {
  getBlogEntryId,
  parseBlogEntryId,
  parseFilename,
} from "./blog-utils";

describe("parseFilename", () => {
  it("extracts slug and lang from valid basename", () => {
    expect(parseFilename("2025-03-02_14-30-00_my-first-post.en.md")).toEqual({
      slug: "my-first-post",
      lang: "en",
    });
    expect(parseFilename("2025-03-02_14-30-00_my-first-post.id.md")).toEqual({
      slug: "my-first-post",
      lang: "id",
    });
  });

  it("extracts from full path (uses basename)", () => {
    expect(
      parseFilename("src/content/blog/2025-03-02_14-30-00_my-post.en.md"),
    ).toEqual({ slug: "my-post", lang: "en" });
  });

  it("handles slugs with hyphens and numbers", () => {
    expect(parseFilename("2025-12-31_23-59-59_hello-world-123.en.md")).toEqual({
      slug: "hello-world-123",
      lang: "en",
    });
  });

  it("returns null for invalid format", () => {
    expect(parseFilename("invalid.md")).toBeNull();
    expect(parseFilename("my-post.md")).toBeNull();
    expect(parseFilename("")).toBeNull();
  });
});

describe("getBlogEntryId", () => {
  it("builds entry ID from slug and lang", () => {
    expect(getBlogEntryId("my-first-post", "en")).toBe("my-first-post--en");
    expect(getBlogEntryId("my-first-post", "id")).toBe("my-first-post--id");
  });
});

describe("parseBlogEntryId", () => {
  it("parses valid entry IDs", () => {
    expect(parseBlogEntryId("my-first-post--en")).toEqual({
      slug: "my-first-post",
      lang: "en",
    });
  });

  it("splits on last -- (slug can contain dashes)", () => {
    expect(parseBlogEntryId("slug-with--dashes--id")).toEqual({
      slug: "slug-with--dashes",
      lang: "id",
    });
  });

  it("returns null when no -- separator", () => {
    expect(parseBlogEntryId("no-dashes")).toBeNull();
  });
});
