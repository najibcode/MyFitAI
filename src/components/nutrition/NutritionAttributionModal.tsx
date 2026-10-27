// ─────────────────────────────────────────────────────────────
// MyFitAI — Nutrition Data Sources & Attribution Modal
// Complete disclosure of food databases, open licenses, and privacy practices.
// ─────────────────────────────────────────────────────────────

import { ShieldCheck, X } from 'lucide-react';

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
      <div className="bg-[#151517] w-full max-w-lg rounded-2xl h-[85vh] max-h-[680px] flex flex-col overflow-hidden border border-[#2A2A2D] shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-[#2A2A2D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#30D158]/10 border border-[#30D158]/20 flex items-center justify-center text-[#30D158]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F5F5F5]">Data Sources & Attribution</h3>
              <p className="text-[11px] text-[#A1A1A6]">Licensing, references & privacy transparency</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-[#A1A1A6] leading-relaxed">
          {/* Section 1: Open Food Facts */}
          <div className="bg-[#1E1E20] p-4 rounded-xl border border-[#2A2A2D] space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-[#F5F5F5]">Open Food Facts</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4F9CF9]/10 text-[#4F9CF9] border border-[#4F9CF9]/20">
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
              className="text-[#30D158] hover:underline font-semibold block pt-1"
            >
              world.openfoodfacts.org →
            </a>
          </div>

          {/* Section 2: USDA FoodData Central */}
          <div className="bg-[#1E1E20] p-4 rounded-xl border border-[#2A2A2D] space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-[#F5F5F5]">USDA FoodData Central</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20">
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
              className="text-[#30D158] hover:underline font-semibold block pt-1"
            >
              fdc.nal.usda.gov →
            </a>
          </div>

          {/* Section 3: ICMR-NIN IFCT 2017 */}
          <div className="bg-[#1E1E20] p-4 rounded-xl border border-[#2A2A2D] space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-[#F5F5F5]">ICMR-NIN IFCT 2017</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5C542]/10 text-[#F5C542] border border-[#F5C542]/20">
                Authoritative Reference
              </span>
            </div>
            <p>
              Nutritional values for authentic Indian staples (e.g. Roti, Idli, Dosa, Sambar, Toor Dal, Paneer, Curd) reference published benchmarks from the Indian Council of Medical Research (ICMR) and National Institute of Nutrition (NIN) Indian Food Composition Tables (IFCT 2017).
            </p>
          </div>

          {/* Section 4: Privacy & Data Protection */}
          <div className="bg-[#1E1E20] p-4 rounded-xl border border-[#2A2A2D] space-y-1.5">
            <h4 className="font-bold text-sm text-[#F5F5F5]">Privacy & Local Storage</h4>
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
        <div className="p-3 bg-[#151517] border-t border-[#2A2A2D] text-center">
          <button
            onClick={onClose}
            className="w-full min-h-[44px] py-2.5 px-4 bg-[#1E1E20] hover:bg-[#2A2A2D] text-[#F5F5F5] font-bold text-xs uppercase tracking-wide rounded-xl border border-[#2A2A2D] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
