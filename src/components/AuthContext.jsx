import React, { createContext, useState, useEffect } from 'react';
import apiClient, { injectLogoutAction } from './apiClient';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Add tracking flag for UX

  // 🌟 FIX: Updated logout to clear the backend cookie context
  const logout = async () => {
    setIsLoggingOut(true);
    try {
      // Clear token on server side first
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.error("Server-side auth eviction dropped:", err);
    } finally {
      // Clean up client-side footprint completely
      setUser(null);
      localStorage.clear();
      sessionStorage.clear();
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    injectLogoutAction(logout);

    const verifySession = async () => {
      try {
        const response = await apiClient.get('/auth/me'); 
        if (response.data?.user) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.warn("No active session found:", error);
        setUser(null);
      } finally {
        setLoading(false); 
      }
    };

    verifySession();
  }, []);

  const login = (userPayload) => {
    setUser(userPayload);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isLoggingOut }}>
      {children}
    </AuthContext.Provider>
  );
};