'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Pin,
  Trash2,
  Plus,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Award,
  BookOpen,
  MessageSquare,
  Code,
  Download,
  Copy,
  Brain,
  ThumbsUp,
  HelpCircle,
  Play,
  Pause,
  X,
  Check,
  CheckSquare,
  Square,
  Zap,
  ListChecks,
  Shuffle,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import { api } from '@/lib/api';

export default function KitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const kitId = params.id as string;

  const [kit, setKit] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'builder' | 'schedule' | 'practice' | 'mock' | 'brief' | 'json'>('builder');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  // Practice Mode state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [practiceConfidence, setPracticeConfidence] = useState<Record<string, number>>({});
  const [showPracticeSummary, setShowPracticeSummary] = useState(false);

  // Mock Interview state
  const [selectedMockQuestionId, setSelectedMockQuestionId] = useState<string>('');
  const [mockAnswerText, setMockAnswerText] = useState('');
  const [mockEvaluating, setMockEvaluating] = useState(false);
  const [mockFeedback, setMockFeedback] = useState<any | null>(null);

  // Schedule interactive features & extras
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'remaining' | 'completed'>('all');
  const [selectedScheduleQuestion, setSelectedScheduleQuestion] = useState<any | null>(null);
  const [copiedQuestionNotice, setCopiedQuestionNotice] = useState<string | null>(null);
  const [activeTimerDay, setActiveTimerDay] = useState<number | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number>(25 * 60);
  const [isTimerActive, setIsTimerActive] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && kitId) {
      const saved = localStorage.getItem(`trao_schedule_completed_${kitId}`);
      if (saved) {
        try {
          setCompletedDays(JSON.parse(saved));
        } catch {}
      }
    }
  }, [kitId]);

  useEffect(() => {
    let interval: any = null;
    if (isTimerActive && timerRemaining > 0) {
      interval = setInterval(() => {
        setTimerRemaining(t => t - 1);
      }, 1000);
    } else if (timerRemaining === 0 && isTimerActive) {
      setIsTimerActive(false);
      alert(`🎉 Day ${activeTimerDay} study timer finished! Great focus session.`);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timerRemaining, activeTimerDay]);

  function toggleDayCompleted(dayNum: number, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setCompletedDays(prev => {
      const updated = prev.includes(dayNum) ? prev.filter(d => d !== dayNum) : [...prev, dayNum];
      if (typeof window !== 'undefined') {
        localStorage.setItem(`trao_schedule_completed_${kitId}`, JSON.stringify(updated));
      }
      return updated;
    });
  }

  function startStudyTimer(dayNum: number, mins = 25, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setActiveTimerDay(dayNum);
    setTimerRemaining(mins * 60);
    setIsTimerActive(true);
  }

  function jumpToMockFromSchedule(qid: string) {
    setSelectedScheduleQuestion(null);
    setSelectedMockQuestionId(qid);
    setActiveTab('mock');
  }

  function jumpToFlashcardFromSchedule(qid: string) {
    setSelectedScheduleQuestion(null);
    if (kit && kit.flashcards?.length > 0) {
      const idx = kit.flashcards.findIndex(
        (fc: any) => fc.id === qid || fc.question_id === qid
      );
      setCurrentCardIndex(idx >= 0 ? idx : 0);
      setIsFlipped(false);
    }
    setActiveTab('practice');
  }

  function jumpToBuilderFromSchedule(qid: string) {
    setSelectedScheduleQuestion(null);
    const q = kit?.questions?.find((x: any) => x.id === qid);
    if (q) {
      setSelectedCategory(q.category || 'all');
    }
    setActiveTab('builder');
  }

  function copyQuestionOutline(q: any) {
    const text = `Question: ${q.prompt}\nCategory: ${q.category} (Difficulty: ${q.difficulty}/3)\n\nExpected Answer Outline:\n${q.answer_outline}`;
    navigator.clipboard.writeText(text);
    setCopiedQuestionNotice(q.id);
    setTimeout(() => setCopiedQuestionNotice(null), 2500);
  }

  function exportScheduleAgenda() {
    if (!kit || !kit.schedule?.days) return;
    let md = `# Interview Prep Schedule - ${kit.role?.title || 'Software Engineer'} at ${kit.source?.company || 'Company'}\n`;
    md += `Generated: ${new Date().toLocaleDateString()} | Total Days: ${kit.schedule.days.length}\n\n`;

    kit.schedule.days.forEach((d: any) => {
      md += `## Day ${d.day}: ${d.focus} (${d.minutes} mins)\n`;
      if (d.question_ids?.length > 0) {
        d.question_ids.forEach((qid: string) => {
          const q = kit.questions.find((x: any) => x.id === qid);
          if (q) {
            md += `- [${q.id}] [${q.category.toUpperCase()}] ${q.prompt}\n`;
          }
        });
      }
      md += `\n`;
    });

    navigator.clipboard.writeText(md);
    alert('📋 Schedule copied to clipboard as Markdown agenda!');
  }

  useEffect(() => {
    loadKit();
  }, [kitId]);

  async function loadKit() {
    try {
      setIsLoading(true);
      const res = await api.getKit(kitId);
      if (res && res.kit) {
        setKit(res.kit);
        if (res.kit?.questions?.length > 0) {
          setSelectedMockQuestionId(res.kit.questions[0].id);
        }
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      console.warn('API getKit notice:', err.message);
    }

    // Safety fallback: Check local storage or generate immediate recovery kit
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('trao_client_kits');
        const kits = raw ? JSON.parse(raw) : [];
        const found = kits.find((k: any) => k._id === kitId);
        if (found) {
          setKit(found);
          if (found.questions?.length > 0) {
            setSelectedMockQuestionId(found.questions[0].id);
          }
          setIsLoading(false);
          return;
        }
      } catch {}
    }

    setIsLoading(false);
  }

  async function handleSaveKit(customKit?: any) {
    const toSave = customKit || kit;
    try {
      setIsSaving(true);
      const res = await api.updateKit(kitId, toSave);
      setKit(res.kit);
      setSaveNotification('Changes saved successfully!');
      setTimeout(() => setSaveNotification(null), 3000);
    } catch (err: any) {
      alert(`Failed to save kit: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  // --- The Builder Actions (Section 6) ---

  function updateQuestion(index: number, field: string, value: any) {
    if (!kit) return;
    const updatedQuestions = [...kit.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value,
      _origin: updatedQuestions[index]._origin === 'user_added' ? 'user_added' : 'user_edited',
    };
    setKit({ ...kit, questions: updatedQuestions });
  }

  function togglePinQuestion(index: number) {
    if (!kit) return;
    const updatedQuestions = [...kit.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      _isPinned: !updatedQuestions[index]._isPinned,
    };
    setKit({ ...kit, questions: updatedQuestions });
  }

  function moveQuestion(index: number, direction: 'up' | 'down') {
    if (!kit) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= kit.questions.length) return;

    const updatedQuestions = [...kit.questions];
    const temp = updatedQuestions[index];
    updatedQuestions[index] = updatedQuestions[targetIndex];
    updatedQuestions[targetIndex] = temp;

    setKit({ ...kit, questions: updatedQuestions });
  }

  function deleteQuestion(index: number) {
    if (!kit) return;
    if (confirm('Delete this question?')) {
      const updatedQuestions = kit.questions.filter((_: any, idx: number) => idx !== index);
      setKit({ ...kit, questions: updatedQuestions });
    }
  }

  function addCustomQuestion() {
    if (!kit) return;
    const newId = `q${kit.questions.length + 1}`;
    const newQuestion = {
      id: newId,
      requirement_ids: kit.role?.requirements?.length > 0 ? [kit.role.requirements[0].id] : ['r1'],
      category: selectedCategory === 'all' ? 'technical' : selectedCategory,
      prompt: 'New custom interview question prompt...',
      answer_outline: '1. Key concept\n2. Practical implementation\n3. Edge cases and trade-offs',
      difficulty: 2,
      _origin: 'user_added',
      _isPinned: true,
    };
    setKit({ ...kit, questions: [newQuestion, ...kit.questions] });
  }

  async function handleRegenerateCategory(cat: string) {
    if (!kit) return;
    if (!confirm(`Regenerate "${cat}" questions? Unedited generated questions will be refreshed, while your pinned and edited questions will be preserved.`)) {
      return;
    }

    try {
      setIsRegenerating(true);
      const res = await api.regenerateSection(kitId, { section: cat });
      setKit(res.kit);
      setSaveNotification(res.message);
      setTimeout(() => setSaveNotification(null), 4000);
    } catch (err: any) {
      alert(`Regeneration failed: ${err.message}`);
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleRegenerateSchedule(newDays?: number) {
    if (!kit) return;
    try {
      setIsRegenerating(true);
      const res = await api.regenerateSection(kitId, { section: 'schedule', days: newDays });
      setKit(res.kit);
    } catch (err: any) {
      alert(`Schedule update failed: ${err.message}`);
    } finally {
      setIsRegenerating(false);
    }
  }

  // --- Practice Mode Actions (Section 7) ---

  function recordConfidence(rating: number) {
    if (!kit || !kit.flashcards || kit.flashcards.length === 0) return;
    const currentCard = kit.flashcards[currentCardIndex];
    setPracticeConfidence(prev => ({ ...prev, [currentCard.id]: rating }));
    api.recordCardConfidence(kitId, currentCard.id, rating).catch(() => {});

    // Advance to next card or trigger completion summary
    if (currentCardIndex < kit.flashcards.length - 1) {
      setIsFlipped(false);
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setShowPracticeSummary(true);
    }
  }

  function restartPractice() {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowPracticeSummary(false);
  }

  function resetAllPracticeRatings() {
    if (confirm('Reset all ratings and restart practice session?')) {
      setPracticeConfidence({});
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setShowPracticeSummary(false);
      setSaveNotification('Ratings cleared! Start fresh.');
      setTimeout(() => setSaveNotification(null), 2500);
    }
  }

  function shuffleFlashcards() {
    if (!kit || !kit.flashcards) return;
    const shuffled = [...kit.flashcards].sort(() => Math.random() - 0.5);
    setKit({ ...kit, flashcards: shuffled });
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowPracticeSummary(false);
    setSaveNotification('Flashcards shuffled!');
    setTimeout(() => setSaveNotification(null), 2500);
  }

  function reorderByWeakest() {
    if (!kit || !kit.flashcards) return;
    const sorted = [...kit.flashcards].sort((a, b) => {
      const confA = practiceConfidence[a.id] || 0;
      const confB = practiceConfidence[b.id] || 0;
      return confA - confB; // lowest confidence first
    });
    setKit({ ...kit, flashcards: sorted });
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowPracticeSummary(false);
    setSaveNotification('Flashcards reordered: lowest confidence cards first!');
    setTimeout(() => setSaveNotification(null), 3000);
  }

  // --- Mock Interview Action (Creative Feature) ---

  async function handleEvaluateMock() {
    if (!mockAnswerText.trim() || !selectedMockQuestionId || !kit) return;
    const q = kit.questions.find((x: any) => x.id === selectedMockQuestionId);
    if (!q) return;

    try {
      setMockEvaluating(true);
      setMockFeedback(null);
      const res = await api.evaluateMockAnswer({
        questionPrompt: q.prompt,
        answerOutline: q.answer_outline,
        candidateAnswer: mockAnswerText,
      });
      setMockFeedback(res);
    } catch (err: any) {
      alert(`Mock evaluation error: ${err.message}`);
    } finally {
      setMockEvaluating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-4">
        <RotateCcw className="w-8 h-8 animate-spin text-accent-teal mx-auto" />
        <p className="text-gray-400 font-mono text-sm">Loading interview prep kit...</p>
      </div>
    );
  }

  if (!kit) {
    return (
      <div className="py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Kit not found</h2>
        <Link href="/#my-kits-section" className="inline-flex items-center gap-2 text-sm text-primary-400 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Return to My Kits
        </Link>
      </div>
    );
  }

  const filteredQuestions = kit.questions.filter((q: any) => {
    if (selectedCategory === 'all') return true;
    return q.category === selectedCategory;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Top Breadcrumb & Metadata Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <Link href="/#my-kits-section" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Kits
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{kit.role?.title || 'Software Role'}</h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent-teal/10 text-accent-teal border border-accent-teal/20">
              {kit.source?.company || 'Company'}
            </span>
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-4 pt-1 font-mono">
            <span>Researched: {new Date(kit.source?.researched_at || '').toLocaleDateString()}</span>
            <span>&bull;</span>
            <span className="text-accent-cyan">{kit.schedule?.days_available} Days Plan</span>
            <span>&bull;</span>
            <span className="text-emerald-400">{kit.coverage?.passes || 1} Pass Coverage Verified</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveNotification && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" /> {saveNotification}
            </span>
          )}
          <button
            onClick={() => handleSaveKit()}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-md shadow-primary-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('builder')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'builder'
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          The Builder ({kit.questions?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'schedule'
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Study Schedule ({kit.schedule?.days_available}d)
        </button>
        <button
          onClick={() => setActiveTab('practice')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'practice'
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Practice Mode ({kit.flashcards?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('mock')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'mock'
              ? 'bg-gradient-to-r from-accent-teal to-accent-cyan text-black font-bold shadow-md'
              : 'text-accent-teal hover:bg-accent-teal/10'
          }`}
        >
          <Brain className="w-4 h-4" />
          AI Mock Interviewer
        </button>
        <button
          onClick={() => setActiveTab('brief')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'brief'
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Company & Role
        </button>
        <button
          onClick={() => setActiveTab('json')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'json'
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Code className="w-4 h-4" />
          Appendix A JSON
        </button>
      </div>

      {/* TAB 1: THE BUILDER (Section 6) */}
      {activeTab === 'builder' && (
        <div className="space-y-6">
          {/* Builder Controls Bar */}
          <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              {['all', 'technical', 'behavioural', 'system-design', 'company-fit'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    selectedCategory === cat
                      ? 'bg-white/20 text-white font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {cat.replace('-', ' ')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {selectedCategory !== 'all' && (
                <button
                  onClick={() => handleRegenerateCategory(selectedCategory)}
                  disabled={isRegenerating}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-accent-teal bg-accent-teal/10 hover:bg-accent-teal/20 border border-accent-teal/20 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Regenerates only unedited questions in this category, preserving all user-edited and pinned questions"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                  Regenerate Category
                </button>
              )}
              <button
                onClick={addCustomQuestion}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 flex items-center gap-1.5 shadow"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>
          </div>

          {/* Notice explaining state preservation model */}
          <div className="text-[11px] text-gray-400 bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 flex items-center justify-between">
            <span>
              💡 <strong>State Preservation Matrix:</strong> Pinned items and manually edited prompts survive category regeneration.
            </span>
            <span className="font-mono text-gray-500">
              Showing {filteredQuestions.length} of {kit.questions.length} questions
            </span>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {filteredQuestions.map((q: any, index: number) => {
              const realIndex = kit.questions.findIndex((orig: any) => orig.id === q.id);
              const isEdited = q._origin === 'user_edited';
              const isAdded = q._origin === 'user_added';
              const isPinned = !!q._isPinned;

              return (
                <div
                  key={q.id}
                  className={`glass-panel p-5 rounded-xl border transition-all space-y-4 ${
                    isPinned ? 'border-amber-500/40 bg-amber-950/10' : 'hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                        {q.id}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize bg-primary-500/10 text-primary-300 border border-primary-500/20">
                        {q.category}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          q.difficulty === 3
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : q.difficulty === 2
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        Difficulty {q.difficulty}
                      </span>

                      {/* State provenance badges */}
                      {isPinned && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                      {isEdited && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          Edited
                        </span>
                      )}
                      {isAdded && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                          Custom
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => togglePinQuestion(realIndex)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isPinned ? 'text-amber-400 bg-amber-500/20' : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                        title={isPinned ? 'Unpin question' : 'Pin question (protects from regeneration)'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveQuestion(realIndex, 'up')}
                        disabled={realIndex === 0}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30"
                        title="Move up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveQuestion(realIndex, 'down')}
                        disabled={realIndex === kit.questions.length - 1}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30"
                        title="Move down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteQuestion(realIndex)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10"
                        title="Delete question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Editable Question Prompt */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-gray-400">Interview Question Prompt</label>
                    <textarea
                      rows={2}
                      value={q.prompt}
                      onChange={e => updateQuestion(realIndex, 'prompt', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white font-medium text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  {/* Inline Editable Answer Outline */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-gray-400">Expected Answer Outline & Key Points</label>
                    <textarea
                      rows={3}
                      value={q.answer_outline}
                      onChange={e => updateQuestion(realIndex, 'answer_outline', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-gray-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 leading-relaxed"
                    />
                  </div>

                  {/* Requirement Tags */}
                  <div className="flex items-center gap-2 pt-1 text-xs text-gray-400">
                    <span className="text-[11px]">Covers Requirements:</span>
                    {q.requirement_ids?.map((rid: string) => {
                      const matchingReq = kit.role?.requirements?.find((r: any) => r.id === rid);
                      return (
                        <span key={rid} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[11px] text-primary-300" title={matchingReq?.text}>
                          {rid}: {matchingReq?.text?.slice(0, 30) || 'Requirement'}...
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: STUDY SCHEDULE (Section 8) */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Schedule Header Card */}
          <div className="glass-panel p-6 rounded-2xl space-y-5 border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent-teal" />
                  Deterministic Preparation Schedule
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Every must-have requirement is allocated. Harder topics front-loaded on earlier days. Click any question to inspect details or practice.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={exportScheduleAgenda}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-colors"
                  title="Copy formatted schedule to clipboard"
                >
                  <Copy className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>Copy Agenda</span>
                </button>
                <span className="text-xs font-mono text-accent-teal font-semibold px-2.5 py-1 rounded-lg bg-accent-teal/10 border border-accent-teal/20">
                  {kit.schedule?.days?.length || 0} Total Days
                </span>
                <button
                  onClick={() => handleRegenerateSchedule()}
                  disabled={isRegenerating}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                  <span>Re-allocate</span>
                </button>
              </div>
            </div>

            {/* Completion Progress & Filter Controls */}
            <div className="pt-3 border-t border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Study Progress:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {completedDays.length} of {kit.schedule?.days?.length || 0} Days Completed
                  </span>
                  <span className="text-gray-400">
                    ({kit.schedule?.days?.length ? Math.round((completedDays.length / kit.schedule.days.length) * 100) : 0}%)
                  </span>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setScheduleFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      scheduleFilter === 'all'
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    All Days ({kit.schedule?.days?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleFilter('remaining')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      scheduleFilter === 'remaining'
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Remaining ({(kit.schedule?.days?.length || 0) - completedDays.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleFilter('completed')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      scheduleFilter === 'completed'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Completed ({completedDays.length})
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{
                    width: `${
                      kit.schedule?.days?.length
                        ? (completedDays.length / kit.schedule.days.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Adjust Days Slider */}
            <div className="pt-2 border-t border-white/10 flex items-center gap-4">
              <span className="text-xs text-gray-300 whitespace-nowrap">
                Adjust Days Plan ({kit.schedule?.days_available || 5}d):
              </span>
              <input
                type="range"
                min="1"
                max="30"
                value={kit.schedule?.days_available || 5}
                onChange={e => handleRegenerateSchedule(parseInt(e.target.value, 10))}
                className="w-full accent-primary-500 h-2 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Active Study Timer Bar (When timer is running) */}
          {activeTimerDay !== null && (
            <div className="glass-panel p-4 rounded-2xl border-2 border-accent-teal/50 bg-accent-teal/10 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-teal/20 text-accent-teal flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Day {activeTimerDay} Study Session in Progress
                  </h4>
                  <p className="text-xs text-gray-300">
                    {kit.schedule?.days?.find((d: any) => d.day === activeTimerDay)?.focus}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono text-3xl font-extrabold tracking-widest text-white">
                  {Math.floor(timerRemaining / 60)}:
                  {timerRemaining % 60 < 10 ? `0${timerRemaining % 60}` : timerRemaining % 60}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTimerActive(!isTimerActive)}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title={isTimerActive ? 'Pause timer' : 'Resume timer'}
                  >
                    {isTimerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimerRemaining(25 * 60)}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Reset timer to 25 mins"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleDayCompleted(activeTimerDay)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Day Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTimerActive(false);
                      setActiveTimerDay(null);
                    }}
                    className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
                    title="Close study timer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Day Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kit.schedule?.days
              ?.filter((d: any) => {
                const isDone = completedDays.includes(d.day);
                if (scheduleFilter === 'completed') return isDone;
                if (scheduleFilter === 'remaining') return !isDone;
                return true;
              })
              .map((d: any) => {
                const isDone = completedDays.includes(d.day);
                const isTimerOnThisDay = activeTimerDay === d.day;

                return (
                  <div
                    key={d.day}
                    className={`glass-panel p-6 rounded-2xl border transition-all space-y-4 flex flex-col justify-between shadow-lg ${
                      isDone
                        ? 'border-emerald-500/40 bg-emerald-950/15'
                        : isTimerOnThisDay
                        ? 'border-accent-teal ring-2 ring-accent-teal/30'
                        : 'hover:border-primary-500/40'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Header with Mark Done Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                              isDone
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-primary-500/20 text-primary-300'
                            }`}
                          >
                            DAY {d.day}
                          </span>
                          <button
                            type="button"
                            onClick={e => toggleDayCompleted(d.day, e)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                              isDone
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10'
                            }`}
                          >
                            {isDone ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Completed</span>
                              </>
                            ) : (
                              <>
                                <Square className="w-3 h-3" />
                                <span>Mark Done</span>
                              </>
                            )}
                          </button>
                        </div>

                        <span className="text-xs font-mono text-gray-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-accent-teal" /> {d.minutes} mins
                        </span>
                      </div>

                      <h4
                        className={`font-bold text-base line-clamp-2 ${
                          isDone ? 'text-gray-300 line-through opacity-85' : 'text-white'
                        }`}
                      >
                        {d.focus}
                      </h4>
                    </div>

                    {/* Assigned Questions (Clickable List) */}
                    <div className="space-y-2 pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">
                          Assigned Questions ({d.question_ids?.length || 0}):
                        </span>
                        <span className="text-[10px] text-accent-teal/80">Click card to open</span>
                      </div>

                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {d.question_ids?.map((qid: string) => {
                          const q = kit.questions.find((x: any) => x.id === qid);
                          return (
                            <div
                              key={qid}
                              onClick={() => setSelectedScheduleQuestion(q)}
                              className="p-2.5 rounded-xl bg-black/50 border border-white/10 hover:border-primary-500/60 hover:bg-white/10 transition-all cursor-pointer group shadow-sm flex flex-col justify-between space-y-1.5"
                              title="Click to inspect question outline & practice"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[11px] text-accent-teal font-bold group-hover:underline">
                                    {qid}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300 capitalize font-medium">
                                    {q?.category || 'tech'}
                                  </span>
                                  <span className="text-[10px] text-amber-400" title={`Difficulty ${q?.difficulty || 1}/3`}>
                                    {'⭐'.repeat(q?.difficulty || 1)}
                                  </span>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-primary-300 transition-colors" />
                              </div>

                              <p className="line-clamp-2 text-gray-200 text-xs font-medium group-hover:text-white leading-relaxed">
                                {q?.prompt || 'Question prompt'}
                              </p>

                              <div className="flex items-center justify-between pt-1 text-[10px] text-gray-500 group-hover:text-primary-300 font-medium">
                                <span>Covers: {q?.requirement_ids?.join(', ') || 'General'}</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                  Inspect & Practise →
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Day Action Buttons */}
                    <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={e => startStudyTimer(d.day, d.minutes || 25, e)}
                        className="flex-1 py-2 px-2.5 rounded-xl text-xs font-medium text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 text-accent-teal" />
                        <span>Start Session</span>
                      </button>

                      {d.question_ids?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => jumpToMockFromSchedule(d.question_ids[0])}
                          className="flex-1 py-2 px-2.5 rounded-xl text-xs font-medium text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/20 transition-colors flex items-center justify-center gap-1.5"
                          title="Launch AI Mock Interview for this day's questions"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-primary-400" />
                          <span>Mock Interview</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Interactive Question Detail & Practice Modal */}
          {selectedScheduleQuestion && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="glass-panel w-full max-w-2xl p-6 sm:p-8 rounded-3xl border border-white/20 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedScheduleQuestion(null)}
                  className="absolute top-5 right-5 text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Modal Header */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-accent-teal/10 text-accent-teal border border-accent-teal/20">
                      {selectedScheduleQuestion.id}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-primary-500/10 text-primary-300 border border-primary-500/20 capitalize font-medium">
                      {selectedScheduleQuestion.category} Question
                    </span>
                    <span className="text-xs text-amber-400 font-medium px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      {'⭐'.repeat(selectedScheduleQuestion.difficulty || 1)} Difficulty {selectedScheduleQuestion.difficulty}/3
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-white leading-snug">
                    {selectedScheduleQuestion.prompt}
                  </h3>
                </div>

                {/* Requirements Covered */}
                {selectedScheduleQuestion.requirement_ids?.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                      Assigned Job Description Requirements:
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedScheduleQuestion.requirement_ids.map((rid: string) => {
                        const req = kit.role?.requirements?.find((r: any) => r.id === rid);
                        return (
                          <div
                            key={rid}
                            className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-gray-300 font-mono"
                          >
                            <span className="text-accent-teal font-bold">{rid}:</span> {req?.text || 'Requirement'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Expected Answer Outline & Talking Points */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Expected Answer Outline & Key Points
                    </h4>
                    <button
                      type="button"
                      onClick={() => copyQuestionOutline(selectedScheduleQuestion)}
                      className="text-xs text-accent-teal hover:underline flex items-center gap-1 font-mono"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedQuestionNotice === selectedScheduleQuestion.id ? 'Copied! ✓' : 'Copy Outline'}
                    </button>
                  </div>
                  <div className="p-4 rounded-xl bg-black/60 border border-white/15 text-gray-200 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                    {selectedScheduleQuestion.answer_outline || 'No outline provided.'}
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => jumpToMockFromSchedule(selectedScheduleQuestion.id)}
                    className="py-3 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-primary-600 via-primary-500 to-accent-teal hover:opacity-95 shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Practise with AI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => jumpToFlashcardFromSchedule(selectedScheduleQuestion.id)}
                    className="py-3 px-4 rounded-xl text-xs font-semibold text-accent-teal bg-accent-teal/10 hover:bg-accent-teal/20 border border-accent-teal/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Brain className="w-4 h-4" />
                    <span>Study Flashcard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => jumpToBuilderFromSchedule(selectedScheduleQuestion.id)}
                    className="py-3 px-4 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Edit in Builder</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRACTICE MODE (Section 7) */}
      {activeTab === 'practice' && (() => {
        const totalCards = kit.flashcards?.length || 0;
        const ratedCount = Object.keys(practiceConfidence).length;
        const masteredCount = Object.values(practiceConfidence).filter((v: any) => v === 3).length;
        const gettingThereCount = Object.values(practiceConfidence).filter((v: any) => v === 2).length;
        const needsWorkCount = Object.values(practiceConfidence).filter((v: any) => v === 1).length;
        const masteryPercentage = totalCards > 0
          ? Math.round(((masteredCount * 3 + gettingThereCount * 2 + needsWorkCount * 1) / (totalCards * 3)) * 100)
          : 0;

        return (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-accent-teal" />
                  Active Recall Flashcards
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Step through cards, test your knowledge, and rate confidence to build permanent recall.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={reorderByWeakest}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors flex items-center gap-1.5"
                  title="Show cards rated 'Needs Work' first"
                >
                  <span>Weakest First</span>
                </button>

                <button
                  type="button"
                  onClick={shuffleFlashcards}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5"
                  title="Randomize card order"
                >
                  <Shuffle className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>Shuffle</span>
                </button>

                <button
                  type="button"
                  onClick={restartPractice}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5"
                  title="Restart from Card 1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart</span>
                </button>

                {ratedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPracticeSummary(!showPracticeSummary)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors flex items-center gap-1.5"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>{showPracticeSummary ? 'Back to Cards' : 'Summary'}</span>
                  </button>
                )}
              </div>
            </div>

            {totalCards > 0 ? (
              showPracticeSummary ? (
                /* ================= SESSION COMPLETION SUMMARY VIEW ================= */
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/30 space-y-6 shadow-2xl animate-fade-in">
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                      <Trophy className="w-8 h-8 text-amber-400 animate-bounce" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-white">
                      Flashcard Session Completed!
                    </h3>
                    <p className="text-xs text-gray-400 max-w-md mx-auto">
                      You have reviewed and rated all <span className="text-white font-bold">{totalCards}</span> flashcards for this role.
                    </p>
                  </div>

                  {/* Mastery Breakdown Stats */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-1">
                      <span className="text-2xl font-black text-emerald-400 font-mono">{masteredCount}</span>
                      <span className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Mastered</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 space-y-1">
                      <span className="text-2xl font-black text-amber-400 font-mono">{gettingThereCount}</span>
                      <span className="block text-[11px] font-bold text-amber-300 uppercase tracking-wider">Getting There</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-1">
                      <span className="text-2xl font-black text-rose-400 font-mono">{needsWorkCount}</span>
                      <span className="block text-[11px] font-bold text-rose-300 uppercase tracking-wider">Needs Work</span>
                    </div>
                  </div>

                  {/* Mastery Percentage Progress Bar */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-300 font-medium">Role Knowledge Mastery Index</span>
                      <span className="font-mono text-accent-teal font-bold text-sm">{masteryPercentage}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-accent-cyan transition-all duration-700"
                        style={{ width: `${masteryPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Card-by-Card Performance List */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">
                      Card Confidence Ratings (Click any card to jump back to it):
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {kit.flashcards.map((fc: any, idx: number) => {
                        const conf = practiceConfidence[fc.id];
                        return (
                          <div
                            key={fc.id}
                            onClick={() => {
                              setCurrentCardIndex(idx);
                              setIsFlipped(false);
                              setShowPracticeSummary(false);
                            }}
                            className="p-2.5 rounded-xl bg-black/50 border border-white/10 hover:border-primary-500/50 hover:bg-white/5 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="font-mono text-accent-teal font-bold">{fc.id}</span>
                              <span className="text-gray-300 truncate max-w-xs">{fc.front}</span>
                            </div>
                            <div>
                              {conf === 3 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Mastered
                                </span>
                              ) : conf === 2 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Getting There
                                </span>
                              ) : conf === 1 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  Needs Work
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-500">Unrated</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recommended Next Actions */}
                  <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={restartPractice}
                      className="py-3 px-4 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Review Cards Again</span>
                    </button>

                    <button
                      type="button"
                      onClick={reorderByWeakest}
                      className="py-3 px-4 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      <span>Drill Weakest Cards</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('mock')}
                      className="py-3 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-accent-teal to-accent-cyan hover:opacity-95 text-black font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Take AI Mock Interview</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('schedule')}
                      className="py-3 px-4 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      <Calendar className="w-4 h-4 text-accent-teal" />
                      <span>Check Study Schedule</span>
                    </button>
                  </div>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={resetAllPracticeRatings}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Reset All Ratings & Start Fresh
                    </button>
                  </div>
                </div>
              ) : (
                /* ================= ACTIVE FLASHCARD VIEW ================= */
                <div className="space-y-6">
                  {/* All Cards Rated Banner Alert */}
                  {ratedCount === totalCards && (
                    <div
                      onClick={() => setShowPracticeSummary(true)}
                      className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/40 to-primary-950/40 border border-emerald-500/40 flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-all group shadow-md"
                    >
                      <div className="flex items-center gap-2.5 text-xs text-emerald-300 font-medium">
                        <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />
                        <span>All {totalCards} cards rated! Click to view your complete mastery debrief & options.</span>
                      </div>
                      <span className="text-xs text-accent-teal font-semibold group-hover:underline flex items-center gap-1">
                        View Summary &rarr;
                      </span>
                    </div>
                  )}

                  {/* Progress Counter & Stats */}
                  <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <span className="font-bold text-white">Card {currentCardIndex + 1}</span> of {totalCards}
                    </span>
                    <span className="text-accent-teal">
                      {ratedCount} of {totalCards} Rated ({masteryPercentage}% Mastery)
                    </span>
                  </div>

                  {/* 3D Flip Flashcard */}
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="cursor-pointer min-h-[300px] p-8 glass-panel rounded-3xl border-2 hover:border-primary-500/50 transition-all flex flex-col justify-between shadow-2xl relative select-none"
                  >
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="font-mono font-bold text-accent-teal">
                        {kit.flashcards[currentCardIndex]?.id}
                      </span>
                      <div className="flex items-center gap-2">
                        {practiceConfidence[kit.flashcards[currentCardIndex]?.id] && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-mono">
                            Rating: {practiceConfidence[kit.flashcards[currentCardIndex]?.id]}/3
                          </span>
                        )}
                        <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded">
                          {isFlipped ? 'ANSWER OUTLINE (Click to flip)' : 'QUESTION PROMPT (Click to reveal answer)'}
                        </span>
                      </div>
                    </div>

                    <div className="my-auto py-6 text-center">
                      {isFlipped ? (
                        <div className="text-left space-y-3 font-mono text-sm text-gray-200 leading-relaxed whitespace-pre-line">
                          {kit.flashcards[currentCardIndex]?.back}
                        </div>
                      ) : (
                        <p className="text-xl sm:text-2xl font-bold text-white leading-snug">
                          {kit.flashcards[currentCardIndex]?.front}
                        </p>
                      )}
                    </div>

                    <div className="text-center text-[11px] text-gray-500 font-mono">
                      Press card to {isFlipped ? 'hide answer' : 'reveal answer'}
                    </div>
                  </div>

                  {/* Confidence Rating Buttons */}
                  <div className="space-y-2">
                    <span className="text-xs text-gray-400 block text-center font-medium">How well did you know this?</span>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => recordConfidence(1)}
                        className={`py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                          practiceConfidence[kit.flashcards[currentCardIndex]?.id] === 1
                            ? 'bg-rose-500 text-white ring-2 ring-rose-400'
                            : 'text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20'
                        }`}
                      >
                        1. Needs Work
                      </button>
                      <button
                        type="button"
                        onClick={() => recordConfidence(2)}
                        className={`py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                          practiceConfidence[kit.flashcards[currentCardIndex]?.id] === 2
                            ? 'bg-amber-500 text-black ring-2 ring-amber-400'
                            : 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20'
                        }`}
                      >
                        2. Getting There
                      </button>
                      <button
                        type="button"
                        onClick={() => recordConfidence(3)}
                        className={`py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                          practiceConfidence[kit.flashcards[currentCardIndex]?.id] === 3
                            ? 'bg-emerald-500 text-white ring-2 ring-emerald-400'
                            : 'text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20'
                        }`}
                      >
                        3. Mastered
                      </button>
                    </div>
                  </div>

                  {/* Card Navigation */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (currentCardIndex > 0) {
                          setIsFlipped(false);
                          setCurrentCardIndex(prev => prev - 1);
                        }
                      }}
                      disabled={currentCardIndex === 0}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/5 disabled:opacity-30 flex items-center gap-1"
                    >
                      &larr; Previous Card
                    </button>

                    {currentCardIndex === totalCards - 1 ? (
                      <button
                        type="button"
                        onClick={() => setShowPracticeSummary(true)}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                      >
                        <span>View Session Summary</span>
                        <Trophy className="w-3.5 h-3.5 text-amber-300" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (currentCardIndex < totalCards - 1) {
                            setIsFlipped(false);
                            setCurrentCardIndex(prev => prev + 1);
                          }
                        }}
                        className="px-4 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/5 flex items-center gap-1"
                      >
                        Next Card &rarr;
                      </button>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="p-12 text-center text-gray-400 glass-panel rounded-2xl">
                No flashcards generated for this kit.
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB 4: CREATIVE FEATURE - AI MOCK INTERVIEW SIMULATOR */}
      {activeTab === 'mock' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="glass-panel p-6 rounded-2xl space-y-2 border border-accent-teal/30">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-teal/10 text-accent-teal border border-accent-teal/20">
              <Sparkles className="w-3.5 h-3.5" />
              Interactive Mock Simulation Engine
            </div>
            <h3 className="text-xl font-bold text-white">Practice Live Answering & Receive Rubric Grading</h3>
            <p className="text-xs text-gray-400">
              Select any question from your kit, type or speak your response, and our AI hiring manager will score it (1-5), identify strengths, and pinpoint missed elements against the answer outline.
            </p>
          </div>

          <div className="space-y-4 glass-panel p-6 rounded-2xl">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 block">Choose Question to Simulate</label>
              <select
                value={selectedMockQuestionId}
                onChange={e => setSelectedMockQuestionId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {kit.questions.map((q: any) => (
                  <option key={q.id} value={q.id}>
                    [{q.id}] ({q.category}) {q.prompt.slice(0, 80)}...
                  </option>
                ))}
              </select>
            </div>

            {selectedMockQuestionId && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <span className="text-[11px] font-semibold text-accent-teal uppercase tracking-wider block">Question Prompt</span>
                <p className="text-sm font-medium text-white">
                  {kit.questions.find((q: any) => q.id === selectedMockQuestionId)?.prompt}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 block">Your Answer</label>
              <textarea
                rows={6}
                value={mockAnswerText}
                onChange={e => setMockAnswerText(e.target.value)}
                placeholder="Structure your response (Situation, Task, Action, Result, or architectural trade-offs)..."
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-sans leading-relaxed"
              />
            </div>

            <button
              onClick={handleEvaluateMock}
              disabled={mockEvaluating || !mockAnswerText.trim()}
              className="w-full py-3.5 rounded-xl font-semibold text-black bg-gradient-to-r from-accent-teal to-accent-cyan hover:opacity-95 shadow-lg shadow-accent-teal/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {mockEvaluating ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  Grading Your Answer...
                </>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  Evaluate My Answer
                </>
              )}
            </button>
          </div>

          {/* Feedback Section */}
          {mockFeedback && (
            <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 space-y-5 animate-fade-in">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h4 className="font-bold text-lg text-white">AI Interview Debrief</h4>
                  <p className="text-xs text-gray-400">Scored against candidate answer rubric</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-accent-teal font-mono">
                    {mockFeedback.score} <span className="text-lg text-gray-500 font-normal">/ 5</span>
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <ThumbsUp className="w-4 h-4" /> Strong Elements
                </span>
                <ul className="text-xs text-gray-300 space-y-1 pl-4 list-disc">
                  {mockFeedback.strengths?.map((s: string, idx: number) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <HelpCircle className="w-4 h-4" /> Missed Nuances / Opportunities
                </span>
                <ul className="text-xs text-gray-300 space-y-1 pl-4 list-disc">
                  {mockFeedback.missingElements?.map((m: string, idx: number) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-200 leading-relaxed">
                <span className="font-bold text-white block mb-1">Coaching Advice:</span>
                {mockFeedback.feedback}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: COMPANY BRIEF & ROLE */}
      {activeTab === 'brief' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-accent-teal" /> Company Intelligence Brief
            </h3>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Executive Summary</label>
              <textarea
                rows={3}
                value={kit.company_brief?.summary || ''}
                onChange={e =>
                  setKit({
                    ...kit,
                    company_brief: { ...kit.company_brief, summary: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">What They Do & Platform Focus</label>
              <textarea
                rows={4}
                value={kit.company_brief?.what_they_do || ''}
                onChange={e =>
                  setKit({
                    ...kit,
                    company_brief: { ...kit.company_brief, what_they_do: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:outline-none"
              />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-400 block mb-1">Crawled Sources</span>
              <div className="flex flex-wrap gap-2">
                {kit.company_brief?.sources?.map((src: string, idx: number) => (
                  <a
                    key={idx}
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-accent-cyan hover:underline bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1"
                  >
                    {src} <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-primary-400" /> Extracted Role Requirements
            </h3>
            <div className="space-y-3">
              {kit.role?.requirements?.map((r: any) => (
                <div key={r.id} className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-accent-teal bg-white/5 px-2 py-0.5 rounded">
                      {r.id}
                    </span>
                    <span className="text-sm text-gray-200">{r.text}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/10 text-gray-300 uppercase">
                      {r.kind}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        r.priority === 'must'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-white/10 text-gray-400'
                      }`}
                    >
                      {r.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: APPENDIX A RAW JSON */}
      {activeTab === 'json' && (
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Appendix A Kit JSON Export</h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(kit, null, 2));
                alert('Copied Appendix A JSON to clipboard!');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" /> Copy JSON
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-black/80 border border-white/15 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[600px]">
            {JSON.stringify(kit, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
