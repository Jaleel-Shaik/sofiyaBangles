import { View, Text, Alert, Platform, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useRouter, Href } from 'expo-router';
import { login, register, signInWithGoogle, sendOtp, verifyOtp } from '../../src/api/auth';
import { Ionicons } from '@expo/vector-icons';
import TextInputField from '../../src/components/TextInputField';
import Button from '../../src/components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useAuthStore } from '../../src/store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string }>({});
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otp, setOtp] = useState('');
  const [tempAdminData, setTempAdminData] = useState<{user: any, token: string} | null>(null);

  const handleVerifyOtp = async () => {
    if (loading) return; // Prevent double clicks
    
    if (!otp.trim() || otp.length < 6) {
      Alert.alert('Validation Error', 'Please enter a valid 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
       await verifyOtp(email, otp);
       Alert.alert('Success', 'OTP verified successfully!');
       if (tempAdminData) {
         await useAuthStore.getState().login(tempAdminData.user, tempAdminData.token);
         router.replace('/(admin)/(tabs)/dashboard');
       }
    } catch (error: any) {
       Alert.alert('Error', error.message);
    } finally {
       setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (loading) return; // Prevent double clicks
    
    // Client-side validation
    setErrors({});
    let hasError = false;
    const newErrors: { fullName?: string; email?: string; password?: string } = {};

    if (!isLogin && !fullName.trim()) {
      newErrors.fullName = 'Please enter your full name.';
      hasError = true;
    }

    if (!email.trim()) {
      newErrors.email = 'Please enter your email address.';
      hasError = true;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address.';
        hasError = true;
      }
    }

    if (!password) {
      newErrors.password = 'Please enter your password.';
      hasError = true;
    } else if (!isLogin && password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long.';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // The user requested: "selecting role either admin or the user he should navigate to the as per the role"
        const res: any = await login(email, password);
        
        if (res.requiresOtp) {
           await sendOtp(email, res.user?.phone);
           setTempAdminData({ user: res.user, token: res.token });
           setShowOtpScreen(true);
           setLoading(false);
           return;
        }

        // Ensure the store is updated, then redirect
        const userRole = res.user?.role; // get role from the backend/database
        if (userRole === 'admin') {
          router.replace('/(admin)/(tabs)/dashboard');
        } else {
          router.replace('/(tabs)/home');
        }
      } else {
        if (role === 'admin') {
          const allowedAdminEmails = ['jaleelbashashaik18@gmail.com', 'shaikjaleelbasha10@gmail.com'];
          if (!allowedAdminEmails.includes(email.toLowerCase().trim())) {
            Alert.alert('Access Denied', 'No access to admin role. Contact admin.');
            setLoading(false);
            return;
          }
        }

        const res: any = await register(email, password, fullName, role, phone);
        Alert.alert('Success', res.message || 'Registration successful!');
        if (res.user) {
           const userRole = res.user.role || role;
           if (userRole === 'admin') {
             // For admin, force them to login so they go through the OTP flow
             Alert.alert('Admin Created', 'Please log in to verify your mobile number.');
             setIsLogin(true);
           } else {
             router.replace('/(tabs)/home');
           }
        } else {
           setIsLogin(true);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const res: any = await signInWithGoogle();

        if (res.user?.role === 'admin') {
          router.replace('/(admin)/(tabs)/dashboard');
        } else {
          router.replace('/(tabs)/home');
        }
    } catch (error: any) {
      Alert.alert('Google Sign-In Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF0F3]">
      <KeyboardAwareScrollView 
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 40}
        bounces={false}
      >
        <View className="items-center mb-8">
          <View className="w-20 h-20 bg-white rounded-full items-center justify-center shadow-sm mb-4">
            <Ionicons name="sparkles-outline" size={32} color="#FF1F4B" />
          </View>
          <Text className="text-3xl font-extrabold text-[#FF1F4B] font-serif">Sofiya Bangles</Text>
          <Text className="text-rose-500 mt-2 text-center text-sm">
            Discover beautiful, handcrafted jewelry.
          </Text>
        </View>

        {/* Interactive Toggle */}
        <View className="flex-row bg-white p-1.5 rounded-full mb-6 shadow-sm">
          <TouchableOpacity 
            className={`flex-1 py-3 items-center rounded-full ${isLogin ? 'bg-[#FF1F4B]' : 'bg-transparent'}`}
            onPress={() => {
              setIsLogin(true);
              setErrors({});
            }}
            activeOpacity={0.8}
          >
            <Text className={`font-bold ${isLogin ? 'text-white' : 'text-slate-500'}`}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 items-center rounded-full ${!isLogin ? 'bg-[#FF1F4B]' : 'bg-transparent'}`}
            onPress={() => {
              setIsLogin(false);
              setErrors({});
            }}
            activeOpacity={0.8}
          >
            <Text className={`font-bold ${!isLogin ? 'text-white' : 'text-slate-500'}`}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Modern Role Dropdown */}
        {!isLogin && (
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">Select Role</Text>
            <TouchableOpacity 
              className={`flex-row items-center justify-between bg-white border border-gray-200 px-5 py-4 shadow-sm ${isDropdownOpen ? 'rounded-t-2xl' : 'rounded-2xl'}`}
              onPress={() => setIsDropdownOpen(!isDropdownOpen)}
              activeOpacity={0.8}
            >
              <View className="flex-row items-center">
                <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${role === 'admin' ? 'bg-rose-100' : 'bg-blue-100'}`}>
                  <Ionicons name={role === 'admin' ? 'shield-checkmark' : 'person'} size={16} color={role === 'admin' ? '#FF1F4B' : '#3b82f6'} />
                </View>
                <Text className="text-base font-semibold text-slate-700 capitalize">{role}</Text>
              </View>
              <Ionicons name={isDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#94a3b8" />
            </TouchableOpacity>

            {isDropdownOpen && (
              <View className="bg-white rounded-b-2xl shadow-sm border-x border-b border-gray-200 overflow-hidden">
                <TouchableOpacity 
                  className={`flex-row items-center px-5 py-4 ${role === 'user' ? 'bg-slate-50' : ''}`}
                  onPress={() => { setRole('user'); setIsDropdownOpen(false); }}
                >
                  <View className="w-8 h-8 rounded-full items-center justify-center mr-3 bg-blue-100">
                    <Ionicons name="person" size={16} color="#3b82f6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-700">User</Text>
                    <Text className="text-xs text-slate-500">Regular shopping experience</Text>
                  </View>
                  {role === 'user' && <Ionicons name="checkmark" size={20} color="#FF1F4B" />}
                </TouchableOpacity>
                
                <View className="h-[1px] bg-gray-100 mx-4" />
                
                <TouchableOpacity 
                  className={`flex-row items-center px-5 py-4 ${role === 'admin' ? 'bg-slate-50' : ''}`}
                  onPress={() => { setRole('admin'); setIsDropdownOpen(false); }}
                >
                  <View className="w-8 h-8 rounded-full items-center justify-center mr-3 bg-rose-100">
                    <Ionicons name="shield-checkmark" size={16} color="#FF1F4B" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-700">Admin</Text>
                    <Text className="text-xs text-slate-500">Manage store & inventory</Text>
                  </View>
                  {role === 'admin' && <Ionicons name="checkmark" size={20} color="#FF1F4B" />}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Input Fields Wrapper */}
        {showOtpScreen ? (
          <View>
            <View className="mb-4">
              <Text className="text-base text-gray-600 text-center">
                We've sent a 6-digit OTP to your registered mobile number. Please enter it below.
              </Text>
            </View>
            <TextInputField
              label="Enter OTP"
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />
            <Button
              title="Verify OTP"
              onPress={handleVerifyOtp}
              loading={loading}
              className="mt-2 shadow-md bg-[#FF1F4B]"
              style={{ 
                shadowColor: '#FF1F4B', 
                shadowOffset: { width: 0, height: 4 }, 
                shadowOpacity: 0.3, 
                shadowRadius: 8, 
                elevation: 8 
              }}
            />
            <TouchableOpacity onPress={() => setShowOtpScreen(false)} className="mt-6 items-center py-2">
              <Text className="text-slate-500 font-semibold">Back to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <View>
          {!isLogin && (
            <>
              <TextInputField
                label="Full Name"
                placeholder="John Doe"
                value={fullName}
                onChangeText={(text) => { setFullName(text); setErrors(prev => ({ ...prev, fullName: undefined })); }}
                error={errors.fullName}
              />
              <TextInputField
                label="Mobile Number"
                placeholder="+919390902587"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </>
          )}

          <TextInputField
            label="Email Address"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(text) => { setEmail(text); setErrors(prev => ({ ...prev, email: undefined })); }}
            error={errors.email}
          />

          <TextInputField
            label="Password"
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(text) => { setPassword(text); setErrors(prev => ({ ...prev, password: undefined })); }}
            error={errors.password}
            rightIcon={
              <Ionicons 
                name={showPassword ? "eye-off" : "eye"} 
                size={22} 
                color="#94a3b8" 
              />
            }
            onRightIconPress={() => setShowPassword(!showPassword)}
          />

          <Button
            title={isLogin ? 'Login to Account' : 'Create My Account'}
            onPress={handleSubmit}
            loading={loading}
            className="mt-2 shadow-md bg-[#FF1F4B]"
            style={{ 
              shadowColor: '#FF1F4B', 
              shadowOffset: { width: 0, height: 4 }, 
              shadowOpacity: 0.3, 
              shadowRadius: 8, 
              elevation: 8 
            }}
          />

          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-gray-300" />
            <Text className="mx-4 text-gray-500 font-semibold">OR</Text>
            <View className="flex-1 h-px bg-gray-300" />
          </View>

          <TouchableOpacity 
            className="flex-row items-center justify-center bg-white border border-gray-200 py-3 rounded-full shadow-sm"
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={24} color="#db4437" />
            <Text className="ml-3 font-bold text-slate-700">Continue with Google</Text>
          </TouchableOpacity>
        </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}