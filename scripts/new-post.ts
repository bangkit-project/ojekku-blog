#!/usr/bin/env npx tsx
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const CONTENT_DIR = "src/content/blog";

const HELP = `Usage: pnpm new-post [title] [slug]

  title   Optional. Post title. Default: "Untitled". Slug is auto-generated from title.
  slug    Optional. Override the auto-generated slug.

Examples:
  pnpm new-post
  pnpm new-post "My First Post"
  pnpm new-post "My First Post" my-custom-slug

Creates both .en.md and .id.md files in src/content/blog/[year]/[month]/.
`;

function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatTimestamp(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8).replace(/:/g, "-");
  return `${date}_${time}`;
}

function buildContent(
  id: string,
  title: string,
  publishDate: string,
  lang: "en" | "id",
): string {
  const langRemark = lang === "en" ? "# English (en)" : "# Indonesian (id)";
  return `---
${langRemark}
id: "${id}"
title: ${JSON.stringify(title)}
description: ""
publishDate: "${publishDate}"
draft: false
authorId: ojekku
# Optional fields:
# tags: []
# coverImage: ""
# updatedDate: ""
# telegramUrl: ""          # set by pnpm tg-sync
# telegramMessageIds: []   # set by pnpm tg-sync
---

`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }

  const filteredArgs = args.filter((a) => a !== "--help" && a !== "-h");

  const timestamp = formatTimestamp();
  const id = randomUUID();

  let slug = `draft-${Date.now()}`;
  let title = "Untitled";

  if (filteredArgs.length >= 1) {
    title =
      filteredArgs.length === 1
        ? filteredArgs[0]
        : filteredArgs.slice(0, -1).join(" ");
    const slugFromTitle = sanitizeSlug(title);
    if (slugFromTitle) slug = slugFromTitle;
    if (filteredArgs.length >= 2) {
      const customSlug = sanitizeSlug(filteredArgs[filteredArgs.length - 1]);
      if (customSlug) slug = customSlug;
    }
  }

  const filenameBase = `${timestamp}_${slug}`;
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const subdir = join(CONTENT_DIR, year, month);
  const enPath = join(subdir, `${filenameBase}.en.md`);
  const idPath = join(subdir, `${filenameBase}.id.md`);

  if (existsSync(enPath) || existsSync(idPath)) {
    console.error(`Error: Files already exist for slug "${slug}"`);
    console.error(`  - ${enPath}`);
    console.error(`  - ${idPath}`);
    process.exit(1);
  }

  const publishDate = `${timestamp.slice(0, 10)}T${timestamp.slice(11).replace(/-/g, ":")}`;

  await mkdir(subdir, { recursive: true });
  await writeFile(enPath, buildContent(id, title, publishDate, "en"));
  await writeFile(idPath, buildContent(id, title, publishDate, "id"));

  console.log("Created:");
  console.log(`  - ${enPath}`);
  console.log(`  - ${idPath}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
