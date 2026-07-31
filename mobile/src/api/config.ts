import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORAGE_KEY = "api_base_url_override";

const BACKEND_PORT = "5000";
const API_PREFIX = "/api";

export interface ApiConfig {
  url: string;
  source: "override" | "auto-detect" | "env" | "default";
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Extract the dev machine's current LAN IP from the Expo Metro bundler.
 * When you run `npx expo start`, the phone connects to Metro at
 * `http://<your-lan-ip>:8081`. The backend runs on the same machine on
 * port 5000, so we reuse that IP. This means the API URL follows you
 * automatically when you change WiFi / place — no manual edits needed.
 */
function detectHostFromMetro(): string | null {
  const expoConfig = Constants.expoConfig;
  const hostUri =
    expoConfig?.hostUri ??
    (Constants as any).expoGoConfig?.debuggerHost ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    null;

  if (!hostUri) return null;

  const host = hostUri.split(":")[0];
  if (!host) return null;

  // localhost / loopback / emulator aliases give no useful LAN IP.
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "10.0.2.2" ||
    host === "::1"
  ) {
    return null;
  }

  return host;
}

function buildUrl(host: string): string {
  return `http://${host}:${BACKEND_PORT}${API_PREFIX}`;
}

function getEnvApiUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_API_URL?.trim();
  return url || null;
}

async function getStoredOverride(): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(STORAGE_KEY);
    return value?.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

export async function clearStoredOverride(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Best synchronous guess at the API base URL (no SecureStore read):
 *   auto-detected Metro IP → env var → platform default.
 */
export function resolveApiBaseUrlSync(): ApiConfig {
  const metroHost = detectHostFromMetro();
  if (metroHost) {
    return { url: buildUrl(metroHost), source: "auto-detect" };
  }

  const envUrl = getEnvApiUrl();
  if (envUrl) {
    return { url: normalizeUrl(envUrl), source: "env" };
  }

  if (Platform.OS === "android") {
    return { url: "http://10.0.2.2:5000/api", source: "default" };
  }
  return { url: "http://localhost:5000/api", source: "default" };
}

/**
 * Resolve the API base URL in priority order:
 *   1. Manual override saved from the in-app Server Settings screen
 *   2. Auto-detected dev machine IP from the Metro bundler (follows WiFi changes)
 *   3. EXPO_PUBLIC_API_URL env var (build-time value)
 *   4. Platform defaults (Android emulator / localhost)
 */
export async function resolveApiBaseUrl(): Promise<ApiConfig> {
  const override = await getStoredOverride();
  if (override) {
    return { url: normalizeUrl(override), source: "override" };
  }
  return resolveApiBaseUrlSync();
}

// ─── Cached value so the axios client and token-refresh code can read it synchronously ───

let cachedConfig: ApiConfig = resolveApiBaseUrlSync();

export function getCachedApiBaseUrl(): string {
  return cachedConfig.url;
}

export function getCachedApiSource(): ApiConfig["source"] {
  return cachedConfig.source;
}

/**
 * Resolve the API URL and cache it. Call once at app startup.
 * Returns the resolved URL.
 */
export async function initApiClientConfig(): Promise<string> {
  cachedConfig = await resolveApiBaseUrl();
  return cachedConfig.url;
}

/**
 * Re-resolve the API URL from scratch (used by the Server Settings screen
 * after saving or resetting an override). Returns the resolved URL.
 */
export async function refreshApiClientConfig(): Promise<ApiConfig> {
  cachedConfig = await resolveApiBaseUrl();
  return cachedConfig;
}

export async function saveApiUrlOverride(url: string): Promise<string> {
  const normalized = normalizeUrl(url);
  await SecureStore.setItemAsync(STORAGE_KEY, normalized);
  cachedConfig = { url: normalized, source: "override" };
  return normalized;
}

export async function resetApiUrlOverride(): Promise<ApiConfig> {
  await clearStoredOverride();
  cachedConfig = await resolveApiBaseUrl();
  return cachedConfig;
}

export const API_URL_STORAGE_KEY = STORAGE_KEY;
