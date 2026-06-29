import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { parseFilename } from "./content/blog-utils";

export const blogSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  publishDate: z.coerce.date(),
  draft: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  coverImage: z.string().optional(),
  updatedDate: z.coerce.date().optional(),
  authorId: z.literal("ojekku"),
});

export type BlogData = z.infer<typeof blogSchema>;

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.{en,id}.md",
    base: "./src/content/blog",
    generateId: ({ entry }) => {
      const parsed = parseFilename(entry);
      if (!parsed) return entry.replace(/\.md$/, "").replace(/\./g, "--");
      return `${parsed.slug}--${parsed.lang}`;
    },
  }),
  schema: blogSchema,
});

export const collections = { blog };

export {
  getBlogEntryId,
  parseBlogEntryId,
  type BlogEntryId,
} from "./content/blog-utils";
