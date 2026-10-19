import { icon, esc, ICON_NAMES } from '/js/icons.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const TOKEN_KEY = 'dg_admin_token';

const state = {
  token: (() => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } })(),
  user: null,
  data: null,
  view: 'dashboard',
  bookingFilter: 'pending',
  bookingSearch: '',
  chatFilter: 'pending',
  activeChat: null, // full chat object with messages
  settingsGroup: 0,
};
let socket = null;

// ---------- helpers ----------
function toast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.className = 'toast'), 3500);
}

async function api(path, { method = 'GET', body, form } = {}) {
  const headers = { Authorization: 'Bearer ' + state.token };
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch('/api' + path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  const out = await res.json().catch(() => ({}));
  if (res.status === 401) {
    logout();
    throw new Error(out.error || 'انتهت الجلسة');
  }
  if (!res.ok) {
    const err = new Error(out.error || 'حدث خطأ');
    err.code = out.code;
    throw err;
  }
  return out;
}

// Upload with progress (videos can be large).
function upload(file, onProgress, url = '/api/admin/upload', field = 'file') {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', 'Bearer ' + state.token);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let out = {};
      try { out = JSON.parse(xhr.responseText); } catch {}
      xhr.status < 300 ? resolve(out) : reject(new Error(out.error || 'فشل الرفع'));
    };
    xhr.onerror = () => reject(new Error('فشل الاتصال'));
    const fd = new FormData();
    fd.append(field, file);
    xhr.send(fd);
  });
}

// Private file links come from the server already signed and short-lived.
const fileUrl = (u) => u;
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const fmtDate = (iso) => new Date(iso).toLocaleString('ar-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' });
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('ar-u-nu-latn', { hour: 'numeric', minute: '2-digit' });
const isAdmin = () => state.user?.role === 'admin';
const isVideo = (u) => /\.(mp4|webm|mov|ogg)(\?|$)/i.test(u || '');
const waLink = (phone, text) => {
  let p = String(phone || '').replace(/\D/g, '');
  if (p.startsWith('0')) p = '964' + p.slice(1); // local Iraqi number → international (edit if needed)
  return `https://wa.me/${p}${text ? '?text=' + encodeURIComponent(text) : ''}`;
};

function openModal(html, cls = '') {
  const card = $('#modalCard');
  card.className = 'modal-card ' + cls;
  card.innerHTML = html;
  $('#modal').classList.add('open');
  $('#modal').setAttribute('aria-hidden', 'false');
  return card;
}
let onModalClose = null;
function closeModal() {
  const cb = onModalClose;
  onModalClose = null;
  cb?.();
  $('#modal').classList.remove('open');
  $('#modal').setAttribute('aria-hidden', 'true');
  $$('video', $('#modal')).forEach((v) => v.pause());
}
$('#modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal();
});
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeModal());

function confirmBox(text, okLabel = 'تأكيد', danger = true) {
  return new Promise((resolve) => {
    const card = openModal(`
      <h2 style="font-size:1.1rem">${esc(text)}</h2>
      <div class="modal-foot"><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="cOk">${esc(okLabel)}</button><button class="btn btn-light" data-close>إلغاء</button></div>`, 'sm');
    let result = false;
    onModalClose = () => resolve(result);
    $('#cOk', card).onclick = () => { result = true; closeModal(); };
  });
}
function promptBox(title, label, value = '') {
  return new Promise((resolve) => {
    const card = openModal(`
      <h2 style="font-size:1.1rem">${esc(title)}</h2>
      <label class="field"><span>${esc(label)}</span><textarea id="pVal" rows="3">${esc(value)}</textarea></label>
      <div class="modal-foot"><button class="btn btn-primary" id="pOk">حفظ</button><button class="btn btn-light" data-close>إلغاء</button></div>`, 'sm');
    let result = null;
    onModalClose = () => resolve(result);
    $('#pOk', card).onclick = () => { result = $('#pVal').value; closeModal(); };
  });
}

// Short notification beep using WebAudio (no sound file needed).
function beep() {
  try {
    const ctx = beep.ctx || (beep.ctx = new AudioContext());
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.42);
  } catch {}
}
function notify(title, body) {
  beep();
  toast(`${title} — ${body}`);
  if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
    try { new Notification(title, { body, icon: '/img/favicon.svg' }); } catch {}
  }
}

// ---------- auth ----------
function showScreen(id) {
  $('#app').hidden = true;
  for (const f of ['loginForm', 'forceForm', 'recoverForm']) $('#' + f).hidden = f !== id;
  $('#login').hidden = false;
}
const showLogin = () => showScreen('loginForm');
$('#forgotBtn').onclick = () => showScreen('recoverForm');
$('#backToLogin').onclick = () => showScreen('loginForm');

// Shows a freshly created recovery code once; `then` runs after the user confirms they saved it.
function showRecoveryCode(code, then) {
  const card = openModal(`
    <div class="modal-head"><h2>${icon('key')} رمز استعادة كلمة المرور</h2></div>
    <p>إذا نسيتِ كلمة المرور يومًا، يمكنكِ تعيين كلمة جديدة بهذا الرمز من رابط «نسيت كلمة المرور؟».</p>
    <div class="code-box" id="recCode">${esc(code)}</div>
    <p class="muted small">⚠️ لن يظهر هذا الرمز مرة أخرى. احفظيه في مكان آمن (صورة في هاتفك، أو ورقة في العيادة). كل رمز يعمل مرة واحدة فقط.</p>
    <div class="modal-foot"><button class="btn btn-primary" id="recSaved">${icon('check')} حفظته</button><button class="btn btn-light" id="recCopy">نسخ</button></div>`, 'sm');
  $('#recCopy', card).onclick = async () => {
    try { await navigator.clipboard.writeText(code); toast('تم النسخ ✓', 'ok'); } catch { toast('انسخ الرمز يدويًا', 'error'); }
  };
  onModalClose = () => then?.();
  $('#recSaved', card).onclick = closeModal;
}

$('#recoverForm').onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target;
  $('#recoverError').textContent = '';
  if (f.next.value !== f.confirm.value) return ($('#recoverError').textContent = 'كلمتا المرور غير متطابقتين');
  try {
    const res = await fetch('/api/admin/recover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: f.username.value, code: f.code.value, password: f.next.value }) });
    const out = await res.json();
    if (!res.ok) throw new Error(out.error);
    state.token = out.token;
    try { localStorage.setItem(TOKEN_KEY, out.token); } catch {}
    f.reset();
    toast('تم تعيين كلمة المرور الجديدة ✓', 'ok');
    showRecoveryCode(out.recoveryCode, start);
  } catch (ex) {
    $('#recoverError').textContent = ex.message || 'تعذرت الاستعادة';
  }
};

// First login with the default password: must set a new one before seeing any data.
function showForceChange() {
  showScreen('forceForm');
}
$('#forceForm').onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target;
  $('#forceError').textContent = '';
  if (f.next.value !== f.confirm.value) return ($('#forceError').textContent = 'كلمتا المرور غير متطابقتين');
  try {
    const out = await api('/admin/password', { method: 'PUT', body: { current: f.current.value, next: f.next.value } });
    state.token = out.token;
    try { localStorage.setItem(TOKEN_KEY, out.token); } catch {}
    f.reset();
    toast('تم تغيير كلمة المرور ✓', 'ok');
    showRecoveryCode(out.recoveryCode, start);
  } catch (ex) {
    $('#forceError').textContent = ex.message;
  }
};
function logout() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
  state.token = null;
  socket?.close();
  socket = null;
  showLogin();
}
$('#loginForm').onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target;
  $('#loginError').textContent = '';
  try {
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: f.username.value, password: f.password.value }) });
    const out = await res.json();
    if (!res.ok) throw new Error(out.error);
    state.token = out.token;
    try { localStorage.setItem(TOKEN_KEY, out.token); } catch {}
    f.reset();
    start();
  } catch (ex) {
    $('#loginError').textContent = ex.message || 'تعذر تسجيل الدخول';
  }
};

