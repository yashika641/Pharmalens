import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Mail, Lock, User, Github } from "lucide-react";
import { supabase } from "../supabase";
import { Chrome } from "lucide-react"; // Google icon substitute


interface AuthModalProps {
    open: boolean;
    onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
    });

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    // =========================
    // EMAIL / PASSWORD AUTH
    // =========================
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            if (mode === "login") {
                const { error } = await supabase.auth.signInWithPassword({
                    email: form.email,
                    password: form.password,
                });
                if (error) throw error;
            }

            if (mode === "signup") {
                const { error } = await supabase.auth.signUp({
                    email: form.email,
                    password: form.password,
                    options: {
                        data: {
                            full_name: form.name,
                        },
                    },
                });
                if (error) throw error;
            }

            onClose();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    }

    // =========================
    // GITHUB OAUTH
    // =========================
    async function handleGithubAuth() {
        await supabase.auth.signInWithOAuth({
            provider: "github",
            options: {
                redirectTo: `http://localhost:3000/auth/callback?mode=${mode}`,
            },
        });
    }
    async function handleGoogleAuth() {
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `http://localhost:3000/auth/callback?mode=${mode}`,
            },
        });
    }


    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="glass-card-strong neon-border-cyan rounded-3xl w-full max-w-lg p-8 relative">

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 text-[#8a9ab8] hover:text-white"
                            >
                                <X />
                            </button>

                            {/* Tabs */}
                            <div className="flex mb-6">
                                <button
                                    onClick={() => setMode("login")}
                                    className={`flex-1 py-2 rounded-l-xl ${mode === "login"
                                            ? "bg-[#4fd1c5]/20 text-white"
                                            : "text-[#8a9ab8]"
                                        }`}
                                >
                                    Login
                                </button>
                                <button
                                    onClick={() => setMode("signup")}
                                    className={`flex-1 py-2 rounded-r-xl ${mode === "signup"
                                            ? "bg-[#a78bfa]/20 text-white"
                                            : "text-[#8a9ab8]"
                                        }`}
                                >
                                    Sign Up
                                </button>
                            </div>

                            {/* Title */}
                            <h2 className="text-2xl text-white mb-6 text-center">
                                {mode === "login" ? "Welcome Back" : "Create Your Account"}
                            </h2>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {mode === "signup" && (
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 w-5 h-5 text-[#8a9ab8]" />
                                        <input
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            placeholder="Full Name"
                                            required
                                            className="w-full pl-10 py-2 rounded-xl bg-black/30 text-white"
                                        />
                                    </div>
                                )}

                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 w-5 h-5 text-[#8a9ab8]" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="Email"
                                        required
                                        className="w-full pl-10 py-2 rounded-xl bg-black/30 text-white"
                                    />
                                </div>

                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-5 h-5 text-[#8a9ab8]" />
                                    <input
                                        type="password"
                                        name="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        placeholder="Password"
                                        required
                                        className="w-full pl-10 py-2 rounded-xl bg-black/30 text-white"
                                    />
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    disabled={loading}
                                    type="submit"
                                    className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r
                             from-[#4fd1c5] to-[#6366f1] text-black font-semibold"
                                >
                                    {loading
                                        ? "Please wait..."
                                        : mode === "login"
                                            ? "Login"
                                            : "Create Account"}
                                </motion.button>
                            </form>

                            {/* GitHub OAuth */}
                            <button
                                onClick={handleGithubAuth}
                                className="w-full mt-4 flex items-center justify-center gap-3 py-3
                           rounded-xl bg-black/40 border border-white/10
                           text-white hover:bg-black/60"
                            >
                                <Github className="w-5 h-5" />
                                {mode === "login"
                                    ? "Continue with GitHub"
                                    : "Sign up with GitHub"}
                            </button>
                            <button
                                onClick={handleGoogleAuth}
                                className="w-full mt-3 flex items-center justify-center gap-3 py-3
             rounded-xl bg-white text-black font-medium
             hover:bg-gray-200 transition"
                            >
                                <Chrome className="w-5 h-5" />
                                {mode === "login"
                                    ? "Continue with Google"
                                    : "Sign up with Google"}
                            </button>

                            {/* Footer */}
                            <p className="text-center text-[#8a9ab8] text-sm mt-4">
                                {mode === "login" ? (
                                    <>
                                        Don’t have an account?{" "}
                                        <span
                                            onClick={() => setMode("signup")}
                                            className="text-[#a78bfa] cursor-pointer"
                                        >
                                            Sign up
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        Already have an account?{" "}
                                        <span
                                            onClick={() => setMode("login")}
                                            className="text-[#4fd1c5] cursor-pointer"
                                        >
                                            Login
                                        </span>
                                    </>
                                )}
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
