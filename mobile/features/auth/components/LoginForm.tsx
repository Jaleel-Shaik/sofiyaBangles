import React from "react";
import { View, Text, TouchableOpacity, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import TextInputField from "@/src/components/TextInputField";
import Button from "@/src/components/Button";

export interface LoginFormProps {
  authStep: string;
  setAuthStep: (step: string) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  fullName: string;
  setFullName: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  role: string;
  setRole: (role: string) => void;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  errors: Record<string, string | undefined>;
  setErrors: React.Dispatch<
    React.SetStateAction<Record<string, string | undefined>>
  >;
  loading: boolean;
  onLogin: () => void;
  onRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  authStep,
  setAuthStep,
  email,
  setEmail,
  password,
  setPassword,
  fullName,
  setFullName,
  phone,
  setPhone,
  role,
  setRole,
  showPassword,
  setShowPassword,
  errors,
  setErrors,
  loading,
  onLogin,
  onRegister,
}) => {
  const { height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenHeight < 600;

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: authStep === "register" ? "flex-start" : "center",
        paddingHorizontal: 24,
        paddingTop: authStep === "register" ? (isSmallScreen ? 16 : 32) : 24,
        paddingBottom: 24,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      extraScrollHeight={isSmallScreen ? 40 : 80}
      enableOnAndroid
    >
      <View className="items-center mb-8 mt-8">
        <View
          className="w-20 h-20 bg-white rounded-full items-center justify-center shadow-lg mb-4"
          style={{
            shadowColor: "#FF1F4B",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Ionicons name="shield-checkmark" size={36} color="#FF1F4B" />
        </View>
        <Text className="text-3xl font-extrabold text-[#FF1F4B] font-serif mb-1">
          Sofiya Bangles
        </Text>
        <Text className="text-slate-500 text-sm font-medium">
          Admin & User Portal
        </Text>
      </View>

      <View
        className="bg-white rounded-3xl p-6 shadow-sm mb-6"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <Text className="text-xl font-bold text-slate-800 mb-6 text-center">
          {authStep === "register" ? "Create Account" : "Welcome Back"}
        </Text>

        {authStep === "register" && (
          <>
            <TextInputField
              label="Full Name"
              placeholder="John Doe"
              value={fullName}
              onChangeText={(t) => {
                setFullName(t);
                setErrors((p) => ({ ...p, fullName: undefined }));
              }}
              error={errors.fullName}
            />
            <TextInputField
              label="Phone"
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                setErrors((p) => ({ ...p, phone: undefined }));
              }}
              error={errors.phone}
            />

            {/* Role Selection */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-slate-700 mb-2 ml-1">
                Account Type
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setRole("user")}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 flex-row items-center justify-center gap-2 ${
                    role === "user"
                      ? "bg-rose-50 border-[#FF1F4B]"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={role === "user" ? "#FF1F4B" : "#94a3b8"}
                  />
                  <Text
                    className={`font-semibold text-sm ${role === "user" ? "text-[#FF1F4B]" : "text-slate-500"}`}
                  >
                    User
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setRole("admin")}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 flex-row items-center justify-center gap-2 ${
                    role === "admin"
                      ? "bg-rose-50 border-[#FF1F4B]"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={role === "admin" ? "#FF1F4B" : "#94a3b8"}
                  />
                  <Text
                    className={`font-semibold text-sm ${role === "admin" ? "text-[#FF1F4B]" : "text-slate-500"}`}
                  >
                    Admin
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <TextInputField
          label="Email"
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setErrors((p) => ({ ...p, email: undefined }));
          }}
          error={errors.email}
        />
        <TextInputField
          label="Password"
          placeholder="Enter your password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setErrors((p) => ({ ...p, password: undefined }));
          }}
          error={errors.password}
          rightIcon={
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={24}
              color="#94a3b8"
            />
          }
          onRightIconPress={() => setShowPassword((p) => !p)}
        />

        <Button
          title={authStep === "register" ? "Create Account" : "Sign In"}
          onPress={authStep === "register" ? onRegister : onLogin}
          loading={loading}
          className="shadow-md bg-[#FF1F4B] rounded-xl"
          style={{
            shadowColor: "#FF1F4B",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        />

        <TouchableOpacity
          onPress={() => {
            setAuthStep(authStep === "login" ? "register" : "login");
            setErrors({});
          }}
          className="mt-4 items-center py-2"
        >
          <Text className="text-slate-500 text-sm">
            {authStep === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
            <Text className="text-[#FF1F4B] font-bold">
              {authStep === "login" ? "Register" : "Login"}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      <View className="items-center mb-4">
        <View className="flex-row items-center">
          <Ionicons
            name="shield-checkmark-outline"
            size={14}
            color="#94a3b8"
          />
          <Text className="text-slate-400 text-xs ml-1">
            Secured with Google Authenticator 2FA
          </Text>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
};