// ---------- navigation ----------
const VIEWS = [
  { group: 'الإدارة' },
  { id: 'dashboard', label: 'الرئيسية', icon: 'grid' },
  { id: 'bookings', label: 'الحجوزات', icon: 'calendar', count: () => state.data.bookings.filter((b) => b.status === 'pending').length },
  { id: 'chats', label: 'المحادثات', icon: 'chat', count: () => state.data.chats.filter((c) => c.status === 'pending').length + state.data.chats.reduce((n, c) => n + (c.status === 'approved' ? c.unreadStaff : 0), 0) },
  { group: 'محتوى الموقع', admin: true },
  { id: 'settings', label: 'النصوص والإعدادات', icon: 'settings', admin: true },
  { id: 'services', label: 'الخدمات', icon: 'tooth', admin: true },
  { id: 'portfolio', label: 'الأعمال (بورتفوليو)', icon: 'image', admin: true },
  { id: 'testimonials', label: 'آراء المرضى', icon: 'star', admin: true },
  { id: 'faq', label: 'الأسئلة الشائعة', icon: 'question', admin: true },
  { id: 'paymentMethods', label: 'طرق الدفع', icon: 'wallet', admin: true },
  { group: 'الحساب' },
  { id: 'users', label: 'المستخدمون', icon: 'users', admin: true },
  { id: 'backups', label: 'النسخ الاحتياطي', icon: 'download', admin: true },
  { id: 'account', label: 'كلمة المرور', icon: 'lock' },
];

function renderNav() {
  $('#sideNav').innerHTML = VIEWS.filter((v) => !v.admin || isAdmin())
    .map((v) => {
      if (v.group) return `<div class="side-group">${esc(v.group)}</div>`;
      const n = v.count?.() || 0;
      return `<button class="side-link ${state.view === v.id ? 'active' : ''}" data-view="${v.id}">${icon(v.icon)}<span>${esc(v.label)}</span>${n ? `<span class="count">${n}</span>` : ''}</button>`;
    })
    .join('');
  const pending = state.data.bookings.filter((b) => b.status === 'pending').length + state.data.chats.filter((c) => c.status === 'pending').length;
  document.title = (pending ? `(${pending}) ` : '') + 'لوحة التحكم';
}
$('#sideNav').addEventListener('click', (e) => {
  const b = e.target.closest('[data-view]');
  if (b) go(b.dataset.view);
});
function setSidebar(open) {
  $('#sidebar').classList.toggle('open', open);
  $('#sideOverlay').classList.toggle('open', open);
}
$('#menuBtn').onclick = () => setSidebar(true);
$('#sideOverlay').onclick = () => setSidebar(false);
$('#logoutBtn').onclick = logout;

function go(view) {
  state.view = view;
  if (view !== 'chats') state.activeChat = null;
  try { history.replaceState(null, '', '#' + view); } catch {}
  setSidebar(false);
  render();
  window.scrollTo(0, 0);
}

function render() {
  renderNav();
  const v = VIEWS.find((x) => x.id === state.view) || VIEWS[1];
  $('#viewTitle').textContent = v.label;
  const fn = { dashboard: viewDashboard, bookings: viewBookings, chats: viewChats, settings: viewSettings, users: viewUsers, account: viewAccount, backups: viewBackups }[state.view];
  if (fn) fn();
  else if (COLLECTIONS[state.view]) viewCollection(state.view);
}

