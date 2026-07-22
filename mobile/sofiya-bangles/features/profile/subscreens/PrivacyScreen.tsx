import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View 
        className="px-6 pb-6 bg-white shadow-sm flex-row items-center border-b border-slate-100"
        style={{ paddingTop: Math.max(insets.top + 8, 40) }}
      >
        <TouchableOpacity 
          className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-4"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-800">Privacy Policy</Text>
      </View>
      
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <View className="bg-slate-50 p-6 rounded-3xl mb-6">
          <Ionicons name="shield-checkmark" size={32} color="#64748b" className="mb-4" />
          <Text className="text-xl font-extrabold text-slate-800 mb-2">Your Data is Safe</Text>
          <Text className="text-slate-500 leading-5">
            We are committed to protecting your personal information and your right to privacy.
          </Text>
        </View>

        <View className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6">
          <Text className="text-lg font-bold text-slate-800 mb-2">1. Information We Collect</Text>
          <Text className="text-slate-600 leading-5 mb-4">
            We collect personal information that you provide to us such as name, address, contact information, passwords and security data, and payment information when you place an order.
          </Text>

          <Text className="text-lg font-bold text-slate-800 mb-2">2. How We Use Your Data</Text>
          <Text className="text-slate-600 leading-5 mb-4">
            We use your data primarily to fulfill your orders, provide customer support, and improve our services. We may also use it to send you promotional communications if you have opted in.
          </Text>

          <Text className="text-lg font-bold text-slate-800 mb-2">3. Will Your Information Be Shared?</Text>
          <Text className="text-slate-600 leading-5 mb-4">
            We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. We never sell your data to third parties.
          </Text>

          <Text className="text-lg font-bold text-slate-800 mb-2">4. How Long Do We Keep Your Data?</Text>
          <Text className="text-slate-600 leading-5">
            We keep your information for as long as necessary to fulfill the purposes outlined in this privacy notice unless otherwise required by law.
          </Text>
        </View>

        <Text className="text-center text-slate-400 text-xs mb-10">Last Updated: June 2026</Text>
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
