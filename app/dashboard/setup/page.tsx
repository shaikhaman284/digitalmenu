'use client';

import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Upload, CheckCircle, AlertCircle, QrCode } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const QrScanner = dynamic(() => import('./_components/QrScanner'), { ssr: false });

interface Profile {
  id: string; name: string; phone: string; location: string;
  logo_url: string; qr_slug: string; plan_expires_at: string | null;
}

function SetupContent() {
  const { success, error: toastError } = useToast();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [qrStatus, setQrStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [qrMessage, setQrMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: '', phone: '', location: '' });
  const [signedUrl, setSignedUrl] = useState('');

  async function fetchSignedUrl(slug: string) {
    try {
      const res = await fetch('/api/dashboard/signed-menu-url');
      if (res.ok) {
        const { signedUrl } = await res.json();
        if (signedUrl) setSignedUrl(signedUrl);
        else {
          const base = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
          setSignedUrl(`${base}/m/${slug}`);
        }
      }
    } catch {
      const base = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      setSignedUrl(`${base}/m/${slug}`);
    }
  }



  useEffect(() => {
    fetch('/api/dashboard/setup')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProfile(data);
        setForm({ name: data.name, phone: data.phone, location: data.location });
        if (data.logo_url) setPreviewUrl(data.logo_url);
        if (data.qr_slug) fetchSignedUrl(data.qr_slug);
      })
      .catch((err) => toastError(err.message));
  }, []);


  async function handleLogoUpload(file: File) {
    if (!profile) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('path', `restaurants/${profile.id}/logo`);
      const uploadRes = await fetch('/api/upload-image', { method: 'POST', body: fd });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { url } = await uploadRes.json();
      await fetch('/api/dashboard/setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: url }),
      });
      setPreviewUrl(url);
      success('Logo uploaded!');
    } catch {
      toastError('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const res = await fetch('/api/dashboard/setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, phone: form.phone, location: form.location }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      success('Profile saved!');
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleQRScan(scannedUrl: string) {
    if (!profile) return;
    setQrStatus('idle');
    try {
      const urlObj = new URL(scannedUrl);
      const slug = urlObj.pathname.split('/m/')[1];
      if (!slug) throw new Error('Invalid QR code — not a MenuQR code');
      const res = await fetch('/api/dashboard/setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_slug: slug }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setQrStatus('success');
      setQrMessage(`QR ${slug} is now active and live!`);
      setProfile((p) => p ? { ...p, qr_slug: slug } : p);
      fetchSignedUrl(slug);
      success(`QR ${slug} bound successfully!`);

    } catch (err) {
      setQrStatus('error');
      setQrMessage(err instanceof Error ? err.message : 'Invalid QR code');
    }
  }

  return (
    <DashboardLayout restaurantName={profile?.name}>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 580 }}>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--db-text)', marginBottom: 4 }}>Setup</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--db-text-muted)' }}>Configure your restaurant profile and bind your QR code</p>
        </div>

        {/* Step tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2].map((s) => (
            <button key={s} onClick={() => setStep(s)} className={`db-tab${step === s ? ' active' : ''}`}>
              {s === 1 ? '1. Profile' : '2. Bind QR'}
            </button>
          ))}
        </div>

        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="db-card animate-fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Logo upload */}
            <div>
              <p className="db-label" style={{ marginBottom: 10 }}>Restaurant Logo</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  border: '2px solid var(--db-border)', overflow: 'hidden',
                  background: 'var(--db-surface-2)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {previewUrl
                    ? <Image src={previewUrl} alt="Logo" width={80} height={80} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
                    : <Upload size={22} style={{ color: 'var(--db-text-muted)' }} />
                  }
                </div>
                <div>
                  <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setPreviewUrl(URL.createObjectURL(file)); handleLogoUpload(file); }
                    }}
                  />
                  <Button variant="outline" size="sm" loading={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()} leftIcon={<Upload size={13} />}>
                    Upload Logo
                  </Button>
                  <p style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: 6 }}>JPG, PNG, or WebP · Max 5MB</p>
                </div>
              </div>
            </div>

            <div className="db-divider" />

            <Input label="Restaurant Name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="The Spice Garden" required />
            <Input label="Phone Number" type="tel" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210" required />
            <Input label="Location" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="123 Main St, Hyderabad" />

            <Button onClick={handleSaveProfile} loading={saving} style={{ alignSelf: 'flex-start' }}>
              Save Profile
            </Button>
          </div>
        )}

        {/* Step 2: QR Bind */}
        {step === 2 && (
          <div className="db-card animate-fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--db-text)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <QrCode size={17} style={{ color: 'var(--db-accent)' }} /> Bind Your Physical QR Code
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--db-text-muted)' }}>Point your camera at the MenuQR sticker you received.</p>
            </div>

            {qrStatus === 'idle' && (
              <div style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px solid var(--db-border)' }}>
                <QrScanner onResult={handleQRScan} />
              </div>
            )}

            {qrStatus === 'success' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={36} style={{ color: '#16a34a' }} />
                </div>
                <p style={{ fontWeight: 600, color: 'var(--db-text)', textAlign: 'center' }}>{qrMessage}</p>
                <Button onClick={() => setQrStatus('idle')}>Scan Another</Button>
              </div>
            )}

            {qrStatus === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fff0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={36} style={{ color: '#dc2626' }} />
                </div>
                <p style={{ fontWeight: 500, color: '#dc2626', textAlign: 'center' }}>{qrMessage}</p>
                <Button onClick={() => setQrStatus('idle')} variant="outline">Try Again</Button>
              </div>
            )}

            {profile?.qr_slug && (
              <div style={{ padding: '14px 16px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Currently Bound QR</p>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--db-text)', fontFamily: 'var(--db-font-heading)' }}>{profile.qr_slug}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: 2, wordBreak: 'break-all' }}>
                  {signedUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/m/${profile.qr_slug}`}
                </p>

              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function SetupPage() {
  return <ToastProvider><SetupContent /></ToastProvider>;
}
