// Interface texts of the public site in Arabic, English and German.
// (Clinic content — titles, services, etc. — comes translated from the server.)

const UI = {
  ar: {
    langName: 'العربية',
    nav_home: 'الرئيسية', nav_about: 'عن الطبيبة', nav_services: 'الخدمات', nav_portfolio: 'أعمالنا',
    nav_testimonials: 'آراء المرضى', nav_contact: 'تواصل', nav_book: 'احجز موعد',
    menu_open: 'فتح القائمة', language: 'اللغة',
    hero_book: 'احجز موعدك الآن', hero_chat: 'تحدث مع الطبيبة', rating: 'تقييم المرضى', drag: 'اسحب لتدوير المجسم',
    tooth_alt: 'مجسم ثلاثي الأبعاد لسن',
    eb_about: 'تعرّف علينا', eb_services: 'ماذا نقدّم', eb_portfolio: 'بورتفوليو', eb_testimonials: 'قصص نجاح',
    eb_booking: 'موعدك بخطوة', eb_faq: 'لديك سؤال؟', eb_contact: 'نحن هنا لأجلك',
    about_book: 'احجز استشارتك', about_work: 'شاهد أعمالنا',
    hours: 'أوقات العمل', payments: 'طرق الدفع المتاحة',
    f_name: 'الاسم الكامل *', f_phone: 'رقم الهاتف / واتساب *', f_service: 'الخدمة', f_date: 'التاريخ *',
    f_pay: 'طريقة الدفع', f_time: 'الوقت *', f_notes: 'ملاحظات', f_notes_ph: 'اكتب أي تفاصيل تود مشاركتها مع الطبيبة',
    pick_date: 'اختر التاريخ أولًا', loading: 'جارِ التحميل…', no_slots: 'لا توجد أوقات متاحة',
    closed_day: (d) => `العيادة مغلقة يوم ${d}، اختر يومًا آخر.`,
    days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    general_consult: 'استشارة / فحص عام', submit_booking: 'تأكيد الحجز عبر واتساب',
    err_fields: 'يرجى إكمال الحقول المطلوبة بشكل صحيح', err_time: 'يرجى اختيار وقت الموعد', err_generic: 'حدث خطأ',
    consent: 'بإرسال الطلب فإنك توافق على', privacy: 'سياسة الخصوصية',
    ok_title: 'تم تسجيل طلب الحجز', ok_text: 'خطوة أخيرة: أرسل الطلب إلى العيادة عبر واتساب ليتم تأكيده.',
    s_code: 'رقم الحجز', s_service: 'الخدمة', s_date: 'التاريخ', s_time: 'الوقت', s_pay: 'طريقة الدفع',
    send_wa: 'إرسال الحجز عبر واتساب', close: 'إغلاق',
    empty_services: 'ستتم إضافة الخدمات قريبًا', empty_work: 'ستتم إضافة الأعمال قريبًا', all: 'الكل',
    before: 'قبل', after: 'بعد', video: 'فيديو', compare: 'قارن قبل وبعد', view_n: (n) => `عرض ${n}`,
    book_similar: 'احجز حالة مشابهة', watch_video: 'مشاهدة الفيديو',
    c_whatsapp: 'واتساب', c_call: 'اتصل بنا', c_email: 'البريد الإلكتروني', c_address: 'العنوان', c_hours: 'أوقات العمل',
    map_title: 'موقع العيادة', of5: (r) => `${r} من 5`, load_error: 'تعذر تحميل المحتوى، يرجى تحديث الصفحة',
    scroll_down: 'انتقل للأسفل', back_home: 'العودة إلى الموقع',
    // chat
    chat_with: 'الدردشة مع الطبيبة', chat_paid: 'استشارة خاصة مدفوعة', chat_off: 'الدردشة غير متاحة حاليًا. يمكنك التواصل عبر واتساب.',
    chat_title: 'الدردشة المباشرة مع الطبيبة', chat_fee: 'رسوم الاستشارة:',
    step1: 'ادفع رسوم الاستشارة بإحدى طرق الدفع', step2: 'أرسل الطلب مع صورة إيصال الدفع', step3: 'بعد تأكيد العيادة تُفتح المحادثة فورًا',
    c_name: 'الاسم *', c_phone: 'رقم الهاتف / واتساب *', c_receipt: 'إرفاق صورة إيصال الدفع (اختياري)', c_note: 'نبذة عن حالتك',
    c_send_req: 'إرسال طلب فتح المحادثة', c_err: 'يرجى إدخال الاسم ورقم هاتف صحيح',
    pending_status: 'بانتظار تأكيد الدفع', pending_title: 'طلبك قيد المراجعة',
    pending_text: 'ستقوم الطبيبة أو المساعد بتأكيد الدفع وفتح المحادثة لك. ستُفتح هنا تلقائيًا فور الموافقة.',
    notify_wa: 'إبلاغ العيادة عبر واتساب', cancel_req: 'إلغاء الطلب',
    wa_fallback: (n) => `مرحبًا، أرسلت طلب استشارة مباشرة عبر الموقع باسم ${n}. يرجى تأكيد الدفع وفتح المحادثة.`,
    rejected_status: 'لم يتم تأكيد الطلب', rejected_title: 'لم يتم تأكيد الدفع',
    rejected_text: 'يرجى التأكد من الدفع والمحاولة مجددًا أو التواصل عبر واتساب.', new_req: 'إرسال طلب جديد',
    closed_status: 'انتهت المحادثة', open_status: 'متصل — المحادثة مفتوحة', online: 'متصل',
    opened: (n) => `تم فتح المحادثة. مرحبًا ${n}، اكتب سؤالك للطبيبة.`,
    closed_text: 'أُغلقت هذه المحادثة من قبل العيادة.', new_consult: 'طلب استشارة جديدة',
    send_image: 'إرسال صورة', type_msg: 'اكتب رسالتك…', send: 'إرسال', image: 'صورة',
    uploading: 'جارِ رفع الصورة…', upload_failed: 'فشل رفع الصورة', conn_error: 'تعذر الاتصال، حاول مجددًا.',
    approved_toast: 'تم تأكيد الدفع وفتح المحادثة مع الطبيبة ✓', typing: 'الطبيبة تكتب…',
  },
  en: {
    langName: 'English',
    nav_home: 'Home', nav_about: 'About', nav_services: 'Services', nav_portfolio: 'Our work',
    nav_testimonials: 'Reviews', nav_contact: 'Contact', nav_book: 'Book now',
    menu_open: 'Open menu', language: 'Language',
    hero_book: 'Book your appointment', hero_chat: 'Chat with the doctor', rating: 'Patient rating', drag: 'Drag to rotate',
    tooth_alt: '3D model of a tooth',
    eb_about: 'Get to know us', eb_services: 'What we offer', eb_portfolio: 'Portfolio', eb_testimonials: 'Success stories',
    eb_booking: 'One step away', eb_faq: 'Have a question?', eb_contact: "We're here for you",
    about_book: 'Book a consultation', about_work: 'See our work',
    hours: 'Opening hours', payments: 'Payment methods',
    f_name: 'Full name *', f_phone: 'Phone / WhatsApp *', f_service: 'Service', f_date: 'Date *',
    f_pay: 'Payment method', f_time: 'Time *', f_notes: 'Notes', f_notes_ph: 'Anything you would like the doctor to know',
    pick_date: 'Choose a date first', loading: 'Loading…', no_slots: 'No times available',
    closed_day: (d) => `The clinic is closed on ${d}. Please choose another day.`,
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    general_consult: 'Consultation / check-up', submit_booking: 'Confirm booking via WhatsApp',
    err_fields: 'Please fill in the required fields correctly', err_time: 'Please choose a time', err_generic: 'Something went wrong',
    consent: 'By sending this request you agree to our', privacy: 'Privacy policy',
    ok_title: 'Your booking request is saved', ok_text: 'Last step: send it to the clinic on WhatsApp to get it confirmed.',
    s_code: 'Booking no.', s_service: 'Service', s_date: 'Date', s_time: 'Time', s_pay: 'Payment',
    send_wa: 'Send booking via WhatsApp', close: 'Close',
    empty_services: 'Services coming soon', empty_work: 'Our work will be added soon', all: 'All',
    before: 'Before', after: 'After', video: 'Video', compare: 'Compare before and after', view_n: (n) => `View ${n}`,
    book_similar: 'Book a similar treatment', watch_video: 'Watch the video',
    c_whatsapp: 'WhatsApp', c_call: 'Call us', c_email: 'Email', c_address: 'Address', c_hours: 'Opening hours',
    map_title: 'Clinic location', of5: (r) => `${r} out of 5`, load_error: 'Could not load the content, please refresh the page',
    scroll_down: 'Scroll down', back_home: 'Back to the website',
    chat_with: 'Chat with the doctor', chat_paid: 'Private paid consultation', chat_off: 'Chat is currently unavailable. You can reach us on WhatsApp.',
    chat_title: 'Live chat with the doctor', chat_fee: 'Consultation fee:',
    step1: 'Pay the consultation fee with one of the payment methods', step2: 'Send your request with a photo of the receipt', step3: 'Once the clinic confirms, the chat opens instantly',
    c_name: 'Name *', c_phone: 'Phone / WhatsApp *', c_receipt: 'Attach a photo of the payment receipt (optional)', c_note: 'Briefly describe your case',
    c_send_req: 'Request to open the chat', c_err: 'Please enter your name and a valid phone number',
    pending_status: 'Waiting for payment confirmation', pending_title: 'Your request is being reviewed',
    pending_text: 'The doctor or assistant will confirm your payment and open the chat. It will open here automatically once approved.',
    notify_wa: 'Notify the clinic on WhatsApp', cancel_req: 'Cancel request',
    wa_fallback: (n) => `Hello, I sent a live consultation request on the website under the name ${n}. Please confirm my payment and open the chat.`,
    rejected_status: 'Request not confirmed', rejected_title: 'Payment not confirmed',
    rejected_text: 'Please check your payment and try again, or contact us on WhatsApp.', new_req: 'Send a new request',
    closed_status: 'Chat ended', open_status: 'Online — chat is open', online: 'Online',
    opened: (n) => `The chat is open. Hello ${n}, write your question to the doctor.`,
    closed_text: 'This chat was closed by the clinic.', new_consult: 'Request a new consultation',
    send_image: 'Send an image', type_msg: 'Type your message…', send: 'Send', image: 'Image',
    uploading: 'Uploading image…', upload_failed: 'Image upload failed', conn_error: 'Connection failed, please try again.',
    approved_toast: 'Payment confirmed — your chat with the doctor is open ✓', typing: 'The doctor is typing…',
  },
  de: {
    langName: 'Deutsch',
    nav_home: 'Start', nav_about: 'Über uns', nav_services: 'Leistungen', nav_portfolio: 'Arbeiten',
    nav_testimonials: 'Bewertungen', nav_contact: 'Kontakt', nav_book: 'Termin buchen',
    menu_open: 'Menü öffnen', language: 'Sprache',
    hero_book: 'Jetzt Termin buchen', hero_chat: 'Mit der Ärztin chatten', rating: 'Patientenbewertung', drag: 'Zum Drehen ziehen',
    tooth_alt: '3D-Modell eines Zahns',
    eb_about: 'Lernen Sie uns kennen', eb_services: 'Was wir bieten', eb_portfolio: 'Portfolio', eb_testimonials: 'Erfolgsgeschichten',
    eb_booking: 'Nur ein Schritt', eb_faq: 'Haben Sie Fragen?', eb_contact: 'Wir sind für Sie da',
    about_book: 'Beratung buchen', about_work: 'Unsere Arbeiten',
    hours: 'Öffnungszeiten', payments: 'Zahlungsarten',
    f_name: 'Vollständiger Name *', f_phone: 'Telefon / WhatsApp *', f_service: 'Leistung', f_date: 'Datum *',
    f_pay: 'Zahlungsart', f_time: 'Uhrzeit *', f_notes: 'Anmerkungen', f_notes_ph: 'Was sollte die Ärztin wissen?',
    pick_date: 'Bitte zuerst ein Datum wählen', loading: 'Wird geladen…', no_slots: 'Keine freien Zeiten',
    closed_day: (d) => `Am ${d} ist die Praxis geschlossen. Bitte wählen Sie einen anderen Tag.`,
    days: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    general_consult: 'Beratung / Kontrolle', submit_booking: 'Buchung per WhatsApp bestätigen',
    err_fields: 'Bitte füllen Sie die Pflichtfelder korrekt aus', err_time: 'Bitte wählen Sie eine Uhrzeit', err_generic: 'Ein Fehler ist aufgetreten',
    consent: 'Mit dem Absenden stimmen Sie unserer', privacy: 'Datenschutzerklärung',
    ok_title: 'Ihre Buchungsanfrage wurde gespeichert', ok_text: 'Letzter Schritt: Senden Sie sie per WhatsApp an die Praxis, damit sie bestätigt wird.',
    s_code: 'Buchungsnr.', s_service: 'Leistung', s_date: 'Datum', s_time: 'Uhrzeit', s_pay: 'Zahlung',
    send_wa: 'Buchung per WhatsApp senden', close: 'Schließen',
    empty_services: 'Leistungen folgen in Kürze', empty_work: 'Arbeiten folgen in Kürze', all: 'Alle',
    before: 'Vorher', after: 'Nachher', video: 'Video', compare: 'Vorher und nachher vergleichen', view_n: (n) => `Ansicht ${n}`,
    book_similar: 'Ähnliche Behandlung buchen', watch_video: 'Video ansehen',
    c_whatsapp: 'WhatsApp', c_call: 'Anrufen', c_email: 'E-Mail', c_address: 'Adresse', c_hours: 'Öffnungszeiten',
    map_title: 'Standort der Praxis', of5: (r) => `${r} von 5`, load_error: 'Inhalte konnten nicht geladen werden, bitte Seite neu laden',
    scroll_down: 'Nach unten', back_home: 'Zurück zur Website',
    chat_with: 'Chat mit der Ärztin', chat_paid: 'Private, kostenpflichtige Beratung', chat_off: 'Der Chat ist derzeit nicht verfügbar. Sie erreichen uns per WhatsApp.',
    chat_title: 'Live-Chat mit der Ärztin', chat_fee: 'Beratungsgebühr:',
    step1: 'Zahlen Sie die Beratungsgebühr mit einer der Zahlungsarten', step2: 'Senden Sie die Anfrage mit einem Foto des Belegs', step3: 'Nach Bestätigung durch die Praxis öffnet sich der Chat sofort',
    c_name: 'Name *', c_phone: 'Telefon / WhatsApp *', c_receipt: 'Foto des Zahlungsbelegs anhängen (optional)', c_note: 'Kurze Beschreibung Ihres Anliegens',
    c_send_req: 'Chat-Freischaltung anfragen', c_err: 'Bitte geben Sie Ihren Namen und eine gültige Telefonnummer ein',
    pending_status: 'Warten auf Zahlungsbestätigung', pending_title: 'Ihre Anfrage wird geprüft',
    pending_text: 'Die Ärztin oder das Praxisteam bestätigt Ihre Zahlung und öffnet den Chat. Er öffnet sich hier automatisch.',
    notify_wa: 'Praxis per WhatsApp informieren', cancel_req: 'Anfrage abbrechen',
    wa_fallback: (n) => `Hallo, ich habe auf der Website eine Live-Beratung unter dem Namen ${n} angefragt. Bitte bestätigen Sie meine Zahlung und öffnen Sie den Chat.`,
    rejected_status: 'Anfrage nicht bestätigt', rejected_title: 'Zahlung nicht bestätigt',
    rejected_text: 'Bitte prüfen Sie Ihre Zahlung und versuchen Sie es erneut oder kontaktieren Sie uns per WhatsApp.', new_req: 'Neue Anfrage senden',
    closed_status: 'Chat beendet', open_status: 'Online — Chat ist geöffnet', online: 'Online',
    opened: (n) => `Der Chat ist geöffnet. Hallo ${n}, schreiben Sie Ihre Frage an die Ärztin.`,
    closed_text: 'Dieser Chat wurde von der Praxis geschlossen.', new_consult: 'Neue Beratung anfragen',
    send_image: 'Bild senden', type_msg: 'Nachricht schreiben…', send: 'Senden', image: 'Bild',
    uploading: 'Bild wird hochgeladen…', upload_failed: 'Bild-Upload fehlgeschlagen', conn_error: 'Verbindung fehlgeschlagen, bitte erneut versuchen.',
    approved_toast: 'Zahlung bestätigt — Ihr Chat mit der Ärztin ist geöffnet ✓', typing: 'Die Ärztin schreibt…',
  },
};
UI.de.consent_after = 'zu.';

