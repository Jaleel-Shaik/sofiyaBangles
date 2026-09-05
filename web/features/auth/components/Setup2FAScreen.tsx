"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/lib/auth-context";
import { type Verify2FAResponse } from "@/src/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Loader2,
  Scan,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Download,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

type SetupStep = "qr" | "verify" | "backup_codes";

export default function Setup2FAScreen() {
  const router = useRouter();
  const { qrCodeUrl, manualSecret, regenerateQR, verifyFirstOTP, completeAuthentication, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<SetupStep>("qr");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrExpired, setQrExpired] = useState(false);

  // Backup codes state
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [acknowledgedBackup, setAcknowledgedBackup] = useState(false);
  const savedAuthResultRef = useRef<Verify2FAResponse | null>(null);

  // QR expiry timer (10 min)
  useEffect(() => {
    if (currentStep !== "qr") return;
    const timer = setTimeout(() => setQrExpired(true), 10 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [currentStep, qrCodeUrl]);

  const handleRegenerateQR = async () => {
    setQrLoading(true);
    try {
      await regenerateQR();
      setQrExpired(false);
      toast.success("New QR code generated");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to regenerate QR");
    } finally {
      setQrLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtp(newOtp);
      setError("");
      const lastIndex = Math.min(digits.length, 6) - 1;
      if (lastIndex >= 0) inputRefs.current[Math.min(lastIndex, 5)]?.focus();
      if (newOtp.every((d) => d !== "")) {
        handleVerifyFirst(newOtp.join(""));
      }
      return;
    }

    if (value && !/^\d+$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d !== "") && newOtp.join("").length === 6) {
      handleVerifyFirst(newOtp.join(""));
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyFirst = async (otpCode: string) => {
    if (otpCode.length !== 6) return;

    try {
      const result = await verifyFirstOTP(otpCode);
      savedAuthResultRef.current = result;
      const codes = result.backupCodes || result.backup_codes || [];
      setBackupCodes(codes);
      setCurrentStep("backup_codes");
      toast.success("Authenticator verified! Please save your backup codes.");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Invalid OTP. Please try again.";
      setError(message);
      toast.error(message);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const copySecret = async (text: string = manualSecret || "") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Secret key copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const copyAllBackupCodes = async () => {
    if (!backupCodes.length) return;
    const formatted = `SOFIYA BANGLES - 2FA BACKUP RECOVERY CODES\nGenerated: ${new Date().toISOString()}\n\nEach code can be used ONCE if you lose access to Google Authenticator.\n\n${backupCodes.map((code, idx) => `${idx + 1}. ${code}`).join("\n")}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedBackupCodes(true);
      setTimeout(() => setCopiedBackupCodes(false), 2000);
      toast.success("Backup codes copied to clipboard!");
    } catch {
      toast.error("Failed to copy codes");
    }
  };

  const downloadBackupCodes = () => {
    if (!backupCodes.length) return;
    const content = `SOFIYA BANGLES - 2FA BACKUP RECOVERY CODES\nGenerated: ${new Date().toISOString()}\n\nImportant: Keep these codes confidential. Each code is single-use only.\n\n${backupCodes.map((code, idx) => `${idx + 1}. ${code}`).join("\n")}\n`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sofiya-bangles-backup-codes.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Backup codes downloaded!");
  };

  const handleFinishSetup = () => {
    if (!acknowledgedBackup) {
      toast.error("Please confirm you have safely saved your backup codes.");
      return;
    }
    if (savedAuthResultRef.current) {
      completeAuthentication(savedAuthResultRef.current);
    }
    toast.success("2FA setup finalized! Welcome.");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#FFF0F3] via-[#FFD6DE] to-[#FFB3C2] relative overflow-hidden items-center justify-center">
        <div className="relative z-10 text-center px-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="w-24 h-24 bg-white/80 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl"
          >
            {currentStep === "backup_codes" ? (
              <KeyRound className="w-12 h-12 text-[#E8436E]" />
            ) : (
              <Scan className="w-12 h-12 text-[#E8436E]" />
            )}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-[#7A0D3C] mb-4"
          >
            {currentStep === "backup_codes" ? "Save Recovery Codes" : "Set Up 2FA"}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-[#991A4D]"
          >
            {currentStep === "backup_codes" ? (
              <>
                Mandatory one-time backup codes.
                <br />
                Save them before proceeding.
              </>
            ) : (
              <>
                First-time setup requires
                <br />
                Google Authenticator
              </>
            )}
          </motion.p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Step indicator - 3-step flow */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                currentStep === "qr"
                  ? "bg-[#E8436E] text-white"
                  : "bg-[#22C55E] text-white"
              }`}
            >
              {currentStep !== "qr" ? "✓" : "1"}
            </div>
            <div className="w-8 h-0.5 bg-[#E5E5E5] rounded-full" />
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                currentStep === "verify"
                  ? "bg-[#E8436E] text-white"
                  : currentStep === "backup_codes"
                  ? "bg-[#22C55E] text-white"
                  : "bg-[#E5E5E5] text-[#A3A3A3]"
              }`}
            >
              {currentStep === "backup_codes" ? "✓" : "2"}
            </div>
            <div className="w-8 h-0.5 bg-[#E5E5E5] rounded-full" />
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                currentStep === "backup_codes"
                  ? "bg-[#E8436E] text-white"
                  : "bg-[#E5E5E5] text-[#A3A3A3]"
              }`}
            >
              3
            </div>
          </div>

          {currentStep === "qr" && (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-[#171717] mb-2">
                  Scan QR Code
                </h2>
                <p className="text-[#737373]">
                  Open Google Authenticator and scan this QR code
                </p>
              </div>

              {/* Warnings Banner */}
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3.5 mb-6 text-left">
                <div className="flex gap-2.5">
                  <Info className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm text-[#1E3A8A] mb-0.5">
                      New Authenticator Setup
                    </h4>
                    <p className="text-xs text-[#1E40AF] leading-relaxed">
                      A new authenticator setup has been created for your account. Please scan this code in your Google Authenticator app.
                    </p>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-6">
                {qrCodeUrl ? (
                  <div className="qr-container">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring" }}
                      className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"
                    >
                      <img
                        src={qrCodeUrl}
                        alt="Google Authenticator QR Code"
                        className="w-56 h-56"
                      />
                    </motion.div>
                  </div>
                ) : (
                  <div className="w-56 h-56 bg-[#F5F5F5] rounded-2xl flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[#A3A3A3] animate-spin" />
                  </div>
                )}
              </div>

              {/* Manual entry option */}
              <div className="text-center mb-4">
                <p className="text-sm text-[#A3A3A3] mb-2">
                  Can&apos;t scan? Set up manually with the secret key
                </p>
                <button
                  onClick={() => setShowManual(!showManual)}
                  className="inline-flex items-center gap-1.5 text-sm text-[#E8436E] hover:text-[#CC3366] font-medium transition-colors"
                >
                  {showManual ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {showManual ? "Hide manual setup" : "Manual setup"}
                </button>
              </div>

              {/* Manual Setup Section */}
              <AnimatePresence>
                {showManual && manualSecret && (
                  <motion.div
                    key="manual-setup"
                    initial={{ opacity: 0, maxHeight: 0 }}
                    animate={{ opacity: 1, maxHeight: 500 }}
                    exit={{ opacity: 0, maxHeight: 0 }}
                    className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 mb-6 overflow-hidden"
                  >
                    <h3 className="font-semibold text-[#171717] mb-3 text-sm">
                      Manual Setup Instructions
                    </h3>
                    <ol className="text-xs text-[#525252] space-y-1.5 mb-4 list-decimal list-inside">
                      <li>Open <strong>Google Authenticator</strong> app</li>
                      <li>Tap the <strong>+</strong> button to add a new account</li>
                      <li>Select <strong>Enter a setup key</strong></li>
                      <li>Paste or type the secret key below</li>
                      <li>Account: <strong>Sofiya Bangles</strong></li>
                      <li>Key type: <strong>Time-based</strong></li>
                    </ol>
                    <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-lg p-3 mb-2">
                      <code className="flex-1 text-xs font-mono text-[#171717] break-all select-all">
                        {manualSecret}
                      </code>
                      <button
                        onClick={() => copySecret(manualSecret)}
                        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors"
                        title="Copy secret key"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-[#64748B]" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {qrExpired && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <p className="text-sm text-amber-700">
                    QR code expired. Generate a new one.
                  </p>
                </motion.div>
              )}

              <button
                onClick={handleRegenerateQR}
                disabled={qrLoading}
                className="w-full gradient-primary text-white font-semibold py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#E8436E]/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {qrLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    {qrExpired ? "Generate New QR Code" : "Regenerate QR Code"}
                  </>
                )}
              </button>

              <button
                onClick={() => setCurrentStep("verify")}
                className="w-full mt-3 text-[#A3A3A3] hover:text-[#525252] font-medium py-2 transition-colors text-sm"
              >
                I&apos;ve scanned the code →
              </button>
            </>
          )}

          {currentStep === "verify" && (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-[#171717] mb-2">
                  Verify OTP
                </h2>
                <p className="text-[#737373]">
                  Enter the 6-digit code from Google Authenticator to confirm
                  setup
                </p>
              </div>

              {/* OTP Input */}
              <div className="flex justify-center gap-3 mb-6">
                {otp.map((digit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <input
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={index === 0 ? 6 : 1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className={`otp-input ${digit ? "filled" : ""}`}
                      autoComplete="one-time-code"
                    />
                  </motion.div>
                ))}
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-sm text-red-500 mb-4"
                >
                  {error}
                </motion.p>
              )}

              <button
                onClick={() => {
                  const code = otp.join("");
                  if (code.length === 6) handleVerifyFirst(code);
                }}
                disabled={isLoading || otp.join("").length !== 6}
                className="w-full gradient-primary text-white font-semibold py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#E8436E]/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Verify Authenticator Code
                  </>
                )}
              </button>

              <button
                onClick={() => setCurrentStep("qr")}
                className="w-full mt-3 text-[#A3A3A3] hover:text-[#525252] font-medium py-2 transition-colors text-sm"
              >
                ← Back to QR code
              </button>
            </>
          )}

          {currentStep === "backup_codes" && (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-rose-50 text-[#E8436E] rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-[#171717] mb-1">
                  Backup Recovery Codes
                </h2>
                <p className="text-xs text-[#737373]">
                  Save these 10 one-time recovery codes now. They will{" "}
                  <strong className="text-red-600">NEVER</strong> be displayed again!
                </p>
              </div>

              {/* Warning Alert */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-5 flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  If you lose your device or cannot access Google Authenticator, each backup code can be used <strong>once</strong> to sign in to your SuperAdmin account.
                </p>
              </div>

              {/* Backup Codes Grid: 2 columns of 5 */}
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-4 mb-4">
                <div className="grid grid-cols-2 gap-2.5">
                  {backupCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200/80 rounded-xl px-3 py-2 flex items-center justify-between"
                    >
                      <span className="text-[10px] font-bold text-slate-400">
                        {idx + 1}.
                      </span>
                      <span className="font-mono text-xs font-bold tracking-wider text-slate-800 select-all">
                        {code}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Copy All & Download */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  onClick={copyAllBackupCodes}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
                >
                  {copiedBackupCodes ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copy All Codes</span>
                    </>
                  )}
                </button>

                <button
                  onClick={downloadBackupCodes}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>Download .txt</span>
                </button>
              </div>

              {/* Mandatory Checkbox Acknowledgment */}
              <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer mb-5 hover:bg-slate-100/80 transition">
                <input
                  type="checkbox"
                  checked={acknowledgedBackup}
                  onChange={(e) => setAcknowledgedBackup(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#E8436E] focus:ring-[#E8436E]"
                />
                <span className="text-xs text-slate-700 font-medium leading-relaxed">
                  I have securely saved these 10 recovery codes. I understand that each code is single-use and cannot be retrieved later.
                </span>
              </label>

              {/* Finish Setup Button */}
              <button
                onClick={handleFinishSetup}
                disabled={!acknowledgedBackup}
                className="w-full gradient-primary text-white font-semibold py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#E8436E]/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Continue to Dashboard
              </button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
