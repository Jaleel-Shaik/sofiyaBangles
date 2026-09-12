import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Button from "@/src/components/Button";
import { StepProgress } from "./StepProgress";
import { OTPDigitInput } from "./OTPDigitInput";

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

  const otpResetKeyRef = useRef(0);
  const prevSetupOtpCode = useRef(setupOtpCode);

  useEffect(() => {
    if (prevSetupOtpCode.current && !setupOtpCode) {
      otpResetKeyRef.current += 1;
      setOtpResetKey(otpResetKeyRef.current);
    }
    prevSetupOtpCode.current = setupOtpCode;
  }, [setupOtpCode]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#FFF0F3" }}>
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: isSmallScreen ? 8 : 20,
          paddingBottom: insets.bottom + 16,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={isSmallScreen ? 40 : 80}
        enableOnAndroid
      >
        <StepProgress current={0} total={2} />

        {/* Header */}
        <View className="items-center mb-5">
          <View
            className={`${isSmallScreen ? "w-20 h-20" : "w-24 h-24"} bg-white rounded-2xl items-center justify-center shadow-md mb-3`}
            style={{
              shadowColor: "#FF1F4B",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
              transform: [{ rotate: "-3deg" }],
            }}
          >
            <View
              className={`${isSmallScreen ? "w-16 h-16" : "w-20 h-20"} bg-gradient-to-br from-[#FF1F4B]/10 to-[#FF1F4B]/5 rounded-2xl items-center justify-center`}
              style={{ transform: [{ rotate: "3deg" }] }}
            >
              <Ionicons
                name="key-outline"
                size={isSmallScreen ? 26 : 32}
                color="#FF1F4B"
              />
            </View>
          </View>
          <Text
            className={`${isSmallScreen ? "text-xl" : "text-2xl"} font-extrabold text-slate-800 text-center mb-1`}
            style={{ letterSpacing: -0.5 }}
          >
            Set up 2FA
          </Text>
          <Text className="text-slate-500 text-sm text-center leading-5 px-2">
            Link your account to Google Authenticator
          </Text>
        </View>

        {/* QR Code Card */}
        <View
          className="bg-white rounded-3xl items-center shadow-sm mb-3 border border-rose-100"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          {qrExpired ? (
            <View
              className={`${isSmallScreen ? "py-6" : "py-10"} items-center justify-center`}
            >
              <View className="w-14 h-14 bg-slate-50 rounded-full items-center justify-center mb-2">
                <Ionicons name="time-outline" size={28} color="#94a3b8" />
              </View>
              <Text className="text-slate-400 font-bold text-sm">
                Code Expired
              </Text>
              <Text className="text-slate-400 text-xs text-center mt-1 px-6 leading-4">
                Regenerate below to get a new QR code and secret key
              </Text>
            </View>
          ) : qrCodeUrl ? (
            <View
              className={`${isSmallScreen ? "pt-4 pb-3 px-5" : "pt-6 pb-4 px-6"} items-center`}
            >
              <Animated.View style={{ opacity: pulseAnim }}>
                <Image
                  source={{ uri: qrCodeUrl }}
                  className={`${isSmallScreen ? "w-36 h-36" : "w-48 h-48"}`}
                  resizeMode="contain"
                />
              </Animated.View>
              {!qrExpired && (
                <View className="flex-row items-center mt-3 gap-1.5 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                  <Ionicons name="timer-outline" size={12} color="#e11d48" />
                  <Text className="text-rose-500 text-xs font-bold">
                    {Math.floor(countdown / 60)}:
                    {(countdown % 60).toString().padStart(2, "0")}
                  </Text>
                </View>
              )}
              <View className="flex-row items-center mt-3 gap-2 bg-amber-50 rounded-xl px-3 py-2 border border-amber-200/60 w-full">
                <Ionicons name="scan-outline" size={14} color="#d97706" />
                <Text className="text-amber-700 text-xs flex-1 leading-4">
                  Open Google Authenticator →{" "}
                  <Text className="font-bold">+</Text> → scan code
                </Text>
              </View>

              {/* WARNING FOR ROTATED CODE */}
              <View className="flex-row items-start mt-2 gap-2 bg-blue-50 rounded-xl px-3 py-2.5 border border-blue-200/60 w-full">
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color="#2563eb"
                  style={{ marginTop: 1 }}
                />
                <View className="flex-1">
                  <Text className="text-blue-800 text-xs font-bold mb-0.5">
                    New Setup Generated
                  </Text>
                  <Text className="text-blue-700 text-[10px] leading-3.5">
                    Please remove any old entries for this account from Google Authenticator to avoid confusion. Only the newly scanned entry will work.
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View className="py-10 items-center justify-center">
              <Ionicons name="qr-code" size={48} color="#f1f5f9" />
            </View>
          )}
        </View>

        {/* Secret Key */}
        <View
          className="bg-white rounded-2xl shadow-sm mb-3 border border-rose-100 overflow-hidden"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <TouchableOpacity
            onPress={() => setShowKey(!showKey)}
            className="flex-row items-center justify-between px-4 py-3 active:opacity-70"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="key-outline" size={16} color="#e11d48" />
              <Text className="text-slate-700 font-bold text-sm">
                Secret Key
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
                <View className="flex-1 px-3 py-3">
                  <Text
                    selectable
                    className="text-sm font-mono text-slate-800 tracking-wider leading-5"
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
                  className={`px-3 py-3 ${copied ? "bg-emerald-50" : "bg-rose-50"} active:opacity-70`}
                >
                  <View className="flex-row items-center gap-1">
                    <Ionicons
                      name={copied ? "checkmark-circle" : "copy-outline"}
                      size={16}
                      color={copied ? "#16a34a" : "#e11d48"}
                    />
                    <Text
                      className={`text-xs font-bold ${copied ? "text-emerald-600" : "text-rose-600"}`}
                    >
                      {copied ? "Copied" : "Copy"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Regenerate button (only when expired) */}
        {qrExpired && (
          <Button
            title="Regenerate New Code"
            onPress={onRegenerate}
            loading={loading}
            variant="outline"
            className="mb-3 rounded-2xl"
            icon={<Ionicons name="refresh-outline" size={18} color="#e11d48" />}
            iconPosition="left"
            size="small"
          />
        )}

        {/* OTP Section */}
        <View className="mt-1 mb-2">
          <View className="flex-row items-center mb-3 gap-3">
            <View className="flex-1 h-px bg-rose-200" />
            <Text className="text-rose-400 text-xs font-bold uppercase tracking-widest">
              Step 2: Verify Code
            </Text>
            <View className="flex-1 h-px bg-rose-200" />
          </View>

          <View
            className="bg-white rounded-3xl px-5 pt-4 pb-5 shadow-sm mb-2"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <OTPDigitInput
              key={`setup-otp-${otpResetKey}`}
              initialDigits={["", "", "", "", "", ""]}
              onDigitsChange={(d) => setSetupOtpCode(d.join("").slice(0, 6))}
              onComplete={onVerify}
              error={qrSetupError}
              setError={(msg) => {
                if (!msg) setQrSetupError("");
              }}
              disabled={loading}
            />
            {qrSetupError ? (
              <View className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-3 flex-row items-start gap-2">
                <Ionicons
                  name="alert-circle"
                  size={14}
                  color="#dc2626"
                  style={{ marginTop: 2 }}
                />
                <Text className="text-red-600 text-xs flex-1 leading-5">
                  {qrSetupError}
                </Text>
              </View>
            ) : (
              <Text className="text-slate-400 text-xs text-center mt-2">
                Enter the 6-digit code shown in the app
              </Text>
            )}
          </View>
        </View>

        {/* Verify Button */}
        <Button
          title="Enable & Verify"
          onPress={onVerify}
          loading={loading}
          icon={<Ionicons name="shield-checkmark" size={20} color="#fff" />}
          iconPosition="left"
          disabled={loading}
          className="shadow-lg bg-[#FF1F4B] rounded-2xl h-14"
          style={{
            shadowColor: "#FF1F4B",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        />

        <TouchableOpacity
          onPress={onCancel}
          className="mt-4 mb-6 items-center py-2 active:opacity-60"
        >
          <Text className="text-slate-400 font-semibold text-sm">Cancel</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};
