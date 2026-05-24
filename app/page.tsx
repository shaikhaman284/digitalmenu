import type { Metadata } from 'next';
import Link from 'next/link';
import { Zap, QrCode, Wand2, Heart, BarChart3, MessageCircle, Check, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'MenuQR — Modern Digital Menus for Restaurants & Cafes',
  description:
    'MenuQR lets restaurants display beautiful digital menus via QR codes. AI-powered menu setup, customer likes & reviews. No app download needed.',
};

const features = [
  {
    icon: QrCode,
    title: 'QR-Based Access',
    description: 'Customers scan your QR sticker and instantly see your full digital menu — no app download, no login.',
    gradient: 'from-purple-500 to-fuchsia-500',
  },
  {
    icon: Wand2,
    title: 'AI Menu Setup',
    description: 'Upload a photo of your old paper menu and our AI extracts every item automatically with descriptions.',
    gradient: 'from-blue-500 to-purple-500',
  },
  {
    icon: Heart,
    title: 'Customer Likes',
    description: 'Customers can like their favourite dishes. See which items are most popular at a glance.',
    gradient: 'from-pink-500 to-red-500',
  },
  {
    icon: MessageCircle,
    title: 'Reviews & Ratings',
    description: 'Customers leave star ratings and written reviews directly on your menu page.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Track total likes, reviews, and your best-performing dishes — all in one clean dashboard.',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Zap,
    title: 'Instant Updates',
    description: 'Add, edit, or remove items from your menu in seconds. Changes go live immediately.',
    gradient: 'from-yellow-500 to-amber-500',
  },
];

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP || '919876543210';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0f0a1e] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-purple-900/20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center glow-brand">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg">MenuQR</span>
          </div>
          <a
            href={`https://wa.me/${whatsappNumber}?text=Hi!%20I'm%20interested%20in%20MenuQR%20for%20my%20restaurant.`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-brand text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-purple-900/40"
          >
            <MessageCircle size={16} />
            Contact Us
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden pt-16">
        {/* Background decorations */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 -left-60 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 -right-60 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 pt-24 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-700/50 bg-purple-900/20 text-purple-300 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Now available for restaurants & cafes
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6">
            <span className="text-gradient-brand">Modern Digital</span>
            <br />
            <span className="text-white">Menus for</span>
            <br />
            <span className="text-white">Restaurants & Cafes</span>
          </h1>

          <p className="text-xl text-purple-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Replace your paper menus with a stunning digital experience. Customers scan your QR — that's it. No app, no download, no friction.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href={`https://wa.me/${whatsappNumber}?text=Hi!%20I'm%20interested%20in%20MenuQR%20for%20my%20restaurant.%20Please%20tell%20me%20more.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-8 py-4 rounded-2xl gradient-brand text-white text-base font-semibold hover:opacity-90 transition-all shadow-2xl shadow-purple-900/50 glow-brand"
            >
              <MessageCircle size={20} />
              Contact us on WhatsApp
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </div>

      {/* Demo Preview */}
      <div className="max-w-sm mx-auto px-4 mb-24">
        <div className="glass rounded-3xl overflow-hidden shadow-2xl shadow-purple-900/40 border border-purple-700/20">
          {/* Phone chrome */}
          <div className="bg-[#1a1030] px-4 py-3 border-b border-purple-900/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500/60" />
              <div className="w-2 h-2 rounded-full bg-amber-500/60" />
              <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
              <div className="flex-1 h-5 rounded-lg bg-white/5 mx-2" />
            </div>
          </div>
          {/* Menu preview mockup */}
          <div className="p-4 space-y-3">
            <div className="flex flex-col items-center py-4">
              <div className="w-16 h-16 rounded-full gradient-brand flex items-center justify-center text-2xl mb-2 glow-brand">🍽️</div>
              <p className="text-white font-bold">The Spice Garden</p>
              <p className="text-purple-400 text-xs">📍 Hyderabad, Telangana</p>
            </div>
            <div className="gradient-fire p-px rounded-xl">
              <div className="bg-[#1a0a2e] rounded-xl p-3">
                <p className="text-orange-400 text-xs font-bold mb-1">🔥 Most Loved</p>
                <p className="text-white font-semibold">Chicken Biryani</p>
                <div className="flex justify-between mt-1">
                  <span className="text-purple-300 text-sm">₹280</span>
                  <span className="text-red-400 text-xs">❤️ 142</span>
                </div>
              </div>
            </div>
            {[
              { name: 'Paneer Tikka', price: '₹220', emoji: '🧀', likes: 89, rating: 4.5 },
              { name: 'Dal Makhani', price: '₹160', emoji: '🥘', likes: 64, rating: 4.2 },
            ].map((item) => (
              <div key={item.name} className="flex gap-3 p-3 glass-light rounded-xl">
                <div className="w-12 h-12 rounded-lg bg-purple-900/40 flex items-center justify-center text-xl shrink-0">
                  {item.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{item.name}</p>
                  <p className="text-purple-400 text-xs">⭐ {item.rating}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-purple-300 text-sm font-bold">{item.price}</p>
                  <p className="text-pink-400 text-xs">❤️ {item.likes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Everything you need
          </h2>
          <p className="text-purple-400 text-lg">All-in-one solution for your restaurant's digital presence</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, description, gradient }) => (
            <div key={title} className="glass rounded-2xl p-5 card-hover group">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={22} className="text-white" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
              <p className="text-purple-400 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-2xl mx-auto px-4 pb-24 text-center">
        <div className="glass rounded-3xl p-10 border border-purple-700/20">
          <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-6 glow-brand">
            <Zap size={30} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Ready to go digital?</h2>
          <p className="text-purple-300 mb-8 leading-relaxed">
            Get in touch with us on WhatsApp and we'll have your digital menu up and running in no time.
          </p>
          <a
            href={`https://wa.me/${whatsappNumber}?text=Hi!%20I'd%20like%20to%20set%20up%20a%20digital%20menu%20for%20my%20restaurant%20with%20MenuQR.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl gradient-brand text-white text-base font-semibold hover:opacity-90 transition-all shadow-2xl shadow-purple-900/50 glow-brand"
          >
            <MessageCircle size={20} />
            Get Started on WhatsApp
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-purple-900/30 py-8 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg gradient-brand flex items-center justify-center">
            <Zap size={12} className="text-white" />
          </div>
          <span className="font-bold text-white">MenuQR</span>
        </div>
        <p className="text-purple-600 text-sm">© 2026 MenuQR. Modern digital menus for restaurants & cafes.</p>
      </footer>
    </div>
  );
}
