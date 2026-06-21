import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState('All');
  const insets = useSafeAreaInsets();
  
  const notifications = [
    { 
      id: '1', 
      title: 'New Arrivals!', 
      desc: 'Bridal collection just dropped — 5 new pieces added',
      time: '2 min ago', 
      icon: 'sparkles-outline',
      isRead: false 
    },
    { 
      id: '2', 
      title: 'WhatsApp Inquiry Sent', 
      desc: 'Your inquiry for Bridal Gold Bangle Set was sent successfully',
      time: '1 hr ago', 
      icon: 'chatbubble-ellipses-outline',
      isRead: true 
    },
    { 
      id: '3', 
      title: 'Special Offer', 
      desc: 'Get 15% off on Glass Bangles today only!',
      time: '3 hrs ago', 
      icon: 'pricetag-outline',
      isRead: false 
    },
    { 
      id: '4', 
      title: 'Stock Alert', 
      desc: 'Stone Studded Cuff is almost sold out — only 3 left!',
      time: '1 day ago', 
      icon: 'cube-outline',
      isRead: true 
    },
  ];

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="px-6 pb-6 bg-[#FFF0F3]" style={{ paddingTop: Math.max(insets.top + 16, 40) }}>
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-3xl font-extrabold text-[#90132B]">Notifications 🔔</Text>
          <TouchableOpacity>
            <Text className="text-[#FF1F4B] font-bold text-sm">Mark all read</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-slate-500 text-sm mb-5">Stay updated on your orders & offers</Text>

        <View className="flex-row gap-3">
          <TouchableOpacity 
            onPress={() => setActiveTab('All')}
            className={`px-6 py-2 rounded-full ${activeTab === 'All' ? 'bg-[#FF1F4B]' : 'bg-transparent'}`}
          >
            <Text className={`font-bold ${activeTab === 'All' ? 'text-white' : 'text-[#FF1F4B]'}`}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('Offers')}
            className={`px-6 py-2 rounded-full ${activeTab === 'Offers' ? 'bg-[#FF1F4B]' : 'bg-transparent'}`}
          >
            <Text className={`font-bold ${activeTab === 'Offers' ? 'text-white' : 'text-[#FF1F4B]'}`}>Offers</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {notifications.map((notif) => (
          <TouchableOpacity 
            key={notif.id} 
            className="bg-white p-4 rounded-2xl mb-4 shadow-sm flex-row items-center border border-slate-100"
            style={{ borderLeftWidth: 3, borderLeftColor: notif.isRead ? 'transparent' : '#FF1F4B' }}
          >
            <View className="w-12 h-12 rounded-full bg-[#FF1F4B] items-center justify-center mr-4">
              <Ionicons name={notif.icon as any} size={20} color="white" />
            </View>
            
            <View className="flex-1">
              <View className="flex-row justify-between items-start mb-1">
                <Text className="text-base font-bold text-slate-800">{notif.title}</Text>
                {!notif.isRead && <View className="w-2 h-2 rounded-full bg-[#FF1F4B] mt-1" />}
              </View>
              <Text className="text-slate-500 text-sm leading-5 mb-1">{notif.desc}</Text>
              <Text className="text-slate-400 text-xs font-medium">{notif.time}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
