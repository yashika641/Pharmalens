import { useState, useEffect } from "react";
import {
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Drug {
  id: string;
  name: string;
}

interface Interaction {
  drug1: string;
  drug2: string;
  severity: "severe" | "moderate" | "safe" | "mild";
  description: string;
  clinical_advice?: string;
}

interface InteractionResult {
  interactions: Interaction[];
  safe_combinations?: string[][];
  llm_validation?: {
    confirmed: boolean;
    summary: string;
    additional_risks: string[];
  };
}

interface DrugInteractionCheckerProps {
  initialDrugs?: string[];
}

export function DrugInteractionChecker({
  initialDrugs = [],
}: DrugInteractionCheckerProps) {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<InteractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize with provided drugs
  useEffect(() => {
    if (initialDrugs.length > 0) {
      setDrugs(
        initialDrugs.map((name) => ({
          id: crypto.randomUUID(),
          name,
        }))
      );
    }
  }, [initialDrugs]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

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
      const response = await fetch(
        "https://pharmalens-ie09.onrender.com/drug-interactions/check",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({
            drugs: drugs.map((d) => d.name),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch interaction data");
      }

      const data: InteractionResult = await response.json();
      setResults(data);
      setShowResults(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "severe":
        return {
          bg: "bg-[#ef4444]/10",
          border: "border-[#ef4444]/50",
          text: "text-[#ef4444]",
          glow: "neon-glow-red",
        };
      case "moderate":
        return {
          bg: "bg-[#fbbf24]/10",
          border: "border-[#fbbf24]/50",
          text: "text-[#fbbf24]",
          glow: "neon-glow-yellow",
        };
      default:
        return {
          bg: "bg-[#34d399]/10",
          border: "border-[#34d399]/50",
          text: "text-[#34d399]",
          glow: "neon-glow-green",
        };
    }
  };

  return (
    <div className="min-h-screen molecular-bg p-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="text-center mb-8">
          <h2 className="text-4xl mb-3">
            <span className="neon-text-cyan">Drug Interaction</span>{" "}
            <span className="text-[#a78bfa]">Checker</span>
          </h2>
          <p className="text-[#8a9ab8]">
            Analyze real clinical interactions using PharmaLens intelligence
          </p>
        </div>

        {/* Input Section */}
        <div className="glass-card-strong rounded-3xl p-6 mb-6 neon-border-cyan">
          <label className="text-white mb-3 block">Add Medications</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Type medication name..."
              className="flex-1 glass-card rounded-xl px-4 py-3 text-white placeholder-[#8a9ab8] neon-border-cyan"
            />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => addDrug(inputValue)}
              className="glass-card-strong rounded-xl px-4 neon-border-blue"
            >
              <Plus className="w-6 h-6 text-[#6366f1]" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={checkInteractions}
              className="glass-card-strong rounded-xl px-4 neon-border-cyan"
            >
              <Search className="w-6 h-6 text-[#4fd1c5]" />
            </motion.button>
          </div>

          {/* Selected Drugs */}
          <div className="mt-6 flex flex-wrap gap-3">
            {drugs.map((drug) => (
              <div
                key={drug.id}
                className="glass-card rounded-full px-4 py-2 flex items-center gap-2 neon-border-cyan"
              >
                <span className="text-white">{drug.name}</span>
                <button onClick={() => removeDrug(drug.id)}>
                  <X className="w-4 h-4 text-[#ef4444]" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <p className="text-center text-[#4fd1c5]">Analyzing interactions…</p>
        )}
        {error && (
          <p className="text-center text-[#ef4444]">{error}</p>
        )}

        {/* Results */}
        <AnimatePresence>
          {showResults && results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {results.interactions.map((interaction, index) => {
                const colors = getSeverityColor(interaction.severity);
                return (
                  <div
                    key={index}
                    className={`glass-card-strong rounded-3xl p-6 border ${colors.border} ${colors.bg}`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.bg} ${colors.glow}`}
                      >
                        {interaction.severity === "severe" ? (
                          <AlertTriangle className={`w-6 h-6 ${colors.text}`} />
                        ) : (
                          <AlertCircle className={`w-6 h-6 ${colors.text}`} />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-white">{interaction.drug1}</span>
                          <span className="text-[#8a9ab8]">+</span>
                          <span className="text-white">{interaction.drug2}</span>
                          <span
                            className={`ml-auto px-3 py-1 rounded-full text-sm ${colors.text}`}
                          >
                            {interaction.severity}
                          </span>
                        </div>
                        <p className="text-[#8a9ab8]">
                          {interaction.description}
                        </p>
                        {interaction.clinical_advice && (
                          <p className="text-[#fbbf24] mt-2">
                            ⚠ {interaction.clinical_advice}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* AI Validation */}
              {results.llm_validation && (
                <div className="glass-card-strong rounded-3xl p-6 neon-border-purple">
                  <h4 className="text-white mb-2">
                    AI Safety Validation
                  </h4>
                  <p className="text-[#8a9ab8]">
                    {results.llm_validation.summary}
                  </p>

                  {results.llm_validation.additional_risks.map(
                    (risk, idx) => (
                      <p key={idx} className="text-[#fbbf24] mt-2">
                        ⚠ {risk}
                      </p>
                    )
                  )}
                </div>
              )}

              <p className="text-xs text-[#8a9ab8] text-center mt-6">
                This tool provides informational analysis only and does not
                replace professional medical advice.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
