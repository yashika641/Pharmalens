import { useState, useEffect } from "react";
import { HomePage } from "./components/HomePage";
import { AuthModal } from "./components/login";
import { ScannerPage } from "./components/ScannerPage";
import { MedicineDetails } from "./components/MedicineDetails";
import { DrugInteractionChecker } from "./components/DrugInteractionChecker";
import { AIChat } from "./components/AIChat";
import { MedicationHistory } from "./components/MedicationHistory";
import { ProfileSettings } from "./components/ProfileSettings";
import { Navigation } from "./components/Navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner@2.0.3";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [scanResult, setScanResult] = useState<any>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([
    {
      id: "1",
      date: new Date("2025-11-22T10:30:00"),
      medicine: "Paracetamol",
      type: "Tablet",
      status: "safe",
      strength: "500mg",
    },
    {
      id: "2",
      date: new Date("2025-11-21T15:45:00"),
      medicine: "Ibuprofen",
      type: "Capsule",
      status: "safe",
      strength: "400mg",
    },
    {
      id: "3",
      date: new Date("2025-11-20T09:20:00"),
      medicine: "Warfarin",
      type: "Tablet",
      status: "warning",
      strength: "5mg",
    },
    {
      id: "4",
      date: new Date("2025-11-19T14:10:00"),
      medicine: "Aspirin",
      type: "Tablet",
      status: "danger",
      strength: "100mg",
    },
    {
      id: "5",
      date: new Date("2025-11-18T11:00:00"),
      medicine: "Metformin",
      type: "Tablet",
      status: "safe",
      strength: "850mg",
    },
  ]);
  const [initialDrugsForCheck, setInitialDrugsForCheck] = useState<string[]>([]);

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const handleScanComplete = (result: any) => {
    setScanResult(result);
    setCurrentPage("medicine-details");
  };

  const handleSaveToHistory = (medicine: any) => {
    const newHistoryItem = {
      id: Date.now().toString(),
      date: new Date(),
      medicine: medicine.name,
      type: medicine.type,
      status: "safe", // You could add logic to determine status
      strength: medicine.strength,
    };
    
    setHistoryItems([newHistoryItem, ...historyItems]);
    toast.success("Medicine saved to history", {
      description: `${medicine.name} has been added to your medication history`,
    });
  };

  const handleCheckInteractions = (medicineName: string) => {
    setInitialDrugsForCheck([medicineName]);
    setCurrentPage("interactions");
    toast.info("Check interactions", {
      description: `Add more medications to check interactions with ${medicineName}`,
    });
  };

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage onNavigate={setCurrentPage} />;
      case "scanner":
        return <ScannerPage onScanComplete={handleScanComplete} />;
      case "medicine-details":
        return scanResult ? (
          <MedicineDetails 
            medicine={scanResult} 
            onSaveToHistory={handleSaveToHistory}
            onCheckInteractions={handleCheckInteractions}
          />
        ) : (
          <HomePage onNavigate={setCurrentPage} />
        );
      case "interactions":
        return <DrugInteractionChecker initialDrugs={initialDrugsForCheck} />;
      case "chat":
        return <AIChat />;
      case "history":
        return <MedicationHistory historyItems={historyItems} />;
      case "profile":
        return <ProfileSettings />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <Toaster position="top-center" theme="dark" />
      
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#4fd1c5] rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* DNA/Molecular background pattern */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <circle cx="25" cy="25" r="1" fill="#4fd1c5" />
              <line x1="25" y1="25" x2="25" y2="0" stroke="#4fd1c5" strokeWidth="0.5" />
              <line x1="25" y1="25" x2="50" y2="25" stroke="#6366f1" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Page content with transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
}