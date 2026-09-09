'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Search,
  Calendar,
  Building2,
  FileText,
  Upload,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Play,
  RotateCcw,
} from 'lucide-react';
import { api } from '@/lib/api';

import { useAuth } from '@/lib/auth-context';

export default function Dashboard() {
  const router = useRouter();
  const { user, setShowAuthModal, setAuthMode } = useAuth();

  // Form states
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Saved kits state
  const [kits, setKits] = useState<any[]>([]);
  const [isLoadingKits, setIsLoadingKits] = useState(true);

  // Batch modal state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchJson, setBatchJson] = useState('');
  const [batchProcessing, setBatchProcessing] = useState(false);

  useEffect(() => {
    loadKits();
  }, [user]);

  async function loadKits() {
    try {
      setIsLoadingKits(true);
      const res = await api.getKits();
      setKits(res.kits || []);
    } catch (err: any) {
      console.warn('Could not load kits:', err.message);
    } finally {
      setIsLoadingKits(false);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!jd.trim() || !companyUrl.trim()) {
      setErrorMessage('Please provide both the job description and the company website.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setProgressStep(1);

    // Simulated progress indicators for user feedback
    const timer1 = setTimeout(() => setProgressStep(2), 700);
    const timer2 = setTimeout(() => setProgressStep(3), 1500);
    const timer3 = setTimeout(() => setProgressStep(4), 2200);

    try {
      const res = await api.generateKit({
        jd,
        company_url: companyUrl,
        days,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setProgressStep(5);

      setTimeout(() => {
        router.push(`/kits/${res.kit._id}`);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate kit');
      setIsGenerating(false);
      setProgressStep(0);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this prep kit?')) {
      await api.deleteKit(id);
      loadKits();
    }
  }

  async function handleBatchSubmit() {
    if (!batchJson.trim()) return;
    try {
      setBatchProcessing(true);
      const parsed = JSON.parse(batchJson);
      const res = await api.uploadBatch(parsed);
      alert(`Batch completed! Processed ${res.kits?.length || 0} cases.`);
      setShowBatchModal(false);
      setBatchJson('');
      loadKits();
    } catch (err: any) {
      alert(`Batch processing error: ${err.message}`);
    } finally {
      setBatchProcessing(false);
    }
  }

  // Pre-fill quick demo templates
  function loadDemo(type: 'stripe' | 'vercel') {
    if (type === 'stripe') {
      setCompanyUrl('https://stripe.com');
      setDays(5);
      setJd(`Senior Backend Engineer
Requirements:
- 5+ years of experience with Node.js and TypeScript
- Proven experience designing and operating microservices in production
- Experience mentoring junior and mid-level engineers
- Bonus points: Experience with Kafka and Kubernetes`);
    } else {
      setCompanyUrl('https://vercel.com');
      setDays(3);
      setJd(`Staff Frontend Engineer
Requirements:
- Strong expertise with Next.js, React, and modern TypeScript
- Track record of performance optimization and core web vitals
- Experience partnering with product and design on complex component systems
- Preferred: Experience with Tailwind CSS and animation`);
    }
  }

  return (
    <div className="space-y-12">
      {/* Hero Header */}
      <section className="text-center max-w-3xl mx-auto space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20">
          <Sparkles className="w-4 h-4 text-accent-teal" />
          Autonomous Multi-Pass Research & Prep Pipeline
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Turn Any Job Description into an{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-accent-teal to-accent-cyan">
            Actionable Prep Kit
          </span>
        </h1>
        <p className="text-base sm:text-lg text-gray-400">
          Crawls company pages for hiring nuance, extracts strict non-hallucinated requirements, checks
          coverage with a second-pass loop, and deterministically allocates your schedule.
        </p>

        {/* Quick Demo Pre-fill buttons */}
        <div className="flex items-center justify-center gap-2 pt-2 text-xs text-gray-400">
          <span>Quick load sample:</span>
          <button
            onClick={() => loadDemo('stripe')}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 transition-colors border border-white/10"
          >
            Senior Backend (Stripe)
          </button>
          <button
            onClick={() => loadDemo('vercel')}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 transition-colors border border-white/10"
          >
            Staff Frontend (Vercel)
          </button>
        </div>
      </section>

      {/* Main Generator Card */}
      <section className="max-w-4xl mx-auto glass-panel p-6 sm:p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="sm:col-span-2 space-y-2">
              <label className="block text-sm font-medium text-gray-200 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-accent-teal" />
                Company Website URL
              </label>
              <input
                type="url"
                required
                placeholder="https://example.com"
                value={companyUrl}
                onChange={e => setCompanyUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                The crawler will discover hiring process pages, about info, and engineering blogs.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary-400" />
                Days Before Interview ({days} {days === 1 ? 'day' : 'days'})
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={days}
                onChange={e => setDays(parseInt(e.target.value, 10))}
                className="w-full accent-primary-500 h-2 bg-white/10 rounded-lg cursor-pointer mt-3"
              />
              <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                <span>1 day (Sprint)</span>
                <span>5 days</span>
                <span>30 days</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent-cyan" />
                Job Description Text
              </label>
              <span className="text-xs text-gray-500">{jd.length} characters</span>
            </div>
            <textarea
              required
              rows={6}
              placeholder="Paste raw job description here... (e.g. Responsibilities, Requirements, Bonus points)"
              value={jd}
              onChange={e => setJd(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-sans text-sm leading-relaxed"
            />
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Generation Progress Steps (Section 12 requirement: clear loading states) */}
          {isGenerating && (
            <div className="p-5 rounded-xl bg-primary-950/40 border border-primary-500/20 space-y-3">
              <div className="flex items-center justify-between text-sm font-medium text-gray-200">
                <span className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 animate-spin text-accent-teal" />
                  Generating Preparation Kit...
                </span>
                <span className="font-mono text-xs text-accent-teal">{progressStep * 20}%</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 via-accent-teal to-accent-cyan transition-all duration-500"
                  style={{ width: `${progressStep * 20}%` }}
                />
              </div>
              <ul className="text-xs space-y-1.5 text-gray-400 pt-1 font-mono">
                <li className={progressStep >= 1 ? 'text-emerald-400 flex items-center gap-1.5' : 'text-gray-500'}>
                  {progressStep >= 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '○'} 1. Extracting requirements without fabrication
                </li>
                <li className={progressStep >= 2 ? 'text-emerald-400 flex items-center gap-1.5' : 'text-gray-500'}>
                  {progressStep >= 2 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '○'} 2. Crawling company site and ranking hiring pages
                </li>
                <li className={progressStep >= 3 ? 'text-emerald-400 flex items-center gap-1.5' : 'text-gray-500'}>
                  {progressStep >= 3 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '○'} 3. Generating category-specific question bank & flashcards
                </li>
                <li className={progressStep >= 4 ? 'text-emerald-400 flex items-center gap-1.5' : 'text-gray-500'}>
                  {progressStep >= 4 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '○'} 4. Running deterministic coverage check & second pass
                </li>
                <li className={progressStep >= 5 ? 'text-emerald-400 flex items-center gap-1.5' : 'text-gray-500'}>
                  {progressStep >= 5 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '○'} 5. Allocating arithmetic day-by-day schedule
                </li>
              </ul>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Batch Cases (Multi-Role JSON)
            </button>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-600 via-primary-500 to-accent-teal hover:from-primary-500 hover:to-accent-teal shadow-lg shadow-primary-500/25 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  Generating Kit...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Prep Kit
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Saved Kits Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Your Saved Preparation Kits</h2>
            <p className="text-xs text-gray-400">Click any kit to open the interactive Builder, Flashcards, or Schedule.</p>
          </div>
          <span className="text-xs font-mono text-gray-400 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
            {kits.length} {kits.length === 1 ? 'Kit' : 'Kits'}
          </span>
        </div>

        {isLoadingKits ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(n => (
              <div key={n} className="glass-panel p-6 rounded-2xl h-48 animate-pulse bg-white/5" />
            ))}
          </div>
        ) : kits.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border-dashed border-white/15 space-y-3">
            <FileText className="w-10 h-10 text-gray-500 mx-auto" />
            <p className="text-base font-medium text-gray-300">No interview prep kits created yet</p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Paste a job description above or choose one of our quick sample roles to generate your first kit.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kits.map(kit => (
              <div
                key={kit._id}
                onClick={() => router.push(`/kits/${kit._id}`)}
                className="glass-panel p-6 rounded-2xl hover:border-primary-500/50 hover:bg-cardHover transition-all cursor-pointer group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
                      {kit.source?.company || 'Company'}
                    </span>
                    <button
                      onClick={e => handleDelete(kit._id, e)}
                      className="text-gray-500 hover:text-rose-400 transition-colors p-1"
                      title="Delete kit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-bold text-lg text-white group-hover:text-primary-300 transition-colors line-clamp-1">
                    {kit.role?.title || 'Software Engineer'}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2">
                    {kit.company_brief?.summary || 'Comprehensive prep kit generated.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white/5 py-1.5 px-2 rounded-lg">
                    <span className="block font-bold text-white font-mono">
                      {kit.role?.requirements?.length || 0}
                    </span>
                    <span className="text-[10px] text-gray-400">Reqs</span>
                  </div>
                  <div className="bg-white/5 py-1.5 px-2 rounded-lg">
                    <span className="block font-bold text-white font-mono">
                      {kit.questions?.length || 0}
                    </span>
                    <span className="text-[10px] text-gray-400">Questions</span>
                  </div>
                  <div className="bg-white/5 py-1.5 px-2 rounded-lg">
                    <span className="block font-bold text-accent-teal font-mono">
                      {kit.schedule?.days_available || 5}d
                    </span>
                    <span className="text-[10px] text-gray-400">Plan</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-medium text-primary-400 group-hover:text-primary-300 pt-1">
                  <span>Open Kit Builder</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Batch Upload Modal (Section 2 & 9) */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl space-y-4 border border-white/20">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Upload Multi-Role Batch Cases</h3>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Paste an array of cases matching Appendix B: [{'{'} &quot;id&quot;: &quot;case-01&quot;, &quot;jd&quot;: &quot;...&quot;, &quot;company_url&quot;: &quot;...&quot;, &quot;days&quot;: 5 {'}'}].
            </p>
            <textarea
              rows={8}
              value={batchJson}
              onChange={e => setBatchJson(e.target.value)}
              placeholder="Paste JSON array here..."
              className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchSubmit}
                disabled={batchProcessing || !batchJson.trim()}
                className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 disabled:opacity-50"
              >
                {batchProcessing ? 'Processing...' : 'Run Batch Generation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
