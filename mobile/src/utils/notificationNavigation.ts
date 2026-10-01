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

  const extractedOrderNo = (
    notif.orderNumber ||
    notif.orderId ||
    notif.title?.match(/ORD-[\w\d-]+/i)?.[0] ||
    notif.desc?.match(/ORD-[\w\d-]+/i)?.[0] ||
    ""
  ).replace(/^#/, "");

  // 1. Order-related notification
  if (
    type === "ORDER_STATUS" ||
    type === "ORDER_STATUS_UPDATE" ||
    type === "NEW_SALE" ||
    type === "REFUND" ||
    extractedOrderNo ||
    title.includes("order") ||
    title.includes("bought") ||
    title.includes("refund")
  ) {
    if (userRole === "admin") {
      router.push({
        pathname: "/orders",
        params: { search: extractedOrderNo || notif.orderId || "" },
      } as any);
    } else {
      router.push({
        pathname: "/orders",
        params: { highlightOrder: extractedOrderNo || notif.orderId || "", search: extractedOrderNo || notif.orderId || "" },
      } as any);
    }
    return;
  }

  // 2. Product-specific notification (Restock, New Arrival, Price Drop, etc.)
  if (notif.productId) {
    if (userRole === "admin") {
      router.push({
        pathname: "/(admin)/(tabs)/product-detail/[id]",
        params: { id: notif.productId },
      } as any);
    } else {
      router.push({
        pathname: "/products/[id]",
        params: { id: notif.productId },
      } as any);
    }
    return;
  }

  // 3. Reviews & Ratings
  if (
    type === "REVIEW" ||
    type === "RATING" ||
    type === "PRODUCT_REVIEW" ||
    title.includes("review") ||
    title.includes("rating")
  ) {
    if (userRole === "admin") {
      router.push("/(admin)/reviews" as any);
    } else if (notif.productId) {
      router.push({
        pathname: "/products/[id]",
        params: { id: notif.productId },
      } as any);
    }
    return;
  }

  // 4. New Arrivals collection
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
