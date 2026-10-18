// Security tests: run with `npm test`. Fresh server with the DEFAULT password (admin123).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-g-sec-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
delete process.env.ADMIN_PASSWORD;
delete process.env.TRUST_PROXY;

const { server, db } = require('../server');
let base;
const J = (t) => ({ 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) });
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108020000009077d3de0000000c4944415408d763f8ffff3f0005fe02fea7d6a4b00000000049454e44ae426082', 'hex');
const login = (u, p, ip = '1.1.1.1') => fetch(base + '/api/admin/login', { method: 'POST', headers: { ...J(), 'X-Forwarded-For': ip }, body: JSON.stringify({ username: u, password: p }) });

before(() => new Promise((r) => server.listen(0, () => { base = `http://localhost:${server.address().port}`; r(); })));
after(() => { server.close(); server.closeAllConnections?.(); db.flush(); fs.rmSync(tmp, { recursive: true, force: true }); });

let adminToken;

test('security headers are set', async () => {
  const h = (await fetch(base + '/')).headers;
  assert.match(h.get('content-security-policy'), /script-src 'self' 'sha256-/);
  assert.match(h.get('content-security-policy'), /object-src 'none'/);
  assert.equal(h.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal(h.get('x-content-type-options'), 'nosniff');
  assert.ok(h.get('permissions-policy'));
  assert.equal(h.get('x-powered-by'), null);
  const a = await fetch(base + '/api/admin/me');
  assert.equal(a.headers.get('cache-control'), 'no-store');
});

test('errors never leak stack traces', async () => {
  const r = await fetch(base + '/api/bookings', { method: 'POST', headers: J(), body: '{bad json' });
  assert.equal(r.status, 400);
  const t = await r.text();
  assert.doesNotMatch(t, /SyntaxError|node_modules|\.js:\d+/);
});

test('default password must be changed before any data is reachable', async () => {
  const r = await (await login('admin', 'admin123')).json();
  assert.ok(r.token);
  assert.equal(r.user.defaultPassword, true);
  const d = await fetch(base + '/api/admin/data', { headers: J(r.token) });
  assert.equal(d.status, 403);
  assert.equal((await d.json()).code, 'PASSWORD_CHANGE_REQUIRED');
  const short = await fetch(base + '/api/admin/password', { method: 'PUT', headers: J(r.token), body: JSON.stringify({ current: 'admin123', next: 'short' }) });
  assert.equal(short.status, 400, 'passwords under 8 chars are refused');
  const ok = await (await fetch(base + '/api/admin/password', { method: 'PUT', headers: J(r.token), body: JSON.stringify({ current: 'admin123', next: 'Strong-Pass-2026' }) })).json();
  adminToken = ok.token;
  assert.equal((await fetch(base + '/api/admin/data', { headers: J(adminToken) })).status, 200);
  assert.equal((await fetch(base + '/api/admin/data', { headers: J(r.token) })).status, 401, 'old session is invalid after password change');
});

test('spoofed X-Forwarded-For does not bypass the login rate limit', async () => {
  const codes = [];
  for (let i = 0; i < 14; i++) codes.push((await login('admin', 'wrong' + i, '9.9.9.' + i)).status);
  assert.ok(codes.includes(429), 'should be rate limited: ' + codes.join(','));
});

test('fake images (HTML renamed to .png) are rejected and not stored', async () => {
  const fd = new FormData();
  fd.append('name', 'x');
  fd.append('phone', '07700000000');
  fd.append('receipt', new Blob(['<html><script>alert(1)</script></html>'], { type: 'image/png' }), 'a.png');
  const r = await fetch(base + '/api/chat/request', { method: 'POST', body: fd });
  assert.equal(r.status, 400);
  assert.equal(fs.readdirSync(path.join(process.env.DATA_DIR, 'private')).length, 0);
  const svg = new FormData();
  svg.append('file', new Blob(['<svg onload="alert(1)"/>'], { type: 'image/svg+xml' }), 'x.svg');
  assert.equal((await fetch(base + '/api/admin/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + adminToken }, body: svg })).status, 400);
});

test('payment receipts are only reachable through signed, unforgeable links', async () => {
  const fd = new FormData();
  fd.append('name', 'سارة');
  fd.append('phone', '07709998877');
  fd.append('receipt', new Blob([PNG], { type: 'image/png' }), 'r.png');
  const r = await fetch(base + '/api/chat/request', { method: 'POST', headers: { 'X-Forwarded-For': '5.5.5.5' }, body: fd });
  assert.equal(r.status, 200);
  const chats = (await (await fetch(base + '/api/admin/data', { headers: J(adminToken) })).json()).chats;
  const signed = chats[0].receipt;
  assert.match(signed, /^\/api\/files\/[a-f0-9]+\.png\?e=\d+&s=/);
  assert.equal((await fetch(base + signed)).status, 200);
  const bare = signed.split('?')[0];
  assert.equal((await fetch(base + bare)).status, 403);
  assert.equal((await fetch(base + bare + '?t=' + adminToken)).status, 403, 'login tokens are not accepted in URLs');
  assert.equal((await fetch(base + signed.replace(/s=./, 's=X'))).status, 403, 'tampered signature');
  assert.equal((await fetch(base + signed.replace(/e=\d+/, 'e=99999999999999'))).status, 403, 'changed expiry');
  assert.equal((await fetch(base + '/api/files/..%2f..%2fdb.json?e=9&s=x')).status, 403);
});

test('unsafe links and HTML in content cannot become script', async () => {
  const put = await fetch(base + '/api/admin/settings', { method: 'PUT', headers: J(adminToken), body: JSON.stringify({ facebook: 'javascript:alert(1)', mapEmbed: '<iframe src="javascript:alert(1)">', primaryColor: 'red;}</style><script>', heroImage: 'data:text/html,<script>alert(1)</script>' }) });
  const { settings } = await put.json();
  assert.equal(settings.facebook, '');
  assert.equal(settings.mapEmbed, '');
  assert.equal(settings.heroImage, '');
  assert.match(settings.primaryColor, /^#[0-9a-f]{6}$/i);
  const item = await (await fetch(base + '/api/admin/portfolio', { method: 'POST', headers: J(adminToken), body: JSON.stringify({ title: 'x', video: 'javascript:alert(1)', images: 'javascript:a\n/uploads/ok.png' }) })).json();
  assert.equal(item.item.video, '');
  assert.equal(item.item.images, '/uploads/ok.png');
});

test('sensitive files are not served', async () => {
  for (const p of ['/data/db.json', '/data/secret', '/server.js', '/package.json', '/.env', '/lib/auth.js', '/uploads/../data/db.json']) {
    const r = await fetch(base + p);
    const body = await r.text();
    assert.ok(r.status === 404 || !/"users"|SESSION|require\(/.test(body), p);
  }
});

test('data files are private to the server user', () => {
  if (process.platform === 'win32') return;
  assert.equal(fs.statSync(path.join(process.env.DATA_DIR, 'db.json')).mode & 0o077, 0);
  assert.equal(fs.statSync(path.join(process.env.DATA_DIR, 'secret')).mode & 0o077, 0);
});
