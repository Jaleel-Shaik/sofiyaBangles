import { Modal, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SuperAdminRestrictionProps {
  visible: boolean;
  onLogout: () => void;
}

export default function SuperAdminRestriction({ visible, onLogout }: SuperAdminRestrictionProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-xl"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 16 }}
        >
          <View className="items-center pt-8 pb-2 px-6">
            <View className="w-20 h-20 bg-amber-50 rounded-full items-center justify-center mb-4 border-2 border-amber-200">
              <Ionicons name="globe-outline" size={36} color="#d97706" />
            </View>
            <Text className="text-xl font-extrabold text-slate-800 text-center" style={{ letterSpacing: -0.5 }}>
              Web Portal Required
            </Text>
            <Text className="text-slate-500 text-sm text-center mt-3 leading-5 px-2">
              Super Admin access is available only on the Web Portal.{'\n'}Please sign in using the web application.
            </Text>
          </View>

          <View className="bg-amber-50 border border-amber-200 mx-6 mt-4 rounded-xl px-4 py-3 flex-row items-start gap-2.5">
            <Ionicons name="information-circle" size={16} color="#d97706" style={{ marginTop: 1 }} />
            <Text className="text-amber-700 text-xs flex-1 leading-5">
              Platform detected: {Platform.OS === 'web' ? 'Web' : Platform.OS === 'ios' ? 'iOS' : 'Android'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onLogout}
            className="mx-6 mt-6 mb-8 bg-[#FF1F4B] rounded-2xl h-14 items-center justify-center flex-row shadow-lg active:opacity-80"
            style={{ shadowColor: '#FF1F4B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text className="text-white font-bold text-base ml-2">OK, Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
