import type { Product } from '@/src/api/products';
import { api } from "@/src/api";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useCallback, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';

import {
  sellProduct,
  deleteProduct,
  updateProductStock,
  lookupCustomerByPhone,
  createCustomer,
} from '@/src/api/admin';
import { openWhatsAppSaleReceipt, type SaleReceiptDetails } from '@/src/utils/whatsapp';
import CreateCustomerModal from '@/src/components/CreateCustomerModal';
import { Typography } from '@/src/components/ui/Typography';
import { colors, touchTargets } from '@/src/theme/tokens';

export default function ProductDetailScreen() {
  const { id, qty, orderNumber, action } = useLocalSearchParams<{
    id: string;
    qty?: string;
    orderNumber?: string;
    action?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [sellQty, setSellQty] = useState(() => (qty ? Math.max(1, parseInt(qty as string, 10) || 1) : 1));
  const [selling, setSelling] = useState(false);

  // Customer Verification & Sell Modal State
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [checkingCustomer, setCheckingCustomer] = useState(false);
  const [verifiedCustomer, setVerifiedCustomer] = useState<any | null>(null);
  const [customerLookupStatus, setCustomerLookupStatus] = useState<'idle' | 'found' | 'not_found'>('idle');

  // Customer account creation modal state
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleReceiptDetails | null>(null);

  // Stock Management Modal State
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [savingStock, setSavingStock] = useState(false);
  const [targetStockQty, setTargetStockQty] = useState(0);
  const [variantStockList, setVariantStockList] = useState<Array<{ id: string; size: string; quantity: number }>>([]);

  const handleOpenStockModal = () => {
    if (!product) return;
    const safeVariants = Array.isArray(product.variants) ? product.variants : [];
    if (product.has_variants && safeVariants.length > 0) {
      const list = safeVariants.map((v: any) => ({
        id: v.id || '',
        size: v.size || 'Std',
        quantity: typeof v.quantity === 'number' ? v.quantity : parseInt(String(v.quantity || 0), 10) || 0,
      }));
      setVariantStockList(list);
      const total = list.reduce((sum, item) => sum + item.quantity, 0);
      setTargetStockQty(total || product.quantity || 0);
    } else {
      setVariantStockList([]);
      setTargetStockQty(product.quantity || 0);
    }
    setStockModalVisible(true);
  };

  const handleSaveStock = async () => {
    if (!product) return;
    setSavingStock(true);
    try {
      let updatedProduct: any;
      if (variantStockList.length > 0) {
        const total = variantStockList.reduce((sum, v) => sum + v.quantity, 0);
        updatedProduct = await updateProductStock(product.id, {
          quantity: total,
          variants: variantStockList,
        });
      } else {
        updatedProduct = await updateProductStock(product.id, targetStockQty);
      }
      setProduct((prev: any) => ({
        ...prev,
        ...updatedProduct,
        quantity: updatedProduct?.quantity ?? targetStockQty,
        variants: updatedProduct?.variants ?? prev?.variants,
      }));
      Alert.alert('Stock Updated', `Inventory for "${product.product_name}" updated successfully.`);
      setStockModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update stock');
    } finally {
      setSavingStock(false);
    }
  };

  useEffect(() => {
    if (qty) {
      const parsed = parseInt(qty as string, 10);
      if (parsed && parsed >= 1) setSellQty(parsed);
    }
  }, [qty]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const prod = await api.products.getProductById(id as string);
      setProduct(prod);
    } catch (error) {
      console.error('Failed to load product', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => { fetchProduct(); }, [id])
  );

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



  const handleConfirmSell = async () => {
    if (!product) return;

    if (sellQty < 1) {
      Alert.alert('Invalid Quantity', 'Quantity must be at least 1.');
      return;
    }
    if (sellQty > product.quantity) {
      Alert.alert('Insufficient Stock', `Only ${product.quantity} items available in stock.`);
      return;
    }

    const cleanPhone = customerPhone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Customer Mobile Required', 'Please enter a valid 10-digit customer mobile number.');
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
          // If customer not registered, auto-register or prompt modal
          if (!customerName.trim()) {
            setVerifiedCustomer(null);
            setCustomerLookupStatus('not_found');
            setShowCreateCustomerModal(true);
            setCheckingCustomer(false);
            return;
          }
          // Auto create customer account with provided name and phone
          const created = await createCustomer({
            full_name: customerName.trim(),
            phone: customerPhone.trim(),
            email: `customer_${cleanPhone.slice(-10)}@sofiyabangles.com`,
          });
          customerToUse = created;
          setVerifiedCustomer(created);
          setCustomerLookupStatus('found');
        }
      } catch (custErr: any) {
        setCustomerLookupStatus('not_found');
        setShowCreateCustomerModal(true);
        setCheckingCustomer(false);
        return;
      }
      setCheckingCustomer(false);
    }

    setSelling(true);
    try {
      const notes = orderNumber
        ? `WhatsApp Order #${orderNumber}`
        : `Direct Product Detail Sale`;

      const updated = await sellProduct(product.id, sellQty, {
        customer_name: customerName.trim() || customerToUse?.full_name || undefined,
        customer_phone: customerPhone.trim(),
        notes,
        order_number: orderNumber || undefined,
      });

      const remaining = typeof updated?.quantity === 'number' ? updated.quantity : Math.max(0, product.quantity - sellQty);
      const totalAmount = product.price * sellQty;
      const loggedOrderNumber = orderNumber || updated?.order?.order_number || `ORD-${Date.now().toString().slice(-6)}`;
      const enteredPhone = customerPhone.trim();
      const enteredName = customerName.trim() || customerToUse?.full_name || '';

      setProduct((prev: any) => ({
        ...prev,
        ...updated,
        quantity: remaining,
      }));

      setSellModalVisible(false);

      setCompletedSale({
        name: product.product_name,
        code: product.unique_code || `BAN-${product.id.slice(-4).toUpperCase()}`,
        qty: sellQty,
        remaining,
        total: totalAmount,
        orderNumber: loggedOrderNumber,
        customerPhone: enteredPhone,
        customerName: enteredName,
      });

      setSellQty(1);
      setCustomerName('');
      setCustomerPhone('');
      setVerifiedCustomer(null);
      setCustomerLookupStatus('idle');
    } catch (err: any) {
      if (err.message?.includes('CUSTOMER_NOT_FOUND') || err.message?.includes('Customer account not found')) {
        Alert.alert(
          'Customer Account Required',
          'Only registered customers can purchase products. Would you like to create an account now?',
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

  const handleShareWhatsApp = async () => {
    if (!completedSale) return;
    try {
      await openWhatsAppSaleReceipt(completedSale);
    } catch {
      Alert.alert('Error', 'Could not open WhatsApp.');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#FAFAFA] items-center justify-center">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 bg-[#FAFAFA] items-center justify-center">
        <Ionicons name="cube-outline" size={48} color="#cbd5e1" />
        <Text className="text-text-hint mt-4 text-base font-medium">Product not found</Text>
      </View>
    );
  }

  const isOutOfStock = product.quantity <= 0;
  const images = product.images && product.images.length > 0 
    ? product.images.map((img: any) => typeof img === 'string' ? img : img.image_url) 
    : product.image_url ? [product.image_url] : [];

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View
        className="px-5 pb-5 bg-primary/5"
        style={{ paddingTop: Math.max(insets.top + 16, 40) }}
      >
        <View className="flex-row items-center justify-between mb-1">
          <TouchableOpacity
            className="w-10 h-10 bg-surface rounded-full items-center justify-center border border-divider"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#e11d48" />
          </TouchableOpacity>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="w-10 h-10 bg-emerald-50 rounded-full items-center justify-center border border-emerald-200"
              onPress={handleOpenStockModal}
              accessibilityLabel="Update Stock"
            >
              <Ionicons name="cube-outline" size={20} color="#059669" />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-10 h-10 bg-primary rounded-full items-center justify-center shadow-xs"
              onPress={() => router.push({
                pathname: '/(admin)/quick-sell',
                params: { code: product.unique_code || product.id, id: product.id },
              })}
              accessibilityLabel="Quick Sell Counter"
            >
              <Ionicons name="sparkles" size={17} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-10 h-10 bg-surface rounded-full items-center justify-center border border-divider"
              onPress={() => router.push({ pathname: '/(admin)/(tabs)/edit-product/[id]', params: { id: product.id } })}
            >
              <Ionicons name="pencil" size={20} color="#e11d48" />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-10 h-10 bg-surface rounded-full items-center justify-center border border-divider"
              onPress={() => {
                Alert.alert(
                  'Delete Product',
                  `Are you sure you want to delete "${product.product_name}"? This cannot be undone.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await deleteProduct(product.id);
                          router.back();
                        } catch (err: any) {
                          Alert.alert('Error', err.message || 'Failed to delete product');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
        <Text className="text-primary font-semibold text-xs uppercase tracking-widest mb-0.5 ml-[52px]">Admin Space</Text>
        <Text className="text-2xl font-bold text-text-primary ml-[52px]" numberOfLines={1}>{product.product_name}</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {orderNumber ? (
          <View className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex-row items-center shadow-xs">
            <View className="w-10 h-10 rounded-xl bg-[#E8436E] items-center justify-center mr-3 shadow-xs">
              <Ionicons name="cart" size={20} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-900">
                WhatsApp Purchase Order Fulfillment
              </Text>
              <Text className="text-xs text-rose-700 font-mono font-semibold mt-0.5">
                Order #{orderNumber}
              </Text>
            </View>
          </View>
        ) : null}

        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
            {images.map((uri, idx) => (
              <View key={idx} className="mr-3">
                <Image source={{ uri }} className="w-72 h-72 rounded-2xl bg-surface" resizeMode="cover" />
              </View>
            ))}
          </ScrollView>
        )}

        <View className="bg-surface rounded-2xl p-5 mb-4 border border-divider">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-text-primary">Product Information</Text>
            <View className={`px-3 py-1 rounded-full ${product.is_active === false ? 'bg-slate-100 border border-divider' : 'bg-success/10'}`}>
              <Text className={`text-xs font-bold ${product.is_active === false ? 'text-text-hint' : 'text-success'}`}>
                {product.is_active === false ? 'Draft' : 'Active'}
              </Text>
            </View>
          </View>
          <View className="space-y-3">
            <View className="flex-row justify-between py-2 border-b border-divider">
              <Text className="text-text-secondary font-medium">Code</Text>
              <Text className="text-text-primary font-bold">{product.unique_code || '—'}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b border-divider">
              <Text className="text-text-secondary font-medium">Price</Text>
              <Text className="text-[#C25B3E] font-bold">₹{product.price}</Text>
            </View>
            <View className="flex-row justify-between items-center py-2 border-b border-divider">
              <Text className="text-text-secondary font-medium">Stock</Text>
              <View className="flex-row items-center gap-2">
                <Text className={`font-bold ${isOutOfStock ? 'text-error' : 'text-text-primary'}`}>
                  {isOutOfStock ? 'Out of Stock' : `${product.quantity} units`}
                </Text>
                <TouchableOpacity
                  onPress={handleOpenStockModal}
                  className="bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200"
                >
                  <Text className="text-xs font-bold text-emerald-800">Adjust</Text>
                </TouchableOpacity>
              </View>
            </View>
            {product.has_variants && product.variants && product.variants.length > 0 && (
              <View className="py-2.5 border-b border-divider">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-text-secondary font-medium">Size Breakdown</Text>
                  <TouchableOpacity onPress={handleOpenStockModal}>
                    <Text className="text-xs font-bold text-primary">Edit Sizes</Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {product.variants.map((v: any) => (
                    <View key={v.id} className="bg-slate-50 border border-divider rounded-xl px-2.5 py-1.5 items-center">
                      <Text className="text-[11px] font-bold text-text-primary">Size {v.size}</Text>
                      <Text className={`text-[10px] font-extrabold ${(v.quantity || 0) > 0 ? 'text-emerald-700' : 'text-error'}`}>
                        {v.quantity || 0} in stock
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {product.accepts_custom_size && (
              <View className="flex-row justify-between py-2">
                <Text className="text-text-secondary font-medium">Custom Size Price</Text>
                <Text className="text-text-primary font-medium">₹{product.custom_size_price}</Text>
              </View>
            )}
          </View>
        </View>

        {product.description ? (
          <View className="bg-surface rounded-2xl p-5 mb-4 border border-divider">
            <Text className="text-lg font-bold text-text-primary mb-2">Description</Text>
            <Text className="text-text-secondary leading-relaxed">{product.description}</Text>
          </View>
        ) : null}

        <View className="bg-surface rounded-2xl p-5 mb-4 border border-divider">
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center mr-3">
              <Ionicons name="cart" size={16} color="#e11d48" />
            </View>
            <Text className="text-lg font-bold text-text-primary">Sell Product</Text>
          </View>
          {isOutOfStock ? (
            <View className="bg-error/10 p-4 rounded-xl">
              <Text className="text-error font-bold text-center">Cannot sell — out of stock.</Text>
            </View>
          ) : (
            <View>
              <View className="flex-row items-center justify-center mb-4">
                <TouchableOpacity
                  className="w-10 h-10 bg-surface rounded-xl border border-divider items-center justify-center"
                  onPress={() => setSellQty(q => Math.max(1, q - 1))}
                >
                  <Ionicons name="remove" size={20} color="#64748b" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-text-primary mx-5 min-w-[30px] text-center">{sellQty}</Text>
                <TouchableOpacity
                  className="w-10 h-10 bg-surface rounded-xl border border-divider items-center justify-center"
                  onPress={() => setSellQty(q => Math.min(product.quantity, q + 1))}
                >
                  <Ionicons name="add" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                className="bg-primary py-4 rounded-2xl items-center flex-row justify-center shadow-xs"
                onPress={() => {
                  setCustomerLookupStatus('idle');
                  setVerifiedCustomer(null);
                  setSellModalVisible(true);
                }}
                disabled={selling}
              >
                {selling ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="cart" size={20} color="white" />
                    <Text className="text-white font-bold ml-2">Sell {sellQty} Unit(s)</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text className="text-text-hint text-xs text-center mt-2">
                Decrements stock by {sellQty} (remaining: {product.quantity - sellQty})
              </Text>
              <TouchableOpacity
                className="mt-3 py-3.5 rounded-2xl items-center flex-row justify-center border border-rose-200 bg-rose-50/70 shadow-xs"
                onPress={() => router.push({
                  pathname: '/(admin)/quick-sell',
                  params: { code: product.unique_code || product.id, id: product.id },
                })}
              >
                <Ionicons name="sparkles" size={15} color={colors.brand.primary} />
                <Text className="text-rose-700 font-bold text-xs ml-1.5">
                  Open in Quick Sell Counter
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Stock Management Modal */}
      <Modal
        visible={stockModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStockModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-5">
          <View className="bg-surface w-full max-w-sm rounded-3xl p-6 shadow-xl border border-divider">
            <View className="flex-row items-center justify-between mb-4 pb-2 border-b border-divider">
              <View>
                <Text className="text-base font-bold text-text-primary">
                  Manage Stock & Availability
                </Text>
                <Text className="text-xs text-text-hint font-medium">
                  {product.product_name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setStockModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {variantStockList.length > 0 ? (
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-xs font-bold text-text-secondary uppercase">
                    Size Variants ({variantStockList.length})
                  </Text>
                  <Text className="text-xs font-black text-primary">
                    Total: {targetStockQty} units
                  </Text>
                </View>
                <ScrollView className="max-h-56">
                  {variantStockList.map((v) => (
                    <View
                      key={v.id}
                      className="flex-row items-center justify-between p-2.5 mb-2 bg-[#FAFAFA] border border-divider rounded-xl"
                    >
                      <View className="flex-row items-center">
                        <View className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 items-center justify-center mr-2">
                          <Text className="text-xs font-black text-primary">{v.size}</Text>
                        </View>
                        <Text className="text-xs text-text-hint font-medium">Size</Text>
                      </View>

                      <View className="flex-row items-center">
                        <TouchableOpacity
                          onPress={() => {
                            setVariantStockList((prev) => {
                              const next = prev.map((item) =>
                                item.id === v.id ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item
                              );
                              setTargetStockQty(next.reduce((sum, item) => sum + item.quantity, 0));
                              return next;
                            });
                          }}
                          className="w-8 h-8 rounded-lg bg-white border border-divider items-center justify-center shadow-xs"
                        >
                          <Ionicons name="remove" size={16} color="#0f172a" />
                        </TouchableOpacity>

                        <Text className="w-10 text-center font-bold text-sm text-text-primary">
                          {v.quantity}
                        </Text>

                        <TouchableOpacity
                          onPress={() => {
                            setVariantStockList((prev) => {
                              const next = prev.map((item) =>
                                item.id === v.id ? { ...item, quantity: item.quantity + 1 } : item
                              );
                              setTargetStockQty(next.reduce((sum, item) => sum + item.quantity, 0));
                              return next;
                            });
                          }}
                          className="w-8 h-8 rounded-lg bg-white border border-divider items-center justify-center shadow-xs"
                        >
                          <Ionicons name="add" size={16} color="#0f172a" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : (
              <>
                <View className="bg-[#FAFAFA] border border-divider rounded-2xl p-4 flex-row items-center justify-between mb-4">
                  <TouchableOpacity
                    onPress={() => setTargetStockQty((q) => Math.max(0, q - 1))}
                    className="w-11 h-11 rounded-xl bg-white border border-divider items-center justify-center shadow-xs"
                  >
                    <Ionicons name="remove" size={20} color="#0f172a" />
                  </TouchableOpacity>

                  <View className="items-center">
                    <Text className="text-2xl font-black text-text-primary font-mono">
                      {targetStockQty}
                    </Text>
                    <Text className="text-[10px] text-text-hint font-bold uppercase">
                      Units in Stock
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setTargetStockQty((q) => q + 1)}
                    className="w-11 h-11 rounded-xl bg-white border border-divider items-center justify-center shadow-xs"
                  >
                    <Ionicons name="add" size={20} color="#0f172a" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row gap-2 mb-6">
                  {[5, 10, 25].map((add) => (
                    <TouchableOpacity
                      key={add}
                      onPress={() => setTargetStockQty((q) => q + add)}
                      className="flex-1 py-2 bg-slate-100 rounded-xl items-center border border-divider"
                    >
                      <Text className="text-xs font-bold text-slate-700">+{add}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setStockModalVisible(false)}
                className="flex-1 py-3 bg-slate-100 rounded-xl items-center justify-center border border-divider"
              >
                <Text className="text-slate-600 font-bold text-sm">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveStock}
                disabled={savingStock}
                className="flex-1 py-3 bg-primary rounded-xl items-center justify-center shadow-sm shadow-primary/30"
              >
                {savingStock ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-bold text-sm">Save Stock</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer Verification & User Details Pop-up Modal */}
      <Modal
        visible={sellModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSellModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/60 justify-center items-center p-4"
        >
          <View className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-rose-200">
            <View className="flex-row items-center justify-between mb-3.5 pb-3 border-b border-rose-100">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 items-center justify-center mr-3 shadow-xs">
                  <Ionicons name="cart" size={20} color={colors.brand.primary} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Ionicons name="sparkles" size={11} color="#fbbf24" />
                    <Typography variant="overline" color="brand-primary" className="ml-1 tracking-wider font-bold">
                      QUICK SALE
                    </Typography>
                  </View>
                  <Typography variant="title-sm" className="text-slate-900 font-bold">
                    Customer Details
                  </Typography>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSellModalVisible(false)}
                hitSlop={touchTargets.hitSlop}
                className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 items-center justify-center"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={colors.brand.primary} />
              </TouchableOpacity>
            </View>

            {/* Product Summary Tag */}
            <View className="bg-rose-50/50 border border-rose-200 rounded-2xl p-3 mb-3.5 flex-row items-center justify-between">
              <View className="flex-1 mr-2">
                <Typography variant="label-sm" className="text-slate-900 font-bold" numberOfLines={1}>
                  {product.product_name}
                </Typography>
                <View className="self-start bg-indigo-600 px-2 py-0.5 rounded-md mt-1">
                  <Typography variant="overline" color="white" className="font-mono font-bold">
                    {product.unique_code || `BAN-${product.id.slice(-4).toUpperCase()}`}
                  </Typography>
                </View>
              </View>
              <View className="items-end">
                <Typography variant="caption" color="secondary">
                  {sellQty} unit(s)
                </Typography>
                <Typography variant="title-sm" className="text-rose-600 font-black">
                  ₹{product.price * sellQty}
                </Typography>
              </View>
            </View>

            {/* Mobile Number Input */}
            <View className="mb-3">
              <Typography variant="overline" className="text-slate-700 mb-1 font-bold">
                Customer Mobile Number *
              </Typography>
              <View className="flex-row items-center bg-rose-50/30 border border-rose-200 rounded-xl px-3.5 h-12">
                <Ionicons name="call-outline" size={18} color={colors.brand.primary} />
                <TextInput
                  value={customerPhone}
                  onChangeText={(text) => {
                    const clean = text.replace(/[^0-9]/g, '');
                    setCustomerPhone(clean);
                    if (clean.length === 10) {
                      handleCheckCustomer(clean);
                    } else {
                      setCustomerLookupStatus('idle');
                      setVerifiedCustomer(null);
                    }
                  }}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  className="flex-1 px-2.5 text-body-sm font-bold text-slate-900"
                />
                {checkingCustomer ? (
                  <ActivityIndicator size="small" color={colors.brand.primary} />
                ) : customerPhone.length === 10 ? (
                  <TouchableOpacity
                    onPress={() => handleCheckCustomer()}
                    hitSlop={touchTargets.hitSlop}
                    className="w-10 h-10 items-center justify-center -mr-1"
                  >
                    <Ionicons
                      name={customerLookupStatus === 'found' ? "checkmark-circle" : "search"}
                      size={20}
                      color={customerLookupStatus === 'found' ? colors.status.success : colors.brand.primary}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Customer Status Banner */}
            {customerLookupStatus === 'found' && verifiedCustomer && (
              <View className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 mb-3 flex-row items-center shadow-xs">
                <Ionicons name="checkmark-circle" size={16} color={colors.status.success} />
                <Typography variant="label-sm" className="text-emerald-950 ml-1.5 flex-1 font-bold" numberOfLines={1}>
                  Verified: {verifiedCustomer.full_name || customerName}
                </Typography>
                <View className="bg-emerald-600 px-2 py-0.5 rounded-full">
                  <Typography variant="overline" color="white">
                    Authorized
                  </Typography>
                </View>
              </View>
            )}

            {customerLookupStatus === 'not_found' && (
              <View className="bg-amber-50 border border-amber-300 rounded-xl p-3 mb-3 shadow-xs">
                <View className="flex-row items-center">
                  <Ionicons name="alert-circle" size={16} color={colors.status.warning} />
                  <Typography variant="label-sm" className="text-amber-950 ml-1.5 font-bold">
                    New Customer Account
                  </Typography>
                </View>
                <Typography variant="caption" className="text-amber-800 mt-0.5">
                  Enter name below to auto-register customer on sale.
                </Typography>
              </View>
            )}

            {/* Customer Full Name */}
            <View className="mb-3.5">
              <Typography variant="overline" className="text-slate-700 mb-1 font-bold">
                Customer Name *
              </Typography>
              <View className="flex-row items-center bg-rose-50/30 border border-rose-200 rounded-xl px-3.5 h-12">
                <Ionicons name="person-outline" size={18} color={colors.brand.primary} />
                <TextInput
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Customer Full Name"
                  placeholderTextColor={colors.text.muted}
                  className="flex-1 px-2.5 text-body-sm font-semibold text-slate-900"
                />
              </View>
            </View>

            {/* Confirm & Sell Button */}
            <View className="flex-row gap-2.5">
              <TouchableOpacity
                onPress={() => setSellModalVisible(false)}
                className="flex-1 h-12 bg-rose-50 rounded-xl items-center justify-center border border-rose-200"
                activeOpacity={0.8}
              >
                <Typography variant="label-md" className="text-rose-700 font-semibold">
                  Cancel
                </Typography>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmSell}
                disabled={selling || customerPhone.replace(/\D/g, '').length < 10 || !customerName.trim()}
                className="flex-1 h-12 bg-primary rounded-xl items-center justify-center shadow-md shadow-rose-500/25"
                style={{
                  opacity:
                    selling || customerPhone.replace(/\D/g, '').length < 10 || !customerName.trim()
                      ? 0.5
                      : 1,
                }}
                activeOpacity={0.85}
              >
                {selling ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Typography variant="label-md" color="white">
                    Confirm & Sell
                  </Typography>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

      {/* Completed Sale Receipt Modal */}
      <Modal
        visible={!!completedSale}
        transparent
        animationType="fade"
        onRequestClose={() => setCompletedSale(null)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View className="bg-surface w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-border-subtle">
            <View className="items-center mb-3">
              <View className="w-12 h-12 rounded-full bg-emerald-100 items-center justify-center mb-2">
                <Ionicons name="checkmark-circle" size={32} color={colors.status.success} />
              </View>
              <Typography variant="title-md" className="text-emerald-950 font-bold">
                Sale Recorded!
              </Typography>
              <Typography variant="caption" className="text-emerald-700 font-medium text-center">
                Inventory updated & linked to customer
              </Typography>
            </View>

            <View className="bg-background border border-border-subtle rounded-2xl p-3.5 mb-4 space-y-2">
              <View className="flex-row justify-between">
                <Typography variant="caption" color="secondary">Order Number</Typography>
                <Typography variant="label-sm" className="font-mono text-slate-900">
                  {completedSale?.orderNumber}
                </Typography>
              </View>
              <View className="flex-row justify-between">
                <Typography variant="caption" color="secondary">Customer</Typography>
                <Typography variant="label-sm" color="primary">
                  {completedSale?.customerName}
                </Typography>
              </View>
              <View className="flex-row justify-between">
                <Typography variant="caption" color="secondary">Phone</Typography>
                <Typography variant="label-sm" className="font-mono text-slate-700">
                  {completedSale?.customerPhone}
                </Typography>
              </View>
              <View className="flex-row justify-between">
                <Typography variant="caption" color="secondary">Product</Typography>
                <Typography variant="label-sm" color="primary" numberOfLines={1}>
                  {completedSale?.name}
                </Typography>
              </View>
              <View className="flex-row justify-between">
                <Typography variant="caption" color="secondary">Quantity Sold</Typography>
                <Typography variant="label-sm" className="text-emerald-700">
                  {completedSale?.qty} unit(s)
                </Typography>
              </View>
              <View className="flex-row justify-between pt-2 border-t border-border-default">
                <Typography variant="label-md" color="primary" weight="bold">Total Amount</Typography>
                <Typography variant="title-sm" color="price" weight="bold">
                  ₹{completedSale?.total}
                </Typography>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleShareWhatsApp}
              className="w-full h-12 bg-[#25D366] rounded-xl flex-row items-center justify-center mb-2.5 shadow-xs"
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={18} color="white" />
              <Typography variant="label-md" color="white" className="ml-2">
                Share Bill on WhatsApp
              </Typography>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCompletedSale(null)}
              className="w-full h-11 bg-slate-100 rounded-xl items-center justify-center border border-border-subtle"
              activeOpacity={0.8}
            >
              <Typography variant="label-md" color="secondary">
                Done
              </Typography>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
