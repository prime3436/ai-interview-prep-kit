'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const savedToken = localStorage.getItem('trao_auth_token');
    const savedUser = localStorage.getItem('trao_auth_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('trao_auth_token');
        localStorage.removeItem('trao_auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  async function login(email: string, pass: string) {
    const res = await api.login({ email, password: pass });
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('trao_auth_token', res.token);
    localStorage.setItem('trao_auth_user', JSON.stringify(res.user));
    setShowAuthModal(false);
  }

  async function register(email: string, pass: string, name?: string) {
    const res = await api.register({ email, password: pass, name });
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('trao_auth_token', res.token);
    localStorage.setItem('trao_auth_user', JSON.stringify(res.user));
    setShowAuthModal(false);
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('trao_auth_token');
    localStorage.removeItem('trao_auth_user');
    window.location.href = '/';
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        showAuthModal,
        setShowAuthModal,
        authMode,
        setAuthMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
