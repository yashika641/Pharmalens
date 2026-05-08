import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import {
  Clock, Pill, AlertTriangle, CheckCircle, Calendar,
  FileText, X, Stethoscope, Activity, ShieldAlert,
  ChevronRight, Loader2,
} from "lucide-react";
import { supabase } from "../supabase";
import { useLanguage } from "./language_context";

const API_URL = import.meta.env.VITE_API_URL;

const PAGE_STRINGS = [
  "Medication History",
  "Track your scanned medications and safety alerts",
  "Total Scans", "Medicine Scans", "Prescription Scans",
  "Medicines", "Prescriptions",
  "No medicine scans yet", "No prescription scans yet",
  "No History Yet", "Start scanning medications to build your history timeline",
  "Medicine scan", "Prescription scan",
  "Safe", "Warning", "Danger",
  "Dosage", "Ingredients", "Side Effects", "Interactions", "Warnings", "Scanned Via",
  "Diagnosis", "Prescribed Medicines", "Instructions", "Follow-up Date",
  "Today", "Yesterday", "Confidence:", "Exp:", "Rx Date:",
];

interface SummaryEntry { id: string; name: string; }

interface HistoryResponse {
  total_scans: number;
  medicine_scans: number;
  prescription_scans: number;
  medicines: SummaryEntry[];
  prescriptions: SummaryEntry[];
}

interface MedicineDetail {
  id: string;
  medicine_name: string;
  medicine_type: string;
  strength: string;
  manufacturer?: string;
  ingredients?: string[];
  warnings?: string[];
  interactions?: string[];
  dosage_instructions?: string;
  side_effects?: string[];
  expiry_date?: string;
  mfg_date?: string;
  confidence?: number;
  ocr_engine?: string;
  status: "safe" | "warning" | "danger";
  scanned_at: string;
}

interface PrescriptionDetail {
  id: string;
  doctor_name: string;
  doctor_specialization?: string;
  clinic_name?: string;
  prescribed_medicines: string[];
  diagnosis?: string;
  instructions?: string;
  follow_up_date?: string;
  prescription_date?: string;
  confidence?: number;
  ocr_engine?: string;
  status: "safe" | "warning" | "danger";
  scanned_at: string;
}

const getToken = async () => {
  const session = await supabase.auth.getSession();
  return session.data.session?.access_token ?? "";
};

const statusStyle = (status?: string) => {
  switch (status) {
    case "safe":    return { bg: "bg-[#34d399]/10", border: "border-[#34d399]/40", text: "text-[#34d399]", dot: "bg-[#34d399]", Icon: CheckCircle,  label: "Safe" };
    case "warning": return { bg: "bg-[#fbbf24]/10", border: "border-[#fbbf24]/40", text: "text-[#fbbf24]", dot: "bg-[#fbbf24]", Icon: AlertTriangle, label: "Warning" };
    case "danger":  return { bg: "bg-[#ef4444]/10", border: "border-[#ef4444]/40", text: "text-[#ef4444]", dot: "bg-[#ef4444]", Icon: ShieldAlert,   label: "Danger" };
    default:        return { bg: "bg-[#2DD4BF]/10", border: "border-[#2DD4BF]/40", text: "text-[#2DD4BF]", dot: "bg-[#2DD4BF]", Icon: CheckCircle,  label: "Safe" };
  }
};

