import {
  Scan,
  MessageSquare,
  ShieldAlert,
  Clock,
  User,
  LogIn,
  LogOut,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useLanguage } from "./language_context";

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  user?: any;
  onLogout: () => void;
  onLoginClick: () => void; // ← replaces the broken onNavigate("home") pattern
}

const PAGE_STRINGS = [
  "Scan",
  "Check",
  "Chat",
  "History",
  "Profile",
  "Logout",
  "Login / Signup",
];

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  isAuth: boolean;
};

const BASE_NAV_ITEMS: NavItem[] = [
  { id: "scanner",      label: "Scan",    icon: Scan,         isAuth: false },
  { id: "interactions", label: "Check",   icon: ShieldAlert,  isAuth: false },
  { id: "chat",         label: "Chat",    icon: MessageSquare,isAuth: false },
  { id: "history",      label: "History", icon: Clock,        isAuth: false },
  { id: "profile",      label: "Profile", icon: User,         isAuth: false },
];

export function Navigation({
  currentPage,
  onNavigate,
  user,
  onLogout,
  onLoginClick,
}: NavigationProps) {
  const { t, language, prime } = useLanguage();
  const isLoggedIn = Boolean(user);

  useEffect(() => {
    if (language !== "English") prime(PAGE_STRINGS);
  }, [language, prime]);

  // Auth item changes based on login state
  const authItem = isLoggedIn
    ? { id: "logout", label: "Logout",        icon: LogOut, isAuth: true }
    : { id: "login",  label: "Login / Signup", icon: LogIn,  isAuth: true };

  const navItems = [authItem, ...BASE_NAV_ITEMS];

  const handleClick = (id: string) => {
    if (id === "login")  { onLoginClick(); return; }
    if (id === "logout") { onLogout();     return; }
    onNavigate(id);
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#4fd1c5]/20 glass-card-strong"
    >
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-around">
          {navItems.map(({ id, label, icon: Icon, isAuth }, index) => {
            const isActive = !isAuth && currentPage === id;

            return (
              <motion.button
                key={id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleClick(id)}
                className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-300
                  ${isActive ? "text-[#4fd1c5]" : "text-[#8a9ab8] hover:text-[#4fd1c5]"}`}
              >
                {/* Active background pill */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    transition={{ type: "spring", duration: 0.5 }}
                    className="absolute inset-0 rounded-xl glass-card neon-border-cyan"
                  />
                )}

                <div className="relative z-10">
                  <Icon className="h-6 w-6" />
                </div>

                <span className="relative z-10 text-xs">{t(label)}</span>

                {/* Active dot */}
                {isActive && (
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