import { describe, expect, it } from "vitest";
import { buildCommentTree, buildLoginUrl } from "./blogEngagement.client";

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
});
