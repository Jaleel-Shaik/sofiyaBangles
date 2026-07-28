import { View, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchInputProps extends TextInputProps {
  onFilterPress?: () => void;
  onSearchPress?: () => void;
  showFilter?: boolean;
}

export default function SearchInput({ onFilterPress, onSearchPress, showFilter = false, className = '', ...props }: SearchInputProps) {
  return (
    <View className={`flex-row items-center bg-surface px-4 py-2.5 rounded-full border border-divider ${className}`}>
      <TextInput
        className="flex-1 mr-3 text-text-primary text-base py-1"
        placeholderTextColor="#94a3b8"
        {...props}
      />
      <TouchableOpacity
        className="bg-primary/10 p-2 rounded-full"
        onPress={onSearchPress}
      >
        <Ionicons name="search" size={20} color="#e11d48" />
      </TouchableOpacity>
      {showFilter && (
        <TouchableOpacity
          className="bg-primary/10 p-2 rounded-full ml-2"
          onPress={onFilterPress}
        >
          <Ionicons name="options-outline" size={20} color="#e11d48" />
        </TouchableOpacity>
      )}
    </View>
  );
}
