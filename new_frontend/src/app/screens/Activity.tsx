import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from "lucide-react";
import { MobileContainer } from "../components/MobileContainer";
import { useApp } from "../context/AppContext";

export const Activity = () => {
  const navigate = useNavigate();
  const { transactions } = useApp();

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "sent":
        return <ArrowUpRight className="w-5 h-5 text-orange-600" />;
      case "received":
        return <ArrowDownLeft className="w-5 h-5 text-green-600" />;
      case "swap":
        return <ArrowLeftRight className="w-5 h-5 text-blue-600" />;
      default:
        return null;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "sent":
        return "bg-orange-100";
      case "received":
        return "bg-green-100";
      case "swap":
        return "bg-blue-100";
      default:
        return "bg-slate-100";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  };

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="px-6 pt-12 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-700" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Activity</h1>
          </div>
          <p className="text-slate-500 ml-14">All your transactions</p>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {transactions.map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 ${getTransactionColor(tx.type)} rounded-full flex items-center justify-center flex-shrink-0`}>
                    {getTransactionIcon(tx.type)}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">
                        {tx.type === "sent" && "Sent"}
                        {tx.type === "received" && "Received"}
                        {tx.type === "swap" && "Swapped"}
                      </h3>
                      <p className={`font-semibold whitespace-nowrap ${
                        tx.type === "sent" ? "text-orange-600" :
                        tx.type === "received" ? "text-green-600" :
                        "text-blue-600"
                      }`}>
                        {tx.type === "sent" ? "-" : tx.type === "received" ? "+" : ""}
                        {tx.amount} {tx.token}
                      </p>
                    </div>

                    <p className="text-sm text-slate-600 mb-1">
                      {tx.type === "sent" && `To ${tx.recipient}`}
                      {tx.type === "received" && `From ${tx.sender}`}
                      {tx.type === "swap" && `${tx.token} → ${tx.toToken}`}
                    </p>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">{formatDate(tx.date)}</p>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {tx.status === "completed" ? "Completed" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {transactions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No transactions yet</p>
            </div>
          )}
        </div>
      </div>
    </MobileContainer>
  );
};
