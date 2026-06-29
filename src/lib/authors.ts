export type AuthorId = "ojekku";

export interface Author {
  id: AuthorId;
  name: string;
  avatarUrl: string;
}

export const AUTHORS: Record<AuthorId, Author> = {
  ojekku: {
    id: "ojekku",
    name: "Ojekku — PT Bangkit",
    avatarUrl: "/brand/ojekku-logo.svg",
  },
};

export function getAuthor(id: AuthorId | undefined): Author | undefined {
  if (!id) return undefined;
  return AUTHORS[id];
}
