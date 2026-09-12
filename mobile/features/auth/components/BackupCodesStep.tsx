import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Button from "@/src/components/Button";
import { StepProgress } from "./StepProgress";

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
        import("expo-haptics")
          .then((mod) => mod.notificationAsync(mod.NotificationFeedbackType.Success))
          .catch(() => {});
      }
      setTimeout(() => setCopied(false), 2500);
    } catch {
      Alert.alert("Error", "Failed to copy backup codes.");
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#FFF0F3" }}>
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: isSmallScreen ? 12 : 28,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <StepProgress current={2} total={2} />

        <View className="items-center mb-5">
          <View
            className="w-20 h-20 bg-white rounded-3xl items-center justify-center shadow-md mb-3"
            style={{
              shadowColor: "#FF1F4B",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <View className="w-16 h-16 bg-rose-50 rounded-2xl items-center justify-center">
              <Ionicons name="key" size={28} color="#FF1F4B" />
            </View>
          </View>
          <Text className="text-2xl font-extrabold text-slate-800 text-center mb-1">
            Save Recovery Codes
          </Text>
          <Text className="text-slate-500 text-xs text-center px-4 leading-5">
            Save these 10 recovery codes now. They will{" "}
            <Text className="text-red-500 font-bold">NEVER</Text> be displayed again!
          </Text>
        </View>

        {/* Warning card */}
        <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-4 flex-row items-start gap-2.5">
          <Ionicons name="warning-outline" size={18} color="#d97706" style={{ marginTop: 1 }} />
          <Text className="text-amber-800 text-xs flex-1 leading-5">
            Each recovery code can only be used once if you lose access to Google Authenticator.
          </Text>
        </View>

        {/* 2-column grid */}
        <View className="bg-white rounded-3xl p-4 shadow-sm mb-4 border border-rose-100">
          <View className="flex-row flex-wrap justify-between">
            {codes.map((code, idx) => (
              <View
                key={idx}
                className="w-[48%] bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 mb-2 flex-row items-center justify-between"
              >
                <Text className="text-[10px] font-bold text-slate-400">{idx + 1}.</Text>
                <Text className="font-mono text-xs font-bold text-slate-800 select-all tracking-wider">
                  {code}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Copy All button */}
        <TouchableOpacity
          onPress={handleCopyAll}
          className={`py-3 px-4 rounded-xl border mb-4 flex-row items-center justify-center gap-2 ${
            copied ? "bg-emerald-50 border-emerald-300" : "bg-white border-rose-200"
          }`}
        >
          <Ionicons
            name={copied ? "checkmark-circle" : "copy-outline"}
            size={18}
            color={copied ? "#16a34a" : "#FF1F4B"}
          />
          <Text className={`text-xs font-bold ${copied ? "text-emerald-700" : "text-[#FF1F4B]"}`}>
            {copied ? "Codes Copied to Clipboard!" : "Copy All 10 Codes"}
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
              acknowledged ? "bg-[#FF1F4B] border-[#FF1F4B]" : "border-slate-300 bg-slate-50"
            }`}
          >
            {acknowledged && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text className="text-xs text-slate-700 font-medium flex-1 leading-5">
            I have securely saved these 10 recovery codes. I understand that each code is single-use and cannot be retrieved later.
          </Text>
        </TouchableOpacity>

        {/* Continue to Dashboard Button */}
        <Button
          title="Continue to Dashboard"
          onPress={onFinish}
          disabled={!acknowledged || loading}
          loading={loading}
          icon={<Ionicons name="arrow-forward" size={20} color="#fff" />}
          iconPosition="right"
          className="shadow-lg bg-[#FF1F4B] rounded-[18px] h-14"
          style={{
            shadowColor: "#FF1F4B",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.28,
            shadowRadius: 10,
            elevation: 8,
          }}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};
