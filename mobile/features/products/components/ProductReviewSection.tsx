import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  return (
    <View>
      <View className="mb-6 pt-4 border-t border-divider">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-base font-bold text-text-primary">Reviews</Text>
          <Text className="text-xs text-text-secondary">{reviews.length} review(s)</Text>
        </View>
        {reviews.length > 0 ? (
          reviews.slice(0, 3).map((review) => (
            <View
              key={review.id}
              className="mb-3 rounded-2xl bg-white p-3 border border-divider"
            >
              <View className="flex-row items-center mb-1">
                {Array.from({ length: review.rating }).map((_, index) => (
                  <Ionicons
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
                <Text className="text-xs text-text-hint mt-1">Damage note: {review.damage_details}</Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text className="text-sm text-text-secondary">No reviews yet.</Text>
        )}
      </View>

      {fromOrders === "true" && (
        <View className="bg-white rounded-2xl border border-primary/20 p-4 mb-6">
          <Text className="text-sm font-bold text-text-primary mb-2">Rate this purchase</Text>
          <Text className="text-xs text-text-secondary mb-3">Share how it felt and any notes.</Text>
          <View className="flex-row mb-3">
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity key={value} onPress={() => setReviewRating(value)}>
                <Ionicons
                  name={value <= reviewRating ? "star" : "star-outline"}
                  size={22}
                  color="#f59e0b"
                />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="Share your experience with this product"
            className="border border-divider rounded-2xl px-4 py-3 text-sm text-text-primary mb-3"
            multiline
          />
          <TextInput
            value={damageDetails}
            onChangeText={setDamageDetails}
            placeholder="Any damage or issues? (optional)"
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
              <Text className="text-white font-bold">Submit Review</Text>
            )}
          </TouchableOpacity>
          {reviewSubmitted && (
            <Text className="text-xs text-success mt-2">Review saved successfully.</Text>
          )}
        </View>
      )}
    </View>
  );
}
