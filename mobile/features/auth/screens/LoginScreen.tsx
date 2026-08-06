import {
  View,
  Text,
  Alert,
  Platform,
  TouchableOpacity,
  Image,
  TextInput,
  Animated,
  Vibration,
  Keyboard,
  useWindowDimensions,
} from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import TextInputField from "@/src/components/TextInputField";
import Button from "@/src/components/Button";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useAuthStore } from "@/src/store/authStore";
import {
  firebaseLoginWithToken,
  loginWith2FA,
  verify2FAOtp,
  register as registerApi,
} from "@/src/api/auth";
import { apiClient } from "@/src/api/client";
import {
  getAuth,
  signInWithEmailAndPassword,
  getIdToken,
} from "@react-native-firebase/auth";
import * as SecureStore from "expo-secure-store";
import * as Clipboard from "expo-clipboard";
import { getDashboardHref } from "@/src/utils/navigation";
import SuperAdminRestriction from "@/src/components/SuperAdminRestriction";

interface OTPVerifyProps {
  otpCode: string;
  setOtpCode: (val: string) => void;
  otpError: string;
  setOtpError: (val: string) => void;
  loading: boolean;
  onVerify: () => void;
  onBack: () => void;
  otpTimer: number;
}

interface QRSetupProps {
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

const StepProgress = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => (
  <View className="flex-row items-center justify-center gap-2 mb-6">
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        className={`h-1.5 rounded-full transition-all ${i < current ? "w-8 bg-[#FF1F4B]" : i === current ? "w-8 bg-[#FF1F4B]" : "w-3 bg-rose-200"}`}
      />
    ))}
  </View>
);

