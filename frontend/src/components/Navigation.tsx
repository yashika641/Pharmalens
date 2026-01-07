import { Home, Scan, MessageSquare, Clock, User, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "scanner", icon: Scan, label: "Scan" },
    { id: "interactions", icon: ShieldAlert, label: "Check" },
    { id: "chat", icon: MessageSquare, label: "Chat" },
    { id: "history", icon: Clock, label: "History" },
    { id: "profile", icon: User, label: "Profile" },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 glass-card-strong border-t border-[#4fd1c5]/20 z-50"
    >
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-around">
          {navItems.map((item, index) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;

            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center gap-1 relative py-2 px-3 rounded-xl transition-all duration-300 ${
                  isActive ? "text-[#4fd1c5]" : "text-[#8a9ab8] hover:text-[#4fd1c5]"
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 glass-card rounded-xl neon-border-cyan"
                    transition={{ type: "spring", duration: 0.5 }}
                  />
                )}

                <div className="relative z-10">
                  <Icon className={`w-6 h-6 ${isActive ? "text-[#4fd1c5]" : ""}`} />
                </div>

                <span className="relative z-10 text-xs">{item.label}</span>

                {/* Glow effect for active */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -bottom-1 w-1.5 h-1.5 bg-[#4fd1c5] rounded-full neon-glow-cyan"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#4fd1c5] to-transparent opacity-50" />
    </motion.nav>
  );
}
