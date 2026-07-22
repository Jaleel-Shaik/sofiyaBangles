import { View, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Typography as Text } from '@/src/components/ui/Typography';
import { Button } from '@/src/components/ui/Button';

export default function OrderAlertsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  
  const [alerts, setAlerts] = useState({
    pushOrders: true,
    pushMessages: true,
    emailDaily: false,
    emailWeekly: true,
    soundAlerts: true,
    vibration: true
  });

  const toggleAlert = (key: keyof typeof alerts) => {
    setAlerts(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      router.back();
    }, 800);
  };

  const AlertItem = ({ title, subtitle, icon, iconBg, iconColor, value, onToggle }: any) => (
    <View className="flex-row items-center p-4 border-b border-slate-50">
      <View className={`w-12 h-12 rounded-2xl ${iconBg} items-center justify-center mr-4 border border-white shadow-sm`}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View className="flex-1 mr-4">
        <Text variant="body-md" weight="bold" className="text-slate-800 mb-0.5">{title}</Text>
        <Text variant="body-sm" className="text-slate-500">{subtitle}</Text>
      </View>
      <Switch 
        value={value} 
        onValueChange={onToggle}
        trackColor={{ false: '#cbd5e1', true: '#fecdd3' }}
        thumbColor={value ? '#e11d48' : '#f8fafc'}
      />
    </View>
  );

  return (
    <View className="flex-1 bg-slate-50">
      <View 
        className="px-6 pb-6 bg-white rounded-b-[32px] shadow-sm flex-row items-center justify-between z-10 border-b border-slate-100"
        style={{ paddingTop: Math.max(insets.top + 16, 40) }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity 
            className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-4 border border-slate-100"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#334155" />
          </TouchableOpacity>
          <View>
            <Text variant="body-sm" className="text-amber-600 font-medium uppercase tracking-wider mb-0.5">Admin Preferences</Text>
            <Text variant="title-lg" weight="extrabold" className="text-slate-900">Order Alerts</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        <Text variant="body-sm" weight="bold" className="text-slate-500 mb-3 ml-1 tracking-wider uppercase">Push Notifications</Text>
        <View className="bg-white rounded-3xl border border-slate-100 mb-8 overflow-hidden shadow-sm">
          <AlertItem 
            title="New Orders" 
            subtitle="Get notified instantly when a customer places an order"
            icon="cart-outline"
            iconBg="bg-rose-50"
            iconColor="#e11d48"
            value={alerts.pushOrders}
            onToggle={() => toggleAlert('pushOrders')}
          />
          <AlertItem 
            title="Customer Messages" 
            subtitle="Alerts for support inquiries"
            icon="chatbubble-ellipses-outline"
            iconBg="bg-indigo-50"
            iconColor="#6366f1"
            value={alerts.pushMessages}
            onToggle={() => toggleAlert('pushMessages')}
          />
        </View>

        <Text variant="body-sm" weight="bold" className="text-slate-500 mb-3 ml-1 tracking-wider uppercase">App Experience</Text>
        <View className="bg-white rounded-3xl border border-slate-100 mb-8 overflow-hidden shadow-sm">
          <AlertItem 
            title="Sound Alerts" 
            subtitle="Play a chime for new incoming orders"
            icon="volume-high-outline"
            iconBg="bg-amber-50"
            iconColor="#f59e0b"
            value={alerts.soundAlerts}
            onToggle={() => toggleAlert('soundAlerts')}
          />
          <AlertItem 
            title="Haptic Vibration" 
            subtitle="Vibrate device on important alerts"
            icon="phone-portrait-outline"
            iconBg="bg-slate-50"
            iconColor="#64748b"
            value={alerts.vibration}
            onToggle={() => toggleAlert('vibration')}
          />
        </View>

        <Text variant="body-sm" weight="bold" className="text-slate-500 mb-3 ml-1 tracking-wider uppercase">Email Summaries</Text>
        <View className="bg-white rounded-3xl border border-slate-100 mb-8 overflow-hidden shadow-sm">
          <AlertItem 
            title="Daily Digest" 
            subtitle="Sales and activity summary every evening"
            icon="mail-unread-outline"
            iconBg="bg-emerald-50"
            iconColor="#10b981"
            value={alerts.emailDaily}
            onToggle={() => toggleAlert('emailDaily')}
          />
          <AlertItem 
            title="Weekly Report" 
            subtitle="Comprehensive performance analytics"
            icon="bar-chart-outline"
            iconBg="bg-blue-50"
            iconColor="#3b82f6"
            value={alerts.emailWeekly}
            onToggle={() => toggleAlert('emailWeekly')}
          />
        </View>

        <View className="h-10" />
      </ScrollView>
      
      <View className="p-5 bg-white border-t border-slate-100 pb-8">
        <Button 
          title="Save Preferences" 
          onPress={handleSave} 
          loading={saving}
          variant="primary"
          fullWidth
        />
      </View>
    </View>
  );
}
