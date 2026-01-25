import {
  Home,
  Scan,
  MessageSquare,
  Clock,
  User,
  ShieldAlert,
} from "lucide-react";
import { motion } from "motion/react";

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  user?: any; // user exists => logged in
}

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home, public: true },
  { id: "scanner", label: "Scan", icon: Scan },
  { id: "interactions", label: "Check", icon: ShieldAlert },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "history", label: "History", icon: Clock },
  { id: "profile", label: "Profile", icon: User },
];

export function Navigation({ currentPage, onNavigate, user }: NavigationProps) {
  const isLoggedIn = Boolean(user);

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#4fd1c5]/20 glass-card-strong"
    >
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-around">
          {NAV_ITEMS.map(({ id, label, icon: Icon, public: isPublic }, index) => {
            const isActive = currentPage === id;
            const isLocked = !isPublic && !isLoggedIn;

            return (
              <motion.button
                key={id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={!isLocked ? { scale: 1.1 } : undefined}
                whileTap={!isLocked ? { scale: 0.95 } : undefined}
                onClick={() => {
                  if (!isLocked) onNavigate(id);
                }}
                disabled={isLocked}
                className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-300
                  ${
                    isLocked
                      ? "opacity-40 cursor-not-allowed text-[#8a9ab8]"
                      : isActive
                      ? "text-[#4fd1c5]"
                      : "text-[#8a9ab8] hover:text-[#4fd1c5]"
                  }`}
              >
                {/* Active background (only if accessible) */}
                {isActive && !isLocked && (
                  <motion.div
                    layoutId="activeTab"
                    transition={{ type: "spring", duration: 0.5 }}
                    className="absolute inset-0 rounded-xl glass-card neon-border-cyan"
                  />
                )}

                {/* Icon */}
                <div className="relative z-10">
                  <Icon className="h-6 w-6" />
                </div>

                {/* Label */}
                <span className="relative z-10 text-xs">{label}</span>

                {/* Active glow */}
                {isActive && !isLocked && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-[#4fd1c5] neon-glow-cyan"
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
