import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, TextInputProps, StyleSheet } from 'react-native';
import { AppIcon } from '../constants/icons';
import { STRINGS } from '../constants/strings';

interface SearchInputProps extends TextInputProps {
  onSearchPress?: () => void;
  onClear?: () => void;
}

export default function SearchInput({
  onSearchPress,
  onClear,
  className = '',
  value,
  onChangeText,
  style,
  ...props
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const hasValue = Boolean(value && value.length > 0);

  const handleClear = () => {
    if (onChangeText) {
      onChangeText('');
    }
    if (onClear) {
      onClear();
    }
  };

  const handleSearchIconPress = () => {
    inputRef.current?.focus();
    if (onSearchPress) {
      onSearchPress();
    }
  };

  return (
    <View
      style={[
        styles.container,
        isFocused ? styles.focused : styles.unfocused,
      ]}
      className={className}
    >
      {/* Leading Search Icon / Button */}
      <TouchableOpacity
        onPress={handleSearchIconPress}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.searchIconButton}
        accessibilityRole="button"
        accessibilityLabel={STRINGS.common.search}
      >
        <AppIcon
          name="search"
          size={20}
          color={isFocused ? '#e11d48' : '#94a3b8'}
        />
      </TouchableOpacity>

      {/* Main Text Input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
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
        style={[styles.input, style]}
        {...props}
      />

      {/* Trailing Clear Button */}
      {hasValue && (
        <TouchableOpacity
          style={styles.trailingButton}
          onPress={handleClear}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.common.clearSearch}
        >
          <AppIcon name="closeCircleFilled" size={18} color="#94a3b8" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
  focused: {
    borderColor: '#e11d48',
    backgroundColor: '#ffffff',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  unfocused: {
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
    marginRight: 6,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#0f172a',
    fontSize: 15,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  trailingButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
});
