// Doctor G — dental clinic website server.
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

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
const PRIVATE_DIR = path.join(DATA_DIR, 'private'); // payment receipts & chat images

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(PRIVATE_DIR, { recursive: true });

const db = new DB(path.join(DATA_DIR, 'db.json'));

// ---------- secret & first admin ----------
function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(DATA_DIR, 'secret');
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString('hex'));
  return fs.readFileSync(file, 'utf8').trim();
}
const tokens = createTokenService(loadSecret());

if (!db.data.users.length) {
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const { salt, hash } = hashPassword(password);
  db.data.users.push({
    id: crypto.randomUUID(),
    username: process.env.ADMIN_USERNAME || 'admin',
    name: db.data.settings.doctorName || 'الطبيب',
    role: 'admin',
    salt,
    hash,
    defaultPassword: !process.env.ADMIN_PASSWORD,
  });
  db.flush();
  console.log(`Created admin user "${db.data.users[0].username}" (password: ${process.env.ADMIN_PASSWORD ? 'from ADMIN_PASSWORD' : 'admin123 — change it!'})`);
}

const findUser = (uid) => db.data.users.find((u) => u.id === uid);
const publicUser = (u) => ({ id: u.id, username: u.username, name: u.name, role: u.role, defaultPassword: !!u.defaultPassword });

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
      return res.status(429).json({ error: 'طلبات كثيرة، يرجى المحاولة بعد قليل.' });
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
      else cb(new Error('نوع الملف غير مدعوم'));
    },
  });
}
const mediaUpload = makeUploader(UPLOAD_DIR, { ...IMAGE_TYPES, ...VIDEO_TYPES }, Number(process.env.MAX_VIDEO_MB) || 200);
const privateImageUpload = makeUploader(PRIVATE_DIR, IMAGE_TYPES, 10);

// Wrap multer so errors become clean JSON responses.
const handleUpload = (uploader, field) => (req, res, next) =>
  uploader.single(field)(req, res, (err) => {
    if (!err) return next();
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'حجم الملف كبير جدًا' : err.message || 'فشل رفع الملف';
    res.status(400).json({ error: msg });
  });

// ---------- app ----------
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use('/vendor/three', express.static(path.join(__dirname, 'node_modules/three'), { maxAge: '7d' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// ---------- public content ----------
function publicContent() {
  const d = db.data;
  return {
    settings: d.settings,
    services: d.services,
    portfolio: d.portfolio,
    testimonials: d.testimonials,
    faq: d.faq,
    paymentMethods: d.paymentMethods.filter((p) => p.enabled !== false),
  };
}

app.get('/api/content', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.json(publicContent());
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

  if (!name || !phone || !date || !time) return res.status(400).json({ error: 'يرجى إكمال الحقول المطلوبة' });
  if (!/^[+\d\s()-]{6,30}$/.test(phone)) return res.status(400).json({ error: 'رقم الهاتف غير صحيح' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'التاريخ غير صحيح' });

  const day = new Date(date + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(day) || day < today) return res.status(400).json({ error: 'لا يمكن الحجز في تاريخ سابق' });
  if (closedDays().includes(day.getDay())) return res.status(400).json({ error: 'العيادة مغلقة في هذا اليوم' });
  if (!slotList().includes(time)) return res.status(400).json({ error: 'الوقت المختار غير متاح' });
  if (takenSlots(date).includes(time)) return res.status(409).json({ error: 'هذا الوقت محجوز، يرجى اختيار وقت آخر' });

  const booking = {
    id: newId(),
    code: 'G-' + Math.floor(1000 + Math.random() * 9000),
    name, phone, service, date, time, paymentMethod, notes,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  db.data.bookings.unshift(booking);
  db.save();
  io.to('staff').emit('booking:new', booking);

  const s = db.data.settings;
  const lines = [
    `مرحبًا ${s.clinicName}، أود حجز موعد:`,
    `رقم الحجز: ${booking.code}`,
    `الاسم: ${name}`,
    `الهاتف: ${phone}`,
    service && `الخدمة: ${service}`,
    `التاريخ: ${date}`,
    `الوقت: ${time}`,
    paymentMethod && `طريقة الدفع: ${paymentMethod}`,
    notes && `ملاحظات: ${notes}`,
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
  messages: c.messages,
});
const chatSummary = (c) => ({
  id: c.id,
  name: c.name,
  phone: c.phone,
  paymentMethod: c.paymentMethod,
  note: c.note,
  receipt: c.receipt,
  status: c.status,
  staffNote: c.staffNote || '',
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
  approvedBy: c.approvedBy || '',
  unreadStaff: c.unreadStaff || 0,
  lastMessage: c.messages[c.messages.length - 1] || null,
});

function addMessage(chat, msg) {
  const m = { id: newId(), at: new Date().toISOString(), text: '', image: '', ...msg };
  chat.messages.push(m);
  if (chat.messages.length > 2000) chat.messages.shift();
  chat.updatedAt = m.at;
  if (m.from === 'patient') chat.unreadStaff = (chat.unreadStaff || 0) + 1;
  db.save();
  io.to('chat:' + chat.id).emit('chat:message', m);
  io.to('staff').emit('chat:message', { chatId: chat.id, message: m, summary: chatSummary(chat) });
  return m;
}

app.post(
  '/api/chat/request',
  rateLimit('chatreq', 5, 30 * 60 * 1000),
  handleUpload(privateImageUpload, 'receipt'),
  (req, res) => {
    if (!db.data.settings.chatEnabled) return res.status(403).json({ error: 'الدردشة غير متاحة حاليًا' });
    const b = req.body || {};
    const name = str(b.name, 100);
    const phone = str(b.phone, 30);
    if (!name || !/^[+\d\s()-]{6,30}$/.test(phone)) {
      return res.status(400).json({ error: 'يرجى إدخال الاسم ورقم هاتف صحيح' });
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
      message: `مرحبًا، قمت بطلب استشارة مباشرة عبر الموقع.\nالاسم: ${name}\nالهاتف: ${phone}\nطريقة الدفع: ${chat.paymentMethod || '-'}\nيرجى تأكيد الدفع وفتح المحادثة.`,
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
  if (!chat || chat.status !== 'approved') return res.status(403).json({ error: 'المحادثة غير مفعلة' });
  req.chat = chat;
  next();
}, handleUpload(privateImageUpload, 'image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم اختيار صورة' });
  const m = addMessage(req.chat, { from: 'patient', image: '/api/files/' + req.file.filename, text: str(req.body.text, 2000) });
  res.json({ message: m });
});

// Private files (receipts, chat images): visible to staff and to the chat's own patient.
app.get('/api/files/:name', (req, res) => {
  const name = path.basename(req.params.name);
  const url = '/api/files/' + name;
  const t = str(req.query.t, 500);
  const staff = tokens.verify(t, findUser);
  let allowed = !!staff;
  if (!allowed) {
    const chat = chatByToken(t);
    allowed = !!chat && (chat.receipt === url || chat.messages.some((m) => m.image === url));
  }
  if (!allowed) return res.status(403).end();
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
  next();
}
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'هذه الصلاحية للطبيب فقط' });
  next();
}

app.post('/api/admin/login', rateLimit('login', 10, 15 * 60 * 1000), (req, res) => {
  const username = str(req.body?.username, 100).toLowerCase();
  const password = str(req.body?.password, 200);
  const user = db.data.users.find((u) => u.username.toLowerCase() === username);
  if (!user || !verifyPassword(password, user.salt, user.hash)) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }
  res.json({ token: tokens.issue(user), user: publicUser(user) });
});

