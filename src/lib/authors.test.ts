import { describe, expect, it } from "vitest";
import {
  AUTHOR_REGISTRY,
  getAuthor,
} from "./authors";

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
