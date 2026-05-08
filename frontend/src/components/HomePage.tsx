import { Scan, ShieldAlert, MessageSquare, TrendingUp, AlertCircle, Clock, Phone, Pill, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useLanguage } from "./language_context";
import { parseDoseSchedule } from "../lib/notifications";

interface HomePageProps {
  onNavigate: (page: string) => void;
  user?: any;
  onLogout: () => void;
  onLogin: (user: any) => void;
}

const PAGE_STRINGS = [
  "Daily Scans",
  "Detected Risks",
  "Saved Alerts",
  "Know You Better",
  "lets know you better",
  "Scan Medicine",
  "AI-powered pill identification",
  "Drug Interactions",
  "Check medication conflicts",
  "AI Pharmacist Chat",
  "Ask anything about medications",
  "Smart Medicine Recognition & Safety AI",
  "Your intelligent companion for medication safety and information",
  "Medication History",
  "Health Profile",
  "Let's Know You Better 💊",
  "Age",
  "Phone Number",
  "Known Allergies (e.g. Penicillin, Peanuts)",
  "Medical Conditions (Diabetes, Hypertension, etc.)",
  "Current Medications (optional)",
  "Cancel",
  "Save Profile",
];

export function HomePage({ onNavigate, user, onLogout, onLogin }: HomePageProps) {
  const { t, language, prime } = useLanguage();

  useEffect(() => {
    if (language !== "English") prime(PAGE_STRINGS);
  }, [language, prime]);

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    age: "",
    phone: "",
    allergies: "",
    conditions: "",
    medications: "",
  });

  const API_URL = import.meta.env.VITE_API_URL;

  const stats = [
    { label: "Daily Scans",    value: "247", icon: Scan,         color: "cyan"   },
    { label: "Detected Risks", value: "12",  icon: AlertCircle,  color: "yellow" },
    { label: "Saved Alerts",   value: "89",  icon: ShieldAlert,  color: "purple" },
  ];

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

  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setProfileData({ ...profileData, [e.target.name]: e.target.value });

  const handleProfileSubmit = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) throw new Error("User not authenticated");

      await fetch(`${API_URL}/user-profile/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(profileData),
      });

      setProfileOpen(false);
    } catch (err) {
      console.error("❌ Failed to save profile", err);
    }
  };

  return (
    <div className="min-h-screen molecular-bg px-4 pb-nav" style={{ paddingTop: 'calc(1.5rem + 20px)' }}>
      {/* Top nav */}
      <div className="flex items-center justify-between mb-8">
        <span
          className="text-xl font-bold"
          style={{
            background: "linear-gradient(135deg, #2DD4BF, #818CF8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          PharmaLens
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Elegant icon badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-10 flex justify-center"
        >
          <div className="relative">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(45,212,191,0.15), rgba(99,102,241,0.15))",
                border: "1px solid rgba(45,212,191,0.25)",
              }}
            >
              <Scan className="w-10 h-10 text-[#2DD4BF]" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#2DD4BF] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          </div>
        </motion.div>

        {/* Hero title */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-4xl md:text-5xl font-bold mb-3 tracking-tight"
          >
            <span
              style={{
                background: "linear-gradient(135deg, #2DD4BF, #818CF8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              PharmaLens
            </span>
          </motion.h1>
          <p className="text-[#94A3B8] text-base max-w-xs mx-auto leading-relaxed">
            {t("Smart Medicine Recognition & Safety AI")}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
              className="glass-card-strong rounded-2xl p-4 text-center"
            >
              <p className="text-2xl font-bold text-white mb-0.5">{stat.value}</p>
              <p className="text-[10px] text-[#64748B] leading-tight">{t(stat.label)}</p>
            </motion.div>
          ))}
        </div>

        {/* Today's Schedule */}
        <TodaySchedule />

        {/* CTA buttons 2x2 grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {ctaButtons.map((button, index) => (
            <motion.button
              key={button.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={button.onClick}
              className="glass-card-strong rounded-2xl p-5 text-left relative overflow-hidden card-hover"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{
                  background:
                    button.color === "cyan"
                      ? "rgba(45,212,191,0.12)"
                      : button.color === "purple"
                      ? "rgba(139,92,246,0.12)"
                      : button.color === "yellow"
                      ? "rgba(251,191,36,0.12)"
                      : "rgba(99,102,241,0.12)",
                }}
              >
                <button.icon
                  className={`w-5 h-5 ${
                    button.color === "cyan"
                      ? "text-[#2DD4BF]"
                      : button.color === "purple"
                      ? "text-[#A78BFA]"
                      : button.color === "yellow"
                      ? "text-[#FBBF24]"
                      : "text-[#818CF8]"
                  }`}
                />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1 leading-tight">
                {t(button.title)}
              </h3>
              <p className="text-[#64748B] text-[11px] leading-tight">
                {t(button.description)}
              </p>
            </motion.button>
          ))}
        </div>

        {/* Quick actions — horizontal scroll row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        >
          <button
            onClick={() => onNavigate("history")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all"
            style={{
              background: "rgba(45,212,191,0.08)",
              border: "1px solid rgba(45,212,191,0.2)",
            }}
          >
            <Clock className="w-4 h-4 text-[#2DD4BF]" />
            <span className="text-sm text-[#94A3B8]">{t("Medication History")}</span>
          </button>
          <button
            onClick={() => onNavigate("profile")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all"
            style={{
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.2)",
            }}
          >
            <TrendingUp className="w-4 h-4 text-[#A78BFA]" />
            <span className="text-sm text-[#94A3B8]">{t("Health Profile")}</span>
          </button>
          <button
            onClick={() => onNavigate("emergency")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <Phone className="w-4 h-4 text-[#F87171]" />
            <span className="text-sm font-semibold text-[#F87171]">SOS</span>
          </button>
        </motion.div>
      </motion.div>

      {/* Profile Modal */}
      <AnimatePresence>
        {profileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card-strong rounded-3xl p-6 max-w-md w-full border border-white/10"
            >
              <h3 className="text-xl font-bold mb-5 text-white text-center">
                {t("Let's Know You Better 💊")}
              </h3>
              <div className="space-y-3">
                <input
                  type="number"
                  name="age"
                  placeholder={t("Age")}
                  value={profileData.age}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-[#64748B] text-sm focus:outline-none focus:ring-1 focus:ring-[#2DD4BF]/50 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder={t("Phone Number")}
                  value={profileData.phone}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-[#64748B] text-sm focus:outline-none focus:ring-1 focus:ring-[#2DD4BF]/50 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
                <textarea
                  name="allergies"
                  placeholder={t("Known Allergies (e.g. Penicillin, Peanuts)")}
                  value={profileData.allergies}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-[#64748B] text-sm focus:outline-none focus:ring-1 focus:ring-[#2DD4BF]/50 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
                <textarea
                  name="conditions"
                  placeholder={t("Medical Conditions (Diabetes, Hypertension, etc.)")}
                  value={profileData.conditions}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-[#64748B] text-sm focus:outline-none focus:ring-1 focus:ring-[#2DD4BF]/50 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
                <textarea
                  name="medications"
                  placeholder={t("Current Medications (optional)")}
                  value={profileData.medications}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-[#64748B] text-sm focus:outline-none focus:ring-1 focus:ring-[#2DD4BF]/50 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setProfileOpen(false)}
                  className="rounded-xl py-3 text-sm text-[#94A3B8] font-medium transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {t("Cancel")}
                </button>
                <button
                  onClick={handleProfileSubmit}
                  className="rounded-xl py-3 text-sm font-semibold text-white transition-all"
                  style={{
                    background: "linear-gradient(135deg, #2DD4BF, #6366F1)",
                  }}
                >
                  {t("Save Profile")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Today's Schedule widget ────────────────────────────────────────────────────

interface ScheduleEntry {
  name: string;
  dosage?: string;
  instructions?: string;
  frequency?: string;
}

function TodaySchedule() {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const nowHour = new Date().getHours();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pharmalens_schedule");
      if (raw) setSchedule(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  if (!schedule.length) return null;

  // Build timeline slots
  type Slot = { hour: number; meds: string[] };
  const slotsMap = new Map<number, string[]>();
  schedule.forEach((med) => {
    const hours = parseDoseSchedule(med.instructions, med.frequency);
    hours.forEach((h) => {
      if (!slotsMap.has(h)) slotsMap.set(h, []);
      slotsMap.get(h)!.push(`${med.name}${med.dosage ? ` (${med.dosage})` : ""}`);
    });
  });
  const slots: Slot[] = Array.from(slotsMap.entries())
    .map(([hour, meds]) => ({ hour, meds }))
    .sort((a, b) => a.hour - b.hour);

  const fmtHour = (h: number) => `${h % 12 || 12}:00 ${h >= 12 ? "PM" : "AM"}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="glass-card-strong rounded-3xl p-5 mb-8 border border-[#4fd1c5]/30"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[#4fd1c5]/15 border border-[#4fd1c5]/30 flex items-center justify-center">
          <Pill className="w-4.5 h-4.5 text-[#4fd1c5]" />
        </div>
        <h3 className="text-white font-semibold">Today's Medicine Schedule</h3>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[#4fd1c5]/10 border border-[#4fd1c5]/30 text-[#4fd1c5]">
          {slots.length} slots
        </span>
      </div>

      <div className="space-y-2">
        {slots.map(({ hour, meds }) => {
          const isPast = hour < nowHour;
          const isCurrent = hour === nowHour;
          return (
            <div
              key={hour}
              className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                isCurrent
                  ? "bg-[#4fd1c5]/10 border border-[#4fd1c5]/40"
                  : isPast
                  ? "opacity-50"
                  : "border border-white/5"
              }`}
            >
              <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                {isPast ? (
                  <CheckCircle2 className="w-4 h-4 text-[#34d399]" />
                ) : (
                  <div className={`w-3 h-3 rounded-full ${isCurrent ? "bg-[#4fd1c5] neon-glow-cyan" : "bg-[#4fd1c5]/40"}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium mb-1 ${isCurrent ? "text-[#4fd1c5]" : "text-[#8a9ab8]"}`}>
                  {fmtHour(hour)}
                  {isCurrent && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#4fd1c5]/20">NOW</span>}
                </p>
                <div className="flex flex-wrap gap-1">
                  {meds.map((m) => (
                    <span key={m} className="text-xs px-2 py-0.5 rounded-lg bg-[#1a2332] text-white border border-white/10">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
