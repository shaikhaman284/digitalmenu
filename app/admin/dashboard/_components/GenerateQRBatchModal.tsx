'use client';

import { useState, useRef, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { generateSlug } from '@/lib/utils';
import { QRCodeCanvas } from 'qrcode.react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Download, Layers, CheckCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface GeneratedQR {
  slug: string;
  url: string;
}

export function GenerateQRBatchModal({ isOpen, onClose, onSuccess }: Props) {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [generated, setGenerated] = useState<GeneratedQR[]>([]);
  const [form, setForm] = useState({ batch: 'BATCH-01', startNum: '1', count: '10' });
  const qrRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const start = parseInt(form.startNum);
    const count = Math.min(parseInt(form.count), 100);

    try {
      const res = await fetch('/api/generate-qr-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: form.batch, startNum: start, count }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate QR codes');
      }

      const { slugs } = await res.json() as { slugs: string[] };
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const qrs: GeneratedQR[] = slugs.map((slug) => ({
        slug,
        url: `${baseUrl}/m/${slug}`,
      }));

      setGenerated(qrs);
      success(`Generated ${count} QR codes in ${form.batch}`);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to generate QR codes');
    } finally {
      setLoading(false);
    }
  }


  const setQrRef = useCallback((slug: string, canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      qrRefs.current.set(slug, canvas);
    } else {
      qrRefs.current.delete(slug);
    }
  }, []);

  async function handleDownloadAll() {
    setDownloadLoading(true);
    try {
      const zip = new JSZip();

      for (const { slug } of generated) {
        const canvas = qrRefs.current.get(slug);
        if (!canvas) continue;

        // Create a new canvas with slug text below
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = 460;
        exportCanvas.height = 500;
        const ctx = exportCanvas.getContext('2d')!;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 460, 500);

        // Draw QR
        ctx.drawImage(canvas, 30, 20, 400, 400);

        // Draw slug text
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(slug, 230, 460);

        // Convert to blob
        const dataUrl = exportCanvas.toDataURL('image/png');
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        zip.file(`${slug}.png`, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${form.batch}-qr-codes.zip`);
    } catch (err) {
      toastError('Failed to download ZIP');
    } finally {
      setDownloadLoading(false);
    }
  }

  async function downloadSingle(slug: string) {
    const canvas = qrRefs.current.get(slug);
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 460;
    exportCanvas.height = 500;
    const ctx = exportCanvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 460, 500);
    ctx.drawImage(canvas, 30, 20, 400, 400);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(slug, 230, 460);

    const link = document.createElement('a');
    link.download = `${slug}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }

  function handleClose() {
    setGenerated([]);
    setForm({ batch: 'BATCH-01', startNum: '1', count: '10' });
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generate QR Batch"
      size="xl"
    >
      {generated.length === 0 ? (
        <form onSubmit={handleGenerate} className="flex flex-col gap-4">
          <Input
            label="Batch Name"
            value={form.batch}
            onChange={(e) => setForm({ ...form, batch: e.target.value })}
            placeholder="e.g. BATCH-01"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Number"
              type="number"
              min="1"
              value={form.startNum}
              onChange={(e) => setForm({ ...form, startNum: e.target.value })}
              required
            />
            <Input
              label="Count (max 100)"
              type="number"
              min="1"
              max="100"
              value={form.count}
              onChange={(e) => setForm({ ...form, count: e.target.value })}
              required
            />
          </div>
          <p className="text-xs text-purple-400">
            Will generate: {generateSlug(parseInt(form.startNum || '1'))} →{' '}
            {generateSlug(parseInt(form.startNum || '1') + parseInt(form.count || '1') - 1)}
          </p>
          <div className="flex gap-3 mt-2">
            <Button type="button" variant="ghost" fullWidth onClick={handleClose}>Cancel</Button>
            <Button type="submit" loading={loading} fullWidth leftIcon={<Layers size={16} />}>
              Generate Batch
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-400" />
              <span className="text-white font-medium">{generated.length} QR codes generated</span>
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

          {/* QR Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
            {generated.map(({ slug, url }) => (
              <div
                key={slug}
                className="glass-light rounded-xl p-2 flex flex-col items-center gap-1 cursor-pointer hover:border-purple-500/40 transition-colors"
                onClick={() => downloadSingle(slug)}
                title={`Download ${slug}`}
              >
                {/* Hidden QR canvas for extraction */}
                <div className="relative">
                  <QRCodeCanvas
                    id={`qr-${slug}`}
                    value={url}
                    size={100}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                    ref={(canvas: HTMLCanvasElement | null) => setQrRef(slug, canvas)}
                  />
                </div>
                <span className="text-[10px] font-mono text-purple-300">{slug}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-2">
            <Button variant="ghost" fullWidth onClick={handleClose}>Close</Button>
            <Button fullWidth onClick={() => { onSuccess(); handleClose(); }}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
