import { View, Text, TextInput, TextInputProps, Pressable } from 'react-native';
import { ReactNode, useState } from 'react';

interface TextInputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  rightIcon?: ReactNode;
  onRightIconPress?: () => void;
}

export default function TextInputField({ 
  label, 
  error, 
  rightIcon, 
  onRightIconPress, 
  className = '', 
  ...props 
}: TextInputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`mb-4 ${className}`}>
      <Text className="text-text-primary font-semibold mb-1.5 text-label-md">{label}</Text>
      <View className="relative justify-center">
        <TextInput
          onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
          className={`bg-surface px-4 py-3.5 rounded-2xl border shadow-sm text-body-md min-h-[48px] ${
            error ? 'border-rose-500 bg-rose-50/20' : isFocused ? 'border-primary' : 'border-rose-100'
          } text-slate-900 ${rightIcon ? 'pr-14' : ''}`}
          placeholderTextColor="#94a3b8"
          {...props}
        />
        {rightIcon && (
          <Pressable 
            onPress={onRightIconPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="absolute right-2 w-11 h-11 justify-center items-center z-10"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            accessibilityRole="button"
          >
            {rightIcon}
          </Pressable>
        )}
      </View>
      {error && (
        <Text className="text-rose-600 text-caption font-medium mt-1.5 ml-1">
          {error}
        </Text>
      )}
    </View>
  );
}