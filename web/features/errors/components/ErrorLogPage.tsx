"use client";

import { useSyncExternalStore, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  WifiOff,
  Clock,
  Server,
  Lock,
  ShieldAlert,
  HelpCircle,
  AlertCircle,
  Wifi,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  ListChecks,
  Activity,
} from "lucide-react";
import { useAuth } from "@/features/auth/lib/auth-context";
import { apiClient } from "@/src/lib/api";
import { formatIST } from "@/src/lib/dateUtils";
import { classifyApiError } from "../lib/classify";
import {
  getErrors,
  clearErrors,
  subscribe,
  LoggedError,
} from "../lib/error-log";
import { TYPE_META, getGuidance, getRoleBanner, ErrorRole } from "../lib/guidance";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

function computeStats(errors: LoggedError[]) {
  const counts: Record<string, number> = {};
  let server = 0;
  let auth = 0;
  for (const e of errors) {
    counts[e.type] = (counts[e.type] || 0) + 1;
    if (e.type === "SERVER" || (e.statusCode && e.statusCode >= 500)) server++;
    if (e.type === "UNAUTHORIZED" || e.type === "FORBIDDEN") auth++;
  }
  return { total: errors.length, counts, server, auth };
}

const STAT_META = [
  { key: "total", label: "Total", icon: ListChecks, color: "#64748b", bg: "bg-slate-100" },
  { key: "network", label: "Network", icon: WifiOff, color: "#ef4444", bg: "bg-red-50" },
  { key: "timeouts", label: "Timeouts", icon: Clock, color: "#f59e0b", bg: "bg-amber-50" },
  { key: "server", label: "Server", icon: Server, color: "#dc2626", bg: "bg-red-50" },
  { key: "session", label: "Session", icon: Lock, color: "#f97316", bg: "bg-orange-50" },
];

