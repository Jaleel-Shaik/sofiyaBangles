import { View, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchInputProps extends TextInputProps {
  onFilterPress?: () => void;
  showFilter?: boolean;
}

export default function SearchInput({ onFilterPress, showFilter = true, className = '', ...props }: SearchInputProps) {
  return (
    <View className={`flex-row items-center bg-white px-5 py-4 rounded-full shadow-sm border border-rose-100 ${className}`}>
      <Ionicons name="search" size={24} color="#f43f5e" />
      <TextInput 
        className="flex-1 ml-3 text-slate-700 text-base"
        placeholderTextColor="#94a3b8"
        {...props}
      />
      {showFilter && (
        <TouchableOpacity 
          className="bg-rose-100 p-2.5 rounded-full ml-3"
          onPress={onFilterPress}
        >
          <Ionicons name="options-outline" size={20} color="#e11d48" />
        </TouchableOpacity>
      )}
    </View>
  );
}
