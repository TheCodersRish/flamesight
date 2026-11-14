#!/usr/bin/env node
// Free Gemini key helper for FlameSight's Fire Safety Analyst.
// Opens Google AI Studio (free tier), then writes GEMINI_API_KEY into .env.local.
// Never commit .env.local. Restart `npm run dev` after this script.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = path.join(ROOT, '.env.local');
const STUDIO = 'https://aistudio.google.com/apikey';

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
  } catch {
    console.log(`Open this URL manually: ${url}`);
  }
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(q, ans => { rl.close(); resolve(String(ans || '').trim()); }));
}

function upsertEnv(key, value) {
  let text = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(text)) text = text.replace(re, line);
  else text = `${text.trimEnd()}${text.trim() ? '\n' : ''}${line}\n`;
  fs.writeFileSync(ENV_FILE, text, 'utf8');
}

console.log('FlameSight — free Gemini API key setup');
console.log('1. A browser tab will open to Google AI Studio (free).');
console.log('2. Sign in with Google, create an API key, then paste it here.');
console.log('3. The key stays in .env.local on this machine only.\n');

openBrowser(STUDIO);
const key = await ask('Paste your free Gemini API key (or press Enter to cancel): ');
if (!key) {
  console.log('No key saved. Analyst still works with the built-in NASA notes (no model download).');
  process.exit(0);
}
if (!/^AIza[0-9A-Za-z_\-]{20,}$/.test(key) && key.length < 20) {
  console.log('That does not look like a Gemini key. Nothing was written.');
  process.exit(1);
}

upsertEnv('GEMINI_API_KEY', key);
if (!/^GEMINI_MODEL=/m.test(fs.readFileSync(ENV_FILE, 'utf8'))) {
  upsertEnv('GEMINI_MODEL', 'gemini-2.0-flash');
}

console.log(`\nSaved to ${path.relative(ROOT, ENV_FILE)}`);
console.log('Restart the app (`npm run dev`) so /api/ask can use the key.');
console.log('On Vercel, also set GEMINI_API_KEY in Project → Settings → Environment Variables.');
console.log('Do not commit .env.local.');
