import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync } from 'node:fs'
import { createServer, defineConfig, loadEnv, type Plugin } from 'vite'

const SITE_URL = (process.env.SITE_URL ?? 'https://powerbiexercise.com').replace(/\/$/, '')

interface PageMeta { path: string; title: string; description: string }

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Puts one page's title, description and canonical URL into the built index.html. */
function withMeta(html: string, page: PageMeta): string {
  const url = SITE_URL + (page.path === '/' ? '/' : encodeURI(page.path))
  const t = escHtml(page.title)
  const d = escHtml(page.description)
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${d}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${t}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${d}" />`)
    .replace('</head>', `    <link rel="canonical" href="${url}" />\n    <meta property="og:url" content="${url}" />\n  </head>`)
}

/**
 * At build time: writes sitemap.xml and robots.txt, and one index.html per page (e.g. exercises/index.html)
 * with that page's own title and description, so search engines get them without running JavaScript.
 * The page list lives in src/lib/sitemapPaths.ts.
 */
function sitemap(): Plugin {
  return {
    name: 'sitemap',
    apply: 'build',
    // Run after Vite has emitted index.html, so it can be copied per page.
    enforce: 'post',
    async generateBundle(_options, bundle) {
      const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'error', server: { middlewareMode: true, hmr: false } })
      let pages: PageMeta[]
      try {
        const mod = (await server.ssrLoadModule('/src/lib/sitemapPaths.ts')) as { pageMeta: () => PageMeta[] }
        pages = mod.pageMeta()
      } finally {
        await server.close()
      }
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      const urls = pages.map((p) => `  <url><loc>${esc(SITE_URL + encodeURI(p.path))}</loc></url>`).join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n` })

      const index = bundle['index.html']
      if (!index || index.type !== 'asset') return
      const html = String(index.source)
      for (const page of pages) {
        if (page.path === '/') index.source = withMeta(html, page)
        else this.emitFile({ type: 'asset', fileName: `${decodeURI(page.path).slice(1)}/index.html`, source: withMeta(html, page) })
      }
    },
  }
}

/**
 * Runs the Vercel functions in api/*.ts on the dev server, so `npm run dev` serves /api/checkout etc. like production.
 * Server-only variables (STRIPE_SECRET_KEY, ...) are read from .env.local.
 */
function devApi(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, server.config.root, ''))
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const match = /^\/api\/([a-z0-9-]+)$/.exec(url.pathname)
        const file = match && `${server.config.root}/api/${match[1]}.ts`
        if (!file || !existsSync(file)) return next()
        try {
          const mod = (await server.ssrLoadModule(file)) as Record<string, (r: Request) => Promise<Response>>
          const handler = mod[req.method ?? 'GET']
          if (!handler) {
            res.statusCode = 405
            return res.end()
          }
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          const host = req.headers.host ?? 'localhost'
          const request = new Request(`http://${host}${req.url}`, {
            method: req.method,
            headers,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
          })
          const response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (e) {
          server.config.logger.error(`[api] ${(e as Error).stack ?? e}`)
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: (e as Error).message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), sitemap(), devApi()],
})
