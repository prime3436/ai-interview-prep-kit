'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Layers, ShieldCheck, LogIn, UserPlus, LogOut, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function Header() {
  const { user, logout, setShowAuthModal, setAuthMode } = useAuth();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 via-accent-teal to-accent-cyan flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white group-hover:text-primary-400 transition-colors">
              InterviewPrep<span className="text-accent-teal">.AI</span>
            </span>
            <span className="block text-[10px] text-gray-400 font-mono tracking-wider">
              TRAO FS-AI-INTERVIEW-01
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/"
            className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/10">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Deterministic Engine
            </span>
          </div>

          {/* Authentication State */}
          <div className="pl-3 border-l border-white/10 flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                  <User className="w-3.5 h-3.5 text-accent-teal" />
                  <span className="text-xs font-semibold text-white font-mono">{user.name || user.email.split('@')[0]}</span>
                </div>
                <button
                  onClick={logout}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setShowAuthModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => {
                    setAuthMode('register');
                    setShowAuthModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-sm transition-all flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