// ---------- dashboard ----------
function bookingCard(b) {
  const statusSel = `<select data-bstatus="${b.id}">${Object.entries(BOOKING_LABELS).map(([k, l]) => `<option value="${k}" ${b.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const msg = confirmMessage(b);
  return `
  <div class="row-card">
    <div>
      <h3>${esc(b.name)} <span class="status st-${b.status}">${BOOKING_LABELS[b.status]}</span> <span class="code">${esc(b.code)}</span>${b.lang && b.lang !== 'ar' ? ` <span class="lang-badge" title="لغة المريض">${b.lang.toUpperCase()}</span>` : ''}</h3>
      <div class="meta"><span class="ltr">${icon('phone')} ${esc(b.phone)}</span>${b.service ? `<span>${icon('tooth')} ${esc(b.service)}</span>` : ''}${b.paymentMethod ? `<span>${icon('wallet')} ${esc(b.paymentMethod)}</span>` : ''}</div>
    </div>
    <div><div class="when">${icon('calendar')} ${esc(b.date)} — ${esc(b.time)}</div><div class="muted small">أُرسل ${fmtDate(b.createdAt)}</div></div>
    <div class="row-actions">
      ${statusSel}
      <a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${esc(waLink(b.phone, msg))}">${icon('whatsapp')} مراسلة</a>
      <button class="icon-btn danger" data-bdel="${b.id}" title="حذف">${icon('trash')}</button>
    </div>
    ${b.notes ? `<div class="note">${esc(b.notes)}</div>` : ''}
  </div>`;
}
// Confirmation message to the patient, in the language they booked in.
function confirmMessage(b) {
  const st = state.data.settings;
  const tr = (k) => (b.lang && b.lang !== 'ar' && st.i18n?.[b.lang]?.[k]) || st[k];
  const clinic = tr('clinicName');
  if (b.lang === 'en') return `Hello ${b.name}, your appointment at ${clinic} is confirmed.\nBooking no.: ${b.code}\nDate: ${b.date}\nTime: ${b.time}\nSee you soon 🌷`;
  if (b.lang === 'de') return `Hallo ${b.name}, Ihr Termin in der ${clinic} ist bestätigt.\nBuchungsnr.: ${b.code}\nDatum: ${b.date}\nUhrzeit: ${b.time}\nWir freuen uns auf Sie 🌷`;
  return `مرحبًا ${b.name}، تم تأكيد موعدك في ${clinic}\nرقم الحجز: ${b.code}\nالتاريخ: ${b.date}\nالوقت: ${b.time}\nبانتظارك 🌷`;
}

const BOOKING_LABELS = { pending: 'بانتظار التأكيد', confirmed: 'مؤكد', done: 'تم', cancelled: 'ملغي' };
const CHAT_LABELS = { pending: 'بانتظار الدفع', approved: 'مفتوحة', rejected: 'مرفوضة', closed: 'مغلقة' };

function wireBookingActions(root) {
  $$('[data-bstatus]', root).forEach((sel) =>
    (sel.onchange = async () => {
      try {
        const { booking } = await api('/admin/bookings/' + sel.dataset.bstatus, { method: 'PATCH', body: { status: sel.value } });
        Object.assign(state.data.bookings.find((x) => x.id === booking.id), booking);
        toast('تم تحديث حالة الحجز', 'ok');
        render();
      } catch (e) { toast(e.message, 'error'); }
    })
  );
  $$('[data-bdel]', root).forEach((b) =>
    (b.onclick = async () => {
      if (!(await confirmBox('حذف هذا الحجز نهائيًا؟', 'حذف'))) return;
      try {
        await api('/admin/bookings/' + b.dataset.bdel, { method: 'DELETE' });
        state.data.bookings = state.data.bookings.filter((x) => x.id !== b.dataset.bdel);
        render();
      } catch (e) { toast(e.message, 'error'); }
    })
  );
}

function viewDashboard() {
  const d = state.data;
  const today = new Date().toISOString().slice(0, 10);
  const pendingB = d.bookings.filter((b) => b.status === 'pending');
  const todayB = d.bookings.filter((b) => b.date === today && b.status !== 'cancelled');
  const pendingC = d.chats.filter((c) => c.status === 'pending');
  const openC = d.chats.filter((c) => c.status === 'approved');
  $('#view').innerHTML = `
    ${!state.user.hasRecovery ? `<div class="alert warn">${icon('key')} <span>لم تُنشئ رمز استعادة بعد. إذا نسيت كلمة المرور لن تتمكن من الدخول.</span> <button class="btn btn-sm btn-light" data-go="account">إنشاء الآن</button></div>` : ''}
    ${state.user.defaultPassword ? `<div class="alert warn">${icon('lock')} <span>أنت تستخدم كلمة المرور الافتراضية. يرجى تغييرها لحماية لوحة التحكم.</span> <button class="btn btn-sm btn-light" data-go="account">تغيير الآن</button></div>` : ''}
    <div class="kpis">
      <div class="kpi warn"><span class="ki">${icon('calendar')}</span><div><strong>${pendingB.length}</strong><span>حجوزات بانتظار التأكيد</span></div></div>
      <div class="kpi"><span class="ki">${icon('clock')}</span><div><strong>${todayB.length}</strong><span>مواعيد اليوم</span></div></div>
      <div class="kpi warn"><span class="ki">${icon('wallet')}</span><div><strong>${pendingC.length}</strong><span>طلبات دردشة بانتظار الدفع</span></div></div>
      <div class="kpi"><span class="ki">${icon('chat')}</span><div><strong>${openC.length}</strong><span>محادثات مفتوحة</span></div></div>
    </div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h2>طلبات الدردشة الجديدة</h2><button class="btn btn-sm btn-light" data-go="chats">الكل</button></div>
        ${pendingC.length ? `<div class="list">${pendingC.slice(0, 6).map((c) => `
          <div class="row-card" style="grid-template-columns:1fr auto">
            <div><h3>${esc(c.name)}</h3><div class="meta"><span class="ltr">${esc(c.phone)}</span><span>${icon('wallet')} ${esc(c.paymentMethod || '-')}</span>${c.receipt ? `<span>${icon('image')} يوجد إيصال</span>` : ''}</div></div>
            <div class="row-actions"><button class="btn btn-sm btn-soft" data-openchat="${c.id}">مراجعة</button></div>
          </div>`).join('')}</div>` : '<p class="empty">لا توجد طلبات جديدة</p>'}
      </div>
      <div class="panel">
        <div class="panel-head"><h2>أحدث الحجوزات</h2><button class="btn btn-sm btn-light" data-go="bookings">الكل</button></div>
        ${d.bookings.length ? `<div class="list">${d.bookings.slice(0, 5).map(bookingCard).join('')}</div>` : '<p class="empty">لا توجد حجوزات بعد</p>'}
      </div>
    </div>`;
  wireBookingActions($('#view'));
  $$('[data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go)));
  $$('[data-openchat]').forEach((b) => (b.onclick = () => { state.chatFilter = 'pending'; go('chats'); openChat(b.dataset.openchat); }));
}

// ---------- bookings ----------
function viewBookings() {
  const d = state.data;
  const counts = { all: d.bookings.length };
  Object.keys(BOOKING_LABELS).forEach((k) => (counts[k] = d.bookings.filter((b) => b.status === k).length));
  const q = state.bookingSearch.trim().toLowerCase();
  const list = d.bookings
    .filter((b) => state.bookingFilter === 'all' || b.status === state.bookingFilter)
    .filter((b) => !q || [b.name, b.phone, b.code, b.service, b.date].join(' ').toLowerCase().includes(q))
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  $('#view').innerHTML = `
    <div class="toolbar">
      <div class="tabs" style="margin:0">${[['pending', BOOKING_LABELS.pending], ['confirmed', 'مؤكدة'], ['done', 'منتهية'], ['cancelled', 'ملغاة'], ['all', 'الكل']].map(([k, l]) => `<button class="tab ${state.bookingFilter === k ? 'active' : ''}" data-f="${k}">${l}<span class="n">${counts[k]}</span></button>`).join('')}</div>
      <input type="search" id="bSearch" placeholder="بحث بالاسم أو الهاتف أو رقم الحجز…" value="${esc(state.bookingSearch)}">
    </div>
    ${list.length ? `<div class="list">${list.map(bookingCard).join('')}</div>` : '<div class="panel empty">لا توجد حجوزات هنا</div>'}`;
  $$('[data-f]').forEach((b) => (b.onclick = () => { state.bookingFilter = b.dataset.f; render(); }));
  const s = $('#bSearch');
  s.oninput = () => {
    state.bookingSearch = s.value;
    clearTimeout(s.t);
    s.t = setTimeout(() => { render(); const n = $('#bSearch'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250);
  };
  wireBookingActions($('#view'));
}

// ---------- chats ----------
function viewChats() {
  const d = state.data;
  const counts = { all: d.chats.length };
  Object.keys(CHAT_LABELS).forEach((k) => (counts[k] = d.chats.filter((c) => c.status === k).length));
  const list = d.chats
    .filter((c) => state.chatFilter === 'all' || c.status === state.chatFilter)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  $('#view').innerHTML = `
    <div class="chat-layout ${state.activeChat ? 'viewing' : ''}" id="chatLayout">
      <div class="chat-list">
        <div class="tabs">${[['pending', 'بانتظار الدفع'], ['approved', 'مفتوحة'], ['closed', 'مغلقة'], ['rejected', 'مرفوضة'], ['all', 'الكل']].map(([k, l]) => `<button class="tab ${state.chatFilter === k ? 'active' : ''}" data-cf="${k}">${l}<span class="n">${counts[k]}</span></button>`).join('')}</div>
        <div class="chat-items">${list.map(chatItem).join('') || '<p class="empty">لا توجد محادثات</p>'}</div>
      </div>
      <div class="chat-pane" id="chatPane">${state.activeChat ? '' : `<div class="pane-empty"><div>${icon('chat')}<p>اختر محادثة لعرضها</p></div></div>`}</div>
    </div>`;
  $$('[data-cf]').forEach((b) => (b.onclick = () => { state.chatFilter = b.dataset.cf; render(); }));
  $$('[data-chat]').forEach((b) => (b.onclick = () => openChat(b.dataset.chat)));
  if (state.activeChat) renderPane();
}
function chatItem(c) {
  const last = c.lastMessage ? (c.lastMessage.image ? '📷 صورة' : c.lastMessage.text) : c.note || c.paymentMethod || '';
  return `<button class="chat-item ${state.activeChat?.id === c.id ? 'active' : ''}" data-chat="${c.id}">
    <span class="av">${esc(c.name.charAt(0))}</span>
    <span class="ci-body">
      <span class="ci-top"><b>${esc(c.name)}</b><span class="status st-${c.status}">${CHAT_LABELS[c.status]}</span></span>
      <span class="ci-top"><p>${esc(last)}</p>${c.unreadStaff && c.status === 'approved' ? `<span class="unread">${c.unreadStaff}</span>` : ''}</span>
    </span>
  </button>`;
}

async function openChat(id) {
  try {
    const { chat } = await api('/admin/chats/' + id);
    state.activeChat = chat;
    const s = state.data.chats.find((x) => x.id === id);
    if (s) s.unreadStaff = 0;
    if (state.view === 'chats') {
      $('#chatLayout')?.classList.add('viewing');
      viewChats();
    }
    renderNav();
  } catch (e) { toast(e.message, 'error'); }
}

function renderPane() {
  const c = state.activeChat;
  const pane = $('#chatPane');
  if (!pane || !c) return;
  const actions = [];
  if (c.status !== 'approved') actions.push(`<button class="btn btn-ok btn-sm" data-cs="approved">${icon('unlock')} ${c.status === 'pending' ? 'تأكيد الدفع وفتح المحادثة' : 'إعادة فتح المحادثة'}</button>`);
  if (c.status === 'pending') actions.push(`<button class="btn btn-danger btn-sm" data-cs="rejected">${icon('close')} رفض</button>`);
  if (c.status === 'approved') actions.push(`<button class="btn btn-light btn-sm" data-cs="closed">${icon('lock')} إغلاق المحادثة</button>`);
  pane.innerHTML = `
    <div class="pane-head">
      <button class="icon-btn back-btn" id="paneBack" aria-label="رجوع">${icon('arrow')}</button>
      <div class="who"><b>${esc(c.name)}</b><small class="ltr">${esc(c.phone)}</small></div>
      <span class="status st-${c.status}">${CHAT_LABELS[c.status]}</span>
      <a class="icon-btn" target="_blank" rel="noopener" href="${esc(waLink(c.phone))}" title="واتساب">${icon('whatsapp')}</a>
      ${isAdmin() ? `<button class="icon-btn danger" id="chatDel" title="حذف">${icon('trash')}</button>` : ''}
    </div>
    <div class="pay-box">
      ${c.receipt ? `<a class="receipt" href="#" id="receiptView"><img src="${esc(fileUrl(c.receipt))}" alt="إيصال"></a>` : `<div class="receipt muted small">لا يوجد إيصال</div>`}
      <div class="pinfo">
        <div><b>طريقة الدفع:</b> ${esc(c.paymentMethod || '-')}</div>
        <div><b>تاريخ الطلب:</b> ${fmtDate(c.createdAt)}</div>
        ${c.note ? `<div><b>ملاحظة المريض:</b> ${esc(c.note)}</div>` : ''}
        ${c.approvedBy ? `<div class="muted small">تمت الموافقة بواسطة: ${esc(c.approvedBy)}</div>` : ''}
        ${c.staffNote ? `<div class="muted small">ملاحظة للمريض: ${esc(c.staffNote)}</div>` : ''}
      </div>
      <div class="pact">${actions.join('')}</div>
    </div>
    <div class="msgs" id="msgs">${c.messages.length ? '' : '<p class="empty small">لا توجد رسائل بعد</p>'}</div>
    <div class="typing" id="typing"></div>
    ${c.status === 'approved'
      ? `<form class="composer" id="composer">
          <label class="round attach" title="إرسال صورة">${icon('image')}<input type="file" accept="image/*" hidden id="paneFile"></label>
          <textarea id="paneText" rows="1" placeholder="اكتب ردك…" maxlength="4000"></textarea>
          <button class="round send" type="submit" aria-label="إرسال">${icon('send')}</button>
        </form>`
      : `<div class="pane-empty" style="flex:none;padding:1rem"><span class="small">${c.status === 'pending' ? 'المحادثة مقفلة حتى تأكيد الدفع.' : 'المحادثة غير مفعلة.'}</span></div>`}`;
  c.messages.forEach((m) => appendPaneMsg(m, false));
  scrollPane();

  $('#paneBack').onclick = () => { state.activeChat = null; viewChats(); };
  $('#receiptView')?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(`<div class="modal-head"><h2>إيصال الدفع — ${esc(c.name)}</h2><button class="icon-btn" data-close>${icon('close')}</button></div><img class="img-view" src="${esc(fileUrl(c.receipt))}" alt="">`);
  });
  $('#chatDel')?.addEventListener('click', async () => {
    if (!(await confirmBox('حذف هذه المحادثة وكل رسائلها؟', 'حذف'))) return;
    try {
      await api('/admin/chats/' + c.id, { method: 'DELETE' });
      state.data.chats = state.data.chats.filter((x) => x.id !== c.id);
      state.activeChat = null;
      render();
    } catch (e) { toast(e.message, 'error'); }
  });
  $$('[data-cs]', pane).forEach((b) =>
    (b.onclick = async () => {
      const status = b.dataset.cs;
      const body = { status };
      if (status === 'rejected') {
        const note = await promptBox('رفض الطلب', 'سبب الرفض (يظهر للمريض)', 'لم يصلنا مبلغ الدفع، يرجى التأكد والمحاولة مجددًا.');
        if (note === null) return;
        body.staffNote = note;
      }
      if (status === 'approved') body.staffNote = '';
      try {
        const { chat } = await api('/admin/chats/' + c.id, { method: 'PATCH', body });
        Object.assign(state.activeChat, chat);
        upsertChat(chat);
        toast(status === 'approved' ? 'تم فتح المحادثة للمريض ✓' : 'تم التحديث', 'ok');
        if (status === 'approved') state.chatFilter = 'approved';
        viewChats();
        renderNav();
      } catch (e) { toast(e.message, 'error'); }
    })
  );
  const form = $('#composer');
  if (form) {
    const ta = $('#paneText');
    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
      socket?.emit('staff:typing', c.id);
    });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !matchMedia('(pointer: coarse)').matches) {
        e.preventDefault();
        form.requestSubmit();
      }
    });
    form.onsubmit = (e) => {
      e.preventDefault();
      const text = ta.value.trim();
      if (!text) return;
      socket?.emit('staff:message', { chatId: c.id, text });
      ta.value = '';
      ta.style.height = 'auto';
    };
    $('#paneFile').onchange = async (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try {
        toast('جارِ رفع الصورة…');
        await upload(f, null, `/api/admin/chats/${c.id}/upload`, 'image');
      } catch (ex) { toast(ex.message, 'error'); }
    };
  }
}
function appendPaneMsg(m, scroll = true) {
  const box = $('#msgs');
  if (!box) return;
  box.querySelector('.empty')?.remove();
  const el = document.createElement('div');
  el.className = 'msg ' + m.from;
  el.innerHTML = `<div class="bubble">${m.image ? `<img src="${esc(fileUrl(m.image))}" alt="">` : ''}${esc(m.text)}</div><time>${m.from === 'staff' && m.staffName ? esc(m.staffName) + ' · ' : ''}${fmtTime(m.at)}</time>`;
  const img = el.querySelector('img');
  if (img) img.onclick = () => openModal(`<div class="modal-head"><h2>صورة</h2><button class="icon-btn" data-close>${icon('close')}</button></div><img class="img-view" src="${esc(img.src)}" alt="">`);
  box.appendChild(el);
  if (scroll) scrollPane();
}
function scrollPane() {
  const b = $('#msgs');
  if (b) b.scrollTop = b.scrollHeight;
}
function upsertChat(summary) {
  const i = state.data.chats.findIndex((x) => x.id === summary.id);
  if (i >= 0) state.data.chats[i] = { ...state.data.chats[i], ...summary };
  else state.data.chats.unshift(summary);
}

