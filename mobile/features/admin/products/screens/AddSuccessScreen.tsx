import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Button from '@/src/components/Button';

export default function AddProductSuccess() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6">
      <View className="w-24 h-24 bg-success/10 rounded-full items-center justify-center mb-8">
        <Ionicons name="checkmark-circle" size={64} color="#10b981" />
      </View>
      
      <Text className="text-3xl font-bold text-text-primary text-center mb-4">
        Product Added!
      </Text>
      
      <Text className="text-text-secondary text-center text-lg mb-12 px-4">
        Your new product has been successfully added to the catalog and is now live.
      </Text>

      <View className="w-full">
        <Button 
          title="Back to Dashboard" 
          onPress={() => router.replace('/(admin)/(tabs)/dashboard' as any)} 
          className="bg-primary"
        />
        <Button 
          title="Add Another Product" 
          onPress={() => router.replace('/(admin)/(tabs)/add' as any)} 
          variant="outline"
          className="mt-4"
        />
      </View>
    </SafeAreaView>
  );
}
