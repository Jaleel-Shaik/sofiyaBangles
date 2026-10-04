import { Router } from "expo-router";
import { AppNotification } from "../store/notificationStore";

/**
 * Robust Centralized Navigation Dispatcher for Notifications.
 * Handles product, order, review, new arrivals, and announcement routing across Customer & Admin roles.
 */
export const navigateFromNotification = (
  router: Router,
  notif: AppNotification,
  userRole?: string
): void => {
  const type = (notif.type || "").toUpperCase();
  const title = (notif.title || "").toLowerCase();
  const desc = (notif.desc || "").toLowerCase();

  // 1. Resolve explicit Product ID if present
  const resolvedProductId =
    notif.productId ||
    notif.linkUrl?.match(/\/products\/([a-zA-Z0-9_-]+)/)?.[1] ||
    notif.linkUrl?.match(/product-detail\/([a-zA-Z0-9_-]+)/)?.[1];

  // 2. Resolve explicit Order Reference (e.g., ORD-123456)
  const extractedOrderNo = (
    notif.orderNumber ||
    notif.orderId ||
    notif.title?.match(/ORD-[\w\d-]+/i)?.[0] ||
    notif.desc?.match(/ORD-[\w\d-]+/i)?.[0] ||
    ""
  ).replace(/^#/, "");

  // Priority A: If this is an explicit order update with an order number or orderId (and not a product notification)
  const isExplicitOrderType =
    type === "ORDER_STATUS" ||
    type === "ORDER_STATUS_UPDATE" ||
    type === "REFUND";

  if ((extractedOrderNo || isExplicitOrderType) && !resolvedProductId) {
    if (userRole === "admin") {
      router.push({
        pathname: "/orders",
        params: { search: extractedOrderNo || notif.orderId || "" },
      } as any);
    } else {
      router.push({
        pathname: "/orders",
        params: {
          highlightOrder: extractedOrderNo || notif.orderId || "",
          search: extractedOrderNo || notif.orderId || "",
        },
      } as any);
    }
    return;
  }

  // Priority B: Product Navigation (Customer -> /products/[id], Admin -> /product-detail/[id])
  // Tapping restock, new arrivals, price drops, or product announcements opens product details immediately so users can buy!
  if (resolvedProductId) {
    if (userRole === "admin") {
      router.push({
        pathname: "/(admin)/(tabs)/product-detail/[id]",
        params: { id: resolvedProductId },
      } as any);
    } else {
      router.push({
        pathname: "/products/[id]",
        params: { id: resolvedProductId },
      } as any);
    }
    return;
  }

  // 3. New Arrivals collection
  if (
    type === "NEW_ARRIVAL" ||
    title.includes("new arrival") ||
    title.includes("just added") ||
    desc.includes("latest arrival")
  ) {
    router.push("/new-arrivals" as any);
    return;
  }

  // 5. Explicit Link URL
  if (notif.linkUrl) {
    router.push(notif.linkUrl as any);
    return;
  }

  // 6. Generic Promotion / Discount -> Search Catalog
  if (
    title.includes("sale") ||
    title.includes("discount") ||
    title.includes("offer") ||
    desc.includes("explore")
  ) {
    router.push("/search" as any);
    return;
  }

  // 7. Fallback to Home Shop tab
  router.push("/(tabs)/" as any);
};
