import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import { OTPDigitInput } from "./OTPDigitInput";
import { STRINGS } from "@/src/constants/strings";

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
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallScreen = screenHeight < 600;

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: isSmallScreen ? 12 : 24,
          paddingBottom: Math.max(insets.bottom + 16, 24),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        extraScrollHeight={isSmallScreen ? 40 : 80}
        enableOnAndroid
      >
        {/* Top Navigation Row */}
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={onBack}
            className="w-10 h-10 bg-white rounded-full items-center justify-center border border-slate-200/80 shadow-xs active:bg-slate-50"
            accessibilityRole="button"
            accessibilityLabel={STRINGS.common.back}
          >
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>

          <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/60">
            <View className="w-2 h-2 rounded-full bg-primary" />
            <Text className="text-[11px] font-bold text-primary uppercase tracking-wider">
              {STRINGS.auth.otpVerify.badge}
            </Text>
          </View>

          {/* Spacer to balance back button */}
          <View className="w-10" />
        </View>

        {/* Hero Security Icon & Header */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 bg-white rounded-3xl items-center justify-center border border-slate-100 shadow-sm mb-3.5">
            <View className="w-14 h-14 bg-rose-50 rounded-2xl items-center justify-center">
              <Ionicons
                name={useBackupCode ? "key" : "shield-checkmark"}
                size={30}
                color="#e11d48"
              />
            </View>
          </View>

          <Text className="text-2xl font-black text-slate-900 text-center tracking-tight">
            {useBackupCode
              ? STRINGS.auth.otpVerify.recoveryTitle
              : STRINGS.auth.otpVerify.title}
          </Text>
          <Text className="text-xs text-slate-500 text-center mt-1.5 px-4 leading-5 max-w-[300px]">
            {useBackupCode
              ? STRINGS.auth.otpVerify.recoverySubtitle
              : STRINGS.auth.otpVerify.subtitle}
          </Text>
        </View>

        {/* Lockout Alert Banner */}
        {isLocked && (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex-row items-start gap-3">
            <Ionicons name="lock-closed" size={20} color="#dc2626" style={{ marginTop: 1 }} />
            <View className="flex-1">
              <Text className="text-red-900 font-bold text-xs mb-0.5">
                {STRINGS.auth.otpVerify.accountLocked}
              </Text>
              <Text className="text-red-700 text-xs leading-relaxed">
                {lockoutMessage || STRINGS.auth.otpVerify.defaultLockout}
              </Text>
            </View>
          </View>
        )}

        {/* Main Input Card */}
        <View className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-4">
          {!useBackupCode ? (
            <>
              <Text className="text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase text-center mb-4">
                {STRINGS.auth.otpVerify.codeLabel}
              </Text>

              <OTPDigitInput
                value={otpCode}
                onChange={setOtpCode}
                onComplete={onVerify}
                error={otpError}
                setError={setOtpError}
                disabled={loading || isLocked}
              />

              {/* Refresh Countdown Pill */}
              <View
                className={`flex-row items-center justify-center gap-1.5 py-1.5 px-3.5 rounded-full self-center mt-4 ${
                  otpTimer <= 5
                    ? "bg-amber-50 border border-amber-200"
                    : "bg-slate-50 border border-slate-100"
                }`}
              >
                <Ionicons
                  name={otpTimer <= 5 ? "warning-outline" : "time-outline"}
                  size={13}
                  color={otpTimer <= 5 ? "#d97706" : "#e11d48"}
                />
                <Text
                  className={`text-xs font-medium ${
                    otpTimer <= 5 ? "text-amber-700 font-semibold" : "text-slate-500"
                  }`}
                >
                  {otpTimer <= 5
                    ? STRINGS.auth.otpVerify.rotatingSoon(otpTimer)
                    : STRINGS.auth.otpVerify.refreshesIn(otpTimer)}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text className="text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase text-center mb-3">
                {STRINGS.auth.otpVerify.recoveryCodeLabel}
              </Text>

              <TextInput
                value={backupCode}
                onChangeText={(val) => {
                  setBackupCode(val);
                  setOtpError("");
                }}
                placeholder={STRINGS.auth.otpVerify.recoveryPlaceholder}
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading && !isLocked}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-center text-lg font-mono font-bold text-slate-900 tracking-widest uppercase"
              />
              <Text className="text-slate-400 text-[11px] text-center mt-2">
                {STRINGS.auth.otpVerify.recoveryHint}
              </Text>
            </>
          )}
        </View>

        {/* Error Notification */}
        {otpError ? (
          <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4 flex-row items-center gap-2.5">
            <Ionicons name="alert-circle" size={18} color="#dc2626" />
            <Text className="text-red-600 text-xs flex-1 leading-5 font-medium">
              {otpError}
            </Text>
          </View>
        ) : null}

        {/* Primary Verify Action Button */}
        <TouchableOpacity
          onPress={useBackupCode ? onVerifyBackup : onVerify}
          disabled={
            loading ||
            isLocked ||
            (useBackupCode ? !backupCode.trim() : otpCode.length !== 6)
          }
          activeOpacity={0.9}
          className={`h-14 rounded-2xl flex-row items-center justify-center shadow-sm ${
            loading ||
            isLocked ||
            (useBackupCode ? !backupCode.trim() : otpCode.length !== 6)
              ? "bg-slate-200"
              : "bg-primary"
          }`}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <View className="flex-row items-center gap-2">
              <Ionicons
                name={useBackupCode ? "key" : "shield-checkmark"}
                size={18}
                color="white"
              />
              <Text className="text-white font-bold text-base">
                {useBackupCode
                  ? STRINGS.auth.otpVerify.verifyRecoveryBtn
                  : STRINGS.auth.otpVerify.verifyBtn}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Switch Verification Mode Link */}
        <TouchableOpacity
          onPress={() => {
            setUseBackupCode(!useBackupCode);
            setOtpError("");
          }}
          activeOpacity={0.7}
          className="mt-4 py-3 items-center"
        >
          <Text className="text-xs font-bold text-primary">
            {useBackupCode
              ? `← ${STRINGS.auth.otpVerify.useAuthenticator}`
              : `${STRINGS.auth.otpVerify.useRecovery} →`}
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
};
