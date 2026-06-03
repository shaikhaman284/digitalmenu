import type { Metadata } from 'next';
import Link from 'next/link';
import {
  QrCode, Wand2, Heart, BarChart3, MessageCircle,
  Check, ArrowRight, Star, Zap, ChevronRight,
} from 'lucide-react';

export const revalidate = 86400; // Statically regenerate once per day

export const metadata: Metadata = {
  title: 'MenuQR — Digital QR Menu for Restaurants & Cafes | Amravati, India',
  description:
    'MenuQR gives restaurants and cafes in Amravati and across India a beautiful digital menu via QR code. AI-powered setup, customer likes & reviews, real-time updates. No app needed. Starting ₹99/month.',
  keywords: [
    'digital menu amravati', 'qr menu amravati', 'restaurant digital menu amravati',
    'cafe digital menu', 'qr code menu india', 'contactless menu', 'digital menu india',
    'menu qr', 'the menu qr', 'qr menu restaurant', 'online menu qr code',
    'restaurant menu app amravati', 'digital menu maharashtra',
  ],
  alternates: {
    canonical: 'https://www.themenuqr.food',
  },
  openGraph: {
    title: 'MenuQR — Digital QR Menu for Restaurants & Cafes | Amravati, India',
    description: 'Beautiful digital menus via QR code for restaurants in Amravati. AI-powered setup, customer likes & reviews. No app needed. Starting ₹99/month.',
    type: 'website',
    locale: 'en_IN',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'MenuQR Digital Menu for Restaurants' }],
  },
};

// ── JSON-LD Structured Data ──────────────────────────────────────────────────

const jsonLdLocalBusiness = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'MenuQR',
  description: 'Digital QR menu service for restaurants and cafes in Amravati and across India',
  url: 'https://www.themenuqr.food',
  telephone: '+919284516967',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Amravati',
    addressRegion: 'Maharashtra',
    addressCountry: 'IN',
  },
  areaServed: ['Amravati', 'Maharashtra', 'India'],
  priceRange: '₹99 - ₹999',
  sameAs: [],
};

const jsonLdSoftwareApp = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'MenuQR',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'Digital QR menu platform for restaurants and cafes. AI-powered menu setup, customer likes, reviews and analytics.',
  offers: {
    '@type': 'Offer',
    price: '99',
    priceCurrency: 'INR',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: '99',
      priceCurrency: 'INR',
      unitText: 'MONTH',
    },
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '3',
    bestRating: '5',
    worstRating: '1',
  },
};

const jsonLdReviews = [
  {
    '@context': 'https://schema.org',
    '@type': 'Review',
    reviewBody: 'Our customers absolutely love scanning the QR and browsing the menu on their phone. Setup took less than a day.',
    reviewRating: {
      '@type': 'Rating',
      ratingValue: '5',
      bestRating: '5',
      worstRating: '1',
    },
    author: { '@type': 'Person', name: 'Rahul Sharma' },
    itemReviewed: { '@type': 'SoftwareApplication', name: 'MenuQR' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Review',
    reviewBody: 'The AI menu importer saved me hours. I uploaded a photo of our old menu and everything was ready in minutes.',
    reviewRating: {
      '@type': 'Rating',
      ratingValue: '5',
      bestRating: '5',
      worstRating: '1',
    },
    author: { '@type': 'Person', name: 'Priya Nair' },
    itemReviewed: { '@type': 'SoftwareApplication', name: 'MenuQR' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Review',
    reviewBody: 'Seeing which dishes get the most likes has helped us understand what our guests actually enjoy. Brilliant feature.',
    reviewRating: {
      '@type': 'Rating',
      ratingValue: '5',
      bestRating: '5',
      worstRating: '1',
    },
    author: { '@type': 'Person', name: 'Mohammed Farhan' },
    itemReviewed: { '@type': 'SoftwareApplication', name: 'MenuQR' },
  },
];

const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is MenuQR?',
      acceptedAnswer: { '@type': 'Answer', text: 'MenuQR is a digital menu platform that lets restaurants and cafes in India display their menu via a QR code. Customers scan the QR and browse the full menu instantly — no app download needed.' },
    },
    {
      '@type': 'Question',
      name: 'How much does MenuQR cost?',
      acceptedAnswer: { '@type': 'Answer', text: 'MenuQR starts at ₹99 per month or ₹999 per year. Setup is same-day with no hidden fees or contracts.' },
    },
    {
      '@type': 'Question',
      name: 'Is MenuQR available in Amravati?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes, MenuQR is available in Amravati, Maharashtra and across India. Contact us on WhatsApp for same-day setup.' },
    },
    {
      '@type': 'Question',
      name: 'Do customers need to download an app to view the menu?',
      acceptedAnswer: { '@type': 'Answer', text: 'No. Customers simply scan the QR code with their phone camera and the menu opens instantly in the browser. No app, no download, no login required.' },
    },
    {
      '@type': 'Question',
      name: 'How does the AI menu setup work?',
      acceptedAnswer: { '@type': 'Answer', text: 'You upload a photo of your existing paper menu. Our AI automatically extracts all dish names, prices and descriptions and adds them to your digital menu in seconds.' },
    },
  ],
};

