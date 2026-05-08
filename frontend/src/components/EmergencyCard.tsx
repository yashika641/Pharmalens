import { Phone, Heart, Pill, User, AlertTriangle, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";

interface EmergencyData {
  name: string;
  age?: number | null;
  allergies?: string;
  conditions?: string;
  savedAt?: string;
}

export function EmergencyCard() {
  const raw = localStorage.getItem("pharmalens_emergency_data");
  const data: EmergencyData | null = raw ? JSON.parse(raw) : null;

  const allergies  = (data?.allergies  ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const conditions = (data?.conditions ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="min-h-screen molecular-bg px-4 pb-nav" style={{ paddingTop: 'calc(1.5rem + 20px)' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)' }}>
          <ShieldAlert className="w-5 h-5 text-[#F87171]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white leading-none mb-0.5">
            Emergency <span className="text-[#F87171]">Info</span>
          </h1>
          <p className="text-[#64748B] text-xs">Show this screen to a doctor or paramedic</p>
        </div>
      </motion.div>

      {!data ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-card-strong rounded-2xl p-10 text-center"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
            <User className="w-7 h-7 text-[#64748B]" />
          </div>
          <p className="text-white font-semibold mb-1">No profile data found</p>
          <p className="text-[#475569] text-sm leading-relaxed">
            Set up your Health Profile in Settings so your emergency info appears here.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {/* Identity */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="glass-card-strong rounded-2xl p-5"
            style={{ border: '1px solid rgba(45,212,191,0.3)' }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.3)' }}>
                <User className="w-7 h-7 text-[#2DD4BF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{data.name}</p>
                {data.age && <p className="text-[#64748B] text-sm mt-0.5">Age: {data.age} years</p>}
              </div>
            </div>
          </motion.div>

          {/* Allergies */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card-strong rounded-2xl p-5"
            style={{ border: '1px solid rgba(239,68,68,0.35)' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-[#F87171]" />
              <h3 className="text-white font-semibold text-sm">Known Allergies</h3>
            </div>
            {allergies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allergies.map((a) => (
                  <span key={a} className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#F87171' }}>
                    {a}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[#475569] text-sm">No known allergies recorded</p>
            )}
          </motion.div>

          {/* Conditions */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="glass-card-strong rounded-2xl p-5"
            style={{ border: '1px solid rgba(167,139,250,0.3)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-[#A78BFA]" />
              <h3 className="text-white font-semibold text-sm">Medical Conditions</h3>
            </div>
            {conditions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {conditions.map((c) => (
                  <span key={c} className="px-3 py-1 rounded-full text-sm"
                    style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', color: '#A78BFA' }}>
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[#475569] text-sm">No conditions recorded</p>
            )}
          </motion.div>

          {/* Current medicines from schedule */}
          <MedicinesFromSchedule />

          {/* Emergency call */}
          <motion.a
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            href="tel:112"
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white text-lg relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)', boxShadow: '0 8px 32px rgba(239,68,68,0.4)' }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-3">
              <Phone className="w-6 h-6" />
              Call Emergency — 112
            </motion.div>
          </motion.a>

          {data.savedAt && (
            <p className="text-center text-xs text-[#334155]">
              Profile last updated: {new Date(data.savedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MedicinesFromSchedule() {
  const raw = localStorage.getItem("pharmalens_schedule");
  if (!raw) return null;
  let schedule: { name: string; dosage: string }[] = [];
  try { schedule = JSON.parse(raw); } catch { return null; }
  if (!schedule.length) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="glass-card-strong rounded-2xl p-5"
      style={{ border: '1px solid rgba(45,212,191,0.2)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Pill className="w-4 h-4 text-[#2DD4BF]" />
        <h3 className="text-white font-semibold text-sm">Current Medicines</h3>
      </div>
      <div className="space-y-2">
        {schedule.map((m) => (
          <div key={m.name} className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-[#2DD4BF] rounded-full shrink-0" />
            <span className="text-white text-sm">{m.name}</span>
            {m.dosage && <span className="text-[#475569] text-xs">{m.dosage}</span>}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