// ---------- settings ----------
const SETTINGS_GROUPS = [
  { title: 'الهوية والألوان', fields: [
    ['clinicName', 'اسم العيادة'], ['doctorName', 'اسم الطبيبة'], ['doctorTitle', 'التخصص / اللقب'], ['logoText', 'نص الشعار'],
    ['logoImage', 'صورة الشعار (اختياري)', 'image'], ['primaryColor', 'اللون الأساسي للموقع', 'color'],
    ['seoDescription', 'وصف الموقع لمحركات البحث', 'textarea', 'full'],
  ] },
  { title: 'الواجهة الرئيسية', fields: [
    ['heroBadge', 'الشارة الصغيرة'], ['show3D', 'إظهار مجسم السن ثلاثي الأبعاد', 'bool'],
    ['heroTitle', 'العنوان الرئيسي', 'textarea', 'full'], ['heroSubtitle', 'النص التعريفي', 'textarea', 'full'],
    ['heroImage', 'صورة الواجهة (تظهر عند إيقاف المجسم)', 'image'],
    ['stats', 'الإحصائيات', 'textarea', '', 'كل سطر: الرقم | الوصف — مثال: +10 | سنوات خبرة'],
  ] },
  { title: 'عن الطبيبة', fields: [
    ['aboutTitle', 'عنوان القسم'], ['doctorPhoto', 'صورة الطبيبة', 'image'],
    ['aboutText', 'النبذة', 'textarea', 'full', 'افصل بين الفقرات بسطر فارغ'],
    ['aboutHighlights', 'المؤهلات والنقاط المميزة', 'textarea', 'full', 'كل نقطة في سطر'],
  ] },
  { title: 'عناوين الأقسام', fields: [
    ['servicesTitle', 'عنوان الخدمات'], ['servicesSubtitle', 'وصف الخدمات'],
    ['portfolioTitle', 'عنوان الأعمال'], ['portfolioSubtitle', 'وصف الأعمال'],
    ['testimonialsTitle', 'عنوان آراء المرضى'], ['testimonialsSubtitle', 'وصف آراء المرضى'],
    ['faqTitle', 'عنوان الأسئلة الشائعة'], ['contactTitle', 'عنوان التواصل'], ['footerText', 'نص التذييل'],
  ] },
  { title: 'الحجز', fields: [
    ['bookingTitle', 'عنوان قسم الحجز'], ['bookingNote', 'ملاحظة أسفل النموذج'],
    ['bookingSubtitle', 'وصف قسم الحجز', 'textarea', 'full'],
    ['bookingSlots', 'أوقات المواعيد المتاحة', 'textarea', '', 'كل وقت في سطر، مثال: 10:00 ص'],
    ['closedDays', 'أيام العطلة (لا يمكن الحجز فيها)', 'days'],
  ] },
  { title: 'التواصل والدفع', fields: [
    ['whatsapp', 'رقم واتساب الذي تصله الحجوزات', 'text', '', 'بالصيغة الدولية بدون + أو أصفار، مثال: 9647701234567'],
    ['phone', 'رقم الهاتف'], ['email', 'البريد الإلكتروني'], ['address', 'العنوان'],
    ['workingHours', 'أوقات العمل', 'textarea', '', 'كل سطر يظهر منفصلًا'],
    ['mapEmbed', 'خريطة Google', 'textarea', '', 'من خرائط Google: مشاركة ← تضمين خريطة ← انسخ HTML والصقه هنا'],
  ] },
  { title: 'الدردشة المدفوعة', fields: [
    ['chatEnabled', 'تفعيل الدردشة المباشرة مع الطبيبة', 'bool', 'full'], ['chatPrice', 'رسوم الاستشارة'],
    ['chatIntro', 'نص تعريفي للدردشة', 'textarea', 'full'],
  ] },
  { title: 'اللغات', fields: [
    ['languages', 'لغات الموقع', 'langs', 'full', 'تظهر للزائر قائمة لاختيار اللغة. أوقف أي لغة لم تترجم محتواها بعد.'],
    ['defaultLang', 'اللغة الافتراضية عند فتح الموقع', 'select', '', '', [['ar', 'العربية'], ['en', 'English'], ['de', 'Deutsch']]],
  ] },
  { title: 'سياسة الخصوصية', fields: [
    ['privacyPolicy', 'نص سياسة الخصوصية', 'textarea', 'full tall', 'تظهر في صفحة /privacy. استخدم "## " لبداية عنوان و"- " للنقاط. النص المرفق نموذج عام: راجعه بما يناسب قوانين بلدك.'],
  ] },
  { title: 'التواصل الاجتماعي', fields: [
    ['instagram', 'Instagram', 'url'], ['facebook', 'Facebook', 'url'], ['tiktok', 'TikTok', 'url'], ['snapchat', 'Snapchat', 'url'], ['youtube', 'YouTube', 'url'],
  ] },
];
const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// Generic field renderer used by settings and collection forms.
const LANG_LABELS = { ar: 'العربية', en: 'English', de: 'Deutsch' };

