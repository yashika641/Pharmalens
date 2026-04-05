import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import { App as CapApp } from '@capacitor/app';

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
import { AuthModal } from "./components/login"; // ← ADD THIS IMPORT
import { supabase } from "./supabase";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { PrescriptionDetails } from "./components/PrescriptionDetails";

const API_URL = import.meta.env.VITE_API_URL;

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<any>(null);
  const [authOpen, setAuthOpen] = useState(false); // ← ADD THIS
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

    CapApp.addListener('appUrlOpen', async ({ url }) => {
      if (url.includes('pharmalens://auth/callback')) {
        const hashFragment = url.includes('#') ? url.split('#')[1] : '';
        if (hashFragment) {
          const params = new URLSearchParams(hashFragment);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken) {
            const { data } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            if (data?.user) setUser(data.user);
          }
        }
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /* ------------------------------------------
     Logout
  ------------------------------------------- */
  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Backend logout failed (continuing anyway):", err);
    } finally {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      navigate("/", { replace: true });
    }
  };

  /* ------------------------------------------
     Login
  ------------------------------------------- */
  const handleLogin = (u: any) => {
    setUser(u);
    setAuthOpen(false); // ← close modal after login
  };

  /* ------------------------------------------
     Navigation — opens auth modal if logged out
     and trying to access a protected page
  ------------------------------------------- */
  const handleNavigate = (page: string) => {
    const publicPages = ["home"];
    if (!user && !publicPages.includes(page)) {
      setAuthOpen(true); // ← show login instead of silently ignoring
      return;
    }
    const path = page === "home" ? "/" : `/${page}`;
    navigate(path);
  };

  const currentPage =
    location.pathname === "/" ? "home" : location.pathname.replace("/", "");

  /* ------------------------------------------
     Feature handlers
  ------------------------------------------- */
  const handleScanComplete = (result: any) => {
    setScanResult(result);
    navigate(result.type === "prescription" ? "/prescription" : "/medicine");
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

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <HomePage
                onNavigate={handleNavigate}
                user={user}
                onLogout={handleLogout}
                onLogin={handleLogin}
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
            path="/prescription"
            element={
              <ProtectedRoute user={user}>
                {scanResult ? (
                  <PrescriptionDetails
                    prescription={scanResult}
                    onSaveToHistory={handleSaveToHistory}
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
                <DrugInteractionChecker initialDrugs={initialDrugsForCheck} />
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

      <Navigation
        currentPage={currentPage}
        onNavigate={handleNavigate}
        user={user}
        onLogout={handleLogout}
        onLoginClick={() => setAuthOpen(true)} // ← ADD THIS PROP
      />

      {/* AuthModal — one instance for the whole app */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}