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

  // Mock Interview state
  const [selectedMockQuestionId, setSelectedMockQuestionId] = useState<string>('');
  const [mockAnswerText, setMockAnswerText] = useState('');
  const [mockEvaluating, setMockEvaluating] = useState(false);
  const [mockFeedback, setMockFeedback] = useState<any | null>(null);

  useEffect(() => {
    loadKit();
  }, [kitId]);

  async function loadKit() {
    try {
      setIsLoading(true);
      const res = await api.getKit(kitId);
      setKit(res.kit);
      if (res.kit?.questions?.length > 0) {
        setSelectedMockQuestionId(res.kit.questions[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load kit:', err);
    } finally {
      setIsLoading(false);
    }
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

    // Advance to next card
    if (currentCardIndex < kit.flashcards.length - 1) {
      setIsFlipped(false);
      setCurrentCardIndex(prev => prev + 1);
    }
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
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-primary-400 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Return to Dashboard
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
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
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
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Deterministic Preparation Schedule</h3>
                <p className="text-xs text-gray-400">
                  Every must-have requirement is allocated. Harder topics front-loaded on earlier days.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-accent-teal font-semibold">
                  {kit.schedule?.days?.length || 0} Total Days
                </span>
                <button
                  onClick={() => handleRegenerateSchedule()}
                  disabled={isRegenerating}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Re-allocate
                </button>
              </div>
            </div>

            {/* Adjust Days Slider */}
            <div className="pt-2 border-t border-white/10 flex items-center gap-4">
              <span className="text-xs text-gray-300 whitespace-nowrap">Adjust Days ({kit.schedule?.days_available}d):</span>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kit.schedule?.days?.map((d: any) => (
              <div key={d.day} className="glass-panel p-6 rounded-2xl border hover:border-primary-500/30 transition-all space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-500/20 text-primary-300 font-mono">
                      DAY {d.day}
                    </span>
                    <span className="text-xs font-mono text-gray-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-accent-teal" /> {d.minutes} mins
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-white line-clamp-2">{d.focus}</h4>
                </div>

                <div className="space-y-2 pt-3 border-t border-white/10">
                  <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">
                    Assigned Questions ({d.question_ids?.length || 0}):
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {d.question_ids?.map((qid: string) => {
                      const q = kit.questions.find((x: any) => x.id === qid);
                      return (
                        <div key={qid} className="p-2 rounded-lg bg-black/40 border border-white/5 text-xs text-gray-300 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] text-accent-teal font-bold">{qid}</span>
                            <span className="text-[10px] text-gray-500 capitalize">{q?.category || 'tech'}</span>
                          </div>
                          <p className="line-clamp-2 text-gray-300 text-[11px]">{q?.prompt || 'Question prompt'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PRACTICE MODE (Section 7) */}
      {activeTab === 'practice' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Active Recall Flashcards</h3>
              <p className="text-xs text-gray-400">Step through cards, test your knowledge, and rate confidence.</p>
            </div>
            <button
              onClick={reorderByWeakest}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
            >
              Order by Weakest First
            </button>
          </div>

          {kit.flashcards?.length > 0 ? (
            <div className="space-y-6">
              {/* Progress counter */}
              <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                <span>
                  Card {currentCardIndex + 1} of {kit.flashcards.length}
                </span>
                <span>
                  {Object.keys(practiceConfidence).length} of {kit.flashcards.length} Rated
                </span>
              </div>

              {/* 3D Flip Flashcard */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="cursor-pointer min-h-[280px] p-8 glass-panel rounded-3xl border-2 hover:border-primary-500/50 transition-all flex flex-col justify-between shadow-2xl relative select-none"
              >
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="font-mono font-bold text-accent-teal">
                    {kit.flashcards[currentCardIndex].id}
                  </span>
                  <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded">
                    {isFlipped ? 'ANSWER OUTLINE (Click to flip)' : 'QUESTION PROMPT (Click to reveal answer)'}
                  </span>
                </div>

                <div className="my-auto py-6 text-center">
                  {isFlipped ? (
                    <div className="text-left space-y-3 font-mono text-sm text-gray-200 leading-relaxed whitespace-pre-line">
                      {kit.flashcards[currentCardIndex].back}
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-white leading-snug">
                      {kit.flashcards[currentCardIndex].front}
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
                    onClick={() => recordConfidence(1)}
                    className="py-3 px-4 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
                  >
                    1. Needs Work
                  </button>
                  <button
                    onClick={() => recordConfidence(2)}
                    className="py-3 px-4 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all"
                  >
                    2. Getting There
                  </button>
                  <button
                    onClick={() => recordConfidence(3)}
                    className="py-3 px-4 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
                  >
                    3. Mastered
                  </button>
                </div>
              </div>

              {/* Card Navigation */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    if (currentCardIndex > 0) {
                      setIsFlipped(false);
                      setCurrentCardIndex(prev => prev - 1);
                    }
                  }}
                  disabled={currentCardIndex === 0}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/5 disabled:opacity-30"
                >
                  &larr; Previous Card
                </button>
                <button
                  onClick={() => {
                    if (currentCardIndex < kit.flashcards.length - 1) {
                      setIsFlipped(false);
                      setCurrentCardIndex(prev => prev + 1);
                    }
                  }}
                  disabled={currentCardIndex === kit.flashcards.length - 1}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/5 disabled:opacity-30"
                >
                  Next Card &rarr;
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400 glass-panel rounded-2xl">
              No flashcards generated for this kit.
            </div>
          )}
        </div>
      )}

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
