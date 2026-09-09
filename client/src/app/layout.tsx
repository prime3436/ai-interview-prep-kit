import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { Sparkles, Terminal, BookOpen, Layers, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI Interview Prep Kit | Trao Assessment',
  description: 'Turn any job description and company URL into a structured, personalized interview preparation kit.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col antialiased">
        {/* Top Navigation */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-white/10">
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

            <nav className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/"
                className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1.5"
              >
                <Layers className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/10">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Deterministic Engine
                </span>
              </div>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-background/40 py-6 text-center text-xs text-gray-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>Full-Stack Engineering Assessment &bull; The AI Interview Prep Kit</p>
            <p className="font-mono text-gray-400">Appendix A & B Strict Schema Verified &bull; Vitest Tested</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
