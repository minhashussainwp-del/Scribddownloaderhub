export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  isDefault: boolean;
  enabled: boolean;
}

export interface ContentSwitcherSectionItem {
  id: string;
  tabLabel: string;
  badgeText?: string;
  title: string;
  contentHtml: string;
}

export interface UIStringTranslations {
  heroTitle: string;
  heroSubtitle: string;
  inputPlaceholder: string;
  fetchBtn: string;
  fetchingBtn: string;
  downloadPdfBtn: string;
  downloadingBtn: string;
  tutorialHeading: string;
  tutorialSubheading: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  navDownloader: string;
  navBlog: string;
  navTutorial: string;
  navAdmin: string;
  customHomeHtml: string;
  homeSwitcherSections: ContentSwitcherSectionItem[];
}

export interface AdSlotConfig {
  id: string;
  name: string;
  locationDescription: string;
  dimensions: string;
  enabled: boolean;
  htmlCode: string;
}

export interface BlogPostItem {
  id: string;
  slug: string;
  lang: string;
  translationGroupId: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  switcherSections?: ContentSwitcherSectionItem[];
  author: string;
  publishedAt: string;
  status: 'published' | 'draft';
  seoTitle?: string;
  seoDescription?: string;
}

export interface CustomPageItem {
  id: string;
  slug: string;
  lang: string;
  translationGroupId: string;
  title: string;
  contentHtml: string;
  switcherSections: ContentSwitcherSectionItem[];
  showInHeader: boolean;
  showInFooter: boolean;
  status: 'published' | 'draft';
  seoTitle?: string;
  seoDescription?: string;
}

export interface SeoLanguageConfig {
  siteTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  robotsMeta: string;
  schemaJsonLd: string;
  customHeadHtml: string;
}

export interface CmsStoreState {
  activeLanguage: string;
  languages: LanguageConfig[];
  translations: Record<string, UIStringTranslations>;
  ads: AdSlotConfig[];
  blogPosts: BlogPostItem[];
  pages: CustomPageItem[];
  seo: Record<string, SeoLanguageConfig>;
}

export const CMS_STORAGE_KEY = 'scribddownloader_cms_v3';

const DEFAULT_HOME_SWITCHER_EN: ContentSwitcherSectionItem[] = [
  {
    id: 'tab-features',
    tabLabel: 'Why Use Our Downloader',
    badgeText: 'Core Features',
    title: '100% Original High-Resolution Scribd PDF Extraction',
    contentHtml: `<p>Unlike basic screenshot tools that only capture blurry previews, our engine parses the complete Scribd document manifest (<code class="font-mono">Page 1</code> to <code class="font-mono">Page N</code>) and extracts the original raster scans and text layers in parallel.</p>
<ul>
  <li><strong>Complete Page Number Verification:</strong> Every page number is detected and verified before PDF compilation starts.</li>
  <li><strong>24x Parallel Stream Compiler:</strong> Downloads up to 24 high-resolution page scans simultaneously for maximum speed.</li>
  <li><strong>5-Gateway Anti-IP-Block Relay:</strong> Automatically rotates across 5 global proxy gateways so downloads never fail.</li>
</ul>`
  },
  {
    id: 'tab-faq',
    tabLabel: 'Frequently Asked Questions (FAQ)',
    badgeText: 'Help & FAQ',
    title: 'Common Questions About Downloading Scribd PDFs',
    contentHtml: `<div class="space-y-3">
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-lg">
    <h4 class="font-bold text-slate-900 text-sm">1. Why were some PDFs showing blank on other websites?</h4>
    <p class="text-xs text-slate-600 mt-1">Scribd uses separate cryptographic hashes for JSONP page manifests and JPEG scan images. Our engine inspects each page's JSONP stream in parallel to retrieve the true image hash and validates JPEG/PNG magic bytes so no page is ever blank.</p>
  </div>
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-lg">
    <h4 class="font-bold text-slate-900 text-sm">2. Can I download 100+ page books and presentations?</h4>
    <p class="text-xs text-slate-600 mt-1">Yes! Both the direct 24x Parallel PDF Compiler and the Fullscreen Vector Reader support full-length books, academic papers, and slide decks.</p>
  </div>
</div>`
  },
  {
    id: 'tab-supported',
    tabLabel: 'Supported URL Formats',
    badgeText: 'Compatibility',
    title: 'All Supported Scribd Links & Document Types',
    contentHtml: `<p>You can paste any of the following Scribd URL formats or raw numeric IDs into the downloader box:</p>
<ul>
  <li><code class="font-mono">https://www.scribd.com/document/123456789/Document-Title</code></li>
  <li><code class="font-mono">https://www.scribd.com/doc/123456789/Study-Notes</code></li>
  <li><code class="font-mono">https://www.scribd.com/presentation/123456789/Slide-Deck</code></li>
  <li><code class="font-mono">https://www.scribd.com/embeds/123456789/content</code></li>
  <li>Direct Numeric ID: <code class="font-mono">436350615</code></li>
</ul>`
  }
];

