import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createCustomer } from '@/src/api/admin';
import { Typography } from '@/src/components/ui/Typography';
import { colors, touchTargets } from '@/src/theme/tokens';

export interface CreateCustomerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (customer: any) => void;
  initialPhone?: string;
  initialName?: string;
}

export default function CreateCustomerModal({
  visible,
  onClose,
  onSuccess,
  initialPhone = '',
  initialName = '',
}: CreateCustomerModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      const cleanPhone = initialPhone.replace(/\D/g, '');
      setName(initialName || '');
      setPhone(cleanPhone);
      setEmail(cleanPhone.length >= 10 ? `customer_${cleanPhone.slice(-10)}@sofiyabangles.com` : '');
      setPassword('');
      setLoading(false);
    }
  }, [visible, initialPhone, initialName]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter customer full name.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Required Field', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const created = await createCustomer({
        full_name: name.trim(),
        phone: cleanPhone,
        email: email.trim() || `customer_${cleanPhone.slice(-10)}@sofiyabangles.com`,
        password: password.trim() || undefined,
      });

      Alert.alert('Customer Authorized', `Account registered successfully for ${created.full_name}!`);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Could not create customer account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-center items-center p-4">
        <View className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-rose-200">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4 pb-3.5 border-b border-rose-100">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 items-center justify-center mr-3 shadow-xs">
                <Ionicons name="person-add" size={18} color={colors.brand.primary} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Ionicons name="sparkles" size={11} color="#fbbf24" />
                  <Typography variant="overline" color="brand-primary" className="ml-1 tracking-wider font-bold">
                    NEW CUSTOMER
                  </Typography>
                </View>
                <Typography variant="title-sm" className="text-slate-900 font-bold">
                  Authorize Account
                </Typography>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={touchTargets.hitSlop}
              className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 items-center justify-center"
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={18} color={colors.brand.primary} />
            </TouchableOpacity>
          </View>

          {/* Form Fields with Semantic Labels */}
          <View className="space-y-3 mb-4">
            <View>
              <Typography variant="overline" className="text-slate-700 mb-1 font-bold">
                Full Name *
              </Typography>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter customer full name"
                placeholderTextColor={colors.text.muted}
                className="bg-rose-50/30 border border-rose-200 rounded-xl px-3.5 h-12 text-body-sm text-slate-900"
              />
            </View>

            <View>
              <Typography variant="overline" className="text-slate-700 mb-1 font-bold">
                Mobile Number *
              </Typography>
              <TextInput
                value={phone}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, '');
                  setPhone(digits);
                  if (digits.length >= 10 && !email) {
                    setEmail(`customer_${digits.slice(-10)}@sofiyabangles.com`);
                  }
                }}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.text.muted}
                keyboardType="phone-pad"
                maxLength={10}
                className="bg-rose-50/30 border border-rose-200 rounded-xl px-3.5 h-12 text-body-sm text-slate-900"
              />
            </View>

            <View>
              <Typography variant="overline" className="text-slate-700 mb-1 font-bold">
                Email Address
              </Typography>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email address (optional)"
                placeholderTextColor={colors.text.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-rose-50/30 border border-rose-200 rounded-xl px-3.5 h-12 text-body-sm text-slate-900"
              />
            </View>

            <View>
              <Typography variant="overline" className="text-slate-700 mb-1 font-bold">
                Password (Default: Bangles@123)
              </Typography>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Optional customer password"
                placeholderTextColor={colors.text.muted}
                secureTextEntry
                className="bg-rose-50/30 border border-rose-200 rounded-xl px-3.5 h-12 text-body-sm text-slate-900"
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-2.5">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 h-12 bg-rose-50 rounded-xl items-center justify-center border border-rose-200"
              activeOpacity={0.8}
            >
              <Typography variant="label-md" className="text-rose-700 font-semibold">
                Cancel
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className="flex-1 h-12 bg-primary rounded-xl items-center justify-center shadow-md shadow-rose-500/25"
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Typography variant="label-md" color="white" weight="bold">
                  Create Account
                </Typography>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

