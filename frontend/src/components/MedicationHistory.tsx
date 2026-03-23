import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import {
  Clock, Pill, AlertTriangle, CheckCircle, Calendar,
  FileText, X, Stethoscope, Activity, ShieldAlert,
  ChevronRight, Loader2,
} from "lucide-react";
import { supabase } from "../supabase";

const API_URL = import.meta.env.VITE_API_URL;

// ─── Types matching exact API response ───────────────────────────────────────

interface SummaryEntry {
  id: string;
  name: string;
}

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getToken = async () => {
  const session = await supabase.auth.getSession();
  return session.data.session?.access_token ?? "";
};

const statusStyle = (status?: string) => {
  switch (status) {
    case "safe":    return { bg: "bg-[#34d399]/10", border: "border-[#34d399]/40", text: "text-[#34d399]", dot: "bg-[#34d399]", Icon: CheckCircle,   label: "Safe"    };
    case "warning": return { bg: "bg-[#fbbf24]/10", border: "border-[#fbbf24]/40", text: "text-[#fbbf24]", dot: "bg-[#fbbf24]", Icon: AlertTriangle, label: "Warning" };
    case "danger":  return { bg: "bg-[#ef4444]/10", border: "border-[#ef4444]/40", text: "text-[#ef4444]", dot: "bg-[#ef4444]", Icon: ShieldAlert,   label: "Danger"  };
    default:        return { bg: "bg-[#4fd1c5]/10", border: "border-[#4fd1c5]/40", text: "text-[#4fd1c5]", dot: "bg-[#4fd1c5]", Icon: CheckCircle,   label: "Safe"    };
  }
};

const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

// ─── Detail section inside modals ────────────────────────────────────────────

