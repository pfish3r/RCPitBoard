import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { resolve, extname, dirname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import snapshot from './snapshot.js';

const deriveKey = promisify(scrypt);
const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaults = { id: 'track', live_url: 'https://lprcoffroad.liverc.com/live/',
  results_url: 'https://lprcoffroad.liverc.com/results/', scroll_speed: 16, refresh_seconds: 20 };
const fail = (status, message) => Object.assign(new Error(message), { status });

export function validateSettings(data) {
  const value = { id: 'track' };
  for (const key of ['live_url', 'results_url']) {
    let url;
    try { url = new URL(data[key]); } catch { throw fail(400, 'Enter valid LiveRC URLs'); }
    if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.liverc\.com$/i.test(url.hostname) ||
        url.port || url.username || url.password) throw fail(400, 'URLs must use https://TRACK.liverc.com');
    value[key] = url.href;
  }
  if (new URL(value.live_url).origin !== new URL(value.results_url).origin) throw fail(400, 'Both URLs must belong to the same track');
  for (const [key, min, max] of [['scroll_speed', 4, 60], ['refresh_seconds', 5, 60]]) {
    const n = Number(data[key]);
    if (!Number.isInteger(n) || n < min || n > max) throw fail(400, `${key} must be between ${min} and ${max}`);
    value[key] = n;
  }
  return value;
}

export async function createApp(options = {}) {
  const env = options.env || process.env;
  const email = (env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = env.ADMIN_PASSWORD || '';
  if (!email.includes('@') || password.length < 16) throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 16 characters in .env');
  const secure = env.COOKIE_SECURE === 'true';
  const salt = randomBytes(32);
  const passwordHash = await deriveKey(password, salt, 64);
  const dataDir = resolve(options.dataDir || env.DATA_DIR || resolve(project, 'data'));
  const distDir = resolve(options.distDir || resolve(project, 'dist'));
  const file = resolve(dataDir, 'settings.json');
  await mkdir(dataDir, { recursive: true });
  let settings;
  try { settings = validateSettings(JSON.parse(await readFile(file, 'utf8'))); }
  catch (err) {
    if (err.code !== 'ENOENT') throw new Error(`Cannot read saved settings: ${err.message}`);
    settings = { ...defaults };
  }
  const sessions = new Map();
  const attempts = new Map();
  let cached, pending;
  const getSnapshot = options.getSnapshot || (async (saved) => {
    const response = await snapshot(saved);
    const data = await response.json();
    if (!response.ok) throw fail(502, data.error || 'Timing feed unavailable');
    return data;
  });
  function json(res, status, data, headers = {}) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
    res.end(JSON.stringify(data));
  }
  const cookie = token => `rcpitboard_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token ? 43200 : 0}${secure ? '; Secure' : ''}`;
  const digest = token => createHash('sha256').update(token).digest('hex');
  function auth(req) {
    const token = (req.headers.cookie || '').match(/(?:^|;\s*)rcpitboard_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    const expires = token && sessions.get(digest(token));
    if (!expires || expires < Date.now()) throw fail(401, 'Sign in to change settings');
  }
  async function body(req) {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw) > 8192) throw fail(413, 'Request too large');
    }
    try { return JSON.parse(raw || '{}'); } catch { throw fail(400, 'Invalid JSON'); }
  }
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(req.method) && req.headers['x-rcpitboard'] !== '1') throw fail(403, 'Missing request header');
        // No CORS headers are emitted; cross-origin custom-header requests cannot pass preflight.
        if (req.method === 'GET' && path === '/api/health') return json(res, 200, { ok: true, version: '1.0.0' });
        if (req.method === 'POST' && path === '/api/auth/login') {
          const key = req.socket.remoteAddress;
          const now = Date.now();
          const attempt = attempts.get(key) || { count: 0, until: now + 15 * 60_000 };
          if (attempt.until < now) { attempt.count = 0; attempt.until = now + 15 * 60_000; }
          if (++attempt.count > 10) { attempts.set(key, attempt); throw fail(429, 'Too many attempts. Try again in 15 minutes.'); }
          attempts.set(key, attempt);
          const input = await body(req);
          const candidate = await deriveKey(String(input.password || ''), salt, 64);
          if (!timingSafeEqual(candidate, passwordHash) || String(input.email || '').trim().toLowerCase() !== email) throw fail(401, 'Invalid email or password');
          attempts.delete(key);
          const token = randomBytes(32).toString('hex');
          sessions.set(digest(token), now + 12 * 60 * 60_000);
          return json(res, 200, { email, role: 'admin' }, { 'Set-Cookie': cookie(token) });
        }
        if (req.method === 'POST' && path === '/api/auth/logout') {
          const token = (req.headers.cookie || '').match(/rcpitboard_session=([a-f0-9]{64})/)?.[1];
          if (token) sessions.delete(digest(token));
          return json(res, 200, { ok: true }, { 'Set-Cookie': cookie('') });
        }
        if (req.method === 'GET' && path === '/api/auth/me') { auth(req); return json(res, 200, { email, role: 'admin' }); }
        if (req.method === 'GET' && path === '/api/settings') return json(res, 200, settings);
        if (req.method === 'PUT' && path === '/api/settings') {
          auth(req);
          const next = validateSettings(await body(req));
          const tmp = `${file}.${randomBytes(8).toString('hex')}.tmp`;
          await writeFile(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
          await rename(tmp, file);
          settings = next; cached = null;
          return json(res, 200, settings);
        }
        if (req.method === 'GET' && path === '/api/snapshot') {
          const cacheKey = JSON.stringify(settings);
          if (cached?.key === cacheKey && Date.now() - cached.at < settings.refresh_seconds * 1000) return json(res, 200, cached.data);
          if (!pending || pending.key !== cacheKey) {
            const task = { key: cacheKey };
            task.promise = getSnapshot({ ...settings }).then(data => {
              if (JSON.stringify(settings) === cacheKey) cached = { key: cacheKey, at: Date.now(), data };
              return data;
            }).finally(() => { if (pending === task) pending = null; });
            pending = task;
          }
          return json(res, 200, await pending.promise);
        }
        throw fail(404, 'API route not found');
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw fail(405, 'Method not allowed');
      const decoded = decodeURIComponent(path);
      let target = resolve(distDir, '.' + decoded);
      if (target !== distDir && !target.startsWith(distDir + sep)) throw fail(403, 'Forbidden');
      if (decoded.split('/').some(part => part.startsWith('.') && part !== '')) throw fail(404, 'Not found');
      if (!extname(target)) target = resolve(distDir, 'index.html');
      const data = await readFile(target).catch(() => { throw fail(404, 'File not found. Build the frontend first.'); });
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
      res.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream', 'Cache-Control': extname(target) === '.html' ? 'no-cache' : 'public, max-age=3600' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (err) {
      if (!err.status) console.error(err);
      json(res, err.status || 500, { error: err.status ? err.message : 'Internal server error' });
    }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  const cleanup = setInterval(() => {
    for (const [key, expires] of sessions) if (expires < Date.now()) sessions.delete(key);
    for (const [key, value] of attempts) if (value.until < Date.now()) attempts.delete(key);
  }, 60_000).unref();
  server.on('close', () => clearInterval(cleanup));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const server = await createApp();
  server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log(`RCPitBoard listening on port ${process.env.PORT || 3000}`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
