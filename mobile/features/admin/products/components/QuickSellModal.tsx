import React, { useState, useEffect, useMemo } from 'react';
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
import {
  lookupProductByCode,
  sellProductByCode,
  updateProductStock,
  lookupCustomerByPhone,
  createCustomer,
} from '@/src/api/admin';
import { getProductById } from '@/src/api/products';
import { openWhatsAppSaleReceipt, type SaleReceiptDetails } from '@/src/utils/whatsapp';
import CreateCustomerModal from '@/src/components/CreateCustomerModal';
import { Typography } from '@/src/components/ui/Typography';
import { colors, touchTargets } from '@/src/theme/tokens';
import { STRINGS } from '@/src/constants/strings';

// Safe product image URL resolver supporting raw strings, array of strings, or array of image objects
const getProductImageUri = (item: any): string | null => {
  if (!item) return null;
  if (typeof item.image_url === 'string' && item.image_url.trim().length > 0) {
    return item.image_url.trim();
  }
  if (Array.isArray(item.images) && item.images.length > 0) {
    const primary = item.images.find((img: any) => img && typeof img === 'object' && img.is_primary);
    const target = primary || item.images[0];
    if (typeof target === 'string' && target.trim().length > 0) {
      return target.trim();
    }
    if (target && typeof target === 'object') {
      const url = target.image_url || target.url || target.uri;
      if (typeof url === 'string' && url.trim().length > 0) {
        return url.trim();
      }
    }
  }
  return null;
};

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
  const [isRestocking, setIsRestocking] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [completedSale, setCompletedSale] = useState<SaleReceiptDetails | null>(null);

  const modalProductImageUri = useMemo(() => getProductImageUri(product), [product]);

  // Customer verification state
  const [checkingCustomer, setCheckingCustomer] = useState(false);
  const [verifiedCustomer, setVerifiedCustomer] = useState<any | null>(null);
  const [customerLookupStatus, setCustomerLookupStatus] = useState<'idle' | 'found' | 'not_found'>('idle');

  // Reusable customer registration modal state
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);

  useEffect(() => {
    if (visible) {
      setCode(initialCode);
      setProduct(null);
      setErrorMsg('');
      setQuantity(1);
      setCompletedSale(null);
      setCustomerPhone('');
      setCustomerName('');
      setVerifiedCustomer(null);
      setCustomerLookupStatus('idle');

      if (initialCode.trim()) {
        handleLookup(initialCode.trim());
      }
    }
  }, [visible, initialCode]);

  const handleLookup = async (codeToLookup?: string) => {
    const rawTarget = (codeToLookup !== undefined ? codeToLookup : code).trim();
    if (!rawTarget) {
      setErrorMsg('Please enter a Product Special ID or Product ID');
      return;
    }

    setLookingUp(true);
    setErrorMsg('');
    setProduct(null);
    setCompletedSale(null);

    try {
      let data: any = null;

      // 1. Try exact raw match first (preserves case for document ID or exact code)
      try {
        data = await lookupProductByCode(rawTarget);
      } catch (firstErr: any) {
        // 2. Try uppercased for special codes like sil-101 -> SIL-101
        const upper = rawTarget.toUpperCase();
        if (upper !== rawTarget) {
          try {
            data = await lookupProductByCode(upper);
          } catch {
            // continue
          }
        }

        // 3. Try getProductById fallback from products API
        if (!data) {
          try {
            const byId = await getProductById(rawTarget);
            if (byId) data = byId;
          } catch {
            // ignore
          }
        }

        if (!data) {
          throw firstErr;
        }
      }

      if (data) {
        setProduct(data);
        setCode(data.unique_code || data.id || rawTarget);
        setQuantity(1);
      }
    } catch (err: any) {
      setErrorMsg(err.message || `Product with ID/code '${rawTarget}' was not found.`);
    } finally {
      setLookingUp(false);
    }
  };

  const handleQuickRestock = async (additionalQty: number) => {
    if (!product) return;
    setIsRestocking(true);
    try {
      const newTotal = (product.quantity || 0) + additionalQty;
      await updateProductStock(product.id, newTotal);
      setProduct((prev: any) => ({ ...prev, quantity: newTotal }));
      setQuantity((q) => q + 1);
      Alert.alert('Stock Updated', `Product restocked! Available inventory is now ${newTotal} units.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update stock');
    } finally {
      setIsRestocking(false);
    }
  };

  const handleCheckCustomer = async (phoneToCheck?: string) => {
    const raw = (phoneToCheck !== undefined ? phoneToCheck : customerPhone).trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10) {
      setVerifiedCustomer(null);
      setCustomerLookupStatus('idle');
      return;
    }

    setCheckingCustomer(true);
    try {
      const res = await lookupCustomerByPhone(raw);
      if (res?.found && res.user) {
        setVerifiedCustomer(res.user);
        setCustomerLookupStatus('found');
        if (res.user.full_name) {
          setCustomerName(res.user.full_name);
        }
      } else {
        setVerifiedCustomer(null);
        setCustomerLookupStatus('not_found');
      }
    } catch {
      setVerifiedCustomer(null);
      setCustomerLookupStatus('not_found');
    } finally {
      setCheckingCustomer(false);
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

    const cleanPhone = customerPhone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert(
        'Customer Mobile Required',
        'Please enter a valid 10-digit customer mobile number to sell and sync this purchase to their mobile app.'
      );
      return;
    }

    let customerToUse = verifiedCustomer;
    if (!customerToUse) {
      setCheckingCustomer(true);
      try {
        const res = await lookupCustomerByPhone(customerPhone.trim());
        if (res?.found && res.user) {
          customerToUse = res.user;
          setVerifiedCustomer(res.user);
          setCustomerLookupStatus('found');
        } else {
          if (!customerName.trim()) {
            setVerifiedCustomer(null);
            setCustomerLookupStatus('not_found');
            setShowCreateCustomerModal(true);
            setCheckingCustomer(false);
            return;
          }
          const created = await createCustomer({
            full_name: customerName.trim(),
            phone: customerPhone.trim(),
            email: `customer_${cleanPhone.slice(-10)}@sofiyabangles.com`,
          });
          customerToUse = created;
          setVerifiedCustomer(created);
          setCustomerLookupStatus('found');
        }
      } catch {
        setCustomerLookupStatus('not_found');
        setShowCreateCustomerModal(true);
        setCheckingCustomer(false);
        return;
      }
      setCheckingCustomer(false);
    }

    setSelling(true);
    try {
      const notes = `Quick Sell Modal`;
      const updated = await sellProductByCode(product.unique_code || product.id, quantity, {
        customer_name: customerName.trim() || customerToUse?.full_name || undefined,
        customer_phone: customerPhone.trim(),
        notes,
      });
      const remaining = typeof updated?.quantity === 'number' ? updated.quantity : Math.max(0, product.quantity - quantity);
      const totalAmount = product.price * quantity;
      const orderNumber = updated?.order?.order_number || `ORD-${Date.now().toString().slice(-6)}`;
      const enteredPhone = customerPhone.trim();
      const enteredName = customerName.trim() || customerToUse?.full_name || '';

      setCompletedSale({
        name: product.product_name,
        code: product.unique_code || 'ITEM',
        qty: quantity,
        remaining,
        total: totalAmount,
        orderNumber,
        customerPhone: enteredPhone,
        customerName: enteredName,
      });

      onSaleSuccess?.(updated);
      setProduct(null);
      setCode('');
      setCustomerPhone('');
      setCustomerName('');
      setVerifiedCustomer(null);
      setCustomerLookupStatus('idle');
    } catch (err: any) {
      Alert.alert('Sale Failed', err.message || 'Could not complete sale.');
    } finally {
      setSelling(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!completedSale) return;
    try {
      await openWhatsAppSaleReceipt(completedSale);
    } catch {
      Alert.alert('Error', 'Could not open WhatsApp. Please ensure WhatsApp is installed.');
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
        className="flex-1 bg-black/60 justify-end"
      >
        <View className="bg-[#FAF7F8] rounded-t-3xl border-t border-rose-200 max-h-[92%] overflow-hidden shadow-2xl">
          {/* Modal Header with Vibrant Rose Branding */}
          <View className="px-5 py-4 bg-primary flex-row items-center justify-between border-b border-rose-600 shadow-sm">
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-2xl bg-white/20 items-center justify-center mr-3 border border-white/30 shadow-xs">
                <Ionicons name="sparkles" size={18} color="#fbbf24" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Ionicons name="flash" size={12} color="#fbbf24" />
                  <Typography variant="overline" color="white" className="ml-1 tracking-widest font-bold opacity-90">
                    SOFIYA BANGLES
                  </Typography>
                </View>
                <Typography variant="title-sm" color="white" weight="bold">
                  Quick Sell by Special ID
                </Typography>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={touchTargets.hitSlop}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center border border-white/30"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="p-4"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Search Input Card */}
            <View className="bg-white rounded-3xl border border-rose-100 p-4 mb-4 shadow-sm">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <View className="w-6 h-6 rounded-lg bg-rose-100 items-center justify-center mr-2">
                    <Ionicons name="barcode-outline" size={14} color={colors.brand.primary} />
                  </View>
                  <Typography variant="overline" className="text-rose-950 font-bold">
                    Product Special ID / Code
                  </Typography>
                </View>
                <View className="bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                  <Typography variant="caption" className="text-rose-600 font-semibold">
                    Instant Stock
                  </Typography>
                </View>
              </View>

              <View className="flex-row items-center gap-2">
                <View className="flex-1 flex-row items-center bg-rose-50/40 border border-rose-200 rounded-2xl px-3.5 h-12">
                  <Ionicons name="search-outline" size={18} color={colors.brand.primary} />
                  <TextInput
                    value={code}
                    onChangeText={(text) => {
                      setCode(text.toUpperCase());
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="e.g. SIL-101, GLA-1001"
                    placeholderTextColor={colors.text.muted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="search"
                    onSubmitEditing={() => handleLookup()}
                    className="flex-1 px-3 text-body-sm font-bold text-slate-900 tracking-wider"
                  />
                  {code ? (
                    <TouchableOpacity
                      onPress={() => {
                        setCode('');
                        setProduct(null);
                        setErrorMsg('');
                      }}
                      hitSlop={touchTargets.hitSlop}
                      className="w-10 h-10 items-center justify-center -mr-2"
                    >
                      <Ionicons name="close-circle" size={18} color={colors.text.muted} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TouchableOpacity
                  onPress={() => handleLookup()}
                  disabled={lookingUp || !code.trim()}
                  className="bg-primary px-4 h-12 rounded-2xl items-center justify-center min-w-[70px] shadow-sm shadow-rose-500/25"
                  style={{ opacity: lookingUp || !code.trim() ? 0.6 : 1 }}
                  activeOpacity={0.8}
                >
                  {lookingUp ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name="sparkles" size={13} color="#fbbf24" />
                      <Typography variant="label-md" color="white" className="ml-1 font-bold">
                        Find
                      </Typography>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Card */}
            {errorMsg ? (
              <View className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex-row items-center mb-4 shadow-xs">
                <Ionicons name="alert-circle" size={18} color={colors.status.error} />
                <Typography variant="caption" color="error" className="ml-2 flex-1 font-medium">
                  {errorMsg}
                </Typography>
              </View>
            ) : null}

            {/* Completed Sale Feedback & WhatsApp Bill */}
            {completedSale ? (
              <View className="p-4 bg-gradient-to-b from-emerald-50 to-teal-50/40 border border-emerald-300 rounded-3xl mb-4 shadow-sm">
                <View className="flex-row items-center mb-2">
                  <View className="w-10 h-10 rounded-xl bg-emerald-500 items-center justify-center mr-2.5 shadow-xs">
                    <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
                  </View>
                  <View className="flex-1">
                    <Typography variant="title-sm" className="text-emerald-950 font-bold">
                      Sale Recorded Successfully!
                    </Typography>
                    <Typography variant="caption" className="text-emerald-700">
                      Sold {completedSale.qty} set(s) of {completedSale.name}.
                    </Typography>
                  </View>
                </View>

                <View className="bg-white p-3.5 rounded-2xl border border-emerald-200 mb-3 space-y-2 shadow-xs">
                  {completedSale.orderNumber && (
                    <View className="flex-row justify-between items-center">
                      <Typography variant="caption" color="secondary">
                        Order #:
                      </Typography>
                      <Typography variant="label-sm" className="font-mono text-slate-800 font-bold">
                        {completedSale.orderNumber}
                      </Typography>
                    </View>
                  )}
                  {completedSale.customerName && (
                    <View className="flex-row justify-between items-center">
                      <Typography variant="caption" color="secondary">
                        Customer:
                      </Typography>
                      <Typography variant="label-sm" color="primary" weight="bold">
                        {completedSale.customerName}
                      </Typography>
                    </View>
                  )}
                  <View className="flex-row justify-between items-center">
                    <Typography variant="caption" color="secondary" weight="semibold">
                      Total Amount:
                    </Typography>
                    <Typography variant="title-sm" className="text-rose-600 font-black">
                      ₹{completedSale.total}
                    </Typography>
                  </View>
                  <View className="flex-row justify-between items-center">
                    <Typography variant="caption" color="secondary">
                      Remaining Stock:
                    </Typography>
                    <Typography variant="label-sm" className="text-emerald-700 font-bold">
                      {completedSale.remaining} units
                    </Typography>
                  </View>
                </View>

                {/* WhatsApp Bill Share Button */}
                <TouchableOpacity
                  onPress={handleShareWhatsApp}
                  className="w-full h-12 bg-[#25D366] rounded-xl items-center justify-center flex-row shadow-sm shadow-green-500/20 mb-2.5"
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                  <Typography variant="label-md" color="white" className="ml-2 font-bold">
                    Share Bill on WhatsApp
                  </Typography>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCompletedSale(null)}
                  className="h-11 bg-emerald-700 rounded-xl items-center justify-center"
                  activeOpacity={0.8}
                >
                  <Typography variant="label-md" color="white" weight="bold">
                    Sell Next Item
                  </Typography>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Loaded Product Preview */}
            {product ? (
              <View className="gap-4">
                <View className="p-4 bg-white border border-rose-100 rounded-3xl flex-row items-center shadow-sm">
                  <View
                    style={{ width: 72, height: 72 }}
                    className="rounded-2xl bg-rose-50 border border-rose-200 overflow-hidden items-center justify-center mr-3.5"
                  >
                    {modalProductImageUri ? (
                      <Image
                        source={{ uri: modalProductImageUri }}
                        style={{ width: 72, height: 72 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="items-center justify-center">
                        <Ionicons name="sparkles" size={24} color={colors.brand.primary} />
                        <Typography variant="overline" className="text-rose-400 mt-0.5 text-[8px]">
                          No Photo
                        </Typography>
                      </View>
                    )}
                  </View>
                  <View className="flex-1 justify-center">
                    <View className="flex-row items-center gap-2 mb-1">
                      <View className="bg-indigo-600 px-2 py-0.5 rounded-md shadow-xs">
                        <Typography variant="overline" color="white" className="font-mono font-bold">
                          {product.unique_code}
                        </Typography>
                      </View>
                      <View
                        className={`px-2 py-0.5 rounded-md border ${
                          product.quantity > 5
                            ? 'bg-emerald-100 border-emerald-200'
                            : product.quantity > 0
                            ? 'bg-amber-100 border-amber-200'
                            : 'bg-red-100 border-red-200'
                        }`}
                      >
                        <Typography
                          variant="overline"
                          className={
                            product.quantity > 5
                              ? 'text-emerald-800'
                              : product.quantity > 0
                              ? 'text-amber-800'
                              : 'text-red-800'
                          }
                        >
                          {product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
                        </Typography>
                      </View>
                    </View>

                    <Typography variant="title-sm" className="text-slate-900 font-bold" numberOfLines={1}>
                      {product.product_name}
                    </Typography>
                    <Typography variant="caption" color="secondary" className="mt-0.5">
                      {product.model_type_name || 'Model'} • {product.category_name || STRINGS.admin.collections.collection}
                    </Typography>
                    <View className="mt-1.5 self-start bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-lg flex-row items-baseline">
                      <Typography variant="title-md" className="text-rose-600 font-black">
                        ₹{product.price}
                      </Typography>
                      <Typography variant="caption" className="text-rose-400 font-normal ml-1">
                        / set
                      </Typography>
                    </View>
                  </View>
                </View>

                {/* Quantity Selector Card */}
                <View className="p-4 bg-white border border-rose-100 rounded-3xl shadow-sm">
                  <View className="flex-row items-center justify-between mb-3">
                    <View>
                      <Typography variant="overline" color="secondary">
                        Quantity to Sell
                      </Typography>
                      <Typography variant="caption" color="hint" className="mt-0.5">
                        Stock after sale:{' '}
                        <Typography variant="caption" className="text-emerald-700 font-bold">
                          {Math.max(0, product.quantity - quantity)}
                        </Typography>{' '}
                        units
                      </Typography>
                    </View>
                    <View className="flex-row items-center bg-rose-50/50 border border-rose-200 rounded-2xl p-1">
                      <TouchableOpacity
                        onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        hitSlop={touchTargets.hitSlop}
                        className="w-10 h-10 rounded-xl bg-white border border-rose-200 items-center justify-center shadow-xs"
                        style={{ opacity: quantity <= 1 ? 0.35 : 1 }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="remove" size={16} color={colors.brand.primary} />
                      </TouchableOpacity>
                      <Typography
                        variant="title-md"
                        className="mx-3 min-w-[24px] text-center font-mono text-rose-950 font-black"
                      >
                        {quantity}
                      </Typography>
                      <TouchableOpacity
                        onPress={() => {
                          if (quantity >= product.quantity) {
                            Alert.alert(
                              'Max Stock Reached',
                              `Only ${product.quantity} unit(s) available in inventory. Would you like to add +5 units to stock?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: '+5 Stock', onPress: () => handleQuickRestock(5) },
                              ]
                            );
                            return;
                          }
                          setQuantity((q) => Math.min(product.quantity, q + 1));
                        }}
                        hitSlop={touchTargets.hitSlop}
                        className="w-10 h-10 rounded-xl bg-primary items-center justify-center shadow-xs"
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={16} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Quick Restock Bar if stock is low or reached */}
                  {(quantity >= product.quantity || product.quantity <= 2) && (
                    <View className="mb-3 p-3 bg-gradient-to-r from-rose-50 to-amber-50/60 border border-rose-200/80 rounded-2xl">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Ionicons name="cube-outline" size={14} color={colors.brand.primary} />
                          <Typography variant="caption" className="text-rose-950 ml-1 font-bold">
                            {product.quantity <= 0 ? 'Out of stock' : `Max: ${product.quantity} left`}
                          </Typography>
                        </View>
                        <View className="flex-row items-center gap-1.5">
                          <TouchableOpacity
                            onPress={() => handleQuickRestock(5)}
                            disabled={isRestocking}
                            className="bg-primary px-3 h-8 rounded-lg flex-row items-center justify-center shadow-xs"
                          >
                            {isRestocking ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <>
                                <Ionicons name="add" size={12} color="#ffffff" />
                                <Typography variant="label-sm" color="white" className="ml-0.5 font-bold">
                                  +5 Stock
                                </Typography>
                              </>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleQuickRestock(10)}
                            disabled={isRestocking}
                            className="bg-rose-700 px-3 h-8 rounded-lg items-center justify-center shadow-xs"
                          >
                            <Typography variant="label-sm" color="white" className="font-bold">
                              +10 Stock
                            </Typography>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Customer Verification Section */}
                  <View className="pt-3.5 mt-2 border-t border-rose-100">
                    <View className="flex-row items-center justify-between mb-1.5">
                      <View className="flex-row items-center">
                        <View className="w-5 h-5 rounded-md bg-rose-100 items-center justify-center mr-1.5">
                          <Ionicons name="phone-portrait-outline" size={12} color={colors.brand.primary} />
                        </View>
                        <Typography variant="overline" className="text-rose-950 font-bold">
                          Customer Account (Mobile Sync)
                        </Typography>
                      </View>
                      <View className="bg-rose-600 px-2 py-0.5 rounded-full">
                        <Typography variant="overline" color="white">
                          Required
                        </Typography>
                      </View>
                    </View>

                    <Typography variant="caption" color="secondary" className="mb-2">
                      Enter mobile number to verify and sync order to customer app.
                    </Typography>

                    {/* Phone Number Input */}
                    <View className="relative mb-2.5">
                      <TextInput
                        value={customerPhone}
                        onChangeText={(val) => {
                          const clean = val.replace(/\D/g, '');
                          setCustomerPhone(clean);
                          if (customerLookupStatus !== 'idle') {
                            setCustomerLookupStatus('idle');
                            setVerifiedCustomer(null);
                          }
                          if (clean.length === 10) {
                            handleCheckCustomer(clean);
                          }
                        }}
                        onBlur={() => handleCheckCustomer()}
                        placeholder="Mobile Number (10 digits)"
                        placeholderTextColor={colors.text.muted}
                        keyboardType="phone-pad"
                        maxLength={10}
                        className="bg-rose-50/30 border border-rose-200 rounded-xl px-3.5 h-12 text-body-sm text-slate-900 pr-11"
                      />
                      <View className="absolute right-3.5 top-3">
                        {checkingCustomer ? (
                          <ActivityIndicator size="small" color={colors.brand.primary} />
                        ) : customerLookupStatus === 'found' ? (
                          <Ionicons name="checkmark-circle" size={20} color={colors.status.success} />
                        ) : customerLookupStatus === 'not_found' ? (
                          <Ionicons name="alert-circle" size={20} color={colors.status.warning} />
                        ) : null}
                      </View>
                    </View>

                    {/* Customer Found Banner */}
                    {customerLookupStatus === 'found' && verifiedCustomer && (
                      <View className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 flex-row items-center justify-between mb-2.5 shadow-xs">
                        <View className="flex-row items-center flex-1 mr-2">
                          <Ionicons name="shield-checkmark" size={16} color={colors.status.success} />
                          <Typography variant="label-sm" className="text-emerald-950 font-bold ml-1.5" numberOfLines={1}>
                            Verified: {verifiedCustomer.full_name || 'Customer'}
                          </Typography>
                        </View>
                        <View className="bg-emerald-600 px-2 py-0.5 rounded-full">
                          <Typography variant="overline" color="white">
                            Authorized
                          </Typography>
                        </View>
                      </View>
                    )}

                    {/* Customer Not Found Banner */}
                    {customerLookupStatus === 'not_found' && (
                      <View className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 mb-2.5 shadow-xs">
                        <View className="flex-row items-center mb-1">
                          <Ionicons name="person-remove-outline" size={16} color={colors.status.warning} />
                          <Typography variant="label-md" className="text-amber-950 font-bold ml-1.5">
                            New Customer
                          </Typography>
                        </View>
                        <Typography variant="caption" className="text-amber-800 mb-2">
                          Enter name below to auto-register customer on sale.
                        </Typography>
                        <TouchableOpacity
                          onPress={() => setShowCreateCustomerModal(true)}
                          className="bg-gradient-to-r from-amber-600 to-rose-600 h-10 px-3.5 rounded-xl items-center justify-center flex-row shadow-sm"
                          activeOpacity={0.8}
                        >
                          <Ionicons name="person-add" size={14} color="#ffffff" />
                          <Typography variant="label-sm" color="white" className="ml-1.5 font-bold">
                            Create & Authorize Customer
                          </Typography>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Customer Full Name */}
                    <TextInput
                      value={customerName}
                      onChangeText={setCustomerName}
                      placeholder="Customer Full Name"
                      placeholderTextColor={colors.text.muted}
                      className="bg-rose-50/30 border border-rose-200 rounded-xl px-3.5 h-12 text-body-sm text-slate-900"
                    />
                  </View>

                  <View className="pt-3.5 mt-3 border-t border-rose-100 bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50/40 rounded-2xl p-3.5 flex-row items-center justify-between">
                    <Typography variant="label-md" className="text-rose-900 font-semibold">
                      Total Payable ({quantity} × ₹{product.price}):
                    </Typography>
                    <Typography variant="headline-sm" className="text-rose-600 font-black">
                      ₹{product.price * quantity}
                    </Typography>
                  </View>
                </View>

                {/* Sell Action Button */}
                <TouchableOpacity
                  onPress={handleSell}
                  disabled={selling || product.quantity <= 0 || customerPhone.replace(/\D/g, '').length < 10 || !customerName.trim()}
                  className="bg-primary h-14 rounded-2xl items-center justify-center flex-row shadow-lg shadow-rose-600/30 mb-2"
                  style={{ opacity: selling || product.quantity <= 0 || customerPhone.replace(/\D/g, '').length < 10 || !customerName.trim() ? 0.5 : 1 }}
                  activeOpacity={0.85}
                >
                  {selling ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="bag-check" size={20} color="#ffffff" />
                      <Typography variant="title-sm" color="white" weight="bold" className="ml-2">
                        {product.quantity <= 0 ? 'Out of Stock' : `Confirm Sale (${quantity} Sets) • ₹${product.price * quantity}`}
                      </Typography>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : !completedSale && !lookingUp ? (
              /* Colorful Empty Guidance Card */
              <View className="items-center justify-center p-5 bg-gradient-to-b from-white via-rose-50/40 to-pink-50/50 rounded-3xl border border-rose-200/80 shadow-xs mt-1 mb-2">
                <View className="w-14 h-14 rounded-2xl bg-primary items-center justify-center shadow-md shadow-rose-500/25 mb-3">
                  <Ionicons name="sparkles" size={24} color="#fbbf24" />
                </View>
                <Typography variant="title-sm" className="text-rose-950 font-bold text-center">
                  Instant Stock Lookup & Sale
                </Typography>
                <Typography variant="caption" className="text-slate-600 text-center mt-1 leading-4 max-w-xs">
                  Enter Special ID above to immediately verify inventory, decrement stock, and generate a customer WhatsApp receipt.
                </Typography>

                <View className="flex-row items-center gap-2 mt-3 pt-2.5 border-t border-rose-100">
                  <View className="bg-rose-100 px-2.5 py-0.5 rounded-full flex-row items-center">
                    <Ionicons name="checkmark-circle" size={12} color="#e11d48" />
                    <Typography variant="caption" className="text-rose-700 font-bold ml-1">
                      Direct Billing
                    </Typography>
                  </View>
                  <View className="bg-emerald-100 px-2.5 py-0.5 rounded-full flex-row items-center">
                    <Ionicons name="logo-whatsapp" size={12} color="#059669" />
                    <Typography variant="caption" className="text-emerald-700 font-bold ml-1">
                      WhatsApp Bill
                    </Typography>
                  </View>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Reusable Customer Account Creation Modal */}
      <CreateCustomerModal
        visible={showCreateCustomerModal}
        onClose={() => setShowCreateCustomerModal(false)}
        initialPhone={customerPhone}
        initialName={customerName}
        onSuccess={(created) => {
          setVerifiedCustomer(created);
          setCustomerLookupStatus('found');
          setCustomerPhone(created.phone || customerPhone);
          setCustomerName(created.full_name);
        }}
      />
    </Modal>
  );
}