const features = [
  {
    icon: QrCode,
    title: 'Instant QR Access',
    description: 'Customers scan your table QR and your full menu appears instantly — no app download, no account, no friction.',
    accent: '#c8622a',
    bg: '#fff3ec',
  },
  {
    icon: Wand2,
    title: 'AI Menu Setup',
    description: 'Upload a photo of your old paper menu and our AI extracts every dish, price and description automatically.',
    accent: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    icon: Heart,
    title: 'Customer Likes',
    description: 'Diners can like their favourite dishes. See which items are most popular at a glance on your dashboard.',
    accent: '#dc2626',
    bg: '#fff0f0',
  },
  {
    icon: MessageCircle,
    title: 'Ratings & Reviews',
    description: 'Customers leave star ratings and written reviews right on the menu page — no third-party app required.',
    accent: '#d97706',
    bg: '#fffbeb',
  },
  {
    icon: BarChart3,
    title: 'Live Analytics',
    description: 'Track total likes, average ratings, top dishes and recent reviews — all in one clean dashboard.',
    accent: '#16a34a',
    bg: '#f0fdf4',
  },
  {
    icon: Zap,
    title: 'Real-Time Updates',
    description: 'Edit prices, add new items or mark dishes unavailable in seconds. Changes go live the moment you save.',
    accent: '#0284c7',
    bg: '#eff6ff',
  },
];

const steps = [
  { num: '01', title: 'We set up your account', body: 'Contact us on WhatsApp. We create your restaurant profile and generate a unique QR code for your table(s).' },
  { num: '02', title: 'Upload your menu', body: 'Use our AI importer — snap a photo of your existing menu and all items are extracted automatically. Or add them manually.' },
  { num: '03', title: 'Place the QR sticker', body: 'Stick the printed QR on your table. Customers scan it and see your live digital menu instantly.' },
  { num: '04', title: 'Grow with insights', body: 'Watch likes and reviews roll in. Use your dashboard analytics to understand what your customers love most.' },
];

