import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";

import { HomePage } from "./components/HomePage";
import { ScannerPage } from "./components/ScannerPage";
import { MedicineDetails } from "./components/MedicineDetails";
import { DrugInteractionChecker } from "./components/DrugInteractionChecker";
import { AIChat } from "./components/AIChat";
import { MedicationHistory } from "./components/MedicationHistory";
import { ProfileSettings } from "./components/ProfileSettings";
import { Navigation } from "./components/Navigation";
import { ProtectedRoute } from "./components/protected";
import { AuthCallback } from "./components/authcallback";
import { supabase } from "./supabase";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";

/* ------------------------------------------
   App Content (Router-aware)
------------------------------------------- */
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<any>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [initialDrugsForCheck, setInitialDrugsForCheck] = useState<string[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);

  /* ------------------------------------------
     Auth State
  ------------------------------------------- */
  useEffect(() => {
    document.documentElement.classList.add("dark");

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /* ------------------------------------------
     Router-based navigation handler
  ------------------------------------------- */
  const handleNavigate = (page: string) => {
    const publicPages = ["home"];

    if (!user && !publicPages.includes(page)) {
      return; // 🔒 Freeze navbar when logged out
    }

    const path = page === "home" ? "/" : `/${page}`;
    navigate(path);
  };

  /* ------------------------------------------
     Active page from URL
  ------------------------------------------- */
  const currentPage =
    location.pathname === "/"
      ? "home"
      : location.pathname.replace("/", "");

  /* ------------------------------------------
     Feature handlers
  ------------------------------------------- */
  const handleScanComplete = (result: any) => {
    setScanResult(result);
    navigate("/medicine");
  };

  const handleSaveToHistory = (medicine: any) => {
    const newItem = {
      id: Date.now().toString(),
      date: new Date(),
      medicine: medicine.name,
      type: medicine.type,
      status: "safe",
      strength: medicine.strength,
    };

    setHistoryItems((prev) => [newItem, ...prev]);

    toast.success("Medicine saved", {
      description: `${medicine.name} added to history`,
    });
  };

  const handleCheckInteractions = (medicineName: string) => {
    setInitialDrugsForCheck([medicineName]);
    navigate("/interactions");
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <Toaster position="top-center" theme="dark" />

      {/* Page transitions */}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
  path="/"
  element={
    <HomePage
      onNavigate={handleNavigate}
      user={user}
      onLogout={() => setUser(null)}
    />
  }
/>
<Route
  path="/auth/callback"
  element={<AuthCallback setUser={setUser} />}
/>


          <Route
            path="/scanner"
            element={
              <ProtectedRoute user={user}>
                <ScannerPage onScanComplete={handleScanComplete} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/medicine"
            element={
              <ProtectedRoute user={user}>
                {scanResult ? (
                  <MedicineDetails
                    medicine={scanResult}
                    onSaveToHistory={handleSaveToHistory}
                    onCheckInteractions={handleCheckInteractions}
                  />
                ) : (
                  <Navigate to="/" replace />
                )}
              </ProtectedRoute>
            }
          />

          <Route
            path="/interactions"
            element={
              <ProtectedRoute user={user}>
                <DrugInteractionChecker
                  initialDrugs={initialDrugsForCheck}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat"
            element={
              <ProtectedRoute user={user}>
                <AIChat />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute user={user}>
                <MedicationHistory historyItems={historyItems} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute user={user}>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AnimatePresence>

      {/* Bottom Navigation */}
      <Navigation
        currentPage={currentPage}
        onNavigate={handleNavigate}
        user={user}
      />
    </div>
  );
}

/* ------------------------------------------
   App Root
------------------------------------------- */
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
