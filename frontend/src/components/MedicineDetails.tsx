import { AlertTriangle, CheckCircle, Info, Pill, Building2, Activity, Share2, Calendar } from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "./language_context";
import { useEffect, useState } from "react";
import { scheduleExpiryAlerts } from "../lib/notifications";

interface MedicineDetailsProps {
  medicine: {
    medicine_name: string;
    manufacturer: string;
    strength: string;
    type: string;
    confidence: number;
    warnings?: string[];
    expiry_date?: string;
    precautions?: string[];
    side_effects?: {
      name: string;
      severity: "mild" | "moderate" | "severe";
    }[];
  };
  onSaveToHistory: (medicine: any) => void;
  onCheckInteractions: (medicineName: string) => void;
}

const PAGE_STRINGS = [
  "Medicine Identified", "Analysis complete - Review details below",
  "Confidence", "AI Confidence Level", "Composition", "Strength", "Expiry Date", "Not detected",
  "Precautions", "Possible Side Effects", "mild", "moderate", "severe",
  "Save to History", "Check Interactions",
  "Nausea", "Drowsiness",
  "Do not exceed recommended dosage", "Avoid alcohol while taking this medication",
  "Store in a cool and dry place", "Keep out of reach of children",
  "Take after food if stomach irritation occurs",
];

const SEVERITY_CONFIG = {
  severe:   { bg: 'rgba(239,68,68,0.08)',   border: '1px solid rgba(239,68,68,0.3)',   text: '#F87171' },
  moderate: { bg: 'rgba(251,191,36,0.08)',  border: '1px solid rgba(251,191,36,0.3)',  text: '#FBBF24' },
  mild:     { bg: 'rgba(45,212,191,0.06)',  border: '1px solid rgba(45,212,191,0.2)',  text: '#2DD4BF' },
};

