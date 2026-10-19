// Tests for: languages, privacy policy, password recovery, backups.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-g-feat-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.ADMIN_PASSWORD = 'Feature-Test-1';
delete process.env.TRUST_PROXY;

const { server, db, backups } = require('../server');
let base;
const J = (t) => ({ 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) });
const post = (p, body, t) => fetch(base + p, { method: 'POST', headers: J(t), body: JSON.stringify(body) });
const put = (p, body, t) => fetch(base + p, { method: 'PUT', headers: J(t), body: JSON.stringify(body) });
let token;

before(async () => {
  await new Promise((r) => server.listen(0, () => { base = `http://localhost:${server.address().port}`; r(); }));
  token = (await (await post('/api/admin/login', { username: 'admin', password: 'Feature-Test-1' })).json()).token;
});
after(() => { server.close(); server.closeAllConnections?.(); db.flush(); fs.rmSync(tmp, { recursive: true, force: true }); });

test('content is served in Arabic, English and German', async () => {
  const ar = await (await fetch(base + '/api/content')).json();
  const en = await (await fetch(base + '/api/content?lang=en')).json();
  const de = await (await fetch(base + '/api/content?lang=de')).json();
  assert.equal(ar.lang, 'ar');
  assert.deepEqual(en.languages, ['ar', 'en', 'de']);
  assert.equal(en.settings.doctorName, 'Dr. Noor Ali');
  assert.match(de.settings.heroTitle, /Lächeln/);
  assert.equal(de.services[0].title, 'Bleaching');
  assert.equal(en.settings.i18n, undefined, 'translations are merged, not leaked');
  assert.ok(en.settings.privacyPolicy.includes('## Who we are'));
});

test('missing translations fall back to Arabic; doctor can edit translations', async () => {
  const svc = db.data.services[1];
  await put('/api/admin/services/' + svc.id, { i18n: { en: { title: 'Smile design', description: '' } } }, token);
  const en = await (await fetch(base + '/api/content?lang=en')).json();
  assert.equal(en.services[1].title, 'Smile design');
  assert.equal(en.services[1].description, svc.description, 'empty translation shows Arabic');
  await put('/api/admin/settings', { i18n: { de: { heroTitle: 'Neuer Titel', hacker: 'x' } } }, token);
  assert.equal(db.data.settings.i18n.de.heroTitle, 'Neuer Titel');
  assert.equal(db.data.settings.i18n.de.hacker, undefined, 'unknown fields are ignored');
  assert.ok(db.data.settings.i18n.de.aboutTitle, 'other translations kept');
});

test('languages can be limited and a default chosen', async () => {
  await put('/api/admin/settings', { languages: 'en,de,xx', defaultLang: 'de' }, token);
  const c = await (await fetch(base + '/api/content')).json();
  assert.deepEqual(c.languages, ['en', 'de']);
  assert.equal(c.lang, 'de');
  const ar = await (await fetch(base + '/api/content?lang=ar')).json();
  assert.equal(ar.lang, 'de', 'disabled language is not served');
  await put('/api/admin/settings', { languages: 'ar,en,de', defaultLang: 'ar' }, token);
});

test('patient-facing errors and WhatsApp message follow the visitor language', async () => {
  const r = await post('/api/bookings', { name: 'Anna', phone: 'x', date: '2030-01-01', time: '4:00 م', lang: 'de' });
  assert.equal((await r.json()).error, 'Ungültige Telefonnummer');
  const d = new Date();
  do d.setDate(d.getDate() + 1); while (d.getDay() === 5);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const ok = await (await post('/api/bookings', { name: 'Anna', phone: '01701234567', date, time: '4:00 م', lang: 'de' })).json();
  assert.match(ok.message, /^Hallo Zahnarztpraxis Dr\. Noor Ali/);
  assert.equal(ok.booking.lang, 'de');
});

test('privacy page is served', async () => {
  const r = await fetch(base + '/privacy');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /privacy\.js/);
});

test('password recovery with a one-time code', async () => {
  const pw = await (await put('/api/admin/password', { current: 'Feature-Test-1', next: 'Second-Pass-22' }, token)).json();
  assert.match(pw.recoveryCode, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.equal(pw.user.hasRecovery, true);
  const wrong = await post('/api/admin/recover', { username: 'admin', code: 'AAAA-BBBB-CCCC-DDDD', password: 'Hacked-Pass-1' });
  assert.equal(wrong.status, 401);
  const ok = await (await post('/api/admin/recover', { username: 'admin', code: pw.recoveryCode.toLowerCase(), password: 'Third-Pass-333' })).json();
  assert.ok(ok.token, 'code works (case-insensitive)');
  assert.notEqual(ok.recoveryCode, pw.recoveryCode, 'a new code is issued');
  const reuse = await post('/api/admin/recover', { username: 'admin', code: pw.recoveryCode, password: 'Again-Pass-44' });
  assert.equal(reuse.status, 401, 'each code works only once');
  assert.equal((await post('/api/admin/login', { username: 'admin', password: 'Third-Pass-333' })).status, 200);
  token = ok.token;
});

test('doctor can reset an assistant password (forced change at next login)', async () => {
  const { user } = await (await post('/api/admin/users', { username: 'helper', password: 'Helper-Pass-1', role: 'assistant' }, token)).json();
  assert.equal((await put(`/api/admin/users/${user.id}/password`, { password: 'Temp-Pass-123' }, token)).status, 200);
  const l = await (await post('/api/admin/login', { username: 'helper', password: 'Temp-Pass-123' })).json();
  assert.equal(l.user.defaultPassword, true);
  assert.equal((await fetch(base + '/api/admin/data', { headers: J(l.token) })).status, 403);
  const forbidden = await put(`/api/admin/users/${user.id}/password`, { password: 'Other-Pass-12' }, l.token);
  assert.equal(forbidden.status, 403, 'assistants cannot reset passwords');
});

test('daily backup is a valid tar.gz containing the database; downloads need a signed link', async () => {
  const name = await backups.runDaily(true);
  assert.match(name, /^backup-\d{4}-\d{2}-\d{2}\.tar\.gz$/);
  const buf = zlib.gunzipSync(fs.readFileSync(path.join(process.env.DATA_DIR, 'backups', name)));
  assert.equal(buf.subarray(0, 12).toString(), 'data/db.json');
  assert.equal(buf.subarray(257, 262).toString(), 'ustar');
  const size = parseInt(buf.subarray(124, 135).toString(), 8);
  const json = JSON.parse(buf.subarray(512, 512 + size).toString());
  assert.ok(json.settings && json.users.length);
  const list = await (await fetch(base + '/api/admin/backups', { headers: J(token) })).json();
  assert.equal(list.backups[0].name, name);
  const { url } = await (await post('/api/admin/backups/link', { name }, token)).json();
  const dl = await fetch(base + url);
  assert.equal(dl.status, 200);
  assert.ok((await dl.arrayBuffer()).byteLength > 100);
  assert.equal((await fetch(base + url.replace(/s=./, 's=X'))).status, 403);
  assert.equal((await fetch(base + '/api/backup-download?n=../db.json&e=9999999999999&s=x')).status, 403);
  const full = await (await post('/api/admin/backups/link', { name: 'full' }, token)).json();
  const fr = await fetch(base + full.url);
  assert.equal(fr.status, 200);
  assert.match(fr.headers.get('content-disposition'), /full-backup/);
  await fr.arrayBuffer();
});
