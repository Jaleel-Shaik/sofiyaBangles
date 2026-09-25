import { api } from "@/src/api";
import { Linking, Share } from 'react-native';

import { getCachedApiBaseUrl } from '../api/config';

// ─── Cache ────────────────────────────────────────────────────
let cachedShopWhatsAppNumber: string | null = null;

/**
 * Strips all non-numeric characters from a phone number.
 * Ensures the number is in pure international format (e.g. 919876543210).
 *
 * If the number is exactly 10 digits (Indian mobile), prepends "91".
 */
export function normalizeWhatsAppNumber(phone: string): string {
  let digits = phone.replace(/[^0-9]/g, '');

  // If it's a 10-digit Indian number, prepend country code
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  return digits;
}

/**
 * Constructs the mapped direct URL to the product's page in the Admin Portal.
 * This is strictly for the admin/super-admin perspective (e.g., Quick Sell, Inventory audits).
 */
export function getAdminProductUrl(productId: string, quantity?: number): string {
  const query = quantity && quantity > 1 ? `?qty=${quantity}` : '';
  const adminBaseUrl = process.env.EXPO_PUBLIC_ADMIN_WEB_URL?.trim();

  if (adminBaseUrl) {
    return `${adminBaseUrl.replace(/\/+$/, '')}/dashboard/products/${productId}${query}`;
  }

  try {
    const apiBase = getCachedApiBaseUrl();
    // Parse hostname from API base URL (e.g. "http://192.168.1.10:5000/api" -> "192.168.1.10")
    const match = apiBase.match(/^https?:\/\/([^:/]+)/);
    const host = match && match[1] && match[1] !== '10.0.2.2' ? match[1] : 'localhost';
    const protocol = apiBase.startsWith('https') ? 'https' : 'http';
    return `${protocol}://${host}:3000/dashboard/products/${productId}${query}`;
  } catch {
    return `http://localhost:3000/dashboard/products/${productId}${query}`;
  }
}

/**
 * Fetches and caches the shop/admin WhatsApp number from the
 * backend business-profile API.
 *
 * Falls back to an empty string if the API fails — callers should
 * handle this gracefully.
 */
export async function getShopWhatsAppNumber(): Promise<string> {
  if (cachedShopWhatsAppNumber) {
    return cachedShopWhatsAppNumber;
  }

  try {
    const profile = await api.settings.getBusinessProfile();
    if (profile?.whatsapp_number) {
      cachedShopWhatsAppNumber = normalizeWhatsAppNumber(profile.whatsapp_number);
      return cachedShopWhatsAppNumber;
    }
  } catch (error) {
    console.error('Failed to fetch shop WhatsApp number:', error);
  }

  return '';
}

/**
 * Clears the cached WhatsApp number.
 * Call this when the admin updates the business profile.
 */
export function clearWhatsAppCache(): void {
  cachedShopWhatsAppNumber = null;
}

export interface ProductShareDetails {
  productId?: string;
  productName?: string;
  description?: string;
  categoryId?: string;
  cost?: number | string;
  size?: string;
  uniqueCode?: string;
  quantity?: number;
  adminProductUrl?: string;
  /** Admin links and internal order tools are strictly reserved for admin perspective */
  isAdminPerspective?: boolean;
  imageUrl?: string;
  customMeasurements?: Record<string, string>;
}

/**
 * Builds a WhatsApp enquiry URL for customers.
 * Note: Admin product links are strictly excluded from user enquiries unless explicitly requested by an admin.
 */
