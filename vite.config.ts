import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createServer, defineConfig, type Plugin } from 'vite'

const SITE_URL = (process.env.SITE_URL ?? 'https://bi-exercises.vercel.app').replace(/\/$/, '')

/** Writes sitemap.xml and robots.txt into the build, listing every page from src/lib/sitemapPaths.ts. */
function sitemap(): Plugin {
  return {
    name: 'sitemap',
    apply: 'build',
    async generateBundle() {
      const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'error', server: { middlewareMode: true, hmr: false } })
      let paths: string[]
      try {
        const mod = (await server.ssrLoadModule('/src/lib/sitemapPaths.ts')) as { sitemapPaths: () => string[] }
        paths = mod.sitemapPaths()
      } finally {
        await server.close()
      }
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      const urls = paths.map((p) => `  <url><loc>${esc(SITE_URL + encodeURI(p))}</loc></url>`).join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n` })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), sitemap()],
})
