import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('mule_token');
    const savedUser = localStorage.getItem('mule_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const loginDemo = async () => {
    const res = await api.post('/api/auth/demo');
    localStorage.setItem('mule_token', res.data.token);
    localStorage.setItem('mule_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  };

  const loginWithToken = (token) => {
    localStorage.setItem('mule_token', token);
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      localStorage.setItem('mule_user', JSON.stringify(payload));
      setUser(payload);
    } catch {}
  };

  const logout = () => {
    localStorage.removeItem('mule_token');
    localStorage.removeItem('mule_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginDemo, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
