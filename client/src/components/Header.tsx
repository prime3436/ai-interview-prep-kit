'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Layers,
  Plus,
  LogIn,
  UserPlus,
  LogOut,
  User,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function Header() {
  const { user, logout, setShowAuthModal, setAuthMode } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Candidate');
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 via-accent-teal to-accent-cyan flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white group-hover:text-primary-400 transition-colors">
              InterviewPrep<span className="text-accent-teal">.AI</span>
            </span>
            <span className="block text-[10px] text-accent-teal/80 font-mono tracking-wider uppercase">
              Autonomous Prep Platform
            </span>
          </div>
        </Link>

        {/* Navigation & User Actions */}
        <nav className="flex items-center gap-2 sm:gap-3">
          {/* My Kits Navigation */}
          <Link
            href="/#my-kits-section"
            className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4 text-primary-400" />
            <span>My Kits</span>
          </Link>

          {/* Quick Create Kit Button */}
          <Link
            href="/#create-kit-form"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-primary-600 to-accent-teal hover:from-primary-500 hover:to-accent-cyan shadow-sm shadow-primary-500/25 transition-all flex items-center gap-1.5 group"
          >
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-200" />
            <span>New Kit</span>
          </Link>

          {/* Authentication State & Profile Dropdown */}
          <div className="pl-2 border-l border-white/10 flex items-center gap-2">
            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
                  aria-expanded={showProfileMenu}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-teal flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {initial}
                  </div>
                  <span className="text-xs font-semibold text-white font-mono group-hover:text-primary-300 transition-colors">
                    {displayName}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-transform duration-150 ${
                      showProfileMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl glass-panel border border-white/15 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* User Info Header */}
                    <div className="px-3 py-2.5 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-teal flex items-center justify-center text-sm font-bold text-white shadow-sm">
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{displayName}</p>
                          <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Verified Candidate Account
                      </div>
                    </div>

                    {/* Quick Menu Items */}
                    <div className="py-1.5 space-y-0.5">
                      <Link
                        href="/#my-kits-section"
                        onClick={() => setShowProfileMenu(false)}
                        className="w-full px-3 py-2 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2 text-left"
                      >
                        <Layers className="w-3.5 h-3.5 text-primary-400" />
                        <span>View Saved Prep Kits</span>
                      </Link>
                      <Link
                        href="/#create-kit-form"
                        onClick={() => setShowProfileMenu(false)}
                        className="w-full px-3 py-2 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2 text-left"
                      >
                        <Plus className="w-3.5 h-3.5 text-accent-teal" />
                        <span>Create New Preparation Kit</span>
                      </Link>
                    </div>

                    {/* Sign Out Action */}
                    <div className="pt-1.5 border-t border-white/10">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          logout();
                        }}
                        className="w-full px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors flex items-center gap-2 text-left"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
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
