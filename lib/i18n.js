// Multi-language support (Arabic base + English + German).
// Translations live next to the original text:  item.i18n = { en: {...}, de: {...} }

const LANGS = ['ar', 'en', 'de'];
const EXTRA_LANGS = ['en', 'de'];

// Which fields the doctor can translate, per content type.
const TRANSLATABLE = {
  settings: [
    'clinicName', 'doctorName', 'doctorTitle', 'heroBadge', 'heroTitle', 'heroSubtitle', 'stats',
    'aboutTitle', 'aboutText', 'aboutHighlights', 'servicesTitle', 'servicesSubtitle', 'portfolioTitle',
    'portfolioSubtitle', 'testimonialsTitle', 'testimonialsSubtitle', 'faqTitle', 'bookingTitle',
    'bookingSubtitle', 'contactTitle', 'address', 'workingHours', 'bookingNote', 'chatPrice', 'chatIntro',
    'footerText', 'seoDescription', 'privacyPolicy',
  ],
  services: ['title', 'description', 'price'],
  portfolio: ['title', 'category', 'description'],
  testimonials: ['name', 'text'],
  faq: ['question', 'answer'],
  paymentMethods: ['name', 'instructions'],
};

const str = (v, max) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));

// Merge submitted translations into existing ones, keeping only allowed fields.
function mergeI18n(existing, input, fields, max = 20000) {
  const out = { ...(existing || {}) };
  if (!input || typeof input !== 'object') return out;
  for (const lang of EXTRA_LANGS) {
    const src = input[lang];
    if (!src || typeof src !== 'object') continue;
    const cur = { ...(out[lang] || {}) };
    for (const f of fields) if (Object.prototype.hasOwnProperty.call(src, f)) cur[f] = str(src[f], max);
    out[lang] = cur;
  }
  return out;
}

function pickLang(lang, enabled) {
  return LANGS.includes(lang) && enabled.includes(lang) ? lang : null;
}

// Return a copy with the requested language applied (missing translations fall back to Arabic).
function applyLang(obj, lang) {
  const { i18n, ...rest } = obj;
  if (lang === 'ar' || !i18n || !i18n[lang]) return rest;
  for (const [k, v] of Object.entries(i18n[lang])) if (v) rest[k] = v;
  return rest;
}

// Texts the server itself produces (errors shown to patients, WhatsApp messages).
const MESSAGES = {
  ar: {
    tooMany: 'طلبات كثيرة، يرجى المحاولة بعد قليل.',
    required: 'يرجى إكمال الحقول المطلوبة',
    badPhone: 'رقم الهاتف غير صحيح',
    badDate: 'التاريخ غير صحيح',
    pastDate: 'لا يمكن الحجز في تاريخ سابق',
    farDate: 'لا يمكن الحجز لأكثر من سنة مقدمًا',
    closedDay: 'العيادة مغلقة في هذا اليوم',
    badTime: 'الوقت المختار غير متاح',
    taken: 'هذا الوقت محجوز، يرجى اختيار وقت آخر',
    chatOff: 'الدردشة غير متاحة حاليًا',
    nameAndPhone: 'يرجى إدخال الاسم ورقم هاتف صحيح',
    chatLocked: 'المحادثة غير مفعلة',
    noImage: 'لم يتم اختيار صورة',
    fileTooBig: 'حجم الملف كبير جدًا',
    badFile: 'الملف تالف أو ليس صورة/فيديو حقيقي',
    badType: 'نوع الملف غير مدعوم',
    bookHello: (c) => `مرحبًا ${c}، أود حجز موعد:`,
    code: 'رقم الحجز', name: 'الاسم', phone: 'الهاتف', service: 'الخدمة', date: 'التاريخ', time: 'الوقت', pay: 'طريقة الدفع', notes: 'ملاحظات',
    chatMsg: (n, p, m) => `مرحبًا، قمت بطلب استشارة مباشرة عبر الموقع.\nالاسم: ${n}\nالهاتف: ${p}\nطريقة الدفع: ${m}\nيرجى تأكيد الدفع وفتح المحادثة.`,
  },
  en: {
    tooMany: 'Too many requests, please try again shortly.',
    required: 'Please fill in the required fields',
    badPhone: 'Invalid phone number',
    badDate: 'Invalid date',
    pastDate: 'You cannot book a date in the past',
    farDate: 'Bookings are limited to one year ahead',
    closedDay: 'The clinic is closed on this day',
    badTime: 'The selected time is not available',
    taken: 'This time is already booked, please choose another',
    chatOff: 'Chat is currently unavailable',
    nameAndPhone: 'Please enter your name and a valid phone number',
    chatLocked: 'This chat is not active',
    noImage: 'No image selected',
    fileTooBig: 'File is too large',
    badFile: 'The file is damaged or not a real image/video',
    badType: 'File type not supported',
    bookHello: (c) => `Hello ${c}, I would like to book an appointment:`,
    code: 'Booking no.', name: 'Name', phone: 'Phone', service: 'Service', date: 'Date', time: 'Time', pay: 'Payment', notes: 'Notes',
    chatMsg: (n, p, m) => `Hello, I requested a live consultation on the website.\nName: ${n}\nPhone: ${p}\nPayment: ${m}\nPlease confirm my payment and open the chat.`,
  },
  de: {
    tooMany: 'Zu viele Anfragen, bitte versuchen Sie es gleich erneut.',
    required: 'Bitte füllen Sie die Pflichtfelder aus',
    badPhone: 'Ungültige Telefonnummer',
    badDate: 'Ungültiges Datum',
    pastDate: 'Termine in der Vergangenheit sind nicht möglich',
    farDate: 'Buchungen sind nur bis zu einem Jahr im Voraus möglich',
    closedDay: 'An diesem Tag ist die Praxis geschlossen',
    badTime: 'Die gewählte Uhrzeit ist nicht verfügbar',
    taken: 'Diese Uhrzeit ist bereits vergeben, bitte wählen Sie eine andere',
    chatOff: 'Der Chat ist derzeit nicht verfügbar',
    nameAndPhone: 'Bitte geben Sie Ihren Namen und eine gültige Telefonnummer ein',
    chatLocked: 'Dieser Chat ist nicht aktiv',
    noImage: 'Kein Bild ausgewählt',
    fileTooBig: 'Die Datei ist zu groß',
    badFile: 'Die Datei ist beschädigt oder kein echtes Bild/Video',
    badType: 'Dateityp wird nicht unterstützt',
    bookHello: (c) => `Hallo ${c}, ich möchte einen Termin buchen:`,
    code: 'Buchungsnr.', name: 'Name', phone: 'Telefon', service: 'Leistung', date: 'Datum', time: 'Uhrzeit', pay: 'Zahlung', notes: 'Anmerkungen',
    chatMsg: (n, p, m) => `Hallo, ich habe auf der Website eine Live-Beratung angefragt.\nName: ${n}\nTelefon: ${p}\nZahlung: ${m}\nBitte bestätigen Sie meine Zahlung und öffnen Sie den Chat.`,
  },
};

// Language of a request: ?lang=, x-lang header or body.lang (falls back to Arabic for server messages).
function reqLang(req) {
  const l = String(req.query?.lang || req.get?.('x-lang') || req.body?.lang || '').slice(0, 2);
  return LANGS.includes(l) ? l : 'ar';
}
const msg = (req, key) => MESSAGES[reqLang(req)][key] ?? MESSAGES.ar[key];

module.exports = { LANGS, EXTRA_LANGS, TRANSLATABLE, MESSAGES, mergeI18n, applyLang, pickLang, reqLang, msg };
