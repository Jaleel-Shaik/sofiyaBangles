import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { AppIcon } from "@/src/constants/icons";
import { STRINGS } from "@/src/constants/strings";

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

  if (!product?.has_variants && !product?.accepts_custom_size) return null;

  const safeVariants = Array.isArray(product?.variants) ? product.variants : [];
  const safePreferences = Array.isArray(preferences) ? preferences : [];
  const safeCustomProfiles = Array.isArray(customProfiles) ? customProfiles : [];

  return (
    <View className="mb-5 pt-4 border-t border-divider">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-base font-bold text-text-primary">
          {productModelTypeName ? STRINGS.productDetail.modelSizesTitle(productModelTypeName) : STRINGS.productDetail.selectSizeTitle}
        </Text>
      </View>

      {product?.has_variants && safeVariants.length > 0 && (
        <View className="flex-row flex-wrap mb-4">
          {safeVariants.map((variant: any) => {
            const isPerfectFit =
              product?.category_id &&
              safePreferences.some(
                (p) =>
                  p &&
                  p.category_id === product.category_id &&
                  !p.is_custom &&
                  p.standard_size === variant?.size,
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
                    <AppIcon name="star" size={8} color="white" />
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
                {STRINGS.productDetail.customMadeToOrder}
              </Text>
              <Text className="text-text-secondary text-xs mt-0.5">
                {STRINGS.productDetail.customMadeToOrderSubtitle}
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
              {safeCustomProfiles.length > 0 ? (
                <View className="space-y-4">
                  <Text className="text-xs text-text-hint font-bold uppercase tracking-widest">
                    {STRINGS.productDetail.selectProfileTitle}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {safeCustomProfiles.map((p: any) => {
                      const isSelected = (selectedCustomProfileId || safeCustomProfiles[0]?.id) === p?.id;
                      return (
                        <TouchableOpacity
                          key={p?.id || 'profile-default'}
                          onPress={() => setSelectedCustomProfileId(p?.id)}
                          className={`mr-3 px-4 py-3 rounded-2xl border-2 ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-divider bg-slate-50"
                          }`}
                        >
                          <View className="flex-row items-center">
                            <AppIcon
                              name="personOutline"
                              size={14}
                              color={isSelected ? "#e11d48" : "#64748B"}
                            />
                            <Text
                              className={`text-sm font-bold ml-1.5 ${
                                isSelected ? "text-primary" : "text-text-primary"
                              }`}
                            >
                              {p?.profile_name || STRINGS.productDetail.defaultProfileName}
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
                          {STRINGS.productDetail.customFitTitle(activeCustomProfile.profile_name || STRINGS.productDetail.defaultProfileName)}
                        </Text>
                        <TouchableOpacity onPress={() => router.push("/(tabs)/size-preferences" as any)}>
                          <Text className="text-xs font-bold text-primary">{STRINGS.common.edit}</Text>
                        </TouchableOpacity>
                      </View>
                      <View className="space-y-1.5">
                        {Object.entries((activeCustomProfile.custom_measurements || {}) as Record<string, string>).map(([key, val]) => (
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
                  <AppIcon name="cutOutline" size={24} color="#e11d48" />
                  <Text className="text-text-secondary text-center text-sm font-medium my-3">
                    {STRINGS.productDetail.noCustomMeasurements}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/(tabs)/size-preferences" as any)}
                    className="bg-primary px-5 py-2.5 rounded-full"
                  >
                    <Text className="text-white font-bold text-xs">
                      {STRINGS.productDetail.addMeasurementsNow}
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
