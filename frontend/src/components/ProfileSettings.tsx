import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import {
  User, Heart, Calendar, Globe, Bell, Wifi, WifiOff,
  X, Plus, Check, Loader2, Phone, Pencil, Languages,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Switch } from "./ui/switch";
import { useLanguage, Language, LANGUAGES, LANG_NATIVE } from "./language_context";
import { scheduleDailyReminder, cancelDailyReminder } from "../lib/notifications";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL;

// ── All static strings on this page ───────────────────────────────────────────
// Passed to prime() so the API is called immediately on language change,
// before any t() call happens during render.
const PAGE_STRINGS = [
  "Health Profile",
  "Manage your health information and app settings",
  "Age", "Allergies", "Conditions",
  "Health Information",
  "Known Allergies", "Chronic Conditions",
  "Add Allergy", "Add Condition",
  "Type and press Enter…",
  "Language Settings",
  "Selecting a language translates the entire app automatically",
  "App Settings",
  "Daily Reminders", "Get notified about medication times",
  "Offline Mode", "Use local database for scanning",
  "Smart Alert Settings",
  "Wrong dosage detection", "Duplicate medicine warnings",
  "Elderly-risk alerts", "Blood-thinner conflicts",
  "Translating…", "Not set", "User",
  "Failed to load profile. Please refresh.",
];

interface UserProfile {
  user_id: string; email: string; full_name: string | null;
  username: string | null; age: number | null; phone: string | null;
  allergies: string; conditions: string; medications: string;
}

const getToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
};

// ─── AddChipInput ─────────────────────────────────────────────────────────────