function fieldHtml([key, label, type = 'text', cls = '', hint = '', options = []], value, ph = '') {
  const phAttr = ph ? ` placeholder="${esc(ph)}"` : '';
  const h = hint ? `<small class="hint">${esc(hint)}</small>` : '';
  const wrap = (inner, extra = '') => `<div class="field ${cls} ${extra}" data-key="${key}" data-type="${type}"><span>${esc(label)}</span>${inner}${h}</div>`;
  switch (type) {
    case 'textarea':
      return wrap(`<textarea name="${key}" dir="auto" rows="${cls.includes('tall') ? 18 : cls.includes('full') ? 4 : 5}"${phAttr}>${esc(value)}</textarea>`);
    case 'langs': {
      const set = String(value || '').split(',');
      return wrap(`<div class="days">${Object.entries(LANG_LABELS).map(([l, n]) => `<label class="on-ok"><input type="checkbox" value="${l}" ${set.includes(l) ? 'checked' : ''}> ${n}</label>`).join('')}</div>`);
    }
    case 'select':
      return wrap(`<select name="${key}">${options.map(([v, n]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`);
    case 'bool':
      return `<div class="field ${cls}" data-key="${key}" data-type="bool"><label class="switch"><input type="checkbox" name="${key}" ${value ? 'checked' : ''}> ${esc(label)}</label>${h}</div>`;
    case 'color':
      return wrap(`<div style="display:flex;gap:.6rem;align-items:center"><input type="color" name="${key}" value="${esc(value || '#0f9b8e')}"><span class="muted small">اختر لونًا يناسب هوية العيادة</span></div>`);
    case 'days': {
      const set = String(value || '').split(',').filter((x) => x !== '').map(Number);
      return wrap(`<div class="days">${DAY_NAMES.map((d, i) => `<label><input type="checkbox" value="${i}" ${set.includes(i) ? 'checked' : ''} hidden>${d}</label>`).join('')}</div>`);
    }
    case 'image':
    case 'video':
    case 'images':
      return wrap(`<div class="media-field"><div class="media-preview"></div><div class="media-actions">
        <label class="btn btn-soft btn-sm">${icon(type === 'video' ? 'video' : 'image')} ${type === 'images' ? 'إضافة صور' : 'رفع ملف'}<input type="file" hidden ${type === 'images' ? 'multiple' : ''} accept="${type === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'}"></label>
        ${type === 'images' ? '' : `<input type="text" dir="ltr" class="url-in" placeholder="${type === 'video' ? 'أو رابط YouTube / رابط فيديو' : 'أو رابط صورة'}">`}
      </div><div class="progress" hidden><span></span></div></div>`);
    case 'icon':
      return wrap(`<div class="icon-pick">${ICON_NAMES.map((n) => `<button type="button" data-icon="${n}" class="${value === n ? 'on' : ''}">${icon(n)}</button>`).join('')}</div>`);
    case 'rating':
      return wrap(`<div class="rating-pick">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-r="${n}">${icon('star')}</button>`).join('')}</div>`);
    case 'url':
      return wrap(`<input type="url" name="${key}" dir="ltr" value="${esc(value)}" placeholder="https://">`);
    default:
      return wrap(`<input type="text" name="${key}" value="${esc(value)}"${phAttr} ${key === 'whatsapp' ? 'dir="ltr" inputmode="tel"' : 'dir="auto"'}${cls === 'datalist' ? ` list="dl-${key}"` : ''}>`);
  }
}

// Makes the rendered fields interactive and returns a getter for their values.
function wireFields(root, values) {
  const getters = {};
  $$('.field[data-key]', root).forEach((f) => {
    const key = f.dataset.key;
    const type = f.dataset.type;
    if (type === 'bool') getters[key] = () => $('input', f).checked;
    else if (type === 'days' || type === 'langs') getters[key] = () => $$('input:checked', f).map((i) => i.value).join(',');
    else if (type === 'icon') {
      let cur = values[key] || 'tooth';
      $$('[data-icon]', f).forEach((b) => (b.onclick = () => { cur = b.dataset.icon; $$('[data-icon]', f).forEach((x) => x.classList.toggle('on', x === b)); }));
      getters[key] = () => cur;
    } else if (type === 'rating') {
      let cur = Number(values[key]) || 5;
      const paint = () => $$('[data-r]', f).forEach((b) => b.classList.toggle('on', Number(b.dataset.r) <= cur));
      $$('[data-r]', f).forEach((b) => (b.onclick = () => { cur = Number(b.dataset.r); paint(); }));
      paint();
      getters[key] = () => cur;
    } else if (type === 'image' || type === 'video' || type === 'images') {
      let list = type === 'images' ? lines(values[key]) : values[key] ? [values[key]] : [];
      const prev = $('.media-preview', f);
      const urlIn = $('.url-in', f);
      const paint = () => {
        prev.innerHTML = list.map((u, i) => {
          const media = type === 'video' || isVideo(u)
            ? (u.startsWith('/uploads/') || isVideo(u) ? `<video src="${esc(u)}" muted preload="metadata"></video>` : `<span class="small" style="padding:.5rem;word-break:break-all">${icon('video')} ${esc(u)}</span>`)
            : `<img src="${esc(u)}" alt="">`;
          return `<div class="mp ${type === 'images' ? '' : 'wide'}">${media}<button type="button" data-rm="${i}" title="إزالة">${icon('close')}</button></div>`;
        }).join('');
        $$('[data-rm]', prev).forEach((b) => (b.onclick = () => { list.splice(Number(b.dataset.rm), 1); paint(); }));
        if (urlIn) urlIn.value = list[0] && !list[0].startsWith('/uploads/') ? list[0] : '';
      };
      paint();
      urlIn?.addEventListener('change', () => { list = urlIn.value.trim() ? [urlIn.value.trim()] : []; paint(); });
      const input = $('input[type=file]', f);
      const bar = $('.progress', f);
      input.onchange = async () => {
        const files = [...input.files];
        input.value = '';
        for (const file of files) {
          bar.hidden = false;
          try {
            const { url } = await upload(file, (p) => ($('span', bar).style.width = Math.round(p * 100) + '%'));
            if (type === 'images') list.push(url);
            else list = [url];
            paint();
          } catch (e) { toast(e.message, 'error'); }
          bar.hidden = true;
          $('span', bar).style.width = '0';
        }
      };
      getters[key] = () => (type === 'images' ? list.join('\n') : list[0] || '');
    } else {
      const el = $('[name]', f);
      getters[key] = () => el.value;
    }
  });
  return () => Object.fromEntries(Object.entries(getters).map(([k, g]) => [k, g()]));
}

// Which fields can be translated (must match lib/i18n.js on the server).
const TRANSLATABLE = {
  settings: ['clinicName', 'doctorName', 'doctorTitle', 'heroBadge', 'heroTitle', 'heroSubtitle', 'stats', 'aboutTitle', 'aboutText', 'aboutHighlights',
    'servicesTitle', 'servicesSubtitle', 'portfolioTitle', 'portfolioSubtitle', 'testimonialsTitle', 'testimonialsSubtitle', 'faqTitle', 'bookingTitle',
    'bookingSubtitle', 'contactTitle', 'address', 'workingHours', 'bookingNote', 'chatPrice', 'chatIntro', 'footerText', 'seoDescription', 'privacyPolicy'],
  services: ['title', 'description', 'price'],
  portfolio: ['title', 'category', 'description'],
  testimonials: ['name', 'text'],
  faq: ['question', 'answer'],
  paymentMethods: ['name', 'instructions'],
};

const langTabsHtml = () => `<div class="lang-tabs">${Object.entries(LANG_LABELS).map(([l, n]) => `<button type="button" class="tab ${l === 'ar' ? 'active' : ''}" data-elang="${l}">${n}</button>`).join('')}</div>`;

// Form with language tabs. Arabic shows every field; English/German show only the texts to
// translate (with the Arabic text as a hint). Switching tabs keeps unsaved edits.
// Returns a function producing the save body: { ...arabicFields, i18n: { en: {...}, de: {...} } }.
function multiLangEditor(wrap, fields, record, trKeys) {
  const tabs = $('.lang-tabs', wrap);
  const grid = $('.form-grid', wrap);
  const drafts = {};
  let cur = 'ar';
  let get;
  const draw = () => {
    if (cur === 'ar') {
      const rec = { ...record, ...(drafts.ar || {}) };
      grid.innerHTML = fields.map((f) => fieldHtml(f, rec[f[0]])).join('');
      get = wireFields(grid, rec);
    } else {
      const vals = { ...(record.i18n?.[cur] || {}), ...(drafts[cur] || {}) };
      const base = { ...record, ...(drafts.ar || {}) };
      const tf = fields.filter((f) => trKeys.includes(f[0]));
      grid.innerHTML =
        `<p class="lang-note small">${icon('globe')} ترجمة إلى ${LANG_LABELS[cur]}. النص الرمادي داخل الحقل هو الأصل العربي. الحقول الفارغة تظهر للزائر بالعربية، والصور والإعدادات الأخرى مشتركة بين كل اللغات.</p>` +
        tf.map((f) => fieldHtml([f[0], f[1], f[2] === 'datalist' ? 'text' : f[2], f[3], ''], vals[f[0]] ?? '', base[f[0]] || '')).join('');
      get = wireFields(grid, vals);
    }
    $$('[data-elang]', tabs).forEach((b) => b.classList.toggle('active', b.dataset.elang === cur));
  };
  tabs.onclick = (e) => {
    const b = e.target.closest('[data-elang]');
    if (!b || b.dataset.elang === cur) return;
    drafts[cur] = get();
    cur = b.dataset.elang;
    draw();
  };
  draw();
  return () => {
    drafts[cur] = get();
    const body = { ...(drafts.ar || {}) };
    const i18n = {};
    for (const l of ['en', 'de']) if (drafts[l]) i18n[l] = drafts[l];
    if (Object.keys(i18n).length) body.i18n = i18n;
    return body;
  };
}

function viewSettings() {
  const s = state.data.settings;
  const g = SETTINGS_GROUPS[state.settingsGroup];
  $('#view').innerHTML = `
    <div class="settings-nav">${SETTINGS_GROUPS.map((x, i) => `<button class="tab ${i === state.settingsGroup ? 'active' : ''}" data-sg="${i}">${esc(x.title)}</button>`).join('')}</div>
    <form class="panel" id="settingsForm">
      <div class="panel-head"><h2>${esc(g.title)}</h2></div>
      ${g.fields.some((f) => TRANSLATABLE.settings.includes(f[0])) ? langTabsHtml() : ''}
      <div class="form-grid">${g.fields.map((f) => fieldHtml(f, s[f[0]])).join('')}</div>
      <div class="save-bar"><button class="btn btn-primary" type="submit">${icon('check')} حفظ التغييرات</button><a class="btn btn-light" href="/" target="_blank" rel="noopener">${icon('eye')} معاينة الموقع</a></div>
    </form>`;
  $$('[data-sg]').forEach((b) => (b.onclick = () => { state.settingsGroup = Number(b.dataset.sg); render(); }));
  const form = $('#settingsForm');
  const get = $('.lang-tabs', form) ? multiLangEditor(form, g.fields, s, TRANSLATABLE.settings) : wireFields(form, s);
  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const { settings } = await api('/admin/settings', { method: 'PUT', body: get() });
      state.data.settings = settings;
      applyBrand();
      toast('تم حفظ التغييرات ✓', 'ok');
      render();
    } catch (ex) { toast(ex.message, 'error'); }
  };
}

// ---------- content collections ----------
const COLLECTIONS = {
  services: {
    single: 'خدمة',
    fields: [['title', 'اسم الخدمة', 'text', 'full'], ['description', 'الوصف', 'textarea', 'full'], ['icon', 'الأيقونة', 'icon', 'full'], ['price', 'السعر (اختياري)', 'text', '', 'مثال: يبدأ من 50,000 د.ع'], ['image', 'صورة (اختياري)', 'image']],
    thumb: (x) => x.image, title: (x) => x.title, sub: (x) => x.description, ic: (x) => x.icon,
  },
  portfolio: {
    single: 'عمل',
    fields: [['title', 'عنوان الحالة', 'text'], ['category', 'التصنيف', 'datalist', '', 'مثل: تجميل، زراعة، تقويم'], ['description', 'الوصف', 'textarea', 'full'],
      ['before', 'صورة قبل', 'image'], ['after', 'صورة بعد', 'image'], ['images', 'صور إضافية', 'images', 'full'], ['video', 'فيديو', 'video', 'full', 'ارفع فيديو (حتى 200MB) أو ضع رابط YouTube']],
    thumb: (x) => x.after || x.before || lines(x.images)[0], title: (x) => x.title, sub: (x) => [x.category, x.video ? '🎬 فيديو' : ''].filter(Boolean).join(' · '),
  },
  testimonials: {
    single: 'رأي',
    fields: [['name', 'اسم المريض', 'text'], ['rating', 'التقييم', 'rating'], ['text', 'الرأي', 'textarea', 'full'], ['photo', 'صورة (اختياري)', 'image']],
    thumb: (x) => x.photo, title: (x) => x.name, sub: (x) => '★'.repeat(Number(x.rating) || 5) + ' ' + x.text, compact: true,
  },
  faq: {
    single: 'سؤال',
    fields: [['question', 'السؤال', 'text', 'full'], ['answer', 'الإجابة', 'textarea', 'full']],
    title: (x) => x.question, sub: (x) => x.answer, compact: true,
  },
  paymentMethods: {
    single: 'طريقة دفع',
    fields: [['name', 'اسم الطريقة', 'text', '', 'مثل: زين كاش، آسيا حوالة، تحويل بنكي'], ['details', 'رقم المحفظة / الحساب', 'text'], ['instructions', 'تعليمات للمريض', 'textarea', 'full'], ['enabled', 'مفعّلة', 'bool', 'full']],
    title: (x) => x.name + (x.enabled === false ? ' (معطّلة)' : ''), sub: (x) => [x.details, x.instructions].filter(Boolean).join(' — '), compact: true,
  },
};

function viewCollection(col) {
  const cfg = COLLECTIONS[col];
  const list = state.data[col];
  $('#view').innerHTML = `
    <div class="toolbar"><button class="btn btn-primary" id="addItem">${icon('plus')} إضافة ${cfg.single}</button><span class="muted small">${list.length} عنصر — استخدم الأسهم لتغيير ترتيب الظهور في الموقع</span></div>
    ${list.length ? `<div class="items">${list.map((x, i) => {
      const t = cfg.thumb?.(x);
      return `<div class="item ${cfg.compact && !t ? 'compact' : ''}">
        <div class="item-thumb">${t ? (isVideo(t) ? `<video src="${esc(t)}" muted></video>` : `<img src="${esc(t)}" alt="" loading="lazy">`) : icon(cfg.ic?.(x) || 'image')}</div>
        <div class="item-body"><h3>${esc(cfg.title(x))}</h3><p>${esc(cfg.sub?.(x) || '')}</p></div>
        <div class="item-foot">
          <button class="btn btn-soft btn-sm" data-edit="${x.id}">${icon('edit')} تعديل</button>
          <span class="grow"></span>
          <button class="icon-btn" data-up="${i}" ${i === 0 ? 'disabled' : ''} title="تقديم">${icon('up')}</button>
          <button class="icon-btn" data-down="${i}" ${i === list.length - 1 ? 'disabled' : ''} title="تأخير">${icon('down')}</button>
          <button class="icon-btn danger" data-del="${x.id}" title="حذف">${icon('trash')}</button>
        </div>
      </div>`;
    }).join('')}</div>` : `<div class="panel empty">لا توجد عناصر بعد</div>`}`;
  $('#addItem').onclick = () => editItem(col, null);
  $$('[data-edit]').forEach((b) => (b.onclick = () => editItem(col, b.dataset.edit)));
  $$('[data-del]').forEach((b) =>
    (b.onclick = async () => {
      if (!(await confirmBox(`حذف ${cfg.single}؟`, 'حذف'))) return;
      try {
        await api(`/admin/${col}/${b.dataset.del}`, { method: 'DELETE' });
        state.data[col] = list.filter((x) => x.id !== b.dataset.del);
        toast('تم الحذف', 'ok');
        render();
      } catch (e) { toast(e.message, 'error'); }
    })
  );
  const move = async (i, d) => {
    const arr = [...list];
    [arr[i], arr[i + d]] = [arr[i + d], arr[i]];
    try {
      await api(`/admin/${col}/order`, { method: 'PUT', body: { ids: arr.map((x) => x.id) } });
      state.data[col] = arr;
      render();
    } catch (e) { toast(e.message, 'error'); }
  };
  $$('[data-up]').forEach((b) => (b.onclick = () => move(Number(b.dataset.up), -1)));
  $$('[data-down]').forEach((b) => (b.onclick = () => move(Number(b.dataset.down), 1)));
}

function editItem(col, id) {
  const cfg = COLLECTIONS[col];
  const item = id ? state.data[col].find((x) => x.id === id) : { enabled: true, rating: 5, icon: 'tooth' };
  const cats = col === 'portfolio'
    ? [...new Set(state.data.portfolio.flatMap((x) => [x.category, x.i18n?.en?.category, x.i18n?.de?.category]).filter(Boolean))]
    : [];
  const fields = cfg.fields.map((f) => (f[2] === 'datalist' ? [f[0], f[1], 'text', 'datalist', f[4]] : f));
  const card = openModal(`
    <form id="itemForm">
      <div class="modal-head"><h2>${id ? 'تعديل' : 'إضافة'} ${cfg.single}</h2><button type="button" class="icon-btn" data-close>${icon('close')}</button></div>
      ${langTabsHtml()}
      <div class="form-grid"></div>
      ${cats.length ? `<datalist id="dl-category">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>` : ''}
      <div class="modal-foot"><button class="btn btn-primary" type="submit">${icon('check')} حفظ</button><button class="btn btn-light" type="button" data-close>إلغاء</button></div>
    </form>`);
  const get = multiLangEditor($('#itemForm', card), fields, item, TRANSLATABLE[col]);
  $('#itemForm', card).onsubmit = async (e) => {
    e.preventDefault();
    const body = get();
    const first = cfg.fields[0][0];
    if (!String(body[first] || '').trim()) return toast('يرجى تعبئة الحقل: ' + cfg.fields[0][1], 'error');
    try {
      const { item: saved } = await api(`/admin/${col}${id ? '/' + id : ''}`, { method: id ? 'PUT' : 'POST', body });
      if (id) Object.assign(item, saved);
      else state.data[col].push(saved);
      closeModal();
      toast('تم الحفظ ✓', 'ok');
      render();
    } catch (ex) { toast(ex.message, 'error'); }
  };
}

// ---------- users & account ----------
function viewUsers() {
  const users = state.data.users;
  $('#view').innerHTML = `
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h2>حسابات لوحة التحكم</h2></div>
        ${users.map((u) => `<div class="user-row"><span class="av">${esc(u.name.charAt(0))}</span><div><b>${esc(u.name)}</b><div class="muted small ltr">${esc(u.username)}</div></div><span class="status ${u.role === 'admin' ? 'st-approved' : 'st-done'}">${u.role === 'admin' ? 'الطبيبة (كامل الصلاحيات)' : 'مساعد'}</span>${u.id !== state.user.id ? `<button class="icon-btn" data-ureset="${u.id}" title="تعيين كلمة مرور جديدة">${icon('key')}</button><button class="icon-btn danger" data-udel="${u.id}" title="حذف">${icon('trash')}</button>` : ''}</div>`).join('')}
        <p class="muted small">${icon('key')} إذا نسي أحد المساعدين كلمة المرور، اضغط على أيقونة المفتاح بجانبه وعيّن له كلمة مؤقتة. سيُطلب منه تغييرها عند الدخول.</p>
      </div>
      <form class="panel" id="userForm">
        <div class="panel-head"><h2>إضافة مستخدم</h2></div>
        <p class="muted small">المساعد يستطيع إدارة الحجوزات وتأكيد الدفع وفتح المحادثات والرد على المرضى، ولا يستطيع تعديل محتوى الموقع.</p>
        <label class="field"><span>الاسم الظاهر</span><input name="name" required></label>
        <label class="field"><span>اسم المستخدم (إنجليزي)</span><input name="username" dir="ltr" required></label>
        <label class="field"><span>كلمة المرور</span><input name="password" type="text" dir="ltr" required minlength="8"></label>
        <label class="field"><span>الصلاحية</span><select name="role"><option value="assistant">مساعد</option><option value="admin">مدير (كامل الصلاحيات)</option></select></label>
        <button class="btn btn-primary" type="submit">${icon('plus')} إضافة</button>
      </form>
    </div>`;
  $('#userForm').onsubmit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try {
      const { user } = await api('/admin/users', { method: 'POST', body });
      state.data.users.push(user);
      toast('تمت إضافة المستخدم ✓', 'ok');
      render();
    } catch (ex) { toast(ex.message, 'error'); }
  };
  $$('[data-ureset]').forEach((b) =>
    (b.onclick = async () => {
      const u = state.data.users.find((x) => x.id === b.dataset.ureset);
      const pass = await promptBox(`كلمة مرور مؤقتة لـ ${u.name}`, 'كلمة المرور المؤقتة (8 أحرف على الأقل) — أرسلها له، وسيُطلب منه تغييرها', '');
      if (pass === null) return;
      try {
        await api(`/admin/users/${u.id}/password`, { method: 'PUT', body: { password: pass.trim() } });
        toast('تم تعيين كلمة المرور المؤقتة ✓', 'ok');
      } catch (ex) { toast(ex.message, 'error'); }
    })
  );
  $$('[data-udel]').forEach((b) =>
    (b.onclick = async () => {
      if (!(await confirmBox('حذف هذا المستخدم؟', 'حذف'))) return;
      try {
        await api('/admin/users/' + b.dataset.udel, { method: 'DELETE' });
        state.data.users = state.data.users.filter((u) => u.id !== b.dataset.udel);
        render();
      } catch (ex) { toast(ex.message, 'error'); }
    })
  );
}

function viewAccount() {
  $('#view').innerHTML = `
    <form class="panel" id="passForm" style="max-width:480px">
      <div class="panel-head"><h2>تغيير كلمة المرور</h2></div>
      <label class="field"><span>كلمة المرور الحالية</span><input name="current" type="password" dir="ltr" required autocomplete="current-password"></label>
      <label class="field"><span>كلمة المرور الجديدة</span><input name="next" type="password" dir="ltr" required minlength="8" autocomplete="new-password"></label>
      <button class="btn btn-primary" type="submit">حفظ</button>
    </form>
    <div class="panel" style="max-width:480px">
      <div class="panel-head"><h2>${icon('key')} رمز استعادة كلمة المرور</h2></div>
      <p>${state.user.hasRecovery ? '✅ لديك رمز استعادة. إذا فقدته أنشئ رمزًا جديدًا (القديم سيتوقف).' : '⚠️ لا يوجد رمز استعادة. أنشئه الآن حتى تستطيع الدخول إذا نسيت كلمة المرور.'}</p>
      <button class="btn btn-soft" id="newRecovery" type="button">${icon('key')} إنشاء رمز استعادة جديد</button>
    </div>`;
  $('#newRecovery').onclick = async () => {
    const pass = await promptBox('تأكيد الهوية', 'أدخل كلمة المرور الحالية', '');
    if (pass === null) return;
    try {
      const out = await api('/admin/recovery-code', { method: 'POST', body: { password: pass } });
      state.user = out.user;
      showRecoveryCode(out.recoveryCode, render);
    } catch (ex) { toast(ex.message, 'error'); }
  };
  $('#passForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const out = await api('/admin/password', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) });
      state.token = out.token;
      try { localStorage.setItem(TOKEN_KEY, out.token); } catch {}
      state.user = out.user;
      e.target.reset();
      toast('تم تغيير كلمة المرور ✓', 'ok');
      socket?.close();
      socket = null;
      connectSocket();
      showRecoveryCode(out.recoveryCode, render);
    } catch (ex) { toast(ex.message, 'error'); }
  };
}

// ---------- backups ----------
const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

async function downloadBackup(name) {
  try {
    const { url } = await api('/admin/backups/link', { method: 'POST', body: { name } });
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) { toast(e.message, 'error'); }
}

async function viewBackups() {
  $('#view').innerHTML = '<div class="panel empty">جارِ التحميل…</div>';
  let list = [];
  try { list = (await api('/admin/backups')).backups; } catch (e) { toast(e.message, 'error'); }
  if (state.view !== 'backups') return;
  $('#view').innerHTML = `
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h2>${icon('shield')} النسخ التلقائية اليومية</h2><button class="btn btn-sm btn-soft" id="backupNow">${icon('plus')} إنشاء نسخة الآن</button></div>
        <p class="muted small">يحفظ الموقع تلقائيًا كل يوم نسخة من: الحجوزات، المحادثات، كل النصوص والإعدادات، الحسابات، وإيصالات الدفع. يحتفظ بآخر 14 يومًا ويحذف الأقدم.</p>
        ${list.length ? list.map((b) => `<div class="backup-row"><div><b>${esc(b.date)}</b><div class="muted small"><span class="ltr">${fmtSize(b.size)}</span></div></div><button class="btn btn-sm btn-light" data-dl="${esc(b.name)}">${icon('download')} تنزيل</button></div>`).join('') : '<p class="empty">لا توجد نسخ بعد</p>'}
      </div>
      <div class="panel">
        <div class="panel-head"><h2>${icon('download')} نسخة كاملة</h2></div>
        <p>تشمل كل ما سبق <b>بالإضافة إلى كل الصور والفيديوهات</b> المرفوعة. قد يكون حجمها كبيرًا.</p>
        <button class="btn btn-primary" id="fullBackup">${icon('download')} تنزيل نسخة كاملة</button>
        <div class="alert warn" style="margin-top:1.2rem">${icon('shield')} <span>النسخ اليومية محفوظة على نفس السيرفر. للأمان، نزّل نسخة كاملة مرة في الأسبوع واحفظها خارجه (Google Drive أو جهازك).</span></div>
        <p class="muted small">الملفات بصيغة <span class="ltr">.tar.gz</span> وتُفتح ببرنامج 7-Zip أو WinRAR. لاسترجاع نسخة: فك الضغط وضع مجلدي <span class="ltr">data</span> و<span class="ltr">uploads</span> مكان الموجودين في مجلد الموقع، ثم أعد تشغيله.</p>
      </div>
    </div>`;
  $$('[data-dl]').forEach((b) => (b.onclick = () => downloadBackup(b.dataset.dl)));
  $('#fullBackup').onclick = () => downloadBackup('full');
  $('#backupNow').onclick = async (e) => {
    e.target.disabled = true;
    try {
      await api('/admin/backups', { method: 'POST' });
      toast('تم إنشاء النسخة ✓', 'ok');
      viewBackups();
    } catch (ex) {
      toast(ex.message, 'error');
      e.target.disabled = false;
    }
  };
}

// ---------- realtime ----------
function connectSocket() {
  if (socket || !window.io) return;
  socket = window.io({ auth: { staffToken: state.token } });
  socket.on('booking:new', (b) => {
    state.data.bookings.unshift(b);
    notify('حجز جديد', `${b.name} — ${b.date} ${b.time}`);
    if (['dashboard', 'bookings'].includes(state.view)) render();
    else renderNav();
  });
  socket.on('booking:update', (b) => {
    const x = state.data.bookings.find((y) => y.id === b.id);
    if (x) Object.assign(x, b);
    renderNav();
  });
  socket.on('booking:delete', (id) => {
    state.data.bookings = state.data.bookings.filter((x) => x.id !== id);
    renderNav();
  });
  socket.on('chat:update', (c) => {
    const isNew = !state.data.chats.some((x) => x.id === c.id);
    upsertChat(c);
    if (isNew) notify('طلب دردشة جديد', `${c.name} — ${c.paymentMethod || ''}`);
    if (state.activeChat?.id === c.id) Object.assign(state.activeChat, c);
    if (['dashboard', 'chats'].includes(state.view)) render();
    else renderNav();
  });
  socket.on('chat:delete', (id) => {
    state.data.chats = state.data.chats.filter((x) => x.id !== id);
    if (state.activeChat?.id === id) state.activeChat = null;
    if (state.view === 'chats') render();
  });
  socket.on('chat:message', ({ chatId, message, summary }) => {
    const viewing = state.view === 'chats' && state.activeChat?.id === chatId;
    if (viewing) {
      if (!state.activeChat.messages.some((m) => m.id === message.id)) {
        state.activeChat.messages.push(message);
        appendPaneMsg(message);
      }
      summary.unreadStaff = 0;
      socket.emit('staff:read', chatId);
    } else if (message.from === 'patient') {
      notify('رسالة جديدة', `${summary.name}: ${message.text || 'صورة'}`);
    }
    upsertChat(summary);
    if (state.view === 'chats') {
      const items = $('.chat-items');
      if (items) {
        const list = state.data.chats.filter((c) => state.chatFilter === 'all' || c.status === state.chatFilter).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
        items.innerHTML = list.map(chatItem).join('');
        $$('[data-chat]', items).forEach((b) => (b.onclick = () => openChat(b.dataset.chat)));
      }
    }
    renderNav();
  });
  socket.on('chat:typing', (chatId) => {
    if (state.activeChat?.id !== chatId) return;
    const t = $('#typing');
    if (!t) return;
    t.textContent = 'المريض يكتب…';
    clearTimeout(t.timer);
    t.timer = setTimeout(() => (t.textContent = ''), 2500);
  });
  socket.on('connect_error', (e) => e.message === 'unauthorized' && logout());
}

function applyBrand() {
  const s = state.data.settings;
  document.documentElement.style.setProperty('--primary', s.primaryColor || '#0f9b8e');
  $('#sideClinic').textContent = s.clinicName;
}

// ---------- boot ----------
async function start() {
  if (!state.token) return showLogin();
  try {
    const { user } = await api('/admin/me');
    if (user.defaultPassword) return showForceChange();
    state.data = await api('/admin/data');
  } catch (e) {
    if (e.code === 'PASSWORD_CHANGE_REQUIRED') return showForceChange();
    return showLogin();
  }
  state.user = state.data.user;
  $('#login').hidden = true;
  $('#app').hidden = false;
  $('#menuBtn').innerHTML = icon('menu');
  $('#viewSite').innerHTML = `${icon('eye')}<span>عرض الموقع</span>`;
  $('#logoutBtn').innerHTML = `${icon('logout')}<span>تسجيل الخروج</span>`;
  $('#userChip').innerHTML = `<span class="av">${esc(state.user.name.charAt(0))}</span><div><b>${esc(state.user.name)}</b><small>${state.user.role === 'admin' ? 'الطبيبة' : 'مساعد'}</small></div>`;
  const nb = $('#notifyBtn');
  nb.innerHTML = icon('bell');
  nb.hidden = !('Notification' in window) || Notification.permission !== 'default';
  nb.onclick = async () => {
    await Notification.requestPermission();
    nb.hidden = true;
  };
  nb.title = 'تفعيل إشعارات المتصفح للحجوزات والرسائل الجديدة';
  applyBrand();
  const hash = location.hash.slice(1);
  const allowed = VIEWS.find((v) => v.id === hash && (!v.admin || isAdmin()));
  state.view = allowed ? hash : 'dashboard';
  render();
  connectSocket();
}

start();
