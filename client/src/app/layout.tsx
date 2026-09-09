import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import Header from '@/components/Header';
import AuthModal from '@/components/AuthModal';

export const metadata: Metadata = {
  title: 'AI Interview Prep Kit | Autonomous Interview Preparation Platform',
  description: 'Transform any job description and company URL into an actionable interview preparation kit with company research, question banks, 3D flashcards, and AI mock interviewer.',
  openGraph: {
    title: 'AI Interview Prep Kit | Autonomous Interview Preparation Platform',
    description: 'Transform any job description and company URL into an actionable interview preparation kit with company research, question banks, 3D flashcards, and AI mock interviewer.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col antialiased">
        <AuthProvider>
          <Header />
          <AuthModal />
          {/* Main Content */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-white/10 bg-background/40 py-6 text-center text-xs text-gray-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p>AI Interview Prep Kit &bull; Autonomous Engineering Career Engine</p>
              <p className="font-mono text-gray-400">Deterministic Schedule &bull; 3D Flashcards &bull; AI Mock Interviewer</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
