'use client';

import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QrScannerProps {
  onResult: (result: string) => void;
}

export default function QrScanner({ onResult }: QrScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const hasScanned = useRef(false);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader-setup',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        if (hasScanned.current) return;
        hasScanned.current = true;
        scanner.clear().catch(() => {});
        onResult(decodedText);
      },
      () => {
        // Ignore scan errors
      }
    );

    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [onResult]);

  return (
    <div>
      <div id="qr-reader-setup" style={{ width: '100%' }} />
    </div>
  );
}
