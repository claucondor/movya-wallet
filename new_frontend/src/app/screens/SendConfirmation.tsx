import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { MobileContainer } from "../components/MobileContainer";

export const SendConfirmation = () => {
  const navigate = useNavigate();

  const handleConfirm = () => {
    navigate("/success?type=send");
  };

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="px-6 pt-12 pb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 flex flex-col">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mb-6">
              <ArrowUpRight className="w-8 h-8 text-orange-600" />
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Confirm Send
            </h1>
            <p className="text-slate-600 mb-8">
              Review the details before sending
            </p>

            {/* Transaction Details Card */}
            <div className="bg-slate-50 rounded-3xl p-6 mb-6">
              {/* Amount */}
              <div className="text-center mb-8 pb-8 border-b border-slate-200">
                <p className="text-sm text-slate-500 mb-2">You're sending</p>
                <h2 className="text-5xl font-bold text-slate-900 mb-2">1 STX</h2>
                <p className="text-slate-500">≈ $0.50</p>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3">
                  <span className="text-slate-600">To</span>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">Manu</p>
                    <p className="text-sm text-slate-500 font-mono">SP2J6Z...</p>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-slate-200">
                  <span className="text-slate-600">Network fee</span>
                  <p className="font-semibold text-slate-900">~$0.01</p>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-slate-200">
                  <span className="text-slate-600">Estimated time</span>
                  <p className="font-semibold text-slate-900">~10 seconds</p>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 mb-6">
              <p className="text-sm text-purple-900">
                🔒 This transaction is secure and cannot be reversed once confirmed.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 space-y-3 border-t border-slate-100">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleConfirm}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Confirm & Send
          </motion.button>

          <button
            onClick={() => navigate("/dashboard")}
            className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-semibold hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </MobileContainer>
  );
};
