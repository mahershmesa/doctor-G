// Dr. Noor Ali — dental clinic website server.
// Serves the public site, the admin dashboard, a JSON API and live chat (Socket.io).

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { Server } = require('socket.io');

const DB = require('./lib/db');
const { hashPassword, verifyPassword, createTokenService } = require('./lib/auth');
const { LANGS, TRANSLATABLE, mergeI18n, applyLang, msg } = require('./lib/i18n');
const { createBackupService } = require('./lib/backup');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
const PRIVATE_DIR = path.join(DATA_DIR, 'private'); // payment receipts & chat images
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(DATA_DIR, 'backups');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(PRIVATE_DIR, { recursive: true });

const db = new DB(path.join(DATA_DIR, 'db.json'));

// ---------- secret & first admin ----------
function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(DATA_DIR, 'secret');
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  try { fs.chmodSync(file, 0o600); } catch {}
  return fs.readFileSync(file, 'utf8').trim();
}
const SECRET = loadSecret();
const tokens = createTokenService(SECRET);

// Private files (receipts, chat images) are served through short-lived signed links,
// so no login token ever appears in a URL.
const FILE_KEY = crypto.createHash('sha256').update('files:' + SECRET).digest();
const fileSig = (name, exp) => crypto.createHmac('sha256', FILE_KEY).update(name + '.' + exp).digest('base64url').slice(0, 32);
function signFile(url) {
  if (!url || !url.startsWith('/api/files/')) return url;
  const name = path.basename(url);
  const exp = (Math.floor(Date.now() / 3600000) + 12) * 3600000; // valid 11-12h, stable per hour (cacheable)
  return `/api/files/${name}?e=${exp}&s=${fileSig(name, exp)}`;
}
const signMessage = (m) => (m && m.image ? { ...m, image: signFile(m.image) } : m);

if (!db.data.users.length) {
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const { salt, hash } = hashPassword(password);
  db.data.users.push({
    id: crypto.randomUUID(),
    username: process.env.ADMIN_USERNAME || 'admin',
    name: db.data.settings.doctorName || 'الطبيبة',
    role: 'admin',
    salt,
    hash,
    defaultPassword: !process.env.ADMIN_PASSWORD,
  });
  db.flush();
  console.log(`Created admin user "${db.data.users[0].username}" (password: ${process.env.ADMIN_PASSWORD ? 'from ADMIN_PASSWORD' : 'admin123 — change it!'})`);
}

// Emergency reset for the site owner: set ADMIN_RESET_PASSWORD and restart. It is applied once
// (the doctor must then choose a new password), and ignored on later restarts with the same value.
if (process.env.ADMIN_RESET_PASSWORD) {
  const fingerprint = crypto.createHash('sha256').update('reset:' + process.env.ADMIN_RESET_PASSWORD).digest('hex');
  const target =
    db.data.users.find((u) => u.username === process.env.ADMIN_USERNAME) || db.data.users.find((u) => u.role === 'admin');
  if (target && db.data.appliedReset !== fingerprint) {
    Object.assign(target, hashPassword(process.env.ADMIN_RESET_PASSWORD), { defaultPassword: true });
    db.data.appliedReset = fingerprint;
    db.flush();
    console.log(`Password of "${target.username}" was reset from ADMIN_RESET_PASSWORD. Remove that variable now.`);
  }
}

const findUser = (uid) => db.data.users.find((u) => u.id === uid);
const MIN_PASSWORD = 8;
const publicUser = (u) => ({
  id: u.id, username: u.username, name: u.name, role: u.role,
  defaultPassword: !!u.defaultPassword, hasRecovery: !!u.recovery,
});

// Recovery codes: shown to the user once, stored only as a hash. Format XXXX-XXXX-XXXX-XXXX.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newRecoveryCode(user) {
  const bytes = crypto.randomBytes(16);
  const raw = [...bytes].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
  user.recovery = hashPassword(raw);
  return raw.match(/.{4}/g).join('-');
}
const normalizeCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);

// ---------- helpers ----------
const str = (v, max = 2000) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));

// Only allow uploaded files or http(s) links in URL fields (blocks javascript: etc.).
function safeUrl(v) {
  const s = str(v, 1000);
  if (!s) return '';
  if (s.startsWith('/uploads/')) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return '';
}
function safeUrlList(v) {
  return str(v, 20000)
    .split(/\n+/)
    .map(safeUrl)
    .filter(Boolean)
    .join('\n');
}

const newId = () => crypto.randomUUID();

