"use client";

import { motion } from "framer-motion";
import { ShieldAlert, ArrowLeft } from "lucide-react";

interface AccessDeniedModalProps {
  message: string;
  onClose: () => void;
}

export default function AccessDeniedModal({ message, onClose }: AccessDeniedModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-rose-100 p-8 text-center relative"
      >
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-rose-100">
          <ShieldAlert className="w-10 h-10 text-[#E8436E]" />
        </div>

        <h3 className="text-2xl font-bold text-[#7A0D3C] mb-3">
          Access Denied
        </h3>

        <p className="text-[#737373] text-sm leading-relaxed mb-8 px-4">
          {message}
        </p>

        <button
          onClick={onClose}
          className="w-full py-4 bg-gradient-to-r from-[#E8436E] to-[#CC3366] text-white rounded-2xl font-semibold shadow-lg shadow-rose-200 hover:shadow-xl hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Return to Login
        </button>
      </motion.div>
    </div>
  );
}
