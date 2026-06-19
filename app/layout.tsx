import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  preload: false, // only used in menu/dashboard — not critical path
});

const BASE_URL = 'https://www.themenuqr.food';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'MenuQR — Digital QR Menu for Restaurants & Cafes | Amravati, India',
    template: '%s | MenuQR',
  },
  description:
    'MenuQR gives restaurants and cafes in Amravati and across India a beautiful digital menu via QR code. AI-powered setup, customer likes & reviews, real-time updates. No app needed. Starting ₹99/month.',
  keywords: [
    'digital menu amravati', 'qr menu amravati', 'restaurant digital menu amravati',
    'cafe digital menu', 'qr code menu india', 'contactless menu', 'digital menu india',
    'menu qr', 'the menu qr', 'qr menu restaurant', 'online menu qr code',
    'restaurant menu app amravati', 'digital menu maharashtra',
  ],
  authors: [{ name: 'MenuQR' }],
  creator: 'MenuQR',
  publisher: 'MenuQR',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: BASE_URL,
    siteName: 'MenuQR',
    title: 'MenuQR — Digital QR Menu for Restaurants & Cafes | Amravati, India',
    description:
      'Beautiful digital menus via QR code for restaurants in Amravati. AI-powered setup, customer likes & reviews. No app needed. Starting ₹99/month.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'MenuQR Digital Menu for Restaurants',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MenuQR — Digital QR Menu for Restaurants & Cafes | Amravati, India',
    description: 'Beautiful digital menus via QR code. No app needed. Starting ₹99/month.',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: BASE_URL,
  },
  // Replace PASTE_YOUR_VERIFICATION_CODE_HERE with the code from Google Search Console
  verification: {
    google: '1qwgUSvak2__7h53YFgVJYd8EW1SkFHB73rts4xo9QU',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        {/* Preconnect to Firebase Storage for faster image loads */}
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://storage.googleapis.com" />
        {/* Preconnect + DNS prefetch for Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
      </head>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
