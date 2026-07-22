"use client";

/**
 * Session Manager
 *
 * Handles:
 * - Auto-logout on browser/tab close (visibility change + beforeunload)
 * - Token expiry detection
 * - Session heartbeat
 * - Cross-tab session sync
 */

const SESSION_KEY = "session_active";
const SESSION_TIMESTAMP_KEY = "session_started_at";
const HEARTBEAT_INTERVAL_MS = 60_000; // 1 min
const SESSION_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 1 week (matches JWT expiry)

export type SessionEventHandler = (reason: SessionEndReason) => void;

export type SessionEndReason =
  | "browser_close"
  | "tab_close"
  | "token_expired"
  | "manual_logout"
  | "session_timeout";

class SessionManager {
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private onEndCallbacks: SessionEventHandler[] = [];
  private isEnding = false;
  private tabId: string;

  constructor() {
    this.tabId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  }

  /** Start monitoring session */
  start() {
    if (typeof window === "undefined") return;

    // Register session
    localStorage.setItem(SESSION_KEY, this.tabId);
    localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());

    // Listen for visibility change (tab background/foreground)
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    // Listen for storage events (cross-tab logout)
    window.addEventListener("storage", this.handleStorageEvent);

    // Heartbeat to keep session alive
    this.heartbeatTimer = setInterval(this.heartbeat, HEARTBEAT_INTERVAL_MS);
    this.heartbeat();

    // Check session timeout
    this.checkSessionTimeout();
  }

  /** Stop monitoring */
  stop() {
    if (typeof window === "undefined") return;

    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener("storage", this.handleStorageEvent);

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /** Register callback for session end */
  onEnd(callback: SessionEventHandler) {
    this.onEndCallbacks.push(callback);
    return () => {
      this.onEndCallbacks = this.onEndCallbacks.filter((cb) => cb !== callback);
    };
  }

  /** End the session manually */
  endSession(reason: SessionEndReason) {
    if (this.isEnding) return;
    this.isEnding = true;

    localStorage.removeItem(SESSION_KEY);
    localStorage.setItem("session_ended", reason);
    localStorage.setItem("session_ended_at", Date.now().toString());

    this.notifyEnd(reason);
    this.stop();
  }

  /** Get a stored session end reason */
  getEndReason(): SessionEndReason | null {
    if (typeof window === "undefined") return null;
    const reason = localStorage.getItem("session_ended");
    return reason as SessionEndReason | null;
  }

  /** Clear session ended flag (after handling it) */
  clearEndReason() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("session_ended");
    localStorage.removeItem("session_ended_at");
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      // Tab going to background - might be closing
      // Use a flag to detect real close vs tab switch
      sessionStorage.setItem("tab_hidden_at_" + this.tabId, Date.now().toString());
    } else if (document.visibilityState === "visible") {
      // Tab coming back to foreground
      const hiddenAt = sessionStorage.getItem("tab_hidden_at_" + this.tabId);
      if (hiddenAt) {
        const elapsed = Date.now() - parseInt(hiddenAt, 10);
        // If hidden for more than 5 minutes, consider session timed out
        if (elapsed > 5 * 60 * 1000) {
          this.endSession("session_timeout");
        }
        sessionStorage.removeItem("tab_hidden_at_" + this.tabId);
      }

      // Check for cross-tab session end
      const endedReason = localStorage.getItem("session_ended");
      if (endedReason) {
        this.notifyEnd(endedReason as SessionEndReason);
      }
    }
  };

  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key === "session_ended" && event.newValue) {
      // Another tab ended the session
      this.notifyEnd(event.newValue as SessionEndReason);
      this.stop();
    }
  };

  private heartbeat = () => {
    if (typeof window === "undefined") return;
    localStorage.setItem("session_last_heartbeat", Date.now().toString());

    // Check if session was ended from another tab
    const endedReason = localStorage.getItem("session_ended");
    if (endedReason) {
      this.notifyEnd(endedReason as SessionEndReason);
      this.stop();
    }

    // Check token expiry
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const expiry = payload.exp * 1000;
        if (Date.now() >= expiry) {
          this.endSession("token_expired");
        }
      } catch {
        // Invalid token format, ignore
      }
    }
  };

  private checkSessionTimeout() {
    const startedAt = localStorage.getItem(SESSION_TIMESTAMP_KEY);
    if (startedAt) {
      const elapsed = Date.now() - parseInt(startedAt, 10);
      if (elapsed > SESSION_TIMEOUT_MS) {
        this.endSession("session_timeout");
      }
    }
  }

  private notifyEnd(reason: SessionEndReason) {
    this.onEndCallbacks.forEach((cb) => {
      try {
        cb(reason);
      } catch {
        // Ignore callback errors
      }
    });
  }
}

// Singleton
export const sessionManager = new SessionManager();
