import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface CategoryItemProps {
  name: string;
  onPress: () => void;
  className?: string;
  size?: 'small' | 'large';
  subtitle?: string;
  imageUrl?: string;
}

export default function CategoryItem({ 
  name, 
  onPress, 
  className = '',
  size = 'small',
  subtitle,
  imageUrl
}: CategoryItemProps) {
  
  const renderIcon = (n: string, iconSize: number, color: string) => {
    const lower = n.toLowerCase();
    if (lower.includes('bridal')) return <MaterialCommunityIcons name="crown-outline" size={iconSize} color={color} />;
    if (lower.includes('glass')) return <MaterialCommunityIcons name="star-four-points-outline" size={iconSize} color={color} />;
    if (lower.includes('stone')) return <MaterialCommunityIcons name="diamond-outline" size={iconSize} color={color} />;
    if (lower.includes('metal')) return <MaterialCommunityIcons name="circle-outline" size={iconSize} color={color} />;
    if (lower.includes('kids')) return <MaterialCommunityIcons name="baby-face-outline" size={iconSize} color={color} />;
    if (lower.includes('oxidised')) return <MaterialCommunityIcons name="layers-outline" size={iconSize} color={color} />;
    return <Ionicons name="apps-outline" size={iconSize} color={color} />;
  };

  if (size === 'large') {
    return (
      <TouchableOpacity 
        className={`bg-white w-[48%] rounded-3xl p-6 items-center shadow-sm border border-slate-100 ${className}`}
        onPress={onPress}
      >
        <View className="w-16 h-16 rounded-full bg-[#FFF0F3] items-center justify-center mb-4 overflow-hidden border border-rose-100">
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
          ) : (
            renderIcon(name, 28, "#e11d48")
          )}
        </View>
        <Text className="font-bold text-slate-800 text-base text-center">{name}</Text>
        {subtitle && <Text className="text-xs text-slate-500 mt-1">{subtitle}</Text>}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} className={`items-center ${className}`}>
      <View className="w-16 h-16 rounded-full bg-[#FFF0F3] items-center justify-center border border-rose-100 mb-2 shadow-sm overflow-hidden">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          renderIcon(name, 24, "#e11d48")
        )}
      </View>
      <Text className="text-xs font-semibold text-slate-700">{name}</Text>
    </TouchableOpacity>
  );
}
