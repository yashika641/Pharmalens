import { Scan, ShieldAlert, MessageSquare, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { AuthModal } from "./login";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase"; // adjust path if needed

interface HomePageProps {
  onNavigate: (page: string) => void;
  user?: any;
  onLogout: () => void;
}

export function HomePage({ onNavigate, user, onLogout }: HomePageProps) {
  const stats = [
    { label: "Daily Scans", value: "247", icon: Scan, color: "cyan" },
    { label: "Detected Risks", value: "12", icon: AlertCircle, color: "yellow" },
    { label: "Saved Alerts", value: "89", icon: ShieldAlert, color: "purple" },
  ];
  const [profileOpen, setProfileOpen] = useState(false);
const [profileData, setProfileData] = useState({
  age: "",
  phone: "",
  allergies: "",
  conditions: "",
  medications: "",
});

  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();
  const handleLogout = async () => {
  try {
    await fetch(" https://pharmalens-ie09.onrender.com/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    // Clear frontend storage
    localStorage.clear();
    sessionStorage.clear();

    // 🔥 TELL REACT USER IS LOGGED OUT
    onLogout();

    // Redirect
    navigate("/", { replace: true });
  } catch (error) {
    console.error("Logout failed", error);
  }

  };

  const handleProfileChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
) => {
  setProfileData({
    ...profileData,
    [e.target.name]: e.target.value,
  });
};


const handleProfileSubmit = async () => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      throw new Error("User not authenticated");
    }

    await fetch("https://pharmalens-ie09.onrender.com/user-profile/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(profileData),
    });

    setProfileOpen(false);
    console.log("✅ User profile saved");
  } catch (err) {
    console.error("❌ Failed to save profile", err);
  }
};

  // now you can safely use `user`


  const ctaButtons = [
    {
      title: "Know You Better",
      description: "lets know you better",
      icon: Clock,
      color: "yellow",
      onClick: () => setProfileOpen(true),
    },
    {
      title: "Scan Medicine",
      description: "AI-powered pill identification",
      icon: Scan,
      color: "cyan",
      onClick: () => onNavigate("scanner"),
    },
    {
      title: "Drug Interactions",
      description: "Check medication conflicts",
      icon: ShieldAlert,
      color: "purple",
      onClick: () => onNavigate("interactions"),
    },
    {
      title: "AI Pharmacist Chat",
      description: "Ask anything about medications",
      icon: MessageSquare,
      color: "blue",
      onClick: () => onNavigate("chat"),
    },

  ];

  return (
    <div className="min-h-screen molecular-bg p-6 pb-24">
      {/* Navbar */}
      <nav className="max-w-6xl mx-auto mb-12 flex items-center justify-between">
  <div className="text-2xl font-bold neon-text-cyan">PharmaLens</div>

  <div className="flex items-center gap-4">
    {/* Show Login / Signup only when NOT logged in */}
    {!user && (
      <button
        onClick={() => setAuthOpen(true)}
        className="text-[#8a9ab8] hover:text-white transition-colors"
      >
        Login / Signup
      </button>
    )}

    {/* Show Logout only when logged in */}
    {user && (
      <button
        onClick={handleLogout}
        className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
      >
        Logout
      </button>
    )}
  </div>
</nav>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto"
      >
        {/* Title */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-block mb-4"
          >
            <div className="relative">
              <h1 className="text-5xl md:text-6xl mb-2">
                <span className="neon-text-cyan">Pharma</span>
                <span className="text-[#a78bfa]">Lens</span>
              </h1>
              <div className="absolute -inset-4 bg-gradient-to-r from-[#4fd1c5]/10 via-[#6366f1]/10 to-[#a78bfa]/10 blur-2xl -z-10" />
            </div>
          </motion.div>
          <p className="text-[#8a9ab8] text-lg max-w-2xl mx-auto">
            Smart Medicine Recognition & Safety AI
          </p>
          <p className="text-[#6b7a99] mt-2">
            Your intelligent companion for medication safety and information
          </p>
        </div>

        {/* Holographic Pill Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-12 flex justify-center"
        >
          <div className="relative w-64 h-64">
            {/* Animated rings */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-2 border-[#4fd1c5]/30"
              style={{ borderStyle: "dashed" }}
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 rounded-full border-2 border-[#6366f1]/30"
              style={{ borderStyle: "dashed" }}
            />

            {/* Center pill icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="glass-card-strong rounded-3xl p-8 neon-border-cyan"
              >
                <Scan className="w-24 h-24 text-[#4fd1c5]" />
              </motion.div>
            </div>

            {/* Floating particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-[#4fd1c5] rounded-full"
                style={{
                  left: `${50 + 40 * Math.cos((i * Math.PI) / 3)}%`,
                  top: `${50 + 40 * Math.sin((i * Math.PI) / 3)}%`,
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
              className="glass-card rounded-2xl p-6 hover:scale-105 transition-transform duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon
                  className={`w-8 h-8 ${stat.color === "cyan"
                    ? "text-[#4fd1c5]"
                    : stat.color === "yellow"
                      ? "text-[#fbbf24]"
                      : "text-[#a78bfa]"
                    }`}
                />
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`w-2 h-2 rounded-full ${stat.color === "cyan"
                    ? "bg-[#4fd1c5] neon-glow-cyan"
                    : stat.color === "yellow"
                      ? "bg-[#fbbf24] neon-glow-yellow"
                      : "bg-[#a78bfa]"
                    }`}
                />
              </div>
              <p className="text-3xl mb-1 text-white">{stat.value}</p>
              <p className="text-[#8a9ab8]">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {ctaButtons.map((button, index) => (
            <motion.button
              key={button.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={button.onClick}
              className={`glass-card-strong rounded-3xl p-8 text-left group relative overflow-hidden ${button.color === "cyan"
                ? "neon-border-cyan"
                : button.color === "purple"
                  ? "neon-border-purple"
                  : "neon-border-blue"
                }`}
            >
              <div className="relative z-10">
                <button.icon
                  className={`w-12 h-12 mb-4 ${button.color === "cyan"
                    ? "text-[#4fd1c5]"
                    : button.color === "purple"
                      ? "text-[#a78bfa]"
                      : "text-[#6366f1]"
                    }`}
                />
                <h3 className="text-xl mb-2 text-white">{button.title}</h3>
                <p className="text-[#8a9ab8]">{button.description}</p>
              </div>

              {/* Hover glow effect */}
              <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${button.color === "cyan"
                  ? "bg-gradient-to-br from-[#4fd1c5]/10 to-transparent"
                  : button.color === "purple"
                    ? "bg-gradient-to-br from-[#a78bfa]/10 to-transparent"
                    : "bg-gradient-to-br from-[#6366f1]/10 to-transparent"
                  }`}
              />
            </motion.button>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="flex flex-wrap gap-4 justify-center"
        >
          <button
            onClick={() => onNavigate("history")}
            className="glass-card rounded-full px-6 py-3 flex items-center gap-2 hover:neon-border-cyan transition-all duration-300"
          >
            <Clock className="w-5 h-5 text-[#4fd1c5]" />
            <span className="text-[#e8f0ff]">Medication History</span>
          </button>
          <button
            onClick={() => onNavigate("profile")}
            className="glass-card rounded-full px-6 py-3 flex items-center gap-2 hover:neon-border-purple transition-all duration-300"
          >
            <TrendingUp className="w-5 h-5 text-[#a78bfa]" />
            <span className="text-[#e8f0ff]">Health Profile</span>
          </button>
        </motion.div>
      </motion.div>
      <AnimatePresence>
  {profileOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-card-strong rounded-3xl p-8 neon-border-cyan max-w-md w-full"
      >
        <h3 className="text-2xl mb-4 text-white text-center">
          Let’s Know You Better 💊
        </h3>

        <div className="space-y-4">
          <input
            type="number"
            name="age"
            placeholder="Age"
            value={profileData.age}
            onChange={handleProfileChange}
            className="w-full p-3 rounded-xl bg-black/30 border border-[#4fd1c5]/30 text-white"
          />

          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            value={profileData.phone}
            onChange={handleProfileChange}
            className="w-full p-3 rounded-xl bg-black/30 border border-[#4fd1c5]/30 text-white"
          />

          <textarea
            name="allergies"
            placeholder="Known Allergies (e.g. Penicillin, Peanuts)"
            value={profileData.allergies}
            onChange={handleProfileChange}
            className="w-full p-3 rounded-xl bg-black/30 border border-[#4fd1c5]/30 text-white"
          />

          <textarea
            name="conditions"
            placeholder="Medical Conditions (Diabetes, Hypertension, etc.)"
            value={profileData.conditions}
            onChange={handleProfileChange}
            className="w-full p-3 rounded-xl bg-black/30 border border-[#4fd1c5]/30 text-white"
          />

          <textarea
            name="medications"
            placeholder="Current Medications (optional)"
            value={profileData.medications}
            onChange={handleProfileChange}
            className="w-full p-3 rounded-xl bg-black/30 border border-[#4fd1c5]/30 text-white"
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <button
            onClick={() => setProfileOpen(false)}
            className="glass-card rounded-xl p-3 text-white hover:neon-border-blue"
          >
            Cancel
          </button>

          <button
            onClick={handleProfileSubmit}
            className="glass-card rounded-xl p-3 neon-border-cyan text-white"
          >
            Save Profile
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

      {/* Auth Modal */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
      />
    </div>
  );
}
