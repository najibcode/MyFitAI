// ─────────────────────────────────────────────────────────────
// MyFitAI — Barcode Scanner Modal
// Camera scanner with visual viewfinder, manual code entry,
// instant lookup via Open Food Facts and custom food creation fallback.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import { ScanBarcode, CameraOff, X, Loader2, AlertTriangle, Plus } from 'lucide-react';
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
      } catch {
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
      <div className="bg-[#151517] w-full max-w-md rounded-2xl overflow-hidden border border-[#2A2A2D] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#2A2A2D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF8A00]/10 border border-[#FF8A00]/20 flex items-center justify-center text-[#FF8A00]">
              <ScanBarcode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F5F5F5]">Barcode Scanner</h3>
              <p className="text-[11px] text-[#A1A1A6]">Scan packaged foods & nutrition labels</p>
            </div>
          </div>
          <button
            onClick={() => {
              barcodeScannerEngine.stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera / Viewfinder Box */}
        <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden border-b border-[#2A2A2D]">
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
              <div className="w-64 h-36 border-2 border-[#FF8A00]/80 rounded-xl relative shadow-[0_0_20px_rgba(255,138,0,0.25)]">
                {/* Animated scanning line */}
                <div className="absolute left-0 right-0 h-0.5 bg-[#FF8A00] animate-pulse" style={{ top: '50%' }} />
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#FF8A00]" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#FF8A00]" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#FF8A00]" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#FF8A00]" />
              </div>
            </div>
          )}

          {!cameraActive && (
            <div className="p-6 text-center text-[#A1A1A6] flex flex-col items-center">
              <CameraOff className="w-10 h-10 mb-2 text-[#A1A1A6]/50" />
              <p className="text-xs">Camera stream idle or permission needed.</p>
            </div>
          )}

          {isLookingUp && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#FF8A00] animate-spin" />
              <p className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">Looking up product...</p>
            </div>
          )}
        </div>

        {/* Feedback / Not Found alert */}
        {notFoundBarcode && (
          <div className="m-4 p-3.5 rounded-xl bg-[#F5C542]/10 border border-[#F5C542]/20 text-[#F5C542] text-xs">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <AlertTriangle className="w-4 h-4 text-[#F5C542]" />
              <span>Product Not In Database</span>
            </div>
            <p className="text-[11px] text-[#F5C542]/80 mb-2.5">
              Barcode: <span className="font-mono tabular-nums">{notFoundBarcode}</span>
            </p>
            <button
              onClick={() => {
                barcodeScannerEngine.stopCamera();
                onClose();
                onCreateCustomWithBarcode(notFoundBarcode);
              }}
              className="w-full min-h-[44px] py-2 px-3 rounded-lg bg-[#FF8A00] text-black font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Custom Food With This Barcode
            </button>
          </div>
        )}

        {errorMsg && !notFoundBarcode && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/20 text-[#FF453A] text-xs">
            {errorMsg}
          </div>
        )}

        {/* Manual Barcode Input */}
        <div className="p-4 bg-[#1E1E20] border-t border-[#2A2A2D] space-y-2">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1A6] block">
            Or Enter Barcode Manually
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 8901030704468"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLookup(manualCode)}
              className="flex-1 bg-[#151517] border border-[#2A2A2D] rounded-xl px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#FF8A00] font-mono tabular-nums"
            />
            <button
              onClick={() => handleLookup(manualCode)}
              disabled={!manualCode.trim() || isLookingUp}
              className="px-4 py-2 bg-[#FF8A00] text-black font-bold text-xs uppercase tracking-wide rounded-xl disabled:opacity-50 active:scale-95 transition-all min-h-[44px]"
            >
              Lookup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
