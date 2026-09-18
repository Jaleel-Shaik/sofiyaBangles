import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { StepProgress } from "./StepProgress";
import { STRINGS } from "@/src/constants/strings";

export interface BackupCodesStepProps {
  codes: string[];
  onFinish: () => void;
  loading: boolean;
}

export const BackupCodesStep: React.FC<BackupCodesStepProps> = ({
  codes,
  onFinish,
  loading,
}) => {
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallScreen = screenHeight < 600;

  const handleCopyAll = async () => {
    if (!codes.length) return;
    const formatted = `SOFIYA BANGLES - 2FA BACKUP RECOVERY CODES\nGenerated: ${new Date().toISOString()}\n\nEach code is single-use only:\n\n${codes.map((c, i) => `${i + 1}. ${c}`).join("\n")}`;
    try {
      await Clipboard.setStringAsync(formatted);
      setCopied(true);
      if (Platform.OS !== "web") {
        const Haptics = await import("expo-haptics");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setTimeout(() => setCopied(false), 2500);
    } catch {
      Alert.alert("Error", "Failed to copy backup codes.");
    }
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: isSmallScreen ? 12 : 24,
          paddingBottom: Math.max(insets.bottom + 16, 24),
        }}
        showsVerticalScrollIndicator={false}
      >
        <StepProgress current={1} total={2} />

        {/* Hero Header */}
        <View className="items-center mb-5">
          <View className="w-20 h-20 bg-white rounded-3xl items-center justify-center border border-slate-100 shadow-sm mb-3">
            <View className="w-14 h-14 bg-rose-50 rounded-2xl items-center justify-center">
              <Ionicons name="shield-checkmark" size={30} color="#e11d48" />
            </View>
          </View>
          <Text className="text-2xl font-black text-slate-900 text-center tracking-tight">
            {STRINGS.auth.backupCodes.title}
          </Text>
          <Text className="text-xs text-slate-500 text-center px-4 leading-relaxed mt-1 max-w-[300px]">
            {STRINGS.auth.backupCodes.subtitle}
          </Text>
        </View>

        {/* Warning card */}
        <View className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 mb-4 flex-row items-start gap-2.5">
          <Ionicons name="warning-outline" size={18} color="#d97706" style={{ marginTop: 1 }} />
          <Text className="text-amber-800 text-xs flex-1 leading-relaxed">
            {STRINGS.auth.backupCodes.warning}
          </Text>
        </View>

        {/* 2-column grid */}
        <View className="bg-white rounded-3xl p-4 shadow-sm mb-4 border border-slate-100">
          <View className="flex-row flex-wrap justify-between">
            {codes.map((code, idx) => (
              <View
                key={idx}
                className="w-[48%] bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 mb-2 flex-row items-center justify-between"
              >
                <Text className="text-[10px] font-bold text-slate-400">{idx + 1}.</Text>
                <Text className="font-mono text-xs font-bold text-slate-800 tracking-wider">
                  {code}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Copy All button */}
        <TouchableOpacity
          onPress={handleCopyAll}
          activeOpacity={0.8}
          className={`py-3 px-4 rounded-2xl border mb-4 flex-row items-center justify-center gap-2 ${
            copied ? "bg-emerald-50 border-emerald-300" : "bg-white border-slate-200"
          }`}
        >
          <Ionicons
            name={copied ? "checkmark-circle" : "copy-outline"}
            size={18}
            color={copied ? "#16a34a" : "#e11d48"}
          />
          <Text className={`text-xs font-bold ${copied ? "text-emerald-700" : "text-primary"}`}>
            {copied ? STRINGS.auth.backupCodes.copiedAll : STRINGS.auth.backupCodes.copyAll}
          </Text>
        </TouchableOpacity>

        {/* Acknowledgment Checkbox */}
        <TouchableOpacity
          onPress={() => setAcknowledged(!acknowledged)}
          className="flex-row items-start gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 mb-5"
          activeOpacity={0.8}
        >
          <View
            className={`w-5 h-5 rounded-md border items-center justify-center mt-0.5 ${
              acknowledged ? "bg-primary border-primary" : "border-slate-300 bg-slate-50"
            }`}
          >
            {acknowledged && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text className="text-xs text-slate-700 font-medium flex-1 leading-relaxed">
            {STRINGS.auth.backupCodes.confirmCheckbox}
          </Text>
        </TouchableOpacity>

        {/* Continue to Dashboard Button */}
        <TouchableOpacity
          onPress={onFinish}
          disabled={!acknowledged || loading}
          activeOpacity={0.9}
          className={`h-14 rounded-2xl flex-row items-center justify-center shadow-sm ${
            !acknowledged || loading ? "bg-slate-200" : "bg-primary"
          }`}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <View className="flex-row items-center gap-2">
              <Text className="text-white font-bold text-base">
                {STRINGS.auth.backupCodes.continueToDashboard}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </View>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
};
