import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { AppIcon } from "@/src/constants/icons";
import { STRINGS } from "@/src/constants/strings";
import { StarRating } from "@/src/components/StarRating";

interface ProductReviewSectionProps {
  reviews: any[];
  fromOrders: string | string[] | undefined;
  reviewRating: number;
  setReviewRating: (val: number) => void;
  reviewText: string;
  setReviewText: (val: string) => void;
  damageDetails: string;
  setDamageDetails: (val: string) => void;
  isReviewSubmitting: boolean;
  reviewSubmitted: boolean;
  handleSubmitReview: () => void;
}

export function ProductReviewSection({
  reviews,
  fromOrders,
  reviewRating,
  setReviewRating,
  reviewText,
  setReviewText,
  damageDetails,
  setDamageDetails,
  isReviewSubmitting,
  reviewSubmitted,
  handleSubmitReview,
}: ProductReviewSectionProps) {
  const safeReviews = Array.isArray(reviews) ? reviews.filter(Boolean) : [];

  return (
    <View>
      <View className="mb-6 pt-4 border-t border-divider">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-base font-bold text-text-primary">{STRINGS.productDetail.reviewsTitle}</Text>
          <Text className="text-xs text-text-secondary">{STRINGS.productDetail.reviewCount(safeReviews.length)}</Text>
        </View>
        {safeReviews.length > 0 ? (
          safeReviews.map((review) => {
            const reviewerName = review.user_name || "Verified Buyer";
            const initial = reviewerName.charAt(0).toUpperCase() || "C";
            const dateStr = review.created_at
              ? new Date(review.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : null;

            return (
              <View
                key={review.id || `review-${Math.random()}`}
                className="mb-3.5 rounded-2xl bg-white p-4 border border-divider shadow-xs"
              >
                {/* Reviewer Header */}
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-1 pr-2">
                    <View className="w-8 h-8 rounded-full bg-rose-100 items-center justify-center mr-2.5">
                      <Text className="text-xs font-bold text-[#C1275A]">{initial}</Text>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <Text className="text-xs font-bold text-slate-900">{reviewerName}</Text>
                        <View className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          <Text className="text-[9px] font-extrabold text-emerald-700">
                            ✓ Verified Buyer
                          </Text>
                        </View>
                      </View>
                      {dateStr && (
                        <Text className="text-[10px] text-slate-400 mt-0.5">{dateStr}</Text>
                      )}
                    </View>
                  </View>

                  {/* Star Rating */}
                  <StarRating rating={review.rating || 5} badge size={13} />
                </View>

                {/* Review Comment */}
                {review.comment ? (
                  <Text className="text-xs text-slate-700 leading-5 mb-1.5">
                    {review.comment}
                  </Text>
                ) : null}

                {/* Customer Suggestion */}
                {review.suggestion ? (
                  <View className="mt-1 p-2 rounded-xl bg-blue-50/60 border border-blue-100 flex-row items-start">
                    <Text className="text-[11px] text-blue-900 leading-4">
                      <Text className="font-bold">💡 Suggestion: </Text>
                      {review.suggestion}
                    </Text>
                  </View>
                ) : null}

                {/* Defect note if reported */}
                {review.damage_details ? (
                  <View className="mt-1 p-2 rounded-xl bg-amber-50/60 border border-amber-200 flex-row items-start">
                    <Text className="text-[11px] text-amber-900 leading-4">
                      <Text className="font-bold">⚠️ Condition Note: </Text>
                      {review.damage_details}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          <View className="py-4 items-center">
            <Text className="text-sm text-text-secondary">{STRINGS.productDetail.noReviews}</Text>
          </View>
        )}
      </View>

      {fromOrders === "true" && (
        <View className="bg-white rounded-2xl border border-primary/20 p-4 mb-6">
          <Text className="text-sm font-bold text-text-primary mb-2">{STRINGS.productDetail.ratePurchaseTitle}</Text>
          <Text className="text-xs text-text-secondary mb-3">{STRINGS.productDetail.ratePurchaseSubtitle}</Text>
          <View className="flex-row items-center mb-3 -ml-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => setReviewRating(value)}
                className="w-11 h-11 items-center justify-center"
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Rate ${value} out of 5 stars`}
              >
                <AppIcon
                  name={value <= reviewRating ? "star" : "starOutline"}
                  size={24}
                  color="#f59e0b"
                />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={reviewText}
            onChangeText={setReviewText}
            placeholder={STRINGS.productDetail.shareExperiencePlaceholder}
            className="border border-divider rounded-2xl px-4 py-3 text-sm text-text-primary mb-3"
            multiline
          />
          <TextInput
            value={damageDetails}
            onChangeText={setDamageDetails}
            placeholder={STRINGS.productDetail.damagePlaceholder}
            className="border border-divider rounded-2xl px-4 py-3 text-sm text-text-primary mb-3"
            multiline
          />
          <TouchableOpacity
            onPress={handleSubmitReview}
            className="bg-primary px-4 py-3 rounded-2xl self-start"
            disabled={isReviewSubmitting}
          >
            {isReviewSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-bold">{STRINGS.productDetail.submitReview}</Text>
            )}
          </TouchableOpacity>
          {reviewSubmitted && (
            <Text className="text-xs text-success mt-2">{STRINGS.productDetail.reviewSaved}</Text>
          )}
        </View>
      )}
    </View>
  );
}
