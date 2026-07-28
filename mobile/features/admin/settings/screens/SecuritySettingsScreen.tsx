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
    <View className="flex-1 bg-background">
      <View 
        className="px-5 pb-6 bg-surface shadow-sm flex-row items-center justify-between z-10 border-b border-divider"
        style={{ paddingTop: Math.max(insets.top + 16, 40) }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity 
            className="mr-4"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <Text variant="body-sm" className="text-text-secondary font-medium uppercase tracking-wider mb-0.5">Admin Preferences</Text>
            <Text variant="title-lg" weight="bold" className="text-text-primary">Security</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        <Text variant="body-sm" weight="bold" className="text-text-secondary mb-3 ml-1 tracking-wider uppercase">Authentication</Text>
        
        <View className="bg-surface p-5 rounded-2xl border border-divider mb-8 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1 pr-4">
              <View className="w-10 h-10 bg-primary/5 rounded-full items-center justify-center mr-3 border border-primary/10">
                <Ionicons name="shield-checkmark" size={20} color="#e11d48" />
              </View>
              <View>
                <Text variant="body-md" weight="bold" className="text-text-primary">Two-Factor Auth</Text>
                <Text variant="body-sm" className="text-text-secondary mt-0.5">Require OTP for login</Text>
              </View>
            </View>
            <Switch 
              value={twoFactor} 
              onValueChange={setTwoFactor}
              trackColor={{ false: '#cbd5e1', true: '#fecdd3' }}
              thumbColor={twoFactor ? '#e11d48' : '#f8fafc'}
            />
          </View>
          {twoFactor && (
            <View className="bg-primary/5 p-3 rounded-2xl border border-primary/10 mt-2">
              <Text variant="body-sm" className="text-primary text-center">
                2FA is currently enabled for this admin account.
              </Text>
            </View>
          )}
        </View>

        <Text variant="body-sm" weight="bold" className="text-text-secondary mb-3 ml-1 tracking-wider uppercase">Change Password</Text>
        <View className="bg-surface p-5 rounded-2xl border border-divider mb-8 shadow-sm">
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

        <Text variant="body-sm" weight="bold" className="text-text-secondary mb-3 ml-1 tracking-wider uppercase">Active Sessions</Text>
        <View className="bg-surface rounded-2xl border border-divider mb-8 shadow-sm overflow-hidden">
          <View className="p-4 flex-row items-center border-b border-divider">
            <Ionicons name="phone-portrait-outline" size={24} color="#64748b" className="mr-4" />
            <View className="flex-1 mr-3">
              <Text variant="body-md" weight="bold" className="text-text-primary">iPhone 14 Pro Max</Text>
              <Text variant="body-sm" className="text-text-secondary">Current Device • Mumbai, India</Text>
            </View>
            <View className="w-2 h-2 rounded-full bg-emerald-500" />
          </View>
          <View className="p-4 flex-row items-center">
            <Ionicons name="laptop-outline" size={24} color="#94a3b8" className="mr-4" />
            <View className="flex-1 mr-3">
              <Text variant="body-md" weight="bold" className="text-text-secondary">MacBook Pro</Text>
              <Text variant="body-sm" className="text-text-hint">Last active 2 days ago</Text>
            </View>
            <TouchableOpacity>
              <Text variant="body-sm" weight="bold" className="text-primary">Revoke</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="h-10" />
      </ScrollView>

      <View className="p-5 bg-surface border-t border-divider pb-8">
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