app.get('/api/admin/me', requireStaff, (req, res) => res.json({ user: publicUser(req.user) }));

app.get('/api/admin/data', requireStaff, (req, res) => {
  const d = db.data;
  res.json({
    user: publicUser(req.user),
    ...publicContent(),
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
  if (str(nextPass, 200).length < 6) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  Object.assign(req.user, hashPassword(str(nextPass, 200)), { defaultPassword: false });
  db.save();
  res.json({ token: tokens.issue(req.user), user: publicUser(req.user) });
});

// ---------- admin: settings ----------
const BOOL_SETTINGS = ['show3D', 'chatEnabled'];
const URL_SETTINGS = ['logoImage', 'heroImage', 'doctorPhoto', 'instagram', 'facebook', 'tiktok', 'snapchat', 'youtube'];

app.put('/api/admin/settings', requireStaff, requireAdmin, (req, res) => {
  const s = db.data.settings;
  const body = req.body || {};
  for (const key of Object.keys(s)) {
    if (!(key in body)) continue;
    if (BOOL_SETTINGS.includes(key)) s[key] = !!body[key];
    else if (URL_SETTINGS.includes(key)) s[key] = safeUrl(body[key]);
    else if (key === 'mapEmbed') {
      const v = str(body[key], 2000);
      // Accept either the embed URL or a full <iframe ...> snippet from Google Maps.
      const m = v.match(/https:\/\/www\.google\.com\/maps\/embed\?[^"'\s<>]+/);
      s[key] = m ? m[0] : '';
    } else if (key === 'primaryColor') {
      s[key] = /^#[0-9a-f]{6}$/i.test(body[key]) ? body[key] : s[key];
    } else if (key === 'whatsapp') s[key] = str(body[key], 30).replace(/\D/g, '');
    else s[key] = str(body[key], 10000);
  }
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
const isCollection = (req, res, next) => (COLLECTIONS[req.params.col] ? next() : next('route'));

function cleanItem(schema, body) {
  const out = {};
  for (const [k, fn] of Object.entries(schema)) if (k in body) out[k] = fn(body[k]);
  return out;
}

app.post('/api/admin/:col', isCollection, requireStaff, requireAdmin, (req, res) => {
  const schema = COLLECTIONS[req.params.col];
  const item = { id: newId(), ...Object.fromEntries(Object.keys(schema).map((k) => [k, ''])), ...cleanItem(schema, req.body || {}) };
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
  Object.assign(item, cleanItem(schema, req.body || {}));
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
  res.json({ chat: { ...chatSummary(c), messages: c.messages } });
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
  if (password.length < 6) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
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

app.delete('/api/admin/users/:id', requireStaff, requireAdmin, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'لا يمكنك حذف حسابك' });
  const i = db.data.users.findIndex((u) => u.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'غير موجود' });
  db.data.users.splice(i, 1);
  db.save();
  res.json({ ok: true });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'not found' }));

// ---------- realtime ----------
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e5 });

io.use((socket, next) => {
  const { staffToken, chatToken } = socket.handshake.auth || {};
  if (staffToken) {
    const user = tokens.verify(staffToken, findUser);
    if (!user) return next(new Error('unauthorized'));
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
  socket.on('patient:typing', () => io.to('staff').emit('chat:typing', socket.data.chatId));
});

function shutdown() {
  db.flush();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (require.main === module) {
  server.listen(PORT, () => console.log(`Doctor G site running on http://localhost:${PORT}  (admin: /admin)`));
}

module.exports = { app, server, db };
