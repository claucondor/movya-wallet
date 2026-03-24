import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Send, ArrowLeftRight, Users, Clock, Sparkles, Eye, EyeOff } from "lucide-react";
import { MobileContainer } from "../components/MobileContainer";
import { AIChat } from "../components/AIChat";
import { useApp } from "../context/AppContext";

export const Dashboard = () => {
  const navigate = useNavigate();
  const { tokens, transactions } = useApp();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  const totalBalance = tokens.reduce((sum, token) => sum + token.usdValue, 0);

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col bg-gradient-to-b from-slate-50 to-white overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-12 pb-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm text-slate-500 mb-1">Good morning</p>
              <h1 className="text-2xl font-bold text-slate-900">Your Wallet</h1>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-xl">👤</span>
            </div>
          </div>

          {/* Balance Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 rounded-3xl p-6 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-purple-100 text-sm">Total Balance</p>
                <button
                  onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isBalanceHidden ? (
                    <EyeOff className="w-4 h-4 text-purple-100" />
                  ) : (
                    <Eye className="w-4 h-4 text-purple-100" />
                  )}
                </button>
              </div>
              <h2 className="text-4xl font-bold text-white mb-1">
                {isBalanceHidden ? "••••••" : `$${totalBalance.toFixed(2)}`}
              </h2>
              <p className="text-purple-100 text-sm">≈ {tokens[0].balance.toFixed(2)} STX</p>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className="px-6 mb-6">
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Send, label: "Send", action: () => setIsChatOpen(true) },
              { icon: ArrowLeftRight, label: "Swap", action: () => setIsChatOpen(true) },
              { icon: Users, label: "Contacts", action: () => navigate("/contacts") },
              { icon: Clock, label: "History", action: () => navigate("/activity") },
            ].map((item, index) => (
              <motion.button
                key={index}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={item.action}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-slate-700" />
                </div>
                <span className="text-xs text-slate-700 font-medium">{item.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Tokens */}
        <div className="flex-1 overflow-y-auto px-6 pb-32">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Assets</h3>
          <div className="space-y-3">
            {tokens.map((token, index) => (
              <motion.div
                key={token.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${token.color} rounded-full flex items-center justify-center shadow-md`}>
                    <span className="text-white font-bold text-lg">{token.symbol[0]}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{token.name}</h4>
                    <p className="text-sm text-slate-500">{token.balance.toFixed(4)} {token.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {isBalanceHidden ? "••••" : `$${token.usdValue.toFixed(2)}`}
                    </p>
                    <p className="text-sm text-green-600">+2.5%</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Recent Activity Preview */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
              <button
                onClick={() => navigate("/activity")}
                className="text-sm text-purple-600 font-medium hover:text-purple-700"
              >
                See all
              </button>
            </div>
            <div className="space-y-3">
              {transactions.slice(0, 3).map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === "sent" ? "bg-orange-100" :
                      tx.type === "received" ? "bg-green-100" :
                      "bg-blue-100"
                    }`}>
                      <span className="text-lg">
                        {tx.type === "sent" ? "↗️" : tx.type === "received" ? "↙️" : "🔄"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">
                        {tx.type === "sent" && `Sent to ${tx.recipient}`}
                        {tx.type === "received" && `Received from ${tx.sender}`}
                        {tx.type === "swap" && `Swapped ${tx.token} to ${tx.toToken}`}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(tx.date).toLocaleDateString()}
                      </p>
                    </div>
                    <p className={`font-semibold ${
                      tx.type === "sent" ? "text-orange-600" :
                      tx.type === "received" ? "text-green-600" :
                      "text-blue-600"
                    }`}>
                      {tx.type === "sent" ? "-" : tx.type === "received" ? "+" : ""}
                      {tx.amount} {tx.token}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Assistant Button */}
        <motion.button
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-full shadow-2xl hover:shadow-3xl transition-all flex items-center gap-3 z-30"
          style={{ maxWidth: "calc(100% - 3rem)" }}
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold">Ask AI Assistant</span>
        </motion.button>

        {/* AI Chat */}
        <AIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </div>
    </MobileContainer>
  );
};
