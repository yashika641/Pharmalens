import {
  FileText, Calendar, Pill, AlertTriangle,
  Info, Stethoscope, Clock, CheckCircle,
  ChevronRight, Activity, Hash, Navigation2,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useLanguage } from "./language_context";

// ─── Types matching prescription_ocr_data schema exactly ─────────────────────

interface Medicine {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  instructions?: string;
}

interface PrescriptionData {
  id?: string;
  image_id?: string;
  user_id?: string;
  doctor_name?: string | null;
  prescription_date?: string | null;
  diagnosis?: string | null;
  medicines?: (Medicine | string)[] | null;
  routes?: string[] | Record<string, string> | null;
  raw_text?: string | null;
  confidence?: number | null;
  ocr_engine?: string | null;
  fallback_used?: boolean | null;
  needs_review?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

interface PrescriptionDetailsProps {
  prescription: PrescriptionData;
  onSaveToHistory?: (prescription: PrescriptionData) => void;
}

// ── All static strings on this page ───────────────────────────────────────────
const PAGE_STRINGS = [
  "Prescription Scanned",
  "AI-extracted prescription details",
  "Needs manual review",
  "AI Confidence",
  "Engine:",
  "Fallback OCR used",
  "Doctor",
  "Prescription Date",
  "Diagnosis",
  "Not detected",
  "Not specified",
  "Prescribed Medicines",
  "No medicines extracted",
  "Administration Routes",
  "Raw OCR Text",
  "tap to expand",
  "Scanned",
  "Updated",
  "Save to History",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normaliseMedicines = (
  raw: (Medicine | string)[] | string | null | undefined
): Medicine[] => {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === "string") {
    try { parsed = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((m) => (typeof m === "string" ? { name: m } : m))
    .filter((m) => m.name != null && m.name.trim() !== "");
};

const normaliseRoutes = (
  raw: string[] | Record<string, string> | string | null | undefined
): string[] => {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === "string") {
    try { parsed = JSON.parse(raw); } catch { return []; }
  }
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === "object") return Object.entries(parsed).map(([k, v]) => `${k}: ${v}`);
  return [];
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return "Not detected";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
};

const confidenceColor = (c?: number | null) => {
  if (c == null) return "text-[#8a9ab8]";
  if (c >= 0.85) return "text-[#34d399]";
  if (c >= 0.65) return "text-[#fbbf24]";
  return "text-[#ef4444]";
};

const confidenceGradient = (c: number) => {
  if (c >= 0.85) return "linear-gradient(90deg,#4fd1c5,#34d399)";
  if (c >= 0.65) return "linear-gradient(90deg,#fbbf24,#f59e0b)";
  return "linear-gradient(90deg,#ef4444,#dc2626)";
};

// ─── MetaChip ────────────────────────────────────────────────────────────────

function MetaChip({
  icon: Icon, label, value, color = "#4fd1c5",
}: {
  icon: React.ElementType; label: string; value: string; color?: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}40` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[#8a9ab8] mb-0.5">{label}</p>
        <p className="text-white text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

// ─── MedicineCard ─────────────────────────────────────────────────────────────

function MedicineCard({ med, index }: { med: Medicine; index: number }) {
  const hasDetails =
    med.dosage || med.frequency || med.duration || med.route || med.instructions;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.08 }}
      className="rounded-2xl border border-[#4fd1c5]/25 bg-[#4fd1c5]/5 overflow-hidden"
    >
      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-xl bg-[#4fd1c5]/15 border border-[#4fd1c5]/30 flex items-center justify-center shrink-0">
          <Pill className="w-4 h-4 text-[#4fd1c5]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold">{med.name}</p>
          {med.dosage && (
            <p className="text-[#4fd1c5] text-xs mt-0.5">{med.dosage}</p>
          )}
        </div>
        {med.route && (
          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-[#6366f1]/15 border border-[#6366f1]/30 text-[#a78bfa]">
            {med.route}
          </span>
        )}
      </div>

      {hasDetails && (
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          {med.frequency && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-[#1a2332] border border-[#4fd1c5]/20 text-[#8a9ab8]">
              <Clock className="w-3 h-3 text-[#4fd1c5]" />
              {med.frequency}
            </span>
          )}
          {med.duration && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-[#1a2332] border border-[#4fd1c5]/20 text-[#8a9ab8]">
              <Calendar className="w-3 h-3 text-[#a78bfa]" />
              {med.duration}
            </span>
          )}
          {med.instructions && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-[#1a2332] border border-[#fbbf24]/20 text-[#8a9ab8]">
              <Info className="w-3 h-3 text-[#fbbf24]" />
              {med.instructions}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PrescriptionDetails({
  prescription,
  onSaveToHistory,
}: PrescriptionDetailsProps) {
  const { t, language, prime } = useLanguage();

  // ── Fire API call immediately when language changes ───────────────────────
  useEffect(() => {
    if (language !== "English") {
      prime(PAGE_STRINGS);
    }
  }, [language, prime]);

  const medicines  = normaliseMedicines(prescription.medicines);
  const routes     = normaliseRoutes(prescription.routes);
  const confidence = prescription.confidence ?? null;
  const confPct    = confidence !== null ? Math.round(confidence * 100) : null;

  return (
    <div className="min-h-screen molecular-bg p-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* ── Page header ── */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
            style={{
              background: "linear-gradient(135deg,rgba(163,139,250,.2),rgba(99,102,241,.2))",
              border: "1px solid rgba(163,139,250,.5)",
            }}
          >
            <FileText className="w-10 h-10 text-[#a78bfa]" />
          </motion.div>

          <h2 className="text-4xl mb-2 neon-text-cyan">{t("Prescription Scanned")}</h2>
          <p className="text-[#8a9ab8]">{t("AI-extracted prescription details")}</p>

          {prescription.needs_review && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full text-sm
                         bg-[#fbbf24]/10 border border-[#fbbf24]/40 text-[#fbbf24]"
            >
              <AlertTriangle className="w-4 h-4" />
              {t("Needs manual review")}
            </motion.div>
          )}
        </div>

        {/* ── Confidence + OCR meta bar ── */}
        {(confPct !== null || prescription.ocr_engine) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card-strong rounded-2xl p-5 mb-6 border border-[#a78bfa]/30"
          >
            <div className="flex flex-wrap items-center gap-6">
              {confPct !== null && (
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#8a9ab8] uppercase tracking-wide">
                      {t("AI Confidence")}
                    </span>
                    <span className={`text-sm font-bold ${confidenceColor(confidence)}`}>
                      {confPct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#1a2332] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${confPct}%` }}
                      transition={{ duration: 1.1, delay: 0.4 }}
                      className="h-full rounded-full"
                      style={{ background: confidenceGradient(confidence!) }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-4 text-xs text-[#8a9ab8] flex-wrap">
                {prescription.ocr_engine && (
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#4fd1c5]" />
                    {t("Engine:")}
                    <span className="text-white ml-1">{prescription.ocr_engine}</span>
                  </span>
                )}
                {prescription.fallback_used && (
                  <span className="flex items-center gap-1.5 text-[#fbbf24]">
                    <Info className="w-3.5 h-3.5" />
                    {t("Fallback OCR used")}
                  </span>
                )}
                {prescription.id && (
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="font-mono text-[10px]">{prescription.id.slice(0, 8)}…</span>
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Doctor / Date / Diagnosis grid ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
        >
          <MetaChip
            icon={Stethoscope}
            label={t("Doctor")}
            value={prescription.doctor_name ?? t("Not detected")}
            color="#a78bfa"
          />
          <MetaChip
            icon={Calendar}
            label={t("Prescription Date")}
            value={fmtDate(prescription.prescription_date)}
            color="#4fd1c5"
          />
          <MetaChip
            icon={Activity}
            label={t("Diagnosis")}
            value={prescription.diagnosis ?? t("Not specified")}
            color={prescription.diagnosis ? "#34d399" : "#8a9ab8"}
          />
        </motion.div>

        {/* ── Prescribed Medicines ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card-strong rounded-3xl p-6 mb-6 border border-[#4fd1c5]/25"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#4fd1c5]/15 border border-[#4fd1c5]/30 flex items-center justify-center">
              <Pill className="w-5 h-5 text-[#4fd1c5]" />
            </div>
            <h3 className="text-xl text-white font-medium">{t("Prescribed Medicines")}</h3>
            <span className="ml-auto text-xs px-2.5 py-0.5 rounded-full bg-[#4fd1c5]/10 border border-[#4fd1c5]/30 text-[#4fd1c5]">
              {medicines.length}
            </span>
          </div>

          {medicines.length > 0 ? (
            <div className="space-y-3">
              {medicines.map((med, i) => (
                <MedicineCard key={i} med={med} index={i} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <Pill className="w-10 h-10 text-[#4fd1c5]/20 mb-2" />
              <p className="text-[#8a9ab8] text-sm">{t("No medicines extracted")}</p>
            </div>
          )}
        </motion.div>

        {/* ── Routes ── */}
        {routes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass-card-strong rounded-3xl p-6 mb-6 border border-[#6366f1]/25"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#6366f1]/15 border border-[#6366f1]/30 flex items-center justify-center">
                <Navigation2 className="w-5 h-5 text-[#6366f1]" />
              </div>
              <h3 className="text-xl text-white font-medium">{t("Administration Routes")}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {routes.map((r, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                             bg-[#6366f1]/10 border border-[#6366f1]/30 text-[#a78bfa] text-sm"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  {r}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Raw OCR text (collapsible) ── */}
        {prescription.raw_text && (
          <motion.details
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card-strong rounded-3xl p-6 mb-6 border border-[#8a9ab8]/20"
          >
            <summary className="flex items-center gap-3 cursor-pointer list-none select-none">
              <div className="w-10 h-10 rounded-xl bg-[#8a9ab8]/10 border border-[#8a9ab8]/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#8a9ab8]" />
              </div>
              <h3 className="text-lg text-white font-medium flex-1">{t("Raw OCR Text")}</h3>
              <span className="text-xs text-[#8a9ab8] border border-[#8a9ab8]/30 px-2 py-0.5 rounded-lg">
                {t("tap to expand")}
              </span>
            </summary>
            <div className="mt-4 p-4 rounded-2xl bg-[#0d1520] border border-[#8a9ab8]/10">
              <pre className="text-[#8a9ab8] text-xs leading-relaxed whitespace-pre-wrap font-mono">
                {prescription.raw_text}
              </pre>
            </div>
          </motion.details>
        )}

        {/* ── Timestamps ── */}
        {(prescription.created_at || prescription.updated_at) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="flex gap-4 text-xs text-[#8a9ab8] mb-6 px-1 flex-wrap"
          >
            {prescription.created_at && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {t("Scanned")} {fmtDate(prescription.created_at)}
              </span>
            )}
            {prescription.updated_at &&
              prescription.updated_at !== prescription.created_at && (
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-[#34d399]" />
                {t("Updated")} {fmtDate(prescription.updated_at)}
              </span>
            )}
          </motion.div>
        )}

        {/* ── Save button ── */}
        {onSaveToHistory && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSaveToHistory(prescription)}
            className="w-full glass-card-strong rounded-2xl py-4
                       border border-[#a78bfa]/50 hover:bg-[#a78bfa]/10
                       transition-all duration-300 text-white font-medium"
          >
            {t("Save to History")}
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}