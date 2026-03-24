import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { ArrowLeft, Search, Plus } from "lucide-react";
import { MobileContainer } from "../components/MobileContainer";
import { useApp } from "../context/AppContext";

export const Contacts = () => {
  const navigate = useNavigate();
  const { contacts } = useApp();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="px-6 pt-12 pb-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-700" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-3">
            {filteredContacts.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center text-2xl">
                    {contact.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900">{contact.name}</h3>
                    {contact.email && (
                      <p className="text-sm text-slate-500 truncate">{contact.email}</p>
                    )}
                    <p className="text-sm text-slate-400 truncate font-mono">{contact.address}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredContacts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No contacts found</p>
            </div>
          )}
        </div>

        {/* Add Contact Button */}
        <div className="p-6 border-t border-slate-100">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate("/add-contact")}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Contact
          </motion.button>
        </div>
      </div>
    </MobileContainer>
  );
};
