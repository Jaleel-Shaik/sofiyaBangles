import React from 'react';
import { View, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import { Typography } from './Typography';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerClassName = '',
  className = '',
  ...props
}: InputProps) {
  
  const hasError = !!error;
  
  return (
    <View className={`mb-5 ${containerClassName}`}>
      {label && (
        <Typography 
          variant="label-sm" 
          color="secondary" 
          className="mb-2 ml-1"
        >
          {label}
        </Typography>
      )}
      
      <View 
        className={`bg-white rounded-2xl border px-4 py-1 flex-row items-center shadow-sm 
          ${hasError ? 'border-error' : 'border-slate-200'}`}
      >
        {leftIcon && (
          <Ionicons 
            name={leftIcon} 
            size={20} 
            color={hasError ? '#ef4444' : '#94a3b8'} 
            style={{ marginRight: 8 }}
          />
        )}
        
        <TextInput
          placeholderTextColor="#94a3b8"
          className={`flex-1 p-3 text-text-primary font-medium ${className}`}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} disabled={!onRightIconPress}>
            <Ionicons 
              name={rightIcon} 
              size={20} 
              color="#94a3b8" 
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Typography 
          variant="label-md" 
          color="error" 
          className="mt-1 ml-2"
        >
          {error}
        </Typography>
      )}
    </View>
  );
}