const fmtDate = (iso?: string, t?: (s: string) => string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return t ? t("Today") : "Today";
  if (d.toDateString() === yesterday.toDateString()) return t ? t("Yesterday") : "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

function Section({ title, color, children }: { title: string; color: "cyan" | "yellow" | "red"; children: React.ReactNode }) {
  const c = { cyan: "text-[#2DD4BF]", yellow: "text-[#fbbf24]", red: "text-[#ef4444]" }[color];
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${c}`}>{title}</p>
      <div className="text-[#94A3B8] text-sm">{children}</div>
    </div>
  );
}

function MedicineModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useLanguage();
  const [detail, setDetail] = useState<MedicineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/user/history/medicine/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        setDetail(await res.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const s = statusStyle(detail?.status);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(6,10,20,0.9)", backdropFilter: "blur(16px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 32 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 32 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative w-full max-w-lg rounded-3xl p-6 glass-card-strong"
        style={{ border: `1px solid ${detail ? '' : 'rgba(255,255,255,0.08)'}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          <X className="w-4 h-4 text-[#64748B]" />
        </button>

        {loading && <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-[#2DD4BF] animate-spin" /></div>}
        {error && <p className="py-10 text-center text-[#F87171] text-sm">{error}</p>}

        {detail && !loading && (
          <>
            <div className="flex items-center gap-4 mb-5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${s.bg} border ${s.border}`}>
                <Pill className={`w-6 h-6 ${s.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg text-white font-semibold truncate">{detail.medicine_name ?? "Unknown Medicine"}</h3>
                <p className="text-[#64748B] text-xs">{detail.medicine_type ?? "—"} · {detail.strength ?? "—"}</p>
              </div>
              <span className={`shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${s.bg} border ${s.border} ${s.text}`}>
                <s.Icon className="w-3 h-3" />{t(s.label)}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 mb-5 text-xs text-[#64748B]">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{fmtDate(detail.scanned_at, t)}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{fmtTime(detail.scanned_at)}</span>
              {detail.expiry_date && <span>{t("Exp:")} {detail.expiry_date}</span>}
              {detail.confidence !== undefined && (
                <span className={s.text}>{(detail.confidence * 100).toFixed(0)}% {t("Confidence:")}</span>
              )}
            </div>

            <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
              {detail.dosage_instructions && <Section title={t("Dosage")} color="cyan">{detail.dosage_instructions}</Section>}
              {detail.ingredients?.length ? (
                <Section title={t("Ingredients")} color="cyan">
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {detail.ingredients.map((i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg text-xs"
                        style={{ background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.25)', color: '#2DD4BF' }}>{i}</span>
                    ))}
                  </div>
                </Section>
              ) : null}
              {detail.side_effects?.length ? (
                <Section title={t("Side Effects")} color="yellow">
                  <ul className="list-disc list-inside space-y-0.5 mt-1">{detail.side_effects.map((s) => <li key={s}>{s}</li>)}</ul>
                </Section>
              ) : null}
              {detail.interactions?.length ? (
                <Section title={t("Interactions")} color="red">
                  <ul className="list-disc list-inside space-y-0.5 mt-1">{detail.interactions.map((i) => <li key={i}>{i}</li>)}</ul>
                </Section>
              ) : null}
              {detail.warnings?.length ? (
                <Section title={t("Warnings")} color="red">
                  <ul className="list-disc list-inside space-y-0.5 mt-1">{detail.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
                </Section>
              ) : null}
              {detail.ocr_engine && <Section title={t("Scanned Via")} color="cyan">{detail.ocr_engine}</Section>}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function PrescriptionModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useLanguage();
  const [detail, setDetail] = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/user/history/prescription/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        setDetail(await res.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const s = statusStyle(detail?.status);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(6,10,20,0.9)", backdropFilter: "blur(16px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 32 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 32 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative w-full max-w-lg rounded-3xl p-6 glass-card-strong"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          <X className="w-4 h-4 text-[#64748B]" />
        </button>

        {loading && <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-[#A78BFA] animate-spin" /></div>}
        {error && <p className="py-10 text-center text-[#F87171] text-sm">{error}</p>}

        {detail && !loading && (
          <>
            <div className="flex items-center gap-4 mb-5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${s.bg} border ${s.border}`}>
                <FileText className={`w-6 h-6 ${s.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg text-white font-semibold truncate">Dr. {detail.doctor_name ?? "Unknown"}</h3>
                <p className="text-[#64748B] text-xs">
                  {detail.doctor_specialization ?? "General Physician"}
                  {detail.clinic_name && ` · ${detail.clinic_name}`}
                </p>
              </div>
              <span className={`shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${s.bg} border ${s.border} ${s.text}`}>
                <s.Icon className="w-3 h-3" />{t(s.label)}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 mb-5 text-xs text-[#64748B]">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{fmtDate(detail.scanned_at, t)}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{fmtTime(detail.scanned_at)}</span>
              {detail.prescription_date && <span>{t("Rx Date:")} {detail.prescription_date}</span>}
              {detail.confidence !== undefined && (
                <span className={s.text}>{(detail.confidence * 100).toFixed(0)}% {t("Confidence:")}</span>
              )}
            </div>

            <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
              {detail.diagnosis && <Section title={t("Diagnosis")} color="cyan">{detail.diagnosis}</Section>}
              {detail.prescribed_medicines?.length ? (
                <Section title={t("Prescribed Medicines")} color="cyan">
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {detail.prescribed_medicines.map((m: any, i: number) => {
                      const name = typeof m === "string" ? m : m?.name ?? "Unknown";
                      const dosage = typeof m === "object" ? m?.dosage : null;
                      const freq = typeof m === "object" ? m?.instructions ?? m?.frequency : null;
                      return (
                        <div key={i} className="flex flex-col px-3 py-1.5 rounded-xl"
                          style={{ background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.25)' }}>
                          <span className="text-[#2DD4BF] text-xs font-medium">{name}</span>
                          {dosage && <span className="text-[#64748B] text-[10px]">{dosage}</span>}
                          {freq && <span className="text-[#64748B] text-[10px]">{freq}</span>}
                        </div>
                      );
                    })}
                  </div>
                </Section>
              ) : null}
              {detail.instructions && <Section title={t("Instructions")} color="yellow">{detail.instructions}</Section>}
              {detail.follow_up_date && (
                <Section title={t("Follow-up Date")} color="cyan">
                  {new Date(detail.follow_up_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </Section>
              )}
              {detail.ocr_engine && <Section title={t("Scanned Via")} color="cyan">{detail.ocr_engine}</Section>}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function MedicineRow({ entry, index, onClick }: { entry: SummaryEntry; index: number; onClick: () => void }) {
  const { t } = useLanguage();
  return (
    <motion.button
      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 group"
      style={{ background: 'rgba(45,212,191,0.04)', border: '1px solid rgba(45,212,191,0.2)' }}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.25)' }}>
        <Pill className="w-4 h-4 text-[#2DD4BF]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{entry.name}</p>
        <p className="text-[#475569] text-xs">{t("Medicine scan")}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-[#475569] group-hover:text-[#2DD4BF] transition-colors shrink-0" />
    </motion.button>
  );
}

function PrescriptionRow({ entry, index, onClick }: { entry: SummaryEntry; index: number; onClick: () => void }) {
  const { t } = useLanguage();
  return (
    <motion.button
      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 group"
      style={{ background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.2)' }}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)' }}>
        <Stethoscope className="w-4 h-4 text-[#A78BFA]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">Dr. {entry.name}</p>
        <p className="text-[#475569] text-xs">{t("Prescription scan")}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-[#475569] group-hover:text-[#A78BFA] transition-colors shrink-0" />
    </motion.button>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Icon className="w-8 h-8 text-[#2DD4BF]/20 mb-2" />
      <p className="text-[#475569] text-sm">{message}</p>
    </div>
  );
}

export function MedicationHistory() {
  const { t, language, prime } = useLanguage();

  useEffect(() => {
    if (language !== "English") prime(PAGE_STRINGS);
  }, [language, prime]);

  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMedicineId, setActiveMedicineId] = useState<string | null>(null);
  const [activePrescriptionId, setActivePrescriptionId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/user/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        setData(await res.json());
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalScans        = data?.total_scans ?? 0;
  const medicineScanCount = data?.medicine_scans ?? 0;
  const rxScanCount       = data?.prescription_scans ?? 0;
  const medicines         = data?.medicines ?? [];
  const prescriptions     = data?.prescriptions ?? [];

  return (
    <div className="min-h-screen molecular-bg px-4 pb-nav" style={{ paddingTop: 'calc(1.5rem + 20px)' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.25)' }}>
              <Clock className="w-5 h-5 text-[#2DD4BF]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none mb-0.5">
                {t("Medication")} <span className="text-[#2DD4BF]">{t("History")}</span>
              </h1>
              <p className="text-[#64748B] text-xs">{t("Track your scanned medications and safety alerts")}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass-card-strong rounded-2xl p-3"
            style={{ border: '1px solid rgba(45,212,191,0.2)' }}>
            <Activity className="w-4 h-4 text-[#2DD4BF] mb-2" />
            <p className="text-[#475569] text-[10px] uppercase tracking-wide mb-0.5">{t("Total Scans")}</p>
            <p className="text-xl font-bold text-white">
              {loading ? <Loader2 className="w-4 h-4 text-[#2DD4BF] animate-spin" /> : totalScans}
            </p>
          </div>
          <div className="glass-card-strong rounded-2xl p-3"
            style={{ border: '1px solid rgba(45,212,191,0.15)' }}>
            <Pill className="w-4 h-4 text-[#2DD4BF] mb-2" />
            <p className="text-[#475569] text-[10px] uppercase tracking-wide mb-0.5">{t("Medicine Scans")}</p>
            <p className="text-xl font-bold text-[#2DD4BF]">{loading ? "—" : medicineScanCount}</p>
          </div>
          <div className="glass-card-strong rounded-2xl p-3"
            style={{ border: '1px solid rgba(167,139,250,0.2)' }}>
            <FileText className="w-4 h-4 text-[#A78BFA] mb-2" />
            <p className="text-[#475569] text-[10px] uppercase tracking-wide mb-0.5">{t("Prescription Scans")}</p>
            <p className="text-xl font-bold text-[#A78BFA]">{loading ? "—" : rxScanCount}</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 text-[#2DD4BF] animate-spin" />
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            {/* Medicines list */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="glass-card-strong rounded-2xl p-4"
              style={{ border: '1px solid rgba(45,212,191,0.2)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Pill className="w-4 h-4 text-[#2DD4BF]" />
                <h3 className="text-sm font-semibold text-white">{t("Medicines")}</h3>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.25)', color: '#2DD4BF' }}>
                  {medicineScanCount}
                </span>
              </div>
              {medicines.length === 0
                ? <EmptyState icon={Pill} message={t("No medicine scans yet")} />
                : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                    {medicines.map((m, i) => (
                      <MedicineRow key={m.id} entry={m} index={i} onClick={() => setActiveMedicineId(m.id)} />
                    ))}
                  </div>
                )
              }
            </motion.div>

            {/* Prescriptions list */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="glass-card-strong rounded-2xl p-4"
              style={{ border: '1px solid rgba(167,139,250,0.2)' }}>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-[#A78BFA]" />
                <h3 className="text-sm font-semibold text-white">{t("Prescriptions")}</h3>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', color: '#A78BFA' }}>
                  {rxScanCount}
                </span>
              </div>
              {prescriptions.length === 0
                ? <EmptyState icon={FileText} message={t("No prescription scans yet")} />
                : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                    {prescriptions.map((p, i) => (
                      <PrescriptionRow key={p.id} entry={p} index={i} onClick={() => setActivePrescriptionId(p.id)} />
                    ))}
                  </div>
                )
              }
            </motion.div>
          </div>
        )}

        {!loading && totalScans === 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card-strong rounded-2xl p-10 text-center mt-4"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)' }}>
              <Clock className="w-7 h-7 text-[#2DD4BF]" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">{t("No History Yet")}</h3>
            <p className="text-[#475569] text-sm">{t("Start scanning medications to build your history timeline")}</p>
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {activeMedicineId && (
          <MedicineModal id={activeMedicineId} onClose={() => setActiveMedicineId(null)} />
        )}
        {activePrescriptionId && (
          <PrescriptionModal id={activePrescriptionId} onClose={() => setActivePrescriptionId(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
