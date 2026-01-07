import { useState, useRef } from "react";
import { Camera, Upload, Scan, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ScannerPageProps {
  onScanComplete: (result: any) => void;
}

export function ScannerPage({ onScanComplete }: ScannerPageProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScan = () => {
    setIsScanning(true);
    
    // Simulate scanning process
    setTimeout(() => {
      setIsScanning(false);
      onScanComplete({
        name: "Paracetamol",
        manufacturer: "PharmaCorp Industries",
        strength: "500mg",
        type: "Tablet",
        confidence: 96,
      });
    }, 3000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleScan();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleScan();
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
            <span className="neon-text-cyan">Medicine Scanner</span>
          </h2>
          <p className="text-[#8a9ab8]">
            Upload or capture an image of your medication for instant identification
          </p>
        </div>

        {/* Scanner Interface */}
        <AnimatePresence mode="wait">
          {!isScanning ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card-strong rounded-3xl p-8 neon-border-cyan"
            >
              {/* Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-12 mb-6 transition-all duration-300 ${
                  dragActive
                    ? "border-[#4fd1c5] bg-[#4fd1c5]/10 neon-glow-cyan"
                    : "border-[#4fd1c5]/40 hover:border-[#4fd1c5]/70"
                }`}
              >
                {/* Corner decorations */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#4fd1c5]" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#4fd1c5]" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#4fd1c5]" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#4fd1c5]" />

                <div className="flex flex-col items-center text-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-[#4fd1c5]/20 to-[#6366f1]/20 flex items-center justify-center mb-6 neon-border-cyan"
                  >
                    <Upload className="w-12 h-12 text-[#4fd1c5]" />
                  </motion.div>
                  
                  <h3 className="text-xl mb-2 text-white">
                    Drop your medicine image here
                  </h3>
                  <p className="text-[#8a9ab8] mb-6">
                    or click below to browse files
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="glass-card rounded-2xl p-6 neon-border-blue hover:bg-[#6366f1]/10 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <Upload className="w-6 h-6 text-[#6366f1]" />
                  <span className="text-white">Upload from Gallery</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleScan}
                  className="glass-card rounded-2xl p-6 neon-border-cyan hover:bg-[#4fd1c5]/10 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <Camera className="w-6 h-6 text-[#4fd1c5]" />
                  <span className="text-white">Use Camera</span>
                </motion.button>
              </div>

              {/* Tips */}
              <div className="mt-6 glass-card rounded-2xl p-4">
                <p className="text-[#8a9ab8] text-sm">
                  💡 <span className="text-[#4fd1c5]">Tips:</span> Ensure good lighting, 
                  capture the pill strip or bottle clearly, and include any text or codes visible.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card-strong rounded-3xl p-12 neon-border-cyan relative overflow-hidden"
            >
              {/* Scanning animation */}
              <div className="relative h-96 flex items-center justify-center">
                {/* HUD Frame */}
                <div className="absolute inset-8 border-2 border-[#4fd1c5]/50 rounded-2xl">
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-[#4fd1c5]" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-[#4fd1c5]" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-[#4fd1c5]" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-[#4fd1c5]" />
                </div>

                {/* Scan lines */}
                <motion.div
                  animate={{ y: ["-100%", "100%"] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute inset-x-8 h-1 scan-line"
                />

                {/* Center icon */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="relative"
                >
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#4fd1c5]/20 to-[#6366f1]/20 flex items-center justify-center neon-glow-cyan">
                    <Scan className="w-16 h-16 text-[#4fd1c5]" />
                  </div>
                </motion.div>

                {/* Spinning rings */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute w-48 h-48 rounded-full border-2 border-dashed border-[#4fd1c5]/30"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute w-64 h-64 rounded-full border-2 border-dotted border-[#6366f1]/30"
                />

                {/* Scanning particles */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-[#4fd1c5] rounded-full"
                    style={{
                      left: `${50 + 35 * Math.cos((i * Math.PI) / 4)}%`,
                      top: `${50 + 35 * Math.sin((i * Math.PI) / 4)}%`,
                    }}
                    animate={{
                      scale: [0, 1.5, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.25,
                    }}
                  />
                ))}
              </div>

              {/* Status text */}
              <div className="text-center mt-6">
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex items-center justify-center gap-3 mb-3"
                >
                  <Loader2 className="w-6 h-6 text-[#4fd1c5] animate-spin" />
                  <span className="text-xl text-white">Analyzing medication...</span>
                </motion.div>
                <p className="text-[#8a9ab8]">
                  AI is identifying the medicine and checking for safety information
                </p>

                {/* Progress indicators */}
                <div className="mt-6 space-y-2">
                  {["OCR Processing", "Database Matching", "Safety Analysis"].map((step, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.5 }}
                      className="flex items-center gap-3 text-sm"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.5 }}
                        className="w-2 h-2 bg-[#4fd1c5] rounded-full neon-glow-cyan"
                      />
                      <span className="text-[#8a9ab8]">{step}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
