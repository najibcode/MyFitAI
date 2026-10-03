// ─────────────────────────────────────────────────────────────
// MyFitAI — Nutrition Data Sources & Attribution Modal
// Complete disclosure of food databases, open licenses, and privacy practices.
// ─────────────────────────────────────────────────────────────

interface NutritionAttributionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NutritionAttributionModal({
  isOpen,
  onClose,
}: NutritionAttributionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[var(--color-surface-container)] w-full max-w-lg rounded-3xl h-[85vh] max-h-[680px] flex flex-col overflow-hidden border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-on-surface">Data Sources & Attribution</h3>
              <p className="text-[11px] text-on-surface-variant">Licensing, references & privacy transparency</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-on-surface-variant leading-relaxed">
          {/* Section 1: Open Food Facts */}
          <div className="bg-[var(--color-surface-container-high)] p-4 rounded-2xl border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="font-headline font-bold text-sm text-on-surface">Open Food Facts</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                ODbL License
              </span>
            </div>
            <p>
              Packaged food data, ingredients, barcodes, and Nutri-Score grades are powered by Open Food Facts under the Open Database License (ODbL). Product photographs and images are contributed by the Open Food Facts community.
            </p>
            <a
              href="https://world.openfoodfacts.org"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-semibold block pt-1"
            >
              world.openfoodfacts.org →
            </a>
          </div>

          {/* Section 2: USDA FoodData Central */}
          <div className="bg-[var(--color-surface-container-high)] p-4 rounded-2xl border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="font-headline font-bold text-sm text-on-surface">USDA FoodData Central</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Public Domain
              </span>
            </div>
            <p>
              Standardized reference nutrients for raw, whole, and foundation ingredients are derived from the U.S. Department of Agriculture (USDA), Agricultural Research Service.
            </p>
            <a
              href="https://fdc.nal.usda.gov"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-semibold block pt-1"
            >
              fdc.nal.usda.gov →
            </a>
          </div>

          {/* Section 3: ICMR-NIN IFCT 2017 */}
          <div className="bg-[var(--color-surface-container-high)] p-4 rounded-2xl border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="font-headline font-bold text-sm text-on-surface">ICMR-NIN IFCT 2017</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Authoritative Reference
              </span>
            </div>
            <p>
              Nutritional values for authentic Indian staples (e.g. Roti, Idli, Dosa, Sambar, Toor Dal, Paneer, Curd) reference published benchmarks from the Indian Council of Medical Research (ICMR) and National Institute of Nutrition (NIN) Indian Food Composition Tables (IFCT 2017).
            </p>
          </div>

          {/* Section 4: Privacy & Data Protection */}
          <div className="bg-[var(--color-surface-container-high)] p-4 rounded-2xl border border-white/5 space-y-1.5">
            <h4 className="font-headline font-bold text-sm text-on-surface">Privacy & Local Storage</h4>
            <p>
              • <strong>Offline-First:</strong> All food diary entries, custom recipes, water logs, and weight history are stored securely on your device inside an isolated IndexedDB database.
            </p>
            <p>
              • <strong>Minimal Transmission:</strong> Search queries send only the food search term or barcode to query databases. No personal identifying information (PII) is transmitted.
            </p>
            <p>
              • <strong>Ownership:</strong> You maintain full data sovereignty with one-tap JSON and CSV backup exports.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[var(--color-surface-container)] border-t border-white/5 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-on-surface font-headline font-bold text-xs uppercase tracking-wide rounded-xl"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
