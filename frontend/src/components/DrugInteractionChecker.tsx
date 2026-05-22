import { useState, useEffect } from "react";
import { Plus, X, AlertTriangle, CheckCircle, AlertCircle, Search, ShieldAlert, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useLanguage } from "./language_context";
import { fireInteractionAlert } from "../lib/notifications";
import { supabase } from "../supabase";

interface Drug { id: string; name: string; }
interface EvidenceInteraction {
  severity: "mild" | "moderate" | "severe";
  prr_bucket: string;
  frequency_bucket: string;
}
interface AIAnalysis {
  short_answer: string;
  long_answer: string;
  confidence: "low" | "medium" | "high";
}
interface InteractionResult {
  input_drugs: string[];
  ai_analysis: AIAnalysis;
  interactions: EvidenceInteraction[];
}
interface DrugInteractionCheckerProps { initialDrugs?: string[]; }

const PAGE_STRINGS = [
  "Drug Interaction", "Checker",
  "Analyze real clinical interactions using PharmaLens intelligence",
  "Add Medications", "Type medication name...", "Analyzing interactions…",
  "Hide details", "View details", "Observed interaction patterns:", "Confidence level:",
];

const SEVERITY_CONFIG = {
  severe:   { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.3)',   text: '#F87171', icon: AlertTriangle,  label: 'Severe'   },
  moderate: { bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.3)',  text: '#FBBF24', icon: AlertCircle,   label: 'Moderate' },
  mild:     { bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.3)',  text: '#34D399', icon: CheckCircle,   label: 'Mild'     },
};

