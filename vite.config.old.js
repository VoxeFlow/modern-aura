import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

function localAiProxyPlugin(openaiApiKey, remoteProxyUrl) {
  return {
    name: 'local-ai-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        if (!openaiApiKey && !remoteProxyUrl) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'AI proxy is not configured. Set OPENAI_API_KEY or AI_PROXY_URL.' }))
          return
        }

        try {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const rawBody = Buffer.concat(chunks).toString('utf8') || '{}'
          const body = JSON.parse(rawBody)

          const upstream = openaiApiKey
            ? await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${openaiApiKey}`,
              },
              body: JSON.stringify(body),
            })
            : await fetch(remoteProxyUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body),
            })

          const data = await upstream.text()
          res.statusCode = upstream.status
          res.setHeader('Content-Type', 'application/json')
          res.end(data)
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error.message || 'Local AI proxy failed.' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const openaiApiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY
  const remoteProxyUrl = env.AI_PROXY_URL || env.VITE_AI_PROXY_URL || 'https://modern-aura.pages.dev/api/ai'

  return {
    plugins: [react(), localAiProxyPlugin(openaiApiKey, remoteProxyUrl)],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          app: resolve(__dirname, 'app/index.html'),
        },
      },
    },
  }
})
