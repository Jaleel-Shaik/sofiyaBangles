import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Vibration,
  Platform,
  Keyboard,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface OTPDigitInputProps {
  value?: string;
  onChange?: (val: string) => void;
  // Backward compatibility props
  initialDigits?: string[];
  onDigitsChange?: (digits: string[]) => void;
  onComplete?: () => void;
  error?: string;
  setError?: (e: string) => void;
  disabled?: boolean;
}

/**
 * Reliable Luxury OTP Digit Input Component
 * Directly overlays a transparent native number-pad TextInput over 6 beautifully
 * styled squircle boxes. Tapping ANY box immediately focuses the native keyboard.
 * Every keystroke aligns smoothly into its respective slot with zero race conditions.
 */
export const OTPDigitInput: React.FC<OTPDigitInputProps> = ({
  value,
  onChange,
  initialDigits,
  onDigitsChange,
  onComplete,
  error,
  setError,
  disabled = false,
}) => {
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const previousErrorRef = useRef(error);
  const [isFocused, setIsFocused] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const { width: windowWidth } = useWindowDimensions();
  // Ensure the 6 boxes and gaps fit comfortably on any screen width
  const boxWidth = Math.min(48, Math.max(38, Math.floor((windowWidth - 88) / 6)));
  const boxGap = Math.min(10, Math.max(6, Math.floor((windowWidth - 88 - boxWidth * 6) / 5)));
  const boxHeight = Math.round(boxWidth * 1.2);

  // Derive the unified string value
  const displayValue = (
    typeof value === "string"
      ? value
      : Array.isArray(initialDigits)
        ? initialDigits.join("")
        : ""
  ).slice(0, 6);

  // Shake animation & haptic feedback on error
  useEffect(() => {
    if (error && error !== previousErrorRef.current) {
      previousErrorRef.current = error;
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      if (Platform.OS !== "web") Vibration.vibrate(100);
    }
    previousErrorRef.current = error;
  }, [error, shakeAnim]);

  // Animated blinking cursor in active slot
  useEffect(() => {
    if (isFocused && !disabled) {
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
          Animated.timing(cursorOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        ])
      );
      blink.start();
      return () => blink.stop();
    } else {
      cursorOpacity.setValue(0);
    }
  }, [isFocused, disabled, cursorOpacity]);

  // Auto focus input on mount with sufficient delay for screen transition
  useEffect(() => {
    if (!disabled) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [disabled]);

  const handleTextChange = (text: string) => {
    if (disabled) return;
    setError?.("");
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 6);

    // Notify listeners
    onChange?.(cleaned);
    onDigitsChange?.(cleaned.padEnd(6, "").split("").slice(0, 6));

    if (cleaned.length === 6) {
      Keyboard.dismiss();
      if (Platform.OS !== "web") {
        import("expo-haptics")
          .then((mod) => mod.notificationAsync(mod.NotificationFeedbackType.Success))
          .catch(() => {});
      }
      setTimeout(() => onCompleteRef.current?.(), 150);
    } else if (cleaned.length > 0) {
      if (Platform.OS !== "web") {
        import("expo-haptics")
          .then((mod) => mod.impactAsync(mod.ImpactFeedbackStyle.Light))
          .catch(() => {});
      }
    }
  };

  const handleClear = () => {
    onChange?.("");
    onDigitsChange?.(["", "", "", "", "", ""]);
    setError?.("");
    inputRef.current?.focus();
  };

  return (
    <View style={styles.wrapper}>
      {/* Visual Boxes Container with Transparent Overlay TextInput */}
      <View style={[styles.inputContainer, { height: boxHeight }]}>
        {/* 1. Visual 6 boxes - pointerEvents none so clicks pass directly to TextInput */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.boxesRow,
            { gap: boxGap, transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const digit = displayValue[index] || "";
            const isActiveSlot = index === displayValue.length && displayValue.length < 6;
            const hasDigit = Boolean(digit);

            let boxStyle = styles.boxDefault;
            let textStyle = styles.digitText;

            if (error) {
              boxStyle = styles.boxError;
              textStyle = styles.digitTextError;
            } else if (isActiveSlot && isFocused) {
              boxStyle = styles.boxActive;
            } else if (hasDigit) {
              boxStyle = styles.boxFilled;
            }

            return (
              <View
                key={index}
                style={[
                  styles.boxBase,
                  boxStyle,
                  { width: boxWidth, height: boxHeight },
                ]}
              >
                {hasDigit ? (
                  <Text style={textStyle}>{digit}</Text>
                ) : isActiveSlot && isFocused ? (
                  <Animated.View
                    style={[styles.cursorLine, { opacity: cursorOpacity }]}
                  />
                ) : (
                  <Text style={styles.placeholderDot}>•</Text>
                )}
              </View>
            );
          })}
        </Animated.View>

        {/* 2. Real Native TextInput positioned directly on top covering the entire row */}
        <TextInput
          ref={inputRef}
          value={displayValue}
          onChangeText={handleTextChange}
          keyboardType="number-pad"
          maxLength={6}
          editable={!disabled}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          autoFocus={!disabled}
          caretHidden={true}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          returnKeyType="done"
          onSubmitEditing={() => onCompleteRef.current?.()}
          style={styles.realInput}
        />
      </View>

      {/* 3. Clear button OUTSIDE the touch area so it can be tapped directly */}
      {displayValue.length > 0 && !disabled && (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 10, bottom: 10, left: 14, right: 14 }}
          activeOpacity={0.7}
          style={styles.clearButton}
        >
          <Ionicons name="close-circle" size={13} color="#64748b" />
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  inputContainer: {
    width: "100%",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  boxesRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  boxBase: {
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  boxDefault: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0", // slate-200
    backgroundColor: "#f8fafc", // slate-50
  },
  boxActive: {
    borderWidth: 2,
    borderColor: "#e11d48", // rose-600
    backgroundColor: "#ffffff",
    shadowColor: "#e11d48",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  boxFilled: {
    borderWidth: 2,
    borderColor: "#e11d48",
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  boxError: {
    borderWidth: 2,
    borderColor: "#ef4444", // red-500
    backgroundColor: "#fef2f2", // red-50
  },
  digitText: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: "#0f172a", // slate-900
    includeFontPadding: false,
    textAlign: "center",
  },
  digitTextError: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: "#dc2626", // red-600
    includeFontPadding: false,
    textAlign: "center",
  },
  cursorLine: {
    width: 2.5,
    height: 22,
    borderRadius: 1.5,
    backgroundColor: "#e11d48",
    alignSelf: "center",
  },
  placeholderDot: {
    fontSize: 18,
    fontWeight: "600",
    color: "#cbd5e1", // slate-300
    includeFontPadding: false,
    textAlign: "center",
  },
  realInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    opacity: 0.01,
    color: "transparent",
    backgroundColor: "transparent",
    fontSize: 24,
    textAlign: "center",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "center",
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 9999,
    backgroundColor: "#f1f5f9",
  },
  clearText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
});
