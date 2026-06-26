import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { getProducts, Product } from '../../../src/api/products';
import { getCategories, Category } from '../../../src/api/categories';
import AdminProductCard from '../../../src/components/AdminProductCard';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../../src/components/Button';
import { getFirestore, doc, updateDoc } from '@react-native-firebase/firestore';

export default function AdminProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [sellQuantity, setSellQuantity] = useState('1');
  const [updatingStock, setUpdatingStock] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchProductsAndCategories = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        getProducts(),
        getCategories()
      ]);
      setProducts(productsData.products || []);
      setCategories(categoriesData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProductsAndCategories();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProductsAndCategories();
  };

  const handleUpdateStock = async () => {
    if (!selectedProduct) return;
    const qty = parseInt(newQuantity, 10);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Invalid', 'Please enter a valid positive number');
      return;
    }

    setUpdatingStock(true);
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'products', selectedProduct.id), {
        quantity: qty,
        updated_at: new Date().toISOString()
      });
      setStockModalVisible(false);
      fetchProductsAndCategories();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update stock');
    } finally {
      setUpdatingStock(false);
    }
  };

  const handleSell = async () => {
    if (!selectedProduct) return;
    const qtyToSell = parseInt(sellQuantity, 10);
    if (isNaN(qtyToSell) || qtyToSell <= 0 || qtyToSell > selectedProduct.quantity) {
      Alert.alert('Invalid', 'Please enter a valid quantity to sell (must be less than or equal to current stock)');
      return;
    }

    setUpdatingStock(true);
    try {
      const db = getFirestore();
      const newTotal = selectedProduct.quantity - qtyToSell;
      await updateDoc(doc(db, 'products', selectedProduct.id), {
        quantity: newTotal,
        updated_at: new Date().toISOString()
      });
      setStockModalVisible(false);
      setSellQuantity('1'); // reset
      fetchProductsAndCategories();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sell product');
    } finally {
      setUpdatingStock(false);
    }
  };

  const filteredProducts = products.filter(p => {
    // 1. Category Filter
    if (selectedCategory !== 'all' && p.category_id !== selectedCategory) {
      return false;
    }
    
    // 2. Search Filter
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.unique_code && p.unique_code.toLowerCase().includes(q)) ||
      (p.product_name && p.product_name.toLowerCase().includes(q))
    );
  });

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <View className="px-4 py-4 flex-row items-center justify-between border-b border-slate-100 bg-white">
        <Text className="text-2xl font-extrabold text-[#90132B] font-serif">Products</Text>
        <TouchableOpacity 
          className="bg-[#FF1F4B] p-2 rounded-full shadow-sm flex-row items-center"
          onPress={() => router.push('/(admin)/add-product' as any)}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="text-white font-bold ml-1 mr-2 text-sm">Add New</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 py-3 bg-white border-b border-slate-100">
        <View className="flex-row items-center bg-slate-100 rounded-full px-4 py-2 mb-3">
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            placeholder="Search by Unique Code or Name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 text-slate-800 text-base"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          <TouchableOpacity 
            className={`px-4 py-1.5 rounded-full border mr-2 ${selectedCategory === 'all' ? 'bg-[#FF1F4B] border-[#FF1F4B]' : 'bg-white border-slate-200'}`}
            onPress={() => setSelectedCategory('all')}
          >
            <Text className={`font-bold text-sm ${selectedCategory === 'all' ? 'text-white' : 'text-slate-600'}`}>
              All Categories
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity 
              key={cat.id}
              className={`px-4 py-1.5 rounded-full border mr-2 ${selectedCategory === cat.id ? 'bg-[#FF1F4B] border-[#FF1F4B]' : 'bg-white border-slate-200'}`}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text className={`font-bold text-sm ${selectedCategory === cat.id ? 'text-white' : 'text-slate-600'}`}>
                {cat.category_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF1F4B" />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 16 }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF1F4B" />
          }
          renderItem={({ item }) => (
            <View style={{ width: '48%' }}>
              <AdminProductCard 
                product={item} 
                onUpdateStock={(product) => {
                  setSelectedProduct(product);
                  setNewQuantity(product.quantity.toString());
                  setStockModalVisible(true);
                }}
              />
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="cube-outline" size={64} color="#cbd5e1" />
              <Text className="text-slate-400 mt-4 text-base font-medium">No products found</Text>
            </View>
          }
        />
      )}

      {/* Stock Modal */}
      <Modal visible={stockModalVisible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-lg">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-slate-800">Update Stock</Text>
              <TouchableOpacity onPress={() => setStockModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <Text className="text-slate-600 mb-2 font-medium">
              {selectedProduct?.product_name}
            </Text>
            
            <Text className="text-xs font-bold text-slate-500 mb-4">Code: {selectedProduct?.unique_code}</Text>

            <View className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-4">
              <Text className="text-xs font-bold text-rose-500 uppercase mb-2">Sell Products</Text>
              <View className="flex-row items-center justify-between">
                <TextInput
                  value={sellQuantity}
                  onChangeText={setSellQuantity}
                  keyboardType="numeric"
                  className="flex-1 bg-white border border-rose-200 rounded-xl px-4 py-3 text-lg font-bold mr-3"
                  placeholder="Qty"
                />
                <Button 
                  title="Sell" 
                  onPress={handleSell} 
                  loading={updatingStock}
                  className="bg-[#FF1F4B] w-24 py-3"
                />
              </View>
              <Text className="text-xs text-rose-600 mt-2">Deducts from current stock: {selectedProduct?.quantity}</Text>
            </View>

            <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-2">
              <Text className="text-xs font-bold text-slate-400 uppercase mb-2">Override Total Quantity</Text>
              <View className="flex-row items-center justify-between">
                <TextInput
                  value={newQuantity}
                  onChangeText={setNewQuantity}
                  keyboardType="numeric"
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-lg font-bold mr-3"
                />
                <Button 
                  title="Update" 
                  onPress={handleUpdateStock} 
                  loading={updatingStock}
                  className="bg-slate-800 w-24 py-3"
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
