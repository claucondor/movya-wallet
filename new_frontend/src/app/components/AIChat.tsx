import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, Sparkles } from "lucide-react";
import { useNavigate } from "react-router";

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const suggestedPrompts = [
  "Send 1 STX to Manu",
  "Swap 1 sBTC to STX",
  "Check my balance",
  "Show recent transactions",
];

export const AIChat = ({ isOpen, onClose }: AIChatProps) => {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string; actions?: string[] }>>([]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages([...messages, { role: "user", text: userMessage }]);
    setInput("");

    // Simple AI response logic
    setTimeout(() => {
      if (userMessage.toLowerCase().includes("send") && userMessage.toLowerCase().includes("stx")) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "Do you want to send 1 STX to Manu?",
            actions: ["confirm-send", "cancel"],
          },
        ]);
      } else if (userMessage.toLowerCase().includes("swap")) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "Do you want to swap 1 sBTC for STX?",
            actions: ["confirm-swap", "cancel"],
          },
        ]);
      } else if (userMessage.toLowerCase().includes("balance")) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "Your total balance is $6,607. You have 245.5 STX ($122.75), 0.05234 sBTC ($5,234.20), and 1,250 USDC.",
          },
        ]);
      } else if (userMessage.toLowerCase().includes("transaction")) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "Your recent transactions include sending 10 STX to Manu today, and receiving 0.01 sBTC from Sarah Chen yesterday.",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "I can help you send money, swap assets, or check your balance. What would you like to do?",
          },
        ]);
      }
    }, 500);
  };

  const handleAction = (action: string) => {
    if (action === "confirm-send") {
      navigate("/send-confirmation");
      onClose();
    } else if (action === "confirm-swap") {
      navigate("/swap-confirmation");
      onClose();
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 flex justify-center"
          >
            <div className="w-full max-w-md bg-white rounded-t-[2rem] shadow-2xl flex flex-col max-h-[85vh]">
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">AI Assistant</h3>
                    <p className="text-xs text-slate-500">Ask me anything</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-700" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="space-y-4">
                    <p className="text-slate-600 text-center">
                      Hi! I'm your AI assistant. Try asking me to send money or swap assets.
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">Suggestions:</p>
                      {suggestedPrompts.map((prompt, index) => (
                        <button
                          key={index}
                          onClick={() => handlePromptClick(prompt)}
                          className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-sm text-slate-700"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === "user"
                            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        {message.actions && (
                          <div className="flex gap-2 mt-3">
                            {message.actions.map((action, i) => (
                              <button
                                key={i}
                                onClick={() => handleAction(action)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                  action === "cancel"
                                    ? "bg-white/20 hover:bg-white/30 text-slate-700"
                                    : "bg-white text-purple-600 hover:bg-slate-50"
                                }`}
                              >
                                {action === "confirm-send" || action === "confirm-swap"
                                  ? "Confirm"
                                  : "Cancel"}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="px-6 py-4 border-t border-slate-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type a command..."
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