export function MedicineDetails({ medicine, onSaveToHistory, onCheckInteractions }: MedicineDetailsProps) {
  const { t, language, prime } = useLanguage();
  const [allergyWarning, setAllergyWarning] = useState<string | null>(null);

  useEffect(() => {
    if (language !== "English") prime(PAGE_STRINGS);
  }, [language, prime]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pharmalens_emergency_data");
      if (!raw) return;
      const { allergies } = JSON.parse(raw) as { allergies?: string };
      if (!allergies) return;
      const userAllergies = allergies.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      const medText = `${medicine.medicine_name} ${medicine.manufacturer}`.toLowerCase();
      const hit = userAllergies.find((a) => medText.includes(a));
      if (hit) setAllergyWarning(`You may be allergic to this medicine (${hit}). Consult your doctor.`);
    } catch { /* ignore */ }
  }, [medicine.medicine_name, medicine.manufacturer]);

  useEffect(() => {
    if (medicine.expiry_date && medicine.expiry_date !== "N/A") {
      scheduleExpiryAlerts(medicine.medicine_name, medicine.expiry_date);
    }
  }, [medicine.medicine_name, medicine.expiry_date]);

  const sideEffects =
    medicine.side_effects?.map((e) => ({
      ...e,
      icon: e.severity === "severe" ? AlertTriangle : Info,
    })) || [
      { name: "Nausea", severity: "mild" as const, icon: Info },
      { name: "Drowsiness", severity: "mild" as const, icon: Info },
    ];

  const warnings = medicine.warnings?.length
    ? medicine.warnings
    : ["Do not exceed recommended dosage", "Avoid alcohol while taking this medication"];

  const precautions = medicine.precautions?.length
    ? medicine.precautions
    : ["Store in a cool and dry place", "Keep out of reach of children", "Take after food if stomach irritation occurs"];

  const shareOnWhatsApp = () => {
    const lines = [
      `*Medicine: ${medicine.medicine_name}*`,
      `Composition: ${medicine.manufacturer}`,
      `Strength: ${medicine.strength}`,
      `Type: ${medicine.type}`,
      medicine.expiry_date ? `Expiry: ${medicine.expiry_date}` : null,
      warnings.length ? `\n*Warnings:*\n${warnings.map((w) => `• ${w}`).join("\n")}` : null,
      `\n_Shared via PharmaLens_`,
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, "_blank");
  };

  const confPct = Math.round(medicine.confidence * 100);

  return (
    <div className="min-h-screen molecular-bg px-4 pb-nav" style={{ paddingTop: 'calc(1.5rem + 20px)' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">

        {/* Allergy banner */}
        {allergyWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 mb-4 p-4 rounded-2xl"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)' }}
          >
            <AlertTriangle className="w-5 h-5 text-[#F87171] shrink-0 mt-0.5" />
            <p className="text-[#F87171] text-sm font-medium">{allergyWarning}</p>
          </motion.div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)' }}
          >
            <CheckCircle className="w-6 h-6 text-[#34D399]" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold text-white leading-none mb-0.5">
              {t("Medicine")} <span className="text-[#2DD4BF]">{t("Identified")}</span>
            </h1>
            <p className="text-[#64748B] text-xs">{t("Analysis complete - Review details below")}</p>
          </div>
        </div>

        {/* Main card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card-strong rounded-2xl p-5 mb-4"
          style={{ border: '1px solid rgba(45,212,191,0.2)' }}>
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.25)' }}>
              <Pill className="w-6 h-6 text-[#2DD4BF]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white leading-tight mb-0.5 truncate">{medicine.medicine_name}</h2>
              <p className="text-[#64748B] text-sm">{medicine.type}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-2xl font-bold text-[#34D399]">{confPct}%</p>
              <p className="text-[#475569] text-[10px] uppercase tracking-wide">{t("Confidence")}</p>
            </div>
          </div>

          {/* Confidence bar */}
          <div className="mb-5">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confPct}%` }}
                transition={{ duration: 1, delay: 0.4 }}
                className="h-full rounded-full relative overflow-hidden"
                style={{ background: 'linear-gradient(90deg, #14B8A6, #34D399)' }}
              >
                <motion.div
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                />
              </motion.div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Building2 className="w-4 h-4 text-[#818CF8] mb-1.5" />
              <p className="text-[#475569] text-[10px] uppercase tracking-wide mb-0.5">{t("Composition")}</p>
              <p className="text-white text-xs font-medium truncate">{medicine.manufacturer}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Activity className="w-4 h-4 text-[#A78BFA] mb-1.5" />
              <p className="text-[#475569] text-[10px] uppercase tracking-wide mb-0.5">{t("Strength")}</p>
              <p className="text-white text-xs font-medium truncate">{medicine.strength}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Calendar className="w-4 h-4 text-[#34D399] mb-1.5" />
              <p className="text-[#475569] text-[10px] uppercase tracking-wide mb-0.5">{t("Expiry Date")}</p>
              <p className="text-white text-xs font-medium truncate">{medicine.expiry_date || t("Not detected")}</p>
            </div>
          </div>
        </motion.div>

        {/* Precautions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card-strong rounded-2xl p-5 mb-4"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Info className="w-4 h-4 text-[#818CF8]" />
            </div>
            <h3 className="text-sm font-semibold text-white">{t("Precautions")}</h3>
          </div>
          <div className="space-y-2">
            {precautions.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + index * 0.07 }}
                className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}
              >
                <div className="w-1.5 h-1.5 bg-[#818CF8] rounded-full mt-1.5 shrink-0" />
                <p className="text-[#CBD5E1] text-sm flex-1">{t(item)}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Side effects */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card-strong rounded-2xl p-5 mb-5"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
              <Info className="w-4 h-4 text-[#A78BFA]" />
            </div>
            <h3 className="text-sm font-semibold text-white">{t("Possible Side Effects")}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sideEffects.map((effect, index) => {
              const cfg = SEVERITY_CONFIG[effect.severity];
              return (
                <motion.div
                  key={effect.name}
                  initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 + index * 0.08 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: cfg.bg, border: cfg.border }}
                >
                  <effect.icon className="w-4 h-4 shrink-0" style={{ color: cfg.text }} />
                  <div className="flex-1">
                    <p className="text-white text-sm">{t(effect.name)}</p>
                    <p className="text-xs capitalize" style={{ color: cfg.text }}>{t(effect.severity)}</p>
                  </div>
                  {effect.severity === "severe" && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.text }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onSaveToHistory(medicine)}
              className="w-full py-4 rounded-2xl font-semibold text-white text-sm transition-all"
              style={{ background: 'linear-gradient(135deg, #14B8A6, #6366F1)', boxShadow: '0 4px 20px rgba(20,184,166,0.25)' }}
            >
              {t("Save to History")}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onCheckInteractions(medicine.medicine_name)}
              className="w-full py-4 rounded-2xl font-semibold text-white text-sm transition-all"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
            >
              {t("Check Interactions")}
            </motion.button>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={shareOnWhatsApp}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366' }}
          >
            <Share2 className="w-4 h-4" />
            Share on WhatsApp
          </motion.button>
        </motion.div>

      </motion.div>
    </div>
  );
}
