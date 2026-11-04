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
test('settings work without credentials and preserve validation, persistence and cache sharing', async () => {
  const directory = await mkdtemp(join(process.cwd(), 'rcpitboard-test-'));
  const distDir = join(directory, 'dist');
  await mkdir(distDir); await writeFile(join(distDir, 'index.html'), '<title>RCPitBoard</title>');
  let calls = 0;
  const options = { dataDir: join(directory, 'data'), distDir, env: {},
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
    assert.equal((await fetch(base + '/api/auth/me')).status, 404);
    assert.equal((await fetch(base + '/api/auth/login', { method: 'POST', headers, body: '{}' })).status, 404);
    assert.equal((await fetch(base + '/api/settings', { method: 'PUT', body: JSON.stringify(settings) })).status, 403);
    assert.equal((await fetch(base + '/api/settings', { method: 'PUT', headers, body: JSON.stringify({ ...settings, live_url: 'http://127.0.0.1/' }) })).status, 400);
    const changed = { ...settings, scroll_speed: 30 };
    const saved = await fetch(base + '/api/settings', { method: 'PUT', headers, body: JSON.stringify(changed) });
    assert.equal(saved.status, 200);
    assert.equal(saved.headers.get('set-cookie'), null);
    assert.equal((await saved.json()).scroll_speed, 30);
    const responses = await Promise.all(Array.from({ length: 5 }, () => fetch(base + '/api/snapshot')));
    assert.ok(responses.every(r => r.status === 200)); assert.equal(calls, 1);
    await close();
    // Old installations can keep obsolete or blank credentials in their .env.
    server = await createApp({ ...options, env: { ADMIN_EMAIL: '', ADMIN_PASSWORD: '' } }); await listen();
    assert.equal((await (await fetch(base + '/api/settings')).json()).scroll_speed, 30);
    assert.equal((await fetch(base + '/api/settings', { method: 'PUT', headers, body: JSON.stringify(changed) })).status, 200);
  } finally { await close(); await rm(directory, { recursive: true, force: true }); }
});
test('preserved LiveRC parsers read rounds and heat entries', () => {
  const index = parseResultsIndex('<h1 class="page-header">Test Track</h1><a href="?p=view_heat_sheet&amp;id=42">Qualifier Round 1</a>');
  assert.equal(index.trackName, 'Test Track'); assert.equal(index.rounds[0].id, '42');
  const sheet = parseHeatSheet('<div class="race_num">1</div><span class="class_header">2WD (Heat 1)</span><span class="race_length">Length: 5:00</span><span class="race_status">Not yet run</span><td>1</td><td><span class="car_num">3</span>Paul Fisher</td>');
  assert.equal(sheet.races[0].className, '2WD'); assert.equal(sheet.races[0].drivers[0].name, 'Paul Fisher');
});

test('shared pause freezes the feed, survives restart, and resumes with fresh data', async () => {
  const directory = await mkdtemp(join(process.cwd(), 'rcpitboard-pause-test-'));
  let calls = 0;
  let release;
  const options = { dataDir: directory, env: {}, getSnapshot: async () => {
    const call = ++calls;
    if (call === 2) await new Promise(resolve => { release = resolve; });
    return { fetchedAt: new Date().toISOString(), current: { seq: call } };
  } };
  let server = await createApp(options);
  async function request(path, method = 'GET', data, header = true) {
    const req = Readable.from(data === undefined ? [] : [Buffer.from(JSON.stringify(data))]);
    req.method = method; req.url = '/api/' + path;
    req.headers = header ? { 'x-rcpitboard': '1' } : {};
    return new Promise(resolve => server.emit('request', req, {
      setHeader() {}, writeHead(status) { this.status = status; },
      end(body) { resolve({ status: this.status, data: JSON.parse(body) }); },
    }));
  }
  try {
    assert.equal((await request('board', 'PUT', { paused: true }, false)).status, 403);
    assert.equal((await request('board', 'PUT', { paused: 'yes' })).status, 400);
    const initial = await request('snapshot');
    assert.equal(initial.data.current.seq, 1);
    const pause = await request('board', 'PUT', { paused: true });
    assert.equal(pause.data.paused, true);
    assert.equal((await request('board', 'PUT', { paused: true })).data.revision, pause.data.revision);
    for (let i = 0; i < 3; i++) {
      const frozen = await request('snapshot');
      assert.equal(frozen.data.current.seq, 1);
      assert.equal(frozen.data.board.pausedAt, pause.data.pausedAt);
    }
    assert.equal(calls, 1);
    server = await createApp(options);
    assert.equal((await request('snapshot')).data.current.seq, 1);
    assert.equal((await request('board')).data.paused, true);
    assert.equal(calls, 1);
    await new Promise(resolve => setTimeout(resolve, 10));
    const resumed = await request('board', 'PUT', { paused: false });
    assert.equal(resumed.data.paused, false);
    assert.ok(resumed.data.totalPausedMs > 0);
    const loading = request('snapshot');
    while (!release) await new Promise(resolve => setImmediate(resolve));
    // A feed read already in progress must not update a paused display.
    await request('board', 'PUT', { paused: true });
    release();
    const frozen = await loading;
    assert.equal(frozen.data.board.paused, true);
    assert.equal(frozen.data.current.seq, 1);
    await request('board', 'PUT', { paused: false });
    assert.equal((await request('snapshot')).data.current.seq, 3);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
