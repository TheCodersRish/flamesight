import { defineConfig, loadEnv, type Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import {
  matchStudiesWithOpenRouter,
  streamAnswerWithOpenRouter,
  type AskContext,
  type StudyCatalogEntry,
} from './lib/openrouterServer';

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer | string) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function openRouterDev(key: string | undefined, model: string): Plugin {
  return {
    name: 'flamesight-openrouter',
    configureServer(server) {
      server.middlewares.use('/api/ask', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'POST only' }));
          return;
        }
        void (async () => {
          try {
            if (!key) {
              res.statusCode = 503;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-store');
              res.end(JSON.stringify({ error: 'No OPENROUTER_API_KEY configured; using local retrieval.' }));
              return;
            }
            const body = (await readJsonBody(req)) as { question?: string; context?: AskContext[]; workspace?: string };
            res.writeHead(200, {
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-store, no-cache',
              Connection: 'keep-alive',
              'X-Accel-Buffering': 'no',
            });
            let full = '';
            for await (const chunk of streamAnswerWithOpenRouter({
              key,
              model,
              question: String(body.question || ''),
              context: Array.isArray(body.context) ? body.context : [],
              workspace: String(body.workspace || ''),
            })) {
              full += chunk;
              res.write(`data: ${JSON.stringify({ t: chunk })}\n\n`);
            }
            res.write(`data: ${JSON.stringify({ done: true, answer: full.trim() })}\n\n`);
            res.end();
          } catch (e) {
            const message = e instanceof Error ? e.message.slice(0, 300) : 'OpenRouter request failed';
            if (res.headersSent) {
              res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
              res.end();
            } else {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-store');
              res.end(JSON.stringify({ error: message }));
            }
          }
        })();
      });

      server.middlewares.use('/api/search-study', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'POST only' }));
          return;
        }
        void (async () => {
          try {
            if (!key) {
              res.statusCode = 503;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-store');
              res.end(JSON.stringify({ error: 'No OPENROUTER_API_KEY configured; using local search.' }));
              return;
            }
            const body = (await readJsonBody(req)) as { query?: string; catalog?: StudyCatalogEntry[] };
            const accessions = await matchStudiesWithOpenRouter({
              key,
              model,
              query: String(body.query || ''),
              catalog: Array.isArray(body.catalog) ? body.catalog : [],
            });
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify({ accessions }));
          } catch (e) {
            const message = e instanceof Error ? e.message.slice(0, 300) : 'OpenRouter study match failed';
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify({ error: message }));
          }
        })();
      });
    },
  };
}

// base './' so the dist/ folder works on Vercel, Netlify, GitHub Pages (any sub-path) and HashRouter keeps routing client-side.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), openRouterDev(env.OPENROUTER_API_KEY, env.OPENROUTER_MODEL || 'openai/gpt-4o-mini')],
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
