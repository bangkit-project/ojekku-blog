# Ojekku Blog — AGENTS

## What this repo is

**Company-facing** content site for **Ojekku** (PT Bangkit). Not the founder's personal blog (`~/personal-blog`).

- **Product:** [ojekku.com](https://ojekku.com)
- **Blog URL:** [blog.ojekku.com](https://blog.ojekku.com)
- **Audience:** riders and drivers in Salatiga (initial), plus anyone following how Ojekku is built

## Current phase

- Static Astro site, bilingual content (ID/EN) in `src/content/blog/`
- Locale routing: `/id/...`, `/en/...` (root redirects to `/id/`)
- Pagination, Pagefind search, `new-post` script
- Vitest + Playwright
- Dark/light theme (Ojekku brand CSS)
- No auth, comments, or likes yet

## Deferred (later phases)

- Authentik OIDC for engagement (comments, likes)
- RSS feed

## Content conventions

Posts use frontmatter per [`docs/content-structure.md`](docs/content-structure.md). See [`README.md`](README.md) for `pnpm new-post`.

Publishing: merge to `main` → Netlify deploy.

## Relationship to PT Bangkit vision

See [`bangkit-project/AGENTS.md`](https://github.com/bangkit-project/bangkit-project/blob/main/AGENTS.md) for Ojekku positioning, Salatiga launch, and driver-centric model.

## Assistant role

Junior execution support — minimal scope, match existing patterns. Ask for clarification on high-level decisions (tone, content, brand).
