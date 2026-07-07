#!/usr/bin/env npx tsx
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const CONTENT_DIR = "src/content/blog";
const AUTHORS_FILE = "src/lib/authors.ts";

type AuthorFallback = {
  id: string;
  name: string;
  avatarUrl: string;
};

function extractFrontmatterBlock(content: string): string | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

function readFrontmatterField(frontmatter: string, field: string): string | undefined {
  const regex = new RegExp(`^${field}:\\s*(.+)$`, "m");
  const match = frontmatter.match(regex);
  if (!match) return undefined;

  let value = match[1].trim();
  const commentIndex = value.indexOf(" #");
  if (commentIndex !== -1) value = value.slice(0, commentIndex).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return JSON.parse(value.replace(/^'/g, '"').replace(/'$/g, '"')) as string;
  }

  return value;
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else files.push(fullPath);
  }
  return files;
}

function buildDefaultFallbackAuthor(id: string): AuthorFallback {
  const trimmed = id.trim();
  const safeId = trimmed || "unknown";
  const initials =
    safeId
      .split(/[._-]+/g)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U";

  return {
    id: safeId,
    name: safeId,
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=0D8ABC&color=fff&rounded=true&size=64`,
  };
}

function generateAuthorRegistryEntries(authorIds: string[]): string {
  if (authorIds.length === 0) return "";

  const lines: string[] = [];
  for (const id of authorIds) {
    const author = buildDefaultFallbackAuthor(id);
    lines.push(
      `  ${JSON.stringify(id)}: {`,
      `    id: ${JSON.stringify(author.id)},`,
      `    name: ${JSON.stringify(author.name)},`,
      `    avatarUrl: ${JSON.stringify(author.avatarUrl)},`,
      `  },`,
    );
  }
  return lines.join("\n");
}

function replaceGeneratedRegion(fileContent: string, generatedBody: string): string {
  const start = "// BEGIN GENERATED AUTHORS";
  const end = "// END GENERATED AUTHORS";

  const markerRegex = new RegExp(
    `${start}[\\s\\S]*?${end}`,
    "m",
  );

  if (!markerRegex.test(fileContent)) {
    throw new Error(
      `Missing generated region markers in ${AUTHORS_FILE}. Expected:\n${start}\n...\n${end}`,
    );
  }

  const replacement = `${start}\n${generatedBody ? generatedBody + "\n" : ""}  ${end}`;
  return fileContent.replace(markerRegex, replacement);
}

async function main(): Promise<void> {
  const files = await walk(CONTENT_DIR);
  const authorIds = new Set<string>();

  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const content = await readFile(file, "utf8");
    const fm = extractFrontmatterBlock(content);
    if (!fm) continue;
    const authorId = readFrontmatterField(fm, "authorId")?.trim();
    if (!authorId) continue;
    if (authorId === "ojekku") continue;
    authorIds.add(authorId);
  }

  const sorted = [...authorIds].sort((a, b) => a.localeCompare(b));
  const generated = generateAuthorRegistryEntries(sorted);

  const authorsFile = await readFile(AUTHORS_FILE, "utf8");
  const updated = replaceGeneratedRegion(authorsFile, generated);

  if (updated === authorsFile) {
    console.log("authors.ts already up to date.");
    return;
  }

  await writeFile(AUTHORS_FILE, updated);
  console.log(`Updated ${AUTHORS_FILE} with ${sorted.length} generated author(s).`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

