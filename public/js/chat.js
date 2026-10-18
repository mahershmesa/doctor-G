// Patient-side live chat. The chat stays locked until the clinic confirms payment
// from the dashboard; then it unlocks instantly (pushed over Socket.io).

import { icon, esc } from './icons.js';

const $ = (s, root = document) => root.querySelector(s);
const KEY = 'dg_chat_token';

const store = {
  get() { try { return localStorage.getItem(KEY); } catch { return null; } },
  set(v) { try { localStorage.setItem(KEY, v); } catch {} },
  clear() { try { localStorage.removeItem(KEY); } catch {} },
};

let ctx;
let token = store.get();
let chat = null;
let socket = null;
let typingTimer;
let lastRequest = null; // whatsapp + message to notify clinic

const panel = () => $('#chatPanel');
const body = () => $('#chatBody');
const fileUrl = (u) => (u && u.startsWith('/api/files/') ? `${u}?t=${encodeURIComponent(token)}` : u);
const timeFmt = (iso) => new Date(iso).toLocaleTimeString('ar-u-nu-latn', { hour: 'numeric', minute: '2-digit' });

export function initChat(c) {
  ctx = c;
  $('#chatClose').innerHTML = icon('close');
  $('#fabChat').addEventListener('click', toggle);
  $('#heroChat').addEventListener('click', open);
  $('#chatClose').addEventListener('click', close);
  refresh();
  if (token) loadSession(false);
}

export function refresh() {
  const s = ctx.getContent().settings;
  $('#chatAvatar').innerHTML = s.doctorPhoto ? `<img src="${esc(s.doctorPhoto)}" alt="">` : icon('tooth');
  if (!token && panel().classList.contains('open')) renderGate();
}

function open() {
  panel().classList.add('open');
  panel().setAttribute('aria-hidden', 'false');
  $('#fabChat .fab-dot')?.setAttribute('hidden', '');
  if (token) loadSession(true);
  else renderGate();
}
function close() {
  panel().classList.remove('open');
  panel().setAttribute('aria-hidden', 'true');
}
function toggle() {
  panel().classList.contains('open') ? close() : open();
}
function notifyDot() {
  if (!panel().classList.contains('open')) $('#fabChat .fab-dot')?.removeAttribute('hidden');
}

function setStatusText(text, online = false) {
  const el = $('#chatStatusText');
  el.textContent = text;
  el.classList.toggle('online', online);
}

async function loadSession(render) {
  try {
    const res = await fetch('/api/chat/session', { headers: { 'x-chat-token': token } });
    if (res.status === 404) {
      store.clear();
      token = null;
      if (render) renderGate();
      return;
    }
    chat = (await res.json()).chat;
    connect();
    if (render) renderState();
    else if (chat.status === 'approved') setStatusText('متصل', true);
  } catch {
    if (render) body().innerHTML = `<div class="status-box"><p>تعذر الاتصال، حاول مجددًا.</p></div>`;
  }
}

function connect() {
  if (socket || !window.io || !token) return;
  socket = window.io({ auth: { chatToken: token } });
  socket.on('chat:message', (m) => {
    if (!chat || chat.messages.some((x) => x.id === m.id)) return;
    chat.messages.push(m);
    if (chat.status === 'approved' || chat.status === 'closed') appendMessage(m);
    if (m.from === 'staff') notifyDot();
  });
  socket.on('chat:status', ({ status, staffNote }) => {
    if (!chat) return;
    const was = chat.status;
    chat.status = status;
    chat.staffNote = staffNote;
    if (panel().classList.contains('open')) renderState();
    if (was !== 'approved' && status === 'approved') {
      ctx.toast('تم تأكيد الدفع وفتح المحادثة مع الطبيب ✓');
      notifyDot();
    }
  });
  socket.on('chat:typing', () => {
    const el = $('#typing');
    if (!el) return;
    el.textContent = 'الطبيب يكتب…';
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => (el.textContent = ''), 2500);
  });
  socket.on('connect_error', () => {});
}

function reset() {
  store.clear();
  token = null;
  chat = null;
  socket?.close();
  socket = null;
  renderGate();
}

