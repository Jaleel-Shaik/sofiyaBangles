import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  AppState,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { StepProgress } from "./StepProgress";
import { OTPDigitInput } from "./OTPDigitInput";
import { STRINGS } from "@/src/constants/strings";

export interface QRSetupProps {
  qrCodeUrl: string;
  manualSecret: string;
  qrExpired: boolean;
  countdown: number;
  setupOtpCode: string;
  setSetupOtpCode: (val: string) => void;
  loading: boolean;
  onVerify: () => void;
  onRegenerate: () => void;
  onCancel: () => void;
}

export const QRSetupStep: React.FC<QRSetupProps> = ({
  qrCodeUrl,
  manualSecret,
  qrExpired,
  countdown,
  setupOtpCode,
  setSetupOtpCode,
  loading,
  onVerify,
  onRegenerate,
  onCancel,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrSetupError, setQrSetupError] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [otpResetKey, setOtpResetKey] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallScreen = screenHeight < 600;

  // RFC 6238 Epoch-Synchronized TOTP 30-second Countdown Timer
  const [totpTimer, setTotpTimer] = useState<number>(() => {
    const epochSeconds = Math.floor(Date.now() / 1000);
    const rem = 30 - (epochSeconds % 30);
    return rem === 0 ? 30 : rem;
  });

  useEffect(() => {
    const syncTotp = () => {
      const epochSeconds = Math.floor(Date.now() / 1000);
      const rem = 30 - (epochSeconds % 30);
      setTotpTimer(rem === 0 ? 30 : rem);
    };

    syncTotp();
    const interval = setInterval(syncTotp, 500);

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        syncTotp();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!qrExpired && qrCodeUrl) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [qrExpired, qrCodeUrl, pulseAnim]);

  const groupedKey = manualSecret
    ? manualSecret.match(/.{1,4}/g)?.join(" ")
    : "";

  const prevSetupOtpCode = useRef(setupOtpCode);
  useEffect(() => {
    if (prevSetupOtpCode.current && !setupOtpCode) {
      setOtpResetKey((prev) => prev + 1);
    }
    prevSetupOtpCode.current = setupOtpCode;
  }, [setupOtpCode]);

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: isSmallScreen ? 12 : 20,
          paddingBottom: Math.max(insets.bottom + 16, 24),
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={isSmallScreen ? 40 : 80}
        enableOnAndroid
      >
        <StepProgress current={0} total={2} />

        {/* Top Header Row */}
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity
            onPress={onCancel}
            className="w-10 h-10 bg-white rounded-full items-center justify-center border border-slate-200/80 shadow-xs active:bg-slate-50"
          >
            <Ionicons name="close" size={20} color="#0f172a" />
          </TouchableOpacity>

          <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/60">
            <View className="w-2 h-2 rounded-full bg-primary" />
            <Text className="text-[11px] font-bold text-primary uppercase tracking-wider">
              {STRINGS.auth.qrSetup.badge}
            </Text>
          </View>

          <View className="w-10" />
        </View>

        {/* Header Hero */}
        <View className="items-center mb-5">
          <View className="w-20 h-20 bg-white rounded-3xl items-center justify-center border border-slate-100 shadow-sm mb-3">
            <View className="w-14 h-14 bg-rose-50 rounded-2xl items-center justify-center">
              <Ionicons name="key-outline" size={28} color="#e11d48" />
            </View>
          </View>
          <Text className="text-2xl font-black text-slate-900 text-center tracking-tight">
            {STRINGS.auth.qrSetup.title}
          </Text>
          <Text className="text-xs text-slate-500 text-center mt-1 px-4 leading-relaxed max-w-[300px]">
            {STRINGS.auth.qrSetup.subtitle}
          </Text>
        </View>

        {/* QR Code Card */}
        <View className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-4 items-center">
          {qrExpired ? (
            <View className="py-8 items-center justify-center">
              <View className="w-14 h-14 bg-rose-50 rounded-2xl items-center justify-center mb-3">
                <Ionicons name="time-outline" size={28} color="#e11d48" />
              </View>
              <Text className="text-slate-900 font-bold text-base">
                {STRINGS.auth.qrSetup.expiredTitle}
              </Text>
              <Text className="text-slate-500 text-xs text-center mt-1 px-4 leading-relaxed">
                {STRINGS.auth.qrSetup.expiredSubtitle}
              </Text>
              <TouchableOpacity
                onPress={onRegenerate}
                className="mt-4 px-4 py-2.5 bg-rose-50 rounded-xl flex-row items-center gap-2 border border-rose-200"
              >
                <Ionicons name="refresh-outline" size={16} color="#e11d48" />
                <Text className="text-primary font-bold text-xs">
                  {STRINGS.auth.qrSetup.regenerate}
                </Text>
              </TouchableOpacity>
            </View>
          ) : qrCodeUrl ? (
            <View className="items-center w-full">
              <Animated.View style={{ opacity: pulseAnim }} className="p-3 bg-white rounded-2xl border border-slate-100 shadow-xs">
                <Image
                  source={{ uri: qrCodeUrl }}
                  className={isSmallScreen ? "w-40 h-40" : "w-48 h-48"}
                  resizeMode="contain"
                />
              </Animated.View>

              <View className="flex-row items-center mt-3 gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-100">
                <Ionicons name="timer-outline" size={13} color="#e11d48" />
                <Text className="text-slate-500 text-xs font-medium">
                  Expires in{" "}
                  <Text className="font-bold text-primary font-mono">
                    {Math.floor(countdown / 60)}:
                    {(countdown % 60).toString().padStart(2, "0")}
                  </Text>
                </Text>
              </View>

              <View className="flex-row items-center mt-3 gap-2 bg-amber-50 rounded-2xl px-3.5 py-2.5 border border-amber-200/60 w-full">
                <Ionicons name="scan-outline" size={16} color="#d97706" />
                <Text className="text-amber-800 text-xs flex-1 leading-relaxed">
                  Open Google Authenticator → tap <Text className="font-bold">+</Text> → scan this code
                </Text>
              </View>
            </View>
          ) : (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="large" color="#e11d48" />
            </View>
          )}
        </View>

        {/* Secret Key Accordion */}
        <View className="bg-white rounded-2xl shadow-xs mb-4 border border-slate-100 overflow-hidden">
          <TouchableOpacity
            onPress={() => setShowKey(!showKey)}
            activeOpacity={0.7}
            className="flex-row items-center justify-between px-4 py-3"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="key-outline" size={16} color="#e11d48" />
              <Text className="text-slate-800 font-bold text-xs">
                {STRINGS.auth.qrSetup.secretKeyLabel}
              </Text>
            </View>
            <Ionicons
              name={showKey ? "chevron-up" : "chevron-down"}
              size={16}
              color="#94a3b8"
            />
          </TouchableOpacity>

          {showKey && manualSecret && (
            <View className="px-4 pb-3">
              <View className="flex-row items-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <View className="flex-1 px-3 py-2.5">
                  <Text
                    selectable
                    className="text-xs font-mono font-bold text-slate-800 tracking-wider"
                  >
                    {groupedKey}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    if (!manualSecret) return;
                    try {
                      await Clipboard.setStringAsync(manualSecret);
                      setCopied(true);
                      if (Platform.OS !== "web") {
                        const Haptics = await import("expo-haptics");
                        await Haptics.notificationAsync(
                          Haptics.NotificationFeedbackType.Success,
                        );
                      }
                      setTimeout(() => setCopied(false), 2000);
                    } catch {}
                  }}
                  className={`px-3 py-2.5 ${copied ? "bg-emerald-50" : "bg-rose-50"} active:opacity-70`}
                >
                  <View className="flex-row items-center gap-1">
                    <Ionicons
                      name={copied ? "checkmark-circle" : "copy-outline"}
                      size={14}
                      color={copied ? "#16a34a" : "#e11d48"}
                    />
                    <Text
                      className={`text-xs font-bold ${copied ? "text-emerald-600" : "text-primary"}`}
                    >
                      {copied ? "Copied" : "Copy"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Step 2: Verification Input Card */}
        <View className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-4">
          <Text className="text-sm font-bold text-slate-900 text-center mb-1">
            {STRINGS.auth.qrSetup.enterCodeTitle}
          </Text>
          <Text className="text-xs text-slate-500 text-center mb-4">
            {STRINGS.auth.qrSetup.enterCodeSubtitle}
          </Text>

          <OTPDigitInput
            key={`setup-otp-${otpResetKey}`}
            value={setupOtpCode}
            onChange={setSetupOtpCode}
            onComplete={onVerify}
            error={qrSetupError}
            setError={(msg) => {
              if (!msg) setQrSetupError("");
            }}
            disabled={loading}
          />

          {/* Synchronized 30s TOTP Countdown Pill */}
          <View
            className={`flex-row items-center justify-center gap-1.5 py-1.5 px-3.5 rounded-full self-center mt-4 ${
              totpTimer <= 5
                ? "bg-amber-50 border border-amber-200"
                : "bg-slate-50 border border-slate-100"
            }`}
          >
            <Ionicons
              name={totpTimer <= 5 ? "warning-outline" : "time-outline"}
              size={13}
              color={totpTimer <= 5 ? "#d97706" : "#e11d48"}
            />
            <Text
              className={`text-xs font-medium ${
                totpTimer <= 5 ? "text-amber-700 font-semibold" : "text-slate-500"
              }`}
            >
              {totpTimer <= 5
                ? STRINGS.auth.qrSetup.rotatingSoon(totpTimer)
                : STRINGS.auth.qrSetup.refreshesIn(totpTimer)}
            </Text>
          </View>

          {qrSetupError ? (
            <View className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 mt-3 flex-row items-center gap-2">
              <Ionicons name="alert-circle" size={16} color="#dc2626" />
              <Text className="text-red-600 text-xs flex-1 leading-5 font-medium">
                {qrSetupError}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Verify Action Button */}
        <TouchableOpacity
          onPress={onVerify}
          disabled={loading || setupOtpCode.length !== 6}
          activeOpacity={0.9}
          className={`h-14 rounded-2xl flex-row items-center justify-center shadow-sm ${
            loading || setupOtpCode.length !== 6 ? "bg-slate-200" : "bg-primary"
          }`}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <View className="flex-row items-center gap-2">
              <Ionicons name="shield-checkmark" size={18} color="white" />
              <Text className="text-white font-bold text-base">
                {STRINGS.auth.qrSetup.verifyAndActivate}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Cancel Action */}
        <TouchableOpacity
          onPress={onCancel}
          activeOpacity={0.7}
          className="mt-3 py-2.5 items-center"
        >
          <Text className="text-slate-400 font-semibold text-xs">
            {STRINGS.auth.qrSetup.cancel}
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
};