// Simple in-memory rate limiter: max `limit` hits per `windowMs` per key.
const hits = new Map();
function rateLimit(name, limit, windowMs) {
  return (req, res, next) => {
    const key = `${name}:${req.ip}`;
    const now = Date.now();
    const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (list.length >= limit) {
      return res.status(429).json({ error: msg(req, 'tooMany') });
    }
    list.push(now);
    hits.set(key, list);
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [k, list] of hits) if (!list.some((t) => now - t < 3600000)) hits.delete(k);
}, 600000).unref();

// ---------- uploads ----------
const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const VIDEO_TYPES = { 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' };

function makeUploader(dir, types, maxMb) {
  return multer({
    storage: multer.diskStorage({
      destination: dir,
      filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + types[file.mimetype]),
    }),
    limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
      if (types[file.mimetype]) cb(null, true);
      else cb(Object.assign(new Error('bad type'), { code: 'BAD_TYPE' }));
    },
  });
}
const mediaUpload = makeUploader(UPLOAD_DIR, { ...IMAGE_TYPES, ...VIDEO_TYPES }, Number(process.env.MAX_VIDEO_MB) || 200);
const privateImageUpload = makeUploader(PRIVATE_DIR, IMAGE_TYPES, 10);

// Check the file's real content (magic bytes), not just the type the browser claims.
function contentMatches(file) {
  let buf;
  try {
    const fd = fs.openSync(file.path, 'r');
    buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);
  } catch {
    return false;
  }
  const hex = buf.toString('hex');
  const ascii = buf.toString('latin1');
  switch (file.mimetype) {
    case 'image/jpeg': return hex.startsWith('ffd8ff');
    case 'image/png': return hex.startsWith('89504e470d0a1a0a');
    case 'image/gif': return ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a');
    case 'image/webp': return ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP';
    case 'video/mp4':
    case 'video/quicktime': return ascii.slice(4, 8) === 'ftyp' || ['moov', 'mdat', 'wide', 'free'].includes(ascii.slice(4, 8));
    case 'video/webm': return hex.startsWith('1a45dfa3');
    default: return false;
  }
}
const removeFile = (file) => {
  if (!file) return;
  try { fs.rmSync(file.path, { force: true }); } catch {}
};

// Wrap multer so errors become clean JSON responses.
const handleUpload = (uploader, field) => (req, res, next) =>
  uploader.single(field)(req, res, (err) => {
    if (err) {
      const key = err.code === 'LIMIT_FILE_SIZE' ? 'fileTooBig' : err.code === 'BAD_TYPE' ? 'badType' : 'badFile';
      return res.status(400).json({ error: msg(req, key) });
    }
    if (req.file && !contentMatches(req.file)) {
      removeFile(req.file);
      return res.status(400).json({ error: msg(req, 'badFile') });
    }
    // Don't keep files from requests that end up rejected.
    res.on('finish', () => res.statusCode >= 400 && removeFile(req.file));
    next();
  });

// ---------- app ----------
const app = express();
// Only trust X-Forwarded-For when actually behind a proxy (Render, Nginx...): set TRUST_PROXY=1.
// Trusting it otherwise lets attackers fake their IP and bypass rate limits.
const tp = process.env.TRUST_PROXY;
app.set('trust proxy', tp ? (/^\d+$/.test(tp) ? Number(tp) : tp === 'true' ? true : tp) : false);
app.disable('x-powered-by');

