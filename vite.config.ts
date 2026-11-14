import { defineConfig, loadEnv, type Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import { answerWithGemini, type AskContext } from './api/gemini';

function geminiDev(key: string | undefined, model: string): Plugin {
  return {
    name: 'flamesight-gemini',
    configureServer(server) {
      server.middlewares.use('/api/ask', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'POST only' }));
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer | string) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        req.on('end', () => {
          void (async () => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            try {
              if (!key) {
                res.statusCode = 503;
                res.end(JSON.stringify({ error: 'No GEMINI_API_KEY configured; using local retrieval.' }));
                return;
              }
              const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { question?: string; context?: AskContext[] };
              const answer = await answerWithGemini({
                key,
                model,
                question: String(body.question || ''),
                context: Array.isArray(body.context) ? body.context : [],
              });
              res.statusCode = 200;
              res.end(JSON.stringify({ answer }));
            } catch (e) {
              res.statusCode = 502;
              res.end(JSON.stringify({ error: e instanceof Error ? e.message.slice(0, 300) : 'Gemini request failed' }));
            }
          })();
        });
      });
    },
  };
}

// base './' so the dist/ folder works on Vercel, Netlify, GitHub Pages (any sub-path) and HashRouter keeps routing client-side.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), geminiDev(env.GEMINI_API_KEY, env.GEMINI_MODEL || 'gemini-3-flash-preview')],
    optimizeDeps: { exclude: ['@huggingface/transformers'] },
    server: { host: true, port: 5173, strictPort: true },
    base: './',
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three'],
            charts: ['recharts'],
            react: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
          },
        },
      },
    },
  };
});
