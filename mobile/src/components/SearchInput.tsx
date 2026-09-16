import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { AppIcon } from '../constants/icons';
import { STRINGS } from '../constants/strings';

interface SearchInputProps extends TextInputProps {
  onFilterPress?: () => void;
  onSearchPress?: () => void;
  onClear?: () => void;
  showFilter?: boolean;
}

export default function SearchInput({
  onFilterPress,
  onSearchPress,
  onClear,
  showFilter = false,
  className = '',
  value,
  onChangeText,
  style,
  ...props
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = Boolean(value && value.length > 0);

  const handleClear = () => {
    if (onChangeText) {
      onChangeText('');
    }
    if (onClear) {
      onClear();
    }
  };

  return (
    <View
      className={`flex-row items-center bg-surface h-12 px-3.5 rounded-2xl border ${
        isFocused
          ? 'border-primary/60 bg-white shadow-sm ring-1 ring-primary/20'
          : 'border-divider shadow-xs'
      } ${className}`}
    >
      {/* Leading Search Icon */}
      <TouchableOpacity
        onPress={onSearchPress}
        disabled={!onSearchPress}
        activeOpacity={0.7}
        className="w-8 h-8 items-center justify-center -ml-0.5 mr-2"
        accessibilityRole="button"
        accessibilityLabel={STRINGS.common.search}
      >
        <AppIcon
          name="search"
          size={19}
          color={isFocused ? '#e11d48' : '#94a3b8'}
        />
      </TouchableOpacity>

      {/* Main Text Input */}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        className="flex-1 h-full text-text-primary text-body-md py-0"
        placeholderTextColor="#94a3b8"
        accessibilityRole="search"
        selectionColor="#e11d48"
        textAlignVertical="center"
        returnKeyType="search"
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        style={[{ includeFontPadding: false }, style]}
        {...props}
      />

      {/* Trailing Clear Button */}
      {hasValue && (
        <TouchableOpacity
          className="w-8 h-8 items-center justify-center rounded-full"
          onPress={handleClear}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.common.clearSearch}
        >
          <AppIcon name="closeCircleFilled" size={17} color="#94a3b8" />
        </TouchableOpacity>
      )}

      {/* Trailing Filter Button */}
      {showFilter && (
        <>
          <View className="w-[1px] h-5 bg-divider mx-2" />
          <TouchableOpacity
            className="w-8 h-8 bg-rose-50 rounded-full items-center justify-center border border-rose-100"
            onPress={onFilterPress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.common.filter}
          >
            <AppIcon name="filter" size={17} color="#e11d48" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
