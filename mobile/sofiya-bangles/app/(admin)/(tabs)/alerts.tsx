import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getOverviewAnalytics } from '../../../src/api/admin';

export default function AdminAlerts() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    // For now just simulate fetching recent alerts or low stock warnings
    setTimeout(() => {
      setAlerts([
        { id: '1', title: 'Low Stock Alert', message: 'Product "Ruby Bangle" is running low on stock.', date: new Date().toISOString(), type: 'warning' },
        { id: '2', title: 'New User Signup', message: '5 new users signed up today.', date: new Date().toISOString(), type: 'info' }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <View className="px-4 py-4 border-b border-slate-100 bg-white">
        <Text className="text-2xl font-extrabold text-[#90132B] font-serif">Alerts</Text>
      </View>
      
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF1F4B" />
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View className="bg-white p-4 rounded-2xl mb-4 shadow-sm border border-slate-100 flex-row items-center">
              <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${item.type === 'warning' ? 'bg-orange-100' : 'bg-blue-100'}`}>
                <Ionicons name={item.type === 'warning' ? 'warning-outline' : 'information-circle-outline'} size={24} color={item.type === 'warning' ? '#ea580c' : '#2563eb'} />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-slate-800 text-base">{item.title}</Text>
                <Text className="text-slate-500 mt-1">{item.message}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
             <View className="items-center justify-center py-20">
               <Ionicons name="notifications-off-outline" size={64} color="#cbd5e1" />
               <Text className="text-slate-400 mt-4 text-base font-medium">No alerts at the moment</Text>
             </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