export function DrugInteractionChecker({ initialDrugs = [] }: DrugInteractionCheckerProps) {
  const { t, language, prime } = useLanguage();

  useEffect(() => {
    if (language !== "English") prime(PAGE_STRINGS);
  }, [language, prime]);

  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<InteractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (initialDrugs.length > 0) {
      setDrugs(initialDrugs.map((name) => ({ id: crypto.randomUUID(), name })));
    }
  }, [initialDrugs]);

  const handleInputChange = (value: string) => { setInputValue(value); };

  const addDrug = (drugName: string) => {
    if (!drugName.trim()) return;
    if (!drugs.find((d) => d.name.toLowerCase() === drugName.toLowerCase())) {
      setDrugs([...drugs, { id: crypto.randomUUID(), name: drugName.trim() }]);
    }
    setInputValue("");
    setSuggestions([]);
    setShowResults(false);
  };

  const removeDrug = (id: string) => {
    setDrugs(drugs.filter((d) => d.id !== id));
    setShowResults(false);
    setResults(null);
  };

  const checkInteractions = async () => {
    if (drugs.length < 2) return;
    setLoading(true);
    setError(null);
    setShowResults(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/drug-interactions/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ drugs: drugs.map((d) => d.name) }),
      });
      if (!response.ok) throw new Error("Failed to fetch interaction data");
      const data: InteractionResult = await response.json();
      setResults(data);
      setShowResults(true);
      const severeInteractions = data.interactions.filter((i) => i.severity === 'severe');
      if (severeInteractions.length > 0) {
        await fireInteractionAlert(data.input_drugs, 'severe');
        toast.error('Dangerous drug combination detected!', {
          description: `${data.input_drugs.join(' + ')}: severe interaction — consult your doctor immediately.`,
          duration: 10000,
        });
      } else if (data.interactions.some((i) => i.severity === 'moderate')) {
        toast.warning('Moderate drug interaction detected', {
          description: `${data.input_drugs.join(' + ')}: use with caution. Check with your pharmacist.`,
          duration: 7000,
        });
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const overallSeverity = results
    ? results.interactions.some(i => i.severity === 'severe') ? 'severe'
    : results.interactions.some(i => i.severity === 'moderate') ? 'moderate'
    : 'mild'
    : null;

  return (
    <div className="min-h-screen molecular-bg px-4 pb-nav" style={{ paddingTop: 'calc(1.5rem + 20px)' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
              <ShieldAlert className="w-5 h-5 text-[#A78BFA]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none mb-0.5">
                {t("Drug Interaction")} <span className="text-[#A78BFA]">{t("Checker")}</span>
              </h1>
              <p className="text-[#64748B] text-xs">{t("Analyze real clinical interactions using PharmaLens intelligence")}</p>
            </div>
          </div>
        </div>

        {/* Input section */}
        <div className="glass-card-strong rounded-2xl p-5 mb-4">
          <label className="text-[#94A3B8] text-xs font-medium uppercase tracking-wide mb-3 block">
            {t("Add Medications")}
          </label>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addDrug(inputValue)}
              placeholder={t("Type medication name...")}
              className="flex-1 rounded-xl px-4 py-3 text-white text-sm placeholder-[#475569] outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
            />
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => addDrug(inputValue)}
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}
            >
              <Plus className="w-5 h-5 text-[#818CF8]" />
            </motion.button>
          </div>

          {/* Drug tags */}
          {drugs.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {drugs.map((drug) => (
                <motion.div
                  key={drug.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.25)' }}
                >
                  <span className="text-[#2DD4BF] text-sm font-medium">{drug.name}</span>
                  <button onClick={() => removeDrug(drug.id)} className="hover:opacity-70 transition-opacity">
                    <X className="w-3.5 h-3.5 text-[#2DD4BF]" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {/* Check Interactions button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={checkInteractions}
            className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            style={drugs.length >= 2 && !loading
              ? { background: 'linear-gradient(135deg, #14B8A6, #6366F1)', color: '#fff', boxShadow: '0 4px 20px rgba(20,184,166,0.25)', cursor: 'pointer' }
              : { background: 'rgba(45,212,191,0.15)', border: '1px solid rgba(45,212,191,0.3)', color: 'rgba(255,255,255,0.5)', cursor: drugs.length < 2 ? 'not-allowed' : 'wait' }
            }
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />{t("Analyzing interactions…")}</>
              : <><Search className="w-4 h-4" />Check Interactions</>
            }
          </motion.button>

          {drugs.length < 2 && (
            <p className="text-[#2DD4BF]/50 text-xs text-center mt-2">Add at least 2 medications to check</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl px-4 py-3 mb-4 text-sm text-[#F87171]"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {showResults && results && overallSeverity && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Severity banner */}
              {(() => {
                const cfg = SEVERITY_CONFIG[overallSeverity];
                const Icon = cfg.icon;
                return (
                  <div className="rounded-2xl p-4 flex items-center gap-3"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <Icon className="w-6 h-6 shrink-0" style={{ color: cfg.text }} />
                    <div>
                      <p className="font-semibold text-white text-sm">{cfg.label} Interaction</p>
                      <p className="text-[#94A3B8] text-xs mt-0.5">
                        {results.input_drugs.join(" + ")}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* AI summary */}
              <div className="glass-card-strong rounded-2xl p-5">
                <p className="text-[#E2E8F0] text-sm leading-relaxed mb-4">
                  {results.ai_analysis.short_answer}
                </p>

                <button
                  onClick={() => setShowDetails((prev) => !prev)}
                  className="text-xs text-[#A78BFA] font-medium hover:opacity-80 transition-opacity"
                >
                  {showDetails ? t("Hide details") : t("View details")}
                </button>

                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-4 overflow-hidden"
                    >
                      <p className="text-[#94A3B8] text-sm leading-relaxed">
                        {results.ai_analysis.long_answer}
                      </p>

                      {results.interactions.length > 0 && (
                        <div>
                          <p className="text-[#64748B] text-xs font-medium uppercase tracking-wide mb-2">
                            {t("Observed interaction patterns:")}
                          </p>
                          <div className="space-y-2">
                            {results.interactions.map((item, idx) => {
                              const cfg = SEVERITY_CONFIG[item.severity];
                              return (
                                <div key={idx} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.text }} />
                                  <span style={{ color: cfg.text }} className="font-medium capitalize">{item.severity}</span>
                                  <span className="text-[#64748B]">·</span>
                                  <span className="text-[#94A3B8]">PRR {item.prr_bucket} · {item.frequency_bucket.replace("_", " ")}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-1.5">
                  <span className="text-[#475569] text-xs">{t("Confidence level:")}</span>
                  <span className={`text-xs font-semibold capitalize ${
                    results.ai_analysis.confidence === 'high' ? 'text-[#34D399]'
                    : results.ai_analysis.confidence === 'medium' ? 'text-[#FBBF24]'
                    : 'text-[#94A3B8]'
                  }`}>{results.ai_analysis.confidence}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
