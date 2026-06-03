import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'FAQ — MenuQR Digital QR Menu for Restaurants | Amravati',
  description:
    'Frequently asked questions about MenuQR digital menu service for restaurants and cafes in Amravati and across India. Learn about pricing, setup, and features.',
  alternates: {
    canonical: 'https://www.themenuqr.food/faq',
  },
  openGraph: {
    title: 'FAQ — MenuQR Digital QR Menu for Restaurants | Amravati',
    description:
      'Frequently asked questions about MenuQR digital menu service for restaurants and cafes in Amravati and across India.',
    type: 'website',
    locale: 'en_IN',
  },
};

const faqs = [
  {
    question: 'What is MenuQR?',
    answer:
      'MenuQR is a digital menu platform that lets restaurants and cafes in India display their menu via a QR code. Customers scan the QR and browse the full menu instantly — no app download needed.',
  },
  {
    question: 'How much does MenuQR cost?',
    answer:
      'MenuQR starts at ₹99 per month or ₹999 per year. Setup is same-day with no hidden fees or contracts.',
  },
  {
    question: 'Is MenuQR available in Amravati?',
    answer:
      'Yes, MenuQR is available in Amravati, Maharashtra and across India. We personally visit restaurants and cafes in Amravati for same-day setup. Contact us on WhatsApp to get started.',
  },
  {
    question: 'Do customers need to download an app to view the menu?',
    answer:
      'No. Customers simply scan the QR code with their phone camera and the menu opens instantly in the browser. No app, no download, no login required.',
  },
  {
    question: 'How does the AI menu setup work?',
    answer:
      'You upload a photo of your existing paper menu. Our AI automatically extracts all dish names, prices and descriptions and adds them to your digital menu in seconds.',
  },
  {
    question: 'Can I update my menu in real time?',
    answer:
      'Yes. You can edit prices, add new dishes, or mark items as unavailable from your dashboard. Changes go live the moment you save — no waiting, no reprinting.',
  },
  {
    question: 'What types of businesses can use MenuQR?',
    answer:
      'MenuQR works for all food businesses — restaurants, cafes, dhabas, juice bars, bakeries, food stalls, cloud kitchens and more. If you serve food, MenuQR works for you.',
  },
  {
    question: 'Is there a contract or lock-in period?',
    answer:
      'No contracts. You can cancel anytime. We offer monthly and annual plans — the annual plan gives you 2 months free compared to monthly billing.',
  },
];

const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
};

export default function FAQPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #fff8f0 0%, #fdfaf5 100%)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      {/* Nav */}
      <header style={{ borderBottom: '1px solid #f0e4d4', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <span style={{ fontSize: 22 }}>🍽️</span>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a' }}>MenuQR</span>
          </Link>
          <Link
            href="/"
            style={{ fontSize: '0.875rem', color: '#c8622a', fontWeight: 600, textDecoration: 'none' }}
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px 80px' }}>
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c8622a', marginBottom: 12 }}>
            Help Center
          </p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2, marginBottom: 16 }}>
            Frequently Asked Questions
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#6b7280', maxWidth: 520, margin: '0 auto' }}>
            Everything you need to know about MenuQR — digital QR menus for
            restaurants and cafes in Amravati &amp; across India.
          </p>
        </div>

        {/* FAQ accordion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faqs.map(({ question, answer }, idx) => (
            <details
              key={idx}
              style={{
                background: '#ffffff',
                border: '1px solid #f0e4d4',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(200,98,42,0.05)',
              }}
            >
              <summary
                style={{
                  padding: '18px 24px',
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: '#1a1a1a',
                  cursor: 'pointer',
                  listStyle: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  userSelect: 'none',
                }}
              >
                {question}
                <span style={{ fontSize: '1.2rem', color: '#c8622a', flexShrink: 0, marginLeft: 12 }}>+</span>
              </summary>
              <div style={{ padding: '0 24px 20px', color: '#4b5563', lineHeight: 1.7, fontSize: '0.95rem', borderTop: '1px solid #f5ece0' }}>
                {answer}
              </div>
            </details>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 56, textAlign: 'center', padding: '40px 32px', background: 'linear-gradient(135deg, #fff3ec, #fff8f0)', borderRadius: 24, border: '1px solid #f0e4d4' }}>
          <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
            Still have questions?
          </p>
          <p style={{ color: '#6b7280', marginBottom: 20, fontSize: '0.95rem' }}>
            Chat with us directly on WhatsApp — we typically reply within minutes.
          </p>
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP || '919284516967'}?text=${encodeURIComponent('Hi! I have a question about MenuQR.')}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contact MenuQR on WhatsApp"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 28px',
              background: '#c8622a',
              color: '#fff',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
            }}
          >
            💬 Chat on WhatsApp
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #f0e4d4', padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem' }}>
        <p>© 2026 MenuQR. Digital QR menus for restaurants &amp; cafés in Amravati &amp; across India.</p>
      </footer>
    </div>
  );
}
