# Ojekku Blog

Blog perusahaan **Ojekku** — cerita membangun platform mobilitas berpusat pada driver, dimulai di Salatiga.

**Live:** [blog.ojekku.com](https://blog.ojekku.com)

## Stack

- [Astro](https://astro.build) 7
- Bilingual markdown content collections (`src/content/blog/`)
- Locale routing (`/id/`, `/en/`)
- Pagination, [Pagefind](https://pagefind.app/) search
- Dark/light theme, SEO meta + Open Graph
- Vitest + Playwright

## Development

```bash
pnpm install
cp .env.example .env   # set PUBLIC_BLOG_API_BASE as needed
pnpm dev      # http://localhost:4321
pnpm build    # includes Pagefind index
pnpm preview
pnpm test
pnpm test:e2e
```

## Menambah artikel

```bash
pnpm new-post "Judul artikel" url-slug
```

Membuat pasangan `.id.md` + `.en.md` di `src/content/blog/[year]/[month]/`. Lihat [`docs/content-structure.md`](docs/content-structure.md).

URL artikel: `/{locale}/blog/{slug}` (mis. `/id/blog/kenapa-ojekku-dimulai-di-salatiga`).

## Cross-post ke Telegram

Setelah artikel **live** di Netlify, kirim **isi penuh** ke channel [@ojekku_channel](https://t.me/ojekku_channel):

```bash
# .env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID=@ojekku_channel
pnpm tg-sync
pnpm tg-sync --dry-run
pnpm tg-sync kenapa-ojekku-dimulai-di-salatiga
pnpm tg-sync kenapa-ojekku-dimulai-di-salatiga --locale en
```

Tanpa slug, script memposting **semua** artikel non-draft locale `id` (urut `publishDate` naik).

Script menulis `telegramUrl` dan `telegramMessageIds` ke frontmatter artikel. **Re-run** memperbarui pesan channel yang sudah ada (bukan post baru). Setiap artikel = **satu pesan teks** di channel; link blog ada di **baris pertama** sebagai anchor HTML. `coverImage` hanya untuk tampilan blog/OG, **tidak** dikirim ke Telegram. Body yang melebihi 4096 karakter dipotong dengan peringatan.

**Engagement di blog:** read-only — komentar dan reaksi disinkronkan dari Telegram via blog-api (`GET .../telegram/messages/{id}/comments`). Halaman artikel memakai `telegramMessageIds[0]` dari frontmatter. CTA "Komentar di Telegram" mengarah ke channel; interaksi di channel + discussion group.

**Setup sekali:** bot harus admin channel **dan** discussion group dengan izin baca pesan. blog-api perlu webhook + `Telegram:DefaultChannelId=@ojekku_channel` (lihat repo blog-api).

## Deploy (Netlify)

- Build command: `pnpm build`
- Publish directory: `dist`
- Custom domain: `blog.ojekku.com` (CNAME → Netlify)

Konfigurasi ada di [`netlify.toml`](netlify.toml). Push ke `main` memicu deploy otomatis setelah repo terhubung ke Netlify.

### Environment variables (Netlify)

Lihat [`.env.example`](.env.example):

- `PUBLIC_BLOG_API_BASE` — engagement API + author byline hydration (`/api/v1/user-snapshots/{authorId}`)
- `PUBLIC_BLOG_SITE_ID` — `ojekku-blog`

URL lama (`/blog/...`, `/about`) di-redirect ke locale Indonesia (`/id/blog`).

## Visi perusahaan

Konteks produk Ojekku: [`bangkit-project/AGENTS.md`](https://github.com/bangkit-project/bangkit-project/blob/main/AGENTS.md).
