import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lookupProductByCode, sellProductByCode } from '@/src/api/admin';

interface QuickSellModalProps {
  visible: boolean;
  onClose: () => void;
  onSaleSuccess?: (updatedProduct: any) => void;
  initialCode?: string;
}

export default function QuickSellModal({
  visible,
  onClose,
  onSaleSuccess,
  initialCode = '',
}: QuickSellModalProps) {
  const [code, setCode] = useState(initialCode);
  const [lookingUp, setLookingUp] = useState(false);
  const [product, setProduct] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selling, setSelling] = useState(false);
  const [completedSale, setCompletedSale] = useState<{
    name: string;
    code: string;
    qty: number;
    remaining: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      setCode(initialCode);
      setProduct(null);
      setErrorMsg('');
      setQuantity(1);
      setCompletedSale(null);

      if (initialCode.trim()) {
        handleLookup(initialCode.trim());
      }
    }
  }, [visible, initialCode]);

  const handleLookup = async (codeToLookup?: string) => {
    const targetCode = (codeToLookup || code).trim().toUpperCase();
    if (!targetCode) {
      setErrorMsg('Please enter a Product Special ID');
      return;
    }

    setLookingUp(true);
    setErrorMsg('');
    setProduct(null);
    setCompletedSale(null);

    try {
      const data = await lookupProductByCode(targetCode);
      setProduct(data);
      setQuantity(1);
    } catch (err: any) {
      setErrorMsg(err.message || `Product with code '${targetCode}' was not found.`);
    } finally {
      setLookingUp(false);
    }
  };

  const handleSell = async () => {
    if (!product) return;

    if (quantity < 1) {
      Alert.alert('Error', 'Quantity must be at least 1');
      return;
    }

    if (quantity > product.quantity) {
      Alert.alert('Insufficient Stock', `Only ${product.quantity} items available in stock.`);
      return;
    }

    setSelling(true);
    try {
      const updated = await sellProductByCode(product.unique_code || product.id, quantity);
      const remaining = updated.quantity;
      const totalAmount = product.price * quantity;

      setCompletedSale({
        name: product.product_name,
        code: product.unique_code,
        qty: quantity,
        remaining,
        total: totalAmount,
      });

      const orderNumber = updated?.order?.order_number;

      Alert.alert(
        'Sale Recorded!',
        `Sold ${quantity} unit(s) of "${product.product_name}".\n${orderNumber ? `Order #${orderNumber} logged to Orders & WhatsApp.\n` : ''}Remaining stock: ${remaining}.`
      );

      onSaleSuccess?.(updated);
      setProduct(null);
      setCode('');
    } catch (err: any) {
      Alert.alert('Sale Failed', err.message || 'Could not complete sale.');
    } finally {
      setSelling(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/50 justify-end"
      >
        <View className="bg-surface rounded-t-3xl border-t border-divider max-h-[90%] overflow-hidden">
          {/* Modal Header */}
          <View className="px-5 py-4 bg-primary flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center mr-2.5">
                <Ionicons name="flash" size={18} color="#ffffff" />
              </View>
              <View>
                <Text className="text-white font-bold text-base">Quick Sell by Special ID</Text>
                <Text className="text-white/80 text-xs">Enter code & decrement stock</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-white/10 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="p-5"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Input Box */}
            <Text className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Product Special ID / Code
            </Text>
            <View className="flex-row items-center gap-2 mb-3">
              <View className="flex-1 flex-row items-center bg-[#FAFAFA] border border-divider rounded-2xl px-3.5 py-1">
                <Ionicons name="search" size={18} color="#94a3b8" />
                <TextInput
                  value={code}
                  onChangeText={(text) => setCode(text.toUpperCase())}
                  placeholder="e.g. SIL-101, GLA-1001"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={() => handleLookup()}
                  className="flex-1 px-2.5 py-2 text-sm font-bold text-text-primary tracking-wider"
                />
                {code ? (
                  <TouchableOpacity onPress={() => { setCode(''); setProduct(null); setErrorMsg(''); }}>
                    <Ionicons name="close-circle" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => handleLookup()}
                disabled={lookingUp || !code.trim()}
                className="bg-slate-900 px-4 py-3 rounded-2xl items-center justify-center"
                style={{ opacity: lookingUp || !code.trim() ? 0.5 : 1 }}
              >
                {lookingUp ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-xs">Find</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Error Card */}
            {errorMsg ? (
              <View className="p-3 bg-red-50 border border-red-200 rounded-2xl flex-row items-center mb-4">
                <Ionicons name="alert-circle" size={18} color="#dc2626" />
                <Text className="text-xs text-red-700 font-medium ml-2 flex-1">{errorMsg}</Text>
              </View>
            ) : null}

            {/* Completed Sale Feedback */}
            {completedSale ? (
              <View className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl mb-4">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="checkmark-circle" size={22} color="#059669" />
                  <Text className="text-sm font-bold text-emerald-900 ml-2">Sale Recorded!</Text>
                </View>
                <Text className="text-xs text-emerald-800 mb-2">
                  Sold {completedSale.qty} set(s) of {completedSale.name}.
                </Text>
                <View className="flex-row justify-between bg-white/70 p-2.5 rounded-xl border border-emerald-100 mb-3">
                  <Text className="text-xs text-text-secondary font-semibold">Total: ₹{completedSale.total}</Text>
                  <Text className="text-xs font-bold text-text-primary">Remaining: {completedSale.remaining} units</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setCompletedSale(null)}
                  className="bg-emerald-600 py-2.5 rounded-xl items-center"
                >
                  <Text className="text-white font-bold text-xs">Sell Next Item</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Loaded Product Preview */}
            {product ? (
              <View className="space-y-4">
                <View className="p-3.5 bg-[#FAFAFA] border border-divider rounded-2xl flex-row items-center">
                  <View className="w-18 h-18 rounded-xl bg-white border border-divider overflow-hidden items-center justify-center mr-3.5">
                    {product.image_url ? (
                      <Image
                        source={{ uri: product.image_url }}
                        className="w-16 h-16 rounded-lg"
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="image-outline" size={28} color="#cbd5e1" />
                    )}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <View className="bg-slate-900 px-2 py-0.5 rounded-md">
                        <Text className="text-white font-bold text-[10px] tracking-wider font-mono">
                          {product.unique_code}
                        </Text>
                      </View>
                      <View
                        className={`px-2 py-0.5 rounded-md ${
                          product.quantity > 5
                            ? 'bg-emerald-100'
                            : product.quantity > 0
                            ? 'bg-amber-100'
                            : 'bg-red-100'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold ${
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

                    <Text className="text-sm font-bold text-text-primary" numberOfLines={1}>
                      {product.product_name}
                    </Text>
                    <Text className="text-xs text-text-secondary">
                      {product.model_type_name || 'Model'} • {product.category_name || 'Category'}
                    </Text>
                    <Text className="text-sm font-bold text-primary mt-1">
                      ₹{product.price}
                    </Text>
                  </View>
                </View>

                {/* Quantity Selector */}
                <View className="p-4 bg-surface border border-divider rounded-2xl">
                  <View className="flex-row items-center justify-between mb-3">
                    <View>
                      <Text className="text-xs font-bold text-text-primary">Quantity to Sell</Text>
                      <Text className="text-[10px] text-text-secondary">
                        Stock after sale: {Math.max(0, product.quantity - quantity)}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <TouchableOpacity
                        onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-8 h-8 rounded-lg border border-divider items-center justify-center"
                        style={{ opacity: quantity <= 1 ? 0.4 : 1 }}
                      >
                        <Ionicons name="remove" size={16} color="#0f172a" />
                      </TouchableOpacity>
                      <Text className="mx-3.5 text-base font-bold text-text-primary min-w-[20px] text-center">
                        {quantity}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setQuantity((q) => Math.min(product.quantity, q + 1))}
                        disabled={quantity >= product.quantity}
                        className="w-8 h-8 rounded-lg border border-divider items-center justify-center"
                        style={{ opacity: quantity >= product.quantity ? 0.4 : 1 }}
                      >
                        <Ionicons name="add" size={16} color="#0f172a" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="pt-2.5 border-t border-divider flex-row items-center justify-between">
                    <Text className="text-xs font-semibold text-text-secondary">Total Amount:</Text>
                    <Text className="text-base font-bold text-text-primary">
                      ₹{product.price * quantity}
                    </Text>
                  </View>
                </View>

                {/* Sell Action Button */}
                <TouchableOpacity
                  onPress={handleSell}
                  disabled={selling || product.quantity <= 0}
                  className="bg-primary py-3.5 rounded-2xl items-center justify-center flex-row shadow-sm"
                  style={{ opacity: selling || product.quantity <= 0 ? 0.5 : 1 }}
                >
                  {selling ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="bag-check" size={18} color="#ffffff" />
                      <Text className="text-white font-bold text-sm ml-2">
                        {product.quantity <= 0 ? 'Out of Stock' : `Confirm Sale (${quantity} Sets)`}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
