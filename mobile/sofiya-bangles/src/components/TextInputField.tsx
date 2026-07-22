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
      <Text className="text-slate-700 font-bold mb-2 text-base">{label}</Text>
      <View className="relative justify-center">
        <TextInput
          onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
          className={`bg-white px-5 py-4 rounded-xl border shadow-sm text-base ${
            error ? 'border-red-500' : isFocused ? 'border-[#FF1F4B]' : 'border-rose-100'
          } text-slate-800 ${rightIcon ? 'pr-16' : ''}`}
          placeholderTextColor="#94a3b8"
          {...props}
        />
        {rightIcon && (
          <Pressable 
            onPress={onRightIconPress}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            className="absolute right-3 h-full justify-center px-2 z-10"
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            {rightIcon}
          </Pressable>
        )}
      </View>
      {error && <Text className="text-red-500 text-sm mt-1.5">{error}</Text>}
    </View>
  );
}