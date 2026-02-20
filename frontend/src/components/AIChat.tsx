/// <reference types="vite/client" />
import { useState, useRef, useEffect } from "react";
import { Send, Mic, Camera, Loader2, Bot, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../supabase";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your PharmaLens AI Pharmacist. I can help you with medication information, dosage guidance, side effects, and general health questions. How can I assist you today?",
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
        prev.map(m =>
          m.id === aiId ? { ...m, text: aiText } : m
        )
      );
    };

    eventSource.addEventListener("done", () => {
      eventSource.close();
      setIsTyping(false);
    });

  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
const getSessionAndToken = async () => {
  const sessionRes = await supabase.auth.getSession();
  return sessionRes.data.session?.access_token;
};

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  console.log("Messages:", messages);
  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

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

    const res = await fetch(`${API_URL}/chat/history`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    const formatted: Message[] = [];

    data.forEach((row: any) => {
      // User message
      formatted.push({
        id: crypto.randomUUID(),
        text: row.query,
        sender: "user",
        timestamp: new Date(row.timestamp),
      });

      // AI response
      formatted.push({
        id: crypto.randomUUID(),
        text: row.response,
        sender: "ai",
        timestamp: new Date(row.timestamp),
      });
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
    <div className="min-h-screen molecular-bg flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card-strong border-b border-[#4fd1c5]/20 p-6"
      >
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4fd1c5]/20 to-[#6366f1]/20 neon-border-cyan flex items-center justify-center"
          >
            <Bot className="w-6 h-6 text-[#4fd1c5]" />
          </motion.div>
          <div>
            <h2 className="text-xl text-white">AI Pharmacist</h2>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-[#34d399] rounded-full neon-glow-green"
              />
              <p className="text-sm text-[#8a9ab8]">Online & Ready to Help</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 pb-32">
        <div className="max-w-4xl mx-auto space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${message.sender === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
              >
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${message.sender === "ai"
                    ? "bg-gradient-to-br from-[#4fd1c5]/20 to-[#6366f1]/20 neon-border-cyan"
                    : "bg-gradient-to-br from-[#a78bfa]/20 to-[#6366f1]/20 neon-border-purple"
                    }`}
                >
                  {message.sender === "ai" ? (
                    <Bot className="w-5 h-5 text-[#4fd1c5]" />
                  ) : (
                    <User className="w-5 h-5 text-[#a78bfa]" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`glass-card rounded-2xl p-4 max-w-[70%] ${message.sender === "ai" ? "rounded-tl-none" : "rounded-tr-none"
                    } ${message.sender === "ai"
                      ? "border border-[#4fd1c5]/30"
                      : "border border-[#a78bfa]/30"
                    }`}
                >
                  <p className="text-[#e8f0ff] leading-relaxed">{message.text}</p>
                  <p className="text-xs text-[#8a9ab8] mt-2">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4fd1c5]/20 to-[#6366f1]/20 neon-border-cyan flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[#4fd1c5]" />
                </div>
                <div className="glass-card rounded-2xl rounded-tl-none p-4 border border-[#4fd1c5]/30">
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -8, 0] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                        className="w-2 h-2 bg-[#4fd1c5] rounded-full"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Questions */}
          {messages.length === 1 && !isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="pt-4"
            >
              <p className="text-sm text-[#8a9ab8] mb-3 text-center">
                Quick questions you can ask:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickQuestions.map((question, index) => (
                  <motion.button
                    key={question}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setInputValue(question)}
                    className="glass-card rounded-xl p-3 text-left text-sm text-[#e8f0ff] hover:neon-border-cyan transition-all duration-300"
                  >
                    {question}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-20 left-0 right-0 p-6 glass-card-strong border-t border-[#4fd1c5]/20">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            {/* Camera Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="glass-card rounded-xl p-3 neon-border-cyan hover:bg-[#4fd1c5]/10 transition-all duration-300"
            >
              <Camera className="w-6 h-6 text-[#4fd1c5]" />
            </motion.button>

            {/* Input Field */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask me anything about medications..."
                className="w-full glass-card rounded-xl px-4 py-3 pr-12 text-white placeholder-[#8a9ab8] neon-border-cyan focus:outline-none focus:neon-glow-cyan transition-all duration-300"
              />
            </div>

            {/* Voice Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="glass-card rounded-xl p-3 neon-border-purple hover:bg-[#a78bfa]/10 transition-all duration-300"
            >
              <Mic className="w-6 h-6 text-[#a78bfa]" />
            </motion.button>

            {/* Send Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="glass-card rounded-xl p-3 neon-border-blue hover:bg-[#6366f1]/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTyping ? (
                <Loader2 className="w-6 h-6 text-[#6366f1] animate-spin" />
              ) : (
                <Send className="w-6 h-6 text-[#6366f1]" />
              )}
            </motion.button>
          </div>

          <p className="text-xs text-[#8a9ab8] text-center mt-3">
            Powered by Gemma 3n LLM • Always consult your doctor for medical decisions
          </p>
        </div>
      </div>
    </div>
  );
}
