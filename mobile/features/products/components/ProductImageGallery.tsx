import { View, Image, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Dimensions } from "react-native";
import { useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ProductImageGalleryProps {
  images: string[];
}

export function ProductImageGallery({ images }: ProductImageGalleryProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const galleryScrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const onGalleryScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    if (index !== activeImageIndex) {
      setActiveImageIndex(index);
    }
  };

  return (
    <View
      className="bg-white"
      style={{ paddingTop: Math.max(insets.top + 60, 80) }}
    >
      <View className="w-full aspect-square bg-[#FAFAFA]">
        <ScrollView
          ref={galleryScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onGalleryScroll}
          scrollEventThrottle={16}
        >
          {images.map((img, index) => (
            <View key={index} style={{ width: SCREEN_WIDTH }} className="aspect-square">
              <Image
                source={{ uri: img }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>
      </View>

      {images.length > 1 && (
        <View className="flex-row justify-center mt-3 mb-4">
          {images.map((_, index) => (
            <View
              key={index}
              className={`mx-1 rounded-full ${activeImageIndex === index ? "w-6 h-2 bg-primary" : "w-2 h-2 bg-slate-300"}`}
            />
          ))}
        </View>
      )}
    </View>
  );
}
