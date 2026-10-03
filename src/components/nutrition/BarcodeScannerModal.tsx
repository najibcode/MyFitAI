// ─────────────────────────────────────────────────────────────
// MyFitAI — Barcode Scanner Modal
// Camera scanner with visual viewfinder, manual code entry,
// instant lookup via Open Food Facts and custom food creation fallback.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import type { FoodItem } from '../../types/nutrition';
import { foodRepository } from '../../services/nutrition/FoodRepository';
import { barcodeScannerEngine } from '../../services/nutrition/barcodeScanner';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodFound: (food: FoodItem) => void;
  onCreateCustomWithBarcode: (barcode: string) => void;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onFoodFound,
  onCreateCustomWithBarcode,
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const handleLookup = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setIsLookingUp(true);
    setErrorMsg(null);
    setNotFoundBarcode(null);

    try {
      const food = await foodRepository.lookupBarcode(trimmed);
      if (food) {
        barcodeScannerEngine.stopCamera();
        onFoodFound(food);
      } else {
        setNotFoundBarcode(trimmed);
        setErrorMsg(`No product found for barcode "${trimmed}".`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error looking up barcode.');
    } finally {
      setIsLookingUp(false);
    }
  }, [onFoodFound]);

  // Camera start and frame scanning loop
  useEffect(() => {
    if (!isOpen) {
      barcodeScannerEngine.stopCamera();
      setCameraActive(false);
      setNotFoundBarcode(null);
      setErrorMsg(null);
      return;
    }

    let isMounted = true;
    let scanInterval: any = null;

    const initCamera = async () => {
      if (!videoRef.current) return;
      try {
        await barcodeScannerEngine.startCamera(videoRef.current);
        if (isMounted) {
          setCameraActive(true);

          // Scan loop if native detector is available
          if (barcodeScannerEngine.hasNativeDetector()) {
            scanInterval = setInterval(async () => {
              if (videoRef.current && isMounted) {
                const result = await barcodeScannerEngine.scanFrame(videoRef.current);
                if (result?.rawValue) {
                  clearInterval(scanInterval);
                  handleLookup(result.rawValue);
                }
              }
            }, 300);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg('Camera access unavailable. You can enter the barcode number manually below.');
          setCameraActive(false);
        }
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      if (scanInterval) clearInterval(scanInterval);
      barcodeScannerEngine.stopCamera();
    };
  }, [isOpen, handleLookup]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[var(--color-surface-container)] w-full max-w-md rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">barcode_scanner</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-on-surface">Barcode Scanner</h3>
              <p className="text-[11px] text-on-surface-variant">Scan packaged foods & snacks</p>
            </div>
          </div>
          <button
            onClick={() => {
              barcodeScannerEngine.stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Camera / Viewfinder Box */}
        <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              cameraActive ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Scanner Overlay Box */}
          {cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-36 border-2 border-primary/80 rounded-2xl relative shadow-[0_0_20px_rgba(255,122,0,0.3)]">
                {/* Animated scanning line */}
                <div className="absolute left-0 right-0 h-0.5 bg-primary animate-pulse" style={{ top: '50%' }} />
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-primary" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-primary" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-primary" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-primary" />
              </div>
            </div>
          )}

          {!cameraActive && (
            <div className="p-6 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">no_photography</span>
              <p className="text-xs">Camera stream idle or permission needed.</p>
            </div>
          )}

          {isLookingUp && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs font-bold text-on-surface uppercase tracking-wider">Looking up product...</p>
            </div>
          )}
        </div>

        {/* Feedback / Not Found alert */}
        {notFoundBarcode && (
          <div className="m-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            <p className="font-bold mb-1">Product Not In Database</p>
            <p className="text-[11px] text-amber-200/80 mb-2.5">
              Barcode: <span className="font-mono">{notFoundBarcode}</span>
            </p>
            <button
              onClick={() => {
                barcodeScannerEngine.stopCamera();
                onClose();
                onCreateCustomWithBarcode(notFoundBarcode);
              }}
              className="w-full py-2 px-3 rounded-xl bg-amber-400 text-black font-bold text-xs uppercase tracking-wide shadow-md active:scale-95 transition-all"
            >
              Create Custom Food With This Barcode
            </button>
          </div>
        )}

        {errorMsg && !notFoundBarcode && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Manual Barcode Input */}
        <div className="p-4 bg-[var(--color-surface-container-high)] border-t border-white/5 space-y-2">
          <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">
            Or Enter Barcode Manually
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 8901030704468"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLookup(manualCode)}
              className="flex-1 bg-[var(--color-surface-container)] border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary font-mono"
            />
            <button
              onClick={() => handleLookup(manualCode)}
              disabled={!manualCode.trim() || isLookingUp}
              className="px-4 py-2 bg-primary text-black font-bold text-xs uppercase tracking-wide rounded-xl disabled:opacity-50 active:scale-95 transition-all"
            >
              Lookup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