// ---------- states ----------
function renderGate() {
  const content = ctx.getContent();
  const s = content.settings;
  setStatusText('استشارة خاصة مدفوعة');
  if (!s.chatEnabled) {
    body().innerHTML = `<div class="status-box"><p>الدردشة غير متاحة حاليًا. يمكنك التواصل عبر واتساب.</p></div>`;
    return;
  }
  const pays = content.paymentMethods;
  body().innerHTML = `
    <form class="chat-gate" id="gateForm" novalidate>
      <div class="gate-hero">
        <div class="gate-lock">${icon('lock')}</div>
        <h3>الدردشة المباشرة مع الطبيب</h3>
        <p>${esc(s.chatIntro || '')}</p>
        ${s.chatPrice ? `<span class="gate-price">رسوم الاستشارة: ${esc(s.chatPrice)}</span>` : ''}
      </div>
      <ol class="steps">
        <li>ادفع رسوم الاستشارة بإحدى طرق الدفع</li>
        <li>أرسل الطلب مع صورة إيصال الدفع</li>
        <li>بعد تأكيد العيادة تُفتح المحادثة فورًا</li>
      </ol>
      <label class="field"><span>الاسم *</span><input name="name" required maxlength="100" autocomplete="name"></label>
      <label class="field"><span>رقم الهاتف / واتساب *</span><input name="phone" required inputmode="tel" dir="ltr" maxlength="30" autocomplete="tel"></label>
      <div class="field"><span>طريقة الدفع</span>
        <select name="paymentMethod" id="gatePay">${pays.map((p) => `<option>${esc(p.name)}</option>`).join('')}</select>
        <div class="pay-detail" id="gatePayDetail"></div>
      </div>
      <label class="file-drop" id="receiptDrop">${icon('image')}<span>إرفاق صورة إيصال الدفع (اختياري)</span><input type="file" name="receipt" accept="image/*"></label>
      <label class="field" style="margin-top:.75rem"><span>نبذة عن حالتك</span><textarea name="note" rows="2" maxlength="1000"></textarea></label>
      <button class="btn btn-primary btn-block" type="submit">${icon('send')} إرسال طلب فتح المحادثة</button>
      <p class="form-error" id="gateError"></p>
    </form>`;
  const showPay = () => {
    const p = pays.find((x) => x.name === $('#gatePay').value);
    const box = $('#gatePayDetail');
    box.hidden = !p || (!p.details && !p.instructions);
    if (p) box.innerHTML = `${p.details ? `<b>${esc(p.details)}</b><br>` : ''}${esc(p.instructions || '')}`;
  };
  $('#gatePay').onchange = showPay;
  showPay();
  const fileInput = $('#receiptDrop input');
  fileInput.onchange = () => {
    const f = fileInput.files[0];
    $('#receiptDrop').classList.toggle('has', !!f);
    $('#receiptDrop span').textContent = f ? f.name : 'إرفاق صورة إيصال الدفع (اختياري)';
  };
  $('#gateForm').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const err = $('#gateError');
    err.textContent = '';
    if (!form.name.value.trim() || !/^[+\d\s()-]{6,30}$/.test(form.phone.value.trim())) {
      err.textContent = 'يرجى إدخال الاسم ورقم هاتف صحيح';
      return;
    }
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const res = await fetch('/api/chat/request', { method: 'POST', body: new FormData(form) });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'حدث خطأ');
      token = out.token;
      store.set(token);
      chat = out.chat;
      lastRequest = out;
      connect();
      renderState();
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false;
    }
  };
}

