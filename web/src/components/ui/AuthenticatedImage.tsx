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
 * AuthenticatedImage component for Admin Portal.
 *
 * Security Features:
 * 1. Attaches Admin JWT Bearer token to protected image asset requests.
 * 2. Manages transient Object URL blob lifecycle and automatic revocation.
 * 3. Handles 401/403 authorization failures with a secure locked state indicator.
 * 4. Supports direct image URLs with automatic authenticated fallback.
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

    // Resolve target image URL (either secure API route or given src)
    let targetUrl = src;
    if (productId && !targetUrl) {
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

    const fetchAuthenticatedImage = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        const headers: Record<string, string> = {};

        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(targetUrl, {
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
          // If remote image fails with CORS/error, try direct image tag fallback
          if (isMounted) {
            setBlobUrl(targetUrl);
            setLoading(false);
          }
          return;
        }

        const blob = await res.blob();
        if (isMounted) {
          // Revoke previous blob URL to avoid memory leak
          if (previousBlobRef.current && previousBlobRef.current.startsWith("blob:")) {
            URL.revokeObjectURL(previousBlobRef.current);
          }

          const newBlobUrl = URL.createObjectURL(blob);
          previousBlobRef.current = newBlobUrl;
          setBlobUrl(newBlobUrl);
          setLoading(false);
        }
      } catch (err) {
        // Network or CORS error on authenticated fetch: fallback to regular URL load
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

  if (error === "not_found" || !blobUrl) {
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
      onError={() => {
        setError("error");
      }}
    />
  );
}
