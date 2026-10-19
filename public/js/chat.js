// Patient-side live chat. The chat stays locked until the clinic confirms payment
// from the dashboard; then it unlocks instantly (pushed over Socket.io).

import { icon, esc } from './icons.js';
import { t, lang, locale } from './i18n.js';

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
const fileUrl = (u) => u; // links arrive signed from the server
const timeFmt = (iso) => new Date(iso).toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });

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
  // Re-draw in the newly selected language.
  if (panel().classList.contains('open')) chat ? renderState() : renderGate();
  else if (chat?.status === 'approved') setStatusText(t('online'), true);
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
    else if (chat.status === 'approved') setStatusText(t('online'), true);
  } catch {
    if (render) body().innerHTML = `<div class="status-box"><p>${esc(t('conn_error'))}</p></div>`;
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
      ctx.toast(t('approved_toast'));
      notifyDot();
    }
  });
  socket.on('chat:typing', () => {
    const el = $('#typing');
    if (!el) return;
    el.textContent = t('typing');
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
  setStatusText(t('chat_paid'));
  if (!s.chatEnabled) {
    body().innerHTML = `<div class="status-box"><p>${esc(t('chat_off'))}</p></div>`;
    return;
  }
  const pays = content.paymentMethods;
  body().innerHTML = `
    <form class="chat-gate" id="gateForm" novalidate>
      <div class="gate-hero">
        <div class="gate-lock">${icon('lock')}</div>
        <h3>${esc(t('chat_title'))}</h3>
        <p>${esc(s.chatIntro || '')}</p>
        ${s.chatPrice ? `<span class="gate-price">${esc(t('chat_fee'))} ${esc(s.chatPrice)}</span>` : ''}
      </div>
      <ol class="steps">
        <li>${esc(t('step1'))}</li>
        <li>${esc(t('step2'))}</li>
        <li>${esc(t('step3'))}</li>
      </ol>
      <label class="field"><span>${esc(t('c_name'))}</span><input name="name" required maxlength="100" autocomplete="name"></label>
      <label class="field"><span>${esc(t('c_phone'))}</span><input name="phone" required inputmode="tel" dir="ltr" maxlength="30" autocomplete="tel"></label>
      <div class="field"><span>${esc(t('f_pay'))}</span>
        <select name="paymentMethod" id="gatePay">${pays.map((p) => `<option>${esc(p.name)}</option>`).join('')}</select>
        <div class="pay-detail" id="gatePayDetail"></div>
      </div>
      <label class="file-drop" id="receiptDrop">${icon('image')}<span>${esc(t('c_receipt'))}</span><input type="file" name="receipt" accept="image/*"></label>
      <label class="field" style="margin-top:.75rem"><span>${esc(t('c_note'))}</span><textarea name="note" rows="2" maxlength="1000"></textarea></label>
      <button class="btn btn-primary btn-block" type="submit">${icon('send')} ${esc(t('c_send_req'))}</button>
      <p class="consent small muted">${esc(t('consent'))} <a href="/privacy?lang=${lang()}" target="_blank" rel="noopener">${esc(t('privacy'))}</a> ${esc(t('consent_after'))}</p>
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
    $('#receiptDrop span').textContent = f ? f.name : t('c_receipt');
  };
  $('#gateForm').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const err = $('#gateError');
    err.textContent = '';
    if (!form.name.value.trim() || !/^[+\d\s()-]{6,30}$/.test(form.phone.value.trim())) {
      err.textContent = t('c_err');
      return;
    }
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const fd = new FormData(form);
      fd.append('lang', lang());
      const res = await fetch('/api/chat/request?lang=' + lang(), { method: 'POST', body: fd });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || t('err_generic'));
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
    setStatusText(t('pending_status'));
    const req = lastRequest || {
      whatsapp: String(ctx.getContent().settings.whatsapp || '').replace(/\D/g, ''),
      message: t('wa_fallback', chat.name),
    };
    const wa = req.whatsapp
      ? `<a class="btn btn-whatsapp" target="_blank" rel="noopener" href="https://wa.me/${esc(req.whatsapp)}?text=${encodeURIComponent(req.message)}">${icon('whatsapp')} ${esc(t('notify_wa'))}</a>`
      : '';
    body().innerHTML = `
      <div class="status-box">
        <div class="ring-loader"></div>
        <h3>${esc(t('pending_title'))}</h3>
        <p>${esc(t('pending_text'))}</p>
        ${wa}
        <p style="margin-top:1rem"><button class="btn btn-soft" type="button" id="cancelReq">${esc(t('cancel_req'))}</button></p>
      </div>`;
    $('#cancelReq').onclick = reset;
    return;
  }
  if (st === 'rejected') {
    setStatusText(t('rejected_status'));
    body().innerHTML = `
      <div class="status-box">
        <div class="status-icon">${icon('close')}</div>
        <h3>${esc(t('rejected_title'))}</h3>
        ${chat.staffNote ? `<div class="staff-note">${esc(chat.staffNote)}</div>` : `<p>${esc(t('rejected_text'))}</p>`}
        <button class="btn btn-primary" type="button" id="newReq">${esc(t('new_req'))}</button>
      </div>`;
    $('#newReq').onclick = reset;
    return;
  }
  // approved / closed
  const closed = st === 'closed';
  setStatusText(closed ? t('closed_status') : t('open_status'), !closed);
  body().innerHTML = `
    <div class="chat-scroll" id="chatScroll">
      <div class="msg system"><div class="bubble">${icon('unlock')} ${esc(t('opened', chat.name))}</div></div>
    </div>
    <div class="typing" id="typing"></div>
    ${closed
      ? `<div class="status-box" style="padding:1rem;margin:0"><p>${esc(t('closed_text'))}</p><button class="btn btn-primary" id="newReq" type="button">${esc(t('new_consult'))}</button></div>`
      : `<form class="chat-input" id="chatForm">
          <label class="round attach" title="${esc(t('send_image'))}">${icon('image')}<input type="file" accept="image/*" hidden id="chatFile"></label>
          <textarea rows="1" id="chatText" placeholder="${esc(t('type_msg'))}" maxlength="4000"></textarea>
          <button class="round send" type="submit" aria-label="${esc(t('send'))}">${icon('send')}</button>
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
    ctx.toast(t('uploading'));
    const res = await fetch('/api/chat/upload', { method: 'POST', headers: { 'x-chat-token': token, 'x-lang': lang() }, body: fd });
    if (!res.ok) ctx.toast((await res.json().catch(() => ({}))).error || t('upload_failed'), 'error');
  };
}

function appendMessage(m, scroll = true) {
  const box = $('#chatScroll');
  if (!box) return;
  const mine = m.from === 'patient';
  const el = document.createElement('div');
  el.className = `msg ${mine ? 'me' : 'them'}`;
  el.innerHTML = `<div class="bubble">${m.image ? `<img src="${esc(fileUrl(m.image))}" alt="${esc(t('image'))}" loading="lazy">` : ''}${esc(m.text)}</div><time>${!mine && m.staffName ? esc(m.staffName) + ' · ' : ''}${timeFmt(m.at)}</time>`;
  const img = el.querySelector('img');
  if (img) img.onclick = () => window.open(img.src, '_blank');
  box.appendChild(el);
  if (scroll) scrollDown();
}
function scrollDown() {
  const box = $('#chatScroll');
  if (box) box.scrollTop = box.scrollHeight;
}
