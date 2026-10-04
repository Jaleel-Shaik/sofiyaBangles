"use client";

import { useState, useEffect, useRef } from "react";
import { Lock, ImageOff, Loader2 } from "lucide-react";
import { API_URL } from "@/src/lib/api/client";

export interface AuthenticatedImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  productId?: string;
  imageIndex?: number;
  fallbackIcon?: React.ReactNode;
}

/**
 * Robustly sanitizes an image URL, unwrapping stringified JSON arrays or escaped quotes if present.
 */
function sanitizeImageUrl(val?: string | null): string | null {
  if (!val || typeof val !== "string") return null;
  let s = val.trim();
  while (
    (s.startsWith("[") && s.endsWith("]")) ||
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) {
          s = typeof parsed[0] === "string" ? parsed[0].trim() : String(parsed[0]);
          continue;
        }
      } catch {
        s = s.slice(1, -1).trim();
      }
    } else {
      s = s.slice(1, -1).trim();
    }
  }
  s = s.replace(/^[\\"'`]+|[\\"'`]+$/g, "").trim();
  return s || null;
}

/**
 * AuthenticatedImage component for Admin Portal.
 *
 * Security Features:
 * 1. Attaches Admin JWT Bearer token to protected API image requests (/secure-image).
 * 2. Unwraps any legacy stringified JSON array formats automatically.
 * 3. Direct CDN URLs (Cloudinary, Unsplash) load directly without sending Authorization headers to prevent CORS preflight failures.
 * 4. Manages transient Object URL blob lifecycle and automatic revocation for protected images.
 * 5. Handles 401/403 authorization failures with a secure locked state indicator.
 * 6. Smooth fallback to secure backend proxy or ImageOff placeholder.
 */
export function AuthenticatedImage({
  src,
  alt,
  className = "w-full h-full object-cover",
  productId,
  imageIndex = 0,
  fallbackIcon,
}: AuthenticatedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<"unauthorized" | "not_found" | "error" | null>(null);
  const previousBlobRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // 1. Sanitize the provided src
    const cleanSrc = sanitizeImageUrl(src);

    // 2. Resolve target image URL (either direct cleanSrc or secure API route)
    let targetUrl = cleanSrc;
    if (!targetUrl && productId) {
      targetUrl = `${API_URL}/products/${productId}/secure-image/${imageIndex}`;
    }

    if (!targetUrl) {
      setLoading(false);
      setError("not_found");
      return;
    }

    // Direct data or blob URLs do not need authenticated refetching
    if (targetUrl.startsWith("data:") || targetUrl.startsWith("blob:")) {
      setBlobUrl(targetUrl);
      setLoading(false);
      return;
    }

    // Direct external CDN URLs (Cloudinary, Unsplash, standard external images)
    // Do NOT send local Bearer token to external CDNs to avoid CORS preflight rejection!
    const isProtectedApiRoute = targetUrl.includes("/secure-image") || (Boolean(API_URL) && targetUrl.startsWith(API_URL));

    if (!isProtectedApiRoute) {
      setBlobUrl(targetUrl);
      setLoading(false);
      return;
    }

    // For protected API endpoints, fetch with Bearer Authorization token
    const fetchAuthenticatedImage = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        const headers: Record<string, string> = {};

        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(targetUrl!, {
          method: "GET",
          headers,
        });

        if (res.status === 401 || res.status === 403) {
          if (isMounted) {
            setError("unauthorized");
            setLoading(false);
          }
          return;
        }

        if (!res.ok) {
          if (isMounted) {
            // Direct fallback to targetUrl
            setBlobUrl(targetUrl);
            setLoading(false);
          }
          return;
        }

        const blob = await res.blob();
        if (isMounted) {
          if (previousBlobRef.current && previousBlobRef.current.startsWith("blob:")) {
            URL.revokeObjectURL(previousBlobRef.current);
          }

          const newBlobUrl = URL.createObjectURL(blob);
          previousBlobRef.current = newBlobUrl;
          setBlobUrl(newBlobUrl);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setBlobUrl(targetUrl);
          setLoading(false);
        }
      }
    };

    fetchAuthenticatedImage();

    return () => {
      isMounted = false;
      if (previousBlobRef.current && previousBlobRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(previousBlobRef.current);
      }
    };
  }, [src, productId, imageIndex]);

  const handleImgError = () => {
    // If a direct URL fails, attempt fallback to secure image route if not already tried
    if (productId && blobUrl && !blobUrl.includes("/secure-image")) {
      setBlobUrl(`${API_URL}/products/${productId}/secure-image/${imageIndex}`);
      return;
    }
    setError("error");
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
      </div>
    );
  }

  if (error === "unauthorized") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-slate-50 text-slate-400 border border-slate-200 text-center">
        <Lock className="w-5 h-5 text-amber-500 mb-1" />
        <span className="text-[10px] font-semibold text-slate-500">Token Required</span>
      </div>
    );
  }

  if (error === "not_found" || error === "error" || !blobUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-300">
        {fallbackIcon || <ImageOff className="w-6 h-6 text-slate-300" />}
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      onError={handleImgError}
    />
  );
}
