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
  XCircle, RefreshCw, ChevronRight, Trash2, AlertTriangle,
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

async function renderHDQR(slug: string, hiddenCanvas: HTMLCanvasElement): Promise<Blob> {
  const W = 2400, H = 2600, QR_SIZE = 2200, PAD = (W - QR_SIZE) / 2;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = W; exportCanvas.height = H;
  const ctx = exportCanvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(hiddenCanvas, PAD, PAD, QR_SIZE, QR_SIZE);
  ctx.fillStyle = '#111111'; ctx.font = 'bold 120px monospace'; ctx.textAlign = 'center';
  ctx.fillText(slug, W / 2, QR_SIZE + PAD + 140);
  return new Promise<Blob>((resolve, reject) => {
    exportCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
  });
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────
function ConfirmDialog({
  title, message, danger, onConfirm, onCancel, loading,
}: {
  title: string;
  message: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative glass rounded-2xl p-6 max-w-sm w-full animate-scale-in shadow-2xl border border-purple-900/40">
        <div className="flex items-start gap-4 mb-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-red-900/40' : 'bg-amber-900/40'}`}>
            <AlertTriangle size={20} className={danger ? 'text-red-400' : 'text-amber-400'} />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">{title}</h3>
            <p className="text-purple-400 text-sm mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 h-10 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              danger
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Batch List View ────────────────────────────────────────────────────────
function BatchListView({
  onSelectBatch,
  onBatchDeleted,
}: {
  onSelectBatch: (b: Batch) => void;
  onBatchDeleted: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<Batch | null>(null);
  const [deleting, setDeleting] = useState(false);

  function loadBatches() {
    setLoading(true);
    fetch('/api/admin/qr-batches')
      .then((r) => r.json())
      .then((d) => setBatches(d.batches || []))
      .catch(() => toastError('Failed to load batches'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadBatches(); }, []);

  async function handleDeleteBatch(batch: Batch) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/qr-batches?batch=${encodeURIComponent(batch.batch)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      success(`Deleted ${data.deleted} QR codes from ${batch.batch}`);
      setConfirmDelete(null);
      loadBatches();
      onBatchDeleted();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${confirmDelete.batch}?`}
          message={`This will permanently delete all ${confirmDelete.total} QR codes in this batch.${confirmDelete.bound > 0 ? ` ${confirmDelete.bound} QR(s) are currently bound — the linked restaurant(s) will lose their active QR.` : ''} This action cannot be undone.`}
          danger
          loading={deleting}
          onConfirm={() => handleDeleteBatch(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-purple-900/30 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
            <Layers size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">QR Batches</h2>
            <p className="text-xs text-purple-400">{batches.length} batch{batches.length !== 1 ? 'es' : ''} total</p>
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
              <div key={b.batch} className="flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                {/* Clickable batch info */}
                <button
                  onClick={() => onSelectBatch(b)}
                  className="flex items-center gap-4 flex-1 min-w-0 text-left"
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

                {/* Delete batch button */}
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(b); }}
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-purple-600 hover:text-red-400 hover:bg-red-900/20 transition-all"
                  title={`Delete ${b.batch}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Batch Detail View ──────────────────────────────────────────────────────
function BatchDetailView({
  batch,
  onBack,
  onRefreshNeeded,
}: {
  batch: Batch;
  onBack: () => void;
  onRefreshNeeded: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [qrItems, setQrItems] = useState<QRItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<QRItem | null>(null);
  const [deletingSlug, setDeletingSlug] = useState('');
  const qrRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const baseUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_BASE_URL || window.location.origin)
    : '';

  const setQrRef = useCallback((slug: string, canvas: HTMLCanvasElement | null) => {
    if (canvas) qrRefs.current.set(slug, canvas);
    else qrRefs.current.delete(slug);
  }, []);

  function loadItems() {
    setLoading(true);
    fetch(`/api/admin/qr-batches?batch=${encodeURIComponent(batch.batch)}`)
      .then((r) => r.json())
      .then((d) => setQrItems(d.qrCodes || []))
      .catch(() => toastError('Failed to load QR codes'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadItems(); }, [batch.batch]);

  async function handleDeleteSlug(item: QRItem) {
    setDeletingSlug(item.slug);
    try {
      const res = await fetch(`/api/admin/qr-batches?slug=${encodeURIComponent(item.slug)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      success(`Deleted ${item.slug}`);
      setConfirmDelete(null);
      setQrItems((prev) => prev.filter((q) => q.slug !== item.slug));
      onRefreshNeeded();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingSlug('');
    }
  }

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
      const a = document.createElement('a'); a.download = `${slug}.png`; a.href = url; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toastError(`Failed to download ${slug}`);
    }
  }

  const stats = {
    total: qrItems.length,
    bound: qrItems.filter((q) => q.status === 'bound').length,
    unbound: qrItems.filter((q) => q.status !== 'bound').length,
  };

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${confirmDelete.slug}?`}
          message={`This will permanently delete this QR code.${
            confirmDelete.status === 'bound' && confirmDelete.restaurant_name
              ? ` It is currently bound to "${confirmDelete.restaurant_name}" — that restaurant will lose its active QR.`
              : ''
          } This action cannot be undone.`}
          danger={confirmDelete.status === 'bound'}
          loading={!!deletingSlug}
          onConfirm={() => handleDeleteSlug(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div className="flex flex-col gap-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} />} onClick={onBack}>
            Back
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white">{batch.batch}</h2>
            <p className="text-purple-400 text-sm">
              {stats.total} QR codes · {stats.bound} bound · {stats.unbound} unbound
            </p>
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
            { label: 'Total', value: stats.total, color: 'text-white' },
            { label: 'Bound', value: stats.bound, color: 'text-emerald-400' },
            { label: 'Unbound', value: stats.unbound, color: 'text-amber-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-purple-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* QR list */}
        {loading ? (
          <div className="glass rounded-2xl p-12 text-center">
            <RefreshCw size={24} className="text-purple-400 animate-spin mx-auto mb-3" />
            <p className="text-purple-400 text-sm">Loading QR codes…</p>
          </div>
        ) : qrItems.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <QrCode size={36} className="text-purple-700 mx-auto mb-3" />
            <p className="text-purple-400">No QR codes in this batch.</p>
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
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
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

                    {/* Preview */}
                    <div className="shrink-0 rounded-lg overflow-hidden border border-white/10 bg-white p-1">
                      <QRCodeCanvas value={qrUrl} size={52} bgColor="#ffffff" fgColor="#000000" level="H" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-semibold text-white">{item.slug}</p>
                      {isBound && item.restaurant_name && (
                        <p className="text-xs text-emerald-400 mt-0.5 truncate">→ {item.restaurant_name}</p>
                      )}
                      {isBound && item.bound_at && (
                        <p className="text-xs text-purple-600">Bound {formatDate(item.bound_at)}</p>
                      )}
                    </div>

                    {/* Status badge */}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                      isBound
                        ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-900/30 text-amber-400 border border-amber-500/20'
                    }`}>
                      {isBound ? 'Bound' : 'Unbound'}
                    </span>

                    {/* Download */}
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Download size={13} />}
                      onClick={() => downloadSingle(item.slug)}
                    >
                      <span className="hidden sm:inline">HD PNG</span>
                    </Button>

                    {/* Delete */}
                    <button
                      onClick={() => setConfirmDelete(item)}
                      disabled={!!deletingSlug}
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-purple-600 hover:text-red-400 hover:bg-red-900/20 transition-all disabled:opacity-40"
                      title={`Delete ${item.slug}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Page Root ─────────────────────────────────────────────────────────────
function QRManagementContent() {
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center glow-brand">
          <QrCode size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">QR Management</h1>
          <p className="text-purple-400 text-sm">View, re-download, and delete QR batches</p>
        </div>
      </div>

      {selectedBatch ? (
        <BatchDetailView
          key={`${selectedBatch.batch}-${refreshKey}`}
          batch={selectedBatch}
          onBack={() => setSelectedBatch(null)}
          onRefreshNeeded={() => setRefreshKey((k) => k + 1)}
        />
      ) : (
        <BatchListView
          key={refreshKey}
          onSelectBatch={setSelectedBatch}
          onBatchDeleted={() => setRefreshKey((k) => k + 1)}
        />
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
