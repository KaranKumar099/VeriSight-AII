import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { API_BASE } from "../api";

const AuthContext = createContext(null);

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed ${res.status}`);
  return body;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("vs_token") || null);
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    apiRequest("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ user }) => setUser(user))
      .catch(() => { localStorage.removeItem("vs_token"); setToken(null); })
      .finally(() => setLoading(false));
  }, [token]);

  const register = useCallback(async (payload) => {
    const { token: t, user: u } = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    localStorage.setItem("vs_token", t);
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { token: t, user: u } = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("vs_token", t);
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("vs_token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