export function buildWhatsAppEnquiryUrl(params: ProductShareDetails & {
  shopWhatsAppNumber: string;
}): string {
  const {
    shopWhatsAppNumber,
    productId,
    productName,
    description,
    categoryId,
    cost,
    size,
    uniqueCode,
    quantity,
    adminProductUrl,
    isAdminPerspective,
    customMeasurements,
  } = params;

  const lines: string[] = ['Hello, I am interested in this product.', ''];

  lines.push(`Product Name: ${productName || 'Unknown'}`);
  lines.push(`Description: ${description || 'No description available'}`);
  lines.push(`Category ID: ${categoryId || 'Not available'}`);

  if (cost !== undefined && cost !== null && cost !== '') {
    lines.push(`Cost: ₹${cost}`);
  } else {
    lines.push('Cost: Price unavailable');
  }

  if (uniqueCode) {
    lines.push(`Unique Code: ${uniqueCode}`);
  }

  if (quantity && quantity > 1) {
    lines.push(`Quantity: ${quantity}`);
  }

  if (size) {
    lines.push(`Size: ${size}`);
  } else {
    lines.push('Size: Not Applicable');
  }

  // Admin link is strictly for admin/super-admin perspective
  if (isAdminPerspective) {
    const adminLink = adminProductUrl || (productId ? getAdminProductUrl(productId, quantity) : undefined);
    if (adminLink) {
      lines.push(`Admin Product Link: ${adminLink}`);
    }
  }

  if (customMeasurements && Object.keys(customMeasurements).length > 0) {
    lines.push('');
    lines.push('My Measurements:');
    Object.entries(customMeasurements).forEach(([key, value]) => {
      lines.push(`- ${key}: ${value}`);
    });
  }

  lines.push('');
  lines.push('Please provide more details about availability and purchase.');

  const message = lines.join('\n');
  const phone = normalizeWhatsAppNumber(shopWhatsAppNumber);

  return `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
}

/**
 * Opens WhatsApp with a product enquiry message directed to the shop number.
 * Fetches the shop number from the backend API (cached after first call).
 */
export async function openWhatsAppEnquiry(params: ProductShareDetails): Promise<void> {
  const shopNumber = await getShopWhatsAppNumber();

  if (!shopNumber) {
    console.error('Shop WhatsApp number is not configured.');
    return;
  }

  const url = buildWhatsAppEnquiryUrl({
    shopWhatsAppNumber: shopNumber,
    ...params,
  });

  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error('Failed to open WhatsApp:', error);
  }
}

/**
 * Builds a formatted message for native product sharing.
 * Strictly excludes admin links for regular customer sharing.
 */
export function buildProductShareMessage(params: ProductShareDetails): string {
  const lines: string[] = ['Check out this product from Sofiya Bangles! ✨', ''];

  lines.push(`Product Name: ${params.productName || 'Unknown'}`);
  if (params.description) {
    lines.push(`Description: ${params.description}`);
  }
  if (params.categoryId) {
    lines.push(`Category ID: ${params.categoryId}`);
  }
  if (params.cost !== undefined && params.cost !== null && params.cost !== '') {
    lines.push(`Cost: ₹${params.cost}`);
  }
  if (params.uniqueCode) {
    lines.push(`Unique Code: ${params.uniqueCode}`);
  }
  if (params.size) {
    lines.push(`Size: ${params.size}`);
  }

  // Admin link is strictly for admin/super-admin perspective
  if (params.isAdminPerspective) {
    const adminLink = params.adminProductUrl || (params.productId ? getAdminProductUrl(params.productId, params.quantity) : undefined);
    if (adminLink) {
      lines.push(`Admin Product Link: ${adminLink}`);
    }
  }

  return lines.join('\n');
}

/**
 * Opens the native share dialog with product details.
 */
export async function shareProduct(params: ProductShareDetails): Promise<void> {
  const message = buildProductShareMessage(params);

  try {
    await Share.share({
      title: params.productName || 'Sofiya Bangles Product',
      message,
    });
  } catch (error) {
    console.error('Error sharing product:', error);
  }
}

export interface SaleReceiptDetails {
  name: string;
  code: string;
  qty: number;
  remaining: number;
  total: number;
  paymentMethod?: string;
  orderNumber?: string;
  customerPhone?: string;
  customerName?: string;
  date?: string;
}

/**
 * Builds a standardized WhatsApp sale receipt message for customers.
 */
export function buildWhatsAppSaleReceiptMessage(receipt: SaleReceiptDetails): string {
  const lines = [
    '✨ *SOFIYA BANGLES — SALE RECEIPT* ✨',
    '━━━━━━━━━━━━━━━━━━━━',
    ...(receipt.orderNumber ? [`*Order Number:* ${receipt.orderNumber}`] : []),
    ...(receipt.customerName ? [`*Customer:* ${receipt.customerName}`] : []),
    `*Product:* ${receipt.name}`,
    `*Special ID:* ${receipt.code}`,
    `*Quantity:* ${receipt.qty} set(s)`,
    ...(receipt.paymentMethod ? [`*Payment Mode:* ${receipt.paymentMethod}`] : []),
    `*Total Amount:* ₹${receipt.total}`,
    `*Date:* ${receipt.date || new Date().toLocaleDateString('en-IN')}`,
    '━━━━━━━━━━━━━━━━━━━━',
    '💖 *Thank you for shopping with Sofiya Bangles!*',
  ];

  return lines.join('\n');
}

/**
 * Opens WhatsApp with the sale receipt directed to the customer.
 * Normalizes phone numbers (adding '91' for 10-digit Indian numbers).
 */
export async function openWhatsAppSaleReceipt(receipt: SaleReceiptDetails): Promise<void> {
  const cleanPhone = (receipt.customerPhone || '').replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const message = buildWhatsAppSaleReceiptMessage(receipt);
  const encoded = encodeURIComponent(message);
  const url = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  await Linking.openURL(url);
}

