// Default content used the first time the site runs.
// Everything here can be edited later from the admin dashboard (/admin).
// Arabic is the base language; `i18n.en` / `i18n.de` hold the English and German versions.

const { randomUUID } = require('crypto');
const id = () => randomUUID();

const PRIVACY_AR = `## من نحن
هذا الموقع تابع للعيادة المذكورة في أسفل الصفحة، وهي المسؤولة عن بياناتك.

## البيانات التي نجمعها
- عند حجز موعد: الاسم، رقم الهاتف، الخدمة، التاريخ والوقت، طريقة الدفع والملاحظات التي تكتبها.
- عند طلب استشارة بالدردشة: الاسم، رقم الهاتف، صورة إيصال الدفع (إن أرفقتها)، ونص الرسائل والصور التي ترسلها.
- لا نجمع بيانات بطاقات الدفع، ولا نستخدم أي أدوات تتبع أو إعلانات.

## لماذا نستخدمها
- لتنظيم المواعيد والتواصل معك بخصوصها.
- لتأكيد الدفع وتقديم الاستشارة الطبية عبر الدردشة.
- لا نبيع بياناتك ولا نشاركها مع أي جهة لأغراض تسويقية.

## من يطّلع عليها
الطبيبة وفريق العيادة المخوَّل فقط، عبر لوحة تحكم محمية بكلمة مرور. صور الإيصالات والدردشة خاصة ولا تظهر للعامة.

## واتساب وخدمات خارجية
- عند اختيار إرسال الحجز عبر واتساب، تُرسل الرسالة من حسابك إلى رقم العيادة وتخضع لسياسة خصوصية واتساب.
- قد يعرض الموقع خرائط Google أو فيديوهات YouTube وخطوط Google، وهذه الخدمات قد تستلم عنوان جهازك عند تحميلها.

## التخزين المحلي في متصفحك
نحفظ في متصفحك اللغة التي اخترتها ورمز جلسة الدردشة فقط، حتى تعود لمحادثتك. يمكنك حذفها بمسح بيانات الموقع من المتصفح.

## مدة الاحتفاظ
نحتفظ بالبيانات ما دامت لازمة لعلاجك والتزاماتنا القانونية، ثم تُحذف.

## حقوقك
يحق لك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها في أي وقت عبر وسائل التواصل الموجودة في الموقع.`;

const PRIVACY_EN = `## Who we are
This website belongs to the clinic named at the bottom of the page, which is responsible for your data.

## What we collect
- When you book an appointment: your name, phone number, service, date and time, payment method and any notes you write.
- When you request a chat consultation: your name, phone number, the payment receipt image (if attached), and the messages and images you send.
- We do not collect card details, and we do not use any tracking or advertising tools.

## Why we use it
- To organise appointments and contact you about them.
- To confirm payment and provide the medical consultation via chat.
- We never sell your data or share it with anyone for marketing.

## Who can see it
Only the doctor and authorised clinic staff, through a password-protected dashboard. Receipts and chat images are private and never public.

## WhatsApp and external services
- If you send your booking via WhatsApp, the message goes from your account to the clinic's number and is subject to WhatsApp's privacy policy.
- The site may show Google Maps, YouTube videos and Google Fonts; these services may receive your device's address when they load.

## Storage in your browser
We only store your chosen language and your chat session code in your browser, so you can return to your conversation. You can remove them by clearing this site's data in your browser.

## How long we keep it
We keep data as long as it is needed for your treatment and our legal obligations, then delete it.

## Your rights
You may ask to see, correct or delete your data at any time using the contact details on this site.`;

