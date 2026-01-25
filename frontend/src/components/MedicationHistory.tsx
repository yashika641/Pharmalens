import { motion } from "motion/react";
import { Clock, Pill, AlertTriangle, CheckCircle, Calendar } from "lucide-react";

interface HistoryItem {
  id: string;
  date: Date;
  medicine: string;
  type: string;
  status: "safe" | "warning" | "danger";
  strength: string;
}

interface MedicationHistoryProps {
  historyItems: HistoryItem[];
}

export function MedicationHistory({ historyItems }: MedicationHistoryProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "safe":
        return {
          bg: "bg-[#34d399]/10",
          border: "border-[#34d399]/50",
          text: "text-[#34d399]",
          icon: CheckCircle,
        };
      case "warning":
        return {
          bg: "bg-[#fbbf24]/10",
          border: "border-[#fbbf24]/50",
          text: "text-[#fbbf24]",
          icon: AlertTriangle,
        };
      case "danger":
        return {
          bg: "bg-[#ef4444]/10",
          border: "border-[#ef4444]/50",
          text: "text-[#ef4444]",
          icon: AlertTriangle,
        };
      default:
        return {
          bg: "bg-[#4fd1c5]/10",
          border: "border-[#4fd1c5]/50",
          text: "text-[#4fd1c5]",
          icon: CheckCircle,
        };
    }
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  return (
    <div className="min-h-screen molecular-bg p-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="text-center mb-8">
          <h2 className="text-4xl mb-3">
            <span className="neon-text-cyan">Medication History</span>
          </h2>
          <p className="text-[#8a9ab8]">
            Track your scanned medications and safety alerts
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card-strong rounded-2xl p-6 neon-border-cyan"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#8a9ab8] mb-1">Total Scans</p>
                <p className="text-3xl text-white">{historyItems.length}</p>
              </div>
              <Pill className="w-10 h-10 text-[#4fd1c5]" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card-strong rounded-2xl p-6 border border-[#fbbf24]/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#8a9ab8] mb-1">Warnings</p>
                <p className="text-3xl text-[#fbbf24]">
                  {historyItems.filter((item) => item.status === "warning").length}
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-[#fbbf24]" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card-strong rounded-2xl p-6 border border-[#34d399]/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#8a9ab8] mb-1">Safe Scans</p>
                <p className="text-3xl text-[#34d399]">
                  {historyItems.filter((item) => item.status === "safe").length}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-[#34d399]" />
            </div>
          </motion.div>
        </div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="relative"
        >
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#4fd1c5] via-[#6366f1] to-[#a78bfa]" />

          <div className="space-y-6">
            {historyItems.map((item, index) => {
              const statusColors = getStatusColor(item.status);
              const StatusIcon = statusColors.icon;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="relative pl-20"
                >
                  {/* Timeline dot */}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                    className={`absolute left-6 top-6 w-4 h-4 rounded-full ${statusColors.bg} border-2 ${statusColors.border}`}
                  />

                  {/* Card */}
                  <div
                    className={`glass-card-strong rounded-2xl p-6 border ${statusColors.border} ${statusColors.bg} hover:scale-[1.02] transition-transform duration-300`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl ${statusColors.bg} border ${statusColors.border} flex items-center justify-center`}>
                          <Pill className={`w-6 h-6 ${statusColors.text}`} />
                        </div>
                        <div>
                          <h3 className="text-xl text-white mb-1">{item.medicine}</h3>
                          <p className="text-sm text-[#8a9ab8]">
                            {item.type} • {item.strength}
                          </p>
                        </div>
                      </div>

                      <StatusIcon className={`w-6 h-6 ${statusColors.text}`} />
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-[#8a9ab8]">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(item.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#8a9ab8]">
                        <Clock className="w-4 h-4" />
                        <span>
                          {item.date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    {item.status !== "safe" && (
                      <div className={`mt-4 p-3 rounded-xl ${statusColors.bg} border ${statusColors.border}`}>
                        <p className={`text-sm ${statusColors.text}`}>
                          {item.status === "warning"
                            ? "⚠️ Caution: Potential interactions detected"
                            : "🚨 Alert: High-risk medication interaction"}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Empty state for future */}
        {historyItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card-strong rounded-3xl p-12 text-center"
          >
            <Clock className="w-16 h-16 text-[#4fd1c5] mx-auto mb-4" />
            <h3 className="text-xl text-white mb-2">No History Yet</h3>
            <p className="text-[#8a9ab8]">
              Start scanning medications to build your history timeline
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}