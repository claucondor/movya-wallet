import React, { createContext, useContext, useState, ReactNode } from "react";

export interface Token {
  id: string;
  name: string;
  symbol: string;
  balance: number;
  usdValue: number;
  color: string;
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  address: string;
  avatar: string;
}

export interface Transaction {
  id: string;
  type: "sent" | "received" | "swap";
  amount: number;
  token: string;
  toToken?: string;
  recipient?: string;
  sender?: string;
  date: string;
  status: "completed" | "pending";
}

interface AppContextType {
  tokens: Token[];
  contacts: Contact[];
  transactions: Transaction[];
  addContact: (contact: Contact) => void;
  addTransaction: (transaction: Transaction) => void;
  userEmail: string;
  setUserEmail: (email: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

const mockTokens: Token[] = [
  {
    id: "1",
    name: "Stacks",
    symbol: "STX",
    balance: 245.5,
    usdValue: 122.75,
    color: "from-purple-500 to-indigo-600",
  },
  {
    id: "2",
    name: "Stacks Bitcoin",
    symbol: "sBTC",
    balance: 0.05234,
    usdValue: 5234.20,
    color: "from-orange-500 to-yellow-600",
  },
  {
    id: "3",
    name: "USD Coin",
    symbol: "USDC",
    balance: 1250.00,
    usdValue: 1250.00,
    color: "from-blue-500 to-cyan-600",
  },
];

const mockContacts: Contact[] = [
  {
    id: "1",
    name: "Manu",
    email: "manu@example.com",
    address: "SP2J6Z...",
    avatar: "🧑‍💻",
  },
  {
    id: "2",
    name: "Sarah Chen",
    email: "sarah@example.com",
    address: "SP3K8L...",
    avatar: "👩",
  },
  {
    id: "3",
    name: "Alex Rivera",
    address: "SP4M9N...",
    avatar: "👨",
  },
];

const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "sent",
    amount: 10,
    token: "STX",
    recipient: "Manu",
    date: "2026-03-24T10:30:00",
    status: "completed",
  },
  {
    id: "2",
    type: "received",
    amount: 0.01,
    token: "sBTC",
    sender: "Sarah Chen",
    date: "2026-03-23T15:45:00",
    status: "completed",
  },
  {
    id: "3",
    type: "swap",
    amount: 0.005,
    token: "sBTC",
    toToken: "STX",
    date: "2026-03-22T09:20:00",
    status: "completed",
  },
  {
    id: "4",
    type: "received",
    amount: 500,
    token: "USDC",
    sender: "Alex Rivera",
    date: "2026-03-21T14:10:00",
    status: "completed",
  },
  {
    id: "5",
    type: "sent",
    amount: 25.5,
    token: "STX",
    recipient: "Sarah Chen",
    date: "2026-03-20T11:55:00",
    status: "completed",
  },
];

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [tokens] = useState<Token[]>(mockTokens);
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [userEmail, setUserEmail] = useState("");

  const addContact = (contact: Contact) => {
    setContacts([...contacts, contact]);
  };

  const addTransaction = (transaction: Transaction) => {
    setTransactions([transaction, ...transactions]);
  };

  return (
    <AppContext.Provider
      value={{
        tokens,
        contacts,
        transactions,
        addContact,
        addTransaction,
        userEmail,
        setUserEmail,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
