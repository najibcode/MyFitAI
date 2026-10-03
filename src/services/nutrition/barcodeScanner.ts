// ─────────────────────────────────────────────────────────────
// MyFitAI — Barcode Scanner Engine
// Native BarcodeDetector API support with camera stream management
// and manual barcode entry fallback for mobile/web browsers.
// ─────────────────────────────────────────────────────────────

export interface BarcodeScanResult {
  rawValue: string;
  format?: string;
}

export class BarcodeScannerEngine {
  private stream: MediaStream | null = null;
  private detector: any = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        this.detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
        });
      } catch {
        this.detector = null;
      }
    }
  }

  isSupported(): boolean {
    return !!this.detector || (typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia);
  }

  hasNativeDetector(): boolean {
    return !!this.detector;
  }

  /**
   * Starts camera video stream. Returns stream to attach to a <video> element.
   */
  async startCamera(videoElement: HTMLVideoElement): Promise<MediaStream> {
    this.stopCamera();

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.stream = stream;
    videoElement.srcObject = stream;
    await videoElement.play();
    return stream;
  }

  /**
   * Scans a single frame from the video element using native BarcodeDetector.
   */
  async scanFrame(videoElement: HTMLVideoElement): Promise<BarcodeScanResult | null> {
    if (!this.detector || !videoElement || videoElement.readyState < 2) return null;

    try {
      const barcodes = await this.detector.detect(videoElement);
      if (barcodes && barcodes.length > 0) {
        return {
          rawValue: barcodes[0].rawValue,
          format: barcodes[0].format,
        };
      }
    } catch {
      // Frame detect skip
    }

    return null;
  }

  /**
   * Stops active camera stream.
   */
  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}

export const barcodeScannerEngine = new BarcodeScannerEngine();
