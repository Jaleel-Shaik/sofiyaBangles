import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import {
  getCachedApiBaseUrl,
  getCachedApiSource,
  refreshApiClientConfig,
  saveApiUrlOverride,
  resetApiUrlOverride,
} from "@/src/api/config";
import { classifyApiError } from "@/src/api/errors";
import { apiClient } from "@/src/api/client";

type TestResult = "idle" | "testing" | "success" | "failed";

export default function ServerSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentUrl, setCurrentUrl] = useState(getCachedApiBaseUrl());
  const [currentSource, setCurrentSource] = useState(getCachedApiSource());
  const [inputUrl, setInputUrl] = useState(getCachedApiBaseUrl());
  const [testResult, setTestResult] = useState<TestResult>("idle");
  const [testMessage, setTestMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const refreshDisplay = useCallback(async () => {
    const config = await refreshApiClientConfig();
    setCurrentUrl(config.url);
    setCurrentSource(config.source);
    setInputUrl(config.url);
    setTestResult("idle");
    setTestMessage("");
    // Point the shared axios client at the resolved URL.
    apiClient.defaults.baseURL = config.url;
  }, []);

  const handleTest = async () => {
    const url = inputUrl.trim().replace(/\/+$/, "");
    if (!url) {
      setTestResult("failed");
      setTestMessage("Please enter a server URL first.");
      return;
    }
    setTestResult("testing");
    setTestMessage("");
    try {
      const res = await axios.get(`${url}/products?page=1&limit=1`, {
        timeout: 8000,
        headers: { "Content-Type": "application/json" },
      });
      setTestResult("success");
      setTestMessage(
        `Connected! Server responded with status ${res.status}.`
      );
    } catch (error: any) {
      const classified = classifyApiError(error, `${url}/products`);
      setTestResult("failed");
      setTestMessage(
        `${classified.title}: ${classified.message}${
          classified.statusCode ? ` (HTTP ${classified.statusCode})` : ""
        }`
      );
    }
  };

  const handleSave = async () => {
    const url = inputUrl.trim().replace(/\/+$/, "");
    if (!url) {
      setTestMessage("Please enter a server URL.");
      setTestResult("failed");
      return;
    }
    setSaving(true);
    setTestResult("idle");
    setTestMessage("");
    try {
      // Validate before persisting.
      await axios.get(`${url}/products?page=1&limit=1`, { timeout: 8000 });
      const saved = await saveApiUrlOverride(url);
      apiClient.defaults.baseURL = saved;
      setCurrentUrl(saved);
      setCurrentSource("override");
      setTestResult("success");
      setTestMessage("Server URL saved. Your app will use this address from now on.");
    } catch (error: any) {
      setTestResult("failed");
      const classified = classifyApiError(error, `${url}/products`);
      setTestMessage(
        `Connection check failed — nothing was saved. ${classified.title}: ${classified.message}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await resetApiUrlOverride();
      await refreshDisplay();
      setTestResult("success");
      setTestMessage("Reset to automatic detection. The app will now follow your current network.");
    } finally {
      setSaving(false);
    }
  };

  const sourceLabels: Record<string, string> = {
    override: "Manual override (saved on this device)",
    "auto-detect": "Auto-detected from your current network (recommended)",
    env: "EXPO_PUBLIC_API_URL from .env",
    default: "Platform default",
  };

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
          <Text className="text-xl font-bold text-text-primary">Server Connection</Text>
          <Text className="text-xs text-text-secondary mt-0.5">Fix API connectivity issues</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        <View className="bg-surface rounded-2xl border border-divider shadow-sm p-5 mb-6">
          <Text className="text-xs font-bold text-text-hint uppercase tracking-wider mb-2">
            Current Server URL
          </Text>
          <Text className="text-sm font-semibold text-text-primary mb-1">{currentUrl}</Text>
          <View className="flex-row items-center">
            <View
              className={`w-2 h-2 rounded-full mr-2 ${
                currentSource === "auto-detect" ? "bg-green-500" : "bg-sky-500"
              }`}
            />
            <Text className="text-xs text-text-secondary">
              {sourceLabels[currentSource] || currentSource}
            </Text>
          </View>
        </View>

        <View className="bg-surface rounded-2xl border border-divider shadow-sm p-5 mb-4">
          <Text className="text-base font-bold text-text-primary mb-1">Server Address</Text>
          <Text className="text-xs text-text-secondary mb-3">
            When you change WiFi / place, the computer's IP changes and this app cannot reach the
            backend. Enter the new address of the machine running the backend here.
          </Text>

          <TextInput
            value={inputUrl}
            onChangeText={setInputUrl}
            placeholder="http://192.168.1.5:5000/api"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            className="bg-slate-50 border border-divider rounded-2xl px-4 py-3.5 text-sm text-text-primary mb-3"
          />

          <View className="flex-row gap-2 mb-3">
            <TouchableOpacity
              onPress={handleTest}
              disabled={testResult === "testing" || saving}
              className="flex-1 bg-slate-100 rounded-2xl py-3 items-center flex-row justify-center"
            >
              {testResult === "testing" ? (
                <ActivityIndicator size="small" color="#64748b" />
              ) : (
                <>
                  <Ionicons name="pulse-outline" size={18} color="#64748b" />
                  <Text className="text-slate-700 font-bold text-sm ml-2">Test Connection</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {testResult === "success" && (
            <View className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex-row items-start mb-3">
              <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
              <Text className="text-xs text-green-700 ml-2 flex-1 leading-4">{testMessage}</Text>
            </View>
          )}
          {testResult === "failed" && (
            <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex-row items-start mb-3">
              <Ionicons name="close-circle" size={18} color="#ef4444" />
              <Text className="text-xs text-red-700 ml-2 flex-1 leading-4">{testMessage}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="bg-primary rounded-2xl py-3.5 items-center mb-2"
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-sm">Save & Use This URL</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleReset}
            disabled={saving}
            className="bg-primary/10 border border-primary/20 rounded-2xl py-3.5 items-center"
          >
            <Text className="text-primary font-bold text-sm">Reset to Automatic</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <Text className="text-sm font-bold text-amber-800 mb-2 flex-row items-center">
            <Ionicons name="bulb-outline" size={16} color="#b45309" /> How to find the server address
          </Text>
          <Text className="text-xs text-amber-700 leading-5 mb-1">
            1. Make sure the phone and the computer running the backend are on the same WiFi.
          </Text>
          <Text className="text-xs text-amber-700 leading-5 mb-1">
            2. On Windows run <Text className="font-bold">ipconfig</Text> (look for IPv4 Address).
            On macOS run <Text className="font-bold">ifconfig</Text>.
          </Text>
          <Text className="text-xs text-amber-700 leading-5">
            3. Build the URL like <Text className="font-bold">http://&lt;that-IP&gt;:5000/api</Text> and save it here.
          </Text>
        </View>

        <View className="bg-sky-50 border border-sky-200 rounded-2xl p-4">
          <Text className="text-sm font-bold text-sky-800 mb-1">
            <Ionicons name="sparkles-outline" size={16} color="#0369a1" /> Automatic detection
          </Text>
          <Text className="text-xs text-sky-700 leading-5">
            In development the app automatically uses your computer's current IP from the Expo
            dev server. You normally don't need to touch this screen — only open it when API calls
            fail after changing WiFi / place.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
