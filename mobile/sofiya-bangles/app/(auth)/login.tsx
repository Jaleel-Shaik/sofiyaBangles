import { View, Text, Alert, Platform, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import TextInputField from '../../src/components/TextInputField';
import Button from '../../src/components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useAuthStore } from '../../src/store/authStore';
import { firebaseLoginWithToken, verify2FAOtp, register as registerApi } from '../../src/api/auth';
import { apiClient } from '../../src/api/client';
import { getAuth, signInWithEmailAndPassword, getIdToken } from '@react-native-firebase/auth';
import * as SecureStore from 'expo-secure-store';

const OTPStep_Verify = ({ otpCode, setOtpCode, otpError, setOtpError, loading, onVerify, onBack }) => (
  <SafeAreaView className="flex-1 bg-[#FFF0F3]">
    <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View className="items-center mb-8">
        <View className="w-20 h-20 bg-white rounded-full items-center justify-center shadow-sm mb-4">
          <Ionicons name="shield-checkmark-outline" size={36} color="#FF1F4B" />
        </View>
        <Text className="text-2xl font-extrabold text-[#FF1F4B] font-serif mb-2">Two-Factor Auth</Text>
        <Text className="text-rose-500 text-center text-sm px-4">Enter the 6-digit code from your Google Authenticator app.</Text>
      </View>
      <View className="mb-6">
        <TextInputField label="Google Authenticator Code" placeholder="000000" keyboardType="number-pad" maxLength={6}
          value={otpCode} onChangeText={(t) => { setOtpCode(t.replace(/[^0-9]/g, '')); setOtpError(''); }} error={otpError} />
      </View>
      <Button title="Verify & Login" onPress={onVerify} loading={loading} className="shadow-md bg-[#FF1F4B]"
        style={{ shadowColor: '#FF1F4B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }} />
      <TouchableOpacity onPress={onBack} className="mt-6 items-center py-2">
        <Text className="text-slate-500 font-semibold">Back to Login</Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  </SafeAreaView>
);

const QRSetupStep = ({ qrCodeUrl, manualSecret, qrExpired, countdown, setupOtpCode, setSetupOtpCode, loading, onVerify, onRegenerate, onCancel }) => {
  const [showManual, setShowManual] = useState(false);
  const [copied, setCopied] = useState(false);

  const copySecret = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert(
      'Manual Setup',
      'Long-press the secret key below to select it, then tap Copy. Open Google Authenticator, tap +, choose "Enter a setup key", and paste it there.'
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF0F3]">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }} showsVerticalScrollIndicator={false}>
        <View className="items-center mb-6">
          <View className="w-20 h-20 bg-white rounded-full items-center justify-center shadow-sm mb-4">
            <Ionicons name="qr-code-outline" size={36} color="#FF1F4B" />
          </View>
          <Text className="text-2xl font-extrabold text-[#FF1F4B] font-serif mb-2">Setup Google Authenticator</Text>
          <Text className="text-rose-500 text-center text-sm px-2">Scan this QR code with the Google Authenticator app.</Text>
        </View>
        <View className="bg-white p-6 rounded-3xl items-center mb-6 shadow-sm border border-rose-100 mx-2">
          {qrExpired ? (
            <View className="w-56 h-56 items-center justify-center">
              <Ionicons name="time-outline" size={48} color="#94a3b8" />
              <Text className="text-slate-400 mt-4 text-center font-semibold">QR Code Expired</Text>
              <Text className="text-slate-400 text-xs text-center mt-1">Regenerate a new QR code.</Text>
            </View>
          ) : qrCodeUrl ? (
            <Image source={{ uri: qrCodeUrl }} className="w-56 h-56" resizeMode="contain" />
          ) : (
            <View className="w-56 h-56 items-center justify-center">
              <Ionicons name="qr-code" size={64} color="#e2e8f0" />
            </View>
          )}
        </View>
        {!qrExpired && (
          <View className="flex-row items-center justify-center mb-4">
            <Ionicons name="timer-outline" size={16} color="#e11d48" />
            <Text className="text-rose-500 text-sm ml-1 font-semibold">Expires: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</Text>
          </View>
        )}

        {/* Manual Setup Toggle */}
        <TouchableOpacity
          onPress={() => setShowManual(!showManual)}
          className="flex-row items-center justify-center mb-4 py-2"
        >
          <Ionicons name={showManual ? 'chevron-up' : 'chevron-down'} size={16} color="#e11d48" />
          <Text className="text-rose-500 text-sm font-medium ml-1">
            {showManual ? 'Hide manual setup' : "Can't scan? Set up manually"}
          </Text>
        </TouchableOpacity>

        {/* Manual Setup Section */}
        {showManual && manualSecret && (
          <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
            <Text className="font-bold text-slate-700 mb-3 text-sm">Manual Setup Instructions</Text>
            <View className="bg-white rounded-xl p-4 mb-3 border border-slate-100">
              <Text className="text-xs text-slate-500 mb-1">Account</Text>
              <Text className="text-sm font-semibold text-slate-800">Sofiya Bangles</Text>
              <View className="h-px bg-slate-100 my-3" />
              <Text className="text-xs text-slate-500 mb-1">Secret Key</Text>
              <View className="flex-row items-center">
                <Text className="flex-1 text-xs font-mono text-slate-800 bg-rose-50 px-3 py-2.5 rounded-lg" selectable>
                  {manualSecret}
                </Text>
                <TouchableOpacity onPress={copySecret} className="ml-2 p-2.5 bg-rose-50 rounded-lg">
                  <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={18} color={copied ? '#16a34a' : '#e11d48'} />
                </TouchableOpacity>
              </View>
            </View>
            <Text className="text-xs text-slate-500 mb-2">Steps to add manually:</Text>
            <Text className="text-xs text-slate-600 mb-1">1. Open Google Authenticator app</Text>
            <Text className="text-xs text-slate-600 mb-1">2. Tap <Text className="font-bold">+</Text> to add a new account</Text>
            <Text className="text-xs text-slate-600 mb-1">3. Select <Text className="font-bold">Enter a setup key</Text></Text>
            <Text className="text-xs text-slate-600 mb-1">4. Paste the secret key above</Text>
            <Text className="text-xs text-slate-600">5. Key type: <Text className="font-bold">Time-based</Text></Text>
          </View>
        )}

        {/* Standard Steps (shorter when manual is shown) */}
        {!showManual && (
          <View className="bg-white p-4 rounded-2xl mb-6 border border-slate-100 shadow-sm">
            <Text className="font-bold text-slate-700 mb-2">Steps:</Text>
            <Text className="text-slate-600 text-sm mb-1">1. Open Google Authenticator app</Text>
            <Text className="text-slate-600 text-sm mb-1">2. Tap "+" to add a new account</Text>
            <Text className="text-slate-600 text-sm mb-1">3. Select "Scan a QR code"</Text>
            <Text className="text-slate-600 text-sm mb-1">4. Scan the QR code above</Text>
            <Text className="text-slate-600 text-sm mb-1">5. Enter the 6-digit code below</Text>
          </View>
        )}

        <TextInputField label="Enter Code from App" placeholder="000000" keyboardType="number-pad" maxLength={6}
          value={setupOtpCode} onChangeText={(t) => setSetupOtpCode(t.replace(/[^0-9]/g, ''))} />
        <Button title="Verify & Enable 2FA" onPress={onVerify} loading={loading} className="mt-2 shadow-md bg-[#FF1F4B]"
          style={{ shadowColor: '#FF1F4B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }} />
        {qrExpired && <Button title="Regenerate QR Code" onPress={onRegenerate} loading={loading} variant="outline" className="mt-3" />}
        <TouchableOpacity onPress={onCancel} className="mt-6 items-center py-2">
          <Text className="text-slate-500 font-semibold">Cancel Setup</Text>
        </TouchableOpacity>
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default function LoginScreen() {
  const router = useRouter();
  const { login, set2faPending, clear2faPending } = useAuthStore();
  const [authStep, setAuthStep] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('user');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [otpCode, setOtpCode] = useState('');
  const [otpPendingToken, setOtpPendingToken] = useState('');
  const [otpError, setOtpError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [manualSecret, setManualSecret] = useState('');
  const [setupOtpCode, setSetupOtpCode] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [qrExpired, setQrExpired] = useState(false);
  const [countdown, setCountdown] = useState(600);

  // Check if a super_admin token was restored from storage
  useEffect(() => {
    const checkSuperAdmin = async () => {
      const storedUser = await SecureStore.getItemAsync('auth_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.role === 'super_admin') {
            Alert.alert(
              'Web Portal Required',
              'Super Admin access is only available through the web portal. Please visit the web admin dashboard from a desktop browser.',
              [
                { 
                  text: 'Logout', 
                  onPress: async () => {
                    await useAuthStore.getState().forceLogout();
                  }
                }
              ]
            );
          }
        } catch {}
      }
    };
    checkSuperAdmin();
  }, []);

  useEffect(() => {
    let timer;
    if (authStep === 'qr_setup' && qrCodeUrl) {
      setCountdown(600);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(timer); setQrExpired(true); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [authStep, qrCodeUrl]);

  const handleVerify2FA = async () => {
    if (loading) return;
    if (!otpCode.trim() || otpCode.length !== 6) { setOtpError('Please enter a 6-digit code.'); return; }
    setOtpError(''); setLoading(true);
    try {
      const result = await verify2FAOtp(otpPendingToken, otpCode);
      if (result?.success && result?.data) {
        const { user: u, access_token, refresh_token, session_id } = result.data;
        if (session_id) await SecureStore.setItemAsync('session_id', session_id);
        await login(u, access_token, refresh_token); clear2faPending();
        router.replace(u.role === 'admin' || u.role === 'super_admin' ? '/(admin)/(tabs)/dashboard' : '/(tabs)/home');
      }
    } catch (error) {
      const responseData = error.response?.data;
      const msg = responseData?.message || error.message || '';
      setOtpError(msg || 'Invalid OTP.');
      if (msg.includes('locked') || msg.includes('15 minutes') || msg === 'ACCOUNT_LOCKED_15_MINUTES') {
        Alert.alert('Account Locked', 'Please try again in 15 minutes.');
      }
      setOtpCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupFirstOTP = async () => {
    if (loading) return;
    if (!setupOtpCode.trim() || setupOtpCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code from Google Authenticator.');
      return;
    }
    setLoading(true);
    try {
      const result = await verify2FAOtp(setupToken, setupOtpCode);
      if (result?.success && result?.data) {
        const { user: u, access_token, refresh_token, session_id } = result.data;
        if (session_id) await SecureStore.setItemAsync('session_id', session_id);
        await login(u, access_token, refresh_token);
        clear2faPending();
        Alert.alert('2FA Enabled', 'Google Authenticator has been set up successfully.', [
          { text: 'Continue', onPress: () => router.replace(u.role === 'admin' || u.role === 'super_admin' ? '/(admin)/(tabs)/dashboard' : '/(tabs)/home') }
        ]);
      }
    } catch (error) {
      const responseData = error.response?.data;
      const msg = responseData?.message || error.message || 'Invalid code. Please try again.';
      Alert.alert('Verification Failed', msg);
      setSetupOtpCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateQR = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/regenerate-qr');
      const { qr_code_url, secret: secretKey, otp_pending_token } = res.data?.data || res.data;
      if (qr_code_url) setQrCodeUrl(qr_code_url);
      if (secretKey) setManualSecret(secretKey);
      if (otp_pending_token) setSetupToken(otp_pending_token);
      setQrExpired(false);
      setCountdown(600);
    } catch (error) {
      Alert.alert('Error', 'Failed to regenerate QR code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (loading) return;
    const error = {};
    if (!email.trim()) error.email = 'Email is required.';
    if (!password) error.password = 'Password is required.';
    setErrors(error);
    if (Object.keys(error).length) return;
    setLoading(true);
    try {
      // Step 1: Always sign in via Firebase Auth first (handles both Firebase & backend users)
      const fbAuth = getAuth();
      const fbCredential = await signInWithEmailAndPassword(fbAuth, email, password);
      const firebaseToken = await getIdToken(fbCredential.user);

      // Step 2: Silently migrate password hash so future web logins work too
      try {
        await apiClient.post('/auth/set-password', { email, password });
      } catch { /* non-critical - Firebase token login works without it */ }

      // Step 3: Send Firebase token to backend for profile lookup + 2FA flow
      const result = await firebaseLoginWithToken(firebaseToken);
      const data = result?.data || result;
      
      // Case 1: Normal user - backend returns direct auth (access_token, refresh_token, user)
      if (data?.access_token && data?.user) {
        const { user: u, access_token, refresh_token, session_id } = data;
        if (session_id) await SecureStore.setItemAsync('session_id', session_id);
        await login(u, access_token, refresh_token);
        router.replace('/(tabs)/home');
        return;
      }
      
      // Case 2: First login - need to set up 2FA with QR code
      if (data?.setup_required) {
        setQrCodeUrl(data?.qr_code_url || '');
        setManualSecret(data?.secret || '');
        setSetupToken(data?.otp_pending_token || '');
        setAuthStep('qr_setup');
        set2faPending({ otp_pending_token: data?.otp_pending_token, setup_required: true, qr_code_url: data?.qr_code_url });
        return;
      }
      
      // Case 3: 2FA already enabled - need OTP verification
      if (data?.otp_pending_token) {
        setOtpPendingToken(data.otp_pending_token);
        setAuthStep('otp_verify');
        set2faPending({ otp_pending_token: data.otp_pending_token, setup_required: false });
        return;
      }
      
      Alert.alert('Error', 'Unexpected response from server. Please contact support.');
    } catch (error) {
      const responseData = error.response?.data;
      const msg = responseData?.message || error.message || 'Login failed. Please check your credentials.';
      
      if (msg.includes('locked') || msg.includes('15 minutes')) {
        Alert.alert('Account Locked', 'Too many failed attempts. Please try again in 15 minutes.');
      } else {
        Alert.alert('Login Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (loading) return;
    const error = {};
    if (!fullName.trim()) error.fullName = 'Full name is required.';
    if (!email.trim()) error.email = 'Email is required.';
    if (!password) error.password = 'Password is required.';
    if (!phone.trim()) error.phone = 'Phone is required.';
    setErrors(error);
    if (Object.keys(error).length) return;
    setLoading(true);
    try {
      await registerApi({ full_name: fullName, email, password, phone, role });
      Alert.alert('Success', 'Account created. Please login.');
      setAuthStep('login');
      setEmail('');
      setPassword('');
      setFullName('');
      setPhone('');
      setRole('user');
    } catch (error) {
      Alert.alert('Registration Failed', error.response?.data?.message || error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF0F3]">
      {authStep === 'otp_verify' ? (
        <OTPStep_Verify
          otpCode={otpCode} setOtpCode={setOtpCode} otpError={otpError} setOtpError={setOtpError}
          loading={loading} onVerify={handleVerify2FA}
          onBack={() => { setAuthStep('login'); setOtpCode(''); setOtpError(''); setOtpPendingToken(''); clear2faPending(); }}
        />
      ) : authStep === 'qr_setup' ? (
        <QRSetupStep
          qrCodeUrl={qrCodeUrl} qrExpired={qrExpired} countdown={countdown}
          setupOtpCode={setupOtpCode} setSetupOtpCode={setSetupOtpCode}
          loading={loading} onVerify={handleSetupFirstOTP} onRegenerate={handleRegenerateQR}
          manualSecret={manualSecret}
          onCancel={() => { setAuthStep('login'); setSetupOtpCode(''); setQrCodeUrl(''); setManualSecret(''); setQrExpired(false); clear2faPending(); }}
        />
      ) : (
        <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="items-center mb-8 mt-8">
            <View className="w-20 h-20 bg-white rounded-full items-center justify-center shadow-lg mb-4" style={{ shadowColor: '#FF1F4B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 }}>
              <Ionicons name="shield-checkmark" size={36} color="#FF1F4B" />
            </View>
            <Text className="text-3xl font-extrabold text-[#FF1F4B] font-serif mb-1">Sofiya Bangles</Text>
            <Text className="text-slate-500 text-sm font-medium">Admin & User Portal</Text>
          </View>
          <View className="bg-white rounded-3xl p-6 shadow-sm mb-6" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 }}>
            <Text className="text-xl font-bold text-slate-800 mb-6 text-center">{authStep === 'register' ? 'Create Account' : 'Welcome Back'}</Text>
            {authStep === 'register' && (
              <>
                <TextInputField label="Full Name" placeholder="John Doe" value={fullName} onChangeText={(t) => { setFullName(t); setErrors((p) => ({ ...p, fullName: null })); }} error={errors.fullName} />
                <TextInputField label="Phone" placeholder="+91 98765 43210" keyboardType="phone-pad" value={phone} onChangeText={(t) => { setPhone(t); setErrors((p) => ({ ...p, phone: null })); }} error={errors.phone} />
                {/* Role Selection */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-slate-700 mb-2 ml-1">Account Type</Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => setRole('user')}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 flex-row items-center justify-center gap-2 ${
                        role === 'user'
                          ? 'bg-rose-50 border-[#FF1F4B]'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <Ionicons name="person-outline" size={18} color={role === 'user' ? '#FF1F4B' : '#94a3b8'} />
                      <Text className={`font-semibold text-sm ${role === 'user' ? 'text-[#FF1F4B]' : 'text-slate-500'}`}>User</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setRole('admin')}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 flex-row items-center justify-center gap-2 ${
                        role === 'admin'
                          ? 'bg-rose-50 border-[#FF1F4B]'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <Ionicons name="shield-checkmark-outline" size={18} color={role === 'admin' ? '#FF1F4B' : '#94a3b8'} />
                      <Text className={`font-semibold text-sm ${role === 'admin' ? 'text-[#FF1F4B]' : 'text-slate-500'}`}>Admin</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
            <TextInputField label="Email" placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={(t) => { setEmail(t); setErrors((p) => ({ ...p, email: null })); }} error={errors.email} />
            <TextInputField label="Password" placeholder="Enter your password" secureTextEntry={!showPassword} value={password} onChangeText={(t) => { setPassword(t); setErrors((p) => ({ ...p, password: null })); }} error={errors.password}
              rightIcon={<Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color="#94a3b8" />} onRightIconPress={() => setShowPassword(!showPassword)} />
            <Button title={authStep === 'register' ? 'Create Account' : 'Sign In'} onPress={authStep === 'register' ? handleRegister : handleLogin} loading={loading} className="shadow-md bg-[#FF1F4B] rounded-xl"
              style={{ shadowColor: '#FF1F4B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }} />
            <TouchableOpacity onPress={() => { setAuthStep(authStep === 'login' ? 'register' : 'login'); setErrors({}); }} className="mt-4 items-center py-2">
              <Text className="text-slate-500 text-sm">{authStep === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <Text className="text-[#FF1F4B] font-bold">{authStep === 'login' ? 'Register' : 'Login'}</Text>
              </Text>
            </TouchableOpacity>
          </View>
          <View className="items-center mb-4">
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark-outline" size={14} color="#94a3b8" />
              <Text className="text-slate-400 text-xs ml-1">Secured with Google Authenticator 2FA</Text>
            </View>
          </View>
        </KeyboardAwareScrollView>
      )}
    </SafeAreaView>
  );
}
