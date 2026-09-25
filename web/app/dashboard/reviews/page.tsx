"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { api, AdminReview } from "@/src/lib/api";
import {
  Star,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Phone,
  Mail,
  ShoppingBag,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Package,
  Tag,
  ArrowUpRight,
  Maximize2,
  X,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { AuthenticatedImage, StarRating } from "@/src/components/ui";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [defectFilter, setDefectFilter] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");

  // Image Lightbox Preview Modal state
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    src?: string | null;
    title?: string;
    code?: string | null;
    productId?: string;
  }>({ isOpen: false });

  const fetchReviews = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await api.admin.getAllReviews();
      setReviews(Array.isArray(data) ? data : []);
      if (isManual) toast.success("Reviews updated");
    } catch (error) {
      console.error("Failed to load reviews:", error);
      toast.error("Failed to load customer reviews");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const searchParam = urlParams.get("search");
      if (searchParam) {
        setSearchQuery(searchParam);
      }
    }
  }, []);

  // Unique products list for the Product Filter dropdown
  const uniqueProducts = useMemo(() => {
    const map = new Map<string, { name: string; code?: string; count: number }>();
    reviews.forEach((r) => {
      const name = r.product_name || "Unknown Product";
      const existing = map.get(name);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(name, {
          name,
          code: r.unique_code || r.product_code || undefined,
          count: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [reviews]);

  // Filter & Search logic
  const filteredReviews = useMemo(() => {
    return reviews
      .filter((r) => {
        // Product filter
        if (selectedProduct !== "all") {
          const prodName = r.product_name || "Unknown Product";
          if (prodName !== selectedProduct) return false;
        }

        // Search filter: name, phone, email, product name, unique code, order number, comment, suggestion, damage
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = r.user_name?.toLowerCase().includes(q);
          const matchEmail = r.user_email?.toLowerCase().includes(q);
          const matchPhone = r.user_phone?.toLowerCase().includes(q);
          const matchProduct = r.product_name?.toLowerCase().includes(q);
          const matchCode = (r.unique_code || r.product_code)?.toLowerCase().includes(q);
          const matchOrder = r.order_number?.toLowerCase().includes(q);
          const matchComment = r.comment?.toLowerCase().includes(q);
          const matchSuggestion = r.suggestion?.toLowerCase().includes(q);
          const matchDamage = r.damage_details?.toLowerCase().includes(q);
          if (
            !matchName &&
            !matchEmail &&
            !matchPhone &&
            !matchProduct &&
            !matchCode &&
            !matchOrder &&
            !matchComment &&
            !matchSuggestion &&
            !matchDamage
          ) {
            return false;
          }
        }

        // Rating filter
        if (ratingFilter !== "all") {
          const target = Number(ratingFilter);
          const reviewRating = Number(r.rating) || 0;
          if (reviewRating !== target && Math.round(reviewRating) !== target) {
            return false;
          }
        }

        // Defect filter
        if (defectFilter === "defective") {
          if (!r.is_defective && !r.damage_details) return false;
        } else if (defectFilter === "suggestion") {
          if (!r.suggestion || !r.suggestion.trim()) return false;
        } else if (defectFilter === "clean") {
          if (r.is_defective || r.damage_details) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === "highest") {
          return Number(b.rating) - Number(a.rating);
        }
        if (sortBy === "lowest") {
          return Number(a.rating) - Number(b.rating);
        }
        return 0;
      });
  }, [reviews, searchQuery, selectedProduct, ratingFilter, defectFilter, sortBy]);

  // Statistics
  const totalReviews = reviews.length;
  const defectiveCount = reviews.filter((r) => r.is_defective || Boolean(r.damage_details)).length;
  const suggestionsCount = reviews.filter((r) => Boolean(r.suggestion?.trim())).length;

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    ratingFilter !== "all" ||
    defectFilter !== "all" ||
    selectedProduct !== "all" ||
    sortBy !== "newest";

  const resetFilters = () => {
    setSearchQuery("");
    setRatingFilter("all");
    setDefectFilter("all");
    setSelectedProduct("all");
    setSortBy("newest");
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Customer Reviews & Ratings
            </h1>
            <span className="bg-rose-100 text-[#E8436E] text-xs font-black px-2.5 py-0.5 rounded-full">
              {totalReviews} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
            Monitor customer feedback, product quality ratings, damage reports, and suggestions.
          </p>
        </div>

        <button
          onClick={() => fetchReviews(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-2xs self-start sm:self-auto min-h-[38px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Interactive KPI Cards (Click any card to update reviews list filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Reviews Card (Filters to All) */}
        <button
          type="button"
          onClick={() => {
            setDefectFilter("all");
            setRatingFilter("all");
            setSelectedProduct("all");
          }}
          className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs hover:scale-[1.01] ${
            defectFilter === "all" && ratingFilter === "all" && selectedProduct === "all"
              ? "bg-purple-50/50 border-purple-300 ring-2 ring-purple-500/40"
              : "bg-white border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-500">Total Reviews</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{totalReviews}</div>
          <p className="text-[11px] font-semibold text-slate-400 mt-0.5 flex items-center justify-between">
            <span>Verified customer ratings</span>
            {defectFilter === "all" && ratingFilter === "all" && selectedProduct === "all" && (
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-wide">Active</span>
            )}
          </p>
        </button>

        {/* Defect Reports Card (Filters to Defective Only) */}
        <button
          type="button"
          onClick={() => {
            setDefectFilter(defectFilter === "defective" ? "all" : "defective");
          }}
          className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs hover:scale-[1.01] ${
            defectFilter === "defective"
              ? "bg-rose-50 border-rose-300 ring-2 ring-rose-500/50"
              : defectiveCount > 0
              ? "bg-rose-50/40 border-rose-200/80 hover:border-rose-300"
              : "bg-white border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-500">Defects / Damage Reports</span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                defectiveCount > 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{defectiveCount}</div>
          <p className="text-[11px] font-semibold text-slate-400 mt-0.5 flex items-center justify-between">
            <span>{defectiveCount > 0 ? "Quality inspection needed" : "Zero damage reports"}</span>
            {defectFilter === "defective" && (
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-wide">Active</span>
            )}
          </p>
        </button>

        {/* Customer Suggestions Card (Filters to Suggestions Only) */}
        <button
          type="button"
          onClick={() => {
            setDefectFilter(defectFilter === "suggestion" ? "all" : "suggestion");
          }}
          className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs hover:scale-[1.01] ${
            defectFilter === "suggestion"
              ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500/50"
              : "bg-white border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-500">Product Suggestions</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Lightbulb className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{suggestionsCount}</div>
          <p className="text-[11px] font-semibold text-slate-400 mt-0.5 flex items-center justify-between">
            <span>Improvement ideas received</span>
            {defectFilter === "suggestion" && (
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-wide">Active</span>
            )}
          </p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, product, customer name, phone, order #..."
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E8436E]/20 focus:border-[#E8436E]"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Product Filter Dropdown */}
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="px-2.5 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-[#E8436E] max-w-[200px] truncate"
              title="Filter reviews by product item"
            >
              <option value="all">All Products ({reviews.length})</option>
              {uniqueProducts.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.code ? `${p.code} - ${p.name}` : p.name} ({p.count})
                </option>
              ))}
            </select>

            {/* Rating Filter */}
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="px-2.5 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-[#E8436E]"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars (Excellent)</option>
              <option value="4">4 Stars (Very Good)</option>
              <option value="3">3 Stars (Average)</option>
              <option value="2">2 Stars (Fair)</option>
              <option value="1">1 Star (Poor)</option>
            </select>

            {/* Defect / Condition Filter */}
            <select
              value={defectFilter}
              onChange={(e) => setDefectFilter(e.target.value)}
              className="px-2.5 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-[#E8436E]"
            >
              <option value="all">All Conditions</option>
              <option value="defective">⚠️ Damaged / Defective Only</option>
              <option value="suggestion">💡 Customer Suggestions Only</option>
              <option value="clean">✓ Clean (No Defects)</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-[#E8436E]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
            </select>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-2.5 py-2 text-xs font-extrabold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 shrink-0"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Filter Summary Status */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-0.5 pt-1">
          <span>
            Showing <strong className="text-slate-900">{filteredReviews.length}</strong> of{" "}
            <strong className="text-slate-900">{reviews.length}</strong> customer reviews
          </span>
          {hasActiveFilters && (
            <span className="text-[#E8436E] font-bold">Filtered View Active</span>
          )}
        </div>
      </div>

      {/* Review List */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-9 h-9 border-3 border-[#E8436E] border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
          <p className="text-xs font-medium text-slate-500">Loading customer reviews...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/90 p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3 text-slate-400 border border-slate-100">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No reviews found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-medium">
            {hasActiveFilters
              ? "No reviews match your current search or filter criteria. Try clearing filters."
              : "No customer reviews submitted yet."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#E8436E] bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredReviews.map((review) => {
            const hasDefect = review.is_defective || Boolean(review.damage_details);
            const productCode = review.unique_code || review.product_code || null;
            const dateStr = review.created_at
              ? new Date(review.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Kolkata",
                })
              : "Recent";

            return (
              <div
                key={review.id}
                className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
              >
                {/* 1. Header: Customer Information & Clickable Order Link */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  {/* Customer Info */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white font-black flex items-center justify-center shrink-0 shadow-2xs text-xs">
                      {review.user_name?.charAt(0)?.toUpperCase() || "C"}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-xs text-slate-900">
                          {review.user_name || "Verified Customer"}
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-1.5 py-0.2 rounded border border-emerald-200/80 flex items-center gap-0.5">
                          <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                          Verified
                        </span>
                      </div>

                      {/* Contact Info (Interactive Links) */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-slate-500">
                        {review.user_phone ? (
                          <a
                            href={`https://wa.me/${review.user_phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold"
                            title="Open WhatsApp chat"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            {review.user_phone}
                          </a>
                        ) : (
                          <span className="text-slate-400 inline-flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" /> No Phone
                          </span>
                        )}

                        {review.user_email ? (
                          <a
                            href={`mailto:${review.user_email}`}
                            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium"
                            title="Send email"
                          >
                            <Mail className="w-2.5 h-2.5" />
                            {review.user_email}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Order Link & Date */}
                  <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1 text-xs shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                    {review.order_number ? (
                      <Link
                        href={`/dashboard/orders?search=${encodeURIComponent(review.order_number)}`}
                        className="inline-flex items-center gap-1 font-mono font-black text-xs text-rose-600 hover:text-rose-700 hover:underline bg-rose-50 px-2 py-0.5 rounded border border-rose-100"
                        title="Navigate to Order Details"
                      >
                        <Package className="w-3 h-3 text-rose-500" />
                        #{review.order_number}
                        <ArrowUpRight className="w-2.5 h-2.5 text-rose-400" />
                      </Link>
                    ) : (
                      <span className="font-mono font-bold text-slate-400 text-[11px]">Direct Review</span>
                    )}
                    <span className="text-[10px] text-slate-400 font-semibold">{dateStr}</span>
                  </div>
                </div>

                {/* 2. Reviewed Product Info with Clickable Image & Code & Navigatable Link */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-lg border border-slate-200/70">
                  <div className="flex items-center gap-3">
                    {/* CLICKABLE PRODUCT THUMBNAIL IMAGE WITH HOVER ZOOM & LIGHTBOX EXPAND */}
                    {(() => {
                      const productHref = review.product_id
                        ? `/dashboard/products/${review.product_id}`
                        : `/dashboard/products?search=${encodeURIComponent(productCode || review.product_name || "")}`;

                      return (
                        <>
                          <div className="relative group shrink-0">
                            <Link
                              href={productHref}
                              className="w-8 h-8 rounded-md bg-white overflow-hidden border border-slate-200 shrink-0 relative shadow-2xs block cursor-pointer transition-transform duration-200 group-hover:scale-105 group-hover:border-[#E8436E]"
                              title={`Navigate to ${review.product_name || "Product"} Details`}
                            >
                              {review.product_image ? (
                                <AuthenticatedImage
                                  src={review.product_image}
                                  alt={review.product_name || "Product"}
                                  productId={review.product_id}
                                  className="w-full h-full object-cover"
                                  fallbackIcon={<ShoppingBag className="w-3.5 h-3.5 text-slate-400" />}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 group-hover:bg-rose-50 transition-colors">
                                  <ShoppingBag className="w-3.5 h-3.5 group-hover:text-[#E8436E]" />
                                </div>
                              )}
                            </Link>

                            {/* Expand Lightbox Button Overlay */}
                            {review.product_image && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setPreviewModal({
                                    isOpen: true,
                                    src: review.product_image,
                                    title: review.product_name || "Product",
                                    code: productCode,
                                    productId: review.product_id,
                                  });
                                }}
                                className="absolute -bottom-1 -right-1 bg-slate-900/80 hover:bg-[#E8436E] text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
                                title="Preview full size image"
                              >
                                <Maximize2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Navigatable Product Link */}
                              <Link
                                href={productHref}
                                className="text-xs sm:text-sm font-black text-slate-900 hover:text-[#E8436E] transition-colors inline-flex items-center gap-1 group"
                                title="Navigate to Product Details"
                              >
                                {review.product_name || "Handcrafted Bangles"}
                                <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-[#E8436E] transition-colors" />
                              </Link>

                              {/* Displayed Unique Code Badge (Navigatable) */}
                              {productCode ? (
                                <Link
                                  href={
                                    review.product_id
                                      ? `/dashboard/products/${review.product_id}`
                                      : `/dashboard/products?search=${encodeURIComponent(productCode)}`
                                  }
                                  className="bg-slate-200/90 hover:bg-rose-100 hover:text-rose-700 text-slate-700 font-mono font-extrabold text-[10px] px-1.5 py-0.2 rounded transition-colors flex items-center gap-0.5"
                                  title={`Open ${productCode} Product Details`}
                                >
                                  <Tag className="w-2.5 h-2.5 text-slate-500" />
                                  {productCode.startsWith("#") ? productCode : `#${productCode}`}
                                </Link>
                              ) : (
                                <span className="bg-slate-100 text-slate-400 font-mono font-bold text-[10px] px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                  <Tag className="w-2.5 h-2.5 text-slate-400" />
                                  #NO-CODE
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                              Reviewed Bangle Item
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Rating Stars & Quality Status */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <StarRating rating={Number(review.rating) || 0} badge />

                    {hasDefect ? (
                      <span className="bg-rose-100 text-rose-800 text-[11px] font-black px-2 py-1 rounded-lg border border-rose-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Defective
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Perfect
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Highlighted Customer Review & Feedback Sections */}
                <div className="space-y-2 text-xs">
                  {/* Highlighted Main Customer Feedback Comment */}
                  {review.comment ? (
                    <div className="p-3 bg-slate-50 border-l-4 border-l-[#E8436E] rounded-r-lg border-y border-r border-slate-200/80 shadow-2xs">
                      <p className="text-[10px] font-black uppercase text-[#E8436E] tracking-wider mb-0.5">
                        Customer Review Feedback
                      </p>
                      <p className="text-slate-800 font-semibold leading-relaxed text-xs italic">
                        "{review.comment}"
                      </p>
                    </div>
                  ) : null}

                  {/* Highlighted Customer Suggestion */}
                  {review.suggestion ? (
                    <div className="p-2.5 bg-blue-50/90 rounded-lg border border-blue-200/90 flex items-start gap-2 shadow-2xs">
                      <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold text-blue-950">Customer Suggestion: </span>
                        <span className="text-blue-900 font-medium leading-relaxed">{review.suggestion}</span>
                      </div>
                    </div>
                  ) : null}

                  {/* Highlighted Damage / Defect Report */}
                  {hasDefect && (
                    <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-start gap-2 flex-1">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold text-rose-950">Damage / Defect Notice: </span>
                          <span className="text-rose-900 font-medium leading-relaxed">
                            {review.damage_details || "Customer flagged this item as damaged or defective upon arrival."}
                          </span>
                        </div>
                      </div>
                      {review.user_phone && (
                        <a
                          href={`https://wa.me/${review.user_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                            `Hello ${review.user_name || "Valued Customer"}, we received your feedback regarding order #${
                              review.order_number || ""
                            }. We apologize for any issue and are here to resolve it immediately.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md transition-colors inline-flex items-center gap-1 shadow-2xs self-start sm:self-auto"
                        >
                          Resolve on WhatsApp
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full-Screen Image Lightbox Preview Modal */}
      {previewModal.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewModal({ isOpen: false })}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl space-y-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  {previewModal.title || "Product Preview"}
                  {previewModal.code && (
                    <span className="bg-slate-800 text-rose-400 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-700">
                      {previewModal.code.startsWith("#") ? previewModal.code : `#${previewModal.code}`}
                    </span>
                  )}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModal({ isOpen: false })}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Image Body */}
            <div className="w-full h-60 bg-slate-950 flex items-center justify-center relative">
              {previewModal.src ? (
                <AuthenticatedImage
                  src={previewModal.src}
                  alt={previewModal.title || "Product Image"}
                  productId={previewModal.productId}
                  className="w-full h-full object-contain"
                  fallbackIcon={<ShoppingBag className="w-12 h-12 text-slate-600" />}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <ShoppingBag className="w-10 h-10 mb-2" />
                  <p className="text-xs font-semibold">No Image Available</p>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 flex items-center justify-between border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500">
                Product Image Preview
              </span>
              <Link
                href={`/dashboard/products?search=${encodeURIComponent(previewModal.code || previewModal.title || '')}`}
                onClick={() => setPreviewModal({ isOpen: false })}
                className="bg-[#E8436E] hover:bg-[#d6335c] text-white text-xs font-extrabold px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                View Product in Inventory
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
