import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { ArrowLeft, UserPlus } from "lucide-react";
import { MobileContainer } from "../components/MobileContainer";
import { useApp } from "../context/AppContext";

export const AddContact = () => {
  const navigate = useNavigate();
  const { addContact } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [method, setMethod] = useState<"address" | "email">("address");

  const handleAdd = () => {
    if (name && (method === "email" ? email : address)) {
      addContact({
        id: Date.now().toString(),
        name,
        email: method === "email" ? email : undefined,
        address: method === "email" ? "SP..." : address,
        avatar: "👤",
      });
      navigate("/contacts");
    }
  };

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="px-6 pt-12 pb-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate("/contacts")}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-700" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Add Contact</h1>
          </div>

          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mb-4">
            <UserPlus className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-slate-600">
            Add a contact to send money easily
          </p>
        </div>

        {/* Form */}
        <div className="flex-1 px-6 pb-6 overflow-y-auto">
          {/* Method Toggle */}
          <div className="mb-6">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setMethod("address")}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  method === "address"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                By Address
              </button>
              <button
                onClick={() => setMethod("email")}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  method === "email"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                By Email
              </button>
            </div>
          </div>

          {/* Name Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contact Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Conditional Input */}
          {method === "email" ? (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@example.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-slate-500 mt-2">
                They must have a Movya Wallet account
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Wallet Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="SP2J6ZY48GV1EZ5V2V5RB9MP..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-2">
                Enter the full wallet address
              </p>
            </div>
          )}

          {/* Info Card */}
          <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
            <p className="text-sm text-purple-900">
              💡 Tip: Add contacts to send money with simple commands like "Send 10 STX to {name || "name"}"
            </p>
          </div>
        </div>

        {/* Add Button */}
        <div className="p-6 border-t border-slate-100">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleAdd}
            disabled={!name || (method === "email" ? !email : !address)}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Contact
          </motion.button>
        </div>
      </div>
    </MobileContainer>
  );
};
