'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';

interface User {
  id: string;
  email: string;
  name?: string;
  isVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string) => Promise<{ requiresVerification: boolean; email: string; previewCode?: string }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<string | undefined>;
  logout: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authMode: 'login' | 'register' | 'verify';
  setAuthMode: (mode: 'login' | 'register' | 'verify') => void;
  pendingVerificationEmail: string | null;
  setPendingVerificationEmail: (email: string | null) => void;
  verificationPreviewCode: string | null;
  setVerificationPreviewCode: (code: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'verify'>('login');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [verificationPreviewCode, setVerificationPreviewCode] = useState<string | null>(null);

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
    try {
      const res = await api.login({ email, password: pass });
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('trao_auth_token', res.token);
      localStorage.setItem('trao_auth_user', JSON.stringify(res.user));
      setShowAuthModal(false);
    } catch (err: any) {
      // Check if user needs verification
      if (err.message && err.message.includes('verify your email')) {
        setPendingVerificationEmail(email);
        setAuthMode('verify');
      }
      throw err;
    }
  }

  async function register(email: string, pass: string, name?: string) {
    const res = await api.register({ email, password: pass, name });
    if (res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('trao_auth_token', res.token);
      localStorage.setItem('trao_auth_user', JSON.stringify(res.user));
      setShowAuthModal(false);
    }
    return res;
  }

  async function verifyEmail(email: string, code: string) {
    const res = await api.verifyEmail({ email, code });
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('trao_auth_token', res.token);
    localStorage.setItem('trao_auth_user', JSON.stringify(res.user));
    setShowAuthModal(false);
    setPendingVerificationEmail(null);
    setVerificationPreviewCode(null);
  }

  async function resendCode(email: string): Promise<string | undefined> {
    const res = await api.resendCode({ email });
    if (res.previewCode) {
      setVerificationPreviewCode(res.previewCode);
    }
    return res.previewCode;
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
        verifyEmail,
        resendCode,
        logout,
        showAuthModal,
        setShowAuthModal,
        authMode,
        setAuthMode,
        pendingVerificationEmail,
        setPendingVerificationEmail,
        verificationPreviewCode,
        setVerificationPreviewCode,
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
