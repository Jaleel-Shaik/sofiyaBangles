import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { AppIcon } from "@/src/constants/icons";
import { STRINGS } from "@/src/constants/strings";

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
          safeReviews.slice(0, 3).map((review) => (
            <View
              key={review.id || `review-${Math.random()}`}
              className="mb-3 rounded-2xl bg-white p-3 border border-divider"
            >
              <View className="flex-row items-center mb-1">
                {Array.from({ length: Math.max(0, Math.min(5, Math.floor(Number(review.rating) || 0))) }).map((_, index) => (
                  <AppIcon
                    key={index}
                    name="star"
                    size={14}
                    color="#f59e0b"
                  />
                ))}
              </View>
              {review.comment ? (
                <Text className="text-sm text-text-secondary">{review.comment}</Text>
              ) : null}
              {review.damage_details ? (
                <Text className="text-xs text-text-hint mt-1">{STRINGS.productDetail.damageNotePrefix}{review.damage_details}</Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text className="text-sm text-text-secondary">{STRINGS.productDetail.noReviews}</Text>
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
