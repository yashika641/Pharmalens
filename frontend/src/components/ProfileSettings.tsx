import { useState, useEffect } from "react";
import { supabase } from "../supabase";

import { User, Heart, Calendar, Globe, Bell, Wifi, WifiOff } from "lucide-react";
import { motion } from "motion/react";
import { Switch } from "./ui/switch";

export function ProfileSettings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");

  interface UserProfile {
  user_id: string;
  email: string;
  full_name: string | null;
  age: number;
  allergies: string;   // comma-separated
  conditions: string;  // comma-separated
}

const [profile, setProfile] = useState<UserProfile | null>(null);
const [loading, setLoading] = useState(true);


  const languages = ["English", "Spanish", "French", "German", "Chinese", "Arabic"];
  const fetchProfile = async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("No access token");
    }

    const res = await fetch("http://localhost:8000/user-profile/details", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to fetch profile");

    const json = await res.json();
    setProfile(json.data);
  } catch (err) {
    console.error("Failed to load profile", err);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchProfile();
}, []);
if (loading || !profile) {
  return (
    <div className="min-h-screen molecular-bg flex items-center justify-center">
      <span className="text-[#4fd1c5] text-lg">Loading profile…</span>
    </div>
  );
}

  return (
    <div className="min-h-screen molecular-bg p-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="text-center mb-8">
          <h2 className="text-4xl mb-3">
            <span className="neon-text-cyan">Health Profile</span>
          </h2>
          <p className="text-[#8a9ab8]">
            Manage your health information and app settings
          </p>
        </div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card-strong rounded-3xl p-8 mb-6 neon-border-cyan"
        >
          <div className="flex items-center gap-6 mb-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#4fd1c5]/20 to-[#6366f1]/20 neon-border-cyan flex items-center justify-center cursor-pointer"
            >
              <User className="w-12 h-12 text-[#4fd1c5]" />
            </motion.div>
            <div>
              <h3 className="text-2xl text-white mb-1">
  {profile.full_name ?? "User"}
</h3>
<p className="text-[#8a9ab8]">{profile.email}</p>

              <button className="mt-2 text-sm text-[#4fd1c5] hover:text-[#34d399] transition-colors">
                Edit Profile
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-4">
              <Calendar className="w-6 h-6 text-[#6366f1] mb-2" />
              <p className="text-sm text-[#8a9ab8]">Age</p>
              <p className="text-xl text-white">{profile.age} years</p>

            </div>
            <div className="glass-card rounded-2xl p-4">
              <Heart className="w-6 h-6 text-[#ef4444] mb-2" />
              <p className="text-sm text-[#8a9ab8]">Allergies</p>
              <p className="text-xl text-white">
  {profile.allergies.split(",").length}
</p>

            </div>
            <div className="glass-card rounded-2xl p-4">
              <Heart className="w-6 h-6 text-[#a78bfa] mb-2" />
              <p className="text-sm text-[#8a9ab8]">Conditions</p>
              <p className="text-xl text-white">
  {profile.conditions.split(",").length}
</p>

            </div>
          </div>
        </motion.div>

        {/* Health Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card-strong rounded-3xl p-6 mb-6"
        >
          <h3 className="text-xl text-white mb-4 flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#ef4444]" />
            Health Information
          </h3>

          {/* Allergies */}
          <div className="mb-6">
            <label className="text-[#8a9ab8] mb-3 block">Known Allergies</label>
            <div className="flex flex-wrap gap-3">
              {profile.allergies.split(",").map((allergy, index) => (
                <motion.div
                  key={allergy}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="glass-card rounded-full px-4 py-2 border border-[#ef4444]/50 bg-[#ef4444]/10 flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-[#ef4444] rounded-full neon-glow-red" />
                  <span className="text-white">{allergy}</span>
                </motion.div>
              ))}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="glass-card rounded-full px-4 py-2 neon-border-cyan hover:bg-[#4fd1c5]/10 transition-all duration-300"
              >
                <span className="text-[#4fd1c5]">+ Add Allergy</span>
              </motion.button>
            </div>
          </div>

          {/* Chronic Conditions */}
          <div>
            <label className="text-[#8a9ab8] mb-3 block">Chronic Conditions</label>
            <div className="flex flex-wrap gap-3">
              {profile.conditions.split(",").map((condition, index) => (
                <motion.div
                  key={condition}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="glass-card rounded-full px-4 py-2 border border-[#a78bfa]/50 bg-[#a78bfa]/10 flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-[#a78bfa] rounded-full" />
                  <span className="text-white">{condition}</span>
                </motion.div>
              ))}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="glass-card rounded-full px-4 py-2 neon-border-purple hover:bg-[#a78bfa]/10 transition-all duration-300"
              >
                <span className="text-[#a78bfa]">+ Add Condition</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Language Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card-strong rounded-3xl p-6 mb-6"
        >
          <h3 className="text-xl text-white mb-4 flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#4fd1c5]" />
            Language Settings
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {languages.map((language, index) => (
              <motion.button
                key={language}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedLanguage(language)}
                className={`glass-card rounded-xl p-4 transition-all duration-300 ${
                  selectedLanguage === language
                    ? "neon-border-cyan bg-[#4fd1c5]/10"
                    : "hover:neon-border-cyan"
                }`}
              >
                <span className="text-white">{language}</span>
                {selectedLanguage === language && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 bg-[#4fd1c5] rounded-full mx-auto mt-2 neon-glow-cyan"
                  />
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* App Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card-strong rounded-3xl p-6"
        >
          <h3 className="text-xl text-white mb-4 flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#fbbf24]" />
            App Settings
          </h3>

          <div className="space-y-4">
            {/* Notifications */}
            <div className="flex items-center justify-between p-4 glass-card rounded-xl">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-[#fbbf24]" />
                <div>
                  <p className="text-white">Daily Reminders</p>
                  <p className="text-sm text-[#8a9ab8]">
                    Get notified about medication times
                  </p>
                </div>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>

            {/* Offline Mode */}
            <div className="flex items-center justify-between p-4 glass-card rounded-xl">
              <div className="flex items-center gap-3">
                {offlineMode ? (
                  <WifiOff className="w-5 h-5 text-[#8a9ab8]" />
                ) : (
                  <Wifi className="w-5 h-5 text-[#4fd1c5]" />
                )}
                <div>
                  <p className="text-white">Offline Mode</p>
                  <p className="text-sm text-[#8a9ab8]">
                    Use local database for scanning
                  </p>
                </div>
              </div>
              <Switch checked={offlineMode} onCheckedChange={setOfflineMode} />
            </div>
          </div>

          {/* Alerts Section */}
          <div className="mt-6 p-4 glass-card rounded-xl border border-[#4fd1c5]/30">
            <h4 className="text-white mb-3">Smart Alert Settings</h4>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2 text-[#8a9ab8] cursor-pointer hover:text-white transition-colors">
                <input type="checkbox" defaultChecked className="rounded" />
                Wrong dosage detection
              </label>
              <label className="flex items-center gap-2 text-[#8a9ab8] cursor-pointer hover:text-white transition-colors">
                <input type="checkbox" defaultChecked className="rounded" />
                Duplicate medicine warnings
              </label>
              <label className="flex items-center gap-2 text-[#8a9ab8] cursor-pointer hover:text-white transition-colors">
                <input type="checkbox" defaultChecked className="rounded" />
                Elderly-risk alerts
              </label>
              <label className="flex items-center gap-2 text-[#8a9ab8] cursor-pointer hover:text-white transition-colors">
                <input type="checkbox" defaultChecked className="rounded" />
                Blood-thinner conflicts
              </label>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
