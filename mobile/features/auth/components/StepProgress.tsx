import React from "react";
import { View } from "react-native";

export interface StepProgressProps {
  current: number;
  total: number;
}

export const StepProgress: React.FC<StepProgressProps> = ({ current, total }) => (
  <View className="flex-row items-center justify-center gap-2 mb-5">
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        className={`h-1.5 rounded-full ${
          i <= current ? "w-8 bg-primary" : "w-3 bg-slate-200"
        }`}
      />
    ))}
  </View>
);
