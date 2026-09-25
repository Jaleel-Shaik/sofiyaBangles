import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  showText?: boolean;
  badge?: boolean;
  style?: object;
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 16,
  interactive = false,
  onChange,
  showText = true,
  badge = false,
  style,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const activeRating = hoverRating !== null ? hoverRating : rating;

  const renderStars = () => {
    return Array.from({ length: maxStars }).map((_, index) => {
      const starValue = index + 1;
      const isFilled = starValue <= activeRating;
      const isHalf = !isFilled && starValue - 0.5 <= activeRating;

      const starIconName = isFilled
        ? "star"
        : isHalf
        ? "star-half"
        : "star-outline";

      const starColor = isFilled || isHalf ? "#f59e0b" : "#cbd5e1";

      if (interactive) {
        return (
          <TouchableOpacity
            key={index}
            activeOpacity={0.7}
            onPress={() => onChange && onChange(starValue)}
            style={{ paddingHorizontal: 2 }}
          >
            <Ionicons name={starIconName} size={size} color={starColor} />
          </TouchableOpacity>
        );
      }

      return (
        <View key={index} style={{ paddingHorizontal: 1 }}>
          <Ionicons name={starIconName} size={size} color={starColor} />
        </View>
      );
    });
  };

  const content = (
    <View style={[styles.container, style]}>
      <View style={styles.starsRow}>{renderStars()}</View>
      {showText && (
        <Text style={[styles.ratingText, { fontSize: Math.max(10, size - 4) }]}>
          {Number(rating).toFixed(1).replace(/\.0$/, "")}/{maxStars}
        </Text>
      )}
    </View>
  );

  if (badge) {
    return <View style={styles.badgeContainer}>{content}</View>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontWeight: "800",
    color: "#78350f",
    marginLeft: 4,
  },
  badgeContainer: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
});
