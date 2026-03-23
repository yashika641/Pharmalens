import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import {
  User, Heart, Calendar, Globe, Bell, Wifi, WifiOff,
  X, Plus, Check, Loader2, Phone, Pencil, Languages,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Switch } from "./ui/switch";
import { useLanguage, Language } from "./language_context";

const API_URL = import.meta.env.VITE_API_URL;

const LANGUAGES: Language[] = [
  "English", "Spanish", "French", "German", "Chinese",
  "Arabic", "Hindi", "Japanese", "Portuguese", "Russian"
];

const LANG_FLAG: Record<Language, string> = {
  English: "🇬🇧", Spanish: "🇪🇸", French: "🇫🇷", German: "🇩🇪", Chinese: "🇨🇳",
  Arabic: "🇸🇦", Hindi: "🇮🇳", Japanese: "🇯🇵", Portuguese: "🇧🇷", Russian: "🇷🇺"
};

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

export function ProfileSettings() {
  const { t, language, setLanguage, translating, prime } = useLanguage();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [offlineMode,          setOfflineMode]          = useState(false);
  const [profile,              setProfile]              = useState<UserProfile | null>(null);
  const [loading,              setLoading]              = useState(true);
  const [removingAllergy,      setRemovingAllergy]      = useState<string | null>(null);
  const [removingCondition,    setRemovingCondition]    = useState<string | null>(null);
  const [addingAllergy,        setAddingAllergy]        = useState(false);
  const [addingCondition,      setAddingCondition]      = useState(false);

  // ── Fire API call immediately when language changes ───────────────────────
  // prime() queues all PAGE_STRINGS and calls the backend in one batch,
  // bypassing the t()-registration race entirely.
  useEffect(() => {
    if (language !== "English") {
      prime(PAGE_STRINGS);
    }
  }, [language, prime]);

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
    <div className="min-h-screen molecular-bg p-6 pb-24">

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

        <div className="text-center mb-8">
          <h2 className="text-4xl mb-3">
            <span className="neon-text-cyan">{t("Health Profile")}</span>
          </h2>
          <p className="text-[#8a9ab8]">{t("Manage your health information and app settings")}</p>
        </div>

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card-strong rounded-3xl p-8 mb-6 neon-border-cyan"
        >
          <div className="flex items-center gap-6 mb-6">
            <motion.div whileHover={{ scale: 1.05 }}
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#4fd1c5]/20 to-[#6366f1]/20 neon-border-cyan flex items-center justify-center"
            >
              <User className="w-12 h-12 text-[#4fd1c5]" />
            </motion.div>
            <div className="flex-1">
              <h3 className="text-2xl text-white mb-0.5">
                {profile.full_name ?? profile.username ?? t("User")}
              </h3>
              <p className="text-[#8a9ab8] text-sm mb-1">{profile.email}</p>
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card-strong rounded-3xl p-6 mb-6"
        >
          <h3 className="text-xl text-white mb-4 flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#ef4444]" />{t("Health Information")}
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card-strong rounded-3xl p-6 mb-6"
        >
          <h3 className="text-xl text-white mb-1 flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#4fd1c5]" />{t("Language Settings")}
          </h3>
          <p className="text-[#8a9ab8] text-xs mb-4">
            {t("Selecting a language translates the entire app automatically")}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {LANGUAGES.map((lang, index) => (
              <motion.button
                key={lang}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.04 }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setLanguage(lang)}
                className={`glass-card rounded-xl p-3 transition-all duration-300 flex flex-col items-center gap-1 ${
                  language === lang ? "neon-border-cyan bg-[#4fd1c5]/10" : "hover:neon-border-cyan"
                }`}
              >
                <span className="text-2xl">{LANG_FLAG[lang]}</span>
                <span className="text-white text-xs">{lang}</span>
                {language === lang && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-1.5 h-1.5 bg-[#4fd1c5] rounded-full neon-glow-cyan"
                  />
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* App Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card-strong rounded-3xl p-6"
        >
          <h3 className="text-xl text-white mb-4 flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#fbbf24]" />{t("App Settings")}
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
              <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
            </div>

            <div className="flex items-center justify-between p-4 glass-card rounded-xl">
              <div className="flex items-center gap-3">
                {offlineMode
                  ? <WifiOff className="w-5 h-5 text-[#8a9ab8]" />
                  : <Wifi className="w-5 h-5 text-[#4fd1c5]" />}
                <div>
                  <p className="text-white">{t("Offline Mode")}</p>
                  <p className="text-sm text-[#8a9ab8]">{t("Use local database for scanning")}</p>
                </div>
              </div>
              <Switch checked={offlineMode} onCheckedChange={setOfflineMode} />
            </div>
          </div>

          <div className="mt-6 p-4 glass-card rounded-xl border border-[#4fd1c5]/30">
            <h4 className="text-white mb-3">{t("Smart Alert Settings")}</h4>
            <div className="space-y-2 text-sm">
              {SMART_ALERTS.map((label) => (
                <label key={label} className="flex items-center gap-2 text-[#8a9ab8] cursor-pointer hover:text-white transition-colors">
                  <input type="checkbox" defaultChecked className="rounded" />
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