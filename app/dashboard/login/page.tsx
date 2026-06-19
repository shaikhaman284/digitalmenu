'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createSession } from '@/app/actions/auth';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

export default function DashboardLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken(true);
      const result = await createSession(idToken);

      if (!result.success) {
        setError('Access denied. Restaurant account required.');
        await auth.signOut();
        return;
      }

      router.push('/dashboard/home');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      if (message.includes('invalid-credential') || message.includes('user-not-found') || message.includes('wrong-password')) {
        setError('Invalid email or password.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="db-theme" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'linear-gradient(160deg, #fff8f0 0%, #fdfaf5 100%)' }}>
      {/* Decorative blobs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, background: 'rgba(200,98,42,0.08)', borderRadius: '50%', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 320, height: 320, background: 'rgba(212,168,83,0.08)', borderRadius: '50%', filter: 'blur(60px)' }} />
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: 420 }} className="animate-scale-in">
        {/* Card */}
        <div className="db-card" style={{ padding: 36, borderRadius: 24 }}>
          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28, textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'var(--db-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, marginBottom: 16,
              boxShadow: '0 6px 20px rgba(200,98,42,0.28)',
            }}>
              🍽️
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--db-text)', marginBottom: 4 }}>
              Restaurant Dashboard
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--db-text-muted)' }}>
              Sign in to manage your menu
            </p>
          </div>

          {/* Decorative divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, var(--db-gold))' }} />
            <span style={{ fontSize: 13, color: 'var(--db-gold)' }}>✦</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--db-gold), transparent)' }} />
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
            <div>
              <label className="db-label" htmlFor="db-email">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--db-text-muted)', pointerEvents: 'none' }} />
                <input
                  id="db-email"
                  className="db-input"
                  type="email"
                  placeholder="owner@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: 42 }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="db-label" htmlFor="db-password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--db-text-muted)', pointerEvents: 'none' }} />
                <input
                  id="db-password"
                  className="db-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: 42 }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: '#fff0f0', border: '1px solid #fecaca' }}>
                <AlertCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
                <p style={{ fontSize: '0.85rem', color: '#dc2626' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="db-btn db-btn-primary db-btn-lg db-btn-full"
              style={{ marginTop: 4 }}
            >
              {loading ? <Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} /> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.78rem', color: 'var(--db-text-muted)' }}>
          Powered by <a href="/" style={{ color: 'var(--db-accent)', fontWeight: 600, textDecoration: 'none' }}>MenuQR</a>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
