import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { getOverviewAnalytics } from '../../../src/api/admin';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getOverviewAnalytics();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch analytics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <View>
            <Text className="text-2xl font-extrabold text-[#90132B] font-serif">Admin Dashboard</Text>
            <Text className="text-sm text-slate-500 mt-1">Welcome back! Here's what's happening.</Text>
          </View>
          <TouchableOpacity className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
            <Ionicons name="notifications-outline" size={20} color="#FF1F4B" />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <Text className="text-lg font-bold text-slate-800 mb-4">Overview</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#FF1F4B" />
        ) : (
          <View className="flex-row flex-wrap justify-between mb-8">
            <StatCard 
              title="Total Products" 
              value={stats?.totalProducts?.toString() || "0"} 
              icon="cube-outline" 
              color="#3b82f6" 
            />
            <StatCard 
              title="Active Users" 
              value={stats?.totalUsers?.toString() || "0"} 
              icon="people-outline" 
              color="#10b981" 
            />
            <StatCard 
              title="Total Favorites" 
              value={stats?.totalFavorites?.toString() || "0"} 
              icon="heart-outline" 
              color="#f43f5e" 
            />
            <StatCard 
              title="Categories" 
              value={stats?.totalCategories?.toString() || "0"} 
              icon="list-outline" 
              color="#f59e0b" 
            />
          </View>
        )}

        {/* Quick Actions */}
        <Text className="text-lg font-bold text-slate-800 mb-4">Quick Actions</Text>
        <View className="flex-row space-x-4 mb-8">
          <TouchableOpacity 
            className="flex-1 bg-[#FF1F4B] p-4 rounded-2xl items-center shadow-sm"
            onPress={() => router.push('/(admin)/add-product' as any)}
          >
            <Ionicons name="add-circle-outline" size={24} color="white" />
            <Text className="text-white font-bold mt-2">Add Product</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1 bg-white p-4 rounded-2xl items-center shadow-sm border border-slate-100"
            onPress={() => router.push('/(admin)/(tabs)/products' as any)}
          >
            <Ionicons name="cube-outline" size={24} color="#90132B" />
            <Text className="text-[#90132B] font-bold mt-2">Manage</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string, icon: any, color: string }) {
  return (
    <View className="w-[48%] bg-white p-4 rounded-2xl shadow-sm mb-4 border border-slate-50">
      <View className={`w-10 h-10 rounded-full items-center justify-center mb-3`} style={{ backgroundColor: `${color}15` }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text className="text-2xl font-extrabold text-slate-800">{value}</Text>
      <Text className="text-sm text-slate-500 font-medium mt-1">{title}</Text>
    </View>
  );
}
