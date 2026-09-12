import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import Button from "@/src/components/Button";
import { OTPDigitInput } from "./OTPDigitInput";

export interface OTPVerifyProps {
  otpCode: string;
  setOtpCode: (val: string) => void;
  otpError: string;
  setOtpError: (val: string) => void;
  loading: boolean;
  onVerify: () => void;
  onBack: () => void;
  otpTimer: number;
  useBackupCode: boolean;
  setUseBackupCode: (val: boolean) => void;
  backupCode: string;
  setBackupCode: (val: string) => void;
  onVerifyBackup: () => void;
  isLocked: boolean;
  lockoutMessage: string;
}

export const OTPStepVerify: React.FC<OTPVerifyProps> = ({
  otpCode,
  setOtpCode,
  otpError,
  setOtpError,
  loading,
  onVerify,
  onBack,
  otpTimer,
  useBackupCode,
  setUseBackupCode,
  backupCode,
  setBackupCode,
  onVerifyBackup,
  isLocked,
  lockoutMessage,
}) => {
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
                  name={useBackupCode ? "key" : "shield-checkmark"}
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
            {useBackupCode ? "Recovery Code Sign In" : "Welcome back"}
          </Text>
          <Text className="text-slate-500 text-sm text-center mb-5 leading-5 px-4">
            {useBackupCode
              ? "Enter one of your single-use backup recovery codes."
              : "Enter the 6-digit verification code from your authenticator app."}
          </Text>

          {/* Lockout Banner */}
          {isLocked && (
            <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex-row items-start gap-2.5">
              <Ionicons name="lock-closed" size={18} color="#dc2626" style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-red-900 font-bold text-xs mb-1">
                  Account Temporarily Locked
                </Text>
                <Text className="text-red-700 text-xs leading-relaxed">
                  {lockoutMessage || "Too many failed attempts. Your account has been locked for 15 minutes."}
                </Text>
              </View>
            </View>
          )}

          {/* OTP Input or Backup Input */}
          {!useBackupCode ? (
            <>
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
                  disabled={loading || isLocked}
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
                disabled={loading || isLocked || otpCode.length !== 6}
                className="shadow-lg bg-[#FF1F4B] rounded-[18px] h-14"
                style={{
                  shadowColor: "#FF1F4B",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.28,
                  shadowRadius: 10,
                  elevation: 8,
                }}
              />
            </>
          ) : (
            <>
              {/* Backup Code Input */}
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
                    Backup Recovery Code
                  </Text>
                </View>
                <TextInput
                  value={backupCode}
                  onChangeText={(val) => {
                    setBackupCode(val);
                    setOtpError("");
                  }}
                  placeholder="e.g. ABCD-1234"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!loading && !isLocked}
                  className="bg-slate-50 border border-rose-200 rounded-2xl px-4 py-3.5 text-center text-lg font-mono font-bold text-slate-800 tracking-widest uppercase"
                />
                <Text className="text-slate-400 text-[11px] text-center mt-2">
                  Case-insensitive. Dashes are optional.
                </Text>
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

              {/* Verify Backup Code Button */}
              <Button
                title="Verify Recovery Code"
                onPress={onVerifyBackup}
                loading={loading}
                icon={<Ionicons name="key" size={20} color="#fff" />}
                iconPosition="left"
                disabled={loading || isLocked || !backupCode.trim()}
                className="shadow-lg bg-[#FF1F4B] rounded-[18px] h-14"
                style={{
                  shadowColor: "#FF1F4B",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.28,
                  shadowRadius: 10,
                  elevation: 8,
                }}
              />
            </>
          )}

          {/* Toggle Between Modes */}
          <TouchableOpacity
            onPress={() => {
              setUseBackupCode(!useBackupCode);
              setOtpError("");
            }}
            className="mt-5 items-center py-2 active:opacity-70"
          >
            <Text className="text-xs font-bold text-[#FF1F4B]">
              {useBackupCode
                ? "← Use Google Authenticator instead"
                : "Lost your device? Use Backup Recovery Code →"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};
