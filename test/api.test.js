// API smoke tests: run with `npm test`. Uses a temporary data folder.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-g-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.ADMIN_PASSWORD = 'test-pass-1';

const { server, db } = require('../server');
let base;
const json = (t) => ({ 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) });

before(() => new Promise((r) => server.listen(0, () => { base = `http://localhost:${server.address().port}`; r(); })));
after(() => { server.close(); server.closeAllConnections?.(); db.flush(); fs.rmSync(tmp, { recursive: true, force: true }); });

function nextOpenDay() {
  const d = new Date();
  do d.setDate(d.getDate() + 1); while (d.getDay() === 5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test('public content is served', async () => {
  const c = await (await fetch(base + '/api/content')).json();
  assert.ok(c.settings.clinicName);
  assert.ok(Array.isArray(c.services) && c.services.length);
  assert.equal(c.users, undefined, 'users must never be public');
});

test('booking validates input, blocks double booking and builds a WhatsApp message', async () => {
  const date = nextOpenDay();
  const bad = await fetch(base + '/api/bookings', { method: 'POST', headers: json(), body: JSON.stringify({ name: 'x' }) });
  assert.equal(bad.status, 400);
  const body = { name: 'علي', phone: '07701234567', date, time: '10:00 ص', service: 'تبييض' };
  const ok = await fetch(base + '/api/bookings', { method: 'POST', headers: json(), body: JSON.stringify(body) });
  assert.equal(ok.status, 200);
  const out = await ok.json();
  assert.match(out.message, /علي/);
  assert.match(out.whatsapp, /^\d+$/);
  const dup = await fetch(base + '/api/bookings', { method: 'POST', headers: json(), body: JSON.stringify(body) });
  assert.equal(dup.status, 409);
});

test('admin API requires login and the assistant role cannot edit content', async () => {
  assert.equal((await fetch(base + '/api/admin/data')).status, 401);
  const bad = await fetch(base + '/api/admin/login', { method: 'POST', headers: json(), body: JSON.stringify({ username: 'admin', password: 'nope' }) });
  assert.equal(bad.status, 401);
  const { token } = await (await fetch(base + '/api/admin/login', { method: 'POST', headers: json(), body: JSON.stringify({ username: 'admin', password: 'test-pass-1' }) })).json();
  assert.ok(token);
  const put = await fetch(base + '/api/admin/settings', { method: 'PUT', headers: json(token), body: JSON.stringify({ heroTitle: 'جديد', instagram: 'javascript:alert(1)' }) });
  const { settings } = await put.json();
  assert.equal(settings.heroTitle, 'جديد');
  assert.equal(settings.instagram, '', 'unsafe links are rejected');

  await fetch(base + '/api/admin/users', { method: 'POST', headers: json(token), body: JSON.stringify({ username: 'asst', password: 'secret12', role: 'assistant' }) });
  const a = await (await fetch(base + '/api/admin/login', { method: 'POST', headers: json(), body: JSON.stringify({ username: 'asst', password: 'secret12' }) })).json();
  assert.equal((await fetch(base + '/api/admin/settings', { method: 'PUT', headers: json(a.token), body: '{}' })).status, 403);
  assert.equal((await fetch(base + '/api/admin/services', { method: 'POST', headers: json(a.token), body: '{}' })).status, 403);
});

test('chat stays locked until staff approves it', async () => {
  const fd = new FormData();
  fd.append('name', 'سارة');
  fd.append('phone', '07709998877');
  const { token: chatToken } = await (await fetch(base + '/api/chat/request', { method: 'POST', body: fd })).json();
  const s1 = await (await fetch(base + '/api/chat/session', { headers: { 'x-chat-token': chatToken } })).json();
  assert.equal(s1.chat.status, 'pending');
  const up = await fetch(base + '/api/chat/upload', { method: 'POST', headers: { 'x-chat-token': chatToken }, body: new FormData() });
  assert.equal(up.status, 403, 'cannot send while locked');

  const { token } = await (await fetch(base + '/api/admin/login', { method: 'POST', headers: json(), body: JSON.stringify({ username: 'admin', password: 'test-pass-1' }) })).json();
  const id = db.data.chats.find((c) => c.token === chatToken).id;
  await fetch(base + '/api/admin/chats/' + id, { method: 'PATCH', headers: json(token), body: JSON.stringify({ status: 'approved' }) });
  const s2 = await (await fetch(base + '/api/chat/session', { headers: { 'x-chat-token': chatToken } })).json();
  assert.equal(s2.chat.status, 'approved');
});
