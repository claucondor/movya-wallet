import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Sparkles } from "lucide-react";
import { MobileContainer } from "../components/MobileContainer";

export const Welcome = () => {
  const navigate = useNavigate();

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col items-center justify-center px-8 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 relative overflow-hidden">
        {/* Animated background elements */}
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-40 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Logo and branding */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl">
            <Sparkles className="w-12 h-12 text-purple-600" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-5xl font-bold text-white mb-4 tracking-tight"
        >
          Movya Wallet
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-lg text-white/90 text-center max-w-xs mb-12"
        >
          Your AI-powered wallet that speaks your language
        </motion.p>

        {/* Features */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="space-y-4 mb-16"
        >
          {[
            "Send money with simple commands",
            "Swap assets instantly",
            "No crypto jargon",
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
              className="flex items-center gap-3 text-white/90"
            >
              <div className="w-2 h-2 bg-white rounded-full" />
              <span className="text-base">{feature}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/signin")}
          className="w-full max-w-xs bg-white text-purple-600 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-shadow"
        >
          Continue with email
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="text-white/70 text-sm mt-6"
        >
          Safe, simple, and human
        </motion.p>
      </div>
    </MobileContainer>
  );
};
