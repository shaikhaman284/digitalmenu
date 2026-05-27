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

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://digitalmenu-inky-theta.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'MenuQR — Digital Menus for Restaurants & Cafes',
    template: '%s | MenuQR',
  },
  description:
    'MenuQR lets restaurants and cafes display beautiful digital menus via QR codes. AI-powered menu setup, customer likes & reviews, and real-time analytics. No app required.',
  keywords: [
    'digital menu', 'QR code menu', 'restaurant menu', 'cafe menu', 'online menu',
    'contactless menu', 'digital menu India', 'restaurant QR code', 'menu QR',
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
    title: 'MenuQR — Digital Menus for Restaurants & Cafes',
    description:
      'Beautiful digital menus via QR code. AI-powered setup, customer likes & reviews, real-time analytics. No app needed.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MenuQR — Digital Menus for Restaurants & Cafes',
    description: 'Beautiful digital menus via QR code. No app needed.',
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        {/* Preconnect to Firebase Storage for faster image loads */}
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://storage.googleapis.com" />
        {/* DNS prefetch for Google Fonts (already loaded via next/font but helps fallback) */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
