import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { api } from '@/api/client';
const AuthContext = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setLoading] = useState(true);
  const [authChecked, setChecked] = useState(false);
  const checkUserAuth = useCallback(async () => {
    try { setUser(await api.auth.me()); }
    catch { setUser(null); }
    finally { setLoading(false); setChecked(true); }
  }, []);
  useEffect(() => { checkUserAuth(); }, [checkUserAuth]);
  async function logout() {
    await api.auth.logout(); setUser(null); window.location.href = '/';
  }
  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoadingAuth,
    authChecked, authError: null, checkUserAuth, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
