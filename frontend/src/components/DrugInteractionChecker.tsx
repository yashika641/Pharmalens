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
  const [showDetails, setShowDetails] = useState(false);

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
        "http://localhost:8000/drug-interactions/check",
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
              className="glass-card-strong rounded-3xl p-6 neon-border-cyan"
            >
              {/* DRUG PAIR */}
              <h3 className="text-white text-lg mb-2">
                {results.input_drugs.join(" + ")}
              </h3>

              {/* SHORT ANSWER */}
              <p className="text-[#8a9ab8]">
                {results.ai_analysis.short_answer}
              </p>
              {/* VIEW DETAILS BUTTON */}
              <button
                onClick={() => setShowDetails((prev) => !prev)}
                className="mt-3 text-sm text-[#a78bfa] hover:underline"
              >
                {showDetails ? "Hide details" : "View details"}
              </button>

              {/* DETAILS SECTION */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-4"
                  >
                    {/* LONG ANSWER */}
                    <div className="text-[#8a9ab8] text-sm leading-relaxed">
                      {results.ai_analysis.long_answer}
                    </div>

                    {/* OBSERVED INTERACTION PATTERNS */}
                    {results.interactions.length > 0 && (
                      <div className="text-xs text-[#8a9ab8]">
                        <p className="mb-1 font-medium">
                          Observed interaction patterns:
                        </p>
                        <ul className="list-disc ml-4 space-y-1">
                          {results.interactions.map((item, idx) => (
                            <li key={idx}>
                              {item.severity} severity • PRR {item.prr_bucket} •{" "}
                              {item.frequency_bucket.replace("_", " ")} frequency
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              {/* CONFIDENCE */}
              <p className="text-xs text-[#8a9ab8] mt-4">
                Confidence level: {results.ai_analysis.confidence}
              </p>
            </motion.div>

          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
