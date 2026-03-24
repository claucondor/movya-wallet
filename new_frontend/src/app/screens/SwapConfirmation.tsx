import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { MobileContainer } from "../components/MobileContainer";

export const SwapConfirmation = () => {
  const navigate = useNavigate();

  const handleConfirm = () => {
    navigate("/success?type=swap");
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
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6">
              <ArrowLeftRight className="w-8 h-8 text-blue-600" />
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Confirm Swap
            </h1>
            <p className="text-slate-600 mb-8">
              Review the swap details before confirming
            </p>

            {/* Swap Details Card */}
            <div className="bg-slate-50 rounded-3xl p-6 mb-6">
              {/* From Token */}
              <div className="bg-white rounded-2xl p-5 mb-3">
                <p className="text-sm text-slate-500 mb-2">You're swapping</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">₿</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">sBTC</p>
                      <p className="text-xs text-slate-500">Stacks Bitcoin</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">1</p>
                    <p className="text-sm text-slate-500">≈ $100,000</p>
                  </div>
                </div>
              </div>

              {/* Swap Arrow */}
              <div className="flex justify-center my-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                </div>
              </div>

              {/* To Token */}
              <div className="bg-white rounded-2xl p-5">
                <p className="text-sm text-slate-500 mb-2">You'll receive</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">S</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">STX</p>
                      <p className="text-xs text-slate-500">Stacks</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">200,000</p>
                    <p className="text-sm text-slate-500">≈ $100,000</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Exchange rate</span>
                <p className="text-sm font-semibold text-slate-900">1 sBTC = 200,000 STX</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Network fee</span>
                <p className="text-sm font-semibold text-slate-900">~$0.50</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Slippage tolerance</span>
                <p className="text-sm font-semibold text-slate-900">0.5%</p>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <p className="text-sm text-blue-900">
                💡 The actual amount may vary slightly due to market conditions.
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
            Confirm Swap
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