const DEFAULT_HOME_SWITCHER_UR: ContentSwitcherSectionItem[] = [
  {
    id: 'tab-ur-features',
    tabLabel: 'ہمارے ڈاؤنلوڈر کی خصوصیات',
    badgeText: 'Features',
    title: '100% اوریجنل ہائی کوالٹی Scribd PDF ڈاؤنلوڈ',
    contentHtml: `<p>ہمارا سسٹم پہلے ڈاکومنٹ کے تمام صفحات (<code class="font-mono">Page 1</code> سے <code class="font-mono">Page N</code> تک) نمبر کے ساتھ ڈیٹیکٹ کرتا ہے اور پھر اوریجنل امیجز اور ٹیکسٹ کو ملا کر مکمل PDF فائل بناتا ہے تاکہ کوئی بھی صفحہ خالی نہ رہے۔</p>`
  },
  {
    id: 'tab-ur-faq',
    tabLabel: 'عام پوچھے گئے سوالات (FAQ)',
    badgeText: 'سوالات',
    title: 'ڈاؤنلوڈنگ کے متعلق اہم سوالات اور جوابات',
    contentHtml: `<p><strong>سوال: کیا بڑی کتابیں بھی ڈاؤنلوڈ ہو سکتی ہیں؟</strong><br/>جواب: جی ہاں! آپ جتنے مرضی صفحات کی کتاب یا نوٹس بالکل مفت ڈاؤنلوڈ کر سکتے ہیں۔</p>`
  }
];

