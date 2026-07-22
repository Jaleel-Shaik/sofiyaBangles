import { View, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Typography as Text } from '@/src/components/ui/Typography';
import { Button } from '@/src/components/ui/Button';
import TextInputField from '@/src/components/TextInputField';

export default function SecuritySettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactor, setTwoFactor] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      router.back();
    }, 800);
  };

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
            <Text variant="body-sm" className="text-slate-500 font-medium uppercase tracking-wider mb-0.5">Admin Preferences</Text>
            <Text variant="title-lg" weight="extrabold" className="text-slate-900">Security</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        <Text variant="body-sm" weight="bold" className="text-slate-500 mb-3 ml-1 tracking-wider uppercase">Authentication</Text>
        
        <View className="bg-white p-5 rounded-3xl border border-slate-100 mb-8 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1 pr-4">
              <View className="w-10 h-10 bg-emerald-50 rounded-full items-center justify-center mr-3 border border-emerald-100">
                <Ionicons name="shield-checkmark" size={20} color="#10b981" />
              </View>
              <View>
                <Text variant="body-md" weight="bold" className="text-slate-800">Two-Factor Auth</Text>
                <Text variant="body-sm" className="text-slate-500 mt-0.5">Require OTP for login</Text>
              </View>
            </View>
            <Switch 
              value={twoFactor} 
              onValueChange={setTwoFactor}
              trackColor={{ false: '#cbd5e1', true: '#6ee7b7' }}
              thumbColor={twoFactor ? '#10b981' : '#f8fafc'}
            />
          </View>
          {twoFactor && (
            <View className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 mt-2">
              <Text variant="body-sm" className="text-emerald-700 text-center">
                2FA is currently enabled for this admin account.
              </Text>
            </View>
          )}
        </View>

        <Text variant="body-sm" weight="bold" className="text-slate-500 mb-3 ml-1 tracking-wider uppercase">Change Password</Text>
        <View className="bg-white p-5 rounded-3xl border border-slate-100 mb-8 shadow-sm">
          <TextInputField 
            label="Current Password" 
            placeholder="Enter current password" 
            value={currentPassword} 
            onChangeText={setCurrentPassword} 
            secureTextEntry 
          />
          <TextInputField 
            label="New Password" 
            placeholder="Enter new password" 
            value={newPassword} 
            onChangeText={setNewPassword} 
            secureTextEntry 
          />
          <TextInputField 
            label="Confirm New Password" 
            placeholder="Re-enter new password" 
            value={confirmPassword} 
            onChangeText={setConfirmPassword} 
            secureTextEntry 
          />
          
          <Button 
            title="Update Password" 
            onPress={() => {}}
            variant="outline"
            className="mt-2"
          />
        </View>

        <Text variant="body-sm" weight="bold" className="text-slate-500 mb-3 ml-1 tracking-wider uppercase">Active Sessions</Text>
        <View className="bg-white rounded-3xl border border-slate-100 mb-8 shadow-sm overflow-hidden">
          <View className="p-4 flex-row items-center border-b border-slate-50">
            <Ionicons name="phone-portrait-outline" size={24} color="#64748b" className="mr-4" />
            <View className="flex-1 mr-3">
              <Text variant="body-md" weight="bold" className="text-slate-800">iPhone 14 Pro Max</Text>
              <Text variant="body-sm" className="text-slate-500">Current Device • Mumbai, India</Text>
            </View>
            <View className="w-2 h-2 rounded-full bg-emerald-500" />
          </View>
          <View className="p-4 flex-row items-center">
            <Ionicons name="laptop-outline" size={24} color="#94a3b8" className="mr-4" />
            <View className="flex-1 mr-3">
              <Text variant="body-md" weight="bold" className="text-slate-500">MacBook Pro</Text>
              <Text variant="body-sm" className="text-slate-400">Last active 2 days ago</Text>
            </View>
            <TouchableOpacity>
              <Text variant="body-sm" weight="bold" className="text-rose-500">Revoke</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="h-10" />
      </ScrollView>

      <View className="p-5 bg-white border-t border-slate-100 pb-8">
        <Button 
          title="Save Settings" 
          onPress={handleSave} 
          loading={saving}
          variant="primary"
          fullWidth
        />
      </View>
    </View>
  );
}