function AddChipInput({ placeholder, onAdd, accentColor, loading }: {
  placeholder: string; onAdd: (v: string) => Promise<void>;
  accentColor: "red" | "purple"; loading: boolean;
}) {
  const [open, setOpen]   = useState(false);
  const [value, setValue] = useState("");
  const inputRef          = useRef<HTMLInputElement>(null);
  const { t }             = useLanguage();

  const colors = accentColor === "red"
    ? { border: "border-[#ef4444]/50", bg: "bg-[#ef4444]/10", text: "text-[#ef4444]" }
    : { border: "border-[#a78bfa]/50", bg: "bg-[#a78bfa]/10", text: "text-[#a78bfa]" };

  const handleSubmit = async () => {
    const v = value.trim(); if (!v) return;
    await onAdd(v); setValue(""); setOpen(false);
  };

  if (!open) return (
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
      onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
      className={`glass-card rounded-full px-4 py-2 border ${colors.border} ${colors.bg} flex items-center gap-1.5`}
    >
      <Plus className={`w-3.5 h-3.5 ${colors.text}`} />
      <span className={`text-sm ${colors.text}`}>{t(placeholder)}</span>
    </motion.button>
  );

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-1.5 glass-card rounded-full px-3 py-1.5 border ${colors.border} ${colors.bg}`}
    >
      <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") { setOpen(false); setValue(""); }
        }}
        placeholder={t("Type and press Enter…")}
        className="bg-transparent text-white text-sm outline-none w-36 placeholder-[#8a9ab8]"
      />
      <button onClick={handleSubmit} disabled={loading || !value.trim()}>
        {loading
          ? <Loader2 className={`w-4 h-4 ${colors.text} animate-spin`} />
          : <Check className={`w-4 h-4 ${colors.text}`} />}
      </button>
      <button onClick={() => { setOpen(false); setValue(""); }}>
        <X className="w-3.5 h-3.5 text-[#8a9ab8] hover:text-white" />
      </button>
    </motion.div>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ label, onRemove, accentColor, removing }: {
  label: string; onRemove: () => void; accentColor: "red" | "purple"; removing: boolean;
}) {
  const colors = accentColor === "red"
    ? { border: "border-[#ef4444]/50", bg: "bg-[#ef4444]/10", dot: "bg-[#ef4444]", glow: "neon-glow-red" }
    : { border: "border-[#a78bfa]/50", bg: "bg-[#a78bfa]/10", dot: "bg-[#a78bfa]", glow: "" };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
      className={`glass-card rounded-full px-4 py-2 border ${colors.border} ${colors.bg} flex items-center gap-2 group`}
    >
      <div className={`w-2 h-2 ${colors.dot} rounded-full ${colors.glow} shrink-0`} />
      <span className="text-white text-sm">{label.trim()}</span>
      <button onClick={onRemove} disabled={removing} className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {removing
          ? <Loader2 className="w-3 h-3 text-[#8a9ab8] animate-spin" />
          : <X className="w-3 h-3 text-[#8a9ab8] hover:text-white" />}
      </button>
    </motion.div>
  );
}

// ─── EditableField ────────────────────────────────────────────────────────────

function EditableField({ value, onSave, type = "text" }: {
  value: string; onSave: (v: string) => Promise<void>; type?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const [saving, setSaving]   = useState(false);
  const { t }                 = useLanguage();

  const handleSave = async () => {
    if (draft.trim() === value) { setEditing(false); return; }
    setSaving(true); await onSave(draft.trim()); setSaving(false); setEditing(false);
  };

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <>
          <input type={type} value={draft} autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setEditing(false);
            }}
            className="bg-transparent border-b border-[#4fd1c5]/60 text-white text-sm outline-none py-0.5 w-24"
          />
          <button onClick={handleSave} disabled={saving}>
            {saving
              ? <Loader2 className="w-4 h-4 text-[#4fd1c5] animate-spin" />
              : <Check className="w-4 h-4 text-[#4fd1c5]" />}
          </button>
          <button onClick={() => setEditing(false)}>
            <X className="w-3.5 h-3.5 text-[#8a9ab8]" />
          </button>
        </>
      ) : (
        <>
          <span className="text-white text-xl">
            {value || <span className="text-[#8a9ab8] italic text-sm">{t("Not set")}</span>}
          </span>
          <button onClick={() => { setDraft(value); setEditing(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="w-3 h-3 text-[#8a9ab8] hover:text-[#4fd1c5]" />
          </button>
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SMART_ALERTS = [
  "Wrong dosage detection",
  "Duplicate medicine warnings",
  "Elderly-risk alerts",
  "Blood-thinner conflicts",
];

const SETTINGS_KEY = "pharmalens_settings";

interface AppSettings {
  notificationsEnabled: boolean;
  offlineMode: boolean;
  smartAlerts: string[];
}

const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: false,
  offlineMode: false,
  smartAlerts: [...SMART_ALERTS],
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function ProfileSettings() {
  const { t, language, setLanguage, translating, prime } = useLanguage();

  const [appSettings,      setAppSettings]      = useState<AppSettings>(loadSettings);
  const [profile,          setProfile]          = useState<UserProfile | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [removingAllergy,  setRemovingAllergy]  = useState<string | null>(null);
  const [removingCondition,setRemovingCondition]= useState<string | null>(null);
  const [addingAllergy,    setAddingAllergy]    = useState(false);
  const [addingCondition,  setAddingCondition]  = useState(false);

  const updateSettings = (patch: Partial<AppSettings>) => {
    const next = { ...appSettings, ...patch };
    setAppSettings(next);
    persistSettings(next);
  };

  const handleNotificationsToggle = async (enabled: boolean) => {
    if (enabled && !Capacitor.isNativePlatform()) {
      toast.info("Notifications work on the Android app only", {
        description: "Daily reminders are scheduled via the PharmaLens Android app.",
        duration: 4000,
      });
      return; // don't flip the toggle on web
    }
    updateSettings({ notificationsEnabled: enabled });
    if (enabled) {
      await scheduleDailyReminder();
    } else {
      await cancelDailyReminder();
    }
  };

  const handleAlertToggle = (label: string, checked: boolean) => {
    const next = checked
      ? [...appSettings.smartAlerts, label]
      : appSettings.smartAlerts.filter((a) => a !== label);
    updateSettings({ smartAlerts: next });
  };

  // ── Fire API call immediately when language changes ───────────────────────
  useEffect(() => {
    if (language !== "English") {
      prime(PAGE_STRINGS);
    }
  }, [language, prime]);

  // ── Keep emergency card data in sync with profile ─────────────────────────
  useEffect(() => {
    if (!profile) return;
    const emergencyData = {
      name: profile.full_name ?? profile.username ?? profile.email ?? "Unknown",
      age: profile.age ?? null,
      allergies: profile.allergies ?? "",
      conditions: profile.conditions ?? "",
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem("pharmalens_emergency_data", JSON.stringify(emergencyData));
  }, [profile]);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/user-profile/details`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        setProfile(json.data);
      } catch { } finally { setLoading(false); }
    })();
  }, []);

  const parseList = (raw?: string | null) =>
    (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const updateField = async (field: keyof UserProfile, value: string) => {
    const token = await getToken();
    await fetch(`${API_URL}/user-profile/update`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setProfile((p) => p ? { ...p, [field]: value } : p);
  };

  const addAllergy = async (value: string) => {
    setAddingAllergy(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/user-profile/add-allergy`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ allergy: value }),
      });
      const json = await res.json();
      setProfile((p) => p ? { ...p, allergies: json.allergies } : p);
    } finally { setAddingAllergy(false); }
  };

  const removeAllergy = async (value: string) => {
    setRemovingAllergy(value);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/user-profile/remove-allergy`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ allergy: value }),
      });
      const json = await res.json();
      setProfile((p) => p ? { ...p, allergies: json.allergies } : p);
    } finally { setRemovingAllergy(null); }
  };

  const addCondition = async (value: string) => {
    setAddingCondition(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/user-profile/add-condition`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ condition: value }),
      });
      const json = await res.json();
      setProfile((p) => p ? { ...p, conditions: json.conditions } : p);
    } finally { setAddingCondition(false); }
  };

  const removeCondition = async (value: string) => {
    setRemovingCondition(value);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/user-profile/remove-condition`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ condition: value }),
      });
      const json = await res.json();
      setProfile((p) => p ? { ...p, conditions: json.conditions } : p);
    } finally { setRemovingCondition(null); }
  };

  if (loading) return (
    <div className="min-h-screen molecular-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#4fd1c5] animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen molecular-bg flex items-center justify-center">
      <p className="text-[#ef4444]">{t("Failed to load profile. Please refresh.")}</p>
    </div>
  );

  const allergies  = parseList(profile.allergies);
  const conditions = parseList(profile.conditions);

  return (
    <div className="min-h-screen molecular-bg px-4 md:px-6 pb-nav" style={{ paddingTop: 'calc(1.5rem + 20px)' }}>

      {/* Translating indicator */}
      <AnimatePresence>
        {translating && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full glass-card-strong border border-[#4fd1c5]/40 text-[#4fd1c5] text-sm"
          >
            <Languages className="w-4 h-4 animate-pulse" />
            {t("Translating…")}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.25)' }}>
              <User className="w-5 h-5 text-[#2DD4BF]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none mb-0.5">
                {t("Health")} <span className="text-[#2DD4BF]">{t("Profile")}</span>
              </h1>
              <p className="text-[#64748B] text-xs">{t("Manage your health information and app settings")}</p>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card-strong rounded-2xl p-4 md:p-6 mb-4"
          style={{ border: '1px solid rgba(45,212,191,0.2)' }}
        >
          <div className="flex items-center gap-3 md:gap-6 mb-4 md:mb-6">
            <motion.div whileHover={{ scale: 1.05 }}
              className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-gradient-to-br from-[#4fd1c5]/20 to-[#6366f1]/20 neon-border-cyan flex items-center justify-center shrink-0"
            >
              <User className="w-8 h-8 md:w-12 md:h-12 text-[#4fd1c5]" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg md:text-2xl text-white mb-0.5 truncate">
                {profile.full_name ?? profile.username ?? t("User")}
              </h3>
              <p className="text-[#8a9ab8] text-xs md:text-sm mb-1 truncate">{profile.email}</p>
              {profile.phone && (
                <p className="text-[#8a9ab8] text-xs flex items-center gap-1">
                  <Phone className="w-3 h-3" />{profile.phone}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-4 group">
              <Calendar className="w-6 h-6 text-[#6366f1] mb-2" />
              <p className="text-sm text-[#8a9ab8]">{t("Age")}</p>
              <EditableField value={profile.age?.toString() ?? ""} type="number" onSave={(v) => updateField("age", v)} />
            </div>
            <div className="glass-card rounded-2xl p-4">
              <Heart className="w-6 h-6 text-[#ef4444] mb-2" />
              <p className="text-sm text-[#8a9ab8]">{t("Allergies")}</p>
              <p className="text-xl text-white">{allergies.length}</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <Heart className="w-6 h-6 text-[#a78bfa] mb-2" />
              <p className="text-sm text-[#8a9ab8]">{t("Conditions")}</p>
              <p className="text-xl text-white">{conditions.length}</p>
            </div>
          </div>
        </motion.div>

        {/* Health Information */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card-strong rounded-2xl p-5 mb-4"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#F87171]" />{t("Health Information")}
          </h3>

          <div className="mb-6">
            <label className="text-[#8a9ab8] text-sm mb-3 block">{t("Known Allergies")}</label>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {allergies.map((a) => (
                  <Chip key={a} label={a} accentColor="red" removing={removingAllergy === a} onRemove={() => removeAllergy(a)} />
                ))}
              </AnimatePresence>
              <AddChipInput placeholder="Add Allergy" accentColor="red" loading={addingAllergy} onAdd={addAllergy} />
            </div>
          </div>

          <div>
            <label className="text-[#8a9ab8] text-sm mb-3 block">{t("Chronic Conditions")}</label>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {conditions.map((c) => (
                  <Chip key={c} label={c} accentColor="purple" removing={removingCondition === c} onRemove={() => removeCondition(c)} />
                ))}
              </AnimatePresence>
              <AddChipInput placeholder="Add Condition" accentColor="purple" loading={addingCondition} onAdd={addCondition} />
            </div>
          </div>
        </motion.div>

        {/* Language Settings */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card-strong rounded-2xl p-4 mb-4"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#2DD4BF]" />{t("Language Settings")}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#4fd1c5]/10 border border-[#4fd1c5]/30 text-[#4fd1c5] shrink-0">
              25 languages
            </span>
          </div>
          <p className="text-[#8a9ab8] text-xs mb-4">
            {t("Selecting a language translates the entire app automatically")}
          </p>

          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm text-white outline-none cursor-pointer transition-all"
              style={{
                background: "rgba(17,25,40,0.8)",
                border: "1px solid rgba(79,209,197,0.35)",
                color: "#e2e8f0",
              }}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang} style={{ background: "#0f1929" }}>
                  {LANG_NATIVE[lang]}  —  {lang}
                </option>
              ))}
            </select>
            {/* Chevron icon */}
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#4fd1c5]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          {/* Current language indicator */}
          {language !== "English" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 flex items-center gap-2 text-xs text-[#4fd1c5]"
            >
              <div className="w-1.5 h-1.5 bg-[#4fd1c5] rounded-full neon-glow-cyan" />
              Active: <span className="font-medium">{language}</span>
              <span className="text-[#8a9ab8]">({LANG_NATIVE[language]})</span>
            </motion.div>
          )}
        </motion.div>

        {/* App Settings */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card-strong rounded-2xl p-5"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#FBBF24]" />{t("App Settings")}
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass-card rounded-xl">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-[#fbbf24]" />
                <div>
                  <p className="text-white">{t("Daily Reminders")}</p>
                  <p className="text-sm text-[#8a9ab8]">{t("Get notified about medication times")}</p>
                </div>
              </div>
              <Switch checked={appSettings.notificationsEnabled} onCheckedChange={handleNotificationsToggle} />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl">
              <div className="flex items-center gap-3">
                {appSettings.offlineMode
                  ? <WifiOff className="w-5 h-5 text-[#8a9ab8]" />
                  : <Wifi className="w-5 h-5 text-[#4fd1c5]" />}
                <div>
                  <p className="text-white">{t("Offline Mode")}</p>
                  <p className="text-sm text-[#8a9ab8]">{t("Use local database for scanning")}</p>
                </div>
              </div>
              <Switch checked={appSettings.offlineMode} onCheckedChange={(v) => updateSettings({ offlineMode: v })} />
            </div>
          </div>

          <div className="mt-6 p-4 glass-card rounded-xl border border-[#4fd1c5]/30">
            <h4 className="text-white mb-3">{t("Smart Alert Settings")}</h4>
            <div className="space-y-2 text-sm">
              {SMART_ALERTS.map((label) => (
                <label key={label} className="flex items-center gap-2 text-[#8a9ab8] cursor-pointer hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={appSettings.smartAlerts.includes(label)}
                    onChange={(e) => handleAlertToggle(label, e.target.checked)}
                    className="rounded accent-[#4fd1c5] w-4 h-4 cursor-pointer"
                  />
                  {t(label)}
                </label>
              ))}
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}