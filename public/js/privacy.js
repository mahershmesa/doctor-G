// Privacy policy page: shows the clinic's policy (editable from the dashboard) in the chosen language.
import { icon, esc } from './icons.js';
import { t, lang, setLang, preferredLang, languagePicker } from './i18n.js';

const $ = (s) => document.querySelector(s);

// Very small formatter: "## " headings, "- " bullet lists, blank line = new paragraph.
function format(text) {
  const out = [];
  let list = null;
  const closeList = () => {
    if (list) out.push(`<ul>${list.join('')}</ul>`);
    list = null;
  };
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    if (line.startsWith('## ')) {
      closeList();
      out.push(`<h2>${esc(line.slice(3))}</h2>`);
    } else if (line.startsWith('- ')) {
      (list = list || []).push(`<li>${esc(line.slice(2))}</li>`);
    } else {
      closeList();
      out.push(`<p>${esc(line)}</p>`);
    }
  }
  closeList();
  return out.join('');
}

function brand(s) {
  const mark = s.logoImage ? `<img src="${esc(s.logoImage)}" alt="${esc(s.clinicName)}">` : `<span class="brand-mark">${icon('tooth')}</span>`;
  return `${mark}<span class="brand-text"><span>${esc(s.logoText || s.clinicName)}</span><small>${esc(s.doctorTitle)}</small></span>`;
}

async function load(l) {
  const res = await fetch('/api/content' + (l ? `?lang=${encodeURIComponent(l)}` : ''), { cache: 'no-store' });
  const c = await res.json();
  setLang(c.lang);
  const s = c.settings;
  document.documentElement.style.setProperty('--primary', s.primaryColor || '#0f9b8e');
  document.title = `${t('privacy')} | ${s.clinicName}`;
  $('#brand').innerHTML = brand(s);
  $('#brand').href = `/?lang=${lang()}`;
  $('#backHome').href = `/?lang=${lang()}`;
  $('#footerBrand').innerHTML = brand(s);
  $('#copyright').textContent = `© ${new Date().getFullYear()} ${s.clinicName} — ${s.footerText || ''}`;
  const contact = [s.clinicName, s.address, s.phone, s.email].filter(Boolean).map(esc).join(' · ');
  $('#policy').innerHTML = `<h1>${esc(t('privacy'))}</h1>${format(s.privacyPolicy)}<p class="contact-line small muted">${contact}</p>`;
  const slot = $('#langSlot');
  slot.innerHTML = '';
  if (c.languages.length > 1) slot.appendChild(languagePicker(c.languages, (x) => load(x).then(() => setLang(x, true))));
}

load(preferredLang());