export default function ErrorLogPage() {
  const { user } = useAuth();
  const role = (user?.role === "super_admin" ? "super_admin" : "admin") as ErrorRole;

  const errors = useSyncExternalStore(subscribe, getErrors);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "failed" | null>(null);
  const [testMessage, setTestMessage] = useState("");

  const stats = useMemo(() => computeStats(errors), [errors]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    setTestMessage("");
    try {
      const res = await apiClient.get("/products", {
        params: { page: 1, limit: 1 },
        timeout: 8000,
      });
      setTestResult("success");
      setTestMessage(`Connected — the backend responded with status ${res.status}.`);
    } catch (error: any) {
      const classified = classifyApiError(error);
      setTestResult("failed");
      setTestMessage(`${classified.title}: ${classified.message}`);
    } finally {
      setTesting(false);
    }
  }, []);

  const handleClear = useCallback(() => {
    clearErrors();
    setExpandedId(null);
    setTestResult(null);
  }, []);

  const statValues: Record<string, number> = {
    total: stats.total,
    network: (stats.counts.NETWORK || 0) + (stats.counts.OFFLINE || 0),
    timeouts: stats.counts.TIMEOUT || 0,
    server: stats.server,
    session: stats.auth,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#171717]">Error Logs</h1>
          <p className="text-[#737373] mt-1">
            Every failed API call, explained with the cause and how to fix it
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={testing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E5E5E5] text-sm font-medium text-[#525252] hover:bg-[#F5F5F5] transition-colors disabled:opacity-60"
          >
            {testing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Activity className="w-4 h-4" />
            )}
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <button
            onClick={handleClear}
            disabled={errors.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E5E5E5] text-sm font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Clear Log
          </button>
        </div>
      </div>

      {/* Role banner */}
      <div className="bg-[#FFF0F3] border border-[#E8436E]/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-[#E8436E]" />
          <p className="text-xs font-bold text-[#E8436E] uppercase tracking-wide">
            Viewing as {role === "super_admin" ? "Super Admin" : "Admin"}
          </p>
        </div>
        <p className="text-sm text-[#525252]">{getRoleBanner(role)}</p>
      </div>

      {testResult && (
        <div
          className={`rounded-2xl px-4 py-3 flex items-start gap-2 ${
            testResult === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {testResult === "success" ? (
            <AlertCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          )}
          <p
            className={`text-sm ${
              testResult === "success" ? "text-green-700" : "text-red-700"
            }`}
          >
            {testMessage}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {STAT_META.map((s) => (
          <div
            key={s.key}
            className={`${s.bg} rounded-2xl p-4 border border-transparent`}
          >
            <s.icon className="w-5 h-5" style={{ color: s.color }} />
            <p className="text-2xl font-extrabold text-[#171717] mt-2">
              {statValues[s.key] ?? 0}
            </p>
            <p className="text-xs font-semibold text-[#737373]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Error list */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#171717]">Recent Issues</h2>
      </div>

      {errors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] py-16 flex flex-col items-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-base font-bold text-[#171717]">No issues recorded</p>
          <p className="text-sm text-[#A3A3A3] mt-2 max-w-md">
            Every failed API call will show up here with a simple explanation and
            the fix. Use “Test Connection” to check the backend right now.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {errors.map((err, idx) => {
            const meta = TYPE_META[err.type] ?? TYPE_META.UNKNOWN;
            const expanded = expandedId === err.id;
            const guidance = getGuidance(err.type);
            const Icon = (() => {
              const icons: Record<string, any> = {
                Clock,
                WifiOff,
                Wifi,
                Server,
                Lock,
                ShieldAlert,
                HelpCircle,
                AlertCircle,
              };
              return icons[meta.icon] ?? HelpCircle;
            })();

            return (
              <motion.div
                key={err.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : err.id)}
                  className="w-full text-left p-4 hover:bg-[#FAFAFA] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center gap-1.5 ${meta.badge} border rounded-full px-2.5 py-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      <span className={`text-[10px] font-bold uppercase ${meta.text}`}>
                        {meta.label}
                      </span>
                      {err.statusCode && (
                        <span className={`text-[10px] font-bold ${meta.text}`}>
                          HTTP {err.statusCode}
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] font-medium text-[#A3A3A3]">
                      {timeAgo(err.ts)}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-[#171717] mb-1">{err.title}</p>
                  <p className={`text-xs text-[#737373] ${expanded ? "" : "line-clamp-2"}`}>
                    {err.message}
                  </p>

                  {err.url && (
                    <p className="text-[10px] text-[#A3A3A3] mt-1.5 truncate">{err.url}</p>
                  )}

                  <div className="flex items-center gap-1 mt-2">
                    <Icon className="w-3.5 h-3.5 text-[#A3A3A3]" />
                    <span className="text-[11px] font-semibold text-[#A3A3A3]">
                      {expanded ? "Hide explanation" : "Why this happened & how to fix"}
                    </span>
                    {expanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[#A3A3A3]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#A3A3A3]" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-[#E5E5E5] bg-[#FAFAFA]"
                    >
                      <div className="p-4 grid gap-4 md:grid-cols-3">
                        <div className="md:col-span-1">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-[#E8436E] mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] font-bold text-[#171717] uppercase tracking-wide mb-1">
                                What happened
                              </p>
                              <p className="text-xs text-[#737373] leading-5">{guidance.what}</p>
                            </div>
                          </div>
                        </div>
                        <div className="md:col-span-1">
                          <div className="flex items-start gap-2">
                            <HelpCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] font-bold text-[#171717] uppercase tracking-wide mb-1">
                                Why this happens
                              </p>
                              <p className="text-xs text-[#737373] leading-5">{guidance.why}</p>
                            </div>
                          </div>
                        </div>
                        <div className="md:col-span-1">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] font-bold text-[#171717] uppercase tracking-wide mb-1">
                                What you can do
                              </p>
                              <ul className="space-y-1">
                                {guidance.actions.map((action, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="text-[10px] font-bold text-green-600 mt-0.5">
                                      {i + 1}.
                                    </span>
                                    <span className="text-xs text-[#737373] leading-5">{action}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      {role === "super_admin" && (
                        <div className="px-4 pb-4">
                          <div className="bg-white rounded-xl border border-[#E5E5E5] px-3 py-2.5">
                            <p className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-wide mb-1">
                              Technical details
                            </p>
                            <p className="text-[11px] text-[#525252] mb-1">
                              Type: {err.type}
                              {err.statusCode ? ` · Status: HTTP ${err.statusCode}` : ""}
                            </p>
                            {err.technical && (
                              <p className="text-[11px] text-[#525252] mb-1">
                                Server message: {err.technical}
                              </p>
                            )}
                            {err.url && (
                              <p className="text-[11px] text-[#525252]">Endpoint: {err.url}</p>
                            )}
                            <p className="text-[11px] text-[#525252] mt-1">
                              Time: {formatIST(new Date(err.ts))}
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
