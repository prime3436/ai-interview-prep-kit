'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Send,
  Building2,
  Calendar,
  Layers,
  Bot,
  UserPlus,
} from 'lucide-react';

export default function LoginScreen() {
  const {
    login,
    register,
    verifyEmail,
    resendCode,
    authMode,
    setAuthMode,
    pendingVerificationEmail,
    setPendingVerificationEmail,
    verificationPreviewCode,
  } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Switch to sign in
  function goToSignIn() {
    setAuthMode('login');
    setError(null);
    setSuccessMessage(null);
  }

  // Switch to create account
  function goToRegister() {
    setAuthMode('register');
    setError(null);
    setSuccessMessage(null);
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Password validation rules
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

    setLoading(true);

    try {
      await register(email, password, name);
      setSuccessMessage(`Your account has been created successfully! Welcome, ${name || email.split('@')[0]}. Entering platform...`);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const targetEmail = pendingVerificationEmail || email;
    if (!targetEmail) {
      setError('Email address is missing. Please start from registration.');
      return;
    }
    if (!verificationCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      await verifyEmail(targetEmail, verificationCode.trim());
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    const targetEmail = pendingVerificationEmail || email;
    if (!targetEmail) return;

    setResending(true);
    setError(null);
    try {
      const newCode = await resendCode(targetEmail);
      setSuccessMessage(`New verification code sent to ${targetEmail}!`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
    }
  }

  function handleQuickDemo() {
    setEmail('demo@trao.local');
    setPassword('DemoPass@2026!');
    setName('Demo Candidate');
    setError(null);
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Product Intro & Features */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20">
            <Sparkles className="w-4 h-4 text-accent-teal animate-pulse" />
            Autonomous AI Interview Prep Engine
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Personalized Prep Kits for{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-accent-teal to-accent-cyan">
              Engineering Roles
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
            Sign in to access your private preparation kits. Crawl company sites, extract strict requirements,
            practice with 3D flashcards, and run full voice & text mock interviews with AI.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="p-3.5 rounded-xl glass-panel border-white/10 flex items-start gap-3">
              <Building2 className="w-5 h-5 text-accent-teal mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white">Company Crawling</h4>
                <p className="text-[11px] text-gray-400">Heuristic discovery of hiring process & culture</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl glass-panel border-white/10 flex items-start gap-3">
              <Layers className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white">Strict Extraction</h4>
                <p className="text-[11px] text-gray-400">Zero-hallucination requirement breakdown</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl glass-panel border-white/10 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-accent-cyan mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white">Deterministic Plan</h4>
                <p className="text-[11px] text-gray-400">Front-loaded arithmetic study schedule</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl glass-panel border-white/10 flex items-start gap-3">
              <Bot className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white">AI Mock Interview</h4>
                <p className="text-[11px] text-gray-400">Real-time rubric scoring & feedback</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Box */}
        <div className="lg:col-span-6">
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/15 shadow-2xl relative">
            {/* Header Tabs (Login vs Register) */}
            {authMode !== 'verify' && (
              <div className="flex border-b border-white/10 pb-3 mb-6">
                <button
                  type="button"
                  onClick={goToSignIn}
                  className={`flex-1 py-2 text-sm font-bold border-b-2 transition-all ${
                    authMode === 'login'
                      ? 'border-primary-500 text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={goToRegister}
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

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-start gap-3 shadow-lg shadow-emerald-500/10 animate-in fade-in duration-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white text-sm">Account Created Successfully!</p>
                  <p className="text-xs text-emerald-200/90 mt-0.5">{successMessage}</p>
                </div>
              </div>
            )}

            {/* ================= MODE 1: SIGN IN ================= */}
            {authMode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">Welcome Back</h3>
                  <p className="text-xs text-gray-400">Sign in to manage and view your private kits</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="you@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

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
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-600 via-primary-500 to-accent-teal hover:opacity-95 shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm mt-2"
                >
                  {loading ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                  <button
                    type="button"
                    onClick={handleQuickDemo}
                    className="text-accent-teal hover:underline font-mono"
                  >
                    Quick Demo Credentials
                  </button>
                  <button
                    type="button"
                    onClick={goToRegister}
                    className="hover:text-white"
                  >
                    Need an account? <span className="text-primary-400 font-semibold">Register</span>
                  </button>
                </div>
              </form>
            )}

            {/* ================= MODE 2: CREATE ACCOUNT ================= */}
            {authMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">Create Your Account</h3>
                  <p className="text-xs text-gray-400">Each candidate gets private, isolated prep workspaces</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Your Full Name</label>
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

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="alex@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">Your account will be created immediately with private kit access</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      placeholder="Min 8 chars, 1 capital, 1 symbol"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-gray-400 space-y-1">
                    <div className={password.length >= 8 ? 'text-emerald-400' : 'text-gray-500'}>
                      {password.length >= 8 ? '✓' : '○'} Minimum 8 characters
                    </div>
                    <div className={/[A-Z]/.test(password) ? 'text-emerald-400' : 'text-gray-500'}>
                      {/[A-Z]/.test(password) ? '✓' : '○'} At least one capital letter (A-Z)
                    </div>
                    <div className={/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(password) ? 'text-emerald-400' : 'text-gray-500'}>
                      {/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(password) ? '✓' : '○'} At least one special character (!@#$%^&*...)
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-accent-teal via-primary-500 to-primary-600 hover:opacity-95 shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm mt-2"
                >
                  {loading ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center text-xs text-gray-400">
                  Already have an account?{' '}
                  <button type="button" onClick={goToSignIn} className="text-primary-400 hover:underline font-semibold">
                    Sign In here
                  </button>
                </div>
              </form>
            )}

            {/* ================= MODE 3: EMAIL VERIFICATION ================= */}
            {authMode === 'verify' && (
              <form onSubmit={handleVerifySubmit} className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary-500/10 border border-primary-500/20 text-accent-teal flex items-center justify-center mx-auto">
                    <Mail className="w-6 h-6 animate-bounce" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Verify Your Email</h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    We sent a 6-digit confirmation code to{' '}
                    <span className="text-white font-mono font-semibold">
                      {pendingVerificationEmail || email}
                    </span>
                  </p>
                </div>

                {/* Instant Verification Code Preview Box for Reviewer & Demo */}
                {verificationPreviewCode && (
                  <div className="p-3.5 rounded-xl bg-primary-950/40 border border-primary-500/30 text-center space-y-1">
                    <span className="text-[11px] font-semibold text-accent-teal uppercase tracking-wider">
                      📧 Verification Email Dispatched
                    </span>
                    <div className="text-2xl font-extrabold font-mono tracking-widest text-white">
                      {verificationPreviewCode}
                    </div>
                    <p className="text-[11px] text-gray-400">
                      (Click below to auto-fill or enter manually)
                    </p>
                    <button
                      type="button"
                      onClick={() => setVerificationCode(verificationPreviewCode)}
                      className="text-xs text-accent-cyan hover:underline font-medium pt-1"
                    >
                      Auto-fill code {verificationPreviewCode}
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-300 text-center">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center text-2xl tracking-[0.4em] font-mono py-3 rounded-xl bg-black/60 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || verificationCode.length < 6}
                  className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  {loading ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>Verify Email & Enter Dashboard</span>
                    </>
                  )}
                </button>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resending}
                    className="text-accent-teal hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    {resending ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Resend Code
                  </button>

                  <button
                    type="button"
                    onClick={goToSignIn}
                    className="hover:text-white"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
