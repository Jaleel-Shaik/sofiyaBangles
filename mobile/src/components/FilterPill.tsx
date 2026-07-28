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
      className={`px-4 py-1.5 rounded-full border mr-2 ${
        isActive
          ? 'bg-primary border-primary'
          : 'bg-transparent border-primary/30'
      } ${className}`}
      onPress={onPress}
    >
      <Text className={`font-semibold text-sm ${
        isActive ? 'text-white' : 'text-primary'
      }`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
