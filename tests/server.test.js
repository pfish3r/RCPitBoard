import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { createApp, validateSettings } from '../server/index.js';
import { parseHeatSheet, parseResultsIndex } from '../server/liverc.js';

const settings = { live_url: 'https://lprcoffroad.liverc.com/live/', results_url: 'https://lprcoffroad.liverc.com/results/', scroll_speed: 16, refresh_seconds: 20 };
test('reject internal, alternate-port and mismatched timing URLs', () => {
  for (const live_url of ['http://127.0.0.1/', 'https://example.com', 'https://track.liverc.com:8443/', 'https://other.liverc.com/live/']) {
    assert.throws(() => validateSettings({ ...settings, live_url }));
  }
  assert.throws(() => validateSettings({ ...settings, refresh_seconds: 1 }));
});
test('auth, persistence, cache sharing, logout and static isolation', async () => {
  const directory = await mkdtemp(join(process.cwd(), 'rcpitboard-test-'));
  const distDir = join(directory, 'dist');
  await mkdir(distDir); await writeFile(join(distDir, 'index.html'), '<title>RCPitBoard</title>');
  let calls = 0;
  const options = { dataDir: join(directory, 'data'), distDir, env: { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'test-password-long-enough' },
    getSnapshot: async () => { calls++; await new Promise(r => setTimeout(r, 20)); return { track: { name: 'Test Track' } }; } };
  let server = await createApp(options);
  const base = 'http://test';
  async function listen() {}
  // Exercise the actual HTTP handler without requiring network access in the test runner.
  function fetch(url, options = {}) {
    const request = Readable.from(options.body ? [Buffer.from(options.body)] : []);
    request.method = options.method || 'GET'; request.url = new URL(url).pathname;
    request.headers = Object.fromEntries(Object.entries(options.headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
    request.socket = { remoteAddress: '127.0.0.1' };
    return new Promise(resolve => {
      const headers = new Headers(); let status = 200;
      const response = {
        setHeader: (key, value) => headers.set(key, value),
        writeHead: (code, values) => { status = code; for (const [key, value] of Object.entries(values)) headers.set(key, value); },
        end: data => resolve(new Response(data, { status, headers })),
      };
      server.emit('request', request, response);
    });
  }
  const headers = { 'Content-Type': 'application/json', 'X-RCPitBoard': '1' };
  const close = async () => { server.emit('close'); };
  try {
    await listen();
    assert.equal((await fetch(base + '/admin')).status, 200);
    assert.equal((await fetch(base + '/.env')).status, 404);
    assert.equal((await fetch(base + '/server/index.js')).status, 404);
    assert.equal((await fetch(base + '/api/auth/me')).status, 401);
    assert.equal((await fetch(base + '/api/settings', { method: 'PUT', headers, body: JSON.stringify(settings) })).status, 401);
    assert.equal((await fetch(base + '/api/auth/login', { method: 'POST', body: '{}' })).status, 403);
    const login = await fetch(base + '/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ email: 'admin@example.com', password: 'test-password-long-enough' }) });
    assert.equal(login.status, 200);
    headers.Cookie = login.headers.get('set-cookie').split(';')[0];
    const changed = { ...settings, scroll_speed: 30 };
    assert.equal((await fetch(base + '/api/settings', { method: 'PUT', headers, body: JSON.stringify(changed) })).status, 200);
    const responses = await Promise.all(Array.from({ length: 5 }, () => fetch(base + '/api/snapshot')));
    assert.ok(responses.every(r => r.status === 200)); assert.equal(calls, 1);
    await fetch(base + '/api/auth/logout', { method: 'POST', headers });
    assert.equal((await fetch(base + '/api/auth/me', { headers })).status, 401);
    await close();
    server = await createApp(options); await listen();
    assert.equal((await (await fetch(base + '/api/settings')).json()).scroll_speed, 30);
    assert.equal((await fetch(base + '/api/auth/me', { headers })).status, 401);
  } finally { await close(); await rm(directory, { recursive: true, force: true }); }
});
test('preserved LiveRC parsers read rounds and heat entries', () => {
  const index = parseResultsIndex('<h1 class="page-header">Test Track</h1><a href="?p=view_heat_sheet&amp;id=42">Qualifier Round 1</a>');
  assert.equal(index.trackName, 'Test Track'); assert.equal(index.rounds[0].id, '42');
  const sheet = parseHeatSheet('<div class="race_num">1</div><span class="class_header">2WD (Heat 1)</span><span class="race_length">Length: 5:00</span><span class="race_status">Not yet run</span><td>1</td><td><span class="car_num">3</span>Paul Fisher</td>');
  assert.equal(sheet.races[0].className, '2WD'); assert.equal(sheet.races[0].drivers[0].name, 'Paul Fisher');
});
