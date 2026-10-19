// Tiny JSON-file database. Good enough for a single clinic and needs no setup.
// Writes are atomic (write to temp file, then rename) and debounced.

const fs = require('fs');
const path = require('path');
const seed = require('./seed');

// Older sites have no translations yet. Copy the default English/German texts, but only for
// fields whose Arabic text is still the untouched default (so translations always match).
function addDefaultTranslations(data, defaults) {
  let changed = false;
  const copy = (target, source, langs) => {
    for (const lang of ['en', 'de']) {
      const tr = source.i18n?.[lang];
      if (!tr) continue;
      for (const [field, value] of Object.entries(tr)) {
        if (target.i18n?.[lang]?.[field] !== undefined) continue;
        if (target[field] !== source[field] && !(field === 'name' && langs === 'names')) continue;
        target.i18n = target.i18n || {};
        target.i18n[lang] = target.i18n[lang] || {};
        target.i18n[lang][field] = value;
        changed = true;
      }
    }
  };
  if (!data.settings.i18n) {
    data.settings.i18n = {};
    changed = true;
  }
  copy(data.settings, defaults.settings);
  const keyField = { services: 'title', portfolio: 'title', testimonials: 'text', faq: 'question', paymentMethods: 'name' };
  for (const [col, key] of Object.entries(keyField)) {
    for (const item of data[col] || []) {
      if (item.i18n) continue;
      const match = defaults[col].find((d) => d[key] === item[key]);
      if (match) copy(item, match, col === 'testimonials' ? 'names' : '');
    }
  }
  return changed;
}

class DB {
  constructor(file) {
    this.file = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file)) {
      this.data = JSON.parse(fs.readFileSync(file, 'utf8'));
      // Fill in keys added in newer versions without touching existing content.
      const defaults = seed();
      for (const key of Object.keys(defaults)) {
        if (this.data[key] === undefined) this.data[key] = defaults[key];
      }
      for (const key of Object.keys(defaults.settings)) {
        if (key === 'i18n') continue; // handled below
        if (this.data.settings[key] === undefined) this.data.settings[key] = defaults.settings[key];
      }
      // Replace old placeholder values ("د. جي") with the new defaults, only if never edited.
      const OLD = {
        clinicName: 'عيادة د. جي لطب الأسنان',
        doctorName: 'د. جي',
        doctorTitle: 'أخصائي طب وتجميل الأسنان',
        logoText: 'Doctor G',
        aboutTitle: 'عن الطبيب',
        email: 'info@doctor-g.com',
        aboutText:
          'طبيب أسنان بخبرة طويلة في تجميل الأسنان وزراعتها وتقويمها. أؤمن بأن كل ابتسامة فريدة، لذلك أضع خطة علاج مخصّصة لكل مريض تجمع بين الدقة الطبية واللمسة الجمالية.\n\nحاصل على شهادات تخصصية من جامعات ومراكز معتمدة، وأحرص على مواكبة أحدث تقنيات العلاج الرقمي.',
        chatIntro:
          'استشارة مباشرة مع الطبيب عبر الدردشة. بعد الدفع وتأكيده من العيادة، يتم فتح المحادثة لك فورًا.',
      };
      let changed = false;
      for (const [key, oldValue] of Object.entries(OLD)) {
        if (this.data.settings[key] === oldValue) {
          this.data.settings[key] = defaults.settings[key];
          changed = true;
        }
      }
      for (const u of this.data.users || []) {
        if (u.name === OLD.doctorName) {
          u.name = defaults.settings.doctorName;
          changed = true;
        }
      }
      const OLD_REVIEWS = {
        'تجربة رائعة! الطبيب محترف جدًا والنتيجة فاقت توقعاتي.': 'تجربة رائعة! الطبيبة محترفة جدًا والنتيجة فاقت توقعاتي.',
        'أخيرًا وجدت طبيب أسنان أثق به. لم أشعر بأي ألم.': 'أخيرًا وجدت طبيبة أسنان أثق بها. لم أشعر بأي ألم.',
      };
      for (const t of this.data.testimonials || []) {
        if (OLD_REVIEWS[t.text]) {
          t.text = OLD_REVIEWS[t.text];
          changed = true;
        }
      }
      if (addDefaultTranslations(this.data, defaults)) changed = true;
      if (changed) this.flush();
    } else {
      this.data = seed();
      this.flush();
    }
    this.timer = null;
  }

  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 150);
  }

  flush() {
    clearTimeout(this.timer);
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, this.file);
  }
}

module.exports = DB;