function Section({ title, color, children }: { title: string; color: "cyan" | "yellow" | "red"; children: React.ReactNode }) {
  const c = { cyan: "text-[#4fd1c5]", yellow: "text-[#fbbf24]", red: "text-[#ef4444]" }[color];
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${c}`}>{title}</p>
      <div className="text-[#8a9ab8] text-sm">{children}</div>
    </div>
  );
}

// ─── Medicine detail modal ────────────────────────────────────────────────────

function MedicineModal({ id, onClose }: { id: string; onClose: () => void }) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6,10,20,0.88)", backdropFilter: "blur(14px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, y: 28 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 28 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className={`relative w-full max-w-lg rounded-3xl p-7 border ${s.border} glass-card-strong`}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[#8a9ab8] hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        {loading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-[#4fd1c5] animate-spin" /></div>}
        {error   && <p className="py-10 text-center text-[#ef4444] text-sm">{error}</p>}

        {detail && !loading && (
          <>
            {/* Header */}
            <div className="flex items-center gap-4 mb-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${s.bg} border ${s.border}`}>
                <Pill className={`w-7 h-7 ${s.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl text-white font-semibold truncate">{detail.medicine_name ?? "Unknown Medicine"}</h3>
                <p className="text-[#8a9ab8] text-sm">{detail.medicine_type ?? "—"} · {detail.strength ?? "—"}</p>
              </div>
              <span className={`shrink-0 flex items-center gap-1 text-xs px-3 py-1 rounded-full ${s.bg} border ${s.border} ${s.text}`}>
                <s.Icon className="w-3.5 h-3.5" />{s.label}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-4 mb-5 text-xs text-[#8a9ab8]">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{fmtDate(detail.scanned_at)}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{fmtTime(detail.scanned_at)}</span>
              {detail.manufacturer && <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" />{detail.manufacturer}</span>}
              {detail.expiry_date  && <span className="flex items-center gap-1.5">Exp: {detail.expiry_date}</span>}
              {detail.confidence !== undefined && (
                <span className="flex items-center gap-1.5">
                  Confidence: <span className={s.text}>{(detail.confidence * 100).toFixed(0)}%</span>
                </span>
              )}
            </div>

            {/* Detail sections */}
            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
              {detail.dosage_instructions && (
                <Section title="Dosage" color="cyan">{detail.dosage_instructions}</Section>
              )}
              {detail.ingredients?.length ? (
                <Section title="Ingredients" color="cyan">
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {detail.ingredients.map((i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-[#4fd1c5]/10 border border-[#4fd1c5]/30 text-[#4fd1c5] text-xs">{i}</span>
                    ))}
                  </div>
                </Section>
              ) : null}
              {detail.side_effects?.length ? (
                <Section title="Side Effects" color="yellow">
                  <ul className="list-disc list-inside space-y-0.5 mt-1">{detail.side_effects.map((s) => <li key={s}>{s}</li>)}</ul>
                </Section>
              ) : null}
              {detail.interactions?.length ? (
                <Section title="Interactions" color="red">
                  <ul className="list-disc list-inside space-y-0.5 mt-1">{detail.interactions.map((i) => <li key={i}>{i}</li>)}</ul>
                </Section>
              ) : null}
              {detail.warnings?.length ? (
                <Section title="Warnings" color="red">
                  <ul className="list-disc list-inside space-y-0.5 mt-1">{detail.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
                </Section>
              ) : null}
              {detail.ocr_engine && (
                <Section title="Scanned Via" color="cyan">{detail.ocr_engine}</Section>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Prescription detail modal ────────────────────────────────────────────────

function PrescriptionModal({ id, onClose }: { id: string; onClose: () => void }) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6,10,20,0.88)", backdropFilter: "blur(14px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, y: 28 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 28 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className={`relative w-full max-w-lg rounded-3xl p-7 border ${s.border} glass-card-strong`}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[#8a9ab8] hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        {loading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-[#a78bfa] animate-spin" /></div>}
        {error   && <p className="py-10 text-center text-[#ef4444] text-sm">{error}</p>}

        {detail && !loading && (
          <>
            {/* Header */}
            <div className="flex items-center gap-4 mb-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${s.bg} border ${s.border}`}>
                <FileText className={`w-7 h-7 ${s.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl text-white font-semibold truncate">Dr. {detail.doctor_name ?? "Unknown"}</h3>
                <p className="text-[#8a9ab8] text-sm">
                  {detail.doctor_specialization ?? "General Physician"}
                  {detail.clinic_name && ` · ${detail.clinic_name}`}
                </p>
              </div>
              <span className={`shrink-0 flex items-center gap-1 text-xs px-3 py-1 rounded-full ${s.bg} border ${s.border} ${s.text}`}>
                <s.Icon className="w-3.5 h-3.5" />{s.label}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-4 mb-5 text-xs text-[#8a9ab8]">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{fmtDate(detail.scanned_at)}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{fmtTime(detail.scanned_at)}</span>
              {detail.prescription_date && <span className="flex items-center gap-1.5">Rx Date: {detail.prescription_date}</span>}
              {detail.confidence !== undefined && (
                <span className="flex items-center gap-1.5">
                  Confidence: <span className={s.text}>{(detail.confidence * 100).toFixed(0)}%</span>
                </span>
              )}
            </div>

            {/* Detail sections */}
            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
              {detail.diagnosis && (
                <Section title="Diagnosis" color="cyan">{detail.diagnosis}</Section>
              )}
              {detail.prescribed_medicines?.length ? (
                <Section title="Prescribed Medicines" color="cyan">
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {detail.prescribed_medicines.map((m) => (
                      <span key={m} className="px-2 py-0.5 rounded-lg bg-[#4fd1c5]/10 border border-[#4fd1c5]/30 text-[#4fd1c5] text-xs">{m}</span>
                    ))}
                  </div>
                </Section>
              ) : null}
              {detail.instructions && (
                <Section title="Instructions" color="yellow">{detail.instructions}</Section>
              )}
              {detail.follow_up_date && (
                <Section title="Follow-up Date" color="cyan">
                  {new Date(detail.follow_up_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </Section>
              )}
              {detail.ocr_engine && (
                <Section title="Scanned Via" color="cyan">{detail.ocr_engine}</Section>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Clickable row components ─────────────────────────────────────────────────

function MedicineRow({ entry, index, onClick }: { entry: SummaryEntry; index: number; onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-4 rounded-2xl border border-[#4fd1c5]/30 bg-[#4fd1c5]/5 hover:bg-[#4fd1c5]/10 hover:border-[#4fd1c5]/60 transition-all duration-200 group"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#4fd1c5]/10 border border-[#4fd1c5]/30">
        <Pill className="w-4 h-4 text-[#4fd1c5]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{entry.name}</p>
        <p className="text-[#8a9ab8] text-xs">Medicine scan</p>
      </div>
      <ChevronRight className="w-4 h-4 text-[#8a9ab8] group-hover:text-[#4fd1c5] transition-colors shrink-0" />
    </motion.button>
  );
}

function PrescriptionRow({ entry, index, onClick }: { entry: SummaryEntry; index: number; onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-4 rounded-2xl border border-[#a78bfa]/30 bg-[#a78bfa]/5 hover:bg-[#a78bfa]/10 hover:border-[#a78bfa]/60 transition-all duration-200 group"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#a78bfa]/10 border border-[#a78bfa]/30">
        <Stethoscope className="w-4 h-4 text-[#a78bfa]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">Dr. {entry.name}</p>
        <p className="text-[#8a9ab8] text-xs">Prescription scan</p>
      </div>
      <ChevronRight className="w-4 h-4 text-[#8a9ab8] group-hover:text-[#a78bfa] transition-colors shrink-0" />
    </motion.button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Icon className="w-9 h-9 text-[#4fd1c5]/30 mb-2" />
      <p className="text-[#8a9ab8] text-sm">{message}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MedicationHistory() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal state — stores the record id that was clicked
  const [activeMedicineId,     setActiveMedicineId]     = useState<string | null>(null);
  const [activePrescriptionId, setActivePrescriptionId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/user/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("API response status:", res.status);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = await res.json();
        console.log("Fetched history data:", json);
        setData(json);
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalScans        = data?.total_scans        ?? 0;
  const medicineScanCount = data?.medicine_scans     ?? 0;
  const rxScanCount       = data?.prescription_scans ?? 0;
  const medicines         = data?.medicines          ?? [];
  const prescriptions     = data?.prescriptions      ?? [];

  return (
    <div className="min-h-screen molecular-bg p-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-4xl mb-3"><span className="neon-text-cyan">Medication History</span></h2>
          <p className="text-[#8a9ab8]">Track your scanned medications and safety alerts</p>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card-strong rounded-2xl p-6 neon-border-cyan"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#8a9ab8] mb-1">Total Scans</p>
                <p className="text-3xl text-white">{loading ? <Loader2 className="w-6 h-6 animate-spin" /> : totalScans}</p>
              </div>
              <Activity className="w-10 h-10 text-[#4fd1c5]" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass-card-strong rounded-2xl p-6 border border-[#4fd1c5]/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#8a9ab8] mb-1">Medicine Scans</p>
                <p className="text-3xl text-[#4fd1c5]">{loading ? "—" : medicineScanCount}</p>
              </div>
              <Pill className="w-10 h-10 text-[#4fd1c5]" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-card-strong rounded-2xl p-6 border border-[#a78bfa]/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#8a9ab8] mb-1">Prescription Scans</p>
                <p className="text-3xl text-[#a78bfa]">{loading ? "—" : rxScanCount}</p>
              </div>
              <FileText className="w-10 h-10 text-[#a78bfa]" />
            </div>
          </motion.div>
        </div>

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#4fd1c5] animate-spin" />
          </div>
        )}

        {/* ── Two lists ── */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Medicines list */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="glass-card-strong rounded-3xl p-5 border border-[#4fd1c5]/30"
            >
              <div className="flex items-center gap-2 mb-4">
                <Pill className="w-5 h-5 text-[#4fd1c5]" />
                <h3 className="text-lg text-white font-medium">Medicines</h3>
                <span className="ml-auto text-xs px-2.5 py-0.5 rounded-full bg-[#4fd1c5]/10 border border-[#4fd1c5]/30 text-[#4fd1c5]">
                  {medicineScanCount}
                </span>
              </div>

              {medicines.length === 0
                ? <EmptyState icon={Pill} message="No medicine scans yet" />
                : (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-0.5">
                    {medicines.map((m, i) => (
                      <MedicineRow key={m.id} entry={m} index={i} onClick={() => setActiveMedicineId(m.id)} />
                    ))}
                  </div>
                )
              }
            </motion.div>

            {/* Prescriptions list */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
              className="glass-card-strong rounded-3xl p-5 border border-[#a78bfa]/30"
            >
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-[#a78bfa]" />
                <h3 className="text-lg text-white font-medium">Prescriptions</h3>
                <span className="ml-auto text-xs px-2.5 py-0.5 rounded-full bg-[#a78bfa]/10 border border-[#a78bfa]/30 text-[#a78bfa]">
                  {rxScanCount}
                </span>
              </div>

              {prescriptions.length === 0
                ? <EmptyState icon={FileText} message="No prescription scans yet" />
                : (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-0.5">
                    {prescriptions.map((p, i) => (
                      <PrescriptionRow key={p.id} entry={p} index={i} onClick={() => setActivePrescriptionId(p.id)} />
                    ))}
                  </div>
                )
              }
            </motion.div>
          </div>
        )}

        {/* ── Global empty state ── */}
        {!loading && totalScans === 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card-strong rounded-3xl p-12 text-center mt-6"
          >
            <Clock className="w-16 h-16 text-[#4fd1c5] mx-auto mb-4" />
            <h3 className="text-xl text-white mb-2">No History Yet</h3>
            <p className="text-[#8a9ab8]">Start scanning medications to build your history timeline</p>
          </motion.div>
        )}
      </motion.div>

      {/* ── Detail modals — fetched on click ── */}
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