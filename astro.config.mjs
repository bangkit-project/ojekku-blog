import { defineConfig } from 'astro/config'
import { unified } from '@astrojs/markdown-remark'
import mdx from '@astrojs/mdx'
import remarkGfm from 'remark-gfm'
import remarkSmartypants from 'remark-smartypants'
import rehypeExternalLinks from 'rehype-external-links'

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.ojekku.com',
  image: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ui-avatars.com' },
    ],
  },
  integrations: [mdx()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkGfm, remarkSmartypants],
      rehypePlugins: [
        [
          rehypeExternalLinks,
          {
            target: '_blank',
          },
        ],
      ],
    }),
    shikiConfig: {
      theme: 'nord',
    },
  },
})
