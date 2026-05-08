import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Scan, ShieldAlert, MessageSquare, ChevronRight, Check } from "lucide-react";

const ONBOARDING_KEY = "pharmalens_onboarded";

const SCREENS = [
  {
    icon: Scan,
    color: "#4fd1c5",
    title: "Scan Any Medicine",
    subtitle: "Point your camera at a pill strip or bottle. PharmaLens reads the name, dosage, expiry, and safety warnings instantly.",
  },
  {
    icon: ShieldAlert,
    color: "#a78bfa",
    title: "Check Drug Interactions",
    subtitle: "Taking multiple medicines? We warn you about dangerous combinations before they cause harm.",
  },
  {
    icon: MessageSquare,
    color: "#6366f1",
    title: "Ask Your AI Pharmacist",
    subtitle: "Have a question about any medication? Chat with PharmaLens in your language — 25 Indian languages supported.",
  },
];

interface OnboardingProps {
  onDone: () => void;
}

export function Onboarding({ onDone }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const isLast = step === SCREENS.length - 1;
  const screen = SCREENS[step];
  const Icon = screen.icon;

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    onDone();
  };

  const next = () => {
    if (isLast) finish();
    else setStep((s) => s + 1);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a0e1a] flex flex-col items-center justify-between px-8 pb-12"
      style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top))' }}>
      {/* Skip */}
      <div className="w-full flex justify-end">
        <button onClick={finish} className="text-[#8a9ab8] text-sm">
          Skip
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center text-center max-w-xs"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6, delay: 0.1 }}
            className="w-28 h-28 rounded-3xl flex items-center justify-center mb-8"
            style={{
              background: `${screen.color}18`,
              border: `1px solid ${screen.color}60`,
              boxShadow: `0 0 40px ${screen.color}20`,
            }}
          >
            <Icon className="w-14 h-14" style={{ color: screen.color }} />
          </motion.div>

          <h2 className="text-2xl text-white font-bold mb-4">{screen.title}</h2>
          <p className="text-[#8a9ab8] leading-relaxed">{screen.subtitle}</p>
        </motion.div>
      </AnimatePresence>

      {/* Bottom */}
      <div className="w-full max-w-xs flex flex-col items-center gap-6">
        {/* Dots */}
        <div className="flex gap-2">
          {SCREENS.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === step ? 24 : 8,
                backgroundColor: i === step ? "#4fd1c5" : "#1a2332",
              }}
              className="h-2 rounded-full"
            />
          ))}
        </div>

        {/* Button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={next}
          className="w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2"
          style={{
            background: `linear-gradient(135deg, #4fd1c5, #6366f1)`,
            boxShadow: "0 0 24px rgba(79,209,197,0.3)",
          }}
        >
          {isLast ? (
            <>
              <Check className="w-5 h-5" />
              Get Started
            </>
          ) : (
            <>
              Next
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}

export function shouldShowOnboarding(): boolean {
  return !localStorage.getItem(ONBOARDING_KEY);
}
