// Talks to the /auth/* REST endpoints and manages token storage.
// No DOM, no WebSocket — pure network + storage logic.

// ─── API base URL ────────────────────────────────────────────
// Exported so other modules (contacts, future services) can reuse it.
export function apiBase() {
  const hostname = location.hostname || "localhost";
  return `${location.protocol}//${hostname}:8000`;
}

// ─── Auth endpoints ──────────────────────────────────────────

export async function requestOtp(phoneNumber) {
  const res = await fetch(`${apiBase()}/auth/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone_number: phoneNumber }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to request OTP");
  }
  return res.json(); // { message, otp_dev_only }
}

export async function verifyOtp(phoneNumber, otp) {
  const res = await fetch(`${apiBase()}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone_number: phoneNumber, otp }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Invalid or expired OTP");
  }
  const tokens = await res.json();
  storeTokens(tokens);
  sessionStorage.setItem("shizukasa_phone", phoneNumber);
  return tokens;
}

export async function refreshAccessToken() {
  const refreshToken = sessionStorage.getItem("shizukasa_refresh_token");
  if (!refreshToken) throw new Error("No refresh token stored");

  const res = await fetch(`${apiBase()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    // Refresh token itself is invalid/expired — force re-login
    clearSession();
    throw new Error("Refresh failed — session expired");
  }

  const tokens = await res.json();
  storeTokens(tokens);
  return tokens;
}

// ─── Token storage ───────────────────────────────────────────
// Backend TokenResponse: { access_token, refresh_token, token_type }

function storeTokens({ access_token, refresh_token, token_type }) {
  sessionStorage.setItem("shizukasa_access_token", access_token);
  sessionStorage.setItem("shizukasa_refresh_token", refresh_token);
  if (token_type) {
    sessionStorage.setItem("shizukasa_token_type", token_type);
  }
}

export function getAccessToken() {
  return sessionStorage.getItem("shizukasa_access_token");
}

export function getStoredPhoneNumber() {
  return sessionStorage.getItem("shizukasa_phone");
}

export function isLoggedIn() {
  return !!getAccessToken();
}

export function clearSession() {
  sessionStorage.removeItem("shizukasa_access_token");
  sessionStorage.removeItem("shizukasa_refresh_token");
  sessionStorage.removeItem("shizukasa_token_type");
  sessionStorage.removeItem("shizukasa_phone");
}

// ─── Authenticated fetch helper ──────────────────────────────
// Wraps fetch() with the Authorization: Bearer header that the
// backend's OAuth2PasswordBearer (dependencies.py) expects.
// Automatically retries once with a refreshed token on 401.

let _refreshPromise = null; // deduplicate concurrent refresh calls

export async function authedFetch(url, options = {}) {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const headers = { ...options.headers, Authorization: `Bearer ${token}` };
  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // Try refreshing the access token exactly once
    try {
      if (!_refreshPromise) {
        _refreshPromise = refreshAccessToken().finally(() => {
          _refreshPromise = null;
        });
      }
      await _refreshPromise;
    } catch {
      throw new Error("Session expired — please log in again");
    }

    // Retry the original request with the new token
    const newToken = getAccessToken();
    const retryHeaders = { ...options.headers, Authorization: `Bearer ${newToken}` };
    res = await fetch(url, { ...options, headers: retryHeaders });
  }

  return res;
}
/* This code defines a set of functions for handling authentication in a web application. 
It includes functions to request an OTP (one-time password), 
verify the OTP, refresh the access token, store tokens in session storage, 
retrieve the access token and stored phone number, and clear the session. 
The functions use the Fetch API to make HTTP requests to the backend authentication endpoints and handle responses accordingly.
*/