function renderState() {
  if (!chat) return renderGate();
  const st = chat.status;
  if (st === 'pending') {
    setStatusText('بانتظار تأكيد الدفع');
    const req = lastRequest || {
      whatsapp: String(ctx.getContent().settings.whatsapp || '').replace(/\D/g, ''),
      message: `مرحبًا، أرسلت طلب استشارة مباشرة عبر الموقع باسم ${chat.name}. يرجى تأكيد الدفع وفتح المحادثة.`,
    };
    const wa = req.whatsapp
      ? `<a class="btn btn-whatsapp" target="_blank" rel="noopener" href="https://wa.me/${esc(req.whatsapp)}?text=${encodeURIComponent(req.message)}">${icon('whatsapp')} إبلاغ العيادة عبر واتساب</a>`
      : '';
    body().innerHTML = `
      <div class="status-box">
        <div class="ring-loader"></div>
        <h3>طلبك قيد المراجعة</h3>
        <p>سيقوم الطبيب أو المساعد بتأكيد الدفع وفتح المحادثة لك. ستُفتح هنا تلقائيًا فور الموافقة.</p>
        ${wa}
        <p style="margin-top:1rem"><button class="btn btn-soft" type="button" id="cancelReq">إلغاء الطلب</button></p>
      </div>`;
    $('#cancelReq').onclick = reset;
    return;
  }
  if (st === 'rejected') {
    setStatusText('لم يتم تأكيد الطلب');
    body().innerHTML = `
      <div class="status-box">
        <div class="status-icon">${icon('close')}</div>
        <h3>لم يتم تأكيد الدفع</h3>
        ${chat.staffNote ? `<div class="staff-note">${esc(chat.staffNote)}</div>` : '<p>يرجى التأكد من الدفع والمحاولة مجددًا أو التواصل عبر واتساب.</p>'}
        <button class="btn btn-primary" type="button" id="newReq">إرسال طلب جديد</button>
      </div>`;
    $('#newReq').onclick = reset;
    return;
  }
  // approved / closed
  const closed = st === 'closed';
  setStatusText(closed ? 'انتهت المحادثة' : 'متصل — المحادثة مفتوحة', !closed);
  body().innerHTML = `
    <div class="chat-scroll" id="chatScroll">
      <div class="msg system"><div class="bubble">${icon('unlock')} تم فتح المحادثة. مرحبًا ${esc(chat.name)}، اكتب سؤالك للطبيب.</div></div>
    </div>
    <div class="typing" id="typing"></div>
    ${closed
      ? `<div class="status-box" style="padding:1rem;margin:0"><p>أُغلقت هذه المحادثة من قبل العيادة.</p><button class="btn btn-primary" id="newReq" type="button">طلب استشارة جديدة</button></div>`
      : `<form class="chat-input" id="chatForm">
          <label class="round attach" title="إرسال صورة">${icon('image')}<input type="file" accept="image/*" hidden id="chatFile"></label>
          <textarea rows="1" id="chatText" placeholder="اكتب رسالتك…" maxlength="4000"></textarea>
          <button class="round send" type="submit" aria-label="إرسال">${icon('send')}</button>
        </form>`}`;
  chat.messages.forEach((m) => appendMessage(m, false));
  scrollDown();
  if (closed) {
    $('#newReq').onclick = reset;
    return;
  }
  const ta = $('#chatText');
  ta.addEventListener('input', () => {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    socket?.emit('patient:typing');
  });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !matchMedia('(pointer: coarse)').matches) {
      e.preventDefault();
      $('#chatForm').requestSubmit();
    }
  });
  $('#chatForm').onsubmit = (e) => {
    e.preventDefault();
    const text = ta.value.trim();
    if (!text || !socket) return;
    socket.emit('patient:message', { text });
    ta.value = '';
    ta.style.height = 'auto';
    ta.focus();
  };
  $('#chatFile').onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const fd = new FormData();
    fd.append('image', f);
    ctx.toast('جارِ رفع الصورة…');
    const res = await fetch('/api/chat/upload', { method: 'POST', headers: { 'x-chat-token': token }, body: fd });
    if (!res.ok) ctx.toast((await res.json().catch(() => ({}))).error || 'فشل رفع الصورة', 'error');
  };
}

function appendMessage(m, scroll = true) {
  const box = $('#chatScroll');
  if (!box) return;
  const mine = m.from === 'patient';
  const el = document.createElement('div');
  el.className = `msg ${mine ? 'me' : 'them'}`;
  el.innerHTML = `<div class="bubble">${m.image ? `<img src="${esc(fileUrl(m.image))}" alt="صورة" loading="lazy">` : ''}${esc(m.text)}</div><time>${!mine && m.staffName ? esc(m.staffName) + ' · ' : ''}${timeFmt(m.at)}</time>`;
  const img = el.querySelector('img');
  if (img) img.onclick = () => window.open(img.src, '_blank');
  box.appendChild(el);
  if (scroll) scrollDown();
}
function scrollDown() {
  const box = $('#chatScroll');
  if (box) box.scrollTop = box.scrollHeight;
}
