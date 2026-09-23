import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { lookupProductByCode, sellProductByCode } from '@/src/api/admin';
import { STRINGS } from '@/src/constants/strings';

export default function QuickSellScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    code?: string;
    id?: string;
    initialCode?: string;
    orderNumber?: string;
    qty?: string;
    customerName?: string;
    customerPhone?: string;
  }>();

  const incomingTarget = (params.code || params.id || params.initialCode || '').trim();

  const [code, setCode] = useState(params.code || params.initialCode || '');
  const [lookingUp, setLookingUp] = useState(false);
  const [product, setProduct] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [quantity, setQuantity] = useState(() => (params.qty ? Math.max(1, parseInt(params.qty, 10) || 1) : 1));
  const [selling, setSelling] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  const [customerName, setCustomerName] = useState(params.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(params.customerPhone || '');
  const [completedSale, setCompletedSale] = useState<{
    name: string;
    code: string;
    qty: number;
    remaining: number;
    total: number;
    paymentMethod: string;
    orderNumber?: string;
    customerPhone?: string;
    customerName?: string;
  } | null>(null);

  const handleLookup = useCallback(async (codeToLookup?: string) => {
    const targetCode = (codeToLookup !== undefined ? codeToLookup : (code || params.id || '')).trim().toUpperCase();
    if (!targetCode) {
      setErrorMsg('Please enter a Product Special ID / Unique Code');
      return;
    }

    setLookingUp(true);
    setErrorMsg('');
    setProduct(null);
    setCompletedSale(null);

    try {
      let data: any;
      try {
        data = await lookupProductByCode(targetCode);
      } catch (firstErr: any) {
        if (params.id && params.id.toUpperCase() !== targetCode) {
          data = await lookupProductByCode(params.id);
        } else {
          throw firstErr;
        }
      }

      if (data) {
        setProduct(data);
        if (data.unique_code) {
          setCode(data.unique_code);
        }
        setQuantity(1);
      }
    } catch (err: any) {
      setErrorMsg(err.message || `Product with code '${targetCode}' was not found.`);
    } finally {
      setLookingUp(false);
    }
  }, [code, params.id]);

  useEffect(() => {
    if (incomingTarget) {
      setCode(params.code || params.initialCode || '');
      handleLookup(incomingTarget);
    }
    if (params.qty) {
      const q = parseInt(params.qty, 10);
      if (q && q >= 1) setQuantity(q);
    }
  }, [incomingTarget, params.qty, handleLookup]);

  const handleSell = async () => {
    if (!product) return;

    if (quantity < 1) {
      Alert.alert('Invalid Quantity', 'Quantity must be at least 1.');
      return;
    }

    if (quantity > product.quantity) {
      Alert.alert('Insufficient Stock', `Only ${product.quantity} items available in stock.`);
      return;
    }

    setSelling(true);
    try {
      const notes = params.orderNumber
        ? `WhatsApp Order #${params.orderNumber} (${paymentMethod})`
        : `Quick Sell via Mobile Admin (${paymentMethod})`;

      const updated = await sellProductByCode(product.unique_code || product.id, quantity, {
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        notes,
        order_number: params.orderNumber || undefined,
      });

      const remaining = typeof updated?.quantity === 'number' ? updated.quantity : Math.max(0, product.quantity - quantity);
      const totalAmount = product.price * quantity;
      const orderNumber = params.orderNumber || updated?.order?.order_number || `ORD-${Date.now().toString().slice(-6)}`;
      const enteredPhone = customerPhone.trim();
      const enteredName = customerName.trim();

      setCompletedSale({
        name: product.product_name,
        code: product.unique_code || targetCodeSummary(product),
        qty: quantity,
        remaining,
        total: totalAmount,
        paymentMethod,
        orderNumber,
        customerPhone: enteredPhone,
        customerName: enteredName,
      });

      // Update current product with new remaining stock
      setProduct({
        ...product,
        quantity: remaining,
      });
      setQuantity(1);
      setCustomerName('');
      setCustomerPhone('');
    } catch (err: any) {
      Alert.alert('Sale Failed', err.message || 'Could not complete sale.');
    } finally {
      setSelling(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!completedSale) return;
    const cleanPhone = (completedSale.customerPhone || '').replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const lines = [
      '✨ *SOFIYA BANGLES — SALE RECEIPT* ✨',
      '━━━━━━━━━━━━━━━━━━━━',
      ...(completedSale.orderNumber ? [`*Order Number:* ${completedSale.orderNumber}`] : []),
      ...(completedSale.customerName ? [`*Customer:* ${completedSale.customerName}`] : []),
      `*Product:* ${completedSale.name}`,
      `*Special ID:* ${completedSale.code}`,
      `*Quantity:* ${completedSale.qty} set(s)`,
      `*Payment Mode:* ${completedSale.paymentMethod}`,
      `*Total Amount:* ₹${completedSale.total}`,
      `*Date:* ${new Date().toLocaleDateString('en-IN')}`,
      '━━━━━━━━━━━━━━━━━━━━',
      '💖 *Thank you for shopping with Sofiya Bangles!*',
    ];

    const encoded = encodeURIComponent(lines.join('\n'));
    const url = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open WhatsApp. Please ensure WhatsApp is installed.');
    });
  };

  const targetCodeSummary = (p: any) => {
    return p?.unique_code || p?.id?.substring?.(0, 8)?.toUpperCase() || 'ITEM';
  };

  const handleResetForNext = () => {
    setCompletedSale(null);
    setProduct(null);
    setCode('');
    setErrorMsg('');
    setQuantity(1);
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Screen Header */}
        <View
          className="px-5 pb-4 bg-primary/5 border-b border-divider"
          style={{ paddingTop: Math.max(insets.top + 12, 36) }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3 border border-divider shadow-sm"
                activeOpacity={0.7}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Ionicons name="arrow-back" size={22} color="#171717" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-primary font-semibold text-[11px] uppercase tracking-widest">
                  Direct Sale Counter
                </Text>
                <Text className="text-xl font-bold text-text-primary" numberOfLines={1}>
                  Quick Sell by Special ID
                </Text>
              </View>
            </View>

            <View className="bg-slate-900 px-3 py-1.5 rounded-full flex-row items-center ml-2">
              <Ionicons name="flash" size={14} color="#fbbf24" />
              <Text className="text-white font-bold text-xs ml-1 font-mono">LIVE</Text>
            </View>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: Math.max(insets.bottom + 40, 60) }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* WhatsApp Order Fulfillment Header Banner */}
          {params.orderNumber ? (
            <View className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex-row items-center shadow-xs">
              <View className="w-10 h-10 rounded-xl bg-[#E8436E] items-center justify-center mr-3 shadow-xs">
                <Ionicons name="cart" size={20} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-900">
                  WhatsApp Order Fulfillment
                </Text>
                <Text className="text-xs text-rose-700 font-mono font-semibold mt-0.5">
                  Order #{params.orderNumber}
                </Text>
                {params.customerName || params.customerPhone ? (
                  <Text className="text-[11px] text-slate-500 mt-0.5">
                    Customer: {[params.customerName, params.customerPhone].filter(Boolean).join(" • ")}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Lookup Input Card */}
          <View className="bg-surface rounded-2xl border border-divider p-4 mb-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Product Special ID / Code
              </Text>
              <Text className="text-[11px] text-text-hint">e.g. SIL-101, GLA-1001</Text>
            </View>

            <View className="flex-row items-center gap-2">
              <View className="flex-1 flex-row items-center bg-[#FAFAFA] border border-divider rounded-xl px-3.5" style={{ height: 50 }}>
                <Ionicons name="barcode-outline" size={20} color="#64748b" />
                <TextInput
                  value={code}
                  onChangeText={(text) => {
                    setCode(text.toUpperCase());
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Enter Special ID..."
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={() => handleLookup()}
                  className="flex-1 px-3 text-base font-bold text-text-primary tracking-wider"
                />
                {code ? (
                  <TouchableOpacity
                    onPress={() => {
                      setCode('');
                      setProduct(null);
                      setErrorMsg('');
                    }}
                    className="p-1"
                  >
                    <Ionicons name="close-circle" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => handleLookup()}
                disabled={lookingUp || !code.trim()}
                className="bg-slate-900 px-5 rounded-xl items-center justify-center shadow-sm"
                style={{ height: 50, opacity: lookingUp || !code.trim() ? 0.6 : 1 }}
                activeOpacity={0.8}
              >
                {lookingUp ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <View className="flex-row items-center">
                    <Ionicons name="search" size={16} color="#ffffff" />
                    <Text className="text-white font-bold text-sm ml-1.5">Find</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Error Card */}
          {errorMsg ? (
            <View className="p-4 bg-red-50 border border-red-200 rounded-2xl flex-row items-center mb-4 shadow-sm">
              <View className="w-9 h-9 rounded-full bg-red-100 items-center justify-center mr-3">
                <Ionicons name="alert-circle" size={20} color="#dc2626" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-red-900">Product Not Found</Text>
                <Text className="text-xs text-red-700 mt-0.5">{errorMsg}</Text>
              </View>
            </View>
          ) : null}

          {/* Success Recorded Card */}
          {completedSale ? (
            <View className="p-5 bg-emerald-50 border border-emerald-200 rounded-3xl mb-5 shadow-sm">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center mr-3">
                  <Ionicons name="checkmark-circle" size={24} color="#059669" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-emerald-950">Sale Recorded Successfully!</Text>
                  <Text className="text-xs text-emerald-700 font-medium">
                    Inventory stock automatically decremented
                  </Text>
                </View>
              </View>

              <View className="bg-white/90 p-3.5 rounded-2xl border border-emerald-100 mb-4 space-y-2">
                {completedSale.orderNumber && (
                  <View className="flex-row justify-between items-center">
                    <Text className="text-xs text-text-secondary font-medium">Order Number</Text>
                    <Text className="text-xs font-mono font-bold text-slate-800">
                      {completedSale.orderNumber}
                    </Text>
                  </View>
                )}
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-text-secondary font-medium">Product</Text>
                  <Text className="text-xs font-bold text-text-primary flex-1 text-right ml-2" numberOfLines={1}>
                    {completedSale.name}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-text-secondary font-medium">Special ID</Text>
                  <Text className="text-xs font-mono font-bold text-slate-800">
                    {completedSale.code}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-text-secondary font-medium">Quantity Sold</Text>
                  <Text className="text-xs font-bold text-emerald-700">
                    {completedSale.qty} set(s)
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-text-secondary font-medium">Payment Mode</Text>
                  <Text className="text-xs font-bold text-text-primary">
                    {completedSale.paymentMethod}
                  </Text>
                </View>
                <View className="pt-2 border-t border-emerald-100 flex-row justify-between items-center">
                  <Text className="text-sm font-bold text-text-primary">Total Collected</Text>
                  <Text className="text-base font-extrabold text-[#C25B3E]">
                    ₹{completedSale.total}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-[11px] text-text-secondary">Remaining In Stock</Text>
                  <Text className="text-[11px] font-bold text-text-primary">
                    {completedSale.remaining} units
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleShareWhatsApp}
                className="w-full bg-[#25D366] py-3.5 rounded-2xl items-center justify-center flex-row shadow-sm mb-3"
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                <Text className="text-white font-bold text-sm ml-2">Share WhatsApp Bill</Text>
              </TouchableOpacity>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handleResetForNext}
                  className="flex-1 bg-emerald-700 py-3 rounded-2xl items-center justify-center shadow-sm"
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-bold text-sm">Sell Another</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.back()}
                  className="bg-white border border-emerald-300 px-5 py-3 rounded-2xl items-center justify-center"
                  activeOpacity={0.8}
                >
                  <Text className="text-emerald-900 font-bold text-sm">Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Product Details & Sale Configuration */}
          {product ? (
            <View className="space-y-4">
              {/* Product Info Card */}
              <View className="bg-surface rounded-2xl border border-divider p-4 shadow-sm">
                <View className="flex-row items-center">
                  <View className="w-20 h-20 rounded-2xl bg-white border border-divider overflow-hidden items-center justify-center mr-4">
                    {product.image_url || product.images?.[0] ? (
                      <Image
                        source={{ uri: product.image_url || product.images?.[0] }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="image-outline" size={32} color="#cbd5e1" />
                    )}
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1.5 flex-wrap">
                      <View className="bg-slate-900 px-2.5 py-0.5 rounded-md">
                        <Text className="text-white font-bold text-[11px] tracking-wider font-mono">
                          {product.unique_code || 'CODE'}
                        </Text>
                      </View>
                      <View
                        className={`px-2.5 py-0.5 rounded-md ${
                          product.quantity > 5
                            ? 'bg-emerald-100'
                            : product.quantity > 0
                            ? 'bg-amber-100'
                            : 'bg-red-100'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            product.quantity > 5
                              ? 'text-emerald-800'
                              : product.quantity > 0
                              ? 'text-amber-800'
                              : 'text-red-800'
                          }`}
                        >
                          {product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-base font-bold text-text-primary" numberOfLines={2}>
                      {product.product_name}
                    </Text>
                    <Text className="text-xs text-text-secondary mt-0.5">
                      {product.model_type_name || 'Model'} • {product.category_name || STRINGS.admin.collections.collection}
                    </Text>
                    <Text className="text-base font-extrabold text-[#C25B3E] mt-1">
                      ₹{product.price} <Text className="text-xs font-normal text-text-hint">/ unit</Text>
                    </Text>
                  </View>
                </View>
              </View>

              {/* Quantity Selector Card */}
              <View className="bg-surface rounded-2xl border border-divider p-4 shadow-sm">
                <View className="flex-row items-center justify-between mb-4">
                  <View>
                    <Text className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                      Quantity to Sell
                    </Text>
                    <Text className="text-xs text-text-hint mt-0.5">
                      Stock after sale: <Text className="font-bold text-text-primary">{Math.max(0, product.quantity - quantity)}</Text> units
                    </Text>
                  </View>

                  <View className="flex-row items-center bg-[#FAFAFA] border border-divider rounded-2xl p-1">
                    <TouchableOpacity
                      onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-10 h-10 rounded-xl bg-white border border-divider items-center justify-center shadow-xs"
                      style={{ opacity: quantity <= 1 ? 0.35 : 1 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="remove" size={18} color="#0f172a" />
                    </TouchableOpacity>

                    <Text className="mx-4 text-lg font-bold text-text-primary min-w-[28px] text-center font-mono">
                      {quantity}
                    </Text>

                    <TouchableOpacity
                      onPress={() => setQuantity((q) => Math.min(product.quantity, q + 1))}
                      disabled={quantity >= product.quantity}
                      className="w-10 h-10 rounded-xl bg-white border border-divider items-center justify-center shadow-xs"
                      style={{ opacity: quantity >= product.quantity ? 0.35 : 1 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={18} color="#0f172a" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Payment Method Selector */}
                <View className="pt-3 border-t border-divider">
                  <Text className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                    Payment Method
                  </Text>
                  <View className="flex-row gap-2">
                    {(['Cash', 'UPI', 'Card'] as const).map((method) => {
                      const isSelected = paymentMethod === method;
                      return (
                        <TouchableOpacity
                          key={method}
                          onPress={() => setPaymentMethod(method)}
                          className={`flex-1 py-2.5 rounded-xl items-center justify-center border ${
                            isSelected
                              ? 'bg-primary/10 border-primary'
                              : 'bg-[#FAFAFA] border-divider'
                          }`}
                          activeOpacity={0.8}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              isSelected ? 'text-primary' : 'text-text-secondary'
                            }`}
                          >
                            {method}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Optional Customer Details */}
                <View className="pt-3 mt-3 border-t border-divider">
                  <Text className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                    Customer Info (Optional)
                  </Text>
                  <View className="flex-row gap-2">
                    <TextInput
                      value={customerName}
                      onChangeText={setCustomerName}
                      placeholder="Customer Name"
                      placeholderTextColor="#94a3b8"
                      className="flex-1 bg-[#FAFAFA] border border-divider rounded-xl px-3 py-2 text-xs text-text-primary"
                    />
                    <TextInput
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                      placeholder="Phone"
                      placeholderTextColor="#94a3b8"
                      keyboardType="phone-pad"
                      className="w-32 bg-[#FAFAFA] border border-divider rounded-xl px-3 py-2 text-xs text-text-primary"
                    />
                  </View>
                </View>

                {/* Total Breakdown */}
                <View className="pt-3 mt-3 border-t border-divider flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-text-secondary">
                    Total Amount ({quantity} × ₹{product.price}):
                  </Text>
                  <Text className="text-xl font-extrabold text-[#C25B3E]">
                    ₹{product.price * quantity}
                  </Text>
                </View>
              </View>

              {/* Sell Action Button */}
              <TouchableOpacity
                onPress={handleSell}
                disabled={selling || product.quantity <= 0}
                className="bg-primary py-4 rounded-2xl items-center justify-center flex-row shadow-md"
                style={{ opacity: selling || product.quantity <= 0 ? 0.5 : 1 }}
                activeOpacity={0.85}
              >
                {selling ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="bag-check" size={20} color="#ffffff" />
                    <Text className="text-white font-bold text-base ml-2">
                      {product.quantity <= 0
                        ? 'Out of Stock'
                        : `Confirm Sale • ₹${product.price * quantity}`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : !completedSale && !lookingUp ? (
            /* Empty prompt instructions */
            <View className="items-center justify-center p-8 bg-surface rounded-2xl border border-dashed border-divider mt-2">
              <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-3">
                <Ionicons name="flash-outline" size={28} color="#e11d48" />
              </View>
              <Text className="text-sm font-bold text-text-primary text-center">
                Ready for Instant Special ID Sale
              </Text>
              <Text className="text-xs text-text-secondary text-center mt-1 leading-4">
                Enter any product's Special ID or Unique Code above to verify stock, choose quantity, and record customer purchase in real time.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