// ─── OTP Digit Input Component ───────────────────────────
// Uses a hidden TextInput with a pressable overlay.
// Tapping anywhere on the container focuses the hidden input.
// The digit boxes are purely visual; all input goes through the TextInput.
const OTPDigitInput = ({
  initialDigits = ["", "", "", "", "", ""],
  onDigitsChange,
  onComplete,
  error,
  setError,
  disabled,
}: {
  initialDigits?: string[];
  onDigitsChange?: (digits: string[]) => void;
  onComplete?: () => void;
  error: string;
  setError: (e: string) => void;
  disabled: boolean;
}) => {
  const [localDigits, setLocalDigits] = useState<string[]>(() => [
    ...initialDigits,
  ]);
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const isCompleteRef = useRef(false);
  const previousErrorRef = useRef(error);
  const [isFocused, setIsFocused] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setLocalDigits([...initialDigits]);
    isCompleteRef.current = false;
  }, [initialDigits.join("")]);

  useEffect(() => {
    if (error && error !== previousErrorRef.current) {
      previousErrorRef.current = error;
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 8,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -8,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
      if (Platform.OS !== "web") Vibration.vibrate(100);
    }
    previousErrorRef.current = error;
  }, [error]);

  useEffect(() => {
    if (!disabled) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [disabled]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const notifyParent = (digits: string[]) => {
    onDigitsChange?.(digits);
  };

  const handleTextChange = (text: string) => {
    if (disabled) return;
    setError("");
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 6);
    const newDigits = cleaned
      .split("")
      .concat(["", "", "", "", "", ""])
      .slice(0, 6);
    setLocalDigits(newDigits);
    notifyParent(newDigits);
    if (cleaned.length === 6) {
      Keyboard.dismiss();
      if (Platform.OS !== "web") {
        import("expo-haptics")
          .then((mod) =>
            mod.notificationAsync(mod.NotificationFeedbackType.Success),
          )
          .catch(() => {});
      }
      isCompleteRef.current = true;
      setTimeout(() => onCompleteRef.current?.(), 200);
    } else if (cleaned.length > 0) {
      if (Platform.OS !== "web") {
        import("expo-haptics")
          .then((mod) => mod.impactAsync(mod.ImpactFeedbackStyle.Light))
          .catch(() => {});
      }
    }
  };

  const handleClear = () => {
    const empty = ["", "", "", "", "", ""];
    setLocalDigits(empty);
    notifyParent(empty);
    isCompleteRef.current = false;
    if (inputRef.current) {
      inputRef.current.clear();
      inputRef.current.focus();
    }
  };

  const digitCount = localDigits.filter((d) => d !== "").length;

  return (
    <View>
      <TextInput
        ref={inputRef}
        value={localDigits.join("")}
        onChangeText={handleTextChange}
        keyboardType="number-pad"
        maxLength={6}
        editable={!disabled}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        placeholder="Enter 6-digit code"
        placeholderTextColor="#94a3b8"
        autoFocus={!disabled}
        returnKeyType="done"
        onSubmitEditing={() => onCompleteRef.current?.()}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-center text-lg font-semibold text-slate-800"
        style={{ fontSize: 18 }}
      />

      <TouchableOpacity
        activeOpacity={1}
        onPress={focusInput}
        className="relative"
      >
        <Animated.View
          style={{ transform: [{ translateX: shakeAnim }] }}
          pointerEvents="none"
          className="flex-row justify-center gap-2.5 mb-3"
        >
          {localDigits.map((digit, index) => {
            const isActiveSlot = index === digitCount && digitCount < 6;
            return (
              <View
                key={index}
                className={`w-12 h-14 rounded-xl border-2 items-center justify-center ${
                  error
                    ? "border-red-400 bg-red-50"
                    : isActiveSlot && isFocused
                      ? "border-[#FF1F4B] bg-rose-50 shadow-md"
                      : digit
                        ? "border-[#FF1F4B] bg-rose-50"
                        : isFocused && digitCount === 0 && index === 0
                          ? "border-[#FF1F4B] bg-rose-50/30"
                          : "border-rose-200 bg-white"
                } shadow-sm`}
              >
                {digit ? (
                  <Text
                    className={`text-xl font-bold ${
                      error ? "text-red-600" : "text-slate-800"
                    }`}
                  >
                    {digit}
                  </Text>
                ) : isActiveSlot && isFocused ? (
                  <View className="w-0.5 h-6 bg-[#FF1F4B] rounded-full" />
                ) : (
                  <Text className="text-lg text-slate-300">•</Text>
                )}
              </View>
            );
          })}
        </Animated.View>
        {localDigits.some((d) => d !== "") && !disabled && (
          <TouchableOpacity
            onPress={handleClear}
            className="self-center py-1 active:opacity-60"
          >
            <Text className="text-rose-400 text-xs font-medium">Clear</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
};

// ─── OTP Verify Step ─────────────────────────────────────
const OTPStep_Verify = ({
  otpCode,
  setOtpCode,
  otpError,
  setOtpError,
  loading,
  onVerify,
  onBack,
  otpTimer,
}: OTPVerifyProps) => {
  const initialDigits = otpCode.padEnd(6, "").split("").slice(0, 6);
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallScreen = screenHeight < 600;
  const [progressDots] = useState(() => {
    const opacity1 = new Animated.Value(1);
    const opacity2 = new Animated.Value(0.3);
    const opacity3 = new Animated.Value(0.3);
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity1, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity2, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity2, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity3, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity3, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity1, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    return [opacity1, opacity2, opacity3];
  });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#FFF0F3" }}>
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: isSmallScreen ? 12 : 32,
          paddingBottom: insets.bottom + 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        extraScrollHeight={isSmallScreen ? 40 : 80}
        enableOnAndroid
      >
        <TouchableOpacity
          onPress={onBack}
          className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm mb-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
          }}
        >
          <Ionicons name="chevron-back" size={22} color="#e11d48" />
        </TouchableOpacity>

        <View className={isSmallScreen ? "pb-2" : "pb-4"}>
          {/* Icon */}
          <View className="items-center mb-5">
            <View
              className={`${isSmallScreen ? "w-18 h-18" : "w-24 h-24"} bg-white rounded-[24px] items-center justify-center shadow-lg mb-4`}
              style={{
                shadowColor: "#FF1F4B",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.16,
                shadowRadius: 16,
                elevation: 10,
              }}
            >
              <View
                className={`${isSmallScreen ? "w-14 h-14" : "w-20 h-20"} bg-gradient-to-br from-[#FF1F4B]/15 to-[#FF1F4B]/5 rounded-[20px] items-center justify-center`}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={isSmallScreen ? 28 : 36}
                  color="#FF1F4B"
                />
              </View>
            </View>
          </View>

          <Text
            className={`${isSmallScreen ? "text-xl" : "text-2xl"} font-extrabold text-slate-800 text-center mb-2`}
            style={{ letterSpacing: -0.5 }}
          >
            Welcome back
          </Text>
          <Text className="text-slate-500 text-sm text-center mb-5 leading-5 px-4">
            Enter the 6-digit verification code from your authenticator app.
          </Text>

          {/* OTP Input */}
          <View
            className="bg-white rounded-[24px] px-5 pt-5 pb-5 shadow-sm mb-3"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <View className="items-center mb-3">
              <Text className="text-[11px] font-bold text-slate-400 tracking-[0.24em] uppercase">
                Authentication Code
              </Text>
            </View>
            <OTPDigitInput
              initialDigits={initialDigits}
              onDigitsChange={(d) => setOtpCode(d.join("").slice(0, 6))}
              onComplete={onVerify}
              error={otpError}
              setError={setOtpError}
              disabled={loading}
            />
            {otpError ? null : (
              <View className="flex-row items-center justify-center mt-3 gap-1.5">
                {progressDots.map((anim, i) => (
                  <Animated.View
                    key={i}
                    style={{ opacity: anim }}
                    className="w-1.5 h-1.5 rounded-full bg-rose-300"
                  />
                ))}
              </View>
            )}
          </View>

          {otpError ? (
            <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3 flex-row items-start gap-2.5">
              <Ionicons
                name="alert-circle"
                size={16}
                color="#dc2626"
                style={{ marginTop: 1 }}
              />
              <Text className="text-red-600 text-xs flex-1 leading-5">
                {otpError}
              </Text>
            </View>
          ) : null}

          {/* Timer */}
          <View className="flex-row items-center justify-center mb-4 gap-2 rounded-full bg-rose-50 px-3 py-2 self-center">
            <View className="w-6 h-6 bg-white rounded-full items-center justify-center shadow-sm">
              <Ionicons name="time-outline" size={13} color="#e11d48" />
            </View>
            <Text className="text-rose-500 text-xs font-semibold">
              Code refreshes in{" "}
              <Text className="font-extrabold">{otpTimer}s</Text>
            </Text>
          </View>

          {/* Verify Button */}
          <Button
            title="Verify & Sign In"
            onPress={onVerify}
            loading={loading}
            icon={<Ionicons name="shield-checkmark" size={20} color="#fff" />}
            iconPosition="left"
            disabled={loading}
            className="shadow-lg bg-[#FF1F4B] rounded-[18px] h-14"
            style={{
              shadowColor: "#FF1F4B",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.28,
              shadowRadius: 10,
              elevation: 8,
            }}
          />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const QRSetupStep = ({
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
}: QRSetupProps) => {
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
  }, [qrExpired, qrCodeUrl]);

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
                <Ionicons name="information-circle-outline" size={16} color="#2563eb" style={{ marginTop: 1 }} />
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
                      import("expo-haptics")
                        .then((mod) =>
                          mod.notificationAsync(
                            mod.NotificationFeedbackType.Success,
                          ),
                        )
                        .catch(() => {});
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

export default function LoginScreen() {
  const { login, set2faPending, clear2faPending, token, user, forceLogout } =
    useAuthStore();
  const { height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenHeight < 600;

  const [authStep, setAuthStep] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [otpCode, setOtpCode] = useState("");
  const [otpPendingToken, setOtpPendingToken] = useState("");
  const [otpError, setOtpError] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [manualSecret, setManualSecret] = useState("");
  const [setupOtpCode, setSetupOtpCode] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [qrExpired, setQrExpired] = useState(false);
  const [countdown, setCountdown] = useState(600);
  const [otpTimer, setOtpTimer] = useState(30);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [navigationReady, setNavigationReady] = useState(false);

  useEffect(() => {
    setNavigationReady(true);
  }, []);

  // Deferred navigation
  useEffect(() => {
    if (pendingRedirect && navigationReady) {
      router.replace(pendingRedirect as any);
      setPendingRedirect(null);
    }
  }, [pendingRedirect, navigationReady]);

  // Navigate by role after successful login
  const navigateAfterLogin = useCallback(() => {
    const { token: t, user: u } = useAuthStore.getState();
    if (!t || !u) return;
    if (u.role === "super_admin") {
      setShowSuperAdminModal(true);
      return;
    }
    const href = getDashboardHref(u, t);
    if (href !== "/login") {
      setPendingRedirect(href as string);
    }
  }, []);

  // Watch for login state changes to navigate
  useEffect(() => {
    if (token && user && authStep !== "login" && authStep !== "register") {
      navigateAfterLogin();
    }
  }, [token, user?.role]);

  // Check if a super_admin token was restored from storage
  useEffect(() => {
    const checkSuperAdmin = async () => {
      const storedUser = await SecureStore.getItemAsync("auth_user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.role === "super_admin") {
            setShowSuperAdminModal(true);
          }
        } catch {}
      }
    };
    checkSuperAdmin();
  }, []);

  const handleSuperAdminLogout = useCallback(async () => {
    setShowSuperAdminModal(false);
    await forceLogout();
    setAuthStep("login");
    setEmail("");
    setPassword("");
    setOtpCode("");
    setSetupOtpCode("");
    setQrCodeUrl("");
    setManualSecret("");
    setQrExpired(false);
    clear2faPending();
  }, [forceLogout, clear2faPending]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (authStep === "qr_setup" && qrCodeUrl) {
      setCountdown(600);
      timer = setInterval(() => {
        setCountdown((prev: number) => {
          if (prev <= 1) {
            if (timer) clearInterval(timer);
            setQrExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [authStep, qrCodeUrl]);

  // 30-second OTP refresh timer
  useEffect(() => {
    if (authStep !== "otp_verify") return;
    setOtpTimer(30);
    const otpTimerInterval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) return 30; // Reset to 30 when it hits 0
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(otpTimerInterval);
  }, [authStep]);

  const handleVerify2FA = async () => {
    if (loading) return;
    if (!otpCode.trim() || otpCode.length !== 6) {
      setOtpError("Please enter a 6-digit code.");
      return;
    }
    setOtpError("");
    setLoading(true);
    try {
      const result = await verify2FAOtp(otpPendingToken, otpCode);
      const responseData = result?.data || result;
      if (responseData?.access_token && responseData?.user) {
        const {
          user: u,
          access_token,
          refresh_token,
          session_id,
        } = responseData;
        if (session_id)
          await SecureStore.setItemAsync("session_id", session_id);
        await login(u, access_token, refresh_token);
        clear2faPending();
        setLoading(false);
        navigateAfterLogin();
        return;
      } else {
        setOtpError("Unexpected response format from server.");
      }
    } catch (err: any) {
      const responseData = err.response?.data;
      const code = responseData?.code;
      const msg = responseData?.message || err.message || "";

      if (code === "PLATFORM_ACCESS_DENIED_SUPER_ADMIN_MOBILE" || code === "PLATFORM_ACCESS_DENIED") {
        await forceLogout();
        setShowSuperAdminModal(true);
        setLoading(false);
        return;
      }

      if (code === "EXPIRED_OR_INVALID_PENDING_TOKEN") {
        Alert.alert(
          "Session Expired",
          "Your login session has expired. Please sign in again.",
          [
            {
              text: "OK",
              onPress: () => {
                setAuthStep("login");
                setOtpCode("");
                setOtpError("");
                setOtpPendingToken("");
                clear2faPending();
              },
            },
          ],
        );
        setLoading(false);
        return;
      }

      setOtpError(msg || "Invalid OTP.");
      if (
        msg.includes("locked") ||
        msg.includes("15 minutes") ||
        code === "ACCOUNT_LOCKED_15_MINUTES"
      ) {
        Alert.alert("Account Locked", "Please try again in 15 minutes.");
      }
      setOtpCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupFirstOTP = async () => {
    if (loading) return;
    if (!setupOtpCode.trim() || setupOtpCode.length !== 6) {
      Alert.alert(
        "Invalid Code",
        "Please enter the 6-digit code from Google Authenticator.",
      );
      return;
    }
    setLoading(true);
    try {
      const result = await verify2FAOtp(setupToken, setupOtpCode);
      const responseData = result?.data || result;
      if (responseData?.access_token && responseData?.user) {
        const {
          user: u,
          access_token,
          refresh_token,
          session_id,
        } = responseData;
        if (session_id)
          await SecureStore.setItemAsync("session_id", session_id);
        await login(u, access_token, refresh_token);
        clear2faPending();
        setLoading(false);
        navigateAfterLogin();
        return;
      } else {
        Alert.alert(
          "Verification Failed",
          "Unexpected response format from server.",
        );
        setSetupOtpCode("");
      }
    } catch (err: any) {
      const responseData = err.response?.data;
      const code = responseData?.code;
      const msg =
        responseData?.message ||
        err.message ||
        "Invalid code. Please try again.";

      if (code === "PLATFORM_ACCESS_DENIED_SUPER_ADMIN_MOBILE" || code === "PLATFORM_ACCESS_DENIED") {
        await forceLogout();
        setShowSuperAdminModal(true);
        setLoading(false);
        return;
      }

      if (code === "EXPIRED_OR_INVALID_PENDING_TOKEN") {
        Alert.alert(
          "Session Expired",
          "Your setup session has expired. Please sign in again.",
          [
            {
              text: "OK",
              onPress: () => {
                setAuthStep("login");
                setSetupOtpCode("");
                setQrCodeUrl("");
                setManualSecret("");
                setQrExpired(false);
                clear2faPending();
              },
            },
          ],
        );
        setLoading(false);
        return;
      }

      Alert.alert("Verification Failed", msg);
      setSetupOtpCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateQR = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/regenerate-qr", {
        otp_pending_token: setupToken,
      });
      const {
        qr_code_url,
        secret: secretKey,
        otp_pending_token,
      } = res.data?.data || res.data;
      if (qr_code_url) setQrCodeUrl(qr_code_url);
      if (secretKey) setManualSecret(secretKey);
      if (otp_pending_token) setSetupToken(otp_pending_token);
      setQrExpired(false);
      setCountdown(600);
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === "EXPIRED_OR_INVALID_PENDING_TOKEN") {
        Alert.alert(
          "Session Expired",
          "Your setup session has expired. Please sign in again.",
          [
            {
              text: "OK",
              onPress: () => {
                setAuthStep("login");
                setSetupOtpCode("");
                setQrCodeUrl("");
                setManualSecret("");
                setQrExpired(false);
                clear2faPending();
              },
            },
          ],
        );
        setLoading(false);
        return;
      }
      Alert.alert("Error", "Failed to regenerate QR code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const processLoginResponse = async (responseData: any): Promise<boolean> => {
    const data = responseData?.data || responseData;

    // Case 1: Backend returns direct auth (access_token, refresh_token, user)
    if (data?.access_token && data?.user) {
      const { user: u, access_token, refresh_token, session_id } = data;
      if (session_id) await SecureStore.setItemAsync("session_id", session_id);
      await login(u, access_token, refresh_token);
      setLoading(false);
      navigateAfterLogin();
      return true;
    }

    // Case 2: First login - need to set up 2FA with QR code
    if (data?.setup_required) {
      setQrCodeUrl(data?.qr_code_url || "");
      setManualSecret(data?.secret || "");
      setSetupToken(data?.otp_pending_token || "");
      setAuthStep("qr_setup");
      set2faPending({
        otp_pending_token: data?.otp_pending_token,
        setup_required: true,
        qr_code_url: data?.qr_code_url,
      });
      return true;
    }

    // Case 3: 2FA already enabled - need OTP verification
    if (data?.otp_pending_token) {
      setOtpPendingToken(data.otp_pending_token);
      setAuthStep("otp_verify");
      set2faPending({
        otp_pending_token: data.otp_pending_token,
        setup_required: false,
      });
      return true;
    }

    return false;
  };

  const handleLogin = async () => {
    if (loading) return;
    const errs: Record<string, string | undefined> = {};
    if (!email.trim()) errs.email = "Email is required.";
    if (!password) errs.password = "Password is required.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);

    try {
      // Strategy 1: Try Firebase Auth first (for mobile-registered users)
      try {
        const fbAuth = getAuth();
        const fbCredential = await signInWithEmailAndPassword(
          fbAuth,
          email,
          password,
        );
        const firebaseToken = await getIdToken(fbCredential.user);

        // Silently migrate password hash so future web logins work too
        try {
          await apiClient.post("/auth/set-password", { email, password });
        } catch {
          /* non-critical */
        }

        // Send Firebase token to backend
        const fbResult = await firebaseLoginWithToken(firebaseToken);
        const handled = await processLoginResponse(fbResult);
        if (handled) {
          setLoading(false);
          return;
        }

        // Firebase login returned unexpected response - fall through to backend login
        console.warn(
          "Firebase login returned unexpected response, falling back to backend login",
        );
      } catch (firebaseErr: any) {
        // Firebase Auth failed (user likely registered via web backend without Firebase Auth)
        // Fall through to Strategy 2: Direct backend login
      }

      // Strategy 2: Direct backend /auth/login (for web-registered users or as fallback)
      try {
        const backendResult = await loginWith2FA(email, password);
        const handled = await processLoginResponse(backendResult);
        if (handled) {
          setLoading(false);
          return;
        }
      } catch (backendErr: any) {
        const backendMsg =
          backendErr.response?.data?.message || backendErr.message || "";

        // If Strategy 2 fails because password_hash is missing (not wrong credentials),
        // try setting the password via backend, then retry login.
        // Safety: We ONLY do this when the backend explicitly returns code: "PASSWORD_NOT_SET"
        // (distinct from INVALID_CREDENTIALS), so we never overwrite a real password.
        const errorCode = backendErr.response?.data?.code;
        if (errorCode === "PASSWORD_NOT_SET") {
          // Strategy 3: Store password_hash via /auth/set-password then retry
          try {
            await apiClient.post("/auth/set-password", { email, password });

            // Retry /auth/login now that password_hash exists
            const retryResult = await loginWith2FA(email, password);
            const retryHandled = await processLoginResponse(retryResult);
            if (retryHandled) {
              setLoading(false);
              return;
            }
          } catch (setPwErr: any) {
            // silent fail
          }

          // If set-password + retry didn't work, try Firebase Auth once more
          try {
            const fbAuth = getAuth();
            const fbCredential = await signInWithEmailAndPassword(
              fbAuth,
              email,
              password,
            );
            const firebaseToken = await getIdToken(fbCredential.user);
            const fbResult = await firebaseLoginWithToken(firebaseToken);
            const fbHandled = await processLoginResponse(fbResult);
            if (fbHandled) {
              setLoading(false);
              return;
            }
          } catch (retryErr: any) {
            // silent fail
          }
        }

        // Re-throw so the outer catch shows the original backend error
        throw backendErr;
      }

      // Both strategies failed to produce a recognized response
      Alert.alert(
        "Error",
        "Unexpected response from server. Please contact support.",
      );
    } catch (err: any) {
      const responseData = err.response?.data;
      const code = responseData?.code;
      const msg =
        responseData?.message ||
        err.message ||
        "Login failed. Please check your credentials.";

      if (code === "PLATFORM_ACCESS_DENIED_SUPER_ADMIN_MOBILE" || code === "PLATFORM_ACCESS_DENIED") {
        await forceLogout();
        setShowSuperAdminModal(true);
        return;
      }

      if (msg.includes("locked") || msg.includes("15 minutes")) {
        Alert.alert(
          "Account Locked",
          "Too many failed attempts. Please try again in 15 minutes.",
        );
      } else {
        Alert.alert("Login Failed", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (loading) return;
    const errs: Record<string, string | undefined> = {};
    if (!fullName.trim()) errs.fullName = "Full name is required.";
    if (!email.trim()) errs.email = "Email is required.";
    if (!password) errs.password = "Password is required.";
    if (!phone.trim()) errs.phone = "Phone is required.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await registerApi({ full_name: fullName, email, password, phone, role });
      Alert.alert("Success", "Account created. Please login.");
      setAuthStep("login");
      setEmail("");
      setPassword("");
      setFullName("");
      setPhone("");
      setRole("user");
    } catch (err: any) {
      Alert.alert(
        "Registration Failed",
        err.response?.data?.message || err.message || "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF0F3]">
      {authStep === "otp_verify" ? (
        <OTPStep_Verify
          otpCode={otpCode}
          setOtpCode={setOtpCode}
          otpError={otpError}
          setOtpError={setOtpError}
          loading={loading}
          onVerify={handleVerify2FA}
          otpTimer={otpTimer}
          onBack={() => {
            setAuthStep("login");
            setOtpCode("");
            setOtpError("");
            setOtpPendingToken("");
            clear2faPending();
          }}
        />
      ) : authStep === "qr_setup" ? (
        <QRSetupStep
          qrCodeUrl={qrCodeUrl}
          qrExpired={qrExpired}
          countdown={countdown}
          setupOtpCode={setupOtpCode}
          setSetupOtpCode={setSetupOtpCode}
          loading={loading}
          onVerify={handleSetupFirstOTP}
          onRegenerate={handleRegenerateQR}
          manualSecret={manualSecret}
          onCancel={() => {
            setAuthStep("login");
            setSetupOtpCode("");
            setQrCodeUrl("");
            setManualSecret("");
            setQrExpired(false);
            clear2faPending();
          }}
        />
      ) : (
        <KeyboardAwareScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: authStep === "register" ? "flex-start" : "center",
            paddingHorizontal: 24,
            paddingTop: authStep === "register" ? (isSmallScreen ? 16 : 32) : 24,
            paddingBottom: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          extraScrollHeight={isSmallScreen ? 40 : 80}
          enableOnAndroid
        >
          <View className="items-center mb-8 mt-8">
            <View
              className="w-20 h-20 bg-white rounded-full items-center justify-center shadow-lg mb-4"
              style={{
                shadowColor: "#FF1F4B",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Ionicons name="shield-checkmark" size={36} color="#FF1F4B" />
            </View>
            <Text className="text-3xl font-extrabold text-[#FF1F4B] font-serif mb-1">
              Sofiya Bangles
            </Text>
            <Text className="text-slate-500 text-sm font-medium">
              Admin & User Portal
            </Text>
          </View>
          <View
            className="bg-white rounded-3xl p-6 shadow-sm mb-6"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <Text className="text-xl font-bold text-slate-800 mb-6 text-center">
              {authStep === "register" ? "Create Account" : "Welcome Back"}
            </Text>
            {authStep === "register" && (
              <>
                <TextInputField
                  label="Full Name"
                  placeholder="John Doe"
                  value={fullName}
                  onChangeText={(t) => {
                    setFullName(t);
                    setErrors((p) => ({ ...p, fullName: undefined }));
                  }}
                  error={errors.fullName}
                />
                <TextInputField
                  label="Phone"
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    setErrors((p) => ({ ...p, phone: undefined }));
                  }}
                  error={errors.phone}
                />
                {/* Role Selection */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-slate-700 mb-2 ml-1">
                    Account Type
                  </Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => setRole("user")}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 flex-row items-center justify-center gap-2 ${
                        role === "user"
                          ? "bg-rose-50 border-[#FF1F4B]"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color={role === "user" ? "#FF1F4B" : "#94a3b8"}
                      />
                      <Text
                        className={`font-semibold text-sm ${role === "user" ? "text-[#FF1F4B]" : "text-slate-500"}`}
                      >
                        User
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setRole("admin")}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 flex-row items-center justify-center gap-2 ${
                        role === "admin"
                          ? "bg-rose-50 border-[#FF1F4B]"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={18}
                        color={role === "admin" ? "#FF1F4B" : "#94a3b8"}
                      />
                      <Text
                        className={`font-semibold text-sm ${role === "admin" ? "text-[#FF1F4B]" : "text-slate-500"}`}
                      >
                        Admin
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
            <TextInputField
              label="Email"
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setErrors((p) => ({ ...p, email: undefined }));
              }}
              error={errors.email}
            />
            <TextInputField
              label="Password"
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrors((p) => ({ ...p, password: undefined }));
              }}
              error={errors.password}
              rightIcon={
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color="#94a3b8"
                />
              }
              onRightIconPress={() => setShowPassword(!showPassword)}
            />
            <Button
              title={authStep === "register" ? "Create Account" : "Sign In"}
              onPress={authStep === "register" ? handleRegister : handleLogin}
              loading={loading}
              className="shadow-md bg-[#FF1F4B] rounded-xl"
              style={{
                shadowColor: "#FF1F4B",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            />
            <TouchableOpacity
              onPress={() => {
                setAuthStep(authStep === "login" ? "register" : "login");
                setErrors({});
              }}
              className="mt-4 items-center py-2"
            >
              <Text className="text-slate-500 text-sm">
                {authStep === "login"
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <Text className="text-[#FF1F4B] font-bold">
                  {authStep === "login" ? "Register" : "Login"}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
          <View className="items-center mb-4">
            <View className="flex-row items-center">
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color="#94a3b8"
              />
              <Text className="text-slate-400 text-xs ml-1">
                Secured with Google Authenticator 2FA
              </Text>
            </View>
          </View>
        </KeyboardAwareScrollView>
      )}

      <SuperAdminRestriction
        visible={showSuperAdminModal}
        onLogout={handleSuperAdminLogout}
      />
    </SafeAreaView>
  );
}
