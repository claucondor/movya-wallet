import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { ArrowLeft, Mail } from "lucide-react";
import { MobileContainer } from "../components/MobileContainer";
import { useApp } from "../context/AppContext";

export const SignIn = () => {
  const navigate = useNavigate();
  const { setUserEmail } = useApp();
  const [email, setEmail] = useState("");

  const handleContinue = () => {
    if (email) {
      setUserEmail(email);
      navigate("/onboarding");
    }
  };

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="p-6 flex items-center">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-8 pt-8 flex flex-col">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mb-6">
              <Mail className="w-8 h-8 text-purple-600" />
            </div>

            <h1 className="text-4xl font-bold text-slate-900 mb-3">
              Welcome back
            </h1>
            <p className="text-slate-600 mb-12">
              Sign in with your email to continue
            </p>

            {/* Email Input */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                />
              </div>
            </div>

            {/* Continue Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleContinue}
              disabled={!email}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </motion.button>

            {/* Trust indicators */}
            <div className="mt-8 p-4 bg-slate-50 rounded-2xl">
              <p className="text-xs text-slate-600 text-center leading-relaxed">
                Your email is only used for account access. We never share your information.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="p-8 text-center">
          <p className="text-sm text-slate-500">
            By continuing, you agree to our Terms & Privacy Policy
          </p>
        </div>
      </div>
    </MobileContainer>
  );
};
