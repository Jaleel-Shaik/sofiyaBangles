import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  lookupProductByCode,
  sellProductByCode,
  lookupCustomerByPhone,
  createCustomer,
  updateProductStock,
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

  const [code, setCode] = useState(incomingTarget);
  const [lookingUp, setLookingUp] = useState(false);
  const [product, setProduct] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [quantity, setQuantity] = useState(() => (params.qty ? Math.max(1, parseInt(params.qty, 10) || 1) : 1));
  const [selling, setSelling] = useState(false);
  const [customerName, setCustomerName] = useState(params.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(params.customerPhone || '');
  const [completedSale, setCompletedSale] = useState<SaleReceiptDetails | null>(null);

  const productImageUri = useMemo(() => getProductImageUri(product), [product]);

  // Customer verification state
  const [checkingCustomer, setCheckingCustomer] = useState(false);
  const [verifiedCustomer, setVerifiedCustomer] = useState<any | null>(null);
  const [customerLookupStatus, setCustomerLookupStatus] = useState<'idle' | 'found' | 'not_found'>('idle');

  // Reusable Customer account creation modal state
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);

  const hasAutoLookedUp = React.useRef(false);

  const handleLookup = useCallback(async (codeToLookup?: string) => {
    const rawTarget = (codeToLookup !== undefined ? codeToLookup : (code || params.id || params.code || '')).trim();
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

      // 1. Try exact match first (preserves case for Firestore document ID or exact code)
      try {
        data = await lookupProductByCode(rawTarget);
      } catch (firstErr: any) {
        // 2. If exact failed, try uppercased (standard for unique codes e.g. sil-101 -> SIL-101)
        const upper = rawTarget.toUpperCase();
        if (upper !== rawTarget) {
          try {
            data = await lookupProductByCode(upper);
          } catch {
            // continue to next fallback
          }
        }

        // 3. If params.id is available and distinct, try params.id directly
        if (!data && params.id && params.id !== rawTarget && params.id !== upper) {
          try {
            data = await lookupProductByCode(params.id);
          } catch {
            // continue
          }
        }

        // 4. Try getProductById fallback from products API
        if (!data) {
          try {
            const byId = await getProductById(rawTarget);
            if (byId) data = byId;
          } catch {
            // ignore
          }
        }

        if (!data && params.id && params.id !== rawTarget) {
          try {
            const byId = await getProductById(params.id);
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
        if (params.qty) {
          const q = parseInt(params.qty, 10);
          setQuantity(q && q >= 1 ? Math.min(data.quantity || 1, q) : 1);
        } else {
          setQuantity(1);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || `Product with ID/code '${rawTarget}' was not found.`);
    } finally {
      setLookingUp(false);
    }
  }, [code, params.id, params.code, params.qty]);

  useEffect(() => {
    if (incomingTarget && !hasAutoLookedUp.current) {
      hasAutoLookedUp.current = true;
      handleLookup(incomingTarget);
    }
  }, [incomingTarget, handleLookup]);

  useEffect(() => {
    if (params.qty) {
      const q = parseInt(params.qty, 10);
      if (q && q >= 1) setQuantity(q);
    }
  }, [params.qty]);

  const [isRestocking, setIsRestocking] = useState(false);

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

  useEffect(() => {
    if (params.customerPhone) {
      setCustomerPhone(params.customerPhone);
      handleCheckCustomer(params.customerPhone);
    }
  }, [params.customerPhone]);

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

    const cleanPhone = customerPhone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert(
        'Customer Mobile Required',
        'Please enter a valid 10-digit customer mobile number to link and sync this purchase to their mobile app.'
      );
      return;
    }

    // Strict Authentication: verify customer exists or show popup modal / auto-create
    let customerToUse = verifiedCustomer;
    if (!customerToUse) {
      setCheckingCustomer(true);
      try {
        const res = await lookupCustomerByPhone(cleanPhone);
        if (res?.found && res.user) {
          customerToUse = res.user;
          setVerifiedCustomer(res.user);
          setCustomerLookupStatus('found');
        } else {
          if (customerName.trim()) {
            const created = await createCustomer({
              full_name: customerName.trim(),
              phone: cleanPhone,
              email: `customer_${cleanPhone.slice(-10)}@sofiyabangles.com`,
            });
            customerToUse = created;
            setVerifiedCustomer(created);
            setCustomerLookupStatus('found');
          } else {
            setVerifiedCustomer(null);
            setCustomerLookupStatus('not_found');
            setShowCreateCustomerModal(true);
            setCheckingCustomer(false);
            return;
          }
        }
      } catch {
        if (customerName.trim()) {
          try {
            const created = await createCustomer({
              full_name: customerName.trim(),
              phone: cleanPhone,
              email: `customer_${cleanPhone.slice(-10)}@sofiyabangles.com`,
            });
            customerToUse = created;
            setVerifiedCustomer(created);
            setCustomerLookupStatus('found');
          } catch {
            setCustomerLookupStatus('not_found');
            setShowCreateCustomerModal(true);
            setCheckingCustomer(false);
            return;
          }
        } else {
          setCustomerLookupStatus('not_found');
          setShowCreateCustomerModal(true);
          setCheckingCustomer(false);
          return;
        }
      }
      setCheckingCustomer(false);
    }

    setSelling(true);
    try {
      const notes = params.orderNumber
        ? `WhatsApp Order #${params.orderNumber}`
        : `Quick Sell via Mobile Admin`;

      const updated = await sellProductByCode(product.unique_code || product.id, quantity, {
        customer_name: customerName.trim() || customerToUse?.full_name || undefined,
        customer_phone: customerPhone.trim(),
        notes,
        order_number: params.orderNumber || undefined,
      });

      const remaining = typeof updated?.quantity === 'number' ? updated.quantity : Math.max(0, product.quantity - quantity);
      const totalAmount = product.price * quantity;
      const orderNumber = params.orderNumber || updated?.order?.order_number || `ORD-${Date.now().toString().slice(-6)}`;
      const enteredPhone = customerPhone.trim();
      const enteredName = customerName.trim() || customerToUse?.full_name || '';

      setCompletedSale({
        name: product.product_name,
        code: product.unique_code || targetCodeSummary(product),
        qty: quantity,
        remaining,
        total: totalAmount,
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
      setVerifiedCustomer(null);
      setCustomerLookupStatus('idle');
    } catch (err: any) {
      if (err.message?.includes('CUSTOMER_NOT_FOUND') || err.message?.includes('Customer account not found')) {
        Alert.alert(
          'Customer Account Required',
          'Only authenticated and authorized registered customers can purchase products. Would you like to create an account now?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Create Account',
              onPress: () => setShowCreateCustomerModal(true),
            },
          ]
        );
      } else {
        Alert.alert('Sale Failed', err.message || 'Could not complete sale.');
      }
    } finally {
      setSelling(false);
    }
  };

  // WhatsApp bill generation and sharing
  const handleShareWhatsApp = async () => {
    if (!completedSale) return;
    try {
      await openWhatsAppSaleReceipt(completedSale);
    } catch {
      Alert.alert('Error', 'Could not open WhatsApp. Please ensure WhatsApp is installed.');
    }
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
    <View className="flex-1 bg-[#FAF7F8]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Vibrant Brand Hero Header */}
        <View
          className="px-5 pb-5 bg-primary border-b border-rose-600 shadow-md"
          style={{ paddingTop: Math.max(insets.top + 12, 36) }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-11 h-11 bg-white/20 rounded-full items-center justify-center mr-3 border border-white/30"
                activeOpacity={0.7}
                hitSlop={touchTargets.hitSlop}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Ionicons name="arrow-back" size={22} color="#ffffff" />
              </TouchableOpacity>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Ionicons name="sparkles" size={12} color="#fbbf24" />
                  <Typography variant="overline" color="white" className="ml-1 tracking-widest font-bold opacity-90">
                    SOFIYA BANGLES • SALE COUNTER
                  </Typography>
                </View>
                <Typography variant="title-lg" color="white" weight="bold" numberOfLines={1}>
                  Quick Sell by Special ID
                </Typography>
              </View>
            </View>

            <View className="bg-white/20 border border-white/30 px-3 py-1.5 rounded-full flex-row items-center">
              <Ionicons name="flash" size={13} color="#fbbf24" />
              <Typography variant="label-sm" color="white" className="ml-1 font-mono font-bold">
                LIVE
              </Typography>
            </View>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom + 40, 60) }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* WhatsApp Order Fulfillment Header Banner */}
          {params.orderNumber ? (
            <View className="mb-4 p-4 bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-300 rounded-3xl flex-row items-center shadow-xs">
              <View className="w-12 h-12 rounded-2xl bg-primary items-center justify-center mr-3 shadow-sm shadow-rose-500/30">
                <Ionicons name="cart" size={22} color="#ffffff" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <View className="bg-rose-200/80 px-2 py-0.5 rounded-md mr-1.5">
                    <Typography variant="overline" color="brand-primary">WhatsApp Order</Typography>
                  </View>
                  <Typography variant="label-sm" className="text-rose-700 font-mono font-bold">
                    #{params.orderNumber}
                  </Typography>
                </View>
                {params.customerName || params.customerPhone ? (
                  <Typography variant="caption" color="secondary" className="mt-1">
                    Customer: {[params.customerName, params.customerPhone].filter(Boolean).join(" • ")}
                  </Typography>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Lookup Input Card */}
          <View className="bg-white rounded-3xl border border-rose-100 p-4 mb-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className="w-6 h-6 rounded-lg bg-rose-100 items-center justify-center mr-2">
                  <Ionicons name="barcode-outline" size={14} color={colors.brand.primary} />
                </View>
                <Typography variant="overline" className="text-rose-950 font-bold">
                  Enter Product Special ID
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
                  placeholder="e.g. SIL-101, GLA-1001..."
                  placeholderTextColor={colors.text.muted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={() => handleLookup()}
                  className="flex-1 px-3 text-body-md font-bold text-slate-900 tracking-wider"
                />
                {code ? (
                  <TouchableOpacity
                    onPress={() => {
                      setCode('');
                      setProduct(null);
                      setErrorMsg('');
                    }}
                    hitSlop={touchTargets.hitSlop}
                    className="w-11 h-11 items-center justify-center -mr-2"
                  >
                    <Ionicons name="close-circle" size={20} color={colors.text.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => handleLookup()}
                disabled={lookingUp || !code.trim()}
                className="bg-primary px-5 rounded-2xl items-center justify-center shadow-md shadow-rose-500/25 min-w-[76px] h-12"
                style={{ opacity: lookingUp || !code.trim() ? 0.6 : 1 }}
                activeOpacity={0.8}
              >
                {lookingUp ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <View className="flex-row items-center">
                    <Ionicons name="sparkles" size={14} color="#fbbf24" />
                    <Typography variant="label-md" color="white" className="ml-1.5 font-bold">
                      Find
                    </Typography>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Error Card */}
          {errorMsg ? (
            <View className="p-4 bg-red-50 border border-red-200 rounded-3xl flex-row items-center mb-4 shadow-xs">
              <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center mr-3">
                <Ionicons name="alert-circle" size={22} color={colors.status.error} />
              </View>
              <View className="flex-1">
                <Typography variant="label-md" color="error">
                  Product Not Found
                </Typography>
                <Typography variant="caption" color="error" className="mt-0.5">
                  {errorMsg}
                </Typography>
              </View>
            </View>
          ) : null}

          {/* Success Recorded Card */}
          {completedSale ? (
            <View className="p-5 bg-gradient-to-b from-emerald-50 via-teal-50/50 to-white border border-emerald-300 rounded-3xl mb-5 shadow-sm">
              <View className="flex-row items-center mb-3">
                <View className="w-12 h-12 rounded-2xl bg-emerald-500 items-center justify-center mr-3 shadow-md shadow-emerald-500/25">
                  <Ionicons name="checkmark-circle" size={28} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Typography variant="title-sm" className="text-emerald-950 font-bold">
                    Sale Recorded Successfully!
                  </Typography>
                  <Typography variant="caption" className="text-emerald-700 font-medium">
                    Inventory stock automatically decremented
                  </Typography>
                </View>
              </View>

              <View className="bg-white p-4 rounded-2xl border border-emerald-200 mb-4 space-y-2.5 shadow-xs">
                {completedSale.orderNumber && (
                  <View className="flex-row justify-between items-center">
                    <Typography variant="caption" color="secondary">
                      Order Number
                    </Typography>
                    <Typography variant="label-sm" className="font-mono text-slate-800">
                      {completedSale.orderNumber}
                    </Typography>
                  </View>
                )}
                <View className="flex-row justify-between items-center">
                  <Typography variant="caption" color="secondary">
                    Product
                  </Typography>
                  <Typography variant="label-md" color="primary" numberOfLines={1} className="flex-1 text-right ml-2 font-bold">
                    {completedSale.name}
                  </Typography>
                </View>
                <View className="flex-row justify-between items-center">
                  <Typography variant="caption" color="secondary">
                    Special ID
                  </Typography>
                  <View className="bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    <Typography variant="label-sm" className="font-mono text-indigo-700 font-bold">
                      {completedSale.code}
                    </Typography>
                  </View>
                </View>
                <View className="flex-row justify-between items-center">
                  <Typography variant="caption" color="secondary">
                    Quantity Sold
                  </Typography>
                  <Typography variant="label-md" className="text-emerald-700 font-bold">
                    {completedSale.qty} set(s)
                  </Typography>
                </View>
                <View className="pt-2.5 border-t border-emerald-100 flex-row justify-between items-center">
                  <Typography variant="label-lg" color="primary" weight="bold">
                    Total Collected
                  </Typography>
                  <Typography variant="title-md" className="text-rose-600 font-extrabold">
                    ₹{completedSale.total}
                  </Typography>
                </View>
                <View className="flex-row justify-between items-center">
                  <Typography variant="caption" color="secondary">
                    Remaining In Stock
                  </Typography>
                  <Typography variant="label-sm" className="text-emerald-800 font-bold">
                    {completedSale.remaining} units
                  </Typography>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleShareWhatsApp}
                className="w-full h-12 bg-[#25D366] rounded-2xl items-center justify-center flex-row shadow-md shadow-green-500/20 mb-3"
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#ffffff" />
                <Typography variant="label-lg" color="white" className="ml-2 font-bold">
                  Share WhatsApp Bill
                </Typography>
              </TouchableOpacity>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handleResetForNext}
                  className="flex-1 h-12 bg-emerald-700 rounded-2xl items-center justify-center shadow-xs"
                  activeOpacity={0.8}
                >
                  <Typography variant="label-lg" color="white">
                    Sell Another
                  </Typography>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.back()}
                  className="h-12 bg-white border border-emerald-300 px-6 rounded-2xl items-center justify-center"
                  activeOpacity={0.8}
                >
                  <Typography variant="label-lg" className="text-emerald-900 font-bold">
                    Done
                  </Typography>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Product Details & Sale Configuration */}
          {product ? (
            <View className="gap-4">
              {/* Product Info Card with Rose Branding */}
              <View className="bg-white rounded-3xl border border-rose-100 p-4 shadow-sm">
                <View className="flex-row items-center">
                  <View
                    style={{ width: 84, height: 84 }}
                    className="rounded-2xl bg-rose-50 border border-rose-200 overflow-hidden items-center justify-center mr-3.5"
                  >
                    {productImageUri ? (
                      <Image
                        source={{ uri: productImageUri }}
                        style={{ width: 84, height: 84 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="items-center justify-center">
                        <Ionicons name="sparkles" size={28} color={colors.brand.primary} />
                        <Typography variant="overline" className="text-rose-400 mt-1 text-[9px]">
                          No Photo
                        </Typography>
                      </View>
                    )}
                  </View>

                  <View className="flex-1 justify-center">
                    <View className="flex-row items-center gap-2 mb-1.5 flex-wrap">
                      <View className="bg-indigo-600 px-2.5 py-0.5 rounded-lg shadow-xs">
                        <Typography variant="overline" color="white" className="font-mono font-bold">
                          {product.unique_code || 'CODE'}
                        </Typography>
                      </View>
                      <View
                        className={`px-2.5 py-0.5 rounded-lg border ${
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

                    <Typography variant="title-sm" className="text-slate-900 font-bold" numberOfLines={2}>
                      {product.product_name}
                    </Typography>
                    <Typography variant="caption" color="secondary" className="mt-0.5">
                      {product.model_type_name || 'Model'} • {product.category_name || STRINGS.admin.collections.collection}
                    </Typography>
                    <View className="mt-2 self-start bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl flex-row items-baseline">
                      <Typography variant="title-md" className="text-rose-600 font-black">
                        ₹{product.price}
                      </Typography>
                      <Typography variant="caption" className="text-rose-400 font-normal ml-1">
                        / set
                      </Typography>
                    </View>
                  </View>
                </View>
              </View>

              {/* Quantity Selector Card */}
              <View className="bg-white rounded-3xl border border-rose-100 p-4 shadow-sm">
                <View className="flex-row items-center justify-between mb-4">
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
                      className="w-11 h-11 rounded-xl bg-white border border-rose-200 items-center justify-center shadow-xs"
                      style={{ opacity: quantity <= 1 ? 0.35 : 1 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="remove" size={18} color={colors.brand.primary} />
                    </TouchableOpacity>

                    <Typography
                      variant="title-md"
                      className="mx-4 min-w-[28px] text-center font-mono text-rose-950 font-black"
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
                      className="w-11 h-11 rounded-xl bg-primary items-center justify-center shadow-xs"
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Quick Restock Bar if stock is low or reached */}
                {(quantity >= product.quantity || product.quantity <= 2) && (
                  <View className="mb-4 p-3 bg-gradient-to-r from-rose-50 to-amber-50/60 border border-rose-200/80 rounded-2xl">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Ionicons name="cube-outline" size={16} color={colors.brand.primary} />
                        <Typography variant="caption" className="text-rose-950 ml-1.5 font-bold">
                          {product.quantity <= 0 ? 'Out of stock' : `Max stock: ${product.quantity} left`}
                        </Typography>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <TouchableOpacity
                          onPress={() => handleQuickRestock(5)}
                          disabled={isRestocking}
                          className="bg-primary px-3 h-8 rounded-xl flex-row items-center justify-center shadow-xs"
                        >
                          {isRestocking ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <>
                              <Ionicons name="add" size={14} color="#ffffff" />
                              <Typography variant="label-sm" color="white" className="ml-0.5 font-bold">
                                +5 Stock
                              </Typography>
                            </>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleQuickRestock(10)}
                          disabled={isRestocking}
                          className="bg-rose-700 px-3 h-8 rounded-xl items-center justify-center shadow-xs"
                        >
                          <Typography variant="label-sm" color="white" className="font-bold">
                            +10 Stock
                          </Typography>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {/* Customer Account (Mobile App Sync) */}
                <View className="pt-3.5 mt-2 border-t border-rose-100">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-row items-center">
                      <View className="w-6 h-6 rounded-lg bg-rose-100 items-center justify-center mr-2">
                        <Ionicons name="phone-portrait-outline" size={14} color={colors.brand.primary} />
                      </View>
                      <Typography variant="overline" className="text-rose-950 font-bold">
                        Customer Account (Mobile App Sync)
                      </Typography>
                    </View>
                    <View className="bg-rose-600 px-2 py-0.5 rounded-full">
                      <Typography variant="overline" color="white">
                        Required
                      </Typography>
                    </View>
                  </View>

                  <Typography variant="caption" color="secondary" className="mb-2.5 leading-4">
                    Enter customer phone number to verify their registered account and sync this purchase to their mobile app.
                  </Typography>

                  <View className="gap-2.5">
                    <View className="relative">
                      <TextInput
                        value={customerPhone}
                        onChangeText={(val) => {
                          setCustomerPhone(val);
                          if (customerLookupStatus !== 'idle') {
                            setCustomerLookupStatus('idle');
                            setVerifiedCustomer(null);
                          }
                          const digits = val.replace(/\D/g, '');
                          if (digits.length === 10) {
                            handleCheckCustomer(val);
                          }
                        }}
                        onBlur={() => handleCheckCustomer()}
                        placeholder="Customer Mobile Number (10 digits)"
                        placeholderTextColor={colors.text.muted}
                        keyboardType="phone-pad"
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

                    {customerLookupStatus === 'found' && verifiedCustomer && (
                      <View className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 flex-row items-center justify-between shadow-xs">
                        <View className="flex-row items-center flex-1 mr-2">
                          <Ionicons name="shield-checkmark" size={18} color={colors.status.success} />
                          <Typography variant="label-sm" className="text-emerald-950 font-bold ml-1.5" numberOfLines={1}>
                            Verified: {verifiedCustomer.full_name || 'Customer'} ({verifiedCustomer.phone || customerPhone})
                          </Typography>
                        </View>
                        <View className="bg-emerald-600 px-2.5 py-0.5 rounded-full">
                          <Typography variant="overline" color="white">
                            Authorized
                          </Typography>
                        </View>
                      </View>
                    )}

                    {customerLookupStatus === 'not_found' && (
                      <View className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 shadow-xs">
                        <View className="flex-row items-center mb-1">
                          <Ionicons name="person-remove-outline" size={18} color={colors.status.warning} />
                          <Typography variant="label-md" className="text-amber-950 ml-1.5 font-bold">
                            Customer Account Not Found
                          </Typography>
                        </View>
                        <Typography variant="caption" className="text-amber-800 mb-2.5 leading-4">
                          Only authenticated & authorized registered customers can purchase products.
                        </Typography>
                        <TouchableOpacity
                          onPress={() => setShowCreateCustomerModal(true)}
                          className="bg-gradient-to-r from-amber-600 to-rose-600 h-11 px-4 rounded-xl items-center justify-center flex-row shadow-sm shadow-amber-600/25"
                          activeOpacity={0.8}
                        >
                          <Ionicons name="person-add" size={16} color="#ffffff" />
                          <Typography variant="label-md" color="white" className="ml-1.5 font-bold">
                            Create & Authorize Customer Account
                          </Typography>
                        </TouchableOpacity>
                      </View>
                    )}

                    <TextInput
                      value={customerName}
                      onChangeText={setCustomerName}
                      placeholder="Customer Full Name"
                      placeholderTextColor={colors.text.muted}
                      className="bg-rose-50/30 border border-rose-200 rounded-xl px-3.5 h-12 text-body-sm text-slate-900"
                    />
                  </View>
                </View>

                {/* Total Breakdown Banner */}
                <View className="pt-3.5 mt-3.5 border-t border-rose-100 bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50/40 rounded-2xl p-4 flex-row items-center justify-between">
                  <Typography variant="label-md" className="text-rose-900 font-semibold">
                    Total Payable ({quantity} × ₹{product.price}):
                  </Typography>
                  <Typography variant="headline-sm" className="text-rose-600 font-black">
                    ₹{product.price * quantity}
                  </Typography>
                </View>
              </View>

              {/* Sell Action Button with Vibrant Rose Gradient */}
              <TouchableOpacity
                onPress={handleSell}
                disabled={selling || product.quantity <= 0}
                className="bg-primary h-14 rounded-2xl items-center justify-center flex-row shadow-lg shadow-rose-600/30 mb-2"
                style={{ opacity: selling || product.quantity <= 0 ? 0.5 : 1 }}
                activeOpacity={0.85}
              >
                {selling ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="bag-check" size={20} color="#ffffff" />
                    <Typography variant="title-sm" color="white" weight="bold" className="ml-2">
                      {product.quantity <= 0
                        ? 'Out of Stock'
                        : `Confirm Sale • ₹${product.price * quantity}`}
                    </Typography>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : !completedSale && !lookingUp ? (
            /* Colorful Empty State with Sofiya Bangles Theme */
            <View className="items-center justify-center p-6 bg-gradient-to-b from-white via-rose-50/40 to-pink-50/50 rounded-3xl border border-rose-200/80 shadow-xs mt-2">
              <View className="w-18 h-18 rounded-3xl bg-primary items-center justify-center shadow-lg shadow-rose-500/30 mb-4">
                <Ionicons name="sparkles" size={32} color="#fbbf24" />
              </View>
              <Typography variant="title-md" className="text-rose-950 font-bold text-center">
                Direct Sales & Instant Billing
              </Typography>
              <Typography variant="body-sm" className="text-slate-600 text-center mt-1.5 leading-5 max-w-xs">
                Look up any bangle set by its Special ID to verify live stock, register customer purchase, and auto-generate WhatsApp receipts.
              </Typography>

              {/* Feature highlight pills */}
              <View className="flex-row flex-wrap items-center justify-center gap-2 mt-4 pt-3 border-t border-rose-100">
                <View className="bg-rose-100 px-3 py-1 rounded-full flex-row items-center">
                  <Ionicons name="checkmark-circle" size={13} color="#e11d48" />
                  <Typography variant="caption" className="text-rose-700 font-bold ml-1">
                    Direct Billing
                  </Typography>
                </View>
                <View className="bg-indigo-100 px-3 py-1 rounded-full flex-row items-center">
                  <Ionicons name="cube" size={13} color="#6366f1" />
                  <Typography variant="caption" className="text-indigo-700 font-bold ml-1">
                    Auto Stock Sync
                  </Typography>
                </View>
                <View className="bg-emerald-100 px-3 py-1 rounded-full flex-row items-center">
                  <Ionicons name="logo-whatsapp" size={13} color="#059669" />
                  <Typography variant="caption" className="text-emerald-700 font-bold ml-1">
                    WhatsApp Bill
                  </Typography>
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>
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
    </View>
  );
}

