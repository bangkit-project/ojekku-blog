# Ojekku Blog

Blog perusahaan **Ojekku** (PT Bangkit) — cerita membangun platform mobilitas berpusat pada driver, dimulai di Salatiga.

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

## Deploy (Netlify)

- Build command: `pnpm build`
- Publish directory: `dist`
- Custom domain: `blog.ojekku.com` (CNAME → Netlify)

Konfigurasi ada di [`netlify.toml`](netlify.toml). Push ke `main` memicu deploy otomatis setelah repo terhubung ke Netlify.

URL lama (`/blog/...`, `/about`) di-redirect ke locale Indonesia (`/id/blog`).

## Visi perusahaan

Konteks produk Ojekku dan prioritas PT Bangkit: [`bangkit-project/AGENTS.md`](https://github.com/bangkit-project/bangkit-project/blob/main/AGENTS.md).
