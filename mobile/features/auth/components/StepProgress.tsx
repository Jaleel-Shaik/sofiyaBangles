import React from "react";
import { View } from "react-native";

export interface StepProgressProps {
  current: number;
  total: number;
}

export const StepProgress: React.FC<StepProgressProps> = ({ current, total }) => (
  <View className="flex-row items-center justify-center gap-2 mb-6">
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        className={`h-1.5 rounded-full transition-all ${
          i < current
            ? "w-8 bg-[#FF1F4B]"
            : i === current
              ? "w-8 bg-[#FF1F4B]"
              : "w-3 bg-rose-200"
        }`}
      />
    ))}
  </View>
);
