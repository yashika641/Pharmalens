import { FileText, User, Calendar, Pill, AlertTriangle, Info } from "lucide-react";
import { motion } from "motion/react";

interface PrescriptionDetailsProps {
  prescription: {
    patient_name?: string;
    doctor_name?: string;
    date?: string;
    hospital?: string;
    medicines: {
      name: string;
      dosage?: string;
      frequency?: string;
      duration?: string;
    }[];
    instructions?: string[];
    warnings?: string[];
    notes?: string;
    confidence?: number;
  };
}

export function PrescriptionDetails({ prescription }: PrescriptionDetailsProps) {

  const instructions =
    prescription.instructions?.length
      ? prescription.instructions
      : [
          "Follow the prescribed dosage",
          "Do not skip medication doses",
          "Consult doctor if symptoms persist"
        ];

  const warnings =
    prescription.warnings?.length
      ? prescription.warnings
      : [
          "Do not self-medicate",
          "Complete the full course"
        ];

  return (
    <div className="min-h-screen molecular-bg p-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >

        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#6366f1]/20 to-[#4fd1c5]/20 neon-border-blue mb-4"
          >
            <FileText className="w-10 h-10 text-[#6366f1]" />
          </motion.div>

          <h2 className="text-4xl neon-text-blue mb-2">
            Prescription Detected
          </h2>

          <p className="text-[#8a9ab8]">
            Extracted information from uploaded prescription
          </p>
        </div>

        {/* Patient / Doctor Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card-strong rounded-3xl p-6 mb-6 neon-border-blue"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
              <User className="w-6 h-6 text-[#4fd1c5]" />
              <div>
                <p className="text-sm text-[#8a9ab8]">Patient</p>
                <p className="text-white">{prescription.patient_name || "Not detected"}</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
              <User className="w-6 h-6 text-[#6366f1]" />
              <div>
                <p className="text-sm text-[#8a9ab8]">Doctor</p>
                <p className="text-white">{prescription.doctor_name || "Not detected"}</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-[#a78bfa]" />
              <div>
                <p className="text-sm text-[#8a9ab8]">Date</p>
                <p className="text-white">{prescription.date || "Not detected"}</p>
              </div>
            </div>

          </div>
        </motion.div>

        {/* Medicines List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card-strong rounded-3xl p-6 mb-6"
        >

          <div className="flex items-center gap-3 mb-4">
            <Pill className="w-6 h-6 text-[#4fd1c5]" />
            <h3 className="text-xl text-white">Prescribed Medicines</h3>
          </div>

          <div className="space-y-3">
            {prescription.medicines.map((med, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card rounded-xl p-4 border border-[#4fd1c5]/30"
              >
                <p className="text-white text-lg">{med.name}</p>

                <div className="text-sm text-[#8a9ab8] mt-1 flex gap-4 flex-wrap">
                  {med.dosage && <span>Dosage: {med.dosage}</span>}
                  {med.frequency && <span>Frequency: {med.frequency}</span>}
                  {med.duration && <span>Duration: {med.duration}</span>}
                </div>
              </motion.div>
            ))}
          </div>

        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="glass-card-strong rounded-3xl p-6 mb-6"
        >

          <div className="flex items-center gap-3 mb-4">
            <Info className="w-6 h-6 text-[#6366f1]" />
            <h3 className="text-xl text-white">Instructions</h3>
          </div>

          <div className="space-y-3">
            {instructions.map((item, i) => (
              <div
                key={i}
                className="glass-card rounded-xl p-3 border border-[#6366f1]/30 flex gap-3"
              >
                <div className="w-2 h-2 bg-[#6366f1] rounded-full mt-2" />
                <p className="text-[#e8f0ff]">{item}</p>
              </div>
            ))}
          </div>

        </motion.div>

        {/* Warnings */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="glass-card-strong rounded-3xl p-6"
        >

          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-[#ef4444]" />
            <h3 className="text-xl text-white">Warnings</h3>
          </div>

          <div className="space-y-3">
            {warnings.map((w, i) => (
              <div
                key={i}
                className="glass-card rounded-xl p-3 border border-[#ef4444]/30"
              >
                <p className="text-[#ffe4e6]">{w}</p>
              </div>
            ))}
          </div>

        </motion.div>

      </motion.div>
    </div>
  );
}