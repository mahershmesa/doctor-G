import { icon, esc } from './icons.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

let content = null;
let tooth = null;

// ---------- utilities ----------
export function toast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = 'toast'), 3800);
}

const lines = (s) => String(s || '').split('\n').map((l) => l.trim()).filter(Boolean);
const paragraphs = (s) => String(s || '').split(/\n\s*\n/).map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
const waLink = (num, text = '') => `https://wa.me/${String(num || '').replace(/\D/g, '')}${text ? '?text=' + encodeURIComponent(text) : ''}`;
const isDirectVideo = (u) => /^\/uploads\//.test(u) || /\.(mp4|webm|mov|ogg)(\?|$)/i.test(u);
function youtubeId(u) {
  const m = String(u).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function initials(name) {
  return esc(String(name || '؟').trim().charAt(0));
}

// ---------- rendering ----------
function applyTheme(s) {
  document.documentElement.style.setProperty('--primary', s.primaryColor || '#0f9b8e');
  $('meta[name="theme-color"]').setAttribute('content', s.primaryColor || '#0f9b8e');
  document.title = `${s.clinicName} | ${s.doctorTitle}`;
  $('meta[name="description"]').setAttribute('content', s.seoDescription || '');
}

function brandHtml(s) {
  const mark = s.logoImage ? `<img src="${esc(s.logoImage)}" alt="${esc(s.clinicName)}">` : `<span class="brand-mark">${icon('tooth')}</span>`;
  return `${mark}<span class="brand-text"><span>${esc(s.logoText || s.clinicName)}</span><small>${esc(s.doctorTitle)}</small></span>`;
}

function renderBasics(s) {
  $$('[data-bind]').forEach((el) => (el.textContent = s[el.dataset.bind] || ''));
  $('#brand').innerHTML = brandHtml(s);
  $('#footerBrand').innerHTML = brandHtml(s);
  $('#heroBook').innerHTML = `${icon('calendar')} احجز موعدك الآن`;
  $('#heroChat').innerHTML = `${icon('chat')} تحدث مع الطبيبة`;
  $('#heroChat').hidden = !s.chatEnabled;
  $('#fcIcon1').innerHTML = icon('tooth');
  $('#fcIcon2').innerHTML = icon('star');
  $('#hoursIcon').innerHTML = icon('clock');
  $('#payIcon').innerHTML = icon('wallet');
  $('#menuToggle').innerHTML = icon('menu');
  $('#bookingSubmit').innerHTML = `${icon('whatsapp')} تأكيد الحجز عبر واتساب`;
  $('#fabWhatsapp').innerHTML = icon('whatsapp');
  $('#fabWhatsapp').href = waLink(s.whatsapp, `مرحبًا ${s.clinicName}`);
  $('#fabChat').innerHTML = icon('chat') + '<span class="fab-dot" hidden></span>';
  $('#fabChat').hidden = !s.chatEnabled;

  const stats = lines(s.stats).map((l) => l.split('|').map((x) => x.trim()));
  $('#stats').innerHTML = stats.map(([v, label]) => `<div class="stat"><strong>${esc(v)}</strong><span>${esc(label || '')}</span></div>`).join('');
  $('#expBadge').innerHTML = stats[0] ? `<strong>${esc(stats[0][0])}</strong><span>${esc(stats[0][1] || '')}</span>` : '';
  $('#expBadge').hidden = !stats[0];

  $('#doctorPhoto').innerHTML = s.doctorPhoto ? `<img src="${esc(s.doctorPhoto)}" alt="${esc(s.doctorName)}" loading="lazy">` : icon('smile');
  $('#aboutText').innerHTML = paragraphs(s.aboutText);
  $('#aboutHighlights').innerHTML = lines(s.aboutHighlights).map((l) => `<li>${icon('check')}<span>${esc(l)}</span></li>`).join('');

  $('#workingHours').innerHTML = lines(s.workingHours).map((l) => `<li>${esc(l)}</li>`).join('');
  $('#copyright').textContent = `© ${new Date().getFullYear()} ${s.clinicName} — ${s.footerText || ''}`;

  const socials = ['instagram', 'facebook', 'tiktok', 'snapchat', 'youtube'].filter((k) => s[k]);
  $('#socials').innerHTML = socials.map((k) => `<a href="${esc(s[k])}" target="_blank" rel="noopener" aria-label="${k}">${icon(k)}</a>`).join('');

  const heroImg = $('#heroImage');
  if (s.heroImage) {
    heroImg.src = s.heroImage;
    heroImg.alt = s.clinicName;
  }
  heroImg.hidden = !(s.heroImage && (!s.show3D || !tooth));
  $('#tooth3d').hidden = !s.show3D || !tooth;
  $('#dragHint').hidden = !s.show3D || !tooth;
}

function renderServices(list) {
  $('#servicesGrid').innerHTML =
    list
      .map(
        (sv) => `
      <article class="card service tilt reveal">
        ${sv.image ? `<div class="service-img"><img src="${esc(sv.image)}" alt="${esc(sv.title)}" loading="lazy"></div>` : ''}
        <div class="service-icon">${icon(sv.icon)}</div>
        <h3>${esc(sv.title)}</h3>
        <p>${esc(sv.description)}</p>
        ${sv.price ? `<span class="price">${esc(sv.price)}</span>` : ''}
      </article>`
      )
      .join('') || '<p class="empty">ستتم إضافة الخدمات قريبًا</p>';
}

function workMedia(w) {
  const images = lines(w.images);
  const badges = [];
  if (w.before && w.after) badges.push(`<span class="badge">قبل / بعد</span>`);
  if (w.video) badges.push(`<span class="badge">${icon('play')} فيديو</span>`);
  if (images.length) badges.push(`<span class="badge">${icon('image')} ${images.length}</span>`);
  let inner;
  if (w.before && w.after) {
    inner = `<div class="work-split"><div><img src="${esc(w.before)}" alt="" loading="lazy"><span class="badge">قبل</span></div><div><img src="${esc(w.after)}" alt="" loading="lazy"><span class="badge">بعد</span></div></div>`;
  } else if (w.after || w.before || images[0]) {
    inner = `<img src="${esc(w.after || w.before || images[0])}" alt="${esc(w.title)}" loading="lazy">`;
  } else if (w.video && isDirectVideo(w.video)) {
    inner = `<video src="${esc(w.video)}#t=0.5" muted playsinline preload="metadata"></video>`;
  } else if (w.video && youtubeId(w.video)) {
    inner = `<img src="https://i.ytimg.com/vi/${youtubeId(w.video)}/hqdefault.jpg" alt="" loading="lazy">`;
  } else {
    inner = icon('smile');
  }
  return `<div class="work-media">${inner}<div class="work-badges">${badges.join('')}</div></div>`;
}

function renderPortfolio(list) {
  const cats = [...new Set(list.map((w) => w.category).filter(Boolean))];
  $('#portfolioFilters').innerHTML = cats.length > 1
    ? ['الكل', ...cats].map((c, i) => `<button class="filter ${i === 0 ? 'active' : ''}" data-cat="${i === 0 ? '' : esc(c)}" role="tab">${esc(c)}</button>`).join('')
    : '';
  $('#portfolioGrid').innerHTML =
    list
      .map(
        (w) => `
      <button class="card work tilt reveal" data-id="${esc(w.id)}" data-cat="${esc(w.category)}" type="button">
        ${workMedia(w)}
        <div class="work-body">
          ${w.category ? `<span class="work-cat">${esc(w.category)}</span>` : ''}
          <h3>${esc(w.title)}</h3>
          <p>${esc(w.description)}</p>
        </div>
      </button>`
      )
      .join('') || '<p class="empty">ستتم إضافة الأعمال قريبًا</p>';
}

function renderTestimonials(list) {
  $('#testimonials').hidden = !list.length;
  $('#testimonialsList').innerHTML = list
    .map((t) => {
      const r = Number(t.rating) || 5;
      const stars = Array.from({ length: 5 }, (_, i) => icon('star', i < r ? '' : 'off')).join('');
      return `
      <figure class="card testimonial tilt reveal">
        ${icon('quote', 'quote-icon')}
        <div class="stars" aria-label="${r} من 5">${stars}</div>
        <p>${esc(t.text)}</p>
        <figcaption class="person"><span class="avatar">${t.photo ? `<img src="${esc(t.photo)}" alt="" loading="lazy">` : initials(t.name)}</span><strong>${esc(t.name)}</strong></figcaption>
      </figure>`;
    })
    .join('');
}

function renderFaq(list) {
  $('#faq').hidden = !list.length;
  $('#faqList').innerHTML = list
    .map((f) => `<details class="faq-item reveal"><summary>${esc(f.question)}${icon('plus')}</summary><div>${paragraphs(f.answer)}</div></details>`)
    .join('');
}

function renderContact(s) {
  const cards = [];
  if (s.whatsapp) cards.push(`<a class="card contact-card wa" href="${waLink(s.whatsapp)}" target="_blank" rel="noopener"><span class="ci">${icon('whatsapp')}</span><div><small>واتساب</small><strong class="ltr">+${esc(s.whatsapp)}</strong></div></a>`);
  if (s.phone) cards.push(`<a class="card contact-card" href="tel:${esc(s.phone.replace(/[^\d+]/g, ''))}"><span class="ci">${icon('phone')}</span><div><small>اتصل بنا</small><strong class="ltr">${esc(s.phone)}</strong></div></a>`);
  if (s.email) cards.push(`<a class="card contact-card" href="mailto:${esc(s.email)}"><span class="ci">${icon('mail')}</span><div><small>البريد الإلكتروني</small><strong>${esc(s.email)}</strong></div></a>`);
  if (s.address) cards.push(`<div class="card contact-card"><span class="ci">${icon('pin')}</span><div><small>العنوان</small><strong>${esc(s.address)}</strong></div></div>`);
  if (s.workingHours) cards.push(`<div class="card contact-card"><span class="ci">${icon('clock')}</span><div><small>أوقات العمل</small><strong>${lines(s.workingHours).map(esc).join('<br>')}</strong></div></div>`);
  $('#contactCards').innerHTML = cards.join('');
  $('#mapBox').innerHTML = s.mapEmbed
    ? `<iframe src="${esc(s.mapEmbed)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="موقع العيادة" allowfullscreen></iframe>`
    : `<div class="map-placeholder">${icon('pin')}<strong>${esc(s.address || '')}</strong></div>`;
}

// ---------- booking ----------
function parseSlot(label) {
  const m = String(label).match(/(\d{1,2})(?::(\d{2}))?\s*(ص|م|am|pm)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ap = (m[3] || '').toLowerCase();
  if ((ap === 'م' || ap === 'pm') && h < 12) h += 12;
  if ((ap === 'ص' || ap === 'am') && h === 12) h = 0;
  return h * 60 + min;
}
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function setupBookingForm() {
  const s = content.settings;
  const form = $('#bookingForm');
  $('#serviceSelect').innerHTML = `<option value="">استشارة / فحص عام</option>` + content.services.map((sv) => `<option>${esc(sv.title)}</option>`).join('');
  const pays = content.paymentMethods;
  $('#bookingPay').innerHTML = pays.map((p) => `<option>${esc(p.name)}</option>`).join('') || '<option value="">—</option>';
  $('#payList').innerHTML = pays.map((p) => `<span class="pay-chip">${esc(p.name)}</span>`).join('');
  const showPay = () => {
    const p = pays.find((x) => x.name === $('#bookingPay').value);
    let box = $('#bookingPayDetail');
    if (!box) {
      box = document.createElement('div');
      box.id = 'bookingPayDetail';
      box.className = 'pay-detail';
      $('#bookingPay').after(box);
    }
    box.hidden = !p || (!p.details && !p.instructions);
    if (p) box.innerHTML = `${p.details ? `<b>${esc(p.details)}</b><br>` : ''}${esc(p.instructions || '')}`;
  };
  $('#bookingPay').onchange = showPay;
  showPay();

  const dateInput = $('#dateInput');
  dateInput.min = ymd(new Date());
  const closed = String(s.closedDays || '').split(',').filter((x) => x.trim() !== '').map(Number);
  let selectedTime = '';

  async function loadSlots() {
    const box = $('#slots');
    selectedTime = '';
    const date = dateInput.value;
    if (!date) return (box.innerHTML = '<p class="muted small">اختر التاريخ أولًا</p>');
    const day = new Date(date + 'T12:00:00').getDay();
    if (closed.includes(day)) {
      box.innerHTML = `<p class="muted small">العيادة مغلقة يوم ${DAY_NAMES[day]}، اختر يومًا آخر.</p>`;
      return;
    }
    box.innerHTML = '<p class="muted small">جارِ التحميل…</p>';
    let taken = [];
    try {
      taken = (await (await fetch('/api/bookings/taken?date=' + date)).json()).taken || [];
    } catch {}
    const now = new Date();
    const isToday = date === ymd(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const slots = lines(s.bookingSlots);
    box.innerHTML = slots
      .map((t) => {
        const past = isToday && (parseSlot(t) ?? 9999) <= nowMin;
        const dis = taken.includes(t) || past;
        return `<button type="button" class="slot" data-time="${esc(t)}" ${dis ? 'disabled' : ''}>${esc(t)}</button>`;
      })
      .join('') || '<p class="muted small">لا توجد أوقات متاحة</p>';
  }
  dateInput.onchange = loadSlots;
  $('#slots').onclick = (e) => {
    const b = e.target.closest('.slot');
    if (!b || b.disabled) return;
    $$('.slot', $('#slots')).forEach((x) => x.classList.remove('selected'));
    b.classList.add('selected');
    selectedTime = b.dataset.time;
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const err = $('#bookingError');
    err.textContent = '';
    const data = Object.fromEntries(new FormData(form));
    data.time = selectedTime;
    $$('.invalid', form).forEach((x) => x.classList.remove('invalid'));
    const missing = [];
    if (!data.name.trim()) missing.push(form.name);
    if (!/^[+\d\s()-]{6,30}$/.test(data.phone.trim())) missing.push(form.phone);
    if (!data.date) missing.push(dateInput);
    missing.forEach((m) => m.classList.add('invalid'));
    if (missing.length) return (err.textContent = 'يرجى إكمال الحقول المطلوبة بشكل صحيح');
    if (!data.time) return (err.textContent = 'يرجى اختيار وقت الموعد');

    const btn = $('#bookingSubmit');
    btn.disabled = true;
    try {
      const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'حدث خطأ');
      showBookingSuccess(out);
      form.reset();
      showPay();
      loadSlots();
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false;
    }
  };
}

function showBookingSuccess({ booking, whatsapp, message }) {
  const link = waLink(whatsapp, message);
  const row = (k, v) => (v ? `<div><span>${k}</span><b>${esc(v)}</b></div>` : '');
  $('#bookingModalCard').innerHTML = `
    <div class="success-icon">${icon('check')}</div>
    <h3>تم تسجيل طلب الحجز</h3>
    <p class="muted">خطوة أخيرة: أرسل الطلب إلى العيادة عبر واتساب ليتم تأكيده.</p>
    <div class="summary">
      ${row('رقم الحجز', booking.code)}${row('الخدمة', booking.service)}${row('التاريخ', booking.date)}${row('الوقت', booking.time)}${row('طريقة الدفع', booking.paymentMethod)}
    </div>
    <div class="modal-actions">
      <a class="btn btn-whatsapp btn-lg" href="${esc(link)}" target="_blank" rel="noopener">${icon('whatsapp')} إرسال الحجز عبر واتساب</a>
      <button class="btn btn-soft" type="button" data-close>إغلاق</button>
    </div>`;
  openModal($('#bookingModal'));
}

// ---------- modals / lightbox ----------
function openModal(el) {
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeModal(el) {
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  $$('video', el).forEach((v) => v.pause());
  if (el.id === 'lightbox') setTimeout(() => !el.classList.contains('open') && ($('#lightboxInner').innerHTML = ''), 300);
}
document.addEventListener('click', (e) => {
  const m = e.target.closest('.modal, .lightbox');
  if (m && (e.target === m || e.target.closest('[data-close]'))) closeModal(m);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $$('.modal.open, .lightbox.open').forEach(closeModal);
});

export function baSlider(before, after) {
  return `<div class="ba">
    <img src="${esc(after)}" alt="بعد">
    <img class="ba-before" src="${esc(before)}" alt="قبل">
    <div class="ba-handle"></div>
    <span class="badge ba-label r">قبل</span><span class="badge ba-label l">بعد</span>
    <input type="range" min="0" max="100" value="50" aria-label="قارن قبل وبعد">
  </div>`;
}
function wireBa(root) {
  $$('.ba', root).forEach((ba) => {
    const r = $('input', ba);
    // RTL: "before" sits on the right, revealed as the handle moves left.
    const set = () => ba.style.setProperty('--pos', 100 - r.value + '%');
    r.addEventListener('input', set);
    set();
  });
}

function mediaItems(w) {
  const items = [];
  if (w.before && w.after) items.push({ type: 'ba', thumb: w.after });
  else if (w.after || w.before) items.push({ type: 'img', src: w.after || w.before });
  lines(w.images).forEach((src) => items.push({ type: 'img', src }));
  if (w.video) items.push({ type: 'video', src: w.video });
  return items;
}
function mediaHtml(item, w) {
  if (item.type === 'ba') return baSlider(w.before, w.after);
  if (item.type === 'img') return `<img class="lb-main" src="${esc(item.src)}" alt="${esc(w.title)}">`;
  const yt = youtubeId(item.src);
  if (yt) return `<iframe class="lb-video" src="https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="${esc(w.title)}"></iframe>`;
  if (isDirectVideo(item.src)) return `<video class="lb-video" src="${esc(item.src)}" controls playsinline autoplay></video>`;
  return `<div class="lb-body" style="background:#fff"><a class="btn btn-primary" href="${esc(item.src)}" target="_blank" rel="noopener">${icon('play')} مشاهدة الفيديو</a></div>`;
}

function openWork(id) {
  const w = content.portfolio.find((x) => x.id === id);
  if (!w) return;
  const items = mediaItems(w);
  const thumbs = items.length > 1
    ? `<div class="lb-thumbs">${items.map((it, i) => `<button type="button" data-i="${i}" class="${i === 0 ? 'active' : ''}" aria-label="عرض ${i + 1}">${it.type === 'video' ? `<span class="vthumb">${icon('play')}</span>` : `<img src="${esc(it.thumb || it.src)}" alt="">`}</button>`).join('')}</div>`
    : '';
  $('#lightboxInner').innerHTML = `
    <button class="icon-btn lb-close" data-close aria-label="إغلاق">${icon('close')}</button>
    ${items.length ? `<div class="lb-media"><div id="lbStage">${mediaHtml(items[0], w)}</div>${thumbs}</div>` : ''}
    <div class="lb-body">
      ${w.category ? `<span class="work-cat">${esc(w.category)}</span>` : ''}
      <h3>${esc(w.title)}</h3>
      <div class="muted">${paragraphs(w.description)}</div>
      <a href="#booking" class="btn btn-primary" data-close>${icon('calendar')} احجز حالة مشابهة</a>
    </div>`;
  wireBa($('#lightboxInner'));
  $$('.lb-thumbs button', $('#lightboxInner')).forEach((b) =>
    b.addEventListener('click', () => {
      $$('.lb-thumbs button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      $('#lbStage').innerHTML = mediaHtml(items[Number(b.dataset.i)], w);
      wireBa($('#lbStage'));
    })
  );
  openModal($('#lightbox'));
}

// ---------- interactions ----------
function setupPortfolioEvents() {
  $('#portfolioFilters').onclick = (e) => {
    const b = e.target.closest('.filter');
    if (!b) return;
    $$('.filter').forEach((x) => x.classList.toggle('active', x === b));
    const cat = b.dataset.cat;
    $$('.work').forEach((w) => w.classList.toggle('hide', !!cat && w.dataset.cat !== cat));
  };
  $('#portfolioGrid').onclick = (e) => {
    const card = e.target.closest('.work');
    if (card) openWork(card.dataset.id);
  };
}

let revealObserver;
function observeReveals() {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          revealObserver.unobserve(en.target);
        }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
  }
  $$('.reveal:not(.in)').forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 4, 3) * 80}ms`;
    revealObserver.observe(el);
  });
}

function setupTilt() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest?.('.tilt');
    $$('.tilt.tilting').forEach((c) => {
      if (c !== card) {
        c.classList.remove('tilting');
        c.style.removeProperty('--rx');
        c.style.removeProperty('--ry');
      }
    });
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.classList.add('tilting');
    card.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`);
    card.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
  }, { passive: true });
}

