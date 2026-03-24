import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate, useSearchParams } from "react-router";
import { CheckCircle2 } from "lucide-react";
import { MobileContainer } from "../components/MobileContainer";

export const Success = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "send";
  const [confetti, setConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setConfetti(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const getMessage = () => {
    switch (type) {
      case "send":
        return {
          title: "Sent successfully!",
          description: "1 STX has been sent to Manu",
          emoji: "✅",
        };
      case "swap":
        return {
          title: "Swap completed!",
          description: "You swapped 1 sBTC for 200,000 STX",
          emoji: "🔄",
        };
      default:
        return {
          title: "Success!",
          description: "Your transaction was completed",
          emoji: "✨",
        };
    }
  };

  const message = getMessage();

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 relative overflow-hidden">
        {/* Animated background circles */}
        {confetti && (
          <>
            <motion.div
              className="absolute top-20 left-10 w-20 h-20 bg-green-200/30 rounded-full"
              animate={{
                y: [0, -100, 0],
                x: [0, 50, 0],
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute top-40 right-20 w-16 h-16 bg-emerald-200/30 rounded-full"
              animate={{
                y: [0, 100, 0],
                x: [0, -30, 0],
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute bottom-40 left-20 w-24 h-24 bg-teal-200/30 rounded-full"
              animate={{
                y: [0, -80, 0],
                x: [0, 40, 0],
                scale: [1, 1.4, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.1,
            }}
          >
            <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl mb-8 relative">
              <CheckCircle2 className="w-16 h-16 text-white" strokeWidth={2.5} />
              
              {/* Ripple effect */}
              <motion.div
                className="absolute inset-0 rounded-full bg-green-400"
                animate={{
                  scale: [1, 1.5],
                  opacity: [0.5, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            </div>
          </motion.div>

          {/* Emoji */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-6xl mb-6"
          >
            {message.emoji}
          </motion.div>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl font-bold text-slate-900 mb-3">
              {message.title}
            </h1>
            <p className="text-lg text-slate-600 max-w-xs">
              {message.description}
            </p>
          </motion.div>

          {/* Transaction Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="w-full max-w-sm bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl mb-8"
          >
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
              <span className="text-slate-600">Status</span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                Completed
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Transaction time</span>
              <span className="font-semibold text-slate-900">
                {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="p-6 space-y-3"
        >
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Back to Dashboard
          </button>

          <button
            onClick={() => navigate("/activity")}
            className="w-full bg-white/80 backdrop-blur-sm text-slate-700 py-4 rounded-2xl font-semibold hover:bg-white transition-all"
          >
            View Activity
          </button>
        </motion.div>
      </div>
    </MobileContainer>
  );
};
