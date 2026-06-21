import { Text, TouchableOpacity } from 'react-native';

interface FilterPillProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  className?: string;
}

export default function FilterPill({ label, isActive, onPress, className = '' }: FilterPillProps) {
  return (
    <TouchableOpacity 
      className={`px-5 py-1.5 rounded-full border mr-3 ${
        isActive 
          ? 'bg-[#FF1F4B] border-[#FF1F4B]' 
          : 'bg-transparent border-[#FFB4C2]'
      } ${className}`}
      onPress={onPress}
    >
      <Text className={`font-semibold ${
        isActive ? 'text-white' : 'text-[#FF1F4B]'
      }`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
