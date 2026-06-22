import { View, Text, Alert, Platform, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { login, register, signInWithGoogle } from '../../src/api/auth';
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
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    // Client-side validation
    if (!isLogin && !fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    if (!password) {
      Alert.alert('Validation Error', 'Please enter your password.');
      return;
    }

    if (!isLogin && password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // Pass role if your backend requires it for login, otherwise login typically infers it
        // The user requested: "selecting role either admin or the user he should navigate to the as per the role"
        const res = await login(email, password);
        // Ensure the store is updated, then redirect
        const userRole = res.user?.role || role; // fallback if backend doesn't return role immediately
        if (userRole === 'admin') {
          router.replace('/(admin)/(tabs)/dashboard' as any);
        } else {
          router.replace('/(tabs)/home');
        }
      } else {
        const res: any = await register(email, password, fullName, role);
        Alert.alert('Success', res.message || 'Registration successful!');
        // We could redirect immediately or require them to login
        if (res.user) {
           const userRole = res.user.role || role;
           if (userRole === 'admin') {
             router.replace('/(admin)/(tabs)/dashboard' as any);
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
      const res = await signInWithGoogle();
      if (res.user) {
        const userRole = res.user.role || 'user';
        if (userRole === 'admin') {
          router.replace('/(admin)/(tabs)/dashboard' as any);
        } else {
          router.replace('/(tabs)/home');
        }
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
          <Text className="text-3xl font-extrabold text-[#90132B] font-serif">Sofiya Bangles</Text>
          <Text className="text-rose-500 mt-2 text-center text-sm">
            Discover beautiful, handcrafted jewelry.
          </Text>
        </View>

        {/* Interactive Toggle */}
        <View className="flex-row bg-white p-1.5 rounded-full mb-6 shadow-sm">
          <TouchableOpacity 
            className={`flex-1 py-3 items-center rounded-full ${isLogin ? 'bg-[#FF1F4B]' : 'bg-transparent'}`}
            onPress={() => setIsLogin(true)}
            activeOpacity={0.8}
          >
            <Text className={`font-bold ${isLogin ? 'text-white' : 'text-slate-500'}`}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 items-center rounded-full ${!isLogin ? 'bg-[#FF1F4B]' : 'bg-transparent'}`}
            onPress={() => setIsLogin(false)}
            activeOpacity={0.8}
          >
            <Text className={`font-bold ${!isLogin ? 'text-white' : 'text-slate-500'}`}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Role Toggle */}
        <View className="flex-row items-center justify-center mb-6 space-x-4">
          <Text className="text-sm font-semibold text-rose-800 mr-2">I am an:</Text>
          <TouchableOpacity 
            className={`px-4 py-2 rounded-full border ${role === 'admin' ? 'bg-rose-100 border-rose-400' : 'bg-white border-gray-200'}`}
            onPress={() => setRole('admin')}
          >
            <Text className={`text-sm font-bold ${role === 'admin' ? 'text-rose-700' : 'text-gray-500'}`}>Admin</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`px-4 py-2 rounded-full border ${role === 'user' ? 'bg-rose-100 border-rose-400' : 'bg-white border-gray-200'}`}
            onPress={() => setRole('user')}
          >
            <Text className={`text-sm font-bold ${role === 'user' ? 'text-rose-700' : 'text-gray-500'}`}>User</Text>
          </TouchableOpacity>
        </View>

        {/* Input Fields Wrapper */}
        <View>
          {!isLogin && (
            <TextInputField
              label="Full Name"
              placeholder="John Doe"
              value={fullName}
              onChangeText={setFullName}
            />
          )}

          <TextInputField
            label="Email Address"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInputField
            label="Password"
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
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
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}