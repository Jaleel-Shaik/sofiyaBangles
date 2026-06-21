import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';

interface FavoriteItemCardProps {
  product: any;
  onRemove: () => void;
  onWhatsApp: () => void;
}

export default function FavoriteItemCard({ product, onRemove, onWhatsApp }: FavoriteItemCardProps) {
  return (
    <View className="bg-white rounded-3xl p-3.5 mb-4 shadow-sm border border-slate-100 flex-row items-center">
      <Image 
        source={{ uri: product?.image_url || 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a' }} 
        className="w-[100px] h-[100px] rounded-2xl"
        resizeMode="cover"
      />
      
      <View className="flex-1 ml-4 justify-between h-[100px]">
        <View className="flex-row justify-between items-start">
          <Text className="font-bold text-slate-800 text-sm flex-1 pr-2" numberOfLines={1}>
            {product?.product_name || 'Bridal Gold Bangle Set'}
          </Text>
          <TouchableOpacity onPress={onRemove} className="p-1.5 bg-rose-50 rounded-full">
            <Ionicons name="heart" size={16} color="#FF1F4B" />
          </TouchableOpacity>
        </View>

        <Text className="text-[#FF1F4B] font-extrabold text-base mt-0.5 mb-1">₹{product?.price || '1,299'}</Text>
        
        <View className="flex-row items-end justify-between">
          <View>
            <View className="bg-[#D1FAE5] px-2 py-0.5 rounded flex-row items-center self-start mb-1">
              <Text className="text-[#059669] text-[10px] font-bold">In Stock</Text>
            </View>
            <Text className="text-[10px] text-slate-500">Size: 2.6</Text>
          </View>

          <TouchableOpacity 
            className="bg-[#00D166] flex-row items-center justify-center py-1.5 px-3 rounded-full shadow-sm"
            onPress={onWhatsApp}
          >
            <FontAwesome name="whatsapp" size={12} color="white" />
            <Text className="text-white font-bold text-[11px] ml-1">WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
