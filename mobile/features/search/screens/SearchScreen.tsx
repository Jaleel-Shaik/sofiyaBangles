import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProductSearchStore } from '@/src/store/productSearchStore';
import ProductCard from '@/src/components/ProductCard';
import { AppIcon } from '@/src/constants/icons';

type SortOption = 'newest' | 'rating';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest First',
  rating: 'Customer Rating',
};

const PRICE_BUCKETS = [
  { id: 'all', label: 'All Prices' },
  { id: 'under_500', label: 'Under ₹500' },
  { id: '500_1000', label: '₹500 - ₹1,000' },
  { id: '1000_2000', label: '₹1,000 - ₹2,000' },
  { id: 'above_2000', label: 'Above ₹2,000' },
];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const initialQuery = typeof params.q === 'string' ? params.q : '';

  // Zustand Store Hooks
  const {
    searchQuery,
    appliedFilters,
    draftFilters,
    products,
    loading,
    refreshing,
    categories,
    modelTypes,
    isFilterDrawerOpen,
    setSearchQuery,
    setDraftFilter,
    openFilterDrawer,
    closeFilterDrawer,
    applyDraftFilters,
    resetDraftFilters,
    clearAllFilters,
    setSortBy,
    fetchMetadata,
    fetchProducts,
  } = useProductSearchStore();

  // Side Panel Modal Tab State
  const [activeFilterTab, setActiveFilterTab] = useState<'category' | 'model' | 'price' | 'availability' | 'sort'>('category');

  // Quick Sort Bottom Sheet Modal State
  const [sortModalVisible, setSortModalVisible] = useState(false);

  // Initialize Search Query & Metadata
  useEffect(() => {
    fetchMetadata();
    if (initialQuery && initialQuery !== searchQuery) {
      setSearchQuery(initialQuery);
    } else {
      fetchProducts();
    }
  }, []);

  // Debounced Search Text Fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  // Active filter count for header badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.categoryId !== 'all') count++;
    if (appliedFilters.modelTypeId !== 'all') count++;
    if (appliedFilters.priceBucket !== 'all') count++;
    if (appliedFilters.inStockOnly) count++;
    if (appliedFilters.sortBy !== 'newest') count++;
    return count;
  }, [appliedFilters]);

  // Draft filter count for modal badge
  const draftFiltersCount = useMemo(() => {
    let count = 0;
    if (draftFilters.categoryId !== 'all') count++;
    if (draftFilters.modelTypeId !== 'all') count++;
    if (draftFilters.priceBucket !== 'all') count++;
    if (draftFilters.inStockOnly) count++;
    if (draftFilters.sortBy !== 'newest') count++;
    return count;
  }, [draftFilters]);

  // Active Labels
  const activeCategory = categories.find((c) => c.id === appliedFilters.categoryId);
  const activeModelType = modelTypes.find((m) => m.id === appliedFilters.modelTypeId);
  const activePriceBucketObj = PRICE_BUCKETS.find((b) => b.id === appliedFilters.priceBucket);

  return (
    <View className="flex-1 bg-[#FDFCFB]">
      {/* Top Search & Navigation Header */}
      <View
        className="bg-white border-b border-rose-100 shadow-xs px-4 pb-3"
        style={{ paddingTop: Math.max(insets.top + 8, 28) }}
      >
        <View className="flex-row items-center gap-2.5">
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 items-center justify-center active:bg-rose-100"
            accessibilityRole="button"
            accessibilityLabel="Go back"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#BE123C" />
          </TouchableOpacity>

          {/* Flipkart-Style Search Input with clear button */}
          <View className="flex-1 h-11 bg-slate-50 border border-slate-200/90 rounded-2xl flex-row items-center px-3.5 shadow-2xs">
            <AppIcon name="search" size={17} color="#BE123C" style={{ marginRight: 8 }} />
            <TextInput
              className="flex-1 text-sm font-semibold text-slate-900 h-full p-0"
              placeholder="Search bangles, bridal, daily, codes..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="never"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                className="w-6 h-6 rounded-full bg-slate-200 items-center justify-center ml-1"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={14} color="#475569" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sticky Filter & Sort Controls (Flipkart Style) */}
        <View className="flex-row items-center gap-2 mt-3 pt-2 border-t border-slate-100">
          {/* Sort By Trigger Button */}
          <TouchableOpacity
            onPress={() => setSortModalVisible(true)}
            className={`flex-1 h-10 px-3 rounded-xl border flex-row items-center justify-between shadow-2xs ${
              appliedFilters.sortBy !== 'newest'
                ? 'bg-rose-50 border-rose-300'
                : 'bg-white border-slate-200'
            }`}
            activeOpacity={0.75}
          >
            <View className="flex-row items-center flex-1 mr-1">
              <Ionicons
                name="swap-vertical"
                size={15}
                color={appliedFilters.sortBy !== 'newest' ? '#BE123C' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text
                className={`text-xs font-bold ${
                  appliedFilters.sortBy !== 'newest' ? 'text-[#BE123C]' : 'text-slate-700'
                }`}
                numberOfLines={1}
              >
                {SORT_LABELS[appliedFilters.sortBy]}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={13} color={appliedFilters.sortBy !== 'newest' ? '#BE123C' : '#94a3b8'} />
          </TouchableOpacity>

          {/* Flipkart-Style Side Panel Filters Trigger Button */}
          <TouchableOpacity
            onPress={() => {
              setActiveFilterTab('category');
              openFilterDrawer();
            }}
            className={`flex-1 h-10 px-3.5 rounded-xl border flex-row items-center justify-center shadow-2xs ${
              activeFiltersCount > 0
                ? 'bg-[#BE123C] border-[#BE123C]'
                : 'bg-white border-slate-200'
            }`}
            activeOpacity={0.8}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={activeFiltersCount > 0 ? '#FFFFFF' : '#BE123C'}
              style={{ marginRight: 6 }}
            />
            <Text
              className={`text-xs font-black ${
                activeFiltersCount > 0 ? 'text-white' : 'text-slate-800'
              }`}
            >
              Filters
            </Text>
            {activeFiltersCount > 0 && (
              <View className="ml-2 bg-white px-1.5 py-0.2 rounded-full">
                <Text className="text-[10px] font-black text-[#BE123C]">
                  {activeFiltersCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Active Filter Chips Bar (Quick Dismissal) */}
        {(activeFiltersCount > 0 || searchQuery.trim().length > 0) && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-2.5 flex-row"
            contentContainerStyle={{ paddingRight: 10, alignItems: 'center' }}
          >
            {/* Search Query Chip */}
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full flex-row items-center mr-2 shadow-2xs"
              >
                <Text className="text-[11px] font-bold text-slate-700 mr-1.5">
                  "{searchQuery.trim()}"
                </Text>
                <Ionicons name="close-circle" size={13} color="#64748B" />
              </TouchableOpacity>
            )}

            {/* Category Chip */}
            {activeCategory && (
              <TouchableOpacity
                onPress={() => {
                  setDraftFilter('categoryId', 'all');
                  applyDraftFilters();
                }}
                className="bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full flex-row items-center mr-2 shadow-2xs"
              >
                <Text className="text-[11px] font-bold text-[#BE123C] mr-1.5">
                  {activeCategory.category_name || activeCategory.name}
                </Text>
                <Ionicons name="close-circle" size={13} color="#BE123C" />
              </TouchableOpacity>
            )}

            {/* Model Type Chip */}
            {activeModelType && (
              <TouchableOpacity
                onPress={() => {
                  setDraftFilter('modelTypeId', 'all');
                  applyDraftFilters();
                }}
                className="bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full flex-row items-center mr-2 shadow-2xs"
              >
                <Text className="text-[11px] font-bold text-[#BE123C] mr-1.5">
                  {activeModelType.name}
                </Text>
                <Ionicons name="close-circle" size={13} color="#BE123C" />
              </TouchableOpacity>
            )}

            {/* Price Chip */}
            {appliedFilters.priceBucket !== 'all' && (
              <TouchableOpacity
                onPress={() => {
                  setDraftFilter('priceBucket', 'all');
                  applyDraftFilters();
                }}
                className="bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full flex-row items-center mr-2 shadow-2xs"
              >
                <Text className="text-[11px] font-bold text-[#BE123C] mr-1.5">
                  {activePriceBucketObj?.label || 'Price Filter'}
                </Text>
                <Ionicons name="close-circle" size={13} color="#BE123C" />
              </TouchableOpacity>
            )}

            {/* In-Stock Only Chip */}
            {appliedFilters.inStockOnly && (
              <TouchableOpacity
                onPress={() => {
                  setDraftFilter('inStockOnly', false);
                  applyDraftFilters();
                }}
                className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex-row items-center mr-2 shadow-2xs"
              >
                <Text className="text-[11px] font-bold text-emerald-800 mr-1.5">
                  In Stock Only
                </Text>
                <Ionicons name="close-circle" size={13} color="#059669" />
              </TouchableOpacity>
            )}

            {/* Sort Chip */}
            {appliedFilters.sortBy !== 'newest' && (
              <TouchableOpacity
                onPress={() => setSortBy('newest')}
                className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full flex-row items-center mr-2 shadow-2xs"
              >
                <Text className="text-[11px] font-bold text-slate-700 mr-1.5">
                  {SORT_LABELS[appliedFilters.sortBy]}
                </Text>
                <Ionicons name="close-circle" size={13} color="#64748B" />
              </TouchableOpacity>
            )}

            {/* Clear All Chip */}
            <TouchableOpacity
              onPress={clearAllFilters}
              className="py-1 px-2 mr-1"
            >
              <Text className="text-xs font-black text-rose-600 underline">
                Clear All
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Main Product Grid or Loading State */}
      {loading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#BE123C" />
          <Text className="text-sm font-bold text-slate-600 mt-3">
            Loading Sofiya collection...
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item, idx) => item?.id ? String(item.id) : `search-item-${idx}`}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 110,
          }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#BE123C']}
            />
          }
          ListHeaderComponent={
            products.length > 0 ? (
              <View className="flex-row items-center justify-between pb-3 px-0.5">
                <Text className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Showing {products.length} {products.length === 1 ? 'Design' : 'Designs'}
                </Text>
                <Text className="text-xs text-slate-400 font-semibold">
                  Tap to view & buy on WhatsApp
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (item?.id ? <ProductCard product={item} /> : null)}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 px-6">
              <View className="w-18 h-18 rounded-3xl bg-rose-50 border border-rose-100 items-center justify-center mb-4 shadow-sm">
                <Ionicons name="search-outline" size={32} color="#BE123C" />
              </View>
              <Text className="text-lg font-black text-slate-900 text-center mb-1">
                No matching bangles found
              </Text>
              <Text className="text-slate-500 text-xs text-center mb-5 leading-5 px-6 font-medium">
                We couldn't find any products matching your selected search or filters.
                Try relaxing your filter criteria or search for another term.
              </Text>
              <TouchableOpacity
                onPress={clearAllFilters}
                className="bg-[#BE123C] px-6 py-3 rounded-full min-h-[44px] justify-center items-center shadow-md active:bg-rose-800"
                activeOpacity={0.8}
              >
                <Text className="text-white text-xs font-extrabold uppercase tracking-wide">
                  Reset All Filters
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ======================================================== */}
      {/* FLIPKART-STYLE 2-COLUMN FILTER SIDE PANEL MODAL          */}
      {/* ======================================================== */}
      <Modal
        visible={isFilterDrawerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeFilterDrawer}
      >
        <View className="flex-1 bg-white" style={{ paddingTop: Platform.OS === 'android' ? Math.max(insets.top, 16) : 8 }}>
          {/* Modal Header */}
          <View className="px-5 py-3.5 bg-white border-b border-slate-200 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="text-lg font-black text-slate-900 tracking-tight mr-2">
                Filters
              </Text>
              {draftFiltersCount > 0 && (
                <View className="bg-rose-100 px-2 py-0.5 rounded-full">
                  <Text className="text-xs font-black text-rose-700">
                    {draftFiltersCount} selected
                  </Text>
                </View>
              )}
            </View>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={resetDraftFilters}
                className="py-1 px-2"
                activeOpacity={0.7}
              >
                <Text className="text-xs font-bold text-rose-600 underline">
                  Reset
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={closeFilterDrawer}
                className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#334155" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Flipkart 2-Column Split Body */}
          <View className="flex-1 flex-row">
            {/* LEFT COLUMN: Categories of Filters (~38% width) */}
            <View className="w-[38%] bg-slate-50 border-r border-slate-200">
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* 1. Category Tab */}
                <TouchableOpacity
                  onPress={() => setActiveFilterTab('category')}
                  className={`py-4 px-3.5 flex-row items-center justify-between border-b border-slate-100 ${
                    activeFilterTab === 'category'
                      ? 'bg-white border-l-4 border-l-[#BE123C]'
                      : 'bg-slate-50'
                  }`}
                  activeOpacity={0.8}
                >
                  <View className="flex-1">
                    <Text
                      className={`text-xs ${
                        activeFilterTab === 'category'
                          ? 'font-black text-slate-900'
                          : 'font-bold text-slate-600'
                      }`}
                      numberOfLines={1}
                    >
                      Category
                    </Text>
                    {draftFilters.categoryId !== 'all' && (
                      <Text className="text-[10px] font-bold text-rose-600 mt-0.5" numberOfLines={1}>
                        1 selected
                      </Text>
                    )}
                  </View>
                  {draftFilters.categoryId !== 'all' && (
                    <View className="w-2 h-2 rounded-full bg-[#BE123C] ml-1" />
                  )}
                </TouchableOpacity>

                {/* 2. Model / Style Tab */}
                <TouchableOpacity
                  onPress={() => setActiveFilterTab('model')}
                  className={`py-4 px-3.5 flex-row items-center justify-between border-b border-slate-100 ${
                    activeFilterTab === 'model'
                      ? 'bg-white border-l-4 border-l-[#BE123C]'
                      : 'bg-slate-50'
                  }`}
                  activeOpacity={0.8}
                >
                  <View className="flex-1">
                    <Text
                      className={`text-xs ${
                        activeFilterTab === 'model'
                          ? 'font-black text-slate-900'
                          : 'font-bold text-slate-600'
                      }`}
                      numberOfLines={1}
                    >
                      Model / Style
                    </Text>
                    {draftFilters.modelTypeId !== 'all' && (
                      <Text className="text-[10px] font-bold text-rose-600 mt-0.5" numberOfLines={1}>
                        1 selected
                      </Text>
                    )}
                  </View>
                  {draftFilters.modelTypeId !== 'all' && (
                    <View className="w-2 h-2 rounded-full bg-[#BE123C] ml-1" />
                  )}
                </TouchableOpacity>

                {/* 3. Price Range Tab */}
                <TouchableOpacity
                  onPress={() => setActiveFilterTab('price')}
                  className={`py-4 px-3.5 flex-row items-center justify-between border-b border-slate-100 ${
                    activeFilterTab === 'price'
                      ? 'bg-white border-l-4 border-l-[#BE123C]'
                      : 'bg-slate-50'
                  }`}
                  activeOpacity={0.8}
                >
                  <View className="flex-1">
                    <Text
                      className={`text-xs ${
                        activeFilterTab === 'price'
                          ? 'font-black text-slate-900'
                          : 'font-bold text-slate-600'
                      }`}
                      numberOfLines={1}
                    >
                      Price Range
                    </Text>
                    {draftFilters.priceBucket !== 'all' && (
                      <Text className="text-[10px] font-bold text-rose-600 mt-0.5" numberOfLines={1}>
                        Filtered
                      </Text>
                    )}
                  </View>
                  {draftFilters.priceBucket !== 'all' && (
                    <View className="w-2 h-2 rounded-full bg-[#BE123C] ml-1" />
                  )}
                </TouchableOpacity>

                {/* 4. Availability Tab */}
                <TouchableOpacity
                  onPress={() => setActiveFilterTab('availability')}
                  className={`py-4 px-3.5 flex-row items-center justify-between border-b border-slate-100 ${
                    activeFilterTab === 'availability'
                      ? 'bg-white border-l-4 border-l-[#BE123C]'
                      : 'bg-slate-50'
                  }`}
                  activeOpacity={0.8}
                >
                  <View className="flex-1">
                    <Text
                      className={`text-xs ${
                        activeFilterTab === 'availability'
                          ? 'font-black text-slate-900'
                          : 'font-bold text-slate-600'
                      }`}
                      numberOfLines={1}
                    >
                      Availability
                    </Text>
                    {draftFilters.inStockOnly && (
                      <Text className="text-[10px] font-bold text-emerald-600 mt-0.5">
                        In Stock
                      </Text>
                    )}
                  </View>
                  {draftFilters.inStockOnly && (
                    <View className="w-2 h-2 rounded-full bg-emerald-600 ml-1" />
                  )}
                </TouchableOpacity>

                {/* 5. Sort By Tab */}
                <TouchableOpacity
                  onPress={() => setActiveFilterTab('sort')}
                  className={`py-4 px-3.5 flex-row items-center justify-between border-b border-slate-100 ${
                    activeFilterTab === 'sort'
                      ? 'bg-white border-l-4 border-l-[#BE123C]'
                      : 'bg-slate-50'
                  }`}
                  activeOpacity={0.8}
                >
                  <View className="flex-1">
                    <Text
                      className={`text-xs ${
                        activeFilterTab === 'sort'
                          ? 'font-black text-slate-900'
                          : 'font-bold text-slate-600'
                      }`}
                      numberOfLines={1}
                    >
                      Sort By
                    </Text>
                    <Text className="text-[10px] text-slate-400 mt-0.5" numberOfLines={1}>
                      {SORT_LABELS[draftFilters.sortBy]}
                    </Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* RIGHT COLUMN: Filter Options for Active Tab (~62% width) */}
            <View className="flex-1 bg-white p-4">
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* === TAB 1: CATEGORY OPTIONS === */}
                {activeFilterTab === 'category' && (
                  <View>
                    <Text className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                      Select Category
                    </Text>

                    {/* All Categories Option */}
                    <TouchableOpacity
                      onPress={() => setDraftFilter('categoryId', 'all')}
                      className={`py-3 px-3.5 rounded-xl border mb-2 flex-row items-center justify-between ${
                        draftFilters.categoryId === 'all'
                          ? 'bg-rose-50 border-[#BE123C]'
                          : 'bg-white border-slate-200'
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`text-xs ${
                          draftFilters.categoryId === 'all' ? 'font-extrabold text-[#BE123C]' : 'font-bold text-slate-700'
                        }`}
                      >
                        All Categories
                      </Text>
                      {draftFilters.categoryId === 'all' && (
                        <Ionicons name="checkmark-circle" size={18} color="#BE123C" />
                      )}
                    </TouchableOpacity>

                    {/* Dynamic Categories */}
                    {categories.map((cat) => {
                      const isSelected = draftFilters.categoryId === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => setDraftFilter('categoryId', isSelected ? 'all' : cat.id)}
                          className={`py-3 px-3.5 rounded-xl border mb-2 flex-row items-center justify-between ${
                            isSelected
                              ? 'bg-rose-50 border-[#BE123C]'
                              : 'bg-white border-slate-200'
                          }`}
                          activeOpacity={0.7}
                        >
                          <Text
                            className={`text-xs ${
                              isSelected ? 'font-extrabold text-[#BE123C]' : 'font-bold text-slate-800'
                            }`}
                            numberOfLines={1}
                          >
                            {cat.category_name || cat.name}
                          </Text>
                          <Ionicons
                            name={isSelected ? 'checkbox' : 'square-outline'}
                            size={18}
                            color={isSelected ? '#BE123C' : '#94a3b8'}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* === TAB 2: MODEL / STYLE OPTIONS === */}
                {activeFilterTab === 'model' && (
                  <View>
                    <Text className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                      Select Model or Style
                    </Text>

                    {/* All Models Option */}
                    <TouchableOpacity
                      onPress={() => setDraftFilter('modelTypeId', 'all')}
                      className={`py-3 px-3.5 rounded-xl border mb-2 flex-row items-center justify-between ${
                        draftFilters.modelTypeId === 'all'
                          ? 'bg-rose-50 border-[#BE123C]'
                          : 'bg-white border-slate-200'
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`text-xs ${
                          draftFilters.modelTypeId === 'all' ? 'font-extrabold text-[#BE123C]' : 'font-bold text-slate-700'
                        }`}
                      >
                        All Models
                      </Text>
                      {draftFilters.modelTypeId === 'all' && (
                        <Ionicons name="checkmark-circle" size={18} color="#BE123C" />
                      )}
                    </TouchableOpacity>

                    {/* Dynamic Models */}
                    {modelTypes.map((model) => {
                      const isSelected = draftFilters.modelTypeId === model.id;
                      return (
                        <TouchableOpacity
                          key={model.id}
                          onPress={() => setDraftFilter('modelTypeId', isSelected ? 'all' : model.id)}
                          className={`py-3 px-3.5 rounded-xl border mb-2 flex-row items-center justify-between ${
                            isSelected
                              ? 'bg-rose-50 border-[#BE123C]'
                              : 'bg-white border-slate-200'
                          }`}
                          activeOpacity={0.7}
                        >
                          <Text
                            className={`text-xs ${
                              isSelected ? 'font-extrabold text-[#BE123C]' : 'font-bold text-slate-800'
                            }`}
                            numberOfLines={1}
                          >
                            {model.name}
                          </Text>
                          <Ionicons
                            name={isSelected ? 'checkbox' : 'square-outline'}
                            size={18}
                            color={isSelected ? '#BE123C' : '#94a3b8'}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* === TAB 3: PRICE RANGE OPTIONS === */}
                {activeFilterTab === 'price' && (
                  <View>
                    <Text className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                      Choose Price Range
                    </Text>

                    {PRICE_BUCKETS.map((bkt) => {
                      const isSelected = draftFilters.priceBucket === bkt.id;
                      return (
                        <TouchableOpacity
                          key={bkt.id}
                          onPress={() => setDraftFilter('priceBucket', bkt.id as any)}
                          className={`py-3 px-3.5 rounded-xl border mb-2 flex-row items-center justify-between ${
                            isSelected
                              ? 'bg-rose-50 border-[#BE123C]'
                              : 'bg-white border-slate-200'
                          }`}
                          activeOpacity={0.7}
                        >
                          <Text
                            className={`text-xs ${
                              isSelected ? 'font-extrabold text-[#BE123C]' : 'font-bold text-slate-800'
                            }`}
                          >
                            {bkt.label}
                          </Text>
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={isSelected ? '#BE123C' : '#94a3b8'}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* === TAB 4: AVAILABILITY OPTIONS === */}
                {activeFilterTab === 'availability' && (
                  <View>
                    <Text className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                      Stock Availability
                    </Text>

                    <TouchableOpacity
                      onPress={() => setDraftFilter('inStockOnly', false)}
                      className={`py-3 px-3.5 rounded-xl border mb-2 flex-row items-center justify-between ${
                        !draftFilters.inStockOnly
                          ? 'bg-rose-50 border-[#BE123C]'
                          : 'bg-white border-slate-200'
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`text-xs ${
                          !draftFilters.inStockOnly ? 'font-extrabold text-[#BE123C]' : 'font-bold text-slate-800'
                        }`}
                      >
                        All Products (Includes Out of Stock)
                      </Text>
                      <Ionicons
                        name={!draftFilters.inStockOnly ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={!draftFilters.inStockOnly ? '#BE123C' : '#94a3b8'}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setDraftFilter('inStockOnly', true)}
                      className={`py-3 px-3.5 rounded-xl border mb-2 flex-row items-center justify-between ${
                        draftFilters.inStockOnly
                          ? 'bg-emerald-50 border-emerald-600'
                          : 'bg-white border-slate-200'
                      }`}
                      activeOpacity={0.7}
                    >
                      <View className="flex-1 mr-2">
                        <Text
                          className={`text-xs ${
                            draftFilters.inStockOnly ? 'font-extrabold text-emerald-800' : 'font-bold text-slate-800'
                          }`}
                        >
                          In Stock Only (Ready to Buy)
                        </Text>
                        <Text className="text-[10px] text-slate-400 font-medium">
                          Shows items ready for instant WhatsApp dispatch
                        </Text>
                      </View>
                      <Ionicons
                        name={draftFilters.inStockOnly ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={draftFilters.inStockOnly ? '#059669' : '#94a3b8'}
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {/* === TAB 5: SORT OPTIONS === */}
                {activeFilterTab === 'sort' && (
                  <View>
                    <Text className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                      Sort Products By
                    </Text>

                    {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => {
                      const isSelected = draftFilters.sortBy === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          onPress={() => setDraftFilter('sortBy', key)}
                          className={`py-3 px-3.5 rounded-xl border mb-2 flex-row items-center justify-between ${
                            isSelected
                              ? 'bg-rose-50 border-[#BE123C]'
                              : 'bg-white border-slate-200'
                          }`}
                          activeOpacity={0.7}
                        >
                          <Text
                            className={`text-xs ${
                              isSelected ? 'font-extrabold text-[#BE123C]' : 'font-bold text-slate-800'
                            }`}
                          >
                            {SORT_LABELS[key]}
                          </Text>
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={isSelected ? '#BE123C' : '#94a3b8'}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>

          {/* Flipkart Modal Sticky Footer */}
          <View
            className="px-5 py-3.5 bg-white border-t border-slate-200 flex-row items-center justify-between shadow-lg"
            style={{ paddingBottom: Math.max(insets.bottom + 8, 20) }}
          >
            <View>
              <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Matching Results
              </Text>
              <Text className="text-sm font-black text-slate-900">
                {products.length} {products.length === 1 ? 'item' : 'items'} found
              </Text>
            </View>

            <TouchableOpacity
              onPress={applyDraftFilters}
              className="bg-[#BE123C] px-7 py-3.5 rounded-2xl shadow-md active:bg-rose-800 flex-row items-center"
              activeOpacity={0.88}
            >
              <Text className="text-white font-black text-xs uppercase tracking-wide mr-1.5">
                Apply Filters
              </Text>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* QUICK SORT BOTTOM SHEET MODAL                            */}
      {/* ======================================================== */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View className="bg-white rounded-t-3xl p-5 shadow-2xl">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <View className="flex-row items-center">
                <Ionicons name="swap-vertical" size={18} color="#BE123C" style={{ marginRight: 6 }} />
                <Text className="text-base font-black text-slate-900">
                  Sort Products By
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSortModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => {
              const isSelected = appliedFilters.sortBy === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    setSortBy(key);
                    setSortModalVisible(false);
                  }}
                  className={`py-3.5 px-4 rounded-2xl flex-row items-center justify-between mb-2 border ${
                    isSelected
                      ? 'bg-rose-50 border-rose-300'
                      : 'bg-slate-50/60 border-slate-100'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm ${
                      isSelected ? 'font-black text-[#BE123C]' : 'font-semibold text-slate-800'
                    }`}
                  >
                    {SORT_LABELS[key]}
                  </Text>
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={isSelected ? '#BE123C' : '#94a3b8'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
