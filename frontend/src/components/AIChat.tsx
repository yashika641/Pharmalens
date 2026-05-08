/// <reference types="vite/client" />
import { useState, useRef, useEffect } from "react";
import { Send, Mic, Loader2, Bot, User, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../supabase";
import { useLanguage } from "./language_context";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

const PAGE_STRINGS = [
  "Hello! I'm your PharmaLens AI Pharmacist. I can help you with medication information, dosage guidance, side effects, and general health questions. How can I assist you today?",
  "AI Pharmacist",
  "Online & Ready to Help",
  "Quick questions you can ask:",
  "What is Paracetamol used for?",
  "Side effects of Aspirin?",
  "How to take antibiotics?",
  "Drug interaction information",
  "Ask me anything about medications...",
  "Powered by Gemma 3n LLM • Always consult your doctor for medical decisions",
];

export function AIChat() {
  const { t, language, prime } = useLanguage();

  useEffect(() => {
    if (language !== "English") prime(PAGE_STRINGS);
  }, [language, prime]);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: t("Hello! I'm your PharmaLens AI Pharmacist. I can help you with medication information, dosage guidance, side effects, and general health questions. How can I assist you today?"),
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const API_URL = import.meta.env.VITE_API_URL;

  const streamAIResponse = async (query: string) => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const eventSource = new EventSource(
      `${API_URL}/chat/stream?query=${encodeURIComponent(query)}&token=${token}`
    );

    let aiText = "";
    const aiId = crypto.randomUUID();

    setMessages(prev => [
      ...prev,
      { id: aiId, text: "", sender: "ai", timestamp: new Date() },
    ]);

    eventSource.onmessage = (e) => {
      aiText += e.data;
      setMessages(prev =>
        prev.map(m => m.id === aiId ? { ...m, text: aiText } : m)
      );
    };

    eventSource.addEventListener("done", () => {
      eventSource.close();
      setIsTyping(false);
    });
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser doesn't support voice input. Try Chrome or Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results).map((r) => r[0].transcript).join("");
      setInputValue(transcript);
    };
    recognition.onend = () => { setIsListening(false); recognitionRef.current = null; };
    recognition.onerror = (e) => { console.error("Speech error:", e.error); setIsListening(false); };
    recognition.start();
  };

  const stopListening = () => { recognitionRef.current?.stop(); setIsListening(false); };

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  useEffect(() => { scrollToBottom(); }, [messages]);

  console.log("Messages:", messages);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const userMsg: Message = { id: crypto.randomUUID(), text: inputValue, sender: "user", timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);
    streamAIResponse(userMsg.text);
  };

  useEffect(() => {
    const loadChatHistory = async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      const res = await fetch(`${API_URL}/chat/history`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const formatted: Message[] = [];
      data.forEach((row: any) => {
        formatted.push({ id: crypto.randomUUID(), text: row.query, sender: "user", timestamp: new Date(row.timestamp) });
        formatted.push({ id: crypto.randomUUID(), text: row.response, sender: "ai", timestamp: new Date(row.timestamp) });
      });
      setMessages(formatted);
    };
    loadChatHistory();
  }, []);

  const quickQuestions = [
    "What is Paracetamol used for?",
    "Side effects of Aspirin?",
    "How to take antibiotics?",
    "Drug interaction information",
  ];

  return (
    <div className="min-h-screen molecular-bg flex flex-col" style={{ paddingTop: 'calc(1.5rem + 20px)' }}>
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-white/[0.06] px-4 py-3"
        style={{ background: 'rgba(8,13,26,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(45,212,191,0.2), rgba(99,102,241,0.2))', border: '1px solid rgba(45,212,191,0.2)' }}>
            <Bot className="w-5 h-5 text-[#2DD4BF]" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm leading-none mb-1">{t("AI Pharmacist")}</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
              <p className="text-[#64748B] text-xs">{t("Online & Ready to Help")}</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.15)' }}>
            <Sparkles className="w-4 h-4 text-[#2DD4BF]" />
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-48">
        <div className="max-w-2xl mx-auto space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-2.5 ${message.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  message.sender === "ai"
                    ? "bg-[#2DD4BF]/10 border border-[#2DD4BF]/20"
                    : "bg-[#8B5CF6]/10 border border-[#8B5CF6]/20"
                }`}>
                  {message.sender === "ai"
                    ? <Bot className="w-4 h-4 text-[#2DD4BF]" />
                    : <User className="w-4 h-4 text-[#8B5CF6]" />}
                </div>

                {/* Bubble */}
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  message.sender === "user"
                    ? "rounded-tr-sm"
                    : "rounded-tl-sm"
                }`}
                  style={message.sender === "user"
                    ? { background: 'linear-gradient(135deg, rgba(45,212,191,0.15), rgba(99,102,241,0.1))', border: '1px solid rgba(45,212,191,0.2)' }
                    : { background: 'rgba(17,25,40,0.8)', border: '1px solid rgba(255,255,255,0.07)' }
                  }>
                  <p className="text-[#E2E8F0] text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                  <p className="text-[#475569] text-[10px] mt-1.5">
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="flex gap-2.5"
              >
                <div className="w-8 h-8 rounded-xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-[#2DD4BF]" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: 'rgba(17,25,40,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex gap-1.5 items-center h-4">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        className="w-1.5 h-1.5 bg-[#2DD4BF] rounded-full opacity-60"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick questions */}
          {messages.length === 1 && !isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="pt-2"
            >
              <p className="text-[#475569] text-xs text-center mb-3">{t("Quick questions you can ask:")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickQuestions.map((question, index) => (
                  <motion.button
                    key={question}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.08 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setInputValue(question)}
                    className="text-left px-4 py-3 rounded-xl text-sm text-[#94A3B8] transition-all"
                    style={{ background: 'rgba(17,25,40,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    {t(question)}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input bar ── */}
      <div
        className="fixed left-0 right-0 px-4 py-3"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))', background: 'rgba(8,13,26,0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ background: 'rgba(17,25,40,0.8)', border: '1px solid rgba(255,255,255,0.09)' }}>
            {/* Input */}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder={t("Ask me anything about medications...")}
              className="flex-1 bg-transparent text-white text-sm placeholder-[#475569] outline-none py-1"
            />

            {/* Voice */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={isListening ? stopListening : startListening}
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                isListening ? "bg-[#2DD4BF]/20" : "hover:bg-white/5"
              }`}
            >
              <Mic className={`w-4 h-4 ${isListening ? "text-[#2DD4BF]" : "text-[#475569]"}`} />
            </motion.button>

            {/* Send */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-30 transition-all"
              style={{ background: inputValue.trim() ? 'linear-gradient(135deg, #14B8A6, #6366F1)' : 'rgba(255,255,255,0.05)' }}
            >
              {isTyping
                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                : <Send className="w-4 h-4 text-white" />}
            </motion.button>
          </div>

          <p className="text-[#334155] text-[10px] text-center mt-2">
            {t("Powered by Gemma 3n LLM • Always consult your doctor for medical decisions")}
          </p>
        </div>
      </div>
    </div>
  );
}