// Content-Security-Policy: allow only our own scripts (+ the inline import map, by hash).
const indexHtml = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8');
const importMap = indexHtml.match(/<script type="importmap">([\s\S]*?)<\/script>/);
const importMapHash = importMap ? `'sha256-${crypto.createHash('sha256').update(importMap[1]).digest('base64')}'` : '';
const CSP = [
  "default-src 'self'",
  `script-src 'self' ${importMapHash}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https: blob:",
  "connect-src 'self'",
  'frame-src https://www.youtube-nocookie.com https://www.google.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Patient data must never be cached by browsers or proxies.
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/chat')) res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '1mb' }));

app.use('/vendor/three', express.static(path.join(__dirname, 'node_modules/three'), { maxAge: '7d' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// ---------- public content ----------
const enabledLangs = () => {
  const l = str(db.data.settings.languages, 20).split(',').filter((x) => LANGS.includes(x));
  return l.length ? l : ['ar'];
};

// lang = null returns raw content with all translations (for the dashboard).
function publicContent(lang = null) {
  const d = db.data;
  const tr = (list) => (lang ? list.map((x) => applyLang(x, lang)) : list);
  return {
    settings: lang ? applyLang(d.settings, lang) : d.settings,
    services: tr(d.services),
    portfolio: tr(d.portfolio),
    testimonials: tr(d.testimonials),
    faq: tr(d.faq),
    paymentMethods: tr(d.paymentMethods.filter((p) => p.enabled !== false)),
  };
}

app.get('/api/content', (req, res) => {
  const langs = enabledLangs();
  const def = langs.includes(db.data.settings.defaultLang) ? db.data.settings.defaultLang : langs[0];
  const lang = langs.includes(req.query.lang) ? req.query.lang : def;
  res.setHeader('Cache-Control', 'no-cache');
  res.json({ lang, languages: langs, defaultLang: def, ...publicContent(lang) });
});

// ---------- bookings ----------
const slotList = () =>
  str(db.data.settings.bookingSlots, 5000)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
const closedDays = () =>
  str(db.data.settings.closedDays)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')
    .map(Number);
const takenSlots = (date) =>
  db.data.bookings.filter((b) => b.date === date && b.status !== 'cancelled').map((b) => b.time);

app.get('/api/bookings/taken', (req, res) => {
  res.json({ taken: takenSlots(str(req.query.date, 10)) });
});

app.post('/api/bookings', rateLimit('booking', 8, 10 * 60 * 1000), (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 100);
  const phone = str(b.phone, 30);
  const service = str(b.service, 150);
  const date = str(b.date, 10);
  const time = str(b.time, 30);
  const paymentMethod = str(b.paymentMethod, 100);
  const notes = str(b.notes, 1000);

  if (!name || !phone || !date || !time) return res.status(400).json({ error: msg(req, 'required') });
  if (!/^[+\d\s()-]{6,30}$/.test(phone)) return res.status(400).json({ error: msg(req, 'badPhone') });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: msg(req, 'badDate') });

  const day = new Date(date + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(day) || day < today) return res.status(400).json({ error: msg(req, 'pastDate') });
  if (day - today > 366 * 864e5) return res.status(400).json({ error: msg(req, 'farDate') });
  if (closedDays().includes(day.getDay())) return res.status(400).json({ error: msg(req, 'closedDay') });
  if (!slotList().includes(time)) return res.status(400).json({ error: msg(req, 'badTime') });
  if (takenSlots(date).includes(time)) return res.status(409).json({ error: msg(req, 'taken') });

  const booking = {
    id: newId(),
    code: 'G-' + Math.floor(1000 + Math.random() * 9000),
    name, phone, service, date, time, paymentMethod, notes,
    lang: LANGS.includes(b.lang) ? b.lang : 'ar',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  db.data.bookings.unshift(booking);
  db.save();
  io.to('staff').emit('booking:new', booking);

  const s = applyLang(db.data.settings, booking.lang);
  const t = (k) => msg(req, k);
  const lines = [
    t('bookHello')(s.clinicName),
    `${t('code')}: ${booking.code}`,
    `${t('name')}: ${name}`,
    `${t('phone')}: ${phone}`,
    service && `${t('service')}: ${service}`,
    `${t('date')}: ${date}`,
    `${t('time')}: ${time}`,
    paymentMethod && `${t('pay')}: ${paymentMethod}`,
    notes && `${t('notes')}: ${notes}`,
  ].filter(Boolean);
  res.json({ booking, whatsapp: str(s.whatsapp).replace(/\D/g, ''), message: lines.join('\n') });
});

// ---------- patient chat ----------
const chatByToken = (t) => (t ? db.data.chats.find((c) => c.token === t) : null);
const patientView = (c) => ({
  id: c.id,
  name: c.name,
  status: c.status,
  staffNote: c.staffNote || '',
  createdAt: c.createdAt,
  messages: c.messages.map(signMessage),
});
const chatSummary = (c) => ({
  id: c.id,
  name: c.name,
  phone: c.phone,
  paymentMethod: c.paymentMethod,
  note: c.note,
  receipt: signFile(c.receipt),
  status: c.status,
  staffNote: c.staffNote || '',
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
  approvedBy: c.approvedBy || '',
  unreadStaff: c.unreadStaff || 0,
  lastMessage: signMessage(c.messages[c.messages.length - 1]) || null,
});

function addMessage(chat, msg) {
  const m = { id: newId(), at: new Date().toISOString(), text: '', image: '', ...msg };
  chat.messages.push(m);
  if (chat.messages.length > 2000) chat.messages.shift();
  chat.updatedAt = m.at;
  if (m.from === 'patient') chat.unreadStaff = (chat.unreadStaff || 0) + 1;
  db.save();
  const out = signMessage(m);
  io.to('chat:' + chat.id).emit('chat:message', out);
  io.to('staff').emit('chat:message', { chatId: chat.id, message: out, summary: chatSummary(chat) });
  return out;
}

app.post(
  '/api/chat/request',
  rateLimit('chatreq', 5, 30 * 60 * 1000),
  handleUpload(privateImageUpload, 'receipt'),
  (req, res) => {
    if (!db.data.settings.chatEnabled) return res.status(403).json({ error: msg(req, 'chatOff') });
    const b = req.body || {};
    const name = str(b.name, 100);
    const phone = str(b.phone, 30);
    if (!name || !/^[+\d\s()-]{6,30}$/.test(phone)) {
      return res.status(400).json({ error: msg(req, 'nameAndPhone') });
    }
    const chat = {
      id: newId(),
      token: crypto.randomBytes(24).toString('base64url'),
      name,
      phone,
      paymentMethod: str(b.paymentMethod, 100),
      note: str(b.note, 1000),
      receipt: req.file ? '/api/files/' + req.file.filename : '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unreadStaff: 0,
      messages: [],
    };
    db.data.chats.unshift(chat);
    db.save();
    io.to('staff').emit('chat:update', chatSummary(chat));
    const s = db.data.settings;
    res.json({
      token: chat.token,
      chat: patientView(chat),
      whatsapp: str(s.whatsapp).replace(/\D/g, ''),
      message: msg(req, 'chatMsg')(name, phone, chat.paymentMethod || '-'),
    });
  }
);

app.get('/api/chat/session', (req, res) => {
  const chat = chatByToken(req.get('x-chat-token'));
  if (!chat) return res.status(404).json({ error: 'not found' });
  res.json({ chat: patientView(chat) });
});

app.post('/api/chat/upload', rateLimit('chatimg', 30, 10 * 60 * 1000), (req, res, next) => {
  const chat = chatByToken(req.get('x-chat-token'));
  if (!chat || chat.status !== 'approved') return res.status(403).json({ error: msg(req, 'chatLocked') });
  req.chat = chat;
  next();
}, handleUpload(privateImageUpload, 'image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: msg(req, 'noImage') });
  const m = addMessage(req.chat, { from: 'patient', image: '/api/files/' + req.file.filename, text: str(req.body.text, 2000) });
  res.json({ message: m });
});

// Private files (receipts, chat images): only through a valid, unexpired signed link.
app.get('/api/files/:name', (req, res) => {
  const name = path.basename(req.params.name);
  const exp = Number(req.query.e);
  const sig = str(req.query.s, 64);
  const expected = fileSig(name, exp);
  const valid = exp > Date.now() && sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!valid) return res.status(403).end();
  const file = path.join(PRIVATE_DIR, name);
  if (!fs.existsSync(file)) return res.status(404).end();
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.sendFile(file);
});

// ---------- admin auth ----------
function requireStaff(req, res, next) {
  const header = req.get('authorization') || '';
  const user = tokens.verify(header.replace(/^Bearer\s+/i, ''), findUser);
  if (!user) return res.status(401).json({ error: 'يرجى تسجيل الدخول' });
  req.user = user;
  // Until the default password is changed, nothing else is reachable (protects patient data).
  if (user.defaultPassword && !['/api/admin/me', '/api/admin/password'].includes(req.path)) {
    return res.status(403).json({ error: 'يجب تغيير كلمة المرور الافتراضية أولًا', code: 'PASSWORD_CHANGE_REQUIRED' });
  }
  next();
}
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'هذه الصلاحية للطبيبة فقط' });
  next();
}

const DUMMY = hashPassword(crypto.randomBytes(16).toString('hex'));
const failedLogins = new Map(); // username -> [timestamps], slows down distributed guessing

app.post('/api/admin/login', rateLimit('login', 10, 15 * 60 * 1000), (req, res) => {
  const username = str(req.body?.username, 100).toLowerCase();
  const password = str(req.body?.password, 200);
  const now = Date.now();
  const fails = (failedLogins.get(username) || []).filter((t) => now - t < 15 * 60 * 1000);
  if (fails.length >= 20) return res.status(429).json({ error: 'محاولات كثيرة لهذا الحساب، حاول بعد 15 دقيقة' });
  const user = db.data.users.find((u) => u.username.toLowerCase() === username);
  // Always run the (slow) hash check so response time doesn't reveal whether a username exists.
  const ok = verifyPassword(password, user ? user.salt : DUMMY.salt, user ? user.hash : DUMMY.hash) && !!user;
  if (!ok) {
    fails.push(now);
    failedLogins.set(username, fails);
    if (failedLogins.size > 10000) failedLogins.clear();
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }
  failedLogins.delete(username);
  res.json({ token: tokens.issue(user), user: publicUser(user) });
});

// Forgot password: username + recovery code -> new password (and a fresh recovery code).
app.post('/api/admin/recover', rateLimit('login', 10, 15 * 60 * 1000), (req, res) => {
  const username = str(req.body?.username, 100).toLowerCase();
  const code = normalizeCode(req.body?.code);
  const password = str(req.body?.password, 200);
  const now = Date.now();
  const fails = (failedLogins.get(username) || []).filter((t) => now - t < 15 * 60 * 1000);
  if (fails.length >= 20) return res.status(429).json({ error: 'محاولات كثيرة لهذا الحساب، حاول بعد 15 دقيقة' });
  if (password.length < MIN_PASSWORD) return res.status(400).json({ error: `كلمة المرور يجب أن تكون ${MIN_PASSWORD} أحرف على الأقل` });
  const user = db.data.users.find((u) => u.username.toLowerCase() === username);
  const rec = user?.recovery || DUMMY;
  const ok = verifyPassword(code, rec.salt, rec.hash) && !!user?.recovery && code.length === 16;
  if (!ok) {
    fails.push(now);
    failedLogins.set(username, fails);
    return res.status(401).json({ error: 'اسم المستخدم أو رمز الاستعادة غير صحيح' });
  }
  failedLogins.delete(username);
  Object.assign(user, hashPassword(password), { defaultPassword: false });
  const recoveryCode = newRecoveryCode(user); // each code works only once
  db.save();
  disconnectUser(user.id);
  res.json({ token: tokens.issue(user), user: publicUser(user), recoveryCode });
});

app.get('/api/admin/me', requireStaff, (req, res) => res.json({ user: publicUser(req.user) }));

// Create a new recovery code (needs the current password). The old code stops working.
app.post('/api/admin/recovery-code', requireStaff, (req, res) => {
  if (!verifyPassword(str(req.body?.password, 200), req.user.salt, req.user.hash)) {
    return res.status(400).json({ error: 'كلمة المرور غير صحيحة' });
  }
  const recoveryCode = newRecoveryCode(req.user);
  db.save();
  res.json({ recoveryCode, user: publicUser(req.user) });
});

app.get('/api/admin/data', requireStaff, (req, res) => {
  const d = db.data;
  res.json({
    user: publicUser(req.user),
    ...publicContent(),
    languages: LANGS,
    paymentMethods: d.paymentMethods,
    bookings: d.bookings,
    chats: d.chats.map(chatSummary),
    users: req.user.role === 'admin' ? d.users.map(publicUser) : [],
  });
});

app.put('/api/admin/password', requireStaff, (req, res) => {
  const { current, next: nextPass } = req.body || {};
  if (!verifyPassword(str(current, 200), req.user.salt, req.user.hash)) {
    return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
  }
  const np = str(nextPass, 200);
  if (np.length < MIN_PASSWORD) return res.status(400).json({ error: `كلمة المرور يجب أن تكون ${MIN_PASSWORD} أحرف على الأقل` });
  if (np === str(current, 200) || np === 'admin123') return res.status(400).json({ error: 'اختر كلمة مرور جديدة مختلفة' });
  Object.assign(req.user, hashPassword(np), { defaultPassword: false });
  const recoveryCode = newRecoveryCode(req.user); // new password -> new recovery code
  db.save();
  disconnectUser(req.user.id); // old sessions on other devices stop receiving live data
  res.json({ token: tokens.issue(req.user), user: publicUser(req.user), recoveryCode });
});

// ---------- admin: settings ----------
const BOOL_SETTINGS = ['show3D', 'chatEnabled'];
const URL_SETTINGS = ['logoImage', 'heroImage', 'doctorPhoto', 'instagram', 'facebook', 'tiktok', 'snapchat', 'youtube'];

app.put('/api/admin/settings', requireStaff, requireAdmin, (req, res) => {
  const s = db.data.settings;
  const body = req.body || {};
  for (const key of Object.keys(s)) {
    if (!(key in body)) continue;
    if (key === 'i18n') s.i18n = mergeI18n(s.i18n, body.i18n, TRANSLATABLE.settings);
    else if (key === 'languages') {
      const l = str(body[key], 20).split(',').filter((x, i, a) => LANGS.includes(x) && a.indexOf(x) === i);
      if (l.length) s[key] = l.join(',');
    } else if (key === 'defaultLang') {
      if (LANGS.includes(body[key])) s[key] = body[key];
    } else if (BOOL_SETTINGS.includes(key)) s[key] = !!body[key];
    else if (URL_SETTINGS.includes(key)) s[key] = safeUrl(body[key]);
    else if (key === 'mapEmbed') {
      const v = str(body[key], 2000);
      // Accept either the embed URL or a full <iframe ...> snippet from Google Maps.
      const m = v.match(/https:\/\/www\.google\.com\/maps\/embed\?[^"'\s<>]+/);
      s[key] = m ? m[0] : '';
    } else if (key === 'primaryColor') {
      s[key] = /^#[0-9a-f]{6}$/i.test(body[key]) ? body[key] : s[key];
    } else if (key === 'whatsapp') s[key] = str(body[key], 30).replace(/\D/g, '');
    else s[key] = str(body[key], key === 'privacyPolicy' ? 30000 : 10000);
  }
  if (!s.languages.split(',').includes(s.defaultLang)) s.defaultLang = s.languages.split(',')[0];
  db.save();
  io.emit('content:changed');
  res.json({ settings: s });
});

// ---------- admin: content collections ----------
const COLLECTIONS = {
  services: { icon: str, title: str, description: str, price: str, image: safeUrl },
  portfolio: { title: str, category: str, description: str, before: safeUrl, after: safeUrl, images: safeUrlList, video: safeUrl },
  testimonials: { name: str, text: str, rating: (v) => Math.min(5, Math.max(1, Number(v) || 5)), photo: safeUrl },
  faq: { question: str, answer: str },
  paymentMethods: { name: str, details: str, instructions: str, enabled: (v) => v !== false && v !== 'false' },
};

// Skip collection routes for other paths (bookings, chats, users...) before any auth check.
const isCollection = (req, res, next) =>
  Object.prototype.hasOwnProperty.call(COLLECTIONS, req.params.col) ? next() : next('route');

function cleanItem(schema, body, col, existing) {
  const out = {};
  for (const [k, fn] of Object.entries(schema)) if (Object.prototype.hasOwnProperty.call(body, k)) out[k] = fn(body[k]);
  if (body.i18n) out.i18n = mergeI18n(existing?.i18n, body.i18n, TRANSLATABLE[col], 5000);
  return out;
}

app.post('/api/admin/:col', isCollection, requireStaff, requireAdmin, (req, res) => {
  const schema = COLLECTIONS[req.params.col];
  const item = { id: newId(), ...Object.fromEntries(Object.keys(schema).map((k) => [k, ''])), ...cleanItem(schema, req.body || {}, req.params.col) };
  db.data[req.params.col].push(item);
  db.save();
  io.emit('content:changed');
  res.json({ item });
});

app.put('/api/admin/:col/order', isCollection, requireStaff, requireAdmin, (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const list = db.data[req.params.col];
  list.sort((a, b) => {
    const ia = ids.indexOf(a.id), ib = ids.indexOf(b.id);
    return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
  });
  db.save();
  io.emit('content:changed');
  res.json({ ok: true });
});

app.put('/api/admin/:col/:id', isCollection, requireStaff, requireAdmin, (req, res) => {
  const schema = COLLECTIONS[req.params.col];
  const item = db.data[req.params.col].find((x) => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'غير موجود' });
  Object.assign(item, cleanItem(schema, req.body || {}, req.params.col, item));
  db.save();
  io.emit('content:changed');
  res.json({ item });
});

app.delete('/api/admin/:col/:id', isCollection, requireStaff, requireAdmin, (req, res) => {
  const list = db.data[req.params.col];
  const i = list.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'غير موجود' });
  list.splice(i, 1);
  db.save();
  io.emit('content:changed');
  res.json({ ok: true });
});

app.post('/api/admin/upload', requireStaff, requireAdmin, handleUpload(mediaUpload, 'file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم اختيار ملف' });
  res.json({ url: '/uploads/' + req.file.filename, type: req.file.mimetype });
});

// ---------- admin: bookings ----------
const BOOKING_STATUSES = ['pending', 'confirmed', 'done', 'cancelled'];

app.patch('/api/admin/bookings/:id', requireStaff, (req, res) => {
  const b = db.data.bookings.find((x) => x.id === req.params.id);
  if (!b) return res.status(404).json({ error: 'غير موجود' });
  if (BOOKING_STATUSES.includes(req.body?.status)) b.status = req.body.status;
  if ('staffNote' in (req.body || {})) b.staffNote = str(req.body.staffNote, 1000);
  db.save();
  io.to('staff').emit('booking:update', b);
  res.json({ booking: b });
});

app.delete('/api/admin/bookings/:id', requireStaff, (req, res) => {
  const i = db.data.bookings.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'غير موجود' });
  db.data.bookings.splice(i, 1);
  db.save();
  io.to('staff').emit('booking:delete', req.params.id);
  res.json({ ok: true });
});

// ---------- admin: chats ----------
const CHAT_STATUSES = ['pending', 'approved', 'rejected', 'closed'];

app.get('/api/admin/chats/:id', requireStaff, (req, res) => {
  const c = db.data.chats.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'غير موجود' });
  c.unreadStaff = 0;
  db.save();
  res.json({ chat: { ...chatSummary(c), messages: c.messages.map(signMessage) } });
});

app.patch('/api/admin/chats/:id', requireStaff, (req, res) => {
  const c = db.data.chats.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'غير موجود' });
  const status = req.body?.status;
  if (CHAT_STATUSES.includes(status) && status !== c.status) {
    c.status = status;
    if (status === 'approved') {
      c.approvedBy = req.user.name;
      c.approvedAt = new Date().toISOString();
    }
  }
  if ('staffNote' in (req.body || {})) c.staffNote = str(req.body.staffNote, 1000);
  c.updatedAt = new Date().toISOString();
  db.save();
  io.to('chat:' + c.id).emit('chat:status', { status: c.status, staffNote: c.staffNote || '' });
  io.to('staff').emit('chat:update', chatSummary(c));
  res.json({ chat: chatSummary(c) });
});

app.delete('/api/admin/chats/:id', requireStaff, requireAdmin, (req, res) => {
  const i = db.data.chats.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'غير موجود' });
  const [c] = db.data.chats.splice(i, 1);
  db.save();
  io.to('chat:' + c.id).emit('chat:status', { status: 'closed', staffNote: '' });
  io.in('chat:' + c.id).disconnectSockets(true);
  io.to('staff').emit('chat:delete', c.id);
  res.json({ ok: true });
});

app.post('/api/admin/chats/:id/upload', requireStaff, handleUpload(privateImageUpload, 'image'), (req, res) => {
  const c = db.data.chats.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'غير موجود' });
  if (!req.file) return res.status(400).json({ error: 'لم يتم اختيار صورة' });
  const m = addMessage(c, { from: 'staff', staffName: req.user.name, image: '/api/files/' + req.file.filename, text: str(req.body.text, 2000) });
  res.json({ message: m });
});

// ---------- admin: users ----------
app.post('/api/admin/users', requireStaff, requireAdmin, (req, res) => {
  const username = str(req.body?.username, 50);
  const password = str(req.body?.password, 200);
  if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(username)) return res.status(400).json({ error: 'اسم المستخدم: أحرف إنجليزية وأرقام فقط (3 أحرف على الأقل)' });
  if (password.length < MIN_PASSWORD) return res.status(400).json({ error: `كلمة المرور يجب أن تكون ${MIN_PASSWORD} أحرف على الأقل` });
  if (db.data.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: 'اسم المستخدم مستخدم مسبقًا' });
  }
  const user = {
    id: newId(),
    username,
    name: str(req.body?.name, 100) || username,
    role: req.body?.role === 'admin' ? 'admin' : 'assistant',
    ...hashPassword(password),
  };
  db.data.users.push(user);
  db.save();
  res.json({ user: publicUser(user) });
});

// The doctor sets a temporary password for an assistant who forgot theirs (must be changed at next login).
app.put('/api/admin/users/:id/password', requireStaff, requireAdmin, (req, res) => {
  const user = db.data.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'غير موجود' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'غيّر كلمة مرورك من صفحة «كلمة المرور»' });
  const password = str(req.body?.password, 200);
  if (password.length < MIN_PASSWORD) return res.status(400).json({ error: `كلمة المرور يجب أن تكون ${MIN_PASSWORD} أحرف على الأقل` });
  Object.assign(user, hashPassword(password), { defaultPassword: true });
  db.save();
  disconnectUser(user.id);
  res.json({ user: publicUser(user) });
});

app.delete('/api/admin/users/:id', requireStaff, requireAdmin, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'لا يمكنك حذف حسابك' });
  const i = db.data.users.findIndex((u) => u.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'غير موجود' });
  db.data.users.splice(i, 1);
  db.save();
  disconnectUser(req.params.id);
  res.json({ ok: true });
});

// ---------- admin: backups ----------
const backups = createBackupService({ db, dataDir: DATA_DIR, uploadDir: UPLOAD_DIR, privateDir: PRIVATE_DIR, backupDir: BACKUP_DIR, keepDays: Number(process.env.BACKUP_KEEP_DAYS) || 14 });
const backupSig = (name, exp) => fileSig('backup:' + name, exp);

app.get('/api/admin/backups', requireStaff, requireAdmin, (req, res) => res.json({ backups: backups.list() }));

app.post('/api/admin/backups', requireStaff, requireAdmin, async (req, res, next) => {
  try {
    const name = await backups.runDaily(true);
    res.json({ name, backups: backups.list() });
  } catch (e) {
    next(e);
  }
});

// Downloads use a one-time-ish signed link (valid 5 minutes) so the browser can download directly.
app.post('/api/admin/backups/link', requireStaff, requireAdmin, (req, res) => {
  const name = str(req.body?.name, 60);
  if (name !== 'full' && !backups.fileFor(name)) return res.status(400).json({ error: 'نسخة غير صالحة' });
  const exp = Date.now() + 5 * 60 * 1000;
  res.json({ url: `/api/backup-download?n=${encodeURIComponent(name)}&e=${exp}&s=${backupSig(name, exp)}` });
});

app.get('/api/backup-download', (req, res) => {
  const name = str(req.query.n, 60);
  const exp = Number(req.query.e);
  const sig = str(req.query.s, 64);
  const expected = backupSig(name, exp);
  if (!(exp > Date.now() && sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))) {
    return res.status(403).end();
  }
  res.setHeader('Cache-Control', 'no-store');
  if (name === 'full') {
    const file = `full-backup-${new Date().toISOString().slice(0, 10)}.tar.gz`;
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
    const s = backups.stream(true);
    s.on('error', () => res.destroy());
    return s.pipe(res);
  }
  const file = backups.fileFor(name);
  if (!file || !fs.existsSync(file)) return res.status(404).end();
  res.download(file, name);
});

app.use('/api', (req, res) => res.status(404).json({ error: 'not found' }));

// Never leak stack traces or internals to visitors.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status < 500 ? 'طلب غير صالح' : 'حدث خطأ في الخادم' });
});

// ---------- realtime ----------
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e5 });

io.use((socket, next) => {
  const { staffToken, chatToken } = socket.handshake.auth || {};
  if (staffToken) {
    const user = tokens.verify(staffToken, findUser);
    if (!user || user.defaultPassword) return next(new Error('unauthorized'));
    socket.data.user = user;
    return next();
  }
  const chat = chatByToken(chatToken);
  if (chat) {
    socket.data.chatId = chat.id;
    return next();
  }
  next(new Error('unauthorized'));
});

io.on('connection', (socket) => {
  if (socket.data.user) {
    socket.join('staff');
    socket.on('staff:message', ({ chatId, text } = {}) => {
      const c = db.data.chats.find((x) => x.id === chatId);
      const t = str(text, 4000);
      if (!c || !t) return;
      addMessage(c, { from: 'staff', staffName: socket.data.user.name, text: t });
    });
    socket.on('staff:read', (chatId) => {
      const c = db.data.chats.find((x) => x.id === chatId);
      if (c && c.unreadStaff) {
        c.unreadStaff = 0;
        db.save();
      }
    });
    socket.on('staff:typing', (chatId) => io.to('chat:' + chatId).emit('chat:typing'));
    return;
  }

  socket.join('chat:' + socket.data.chatId);
  let last = 0;
  socket.on('patient:message', ({ text } = {}) => {
    const c = db.data.chats.find((x) => x.id === socket.data.chatId);
    const t = str(text, 4000);
    if (!c || c.status !== 'approved' || !t) return;
    if (Date.now() - last < 400) return; // basic flood protection
    last = Date.now();
    addMessage(c, { from: 'patient', text: t });
  });
  let lastTyping = 0;
  socket.on('patient:typing', () => {
    if (Date.now() - lastTyping < 1500) return;
    lastTyping = Date.now();
    io.to('staff').emit('chat:typing', socket.data.chatId);
  });
});

function disconnectUser(userId) {
  for (const sock of io.sockets.sockets.values()) if (sock.data.user?.id === userId) sock.disconnect(true);
}

function shutdown() {
  db.flush();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (require.main === module) {
  backups.start();
  server.listen(PORT, () => console.log(`Dr. Noor Ali site running on http://localhost:${PORT}  (admin: /admin)`));
}

module.exports = { app, server, db, backups };
