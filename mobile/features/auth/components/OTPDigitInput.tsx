import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Vibration,
  Platform,
  Keyboard,
} from "react-native";

export interface OTPDigitInputProps {
  initialDigits?: string[];
  onDigitsChange?: (digits: string[]) => void;
  onComplete?: () => void;
  error: string;
  setError: (e: string) => void;
  disabled: boolean;
}

/**
 * OTP Digit Input Component
 * Uses a hidden TextInput with a pressable overlay.
 * Tapping anywhere on the container focuses the hidden input.
 * The digit boxes are purely visual; all input goes through the TextInput.
 */
export const OTPDigitInput: React.FC<OTPDigitInputProps> = ({
  initialDigits = ["", "", "", "", "", ""],
  onDigitsChange,
  onComplete,
  error,
  setError,
  disabled,
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
  }, [initialDigits]);

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
  }, [error, shakeAnim]);

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