function setupHeader() {
  const header = $('#header');
  const nav = $('#nav');
  const toggle = $('#menuToggle');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const setMenu = (open) => {
    nav.classList.toggle('open', open);
    header.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.innerHTML = icon(open ? 'close' : 'menu');
  };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.addEventListener('click', (e) => e.target.closest('a') && setMenu(false));

  const links = $$('.nav a:not(.btn)');
  const spy = new IntersectionObserver(
    (entries) => entries.forEach((en) => {
      if (en.isIntersecting) links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
    }),
    { rootMargin: '-45% 0px -50% 0px' }
  );
  $$('main section[id]').forEach((s) => spy.observe(s));
}

async function setup3D(s) {
  if (!s.show3D || tooth) return;
  try {
    const mod = await import('./tooth3d.js');
    if (!mod.webglAvailable()) return;
    tooth = mod.mountTooth($('#tooth3d'), { color: s.primaryColor });
    $('#tooth3d').addEventListener('pointerdown', () => ($('#dragHint').style.opacity = 0), { once: true });
  } catch (e) {
    console.warn('3D disabled:', e);
  }
}

// ---------- boot ----------
function renderAll() {
  const s = content.settings;
  applyTheme(s);
  renderBasics(s);
  renderServices(content.services);
  renderPortfolio(content.portfolio);
  renderTestimonials(content.testimonials);
  renderFaq(content.faq);
  renderContact(s);
  setupBookingForm();
  observeReveals();
  tooth?.setColor(s.primaryColor);
}

async function loadContent() {
  const res = await fetch('/api/content', { cache: 'no-store' });
  if (!res.ok) throw new Error('failed');
  content = await res.json();
}

async function boot() {
  setupHeader();
  setupPortfolioEvents();
  setupTilt();
  try {
    await loadContent();
  } catch {
    $('#loader').classList.add('done');
    toast('تعذر تحميل المحتوى، يرجى تحديث الصفحة', 'error');
    return;
  }
  await setup3D(content.settings);
  renderAll();
  requestAnimationFrame(() => $('#loader').classList.add('done'));

  const chat = await import('./chat.js');
  chat.initChat({ getContent: () => content, toast, openModal, closeModal });

}

boot();
