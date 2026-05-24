import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: {
    default: 'MenuQR — Digital Menus for Restaurants & Cafes',
    template: '%s | MenuQR',
  },
  description:
    'MenuQR lets restaurants and cafes display beautiful digital menus via QR codes. AI-powered menu setup, customer likes & reviews, and real-time analytics.',
  keywords: ['digital menu', 'QR code menu', 'restaurant menu', 'cafe menu', 'online menu'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'MenuQR — Digital Menus for Restaurants & Cafes',
    description: 'Beautiful digital menus via QR code. AI-powered setup, likes & reviews.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