const testimonials = [
  {
    quote: 'Our customers absolutely love scanning the QR and browsing the menu on their phone. Setup took less than a day.',
    name: 'Rahul Sharma',
    role: 'Owner, The Spice Garden',
    rating: 5,
  },
  {
    quote: 'The AI menu importer saved me hours. I uploaded a photo of our old menu and everything was ready in minutes.',
    name: 'Priya Nair',
    role: 'Manager, Coastal Bites',
    rating: 5,
  },
  {
    quote: 'Seeing which dishes get the most likes has helped us understand what our guests actually enjoy. Brilliant feature.',
    name: 'Mohammed Farhan',
    role: 'Chef-Owner, Urban Dhabha',
    rating: 5,
  },
];

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP || '919876543210';
const waLink = (msg: string) =>
  `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;

export default function LandingPage() {
  return (
    <div className="lp-root">
      {/* JSON-LD: LocalBusiness */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdLocalBusiness) }}
      />
      {/* JSON-LD: SoftwareApplication + AggregateRating */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftwareApp) }}
      />
      {/* JSON-LD: Reviews (array of 3 Review schemas) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdReviews) }}
      />
      {/* JSON-LD: FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      {/* ── Nav ────────────────────────────────────────────────── */}
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <div className="lp-logo">
            <div className="lp-logo-icon">🍽️</div>
            <span className="lp-logo-text">MenuQR</span>
          </div>
          <nav className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#testimonials">Reviews</a>
          </nav>
          <a
            href={waLink("Hi! I'm interested in MenuQR for my restaurant.")}
            target="_blank"
            rel="noopener noreferrer"
            className="lp-btn lp-btn-primary lp-btn-sm"
          >
            <MessageCircle size={15} /> Contact Us
          </a>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero-bg-blob lp-hero-bg-blob-1" />
        <div className="lp-hero-bg-blob lp-hero-bg-blob-2" />
        <div className="lp-container lp-hero-inner">
          <div className="lp-hero-badge">
            <span className="lp-badge-dot" />
            Now live for restaurants &amp; cafés across India
          </div>

          {/* SEO H2 sub-heading — targets 'qr menu amravati' and related queries */}
          <h2 className="lp-hero-h2-seo">
            QR Code Digital Menu for Restaurants &amp; Cafes in Amravati
          </h2>

          <h1 className="lp-hero-h1">
            Your restaurant menu,<br />
            <span className="lp-accent-text">beautifully digital.</span>
          </h1>

          <p className="lp-hero-sub">
            Replace paper menus with a stunning QR experience — trusted by
            restaurants and cafes in Amravati, Maharashtra and across India.
            Customers scan, browse and engage — no app, no download, no friction.
          </p>

          <div className="lp-hero-ctas">
            <a
              href={waLink("Hi! I'm interested in MenuQR for my restaurant. Please tell me more.")}
              target="_blank"
              rel="noopener noreferrer"
              className="lp-btn lp-btn-primary lp-btn-lg"
              aria-label="Get started with MenuQR on WhatsApp"
            >
              <MessageCircle size={20} aria-hidden="true" />
              Get Started on WhatsApp
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a href="#features" className="lp-btn lp-btn-ghost lp-btn-lg" aria-label="See MenuQR features">
              See features <ChevronRight size={16} aria-hidden="true" />
            </a>
          </div>

          {/* Trust bar */}
          <div className="lp-trust-bar">
            {['No app required', 'AI-powered setup', 'Live in minutes', 'Real customer insights'].map((t) => (
              <span key={t} className="lp-trust-pill">
                <Check size={13} /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* ── Phone Mockup ───────────────────────────────────── */}
        <div className="lp-container lp-mockup-wrap">
          <div className="lp-phone-frame">
            {/* Status bar */}
            <div className="lp-phone-bar">
              <div className="lp-phone-dots">
                <span /><span /><span />
              </div>
              <div className="lp-phone-url" />
            </div>
            {/* Menu preview */}
            <div className="lp-phone-body">
              <div className="lp-mock-hero">
                <div className="lp-mock-logo">🍽️</div>
                <p className="lp-mock-name">The Spice Garden</p>
                <p className="lp-mock-loc">📍 Hyderabad, Telangana</p>
              </div>
              <div className="lp-mock-hot">
                <span className="lp-mock-hot-badge">🔥 Most Loved</span>
                <p className="lp-mock-dish">Chicken Biryani</p>
                <div className="lp-mock-row">
                  <span className="lp-mock-price">₹280</span>
                  <span className="lp-mock-likes">❤️ 142</span>
                </div>
              </div>
              {[
                { name: 'Paneer Tikka', price: '₹220', emoji: '🧀', rating: 4.5 },
                { name: 'Dal Makhani', price: '₹160', emoji: '🥘', rating: 4.2 },
              ].map((item) => (
                <div key={item.name} className="lp-mock-item">
                  <span className="lp-mock-emoji">{item.emoji}</span>
                  <div className="lp-mock-item-info">
                    <p className="lp-mock-item-name">{item.name}</p>
                    <p className="lp-mock-item-rating">⭐ {item.rating}</p>
                  </div>
                  <p className="lp-mock-item-price">{item.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-head">
            <p className="lp-eyebrow">Features</p>
            <h2 className="lp-section-h2">Everything your restaurant needs</h2>
            <p className="lp-section-sub">One platform to manage your digital presence, engage customers and grow your business.</p>
          </div>

          <div className="lp-features-grid">
            {features.map(({ icon: Icon, title, description, accent, bg }) => (
              <div key={title} className="lp-feature-card">
                <div className="lp-feature-icon" style={{ background: bg, color: accent }}>
                  <Icon size={22} />
                </div>
                <h3 className="lp-feature-title">{title}</h3>
                <p className="lp-feature-desc">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section id="how-it-works" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <p className="lp-eyebrow">Process</p>
            <h2 className="lp-section-h2">Up and running in minutes</h2>
            <p className="lp-section-sub">No technical knowledge required. We handle the hard parts.</p>
          </div>

          <div className="lp-steps-grid">
            {steps.map(({ num, title, body }) => (
              <div key={num} className="lp-step-card">
                <span className="lp-step-num">{num}</span>
                <h3 className="lp-step-title">{title}</h3>
                <p className="lp-step-body">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────── */}
      <section id="testimonials" className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-head">
            <p className="lp-eyebrow">Testimonials</p>
            <h2 className="lp-section-h2">Loved by restaurant owners</h2>
          </div>

          <div className="lp-testimonials-grid">
            {testimonials.map(({ quote, name, role, rating }) => (
              <div key={name} className="lp-testi-card">
                <div className="lp-stars">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} size={15} fill="#d97706" color="#d97706" />
                  ))}
                </div>
                <p className="lp-testi-quote">&ldquo;{quote}&rdquo;</p>
                <div className="lp-testi-author">
                  <div className="lp-testi-avatar">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="lp-testi-name">{name}</p>
                    <p className="lp-testi-role">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Local SEO Section ────────────────────────────────────── */}
      <section className="lp-section lp-local-section" aria-labelledby="local-heading">
        <div className="lp-container">
          <div className="lp-section-head">
            <p className="lp-eyebrow">Our Reach</p>
            <h2 id="local-heading" className="lp-section-h2">Serving Restaurants Across Amravati &amp; Maharashtra</h2>
            <p className="lp-section-sub">
              MenuQR is proudly based in Amravati, Maharashtra. We personally visit and set up digital
              menus for restaurants, cafes, dhabas, juice bars, bakeries and food stalls across
              Amravati, Nagpur, Nashik and all of Maharashtra. Same-day setup. Starting &#8377;99/month.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="lp-section lp-cta-section">
        <div className="lp-container">
          <div className="lp-cta-card">
            <div className="lp-cta-icon" aria-hidden="true">🚀</div>
            <h2 className="lp-cta-h2">Ready to go digital?</h2>
            <p className="lp-cta-sub">
              Get in touch with us on WhatsApp and we&apos;ll have your digital menu live today.
              No contracts, no hidden fees.
            </p>
            <a
              href={waLink("Hi! I'd like to set up a digital menu for my restaurant with MenuQR.")}
              target="_blank"
              rel="noopener noreferrer"
              className="lp-btn lp-btn-primary lp-btn-lg"
              aria-label="Start setting up your digital menu on WhatsApp"
            >
              <MessageCircle size={20} aria-hidden="true" />
              Get Started on WhatsApp
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <div className="lp-cta-checks">
              {['Free consultation', 'Same-day setup', 'Ongoing support'].map((t) => (
                <span key={t} className="lp-cta-check">
                  <Check size={13} /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-logo">
            <div className="lp-logo-icon">🍽️</div>
            <span className="lp-logo-text">MenuQR</span>
          </div>
          <p className="lp-footer-copy">&copy; 2026 MenuQR. Digital QR menus for restaurants &amp; caf&eacute;s in Amravati &amp; across India.</p>
          <div className="lp-footer-links">
            <Link href="/dashboard/login">Restaurant Login</Link>
            <Link href="/faq">FAQ</Link>
            <a
              href={waLink("Hi! I have a question about MenuQR.")}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contact MenuQR on WhatsApp"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
