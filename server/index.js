import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { resolve, extname, dirname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import snapshot from './snapshot.js';
import { observeRaceTiming, raceEstimate } from './race-estimates.js';

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
  const boardFile = resolve(dataDir, 'board.json');
  let board = { paused: false, pausedAt: null, totalPausedMs: 0, revision: 'initial', snapshot: null };
  try { board = { ...board, ...JSON.parse(await readFile(boardFile, 'utf8')) }; }
  catch (err) { if (err.code !== 'ENOENT') throw new Error(`Cannot read board state: ${err.message}`); }
  const estimatesFile = resolve(dataDir, 'estimates.json');
  let estimates = null, interrupted = true;
  try { estimates = JSON.parse(await readFile(estimatesFile, 'utf8')); }
  catch (err) { if (err.code !== 'ENOENT') console.error('Could not restore race estimates:', err.message); }
  let lastSnapshot = board.snapshot;
  let cached, pending, controlQueue = Promise.resolve();
  const boardStatus = () => {
    const { snapshot: _snapshot, ...status } = board;
    return status;
  };
  const boardSnapshot = data => ({ ...(data || {}), board: boardStatus() });
  function setPaused(paused) {
    const task = controlQueue.then(async () => {
      if (board.paused === paused) return;
      const now = Date.now();
      const next = {
        paused, pausedAt: paused ? now : null,
        totalPausedMs: board.totalPausedMs + (board.paused ? Math.max(0, now - board.pausedAt) : 0),
        revision: randomBytes(8).toString('hex'),
        snapshot: paused ? cached?.data || lastSnapshot || null : null,
      };
      const tmp = `${boardFile}.${randomBytes(8).toString('hex')}.tmp`;
      await writeFile(tmp, JSON.stringify(next), { mode: 0o600 });
      await rename(tmp, boardFile);
      board = next;
      interrupted = true;
      if (!paused) { cached = null; pending = null; }
    });
    controlQueue = task.catch(() => {});
    return task;
  }
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
        if (req.method === 'GET' && path === '/api/board') return json(res, 200, boardStatus());
        if (req.method === 'PUT' && path === '/api/board') {
          const data = await body(req);
          if (typeof data.paused !== 'boolean') throw fail(400, 'paused must be true or false');
          await setPaused(data.paused);
          return json(res, 200, boardStatus());
        }
        if (req.method === 'GET' && path === '/api/settings') return json(res, 200, settings);
        if (req.method === 'PUT' && path === '/api/settings') {
          const next = validateSettings(await body(req));
          const tmp = `${file}.${randomBytes(8).toString('hex')}.tmp`;
          await writeFile(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
          await rename(tmp, file);
          settings = next; cached = null;
          return json(res, 200, settings);
        }
        if (req.method === 'GET' && path === '/api/snapshot') {
          if (board.paused) return json(res, 200, boardSnapshot(board.snapshot));
          const revision = board.revision;
          const cacheKey = JSON.stringify(settings);
          if (cached?.key === cacheKey && Date.now() - cached.at < settings.refresh_seconds * 1000) return json(res, 200, boardSnapshot(cached.data));
          if (!pending || pending.key !== cacheKey) {
            const task = { key: cacheKey };
            task.promise = getSnapshot({ ...settings }).then(async data => {
              if (!board.paused && board.revision === revision && JSON.stringify(settings) === cacheKey) {
                estimates = observeRaceTiming(estimates, data, interrupted);
                interrupted = data.feed?.liveConnected === false;
                data = { ...data, timingEstimate: raceEstimate(estimates, data) };
                // One shared feed task writes the learned samples for all screens.
                const tmp = `${estimatesFile}.tmp`;
                try { await writeFile(tmp, JSON.stringify(estimates), { mode: 0o600 }); await rename(tmp, estimatesFile); }
                catch (err) { console.error('Could not save race estimates:', err.message); }
                if (!board.paused && board.revision === revision && JSON.stringify(settings) === cacheKey) {
                  cached = { key: cacheKey, at: Date.now(), data };
                  lastSnapshot = data;
                }
              }
              return data;
            }).catch(error => {
              interrupted = true;
              throw error;
            }).finally(() => { if (pending === task) pending = null; });
            pending = task;
          }
          const data = await pending.promise;
          if (!board.paused && board.revision !== revision) throw fail(409, 'Board status changed; refresh to get current race data');
          return json(res, 200, boardSnapshot(board.paused ? board.snapshot : data));
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
