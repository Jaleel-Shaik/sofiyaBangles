"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit, Trash2, Package, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { adminApi, type Product, type Category } from "@/src/lib/api";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const fetchData = async (overrides?: { catFilter?: string; searchTerm?: string }) => {
    setLoading(true);
    const cat = overrides?.catFilter ?? categoryFilter;
    const s = overrides?.searchTerm ?? search;
    try {
      const [prodRes, cats] = await Promise.all([
        adminApi.getProducts(1, 100, cat || undefined, s || undefined),
        adminApi.getCategories(),
      ]);
      setProducts(prodRes.products);
      setCategories(cats);
    } catch {
      toast.error("Failed to load products");
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

  const filtered = products.filter(p =>
    p.product_name.toLowerCase().includes(search.toLowerCase())
  );

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
          onChange={e => { const val = e.target.value; setCategoryFilter(val); fetchData({ catFilter: val }); }}
          className="px-4 py-2.5 bg-white border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] text-sm"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.category_name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#E8436E]" />
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
        <div className="grid gap-4">
          {filtered.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white rounded-2xl border border-[#E5E5E5] p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className="w-16 h-16 rounded-xl bg-[#F5F5F5] overflow-hidden flex-shrink-0">
                {product.image_url ? (
                  <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-[#CBD5E1]" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#171717] truncate">{product.product_name}</p>
                <p className="text-xs text-[#A3A3A3]">Code: {product.unique_code}</p>
                <p className="text-sm font-bold text-[#E8436E] mt-0.5">₹{product.price}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/products/${product.id}/edit`}
                  className="p-2.5 rounded-xl bg-[#F5F5F5] hover:bg-[#E5E5E5] transition-colors"
                >
                  <Edit className="w-4 h-4 text-[#525252]" />
                </Link>
                <button
                  onClick={() => handleDelete(product.id, product.product_name)}
                  className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
