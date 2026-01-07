import { useState, useEffect } from "react";
import { Plus, X, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const mockMedicines = [
  "Paracetamol",
  "Aspirin",
  "Ibuprofen",
  "Warfarin",
  "Metformin",
  "Lisinopril",
  "Omeprazole",
  "Atorvastatin",
];

interface Drug {
  id: string;
  name: string;
}

interface DrugInteractionCheckerProps {
  initialDrugs?: string[];
}

export function DrugInteractionChecker({ initialDrugs = [] }: DrugInteractionCheckerProps) {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Initialize with provided drugs
  useEffect(() => {
    if (initialDrugs.length > 0) {
      const initialDrugObjects = initialDrugs.map((name) => ({
        id: Date.now().toString() + Math.random(),
        name,
      }));
      setDrugs(initialDrugObjects);
    }
  }, [initialDrugs]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (value.length > 0) {
      const filtered = mockMedicines.filter((med) =>
        med.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const addDrug = (drugName: string) => {
    if (!drugs.find((d) => d.name === drugName)) {
      setDrugs([...drugs, { id: Date.now().toString(), name: drugName }]);
      setInputValue("");
      setSuggestions([]);
    }
  };

  const removeDrug = (id: string) => {
    setDrugs(drugs.filter((d) => d.id !== id));
    setShowResults(false);
  };

  const checkInteractions = () => {
    if (drugs.length >= 2) {
      setShowResults(true);
    }
  };

  // Mock interaction data
  const interactions = [
    {
      drug1: "Warfarin",
      drug2: "Aspirin",
      severity: "severe",
      description: "Increased risk of bleeding. Use together with caution and monitor closely.",
    },
    {
      drug1: "Aspirin",
      drug2: "Ibuprofen",
      severity: "moderate",
      description: "May increase risk of gastrointestinal bleeding.",
    },
  ];

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
      case "safe":
        return {
          bg: "bg-[#34d399]/10",
          border: "border-[#34d399]/50",
          text: "text-[#34d399]",
          glow: "neon-glow-green",
        };
      default:
        return {
          bg: "bg-[#4fd1c5]/10",
          border: "border-[#4fd1c5]/50",
          text: "text-[#4fd1c5]",
          glow: "",
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
            Add medications to check for potential interactions and conflicts
          </p>
        </div>

        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card-strong rounded-3xl p-6 mb-6 neon-border-cyan"
        >
          <label className="text-white mb-3 block">Add Medications</label>
          <div className="relative">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Type medication name..."
                className="flex-1 glass-card rounded-xl px-4 py-3 text-white placeholder-[#8a9ab8] neon-border-cyan focus:outline-none focus:neon-glow-cyan transition-all duration-300"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => inputValue && addDrug(inputValue)}
                className="glass-card-strong rounded-xl px-6 neon-border-blue hover:bg-[#6366f1]/10 transition-all duration-300"
              >
                <Plus className="w-6 h-6 text-[#6366f1]" />
              </motion.button>
            </div>

            {/* Autocomplete Suggestions */}
            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 w-full mt-2 glass-card-strong rounded-xl overflow-hidden neon-border-cyan"
                >
                  {suggestions.map((suggestion, index) => (
                    <motion.button
                      key={suggestion}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => addDrug(suggestion)}
                      className="w-full px-4 py-3 text-left text-white hover:bg-[#4fd1c5]/10 transition-colors duration-200 flex items-center gap-3"
                    >
                      <div className="w-2 h-2 bg-[#4fd1c5] rounded-full" />
                      {suggestion}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Selected Drugs */}
          <AnimatePresence>
            {drugs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6"
              >
                <p className="text-[#8a9ab8] mb-3">Selected Medications ({drugs.length})</p>
                <div className="flex flex-wrap gap-3">
                  {drugs.map((drug, index) => (
                    <motion.div
                      key={drug.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: index * 0.05 }}
                      className="glass-card rounded-full px-4 py-2 flex items-center gap-2 neon-border-cyan"
                    >
                      <span className="text-white">{drug.name}</span>
                      <button
                        onClick={() => removeDrug(drug.id)}
                        className="w-5 h-5 rounded-full hover:bg-[#ef4444]/20 flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4 text-[#ef4444]" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Check Button */}
          {drugs.length >= 2 && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={checkInteractions}
              className="w-full mt-6 glass-card-strong rounded-2xl py-4 neon-border-cyan hover:bg-[#4fd1c5]/10 transition-all duration-300"
            >
              <span className="text-white">Check Interactions</span>
            </motion.button>
          )}
        </motion.div>

        {/* Results Section */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-4"
            >
              {/* Interaction Visualization */}
              <div className="glass-card-strong rounded-3xl p-8 relative overflow-hidden">
                <h3 className="text-xl text-white mb-6 text-center">Interaction Map</h3>
                
                <div className="relative h-64 flex items-center justify-center">
                  {/* Center hub */}
                  <div className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-[#4fd1c5]/20 to-[#6366f1]/20 neon-border-cyan flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-[#4fd1c5]" />
                  </div>

                  {/* Drug nodes */}
                  {drugs.slice(0, 4).map((drug, index) => {
                    const angle = (index * 2 * Math.PI) / Math.min(drugs.length, 4);
                    const x = 120 * Math.cos(angle);
                    const y = 120 * Math.sin(angle);

                    return (
                      <motion.div
                        key={drug.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="absolute glass-card rounded-xl px-4 py-2 neon-border-blue"
                        style={{
                          left: `calc(50% + ${x}px)`,
                          top: `calc(50% + ${y}px)`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <span className="text-white text-sm">{drug.name}</span>
                      </motion.div>
                    );
                  })}

                  {/* Connection lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {drugs.slice(0, 4).map((drug, index) => {
                      const angle = (index * 2 * Math.PI) / Math.min(drugs.length, 4);
                      const x1 = 120 * Math.cos(angle);
                      const y1 = 120 * Math.sin(angle);

                      return (
                        <motion.line
                          key={`line-${drug.id}`}
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 0.5 }}
                          transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                          x1="50%"
                          y1="50%"
                          x2={`calc(50% + ${x1}px)`}
                          y2={`calc(50% + ${y1}px)`}
                          stroke="#4fd1c5"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Interaction Details */}
              <div className="space-y-4">
                {interactions.map((interaction, index) => {
                  const colors = getSeverityColor(interaction.severity);
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className={`glass-card-strong rounded-3xl p-6 border ${colors.border} ${colors.bg}`}
                    >
                      <div className="flex items-start gap-4">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center ${colors.glow}`}
                        >
                          {interaction.severity === "severe" ? (
                            <AlertTriangle className={`w-6 h-6 ${colors.text}`} />
                          ) : interaction.severity === "moderate" ? (
                            <AlertCircle className={`w-6 h-6 ${colors.text}`} />
                          ) : (
                            <CheckCircle className={`w-6 h-6 ${colors.text}`} />
                          )}
                        </motion.div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-white">{interaction.drug1}</span>
                            <span className="text-[#8a9ab8]">+</span>
                            <span className="text-white">{interaction.drug2}</span>
                            <span
                              className={`ml-auto px-3 py-1 rounded-full text-sm ${colors.bg} ${colors.text}`}
                            >
                              {interaction.severity}
                            </span>
                          </div>
                          <p className="text-[#8a9ab8]">{interaction.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Safe combinations */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="glass-card-strong rounded-3xl p-6 border border-[#34d399]/50 bg-[#34d399]/10"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-[#34d399]" />
                    <div>
                      <h4 className="text-white mb-1">Other Combinations Safe</h4>
                      <p className="text-[#8a9ab8]">
                        No additional interactions detected between other medications
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}