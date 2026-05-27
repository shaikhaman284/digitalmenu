import type { Metadata } from 'next';
import Link from 'next/link';
import {
  QrCode, Wand2, Heart, BarChart3, MessageCircle,
  Check, ArrowRight, Star, Zap, ChevronRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'MenuQR — Modern Digital Menus for Restaurants & Cafes',
  description:
    'Replace paper menus with a beautiful QR-based digital experience. AI-powered setup, customer likes & reviews, real-time updates. No app needed. Live for restaurants across India.',
  keywords: [
    'digital menu India', 'QR code menu restaurant', 'restaurant digital menu',
    'contactless menu', 'online menu QR', 'cafe digital menu', 'MenuQR',
    'restaurant management app', 'menu QR code India',
  ],
  alternates: {
    canonical: process.env.NEXT_PUBLIC_BASE_URL || 'https://digitalmenu-inky-theta.vercel.app',
  },
  openGraph: {
    title: 'MenuQR — Modern Digital Menus for Restaurants & Cafes',
    description: 'Replace paper menus with a beautiful QR-based digital experience. AI-powered setup, customer likes & reviews. No app needed.',
    type: 'website',
    locale: 'en_IN',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'MenuQR',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'Digital QR-based menu platform for restaurants and cafes. AI-powered setup, customer reviews, and real-time analytics.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '5',
    ratingCount: '3',
  },
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
      {/* JSON-LD structured data for Google rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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

          <h1 className="lp-hero-h1">
            Your restaurant menu,<br />
            <span className="lp-accent-text">beautifully digital.</span>
          </h1>

          <p className="lp-hero-sub">
            Replace paper menus with a stunning QR experience.
            Customers scan, browse and engage — no app, no download, no friction.
          </p>

          <div className="lp-hero-ctas">
            <a
              href={waLink("Hi! I'm interested in MenuQR for my restaurant. Please tell me more.")}
              target="_blank"
              rel="noopener noreferrer"
              className="lp-btn lp-btn-primary lp-btn-lg"
            >
              <MessageCircle size={20} />
              Get Started on WhatsApp
              <ArrowRight size={18} />
            </a>
            <a href="#features" className="lp-btn lp-btn-ghost lp-btn-lg">
              See features <ChevronRight size={16} />
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

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="lp-section lp-cta-section">
        <div className="lp-container">
          <div className="lp-cta-card">
            <div className="lp-cta-icon">🚀</div>
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
            >
              <MessageCircle size={20} />
              Get Started on WhatsApp
              <ArrowRight size={18} />
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
          <p className="lp-footer-copy">© 2026 MenuQR. Modern digital menus for restaurants &amp; cafés.</p>
          <div className="lp-footer-links">
            <Link href="/dashboard/login">Restaurant Login</Link>
            <a
              href={waLink("Hi! I have a question about MenuQR.")}
              target="_blank"
              rel="noopener noreferrer"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
