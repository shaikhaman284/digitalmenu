'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { QRCodeCanvas } from 'qrcode.react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  QrCode, ArrowLeft, Download, Layers, CheckCircle,
  XCircle, RefreshCw, ChevronRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Batch {
  batch: string;
  total: number;
  bound: number;
  unbound: number;
  createdAt: string | null;
}

interface QRItem {
  slug: string;
  status: string;
  restaurant_id: string | null;
  restaurant_name: string | null;
  bound_at: string | null;
  created_at: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Renders a 2400×2600 HD QR PNG and returns a Blob */
async function renderHDQR(slug: string, hiddenCanvas: HTMLCanvasElement): Promise<Blob> {
  const W = 2400, H = 2600, QR_SIZE = 2200, PAD = (W - QR_SIZE) / 2;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = W;
  exportCanvas.height = H;
  const ctx = exportCanvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(hiddenCanvas, PAD, PAD, QR_SIZE, QR_SIZE);
  ctx.fillStyle = '#111111';
  ctx.font = 'bold 120px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(slug, W / 2, QR_SIZE + PAD + 140);
  return new Promise<Blob>((resolve, reject) => {
    exportCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
  });
}

// ── Batch List View ────────────────────────────────────────────────────────
function BatchListView({ onSelectBatch }: { onSelectBatch: (b: Batch) => void }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/qr-batches')
      .then((r) => r.json())
      .then((d) => setBatches(d.batches || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-purple-900/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
            <Layers size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">QR Batches</h2>
            <p className="text-xs text-purple-400">{batches.length} batch{batches.length !== 1 ? 'es' : ''} total</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <RefreshCw size={24} className="text-purple-400 animate-spin mx-auto mb-3" />
          <p className="text-purple-400 text-sm">Loading batches…</p>
        </div>
      ) : batches.length === 0 ? (
        <div className="p-12 text-center">
          <QrCode size={40} className="text-purple-700 mx-auto mb-3" />
          <p className="text-purple-400">No QR batches generated yet.</p>
          <p className="text-purple-600 text-sm mt-1">Go to Dashboard → Generate QR Batch</p>
        </div>
      ) : (
        <div className="divide-y divide-purple-900/20">
          {batches.map((b) => (
            <button
              key={b.batch}
              onClick={() => onSelectBatch(b)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl glass-light flex items-center justify-center shrink-0">
                <QrCode size={18} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">{b.batch}</p>
                <p className="text-xs text-purple-400 mt-0.5">{formatDate(b.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3 text-xs shrink-0">
                <span className="text-purple-300">{b.total} total</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle size={12} /> {b.bound}
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <XCircle size={12} /> {b.unbound}
                </span>
              </div>
              <ChevronRight size={16} className="text-purple-600 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Batch Detail View ──────────────────────────────────────────────────────
function BatchDetailView({ batch, onBack }: { batch: Batch; onBack: () => void }) {
  const { error: toastError } = useToast();
  const [qrItems, setQrItems] = useState<QRItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const qrRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const baseUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_BASE_URL || window.location.origin)
    : '';

  const setQrRef = useCallback((slug: string, canvas: HTMLCanvasElement | null) => {
    if (canvas) qrRefs.current.set(slug, canvas);
    else qrRefs.current.delete(slug);
  }, []);

  useEffect(() => {
    fetch(`/api/admin/qr-batches?batch=${encodeURIComponent(batch.batch)}`)
      .then((r) => r.json())
      .then((d) => setQrItems(d.qrCodes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [batch.batch]);

  async function handleDownloadAll() {
    setDownloadLoading(true);
    try {
      const zip = new JSZip();
      for (const item of qrItems) {
        const canvas = qrRefs.current.get(item.slug);
        if (!canvas) continue;
        const blob = await renderHDQR(item.slug, canvas);
        zip.file(`${item.slug}.png`, blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${batch.batch}-qr-codes.zip`);
    } catch {
      toastError('Failed to create ZIP');
    } finally {
      setDownloadLoading(false);
    }
  }

  async function downloadSingle(slug: string) {
    const canvas = qrRefs.current.get(slug);
    if (!canvas) return;
    try {
      const blob = await renderHDQR(slug, canvas);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `${slug}.png`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toastError(`Failed to download ${slug}`);
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} />} onClick={onBack}>
          Back
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{batch.batch}</h2>
          <p className="text-purple-400 text-sm">{batch.total} QR codes · {batch.bound} bound · {batch.unbound} unbound</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download size={14} />}
          loading={downloadLoading}
          onClick={handleDownloadAll}
        >
          Download All ZIP
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: batch.total, color: 'text-white' },
          { label: 'Bound', value: batch.bound, color: 'text-emerald-400' },
          { label: 'Unbound', value: batch.unbound, color: 'text-amber-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-purple-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* QR Grid */}
      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <RefreshCw size={24} className="text-purple-400 animate-spin mx-auto mb-3" />
          <p className="text-purple-400 text-sm">Loading QR codes…</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="divide-y divide-purple-900/20">
            {qrItems.map((item) => {
              const qrUrl = `${baseUrl}/m/${item.slug}`;
              const isBound = item.status === 'bound';
              return (
                <div
                  key={item.slug}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Hidden HD canvas */}
                  <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }}>
                    <QRCodeCanvas
                      value={qrUrl}
                      size={512}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="H"
                      marginSize={2}
                      ref={(c: HTMLCanvasElement | null) => setQrRef(item.slug, c)}
                    />
                  </div>
                  {/* Preview thumbnail */}
                  <div className="shrink-0 rounded-lg overflow-hidden border border-white/10 bg-white p-1">
                    <QRCodeCanvas
                      value={qrUrl}
                      size={56}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="H"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-semibold text-white">{item.slug}</p>
                    {isBound && item.restaurant_name && (
                      <p className="text-xs text-purple-400 mt-0.5 truncate">
                        → {item.restaurant_name}
                      </p>
                    )}
                    {isBound && item.bound_at && (
                      <p className="text-xs text-purple-600">Bound {formatDate(item.bound_at)}</p>
                    )}
                  </div>

                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isBound
                      ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-900/30 text-amber-400 border border-amber-500/20'
                  }`}>
                    {isBound ? 'Bound' : 'Unbound'}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Download size={13} />}
                    onClick={() => downloadSingle(item.slug)}
                  >
                    HD PNG
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page Root ─────────────────────────────────────────────────────────────
function QRManagementContent() {
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center glow-brand">
          <QrCode size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">QR Management</h1>
          <p className="text-purple-400 text-sm">View and re-download all generated QR batches</p>
        </div>
      </div>

      {selectedBatch ? (
        <BatchDetailView batch={selectedBatch} onBack={() => setSelectedBatch(null)} />
      ) : (
        <BatchListView onSelectBatch={setSelectedBatch} />
      )}
    </div>
  );
}

export default function QRManagementPage() {
  return (
    <div className="admin-theme">
      <ToastProvider>
        <AdminLayout>
          <QRManagementContent />
        </AdminLayout>
      </ToastProvider>
    </div>
  );
}
