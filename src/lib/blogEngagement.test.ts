import { describe, expect, it } from "vitest";
import {
  buildCommentTree,
  buildLoginUrl,
  formatCommentCountLabel,
  formatDeletedCommentLabel,
  formatDetailedPostEngagement,
  formatPostListEngagement,
  formatReactionCountLabel,
  formatReplyCountLabel,
  renderDetailedPostEngagement,
  renderPostListEngagement,
  renderReactionChip,
  sumReactionCounts,
} from "./blogEngagement.client";

describe("blogEngagement.client", () => {
  it("buildLoginUrl returns null when API base unset", () => {
    expect(buildLoginUrl("http://localhost:4321/id/blog/foo")).toBeNull();
  });

  it("buildCommentTree nests replies and sorts roots desc, children asc", () => {
    const tree = buildCommentTree([
      {
        id: "root-old",
        authentikUserId: "u1",
        body: "old root",
        createdAt: "2026-01-01T10:00:00Z",
        parentCommentId: null,
      },
      {
        id: "root-new",
        authentikUserId: "u2",
        body: "new root",
        createdAt: "2026-01-02T10:00:00Z",
        parentCommentId: null,
      },
      {
        id: "reply-late",
        authentikUserId: "u3",
        body: "late reply",
        createdAt: "2026-01-02T12:00:00Z",
        parentCommentId: "root-new",
      },
      {
        id: "reply-early",
        authentikUserId: "u4",
        body: "early reply",
        createdAt: "2026-01-02T11:00:00Z",
        parentCommentId: "root-new",
      },
      {
        id: "nested",
        authentikUserId: "u5",
        body: "nested reply",
        createdAt: "2026-01-02T13:00:00Z",
        parentCommentId: "reply-late",
      },
    ]);

    expect(tree.map((n) => n.id)).toEqual(["root-new", "root-old"]);
    expect(tree[0].children.map((n) => n.id)).toEqual(["reply-early", "reply-late"]);
    expect(tree[0].children[1].children.map((n) => n.id)).toEqual(["nested"]);
  });

  it("buildCommentTree nests telegram replies by telegramMessageId", () => {
    const tree = buildCommentTree([
      {
        id: "a",
        source: "telegram",
        body: "root",
        createdAt: "2026-01-02T10:00:00Z",
        telegramMessageId: 901,
        replyToMessageId: 900,
        discussionRootMessageId: 900,
      },
      {
        id: "b",
        source: "telegram",
        body: "nested",
        createdAt: "2026-01-02T11:00:00Z",
        telegramMessageId: 902,
        replyToMessageId: 901,
        discussionRootMessageId: 900,
      },
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("a");
    expect(tree[0].children.map((n) => n.id)).toEqual(["b"]);
  });

  it("buildCommentTree ignores orphan replies without parent in list", () => {
    const tree = buildCommentTree([
      {
        id: "root",
        authentikUserId: "u1",
        body: "root",
        createdAt: "2026-01-01T10:00:00Z",
        parentCommentId: null,
      },
      {
        id: "orphan",
        authentikUserId: "u2",
        body: "orphan",
        createdAt: "2026-01-01T11:00:00Z",
        parentCommentId: "missing-parent",
      },
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("root");
    expect(tree[0].children).toHaveLength(0);
  });

  it("sumReactionCounts totals emoji counts", () => {
    expect(sumReactionCounts([{ emoji: "👍", count: 2 }, { emoji: "🔥", count: 3 }])).toBe(5);
    expect(sumReactionCounts([])).toBe(0);
    expect(sumReactionCounts(undefined)).toBe(0);
  });

  it("formatPostListEngagement formats reactions and comments", () => {
    expect(
      formatPostListEngagement(
        {
          commentCount: 0,
          likeCount: 0,
          shareCount: 0,
          telegramReactions: [{ emoji: "👍", count: 2 }, { emoji: "🔥", count: 1 }],
          telegramCommentCount: 5,
        },
        "id",
      ),
    ).toEqual({
      reaction: { emoji: "👍", total: 3 },
      comments: { total: 5 },
    });
  });

  it("formatPostListEngagement defaults to heart reaction when zero", () => {
    expect(
      formatPostListEngagement(
        { commentCount: 0, likeCount: 0, shareCount: 0, telegramCommentCount: 0 },
        "id",
      ),
    ).toEqual({
      reaction: { emoji: "❤️", total: 0 },
      comments: { total: 0 },
    });
  });

  it("formatPostListEngagement supports comments only", () => {
    expect(
      formatPostListEngagement(
        { commentCount: 0, likeCount: 0, shareCount: 0, telegramCommentCount: 2 },
        "en",
      ),
    ).toEqual({
      reaction: { emoji: "❤️", total: 0 },
      comments: { total: 2 },
    });
  });

  it("formatReplyCountLabel formats id and en labels", () => {
    expect(formatReplyCountLabel(1, "id")).toBe("Lihat 1 balasan");
    expect(formatReplyCountLabel(3, "id")).toBe("Lihat 3 balasan");
    expect(formatReplyCountLabel(1, "en")).toBe("View 1 reply");
    expect(formatReplyCountLabel(5, "en")).toBe("View 5 replies");
  });

  it("formatDeletedCommentLabel formats id and en labels", () => {
    expect(formatDeletedCommentLabel("id")).toBe("Komentar dihapus");
    expect(formatDeletedCommentLabel("en")).toBe("Comment deleted");
  });

  it("formatReactionCountLabel formats id and en labels", () => {
    expect(formatReactionCountLabel(0, "id")).toBe("0 reaksi");
    expect(formatReactionCountLabel(2, "id")).toBe("2 reaksi");
    expect(formatReactionCountLabel(1, "en")).toBe("1 reaction");
    expect(formatReactionCountLabel(3, "en")).toBe("3 reactions");
  });

  it("formatCommentCountLabel formats id and en labels", () => {
    expect(formatCommentCountLabel(0, "id")).toBe("0 komentar");
    expect(formatCommentCountLabel(5, "id")).toBe("5 komentar");
    expect(formatCommentCountLabel(1, "en")).toBe("1 comment");
    expect(formatCommentCountLabel(2, "en")).toBe("2 comments");
  });

  it("formatDetailedPostEngagement uses heart when zero reactions", () => {
    expect(
      formatDetailedPostEngagement(
        { commentCount: 0, likeCount: 0, shareCount: 0, telegramCommentCount: 2 },
        "id",
      ),
    ).toEqual({
      reactionEmojis: ["❤️"],
      reactionLabel: "0 reaksi",
      commentLabel: "2 komentar",
    });
  });

  it("formatDetailedPostEngagement caps reaction emojis at three", () => {
    expect(
      formatDetailedPostEngagement(
        {
          commentCount: 0,
          likeCount: 0,
          shareCount: 0,
          telegramReactions: [
            { emoji: "👍", count: 5 },
            { emoji: "🔥", count: 4 },
            { emoji: "❤️", count: 3 },
            { emoji: "🎉", count: 2 },
          ],
          telegramCommentCount: 1,
        },
        "en",
      ),
    ).toEqual({
      reactionEmojis: ["👍", "🔥", "❤️"],
      reactionLabel: "14 reactions",
      commentLabel: "1 comment",
    });
  });

  it("renderPostListEngagement renders comment pill as link when commentHref provided", () => {
    const el = document.createElement("div");
    renderPostListEngagement(
      el,
      { reaction: { emoji: "👍", total: 2 }, comments: { total: 5 } },
      { commentHref: "#comments" },
    );

    const pills = el.querySelectorAll(".engagement-pill");
    expect(pills).toHaveLength(2);
    expect(pills[0]?.tagName).toBe("SPAN");
    expect(pills[1]?.tagName).toBe("A");
    expect(pills[1]?.classList.contains("engagement-pill--link")).toBe(true);
    expect((pills[1] as HTMLAnchorElement).getAttribute("href")).toBe("#comments");
  });

  it("renderPostListEngagement renders comment pill as span when commentHref omitted", () => {
    const el = document.createElement("div");
    renderPostListEngagement(
      el,
      { reaction: { emoji: "❤️", total: 0 }, comments: { total: 1 } },
    );

    const pills = el.querySelectorAll(".engagement-pill");
    expect(pills).toHaveLength(2);
    expect(pills[1]?.tagName).toBe("SPAN");
  });

  it("renderReactionChip renders link when href provided", () => {
    const el = document.createElement("div");
    renderReactionChip(el, "👍", 3, "#comments");

    const chip = el.querySelector(".comment-reaction-chip");
    expect(chip?.tagName).toBe("A");
    expect(chip?.classList.contains("comment-reaction-chip--link")).toBe(true);
    expect((chip as HTMLAnchorElement).getAttribute("href")).toBe("#comments");
  });

  it("renderReactionChip renders span when href omitted", () => {
    const el = document.createElement("div");
    renderReactionChip(el, "🔥", 1);

    const chip = el.querySelector(".comment-reaction-chip");
    expect(chip?.tagName).toBe("SPAN");
    expect(chip?.classList.contains("comment-reaction-chip--link")).toBe(false);
  });

  it("renderDetailedPostEngagement renders labeled pills as spans", () => {
    const el = document.createElement("div");
    renderDetailedPostEngagement(
      el,
      {
        commentCount: 0,
        likeCount: 0,
        shareCount: 0,
        telegramReactions: [
          { emoji: "👍", count: 2 },
          { emoji: "🔥", count: 1 },
        ],
        telegramCommentCount: 5,
      },
      "id",
    );

    const pills = el.querySelectorAll(".engagement-pill");
    expect(pills).toHaveLength(2);
    expect(pills[0]?.tagName).toBe("SPAN");
    expect(pills[1]?.tagName).toBe("SPAN");
    expect(pills[0]?.textContent).toContain("3 reaksi");
    expect(pills[1]?.textContent).toContain("5 komentar");
    expect(el.querySelector(".engagement-emoji-group")).not.toBeNull();
  });

  it("renderDetailedPostEngagement uses heart and single emoji for zero and one reaction", () => {
    const zeroEl = document.createElement("div");
    renderDetailedPostEngagement(
      zeroEl,
      {
        commentCount: 0,
        likeCount: 0,
        shareCount: 0,
        telegramReactions: [],
        telegramCommentCount: 0,
      },
      "id",
    );
    expect(zeroEl.querySelector(".engagement-emoji")?.textContent).toBe("❤️");
    expect(zeroEl.querySelector(".engagement-emoji-group")).toBeNull();

    const oneEl = document.createElement("div");
    renderDetailedPostEngagement(
      oneEl,
      {
        commentCount: 0,
        likeCount: 0,
        shareCount: 0,
        telegramReactions: [{ emoji: "👍", count: 1 }],
        telegramCommentCount: 0,
      },
      "id",
    );
    expect(oneEl.querySelector(".engagement-emoji")?.textContent).toBe("👍");
    expect(oneEl.querySelector(".engagement-emoji-group")).toBeNull();
  });

  it("renderDetailedPostEngagement shows at most three condensed reaction emojis", () => {
    const el = document.createElement("div");
    renderDetailedPostEngagement(
      el,
      {
        commentCount: 0,
        likeCount: 0,
        shareCount: 0,
        telegramReactions: [
          { emoji: "👍", count: 5 },
          { emoji: "🔥", count: 4 },
          { emoji: "❤️", count: 3 },
          { emoji: "🎉", count: 2 },
        ],
        telegramCommentCount: 1,
      },
      "en",
    );

    const items = el.querySelectorAll(".engagement-emoji-group__item");
    expect(items).toHaveLength(3);
    expect(el.querySelector(".engagement-pill")?.textContent).toContain("14 reactions");
  });
});