const PRIVACY_DE = `## Wer wir sind
Diese Website gehört der unten auf der Seite genannten Praxis, die für Ihre Daten verantwortlich ist.

## Welche Daten wir erheben
- Bei einer Terminbuchung: Name, Telefonnummer, Leistung, Datum und Uhrzeit, Zahlungsart sowie Ihre Anmerkungen.
- Bei einer Chat-Beratung: Name, Telefonnummer, Bild des Zahlungsbelegs (falls angehängt) sowie Ihre Nachrichten und Bilder.
- Wir erheben keine Kartendaten und verwenden keine Tracking- oder Werbetools.

## Wozu wir sie verwenden
- Zur Organisation von Terminen und zur Kontaktaufnahme dazu.
- Zur Bestätigung der Zahlung und zur ärztlichen Beratung per Chat.
- Wir verkaufen Ihre Daten nicht und geben sie nicht zu Werbezwecken weiter.

## Wer Zugriff hat
Nur die Ärztin und berechtigtes Praxispersonal über ein passwortgeschütztes Dashboard. Belege und Chat-Bilder sind privat und nie öffentlich.

## WhatsApp und externe Dienste
- Wenn Sie Ihre Buchung per WhatsApp senden, geht die Nachricht von Ihrem Konto an die Nummer der Praxis und unterliegt der Datenschutzerklärung von WhatsApp.
- Die Website kann Google Maps, YouTube-Videos und Google Fonts anzeigen; diese Dienste können beim Laden die Adresse Ihres Geräts erhalten.

## Speicherung in Ihrem Browser
Wir speichern in Ihrem Browser nur die gewählte Sprache und den Code Ihrer Chat-Sitzung, damit Sie zu Ihrem Gespräch zurückkehren können. Sie können diese Daten löschen, indem Sie die Websitedaten im Browser entfernen.

## Speicherdauer
Wir speichern Daten, solange sie für Ihre Behandlung und unsere gesetzlichen Pflichten erforderlich sind, und löschen sie danach.

## Ihre Rechte
Sie können jederzeit Auskunft, Berichtigung oder Löschung Ihrer Daten über die Kontaktangaben auf dieser Website verlangen.`;