export const LANGS = ['ar', 'en', 'de'];
const LOCALES = { ar: 'ar-u-nu-latn', en: 'en-GB', de: 'de-DE' };
const KEY = 'dg_lang';

let current = 'ar';

export const lang = () => current;
export const locale = () => LOCALES[current];
export const isRTL = () => current === 'ar';

export function t(key, ...args) {
  const v = UI[current][key] ?? UI.ar[key];
  return typeof v === 'function' ? v(...args) : v ?? '';
}
export const langName = (l) => UI[l].langName;

// Language requested by the visitor (URL first, then their last choice).
export function preferredLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(q)) return q;
  try {
    const s = localStorage.getItem(KEY);
    if (LANGS.includes(s)) return s;
  } catch {}
  return null;
}

export function setLang(l, remember = false) {
  current = LANGS.includes(l) ? l : 'ar';
  document.documentElement.lang = current;
  document.documentElement.dir = current === 'ar' ? 'rtl' : 'ltr';
  if (remember) {
    try { localStorage.setItem(KEY, current); } catch {}
  }
  const url = new URL(location.href);
  url.searchParams.set('lang', current);
  history.replaceState(null, '', url);
  // Static texts marked in the HTML.
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
}

// Show booking times like "4:00 م" as "4:00 PM" (English) or "16:00" (German).
export function slotLabel(label) {
  if (current === 'ar') return label;
  const m = String(label).match(/^\s*(\d{1,2})(?::(\d{2}))?\s*(ص|م|am|pm)?\s*$/i);
  if (!m) return label;
  let h = Number(m[1]);
  const min = m[2] || '00';
  const ap = (m[3] || '').toLowerCase();
  if (current === 'en') {
    if (!ap) return label;
    return `${h}:${min} ${ap === 'م' || ap === 'pm' ? 'PM' : 'AM'}`;
  }
  if ((ap === 'م' || ap === 'pm') && h < 12) h += 12;
  if ((ap === 'ص' || ap === 'am') && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${min}`;
}

// Build the language picker (<select>) for the enabled languages.
export function languagePicker(languages, onChange) {
  const sel = document.createElement('select');
  sel.className = 'lang-select';
  sel.setAttribute('aria-label', t('language'));
  sel.innerHTML = languages.map((l) => `<option value="${l}" ${l === current ? 'selected' : ''}>${UI[l].langName}</option>`).join('');
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}
