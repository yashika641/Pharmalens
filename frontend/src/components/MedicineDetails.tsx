import { AlertTriangle, CheckCircle, Info, Pill, Building2, Activity } from "lucide-react";
import { motion } from "motion/react";
import { Progress } from "./ui/progress";

interface MedicineDetailsProps {
  medicine: {
    name: string;
    manufacturer: string;
    strength: string;
    type: string;
    confidence: number;
  };
  onSaveToHistory: (medicine: any) => void;
  onCheckInteractions: (medicineName: string) => void;
}

export function MedicineDetails({ medicine, onSaveToHistory, onCheckInteractions }: MedicineDetailsProps) {
  const sideEffects = [
    { name: "Nausea", severity: "mild", icon: Info },
    { name: "Drowsiness", severity: "mild", icon: Info },
    { name: "Allergic reactions", severity: "severe", icon: AlertTriangle },
    { name: "Headache", severity: "moderate", icon: AlertTriangle },
  ];

  const warnings = [
    "Do not exceed recommended dosage",
    "Avoid alcohol while taking this medication",
    "Consult doctor if pregnant or breastfeeding",
  ];

  return (
    <div className="min-h-screen molecular-bg p-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#34d399]/20 to-[#4fd1c5]/20 neon-border-cyan mb-4"
          >
            <CheckCircle className="w-10 h-10 text-[#34d399]" />
          </motion.div>
          <h2 className="text-4xl mb-2">
            <span className="neon-text-cyan">Medicine Identified</span>
          </h2>
          <p className="text-[#8a9ab8]">Analysis complete - Review details below</p>
        </div>

        {/* Main Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card-strong rounded-3xl p-8 mb-6 neon-border-cyan"
        >
          {/* Medicine Name */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4fd1c5]/20 to-[#6366f1]/20 flex items-center justify-center neon-border-cyan">
                <Pill className="w-8 h-8 text-[#4fd1c5]" />
              </div>
              <div>
                <h3 className="text-3xl mb-1 text-white">{medicine.name}</h3>
                <p className="text-[#8a9ab8]">{medicine.type}</p>
              </div>
            </div>
            <div className="glass-card rounded-xl px-4 py-2">
              <p className="text-sm text-[#8a9ab8] mb-1">Confidence</p>
              <p className="text-2xl text-[#34d399]">{medicine.confidence}%</p>
            </div>
          </div>

          {/* Confidence Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#8a9ab8]">AI Confidence Level</span>
              <span className="text-sm text-[#4fd1c5]">{medicine.confidence}%</span>
            </div>
            <div className="h-2 bg-[#1a2332] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${medicine.confidence}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full bg-gradient-to-r from-[#4fd1c5] to-[#34d399] relative"
              >
                <motion.div
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />
              </motion.div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
              <Building2 className="w-6 h-6 text-[#6366f1]" />
              <div>
                <p className="text-sm text-[#8a9ab8]">Manufacturer</p>
                <p className="text-white">{medicine.manufacturer}</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
              <Activity className="w-6 h-6 text-[#a78bfa]" />
              <div>
                <p className="text-sm text-[#8a9ab8]">Strength</p>
                <p className="text-white">{medicine.strength}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Warnings Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card-strong rounded-3xl p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#fbbf24]/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-[#fbbf24]" />
            </div>
            <h3 className="text-xl text-white">Important Warnings</h3>
          </div>

          <div className="space-y-3">
            {warnings.map((warning, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-start gap-3 glass-card rounded-xl p-3 border border-[#fbbf24]/30"
              >
                <div className="w-2 h-2 bg-[#fbbf24] rounded-full mt-2 neon-glow-yellow" />
                <p className="text-[#e8f0ff] flex-1">{warning}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Side Effects Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card-strong rounded-3xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#a78bfa]/20 flex items-center justify-center">
              <Info className="w-6 h-6 text-[#a78bfa]" />
            </div>
            <h3 className="text-xl text-white">Possible Side Effects</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sideEffects.map((effect, index) => (
              <motion.div
                key={effect.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className={`glass-card rounded-xl p-4 flex items-center gap-3 ${
                  effect.severity === "severe"
                    ? "border border-[#ef4444]/50 bg-[#ef4444]/5"
                    : effect.severity === "moderate"
                    ? "border border-[#fbbf24]/50 bg-[#fbbf24]/5"
                    : "border border-[#4fd1c5]/30"
                }`}
              >
                <effect.icon
                  className={`w-5 h-5 ${
                    effect.severity === "severe"
                      ? "text-[#ef4444]"
                      : effect.severity === "moderate"
                      ? "text-[#fbbf24]"
                      : "text-[#4fd1c5]"
                  }`}
                />
                <div className="flex-1">
                  <p className="text-white">{effect.name}</p>
                  <p
                    className={`text-xs ${
                      effect.severity === "severe"
                        ? "text-[#ef4444]"
                        : effect.severity === "moderate"
                        ? "text-[#fbbf24]"
                        : "text-[#4fd1c5]"
                    }`}
                  >
                    {effect.severity}
                  </p>
                </div>
                {effect.severity === "severe" && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2 h-2 bg-[#ef4444] rounded-full neon-glow-red"
                  />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex gap-4 mt-6"
        >
          <button
            className="flex-1 glass-card-strong rounded-2xl py-4 neon-border-cyan hover:bg-[#4fd1c5]/10 transition-all duration-300"
            onClick={() => onSaveToHistory(medicine)}
          >
            <span className="text-white">Save to History</span>
          </button>
          <button
            className="flex-1 glass-card-strong rounded-2xl py-4 neon-border-blue hover:bg-[#6366f1]/10 transition-all duration-300"
            onClick={() => onCheckInteractions(medicine.name)}
          >
            <span className="text-white">Check Interactions</span>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}