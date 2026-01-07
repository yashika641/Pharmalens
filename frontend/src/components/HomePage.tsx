import { Scan, ShieldAlert, MessageSquare, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { AuthModal } from "./login";

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const stats = [
    { label: "Daily Scans", value: "247", icon: Scan, color: "cyan" },
    { label: "Detected Risks", value: "12", icon: AlertCircle, color: "yellow" },
    { label: "Saved Alerts", value: "89", icon: ShieldAlert, color: "purple" },
  ];
  const [authOpen, setAuthOpen] = useState(false);


  const ctaButtons = [
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
        <div>
          <button
            onClick={() => setAuthOpen(true)}
            className="ml-6 text-[#8a9ab8] hover:text-white transition-colors"
          >
            Login / Signup
          </button>
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
       {/* Auth Modal */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
      />
    </div>
  );
}
