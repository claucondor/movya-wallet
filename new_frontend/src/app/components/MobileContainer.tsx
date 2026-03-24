import { ReactNode } from "react";

interface MobileContainerProps {
  children: ReactNode;
  className?: string;
}

export const MobileContainer = ({ children, className = "" }: MobileContainerProps) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-100 via-purple-50 to-blue-50 p-4">
      <div className={`w-full max-w-md h-[812px] bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col ${className}`}>
        {children}
      </div>
    </div>
  );
};