export const DEFAULT_CMS_STATE: CmsStoreState = {
  activeLanguage: 'en',
  languages: [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
      dir: 'ltr',
      isDefault: true,
      enabled: true
    },
    {
      code: 'ur',
      name: 'Urdu / Roman Urdu',
      nativeName: 'اردو / Roman',
      flag: '🇵🇰',
      dir: 'ltr',
      isDefault: false,
      enabled: true
    },
    {
      code: 'hi',
      name: 'Hindi',
      nativeName: 'हिन्दी',
      flag: '🇮🇳',
      dir: 'ltr',
      isDefault: false,
      enabled: true
    },
    {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      flag: '🇪🇸',
      dir: 'ltr',
      isDefault: false,
      enabled: true
    },
    {
      code: 'ar',
      name: 'Arabic',
      nativeName: 'العربية',
      flag: '🇸🇦',
      dir: 'rtl',
      isDefault: false,
      enabled: true
    }
  ],
  translations: {
    en: {
      heroTitle: 'Free Scribd PDF Downloader',
      heroSubtitle:
        'Paste any Scribd document URL below, click Fetch for instant full-page detection, and click Download PDF for high-speed parallel PDF download.',
      inputPlaceholder: 'https://www.scribd.com/document/436350615/Sample-PDF-Document',
      fetchBtn: 'Fetch',
      fetchingBtn: 'Fetching Pages...',
      downloadPdfBtn: 'Download PDF',
      downloadingBtn: 'Downloading PDF...',
      tutorialHeading: 'How to Download Scribd PDF Documents (Step-by-Step Tutorial)',
      tutorialSubheading:
        'Follow these 3 easy steps to detect all pages and download the original PDF file at maximum speed:',
      step1Title: 'Copy & Paste Document Link',
      step1Desc:
        'Copy the link of any Scribd document, book, or presentation and paste it into the input box above.',
      step2Title: 'Instant Page Number Detection',
      step2Desc:
        'Click the Fetch button. Our engine races multiple gateways in parallel and detects all page numbers (Page 1 to Page N) in under a second.',
      step3Title: '24x Parallel PDF Download',
      step3Desc:
        'Click the blue Download PDF button to download 24 pages simultaneously and assemble the complete original PDF in seconds.',
      navDownloader: 'Downloader',
      navBlog: 'Blog',
      navTutorial: 'How to Download',
      navAdmin: 'Admin Panel',
      customHomeHtml: '',
      homeSwitcherSections: DEFAULT_HOME_SWITCHER_EN
    },
    ur: {
      heroTitle: 'مفت Scribd PDF ڈاؤنلوڈر (Free Scribd Downloader)',
      heroSubtitle:
        'اپنا Scribd لنک نیچے پیسٹ کریں، تمام صفحات نمبر کے ساتھ لوڈ کرنے کے لیے Fetch پر کلک کریں، اور اوریجنل فائل کے لیے Download PDF دبائیں۔',
      inputPlaceholder: 'https://www.scribd.com/document/436350615/Sample-PDF-Document',
      fetchBtn: 'Fetch (صفحات تلاش کریں)',
      fetchingBtn: 'صفحات لوڈ ہو رہے ہیں...',
      downloadPdfBtn: 'Download PDF',
      downloadingBtn: 'ڈاؤنلوڈ ہو رہا ہے...',
      tutorialHeading: 'Scribd سے اوریجنل PDF کیسے ڈاؤنلوڈ کریں؟ (مکمل طریقہ)',
      tutorialSubheading:
        'ان 3 آسان مراحل پر عمل کر کے کسی بھی Scribd ڈاکومنٹ کے تمام صفحات اوریجنل کوالٹی میں ڈاؤنلوڈ کریں:',
      step1Title: 'لنک کاپی اور پیسٹ کریں',
      step1Desc:
        'اپنے مطلوبہ Scribd ڈاکومنٹ یا کتاب کا لنک کاپی کر کے اوپر دیے گئے باکس میں پیسٹ کریں۔',
      step2Title: 'Fetch بٹن پر کلک کریں',
      step2Desc:
        'Fetch بٹن دباتے ہی تمام صفحات (Page 1 سے Page N تک) ایک سیکنڈ میں نمبر کے ساتھ شو ہو جائیں گے۔',
      step3Title: 'Download PDF پر کلک کریں',
      step3Desc:
        'اب نیلے رنگ کے Download PDF بٹن پر کلک کریں، آپ کی مکمل اوریجنل PDF فائل فوراً ڈاؤنلوڈ ہو جائے گی۔',
      navDownloader: 'ڈاؤنلوڈر',
      navBlog: 'بلاگ',
      navTutorial: 'ڈاؤنلوڈ کا طریقہ',
      navAdmin: 'ایڈمن پینل',
      customHomeHtml: '',
      homeSwitcherSections: DEFAULT_HOME_SWITCHER_UR
    },
    hi: {
      heroTitle: 'मुफ़्त Scribd PDF डाउनलोडर',
      heroSubtitle:
        'नीचे कोई भी Scribd दस्तावेज़ लिंक पेस्ट करें, सभी पेज नंबर डिटेक्ट करने के लिए Fetch पर क्लिक करें और ओरिजिनल फाइल के लिए Download PDF दबाएं।',
      inputPlaceholder: 'https://www.scribd.com/document/436350615/Sample-PDF-Document',
      fetchBtn: 'Fetch',
      fetchingBtn: 'पेज लोड हो रहे हैं...',
      downloadPdfBtn: 'Download PDF',
      downloadingBtn: 'डाउनलोड हो रहा है...',
      tutorialHeading: 'Scribd PDF दस्तावेज़ कैसे डाउनलोड करें (स्टेप-बाय-स्टेप ट्यूटोरियल)',
      tutorialSubheading:
        'सभी पेजों को डिटेक्ट करने और ओरिजिनल PDF फाइल को तेजी से डाउनलोड करने के लिए इन 3 आसान चरणों का पालन करें:',
      step1Title: 'दस्तावेज़ लिंक कॉपी और पेस्ट करें',
      step1Desc:
        'किसी भी Scribd दस्तावेज़ या पुस्तक का लिंक कॉपी करें और ऊपर दिए गए बॉक्स में पेस्ट करें।',
      step2Title: 'Fetch बटन पर क्लिक करें',
      step2Desc:
        'Fetch बटन पर क्लिक करें। हमारा इंजन 1 सेकंड से भी कम समय में सभी पेज नंबर (Page 1 से Page N) डिटेक्ट कर लेता है।',
      step3Title: 'Download PDF पर क्लिक करें',
      step3Desc:
        'पूरी ओरिजिनल मल्टी-पेज PDF फाइल को तुरंत सेव करने के लिए नीले Download PDF बटन पर क्लिक करें।',
      navDownloader: 'डाउनलोडर',
      navBlog: 'ब्लॉग',
      navTutorial: 'कैसे डाउनलोड करें',
      navAdmin: 'एडमिन पैनल',
      customHomeHtml: '',
      homeSwitcherSections: DEFAULT_HOME_SWITCHER_EN
    },
    es: {
      heroTitle: 'Descargador de PDF de Scribd Gratis',
      heroSubtitle:
        'Pegue cualquier enlace de documento de Scribd a continuación, haga clic en Fetch para detectar todas las páginas al instante y descargue el PDF original.',
      inputPlaceholder: 'https://www.scribd.com/document/436350615/Sample-PDF-Document',
      fetchBtn: 'Fetch',
      fetchingBtn: 'Buscando páginas...',
      downloadPdfBtn: 'Download PDF',
      downloadingBtn: 'Descargando PDF...',
      tutorialHeading: 'Cómo Descargar Documentos PDF de Scribd (Tutorial Paso a Paso)',
      tutorialSubheading:
        'Siga estos 3 sencillos pasos para detectar todas las páginas y descargar el archivo PDF original a máxima velocidad:',
      step1Title: 'Copiar y Pegar Enlace de Scribd',
      step1Desc:
        'Copie el enlace de cualquier documento, libro o presentación de Scribd y péguelo en el cuadro de búsqueda superior.',
      step2Title: 'Haga clic en Fetch (Detección Instantánea)',
      step2Desc:
        'Haga clic en el botón Fetch para detectar todos los números de página (Página 1 a Página N) en menos de un segundo.',
      step3Title: 'Haga clic en Download PDF',
      step3Desc:
        'Presione el botón azul Download PDF para ensamblar y guardar el documento completo en alta resolución.',
      navDownloader: 'Descargador',
      navBlog: 'Blog',
      navTutorial: 'Cómo Descargar',
      navAdmin: 'Panel Admin',
      customHomeHtml: '',
      homeSwitcherSections: DEFAULT_HOME_SWITCHER_EN
    },
    ar: {
      heroTitle: 'تحميل ملفات PDF من Scribd مجاناً',
      heroSubtitle:
        'الصق رابط مستند Scribd أدناه، واضغط على Fetch لاكتشاف جميع الصفحات فوراً، ثم اضغط على Download PDF لتحميل الملف الأصلي.',
      inputPlaceholder: 'https://www.scribd.com/document/436350615/Sample-PDF-Document',
      fetchBtn: 'Fetch',
      fetchingBtn: 'جاري فحص الصفحات...',
      downloadPdfBtn: 'Download PDF',
      downloadingBtn: 'جاري التحميل...',
      tutorialHeading: 'كيفية تحميل مستندات PDF من Scribd (شرح خطوة بخطوة)',
      tutorialSubheading:
        'اتبع هذه الخطوات الثلاث البسيطة لاكتشاف كافة الصفحات وتحميل ملف PDF الأصلي بأقصى سرعة:',
      step1Title: 'انسخ والصق رابط المستند',
      step1Desc: 'انسخ رابط أي مستند أو كتاب من موقع Scribd والصقه في مربع الإدخال أعلاه.',
      step2Title: 'اضغط على زر Fetch',
      step2Desc: 'سيقوم النظام باكتشاف جميع أرقام الصفحات من الصفحة الأولى وحتى الأخيرة في أقل من ثانية.',
      step3Title: 'اضغط على زر Download PDF',
      step3Desc: 'اضغط على الزر الأزرق لتحميل ملف PDF الأصلي كاملاً بدقة عالية فوراً.',
      navDownloader: 'التحميل',
      navBlog: 'المدونة',
      navTutorial: 'طريقة التحميل',
      navAdmin: 'لوحة التحكم',
      customHomeHtml: '',
      homeSwitcherSections: DEFAULT_HOME_SWITCHER_EN
    }
  },
  ads: [
    {
      id: 'header-leaderboard',
      name: 'Top Header Leaderboard (728×90)',
      locationDescription: 'Displayed above the main Scribd URL input box',
      dimensions: '728×90 / Responsive',
      enabled: false,
      htmlCode: `<div style="background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:8px;padding:16px;text-align:center;font-size:12px;color:#475569;">
  <strong>Advertisement Space (728×90 Top Leaderboard)</strong> — Paste your Google AdSense, Adsterra, or custom HTML banner code in Admin Panel → Ads Manager.
</div>`
    },
    {
      id: 'below-downloader-banner',
      name: 'Below Fetch & Download Buttons (Responsive Banner)',
      locationDescription: 'Displayed directly under the downloader box for maximum CTR',
      dimensions: 'Responsive 970×90 / 300×250',
      enabled: false,
      htmlCode: `<div style="background:#eff6ff;border:1px dashed #93c5fd;border-radius:8px;padding:18px;text-align:center;font-size:12px;color:#1e40af;">
  <strong>High-CTR Ad Placement (Below Downloader Bar)</strong> — Supports <ins class="adsbygoogle"></ins> or custom affiliate HTML.
</div>`
    },
    {
      id: 'above-viewer-banner',
      name: 'Above PDF Viewer Slot',
      locationDescription: 'Displayed right above the unlocked PDF viewer frame',
      dimensions: '728×90',
      enabled: false,
      htmlCode: `<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:14px;text-align:center;font-size:12px;color:#64748b;">
  <strong>Above PDF Viewer Ad Slot</strong> — Configurable via Admin Panel.
</div>`
    },
    {
      id: 'in-article-tutorial',
      name: 'Between Tutorial & Blog Section',
      locationDescription: 'Displayed above the step-by-step tutorial and blog cards',
      dimensions: 'Responsive In-Article',
      enabled: false,
      htmlCode: `<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:16px;text-align:center;font-size:12px;color:#64748b;">
  <strong>In-Article Native Ad Unit</strong> — Configurable via Admin Panel.
</div>`
    },
    {
      id: 'footer-sticky-banner',
      name: 'Footer Ad Slot',
      locationDescription: 'Displayed above the website footer across all pages',
      dimensions: '728×90',
      enabled: false,
      htmlCode: `<div style="background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:8px;padding:14px;text-align:center;font-size:12px;color:#475569;">
  <strong>Footer Banner Ad Placement</strong> — Configurable via Admin Panel.
</div>`
    }
  ],
  blogPosts: [
    {
      id: 'post-en-1',
      slug: 'how-to-download-scribd-documents-free-pdf',
      lang: 'en',
      translationGroupId: 'group-blog-1',
      title: 'How to Download Any Scribd Document as a High-Resolution PDF in 2026',
      excerpt:
        'Complete guide to unlocking full multi-page Scribd documents, academic papers, and scanned books in original PDF resolution.',
      contentHtml: `<p>Many students, researchers, and engineers rely on Scribd for technical manuals, sheet music, and academic monographs. With our <strong>24x Parallel PDF Compiler</strong>, you can fetch all page numbers instantly and export clean offline PDFs.</p>
<h3>Why Full Page Number Detection Matters</h3>
<p>Traditional tools only capture the first few preview pages. By parsing the complete embed manifest and verifying every JSONP page stream, every page from Page 1 to Page N is unlocked before compilation begins.</p>`,
      author: 'Editorial Team',
      publishedAt: '2026-10-15',
      status: 'published',
      seoTitle: 'How to Download Scribd PDF Free — Complete 2026 Guide',
      seoDescription: 'Learn how to fetch all pages and download original high-resolution PDF files from Scribd in seconds.'
    },
    {
      id: 'post-ur-1',
      slug: 'scribd-se-original-pdf-download-karne-ka-tarika',
      lang: 'ur',
      translationGroupId: 'group-blog-1',
      title: 'Scribd سے کوئی بھی کتاب یا ڈاکومنٹ اوریجنل PDF میں مفت کیسے ڈاؤنلوڈ کریں؟',
      excerpt:
        'مکمل گائیڈ: بغیر کسی بلاک کے Scribd کے تمام صفحات نمبر کے ساتھ لوڈ کریں اور ایک کلک میں ہائی کوالٹی PDF محفوظ کریں۔',
      contentHtml: `<p>اکثر طلباء اور ریسرچرز کو Scribd سے نوٹس اور کتابیں ڈاؤنلوڈ کرنے میں مشکل پیش آتی ہے۔ اس ٹول کی مدد سے آپ پہلے <strong>Fetch</strong> بٹن دبا کر تمام صفحات (Page 1 سے آخر تک) چیک کر سکتے ہیں اور پھر <strong>Download PDF</strong> سے پوری فائل سیو کر سکتے ہیں۔</p>`,
      author: 'Editorial Team',
      publishedAt: '2026-10-15',
      status: 'published',
      seoTitle: 'Scribd سے اوریجنل PDF ڈاؤنلوڈ کرنے کا طریقہ',
      seoDescription: 'بغیر کسی رکاوٹ کے Scribd ڈاکومنٹس کو مفت PDF میں ڈاؤنلوڈ کریں۔'
    },
    {
      id: 'post-en-2',
      slug: 'bypass-scribd-ip-blocks-multi-gateway-proxy',
      lang: 'en',
      translationGroupId: 'group-blog-2',
      title: 'Understanding Multi-Gateway Relay Racing for Zero-Block Document Extraction',
      excerpt:
        'How Promise.any parallel gateway racing eliminates server rate limits and speeds up PDF compilation by 10x.',
      contentHtml: `<p>When thousands of users request document assets simultaneously, single-IP servers often encounter rate limits. By racing 5 independent edge gateways simultaneously and caching high-resolution page scans in memory, document extraction completes in milliseconds.</p>`,
      author: 'Systems Architecture',
      publishedAt: '2026-10-16',
      status: 'published',
      seoTitle: 'Zero-Block Multi-Gateway PDF Extraction Architecture',
      seoDescription: 'Technical overview of parallel gateway racing and high-speed PDF assembly.'
    }
  ],
  pages: [
    {
      id: 'page-about-en',
      slug: 'about-us',
      lang: 'en',
      translationGroupId: 'group-page-about',
      title: 'About Our PDF Downloader',
      contentHtml: `<h2>Fast, Clean & Accessible Document Archiving</h2>
<p>ScribdDownloader was engineered to provide students, educators, and professionals with an ultra-fast way to view and archive publicly shared documents for offline reading.</p>`,
      switcherSections: [
        {
          id: 'about-tab-1',
          tabLabel: 'Our Mission',
          badgeText: 'Overview',
          title: 'Built for Researchers, Students & Educators',
          contentHtml: `<p>We believe knowledge and study materials should be accessible offline without slow loading screens or broken layouts. Use the tabs above to explore our technical architecture and privacy standards.</p>`
        },
        {
          id: 'about-tab-2',
          tabLabel: '24x Parallel Engine',
          badgeText: 'Technology',
          title: 'How Our High-Speed PDF Compiler Works',
          contentHtml: `<p>Every document request is processed through our parallel JSONP & raster scan verifier, guaranteeing that both scanned image pages and digital typography are preserved in the exported PDF.</p>`
        },
        {
          id: 'about-tab-3',
          tabLabel: 'Contact & Support',
          badgeText: 'Support',
          title: 'Get in Touch With Our Team',
          contentHtml: `<p>Have feedback or need help with a specific document link? Reach out to our support desk anytime and we will gladly assist.</p>`
        }
      ],
      showInHeader: true,
      showInFooter: true,
      status: 'published',
      seoTitle: 'About Us — Free Scribd PDF Downloader',
      seoDescription: 'Learn more about our ultra-fast Scribd document viewer and PDF downloader.'
    },
    {
      id: 'page-privacy-en',
      slug: 'privacy-policy',
      lang: 'en',
      translationGroupId: 'group-page-privacy',
      title: 'Privacy Policy & DMCA',
      contentHtml: `<h2>Privacy Policy & Copyright Compliance</h2>
<p>We do not store copyrighted files on our servers. All document resolution and PDF compilation occurs dynamically in real-time using publicly accessible embed streams.</p>`,
      switcherSections: [
        {
          id: 'priv-tab-1',
          tabLabel: 'Privacy Policy',
          title: 'Zero Personal Data Retention',
          contentHtml: `<p>We do not require user registration, accounts, or personal data to fetch or download documents.</p>`
        },
        {
          id: 'priv-tab-2',
          tabLabel: 'DMCA Notice',
          title: 'Intellectual Property & DMCA Takedowns',
          contentHtml: `<p>We respect copyright laws. No document files are hosted or archived on our storage servers.</p>`
        },
        {
          id: 'priv-tab-3',
          tabLabel: 'Terms of Use',
          title: 'Acceptable Use Guidelines',
          contentHtml: `<p>This utility is provided strictly for personal educational and archival use on publicly accessible documents.</p>`
        }
      ],
      showInHeader: false,
      showInFooter: true,
      status: 'published',
      seoTitle: 'Privacy Policy & DMCA — ScribdDownloader',
      seoDescription: 'Read our privacy policy and copyright compliance guidelines.'
    }
  ],
  seo: {
    en: {
      siteTitle: 'ScribdDownloader — Free Online Scribd PDF Downloader & Viewer',
      metaDescription:
        'Download original Scribd PDF documents for free. Instant full-page detection, built-in PDF viewer, and 24x ultra-fast parallel PDF compilation.',
      metaKeywords: 'scribd downloader, scribd pdf downloader, download scribd free, scribd viewer, unlock scribd pdf',
      ogTitle: 'ScribdDownloader — Free Online Scribd PDF Downloader',
      ogDescription:
        'Paste any Scribd link, click Fetch to detect all pages, and download the original PDF file instantly.',
      ogImageUrl: '',
      canonicalUrl: 'https://scribddownloader.app',
      robotsMeta: 'index, follow',
      schemaJsonLd: JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'ScribdDownloader',
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'All',
          description:
            'Free online Scribd PDF downloader with full page detection and high-speed parallel PDF compilation.',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD'
          }
        },
        null,
        2
      ),
      customHeadHtml: ''
    },
    ur: {
      siteTitle: 'ScribdDownloader — مفت Scribd PDF ڈاؤنلوڈر اور ویور',
      metaDescription:
        'کسی بھی Scribd ڈاکومنٹ یا کتاب کو اوریجنل کوالٹی PDF میں مفت ڈاؤنلوڈ کریں۔ تیز ترین پیج ڈیٹیکشن اور ڈاؤنلوڈ۔',
      metaKeywords: 'scribd downloader urdu, download scribd pdf free, scribd book download',
      ogTitle: 'ScribdDownloader — مفت Scribd PDF ڈاؤنلوڈر',
      ogDescription: 'ایک کلک میں Scribd سے مکمل اوریجنل PDF فائل ڈاؤنلوڈ کریں۔',
      ogImageUrl: '',
      canonicalUrl: 'https://scribddownloader.app/?lang=ur',
      robotsMeta: 'index, follow',
      schemaJsonLd: '',
      customHeadHtml: ''
    },
    hi: {
      siteTitle: 'ScribdDownloader — मुफ़्त ऑनलाइन Scribd PDF डाउनलोडर',
      metaDescription:
        'किसी भी Scribd दस्तावेज़ को मुफ़्त में ओरिजिनल PDF में डाउनलोड करें। सुपर-फास्ट पेज डिटेक्शन और डाउनलोड।',
      metaKeywords: 'scribd downloader hindi, free scribd pdf download',
      ogTitle: 'ScribdDownloader — मुफ़्त Scribd PDF डाउनलोडर',
      ogDescription: 'एक क्लिक में Scribd से पूरी ओरिजिनल PDF फाइल डाउनलोड करें।',
      ogImageUrl: '',
      canonicalUrl: 'https://scribddownloader.app/?lang=hi',
      robotsMeta: 'index, follow',
      schemaJsonLd: '',
      customHeadHtml: ''
    },
    es: {
      siteTitle: 'ScribdDownloader — Descargador de PDF de Scribd Gratis Online',
      metaDescription:
        'Descarga documentos PDF originales de Scribd gratis. Detección instantánea de todas las páginas y descarga rápida.',
      metaKeywords: 'descargar scribd gratis, convertidor scribd a pdf, scribd downloader espanol',
      ogTitle: 'ScribdDownloader — Descargador de PDF de Scribd Gratis',
      ogDescription: 'Pega tu enlace de Scribd y descarga el archivo PDF original completo en segundos.',
      ogImageUrl: '',
      canonicalUrl: 'https://scribddownloader.app/?lang=es',
      robotsMeta: 'index, follow',
      schemaJsonLd: '',
      customHeadHtml: ''
    },
    ar: {
      siteTitle: 'ScribdDownloader — تحميل ملفات PDF من Scribd مجاناً',
      metaDescription:
        'قم بتحميل مستندات وكتب Scribd بصيغة PDF الأصلية مجاناً وبسرعة فائقة مع كشف كامل للصفحات.',
      metaKeywords: 'تحميل من سكريبد, scribd pdf downloader arabic, تنزيل كتب scribd',
      ogTitle: 'ScribdDownloader — تحميل ملفات PDF من Scribd مجاناً',
      ogDescription: 'الصق رابط Scribd وقم بتحميل ملف PDF الأصلي كاملاً في ثوانٍ.',
      ogImageUrl: '',
      canonicalUrl: 'https://scribddownloader.app/?lang=ar',
      robotsMeta: 'index, follow',
      schemaJsonLd: '',
      customHeadHtml: ''
    }
  }
};

export function loadCmsState(): CmsStoreState {
  if (typeof window === 'undefined') return DEFAULT_CMS_STATE;
  try {
    const raw = localStorage.getItem(CMS_STORAGE_KEY);
    if (!raw) return DEFAULT_CMS_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CMS_STATE,
      ...parsed,
      translations: { ...DEFAULT_CMS_STATE.translations, ...(parsed.translations || {}) },
      seo: { ...DEFAULT_CMS_STATE.seo, ...(parsed.seo || {}) }
    };
  } catch {
    return DEFAULT_CMS_STATE;
  }
}

export function saveCmsState(state: CmsStoreState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}
