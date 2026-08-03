import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApiErrorBus } from "@/src/api/errorBus";

export default function NetworkErrorModal() {
  const { currentError, isRetrying, dismiss, retry } = useApiErrorBus();

  // Show the modal while a retry is in flight so the user sees progress.
  const visible = !!currentError || isRetrying;

  if (!visible) return null;

  const error = currentError?.apiError;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-xl">
          <View className="w-14 h-14 rounded-full bg-error/10 items-center justify-center mb-4 self-center">
            <Ionicons name="cloud-offline-outline" size={28} color="#ef4444" />
          </View>

          <Text className="text-lg font-bold text-text-primary text-center mb-1">
            {isRetrying
              ? "Retrying…"
              : error?.title || "Unable to fetch data"}
          </Text>
          <Text className="text-sm text-text-secondary text-center leading-5 mb-6">
            {isRetrying
              ? "Reconnecting to the server. Please wait…"
              : error?.message}
          </Text>

          {isRetrying ? (
            <TouchableOpacity
              disabled
              className="bg-primary rounded-2xl py-3.5 items-center opacity-60"
            >
              <ActivityIndicator color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={retry}
              className="bg-primary rounded-2xl py-3.5 items-center mb-2"
            >
              <Text className="text-white font-bold text-sm">Retry</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={dismiss}
            className="bg-slate-100 rounded-2xl py-3.5 items-center"
          >
            <Text className="text-slate-600 font-bold text-sm">Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
