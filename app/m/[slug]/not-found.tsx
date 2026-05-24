import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0f0a1e] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-3xl gradient-brand flex items-center justify-center mx-auto mb-6 glow-brand">
          <Zap size={36} className="text-white" />
        </div>
        <h1 className="text-5xl font-bold text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-purple-300 mb-3">Menu Not Found</h2>
        <p className="text-purple-500 text-sm mb-6">
          This QR code doesn't link to an active menu. It may not be set up yet, or the URL may be incorrect.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-brand text-white font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Go to MenuQR
        </Link>
        <p className="mt-8 text-xs text-purple-600">
          Powered by <span className="text-purple-400 font-semibold">MenuQR</span>
        </p>
      </div>
    </div>
  );
}
