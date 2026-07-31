"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit, Trash2, Package } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { adminApi, type Product, type Category } from "@/src/lib/api";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, cats] = await Promise.all([
        adminApi.getAdminProducts(1, 100),
        adminApi.getCategories(),
      ]);
      setProducts(prodRes.products);
      setCategories(cats);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load products";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    try {
      await adminApi.deleteProduct(id);
      toast.success("Product deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.product_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#171717]">Products</h1>
          <p className="text-[#737373] mt-1">{products.length} total products</p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="gradient-primary text-white font-semibold py-2.5 px-5 rounded-xl transition-all hover:shadow-lg hover:shadow-[#E8436E]/25 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] text-sm"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.category_name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#E5E5E5] animate-pulse shadow-sm overflow-hidden">
              <div className="aspect-[4/3] bg-gray-200" />
              <div className="p-4 space-y-2.5">
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
                <div className="h-3 w-1/2 bg-gray-200 rounded" />
                <div className="h-4 w-1/3 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[#A3A3A3]">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No products found</p>
          <Link href="/dashboard/products/new" className="text-[#E8436E] hover:underline mt-2 inline-block">
            Add your first product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product, i) => {
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm hover:shadow-lg hover:border-[#E8436E]/20 hover:-translate-y-1 transition-all duration-200 group overflow-hidden"
              >
                <Link href={`/dashboard/products/${product.id}`} className="block">
                  <div className="aspect-[4/3] bg-[#F5F5F5] overflow-hidden relative">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-10 h-10 text-[#CBD5E1]" />
                      </div>
                    )}
                    {!product.is_active && (
                      <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">DRAFT</span>
                    )}
                  </div>
                  <div className="p-4 space-y-1.5">
                    <p className="font-semibold text-[#171717] text-sm truncate group-hover:text-[#E8436E] transition-colors">
                      {product.product_name}
                    </p>
                    <p className="text-xs text-[#A3A3A3]">Code: {product.unique_code}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-base font-bold text-[#E8436E]">₹{product.price}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${(product.quantity || 0) > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        {(product.quantity || 0) > 0 ? `${product.quantity}` : '0'}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="flex border-t border-[#E5E5E5]">
                  <Link
                    href={`/dashboard/products/${product.id}/edit`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-[#525252] hover:bg-[#F5F5F5] transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </Link>
                  <div className="w-px bg-[#E5E5E5]" />
                  <button
                    onClick={() => handleDelete(product.id, product.product_name)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-red-500 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
