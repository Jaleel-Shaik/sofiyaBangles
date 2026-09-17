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
  StyleSheet,
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
 * Uses an invisible overlaid TextInput that captures all keyboard interactions,
 * while accurately rendering 6 luxury digit boxes with a perfectly positioned
 * blinking cursor in the active slot.
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
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const isCompleteRef = useRef(false);
  const previousErrorRef = useRef(error);
  const [isFocused, setIsFocused] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setLocalDigits([...initialDigits]);
    isCompleteRef.current = false;
  }, [initialDigits]);

  // Shake animation on error
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

  // Blinking cursor in active slot
  useEffect(() => {
    if (isFocused && !disabled) {
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, {
            toValue: 0,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(cursorOpacity, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
        ])
      );
      blink.start();
      return () => blink.stop();
    } else {
      cursorOpacity.setValue(0);
    }
  }, [isFocused, disabled, cursorOpacity]);

  // Auto focus input on mount
  useEffect(() => {
    if (!disabled) {
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
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
            mod.notificationAsync(mod.NotificationFeedbackType.Success)
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

  const currentRawValue = localDigits.join("");
  const digitCount = localDigits.filter((d) => d !== "").length;

  return (
    <View style={styles.container}>
      {/* Invisible TextInput that captures all touches and native keyboard events */}
      <TextInput
        ref={inputRef}
        value={currentRawValue}
        onChangeText={handleTextChange}
        keyboardType="number-pad"
        maxLength={6}
        editable={!disabled}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        autoFocus={!disabled}
        caretHidden={true}
        returnKeyType="done"
        onSubmitEditing={() => onCompleteRef.current?.()}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={styles.hiddenInput}
      />

      {/* Visual 6 OTP Boxes with Perfectly Placed Animated Blinking Cursor */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={focusInput}
        style={styles.touchOverlay}
        accessibilityRole="none"
      >
        <Animated.View
          style={[styles.boxesRow, { transform: [{ translateX: shakeAnim }] }]}
          pointerEvents="none"
        >
          {localDigits.map((digit, index) => {
            const isActiveSlot = index === digitCount && digitCount < 6;
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
              <View key={index} style={[styles.boxBase, boxStyle]}>
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

        {digitCount > 0 && !disabled && (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            style={styles.clearButton}
          >
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    fontSize: 1,
    color: "transparent",
  },
  touchOverlay: {
    width: "100%",
    alignItems: "center",
  },
  boxesRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  boxBase: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  boxDefault: {
    borderColor: "#fecdd3", // rose-200
    backgroundColor: "#ffffff",
  },
  boxActive: {
    borderColor: "#e11d48", // rose-600
    backgroundColor: "#fff1f2", // rose-50
    shadowColor: "#e11d48",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  boxFilled: {
    borderColor: "#e11d48",
    backgroundColor: "#ffffff",
  },
  boxError: {
    borderColor: "#ef4444", // red-500
    backgroundColor: "#fef2f2", // red-50
  },
  digitText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a", // slate-900
    includeFontPadding: false,
    textAlign: "center",
  },
  digitTextError: {
    fontSize: 22,
    fontWeight: "700",
    color: "#dc2626", // red-600
    includeFontPadding: false,
    textAlign: "center",
  },
  cursorLine: {
    width: 2.5,
    height: 24,
    borderRadius: 1.5,
    backgroundColor: "#e11d48",
  },
  placeholderDot: {
    fontSize: 18,
    fontWeight: "600",
    color: "#cbd5e1", // slate-300
    includeFontPadding: false,
    textAlign: "center",
  },
  clearButton: {
    alignSelf: "center",
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  clearText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#e11d48",
  },
});
