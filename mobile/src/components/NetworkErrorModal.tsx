import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useApiErrorBus } from "@/src/api/errorBus";
import { getCachedApiBaseUrl, getCachedApiSource } from "@/src/api/config";

export default function NetworkErrorModal() {
  const router = useRouter();
  const { currentError, isRetrying, dismiss, retry } = useApiErrorBus();

  // Show the modal while a retry is in flight so the user sees progress.
  const visible = !!currentError || isRetrying;

  const handleRetry = () => {
    retry();
  };

  const handleFixUrl = () => {
    dismiss();
    router.push("/server-settings" as any);
  };

  const handleDismiss = () => {
    dismiss();
  };

  if (!visible) return null;

  const error = currentError?.apiError;
  const failedUrl = currentError?.failedUrl || getCachedApiBaseUrl();
  const source = getCachedApiSource();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleDismiss}>
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
          <Text className="text-sm text-text-secondary text-center leading-5 mb-4">
            {isRetrying
              ? "Reconnecting to the server. Please wait…"
              : error?.message}
          </Text>

          {error?.statusCode ? (
            <View className="bg-slate-100 rounded-xl px-3 py-2 flex-row items-center justify-center mb-2">
              <Ionicons name="alert-circle-outline" size={15} color="#64748b" />
              <Text className="text-xs font-bold text-slate-600 ml-1.5">
                HTTP {error.statusCode} · {error.type}
              </Text>
            </View>
          ) : error?.type ? (
            <View className="bg-slate-100 rounded-xl px-3 py-2 flex-row items-center justify-center mb-2">
              <Ionicons name="alert-circle-outline" size={15} color="#64748b" />
              <Text className="text-xs font-bold text-slate-600 ml-1.5">
                {error.type}
              </Text>
            </View>
          ) : null}

          <View className="bg-error/5 rounded-xl px-3 py-2 mb-5">
            <Text className="text-[10px] font-bold text-text-hint uppercase tracking-wide mb-0.5">
              Server ({source})
            </Text>
            <Text className="text-xs text-slate-600" numberOfLines={2}>
              {failedUrl}
            </Text>
          </View>

          {isRetrying ? (
            <TouchableOpacity
              disabled
              className="bg-primary rounded-2xl py-3.5 items-center mb-2 opacity-60"
            >
              <ActivityIndicator color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleRetry}
              className="bg-primary rounded-2xl py-3.5 items-center mb-2"
            >
              <Text className="text-white font-bold text-sm">Retry</Text>
            </TouchableOpacity>
          )}

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleFixUrl}
              className="flex-1 bg-primary/10 border border-primary/20 rounded-2xl py-3.5 items-center"
            >
              <Text className="text-primary font-bold text-sm">Fix Server URL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDismiss}
              className="flex-1 bg-slate-100 rounded-2xl py-3.5 items-center"
            >
              <Text className="text-slate-600 font-bold text-sm">Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