module.exports = function seed() {
  return {
    settings: {
      clinicName: 'عيادة د. نور علي لطب الأسنان',
      doctorName: 'د. نور علي',
      doctorTitle: 'أخصائية طب وتجميل الأسنان',
      logoText: 'Dr. Noor Ali',
      logoImage: '',
      primaryColor: '#0f9b8e',
      show3D: true,
      languages: 'ar,en,de',
      defaultLang: 'ar',

      heroBadge: 'ابتسامتك تبدأ من هنا',
      heroTitle: 'ابتسامة صحية وجميلة بأحدث تقنيات طب الأسنان',
      heroSubtitle:
        'نقدّم لك رعاية متكاملة للأسنان بلمسة فنية وتقنيات حديثة، في بيئة مريحة وآمنة تمامًا.',
      heroImage: '',

      aboutTitle: 'عن الطبيبة',
      aboutText:
        'طبيبة أسنان بخبرة طويلة في تجميل الأسنان وزراعتها وتقويمها. أؤمن بأن كل ابتسامة فريدة، لذلك أضع خطة علاج مخصّصة لكل مريض تجمع بين الدقة الطبية واللمسة الجمالية.\n\nحاصلة على شهادات تخصصية من جامعات ومراكز معتمدة، وأحرص على مواكبة أحدث تقنيات العلاج الرقمي.',
      aboutHighlights:
        'بكالوريوس طب وجراحة الفم والأسنان\nزمالة في تجميل الأسنان\nعضو الجمعية الدولية لزراعة الأسنان\nأكثر من 10 سنوات خبرة',
      doctorPhoto: '',

      stats:
        '+10 | سنوات خبرة\n+5000 | مريض سعيد\n+1200 | حالة تجميل\n98% | رضا المرضى',

      servicesTitle: 'خدماتنا',
      servicesSubtitle: 'رعاية شاملة لصحة وجمال أسنانك',
      portfolioTitle: 'من أعمالنا',
      portfolioSubtitle: 'حالات حقيقية قبل وبعد العلاج',
      testimonialsTitle: 'آراء المرضى',
      testimonialsSubtitle: 'ثقتكم هي أجمل ابتسامة لنا',
      faqTitle: 'الأسئلة الشائعة',
      bookingTitle: 'احجز موعدك',
      bookingSubtitle: 'اختر الخدمة والوقت المناسب، وسيصل طلبك مباشرة إلى العيادة عبر واتساب.',
      contactTitle: 'تواصل معنا',

      whatsapp: '9647700000000',
      phone: '+964 770 000 0000',
      email: 'info@dr-noorali.com',
      address: 'بغداد - شارع الطبيب - بناية رقم 10',
      mapEmbed: '',
      workingHours: 'السبت - الخميس: 10:00 ص - 9:00 م\nالجمعة: مغلق',

      bookingSlots:
        '10:00 ص\n11:00 ص\n12:00 م\n1:00 م\n4:00 م\n5:00 م\n6:00 م\n7:00 م\n8:00 م',
      closedDays: '5', // 0 = Sunday ... 5 = Friday, 6 = Saturday (comma separated)
      bookingNote: 'سيتم تأكيد الموعد من قبل العيادة عبر واتساب.',

      chatEnabled: true,
      chatPrice: '25,000 د.ع',
      chatIntro:
        'استشارة مباشرة مع الطبيبة عبر الدردشة. بعد الدفع وتأكيده من العيادة، يتم فتح المحادثة لك فورًا.',

      instagram: '',
      facebook: '',
      tiktok: '',
      snapchat: '',
      youtube: '',

      footerText: 'جميع الحقوق محفوظة',
      seoDescription: 'عيادة طب وتجميل الأسنان - زراعة، تقويم، تبييض، ابتسامة هوليود وحجز مواعيد أونلاين.',
      privacyPolicy: PRIVACY_AR,

      i18n: {
        en: {
          clinicName: 'Dr. Noor Ali Dental Clinic',
          doctorName: 'Dr. Noor Ali',
          doctorTitle: 'Cosmetic & General Dentist',
          heroBadge: 'Your smile starts here',
          heroTitle: 'A healthy, beautiful smile with the latest in dentistry',
          heroSubtitle: 'Complete dental care with an artistic touch and modern technology, in a calm and completely safe setting.',
          aboutTitle: 'About the doctor',
          aboutText:
            'A dentist with long experience in cosmetic dentistry, implants and orthodontics. I believe every smile is unique, so I design a personal treatment plan for each patient that combines medical precision with aesthetics.\n\nI hold specialist certificates from accredited universities and centres, and I keep up with the latest digital treatment techniques.',
          aboutHighlights:
            'Bachelor of Dental Surgery\nFellowship in Cosmetic Dentistry\nMember of the International Implant Association\n10+ years of experience',
          stats: '+10 | Years of experience\n+5000 | Happy patients\n+1200 | Smile makeovers\n98% | Patient satisfaction',
          servicesTitle: 'Our services',
          servicesSubtitle: 'Complete care for healthy, beautiful teeth',
          portfolioTitle: 'Our work',
          portfolioSubtitle: 'Real cases, before and after treatment',
          testimonialsTitle: 'Patient reviews',
          testimonialsSubtitle: 'Your trust is our best smile',
          faqTitle: 'Frequently asked questions',
          bookingTitle: 'Book your appointment',
          bookingSubtitle: 'Choose a service and a time that suits you — your request goes straight to the clinic on WhatsApp.',
          contactTitle: 'Contact us',
          address: 'Baghdad – Doctors Street – Building 10',
          workingHours: 'Saturday – Thursday: 10:00 AM – 9:00 PM\nFriday: Closed',
          bookingNote: 'The clinic will confirm your appointment on WhatsApp.',
          chatPrice: '25,000 IQD',
          chatIntro: 'A live chat consultation with the doctor. Once your payment is confirmed by the clinic, the chat opens for you instantly.',
          footerText: 'All rights reserved',
          seoDescription: 'Cosmetic and general dental clinic – implants, orthodontics, whitening, Hollywood smile and online booking.',
          privacyPolicy: PRIVACY_EN,
        },
        de: {
          clinicName: 'Zahnarztpraxis Dr. Noor Ali',
          doctorName: 'Dr. Noor Ali',
          doctorTitle: 'Zahnärztin für ästhetische Zahnheilkunde',
          heroBadge: 'Ihr Lächeln beginnt hier',
          heroTitle: 'Ein gesundes, schönes Lächeln mit modernster Zahnmedizin',
          heroSubtitle: 'Umfassende Zahnpflege mit ästhetischem Gespür und moderner Technik – in ruhiger und sicherer Atmosphäre.',
          aboutTitle: 'Über die Ärztin',
          aboutText:
            'Zahnärztin mit langjähriger Erfahrung in ästhetischer Zahnheilkunde, Implantologie und Kieferorthopädie. Jedes Lächeln ist einzigartig – deshalb erstelle ich für jede Patientin und jeden Patienten einen persönlichen Behandlungsplan, der medizinische Präzision mit Ästhetik verbindet.\n\nIch besitze Fachzertifikate anerkannter Universitäten und Zentren und arbeite stets mit den neuesten digitalen Behandlungsmethoden.',
          aboutHighlights:
            'Studium der Zahnmedizin\nFellowship in ästhetischer Zahnheilkunde\nMitglied der Internationalen Implantologie-Gesellschaft\nÜber 10 Jahre Erfahrung',
          stats: '+10 | Jahre Erfahrung\n+5000 | Zufriedene Patienten\n+1200 | Ästhetische Behandlungen\n98% | Zufriedenheit',
          servicesTitle: 'Unsere Leistungen',
          servicesSubtitle: 'Rundum-Versorgung für gesunde, schöne Zähne',
          portfolioTitle: 'Unsere Arbeiten',
          portfolioSubtitle: 'Echte Fälle – vor und nach der Behandlung',
          testimonialsTitle: 'Patientenstimmen',
          testimonialsSubtitle: 'Ihr Vertrauen ist unser schönstes Lächeln',
          faqTitle: 'Häufige Fragen',
          bookingTitle: 'Termin buchen',
          bookingSubtitle: 'Wählen Sie Leistung und Uhrzeit – Ihre Anfrage geht direkt per WhatsApp an die Praxis.',
          contactTitle: 'Kontakt',
          address: 'Bagdad – Ärztestraße – Gebäude 10',
          workingHours: 'Samstag – Donnerstag: 10:00 – 21:00 Uhr\nFreitag: geschlossen',
          bookingNote: 'Die Praxis bestätigt Ihren Termin per WhatsApp.',
          chatPrice: '25.000 IQD',
          chatIntro: 'Live-Chat-Beratung mit der Ärztin. Sobald die Praxis Ihre Zahlung bestätigt, wird der Chat sofort freigeschaltet.',
          footerText: 'Alle Rechte vorbehalten',
          seoDescription: 'Zahnarztpraxis für ästhetische Zahnheilkunde – Implantate, Kieferorthopädie, Bleaching, Hollywood-Lächeln und Online-Terminbuchung.',
          privacyPolicy: PRIVACY_DE,
        },
      },
    },

    services: [
      { id: id(), icon: 'sparkle', title: 'تبييض الأسنان', description: 'تبييض آمن بالليزر يمنحك ابتسامة أكثر إشراقًا من الجلسة الأولى.', price: '', image: '',
        i18n: { en: { title: 'Teeth whitening', description: 'Safe laser whitening for a brighter smile from the very first session.' }, de: { title: 'Bleaching', description: 'Sicheres Laser-Bleaching für ein strahlenderes Lächeln ab der ersten Sitzung.' } } },
      { id: id(), icon: 'smile', title: 'ابتسامة هوليود', description: 'فينير وعدسات لاصقة مصممة رقميًا لتناسب ملامح وجهك.', price: '', image: '',
        i18n: { en: { title: 'Hollywood smile', description: 'Digitally designed veneers tailored to your facial features.' }, de: { title: 'Hollywood-Lächeln', description: 'Digital geplante Veneers, passend zu Ihren Gesichtszügen.' } } },
      { id: id(), icon: 'implant', title: 'زراعة الأسنان', description: 'زراعة فورية بأنظمة عالمية وضمان طويل الأمد.', price: '', image: '',
        i18n: { en: { title: 'Dental implants', description: 'Immediate implants with world-class systems and a long-term guarantee.' }, de: { title: 'Zahnimplantate', description: 'Sofortimplantate mit weltweit führenden Systemen und langer Garantie.' } } },
      { id: id(), icon: 'braces', title: 'تقويم الأسنان', description: 'تقويم شفاف وتقليدي لتصحيح الإطباق وترتيب الأسنان.', price: '', image: '',
        i18n: { en: { title: 'Orthodontics', description: 'Clear aligners and traditional braces to straighten teeth and correct the bite.' }, de: { title: 'Kieferorthopädie', description: 'Unsichtbare Aligner und klassische Zahnspangen für gerade Zähne und korrekten Biss.' } } },
      { id: id(), icon: 'tooth', title: 'علاج العصب', description: 'علاج جذور دقيق وبدون ألم باستخدام أحدث الأجهزة.', price: '', image: '',
        i18n: { en: { title: 'Root canal treatment', description: 'Precise, pain-free root canal treatment with the latest equipment.' }, de: { title: 'Wurzelbehandlung', description: 'Präzise, schmerzfreie Wurzelbehandlung mit modernsten Geräten.' } } },
      { id: id(), icon: 'shield', title: 'تنظيف ووقاية', description: 'تنظيف وتلميع دوري وفحص شامل للحفاظ على صحة اللثة.', price: '', image: '',
        i18n: { en: { title: 'Cleaning & prevention', description: 'Regular cleaning, polishing and full check-ups for healthy gums.' }, de: { title: 'Prophylaxe', description: 'Regelmäßige Reinigung, Politur und Kontrolle für gesundes Zahnfleisch.' } } },
    ],

    portfolio: [
      { id: id(), title: 'ابتسامة هوليود كاملة', category: 'تجميل', description: 'فينير لعشرين سنًا مع تصميم ابتسامة رقمي.', before: '', after: '', images: '', video: '',
        i18n: { en: { title: 'Full Hollywood smile', category: 'Cosmetic', description: 'Veneers on twenty teeth with digital smile design.' }, de: { title: 'Komplettes Hollywood-Lächeln', category: 'Ästhetik', description: 'Veneers an zwanzig Zähnen mit digitalem Smile-Design.' } } },
      { id: id(), title: 'زراعة فورية', category: 'زراعة', description: 'زراعة سن أمامي مع تركيب تاج مؤقت في نفس اليوم.', before: '', after: '', images: '', video: '',
        i18n: { en: { title: 'Immediate implant', category: 'Implants', description: 'Front tooth implant with a temporary crown on the same day.' }, de: { title: 'Sofortimplantat', category: 'Implantate', description: 'Implantat im Frontzahnbereich mit provisorischer Krone am selben Tag.' } } },
      { id: id(), title: 'تقويم شفاف', category: 'تقويم', description: 'تصحيح ازدحام الأسنان خلال 9 أشهر.', before: '', after: '', images: '', video: '',
        i18n: { en: { title: 'Clear aligners', category: 'Orthodontics', description: 'Crowded teeth corrected in 9 months.' }, de: { title: 'Unsichtbare Aligner', category: 'Kieferorthopädie', description: 'Zahnengstand in 9 Monaten korrigiert.' } } },
      { id: id(), title: 'تبييض بالليزر', category: 'تجميل', description: 'نتيجة جلسة تبييض واحدة.', before: '', after: '', images: '', video: '',
        i18n: { en: { title: 'Laser whitening', category: 'Cosmetic', description: 'Result after a single whitening session.' }, de: { title: 'Laser-Bleaching', category: 'Ästhetik', description: 'Ergebnis nach nur einer Bleaching-Sitzung.' } } },
    ],

    testimonials: [
      { id: id(), name: 'سارة أحمد', text: 'تجربة رائعة! الطبيبة محترفة جدًا والنتيجة فاقت توقعاتي.', rating: 5, photo: '',
        i18n: { en: { name: 'Sara Ahmed', text: 'A wonderful experience! The doctor is very professional and the result exceeded my expectations.' }, de: { name: 'Sara Ahmed', text: 'Eine wunderbare Erfahrung! Die Ärztin ist sehr professionell und das Ergebnis hat meine Erwartungen übertroffen.' } } },
      { id: id(), name: 'محمد علي', text: 'أخيرًا وجدت طبيبة أسنان أثق بها. لم أشعر بأي ألم.', rating: 5, photo: '',
        i18n: { en: { name: 'Mohammed Ali', text: 'I finally found a dentist I trust. I felt no pain at all.' }, de: { name: 'Mohammed Ali', text: 'Endlich eine Zahnärztin, der ich vertraue. Ich hatte keinerlei Schmerzen.' } } },
      { id: id(), name: 'نور حسين', text: 'العيادة نظيفة ومريحة والتعامل راقٍ جدًا.', rating: 5, photo: '',
        i18n: { en: { name: 'Noor Hussein', text: 'The clinic is clean and comfortable, and the staff are wonderful.' }, de: { name: 'Noor Hussein', text: 'Die Praxis ist sauber und angenehm, das Team ist sehr freundlich.' } } },
    ],

    faq: [
      { id: id(), question: 'هل جلسة التبييض مؤلمة؟', answer: 'لا، قد يشعر البعض بحساسية خفيفة مؤقتة تزول خلال يوم أو يومين.',
        i18n: { en: { question: 'Is whitening painful?', answer: 'No. Some people feel slight, temporary sensitivity that goes away within a day or two.' }, de: { question: 'Ist Bleaching schmerzhaft?', answer: 'Nein. Manche spüren eine leichte, vorübergehende Empfindlichkeit, die nach ein bis zwei Tagen verschwindet.' } } },
      { id: id(), question: 'كم تستغرق زراعة الأسنان؟', answer: 'تختلف حسب الحالة، وفي كثير من الحالات يمكن الزراعة والتحميل الفوري في نفس اليوم.',
        i18n: { en: { question: 'How long does an implant take?', answer: 'It depends on the case; in many cases the implant and crown can be placed on the same day.' }, de: { question: 'Wie lange dauert ein Implantat?', answer: 'Das hängt vom Fall ab; oft können Implantat und Krone am selben Tag eingesetzt werden.' } } },
      { id: id(), question: 'كيف أحجز موعدًا؟', answer: 'من قسم "احجز موعدك" اختر الخدمة والتاريخ والوقت، وسيتم إرسال طلبك عبر واتساب للعيادة لتأكيده.',
        i18n: { en: { question: 'How do I book an appointment?', answer: 'In the "Book your appointment" section choose a service, date and time — your request is sent to the clinic on WhatsApp for confirmation.' }, de: { question: 'Wie buche ich einen Termin?', answer: 'Wählen Sie im Bereich „Termin buchen“ Leistung, Datum und Uhrzeit – Ihre Anfrage wird zur Bestätigung per WhatsApp an die Praxis gesendet.' } } },
    ],

    paymentMethods: [
      { id: id(), name: 'زين كاش', details: '07700000000', instructions: 'حوّل المبلغ إلى الرقم ثم أرفق صورة إيصال التحويل.', enabled: true,
        i18n: { en: { name: 'Zain Cash', instructions: 'Transfer the amount to this number, then attach a photo of the receipt.' }, de: { name: 'Zain Cash', instructions: 'Überweisen Sie den Betrag an diese Nummer und hängen Sie ein Foto des Belegs an.' } } },
      { id: id(), name: 'تحويل بنكي', details: 'IBAN: IQ00 0000 0000 0000 0000', instructions: 'اكتب اسمك في ملاحظة التحويل.', enabled: true,
        i18n: { en: { name: 'Bank transfer', instructions: 'Write your name in the transfer reference.' }, de: { name: 'Banküberweisung', instructions: 'Geben Sie Ihren Namen im Verwendungszweck an.' } } },
      { id: id(), name: 'نقدًا في العيادة', details: '', instructions: 'الدفع عند الحضور (للحجوزات فقط).', enabled: true,
        i18n: { en: { name: 'Cash at the clinic', instructions: 'Pay when you arrive (appointments only).' }, de: { name: 'Bar in der Praxis', instructions: 'Zahlung vor Ort (nur für Termine).' } } },
    ],

    users: [],
    bookings: [],
    chats: [],
  };
};
