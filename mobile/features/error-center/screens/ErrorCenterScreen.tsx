import { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import { useAuthStore } from "@/src/store/authStore";
import { useErrorLogStore, LoggedError } from "../store/errorLogStore";
import { TYPE_META, getGuidance, getRoleBanner, getRoleLabel, ErrorRole } from "../lib/guidance";
import { getCachedApiBaseUrl, getCachedApiSource } from "@/src/api/config";
import { classifyApiError } from "@/src/api/errors";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

function computeStats(errors: LoggedError[]) {
  const counts: Record<string, number> = {};
  let server = 0;
  let auth = 0;
  for (const e of errors) {
    counts[e.type] = (counts[e.type] || 0) + 1;
    if (e.type === "SERVER" || e.statusCode && e.statusCode >= 500) server++;
    if (e.type === "UNAUTHORIZED" || e.type === "FORBIDDEN") auth++;
  }
  return { total: errors.length, counts, server, auth };
}

export default function ErrorCenterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const role = (user?.role ?? "guest") as ErrorRole;

  const { errors, clearErrors } = useErrorLogStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "failed" | null>(null);
  const [testMessage, setTestMessage] = useState("");

  const stats = useMemo(() => computeStats(errors), [errors]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestMessage("");
    try {
      const res = await axios.get(`${getCachedApiBaseUrl()}/products?page=1&limit=1`, {
        timeout: 8000,
      });
      setTestResult("success");
      setTestMessage(`Connected — server responded with status ${res.status}.`);
    } catch (error: any) {
      const classified = classifyApiError(error);
      setTestResult("failed");
      setTestMessage(`${classified.title}: ${classified.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleClear = () => {
    clearErrors();
    setExpandedId(null);
    setTestResult(null);
  };

  const statCards = [
    { label: "Total", value: stats.total, icon: "list-outline", color: "#64748b", bg: "bg-slate-100" },
    { label: "Network", value: (stats.counts.NETWORK || 0) + (stats.counts.OFFLINE || 0), icon: "cloud-offline-outline", color: "#ef4444", bg: "bg-red-50" },
    { label: "Timeouts", value: stats.counts.TIMEOUT || 0, icon: "time-outline", color: "#f59e0b", bg: "bg-amber-50" },
    { label: "Server", value: stats.server, icon: "server-outline", color: "#dc2626", bg: "bg-red-50" },
    { label: "Session", value: stats.auth, icon: "lock-closed-outline", color: "#f97316", bg: "bg-orange-50" },
  ];

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View
        className="px-5 pb-6 bg-surface shadow-sm flex-row items-center border-b border-divider"
        style={{ paddingTop: Math.max(insets.top + 8, 40) }}
      >
        <TouchableOpacity
          className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-4"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-bold text-text-primary">Error Center</Text>
          <Text className="text-xs text-text-secondary mt-0.5">
            See what went wrong &amp; how to fix it
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Role banner */}
        <View className="bg-primary/5 border border-primary/15 rounded-2xl p-4 mb-5">
          <View className="flex-row items-center mb-1.5">
            <Ionicons name="information-circle-outline" size={16} color="#e11d48" />
            <Text className="text-xs font-bold text-primary ml-1.5 uppercase tracking-wide">
              Viewing as {getRoleLabel(role)}
            </Text>
          </View>
          <Text className="text-sm text-text-secondary leading-5">{getRoleBanner(role)}</Text>
        </View>

        {/* Server info */}
        <View className="bg-surface rounded-2xl border border-divider shadow-sm px-4 py-3 flex-row items-center mb-5">
          <Ionicons name="server-outline" size={16} color="#94a3b8" />
          <Text className="text-xs text-text-secondary ml-2 flex-1" numberOfLines={1}>
            Server: {getCachedApiBaseUrl()}
          </Text>
          <View className="bg-slate-100 rounded-full px-2.5 py-1">
            <Text className="text-[10px] font-bold text-slate-500 uppercase">
              {getCachedApiSource()}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5 -mx-5">
          <View className="flex-row gap-2.5 px-5">
            {statCards.map((s) => (
              <View
                key={s.label}
                className={`${s.bg} rounded-2xl px-4 py-3 min-w-[92px]`}
              >
                <Ionicons name={s.icon as any} size={18} color={s.color} />
                <Text className="text-2xl font-extrabold text-text-primary mt-1">{s.value}</Text>
                <Text className="text-[11px] font-semibold text-text-secondary">{s.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Actions */}
        <View className="flex-row gap-2.5 mb-5">
          <TouchableOpacity
            onPress={handleTest}
            disabled={testing}
            className="flex-1 bg-surface border border-divider rounded-2xl py-3 items-center flex-row justify-center"
          >
            {testing ? (
              <ActivityIndicator size="small" color="#e11d48" />
            ) : (
              <>
                <Ionicons name="pulse-outline" size={16} color="#e11d48" />
                <Text className="text-primary font-bold text-sm ml-1.5">Test Connection</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/server-settings" as any)}
            className="flex-1 bg-surface border border-divider rounded-2xl py-3 items-center flex-row justify-center"
          >
            <Ionicons name="settings-outline" size={16} color="#e11d48" />
            <Text className="text-primary font-bold text-sm ml-1.5">Server Settings</Text>
          </TouchableOpacity>
        </View>

        {testResult && (
          <View
            className={`rounded-2xl px-4 py-3 flex-row items-start mb-5 ${
              testResult === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            }`}
          >
            <Ionicons
              name={testResult === "success" ? "checkmark-circle" : "close-circle"}
              size={18}
              color={testResult === "success" ? "#22c55e" : "#ef4444"}
            />
            <Text
              className={`text-xs ml-2 flex-1 leading-4 ${
                testResult === "success" ? "text-green-700" : "text-red-700"
              }`}
            >
              {testMessage}
            </Text>
          </View>
        )}

        {/* Error list */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-base font-bold text-text-primary">Recent Issues</Text>
          {errors.length > 0 && (
            <TouchableOpacity onPress={handleClear} className="flex-row items-center">
              <Ionicons name="trash-outline" size={14} color="#94a3b8" />
              <Text className="text-xs font-semibold text-text-hint ml-1">Clear log</Text>
            </TouchableOpacity>
          )}
        </View>

        {errors.length === 0 ? (
          <View className="bg-surface rounded-2xl border border-divider py-12 items-center px-6">
            <Ionicons name="checkmark-circle-outline" size={44} color="#22c55e" />
            <Text className="text-base font-bold text-text-primary mt-3">No issues recorded</Text>
            <Text className="text-xs text-text-secondary text-center leading-5 mt-1.5">
              Every failed API call will show up here with a simple explanation and the fix.
              Use “Test Connection” to check the server right now.
            </Text>
          </View>
        ) : (
          errors.map((err) => {
            const meta = TYPE_META[err.type] ?? TYPE_META.UNKNOWN;
            const expanded = expandedId === err.id;
            const guidance = getGuidance(err.type, role);
            return (
              <View
                key={err.id}
                className="bg-surface rounded-2xl border border-divider shadow-sm mb-3 overflow-hidden"
              >
                <TouchableOpacity
                  onPress={() => setExpandedId(expanded ? null : err.id)}
                  className="p-4"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className={`${meta.badge} border rounded-full px-2.5 py-1 flex-row items-center`}>
                      <View className={`w-1.5 h-1.5 rounded-full ${meta.dot} mr-1.5`} />
                      <Text className={`text-[10px] font-bold uppercase ${meta.text}`}>
                        {meta.label}
                      </Text>
                      {err.statusCode ? (
                        <Text className={`text-[10px] font-bold ml-1.5 ${meta.text}`}>
                          HTTP {err.statusCode}
                        </Text>
                      ) : null}
                    </View>
                    <Text className="text-[11px] font-medium text-text-hint">{timeAgo(err.ts)}</Text>
                  </View>

                  <Text className="text-sm font-bold text-text-primary mb-1">{err.title}</Text>
                  <Text className="text-xs text-text-secondary leading-5" numberOfLines={expanded ? undefined : 2}>
                    {err.message}
                  </Text>

                  {err.url ? (
                    <Text className="text-[10px] text-text-hint mt-1.5" numberOfLines={1}>
                      {err.url}
                    </Text>
                  ) : null}

                  <View className="flex-row items-center mt-2">
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={14}
                      color="#94a3b8"
                    />
                    <Text className="text-[11px] font-semibold text-text-hint ml-1">
                      {expanded ? "Hide explanation" : "Why this happened & how to fix"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {expanded && (
                  <View className="border-t border-divider px-4 py-4 bg-slate-50">
                    <View className="flex-row items-start mb-3">
                      <Ionicons name="information-circle-outline" size={16} color="#e11d48" style={{ marginTop: 2 }} />
                      <View className="flex-1 ml-2">
                        <Text className="text-xs font-bold text-text-primary uppercase tracking-wide mb-1">
                          What happened
                        </Text>
                        <Text className="text-xs text-text-secondary leading-5">{guidance.what}</Text>
                      </View>
                    </View>

                    <View className="flex-row items-start mb-3">
                      <Ionicons name="help-circle-outline" size={16} color="#f59e0b" style={{ marginTop: 2 }} />
                      <View className="flex-1 ml-2">
                        <Text className="text-xs font-bold text-text-primary uppercase tracking-wide mb-1">
                          Why this happens
                        </Text>
                        <Text className="text-xs text-text-secondary leading-5">{guidance.why}</Text>
                      </View>
                    </View>

                    <View className="flex-row items-start">
                      <Ionicons name="construct-outline" size={16} color="#22c55e" style={{ marginTop: 2 }} />
                      <View className="flex-1 ml-2">
                        <Text className="text-xs font-bold text-text-primary uppercase tracking-wide mb-1">
                          What you can do
                        </Text>
                        {guidance.actions.map((action, idx) => (
                          <View key={idx} className="flex-row items-start mb-1">
                            <Text className="text-[10px] font-bold text-green-600 mr-1.5 mt-0.5">
                              {idx + 1}.
                            </Text>
                            <Text className="text-xs text-text-secondary leading-5 flex-1">{action}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {(role === "admin" || role === "super_admin") && (
                      <View className="bg-surface rounded-xl border border-divider px-3 py-2.5 mt-4">
                        <Text className="text-[10px] font-bold text-text-hint uppercase tracking-wide mb-1">
                          Technical details
                        </Text>
                        <Text className="text-[11px] text-slate-600 mb-1">
                          Type: {err.type}
                          {err.statusCode ? ` · Status: HTTP ${err.statusCode}` : ""}
                        </Text>
                        {err.technical ? (
                          <Text className="text-[11px] text-slate-600 mb-1">
                            Server message: {err.technical}
                          </Text>
                        ) : null}
                        {err.url ? (
                          <Text className="text-[11px] text-slate-600">
                            Endpoint: {err.url}
                          </Text>
                        ) : null}
                        <Text className="text-[11px] text-slate-600 mt-1">
                          Time: {new Date(err.ts).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
