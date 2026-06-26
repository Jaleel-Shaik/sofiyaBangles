import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add-product/index" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-product/success" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
