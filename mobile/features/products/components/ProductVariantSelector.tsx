import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface ProductVariantSelectorProps {
  product: any;
  productModelTypeName?: string;
  preferences: any[];
  selectedVariantId: string | null;
  setSelectedVariantId: (id: string | null) => void;
  useCustomSize: boolean;
  setUseCustomSize: (val: boolean) => void;
  customProfiles: any[];
  selectedCustomProfileId: string | null;
  setSelectedCustomProfileId: (id: string | null) => void;
  activeCustomProfile: any | null;
}

export function ProductVariantSelector({
  product,
  productModelTypeName,
  preferences,
  selectedVariantId,
  setSelectedVariantId,
  useCustomSize,
  setUseCustomSize,
  customProfiles,
  selectedCustomProfileId,
  setSelectedCustomProfileId,
  activeCustomProfile,
}: ProductVariantSelectorProps) {
  const router = useRouter();

  if (!product.has_variants && !product.accepts_custom_size) return null;

  return (
    <View className="mb-5 pt-4 border-t border-divider">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-base font-bold text-text-primary">
          {productModelTypeName ? `${productModelTypeName} Sizes` : "Select Size"}
        </Text>
      </View>

      {product.has_variants && product.variants && (
        <View className="flex-row flex-wrap mb-4">
          {product.variants.map((variant: any) => {
            const isPerfectFit =
              product.category_id &&
              preferences.some(
                (p) =>
                  p.category_id === product.category_id &&
                  !p.is_custom &&
                  p.standard_size === variant.size,
              );
            const isSelected = !useCustomSize && selectedVariantId === variant.id;
            const isDisabled = variant.quantity <= 0;

            return (
              <TouchableOpacity
                key={variant.id}
                disabled={isDisabled}
                onPress={() => {
                  setSelectedVariantId(variant.id);
                  setUseCustomSize(false);
                }}
                className={`mr-2 mb-2 pt-3 pb-2 px-4 rounded-xl border-2 ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : isDisabled
                      ? "border-divider bg-slate-50 opacity-50"
                      : "border-divider bg-white"
                }`}
              >
                {isPerfectFit && (
                  <View className="absolute top-0 right-0 bg-primary px-1 py-0.5 rounded-bl-lg">
                    <Ionicons name="star" size={8} color="white" />
                  </View>
                )}
                <Text
                  className={`font-bold text-base text-center ${isSelected ? "text-primary" : "text-text-primary"}`}
                >
                  {variant.size}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {product.accepts_custom_size && (
        <View className="bg-white rounded-2xl border border-divider overflow-hidden">
          <TouchableOpacity
            className="flex-row items-center p-4 bg-slate-50 border-b border-divider"
            onPress={() => setUseCustomSize(!useCustomSize)}
          >
            <View
              className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${useCustomSize ? "bg-primary border-primary" : "border-slate-300 bg-white"}`}
            >
              {useCustomSize && (
                <View className="w-2.5 h-2.5 bg-white rounded-full" />
              )}
            </View>
            <View className="flex-1">
              <Text className="font-bold text-text-primary text-base">
                Custom Made to Order
              </Text>
              <Text className="text-text-secondary text-xs mt-0.5">
                We'll craft this perfectly to your measurements.
              </Text>
            </View>
            {product.custom_size_price && (
              <View className="bg-primary/10 px-2 py-1 rounded-md">
                <Text className="text-primary font-bold text-xs">
                  + ₹{product.custom_size_price}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {useCustomSize && (
            <View className="p-4">
              {customProfiles.length > 0 ? (
                <View className="space-y-4">
                  <Text className="text-xs text-text-hint font-bold uppercase tracking-widest">
                    Select Custom Size Profile
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {customProfiles.map((p: any) => {
                      const isSelected = (selectedCustomProfileId || customProfiles[0]?.id) === p.id;
                      return (
                        <TouchableOpacity
                          key={p.id}
                          onPress={() => setSelectedCustomProfileId(p.id)}
                          className={`mr-3 px-4 py-3 rounded-2xl border-2 ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-divider bg-slate-50"
                          }`}
                        >
                          <View className="flex-row items-center">
                            <Ionicons
                              name="person-outline"
                              size={14}
                              color={isSelected ? "#e11d48" : "#64748B"}
                            />
                            <Text
                              className={`text-sm font-bold ml-1.5 ${
                                isSelected ? "text-primary" : "text-text-primary"
                              }`}
                            >
                              {p.profile_name || "Custom Profile"}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Selected Custom Profile Measurements Breakdown */}
                  {activeCustomProfile && activeCustomProfile.custom_measurements && Object.keys(activeCustomProfile.custom_measurements).length > 0 && (
                    <View className="bg-slate-50 p-4 rounded-2xl border border-divider mt-2">
                      <View className="flex-row items-center justify-between mb-2 pb-2 border-b border-divider/60">
                        <Text className="text-xs font-bold text-text-primary">
                          Measurements for {activeCustomProfile.profile_name || "Custom Fit"}
                        </Text>
                        <TouchableOpacity onPress={() => router.push("/(tabs)/size-preferences" as any)}>
                          <Text className="text-xs font-bold text-primary">Edit</Text>
                        </TouchableOpacity>
                      </View>
                      <View className="space-y-1.5">
                        {Object.entries(activeCustomProfile.custom_measurements as Record<string, string>).map(([key, val]) => (
                          <View key={key} className="flex-row justify-between items-center">
                            <Text className="text-xs text-text-secondary capitalize">{key.replace(/_/g, ' ')}</Text>
                            <Text className="text-xs font-bold text-text-primary">{val}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View className="items-center bg-primary/5 p-4 rounded-2xl border border-dashed border-primary/30">
                  <Ionicons name="cut-outline" size={24} color="#e11d48" />
                  <Text className="text-text-secondary text-center text-sm font-medium my-3">
                    No custom measurements saved for this category.
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/(tabs)/size-preferences" as any)}
                    className="bg-primary px-5 py-2.5 rounded-full"
                  >
                    <Text className="text-white font-bold text-xs">
                      Add Measurements Now
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
