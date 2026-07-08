import { beforeAll, describe, expect, it } from "vitest";
import { registerCommenterAvatarElement } from "./commenterAvatarElement";
import { COMMENT_AVATAR_SIZE, getAvatarLoadingAttrs } from "./avatarImage";

beforeAll(() => {
  registerCommenterAvatarElement();
});

describe("getAvatarLoadingAttrs", () => {
  it("returns lazy/async by default", () => {
    expect(getAvatarLoadingAttrs()).toEqual({ loading: "lazy", decoding: "async" });
    expect(getAvatarLoadingAttrs(false)).toEqual({ loading: "lazy", decoding: "async" });
  });

  it("returns eager/sync when eager is true", () => {
    expect(getAvatarLoadingAttrs(true)).toEqual({ loading: "eager", decoding: "sync" });
  });
});

describe("commenter-avatar custom element", () => {
  it("renders an inner img with shared avatar attributes", () => {
    const avatarEl = document.createElement("commenter-avatar");
    avatarEl.setAttribute("src", "https://ui-avatars.com/api/?name=AY");
    avatarEl.setAttribute("alt", "Andri YS");
    avatarEl.setAttribute("width", String(COMMENT_AVATAR_SIZE));
    avatarEl.setAttribute("height", String(COMMENT_AVATAR_SIZE));
    avatarEl.setAttribute("class", "comment-item__avatar");
    document.body.appendChild(avatarEl);

    const img = avatarEl.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.src).toBe("https://ui-avatars.com/api/?name=AY");
    expect(img!.alt).toBe("Andri YS");
    expect(img!.width).toBe(32);
    expect(img!.height).toBe(32);
    expect(img!.className).toBe("comment-item__avatar");
    expect(img!.loading).toBe("lazy");
    expect(img!.decoding).toBe("async");

    avatarEl.remove();
  });

  it("supports eager loading when requested", () => {
    const avatarEl = document.createElement("commenter-avatar");
    avatarEl.setAttribute("src", "https://example.com/avatar.png");
    avatarEl.setAttribute("alt", "Author");
    avatarEl.setAttribute("width", "40");
    avatarEl.setAttribute("height", "40");
    avatarEl.setAttribute("eager", "");
    document.body.appendChild(avatarEl);

    const img = avatarEl.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.loading).toBe("eager");
    expect(img!.decoding).toBe("sync");
    expect(img!.className).toBe("");

    avatarEl.remove();
  });
});
