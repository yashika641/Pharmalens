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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Blur backdrop — extends into safe area */}
      <div className="absolute inset-0 border-t border-white/[0.06]"
        style={{ background: 'rgba(8,13,26,0.96)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }} />

      <div className="relative mx-auto max-w-lg px-2">
        <div className="flex items-center justify-around">
          {navItems.map(({ id, label, icon: Icon, isAuth }, index) => {
            const isActive = !isAuth && currentPage === id;

            return (
              <motion.button
                key={id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleClick(id)}
                className="relative flex flex-col items-center gap-1 px-2 py-2.5 rounded-2xl transition-colors duration-200 min-w-[48px]"
              >
                {/* Active pill background */}
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(45,212,191,0.15), rgba(99,102,241,0.1))',
                      border: '1px solid rgba(45,212,191,0.2)',
                    }}
                  />
                )}

                <div className="relative z-10">
                  <Icon
                    className={`h-5 w-5 transition-colors duration-200 ${
                      isActive ? 'text-[#2DD4BF]' : 'text-slate-500'
                    }`}
                  />
                </div>

                <span
                  className={`relative z-10 text-[10px] font-medium leading-none transition-colors duration-200 ${
                    isActive ? 'text-[#2DD4BF]' : 'text-slate-500'
                  }`}
                >
                  {t(label)}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
