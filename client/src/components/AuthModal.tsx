'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { X, Lock, Mail, User, AlertCircle, RotateCcw } from 'lucide-react';

export default function AuthModal() {
  const {
    showAuthModal,
    setShowAuthModal,
    authMode,
    setAuthMode,
    login,
    register,
    verifyEmail,
    resendCode,
    pendingVerificationEmail,
    verificationPreviewCode,
  } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!showAuthModal) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (authMode === 'verify') {
      const targetEmail = pendingVerificationEmail || email;
      if (!verificationCode.trim()) {
        setError('Please enter the 6-digit verification code.');
        return;
      }
      setLoading(true);
      try {
        await verifyEmail(targetEmail, verificationCode.trim());
      } catch (err: any) {
        setError(err.message || 'Verification failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Strict Password Validation for Registration
    if (authMode === 'register') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setError('Password must contain at least one capital letter (A-Z).');
        return;
      }
      if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(password)) {
        setError('Password must contain at least one special character (!@#$%^&*...).');
        return;
      }
    }

    setLoading(true);

    try {
      if (authMode === 'login') {
        await login(email, password);
      } else {
        const res = await register(email, password, name);
        if (res.requiresVerification) {
          setSuccess(`Verification code dispatched to ${email}!`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  function handleQuickDemo() {
    setEmail('demo@trao.local');
    setPassword('DemoPass@2026!');
    setName('Demo Candidate');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl space-y-6 border border-white/20 relative shadow-2xl">
        <button
          onClick={() => setShowAuthModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Switcher */}
        {authMode !== 'verify' && (
          <div className="flex border-b border-white/10 pb-2">
            <button
              onClick={() => {
                setAuthMode('login');
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 text-sm font-bold border-b-2 transition-all ${
                authMode === 'login'
                  ? 'border-primary-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthMode('register');
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 text-sm font-bold border-b-2 transition-all ${
                authMode === 'register'
                  ? 'border-accent-teal text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        <div className="space-y-1 text-center">
          <h3 className="text-xl font-bold text-white">
            {authMode === 'login'
              ? 'Welcome Back'
              : authMode === 'register'
              ? 'Register New Account'
              : 'Verify Your Email'}
          </h3>
          <p className="text-xs text-gray-400">
            {authMode === 'login'
              ? 'Access and modify your personal interview prep kits'
              : authMode === 'register'
              ? 'Create an account to keep your kits private and secured'
              : `Enter the 6-digit code sent to ${pendingVerificationEmail || email}`}
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center">
            {success}
          </div>
        )}

        {authMode === 'verify' && verificationPreviewCode && (
          <div className="p-3 rounded-xl bg-primary-950/40 border border-primary-500/30 text-center">
            <span className="text-[11px] text-accent-teal font-mono">Verification Code Preview:</span>
            <div className="text-xl font-bold font-mono tracking-widest text-white mt-1">
              {verificationPreviewCode}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Your Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="Alex Mercer"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {authMode !== 'verify' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {authMode !== 'verify' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {authMode === 'register' && (
                <p className="text-[11px] text-gray-400 font-mono pt-1">
                  Must be at least 8 characters, with 1 capital letter and 1 special character.
                </p>
              )}
            </div>
          )}

          {authMode === 'verify' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">6-Digit Code</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center tracking-widest text-xl font-mono py-2.5 rounded-xl bg-black/50 border border-white/15 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-600 to-accent-teal hover:opacity-95 shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
          >
            {loading ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : authMode === 'login' ? (
              'Sign In'
            ) : authMode === 'register' ? (
              'Create Account & Send Email'
            ) : (
              'Verify Code & Continue'
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          {authMode === 'verify' ? (
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError(null);
                setSuccess(null);
              }}
              className="text-primary-400 hover:underline"
            >
              Back to Sign In
            </button>
          ) : (
            <button
              type="button"
              onClick={handleQuickDemo}
              className="text-accent-teal hover:underline"
            >
              Fill Demo Credentials
            </button>
          )}
          <span>Section 1 Secure Auth</span>
        </div>
      </div>
    </div>
  );
}
