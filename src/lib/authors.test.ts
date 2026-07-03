import { describe, expect, it } from "vitest";
import {
  AUTHOR_REGISTRY,
  getAuthor,
} from "./authors";
import { mergeAuthorWithSnapshot } from "./authorProfile.client";

describe("authors registry", () => {
  it("returns fallback author for ojekku", () => {
    const author = getAuthor("ojekku");
    expect(author?.name).toBe("Ojekku");
    expect(author?.avatarUrl).toBe("/brand/ojekku-logo.svg");
  });

  it("maps registry entry for ojekku", () => {
    const author = getAuthor("ojekku");
    expect(author?.id).toBe("ojekku");
    expect(AUTHOR_REGISTRY.ojekku.id).toBe("ojekku");
  });

  it("returns an ephemeral fallback for non-existing authorId", () => {
    const author = getAuthor("andri");
    expect(author?.id).toBe("andri");
    expect(AUTHOR_REGISTRY.andri).toBeUndefined();
    expect(author?.name).toBe("andri");
  });
});

describe("mergeAuthorWithSnapshot", () => {
  const fallback = { id: "ojekku" as const, name: "Ojekku", avatarUrl: "/brand/ojekku-logo.svg" };

  it("keeps fallback when snapshot is null", () => {
    expect(mergeAuthorWithSnapshot(fallback, null)).toEqual(fallback);
  });

  it("overrides name and avatar from snapshot", () => {
    const merged = mergeAuthorWithSnapshot(fallback, {
      displayName: "Andri",
      avatarUrl: "https://cdn.example/avatar.png",
    });
    expect(merged.name).toBe("Andri");
    expect(merged.avatarUrl).toBe("https://cdn.example/avatar.png");
  });
});
