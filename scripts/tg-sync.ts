#!/usr/bin/env npx tsx
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import {
  buildPostUrl,
  buildTelegramChunks,
  buildTelegramDeepLink,
  extractPostBody,
  findPostFile,
  listPostFiles,
  markdownToTelegramHtml,
  parsePostFrontmatter,
  parseTelegramFields,
  sleep,
  syncPostToTelegram,
  type BlogLocale,
} from "../src/lib/tg-sync";

const CONTENT_DIR = "src/content/blog";
const DEFAULT_SITE_URL = "https://blog.ojekku.com";
const POST_DELAY_MS = 500;

const HELP = `Usage: pnpm tg-sync [slug] [options]

  slug            Optional. Post one article by slug. Omit to post all
                  non-draft articles for the selected locale.

Options:
  --locale <id|en>   Post locale (default: id)
  --dry-run          Print chunks without sending to Telegram
  -h, --help         Show this help

Environment (.env in repo root):
  TELEGRAM_BOT_TOKEN          Bot token from BotFather
  TELEGRAM_CHANNEL_ID         @ojekku_channel or numeric channel id (-100…)
  TELEGRAM_SITE_URL           Optional; default ${DEFAULT_SITE_URL}

Posts the full article body to Telegram. Re-run edits existing channel
messages and updates telegramUrl / telegramMessageIds in frontmatter.

Examples:
  pnpm tg-sync
  pnpm tg-sync --dry-run
  pnpm tg-sync kenapa-ojekku-dimulai-di-salatiga
  pnpm tg-sync kenapa-ojekku-dimulai-di-salatiga --locale en
`;

type CliOptions = {
  slug?: string;
  locale: BlogLocale;
  dryRun: boolean;
};

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { locale: "id", dryRun: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      console.log(HELP);
      process.exit(0);
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--locale") {
      const locale = argv[i + 1];
      if (locale !== "id" && locale !== "en") {
        console.error('Error: --locale must be "id" or "en".');
        process.exit(1);
      }
      options.locale = locale;
      i += 1;
      continue;
    }

    if (arg.startsWith("--locale=")) {
      const locale = arg.slice("--locale=".length);
      if (locale !== "id" && locale !== "en") {
        console.error('Error: --locale must be "id" or "en".');
        process.exit(1);
      }
      options.locale = locale as BlogLocale;
      continue;
    }

    if (arg.startsWith("-")) {
      console.error(`Error: Unknown option "${arg}".`);
      process.exit(1);
    }

    if (!options.slug) {
      options.slug = arg;
      continue;
    }

    console.error(`Error: Unexpected argument "${arg}".`);
    process.exit(1);
  }

  return options;
}

async function printDryRunDetails(
  postPath: string,
  slug: string,
  locale: BlogLocale,
  channelId: string,
  siteUrl: string,
): Promise<void> {
  const content = await readFile(postPath, "utf8");
  const frontmatter = parsePostFrontmatter(content);
  const telegramFields = parseTelegramFields(content);
  const postUrl = buildPostUrl(siteUrl, locale, slug);
  const bodyHtml = markdownToTelegramHtml(extractPostBody(content));
  const { chunks, truncated } = buildTelegramChunks(
    frontmatter.title,
    bodyHtml,
    postUrl,
  );

  console.log(
    `=== ${slug} (1 message${truncated ? ", truncated" : ""}) ===`,
  );
  if (frontmatter.coverImage) {
    console.log("Cover: not sent to Telegram (blog only)");
  }
  console.log();
  console.log(chunks[0]);
  console.log();

  const previewId = telegramFields.telegramMessageIds.at(-1) ?? 0;
  if (previewId > 0) {
    console.log(`Would update: ${buildTelegramDeepLink(channelId, previewId)}`);
  } else {
    console.log("Would create a new Telegram post.");
  }
  console.log();
}

async function main(): Promise<void> {
  loadEnvFile(".env");

  const options = parseArgs(process.argv.slice(2));
  const siteUrl = process.env.TELEGRAM_SITE_URL?.trim() || DEFAULT_SITE_URL;
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const channelId = process.env.TELEGRAM_CHANNEL_ID?.trim();

  const entries = options.slug
    ? [await findPostFile(CONTENT_DIR, options.slug, options.locale)]
    : await listPostFiles(CONTENT_DIR, options.locale);

  if (entries.length === 0) {
    console.log(`No non-draft ${options.locale} posts found under ${CONTENT_DIR}.`);
    return;
  }

  if (options.dryRun) {
    console.log(
      `Dry run — ${entries.length} post(s) for locale "${options.locale}":\n`,
    );
    const previewChannel = channelId ?? "@ojekku_channel";
    for (const entry of entries) {
      await printDryRunDetails(
        entry.path,
        entry.slug,
        options.locale,
        previewChannel,
        siteUrl,
      );
    }
    console.log(`Channel: ${previewChannel}`);
    return;
  }

  console.log(`Syncing ${entries.length} post(s) to ${channelId ?? "(not set)"}…\n`);

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const result = await syncPostToTelegram({
      postPath: entry.path,
      slug: entry.slug,
      locale: options.locale,
      siteUrl,
      token,
      channelId,
      dryRun: false,
    });

    const label = result.action === "updated" ? "Updated" : "Posted";
    console.log(`${label} ${entry.slug} (${result.chunkCount} message(s)):`);
    console.log(`  ${result.telegramUrl}`);
    console.log(`  ${entry.path}`);

    if (index < entries.length - 1) {
      await sleep(POST_DELAY_MS);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
