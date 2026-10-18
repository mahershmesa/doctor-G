// Default content used the first time the site runs.
// Everything here can be edited later from the admin dashboard (/admin).

const { randomUUID } = require('crypto');
const id = () => randomUUID();

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
    },

    services: [
      { id: id(), icon: 'sparkle', title: 'تبييض الأسنان', description: 'تبييض آمن بالليزر يمنحك ابتسامة أكثر إشراقًا من الجلسة الأولى.', price: '', image: '' },
      { id: id(), icon: 'smile', title: 'ابتسامة هوليود', description: 'فينير وعدسات لاصقة مصممة رقميًا لتناسب ملامح وجهك.', price: '', image: '' },
      { id: id(), icon: 'implant', title: 'زراعة الأسنان', description: 'زراعة فورية بأنظمة عالمية وضمان طويل الأمد.', price: '', image: '' },
      { id: id(), icon: 'braces', title: 'تقويم الأسنان', description: 'تقويم شفاف وتقليدي لتصحيح الإطباق وترتيب الأسنان.', price: '', image: '' },
      { id: id(), icon: 'tooth', title: 'علاج العصب', description: 'علاج جذور دقيق وبدون ألم باستخدام أحدث الأجهزة.', price: '', image: '' },
      { id: id(), icon: 'shield', title: 'تنظيف ووقاية', description: 'تنظيف وتلميع دوري وفحص شامل للحفاظ على صحة اللثة.', price: '', image: '' },
    ],

    portfolio: [
      { id: id(), title: 'ابتسامة هوليود كاملة', category: 'تجميل', description: 'فينير لعشرين سنًا مع تصميم ابتسامة رقمي.', before: '', after: '', images: '', video: '' },
      { id: id(), title: 'زراعة فورية', category: 'زراعة', description: 'زراعة سن أمامي مع تركيب تاج مؤقت في نفس اليوم.', before: '', after: '', images: '', video: '' },
      { id: id(), title: 'تقويم شفاف', category: 'تقويم', description: 'تصحيح ازدحام الأسنان خلال 9 أشهر.', before: '', after: '', images: '', video: '' },
      { id: id(), title: 'تبييض بالليزر', category: 'تجميل', description: 'نتيجة جلسة تبييض واحدة.', before: '', after: '', images: '', video: '' },
    ],

    testimonials: [
      { id: id(), name: 'سارة أحمد', text: 'تجربة رائعة! الطبيبة محترفة جدًا والنتيجة فاقت توقعاتي.', rating: 5, photo: '' },
      { id: id(), name: 'محمد علي', text: 'أخيرًا وجدت طبيبة أسنان أثق بها. لم أشعر بأي ألم.', rating: 5, photo: '' },
      { id: id(), name: 'نور حسين', text: 'العيادة نظيفة ومريحة والتعامل راقٍ جدًا.', rating: 5, photo: '' },
    ],

    faq: [
      { id: id(), question: 'هل جلسة التبييض مؤلمة؟', answer: 'لا، قد يشعر البعض بحساسية خفيفة مؤقتة تزول خلال يوم أو يومين.' },
      { id: id(), question: 'كم تستغرق زراعة الأسنان؟', answer: 'تختلف حسب الحالة، وفي كثير من الحالات يمكن الزراعة والتحميل الفوري في نفس اليوم.' },
      { id: id(), question: 'كيف أحجز موعدًا؟', answer: 'من قسم "احجز موعدك" اختر الخدمة والتاريخ والوقت، وسيتم إرسال طلبك عبر واتساب للعيادة لتأكيده.' },
    ],

    paymentMethods: [
      { id: id(), name: 'زين كاش', details: '07700000000', instructions: 'حوّل المبلغ إلى الرقم ثم أرفق صورة إيصال التحويل.', enabled: true },
      { id: id(), name: 'تحويل بنكي', details: 'IBAN: IQ00 0000 0000 0000 0000', instructions: 'اكتب اسمك في ملاحظة التحويل.', enabled: true },
      { id: id(), name: 'نقدًا في العيادة', details: '', instructions: 'الدفع عند الحضور (للحجوزات فقط).', enabled: true },
    ],

    users: [],
    bookings: [],
    chats: [],
  };
};
