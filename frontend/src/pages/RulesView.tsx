import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../api';
import {
  TRAFFIC_RULES_QUIZ_BANK,
  QUIZ_CATEGORIES,
} from '../data/trafficQuizData';
import type { TrafficQuizQuestion } from '../data/trafficQuizData';
import { ALL_108_RTO_SIGNS } from '../data/rtoSignsData';
import type { RtoSignItem } from '../data/rtoSignsData';

interface SignData {
  id?: number;
  class_id?: number;
  sign_code: string;
  name: string;
  category: string;
  shape: string;
  color_code: string;
  meaning: string;
  penalty_info?: string;
  legal_reference?: string;
  svg?: string;
  image_url?: string;
  geometry?: string;
  reflectivity?: string;
  halt?: string;
  pitfall?: string;
  speed_limit?: number | null;
  tts_prompt?: string;
}

const TAG_FILTERS = [
  { id: 'all', label: 'All 108 Signs' },
  { id: 'speed', label: 'Speed Limits', query: 'limit' },
  { id: 'prohibit', label: 'Prohibitions & Bans', query: 'prohibit' },
  { id: 'direction', label: 'One-Way & Directions', query: 'way' },
  { id: 'pedestrian', label: 'Pedestrian & School', query: 'pedestrian' },
  { id: 'curves', label: 'Curves & Turns', query: 'bend' },
  { id: 'hazards', label: 'Crossings & Hazards', query: 'ahead' },
  { id: 'parking', label: 'Parking & Facilities', query: 'parking' },
];

const formatFineBadge = (penalty?: string, category?: string) => {
  if (!penalty) return { text: 'Statutory rules apply', icon: 'gavel', color: 'text-amber-400' };
  const p = penalty.trim();

  if (p.includes('No Direct Fine') || p.includes('No Violation Fine') || p.includes('Wayfinding')) {
    return { text: 'Advisory (No Direct Fine)', icon: 'info', color: 'text-blue-400' };
  }
  if (
    p.startsWith('Facility Service') ||
    p.startsWith('Fuel Service') ||
    p.startsWith('Rest & Dining') ||
    p.startsWith('Refreshment') ||
    p.startsWith('Medical Facility') ||
    p.startsWith('Transit') ||
    p.startsWith('Sanitation')
  ) {
    const match = p.match(/(₹[0-9,]+(?: – ₹[0-9,]+)?)/);
    if (match) {
      return { text: `Facility (${match[1]} if blocking)`, icon: 'local_convenience_store', color: 'text-emerald-400' };
    }
    return { text: 'Facility Service', icon: 'local_convenience_store', color: 'text-emerald-400' };
  }
  if (p.startsWith('Free in Marked Bay')) {
    return { text: 'Free in Bay (₹500 outside)', icon: 'local_parking', color: 'text-emerald-400' };
  }
  if (p.startsWith('Dedicated') || p.startsWith('Designated')) {
    return { text: 'Reserved Bay (₹500 outside)', icon: 'local_parking', color: 'text-emerald-400' };
  }

  if (p.startsWith('₹')) {
    let clean = p;
    if (p.includes('+ ₹2,000/extra ton')) {
      clean = 'Fine: ₹20,000 + ₹2,000/ton';
    } else if (p.includes('up to 1 yr jail')) {
      clean = 'Fine: ₹2,000 – ₹5,000 / Jail';
    } else if (p.includes('Vehicle Impoundment')) {
      clean = 'Fine: ₹2,000 – ₹5,000 + Impound';
    } else if (p.includes('LMV') && p.includes('HMV')) {
      clean = 'Fine: ₹1,000–₹2,000 (HMV ₹4,000)';
    } else if (p.includes('Over-Dimension')) {
      clean = 'Fine: ₹20,000 (Over-dim)';
    } else if (p.includes('1st') && p.includes('repeat')) {
      const matchFirst = p.match(/₹[0-9,]+/);
      const matchRepeat = p.match(/₹[0-9,]+\s*repeat/);
      const first = matchFirst ? matchFirst[0] : '';
      const rep = matchRepeat ? matchRepeat[0] : 'repeat';
      const tow = p.includes('Towing') ? ' + Tow' : '';
      clean = `Fine: ${first} (${rep})${tow}`;
    } else if (p.includes('(')) {
      const base = p.split('(')[0].trim();
      clean = base.startsWith('Fine:') ? base : `Fine: ${base}`;
    } else {
      clean = p.startsWith('Fine:') ? p : `Fine: ${p}`;
    }

    const isHigh = p.includes('20,000') || p.includes('jail') || p.includes('5,000') || p.includes('10,000');
    return {
      text: clean,
      icon: isHigh ? 'warning' : 'gavel',
      color: isHigh ? 'text-red-400' : 'text-amber-400',
    };
  }

  return {
    text: p.split('(')[0].trim() || 'Statutory fine',
    icon: 'gavel',
    color: 'text-amber-400',
  };
};

export const RulesView: React.FC = () => {
  // Initialize immediately with the full 108 RTO signs catalog
  const [signs, setSigns] = useState<SignData[]>(() =>
    ALL_108_RTO_SIGNS.map((s) => ({ ...s }))
  );
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'mandatory' | 'cautionary' | 'informatory'>('all');
  const [activeTag, setActiveTag] = useState('all');
  const [selectedSign, setSelectedSign] = useState<SignData | null>(() =>
    ALL_108_RTO_SIGNS[0] || null
  );

  // Teaching View Mode: 'catalog' grid or 'flashcards' study mode
  const [viewMode, setViewMode] = useState<'catalog' | 'flashcards'>('catalog');
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredSignIds, setMasteredSignIds] = useState<Set<number>>(new Set());

  // Sync viewMode with URL hash for seamless browser back/forward button support
  useEffect(() => {
    const syncViewModeFromHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('flashcard')) {
        setViewMode('flashcards');
      } else {
        setViewMode('catalog');
      }
    };
    syncViewModeFromHash();
    window.addEventListener('hashchange', syncViewModeFromHash);
    return () => window.removeEventListener('hashchange', syncViewModeFromHash);
  }, []);

  const switchViewMode = (mode: 'catalog' | 'flashcards') => {
    setViewMode(mode);
    const targetHash = mode === 'flashcards' ? '#academy/flashcards' : '#academy';
    if (window.location.hash !== targetHash) {
      window.history.pushState({ tab: 'academy', sub: mode }, '', targetHash);
    }
  };

  // Pagination for catalog (24 per page by default, or all)
  const [pageSize, setPageSize] = useState<number>(24);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Audio Speech Synthesis / Voice Tutor
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingSignCode, setSpeakingSignCode] = useState<string | null>(null);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<TrafficQuizQuestion[]>(TRAFFIC_RULES_QUIZ_BANK);
  const [selectedQuizCategory, setSelectedQuizCategory] = useState<string>('all');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<any | null>(null);
  const [showTeachingNote, setShowTeachingNote] = useState<boolean>(true);
  const [userAnswers, setUserAnswers] = useState<{ [qId: number]: { selected: number; isCorrect: boolean } }>({});
  const [submittingQuiz, setSubmittingQuiz] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAcademyData();
  }, []);

  const normalizeQuestion = (q: any, idx: number): TrafficQuizQuestion => {
    const rawOpts = q.options || [];
    const options = rawOpts.map((opt: any, oIdx: number) => {
      if (typeof opt === 'string') {
        return { id: oIdx, text: opt };
      }
      return { id: opt.id ?? oIdx, text: opt.text ?? String(opt) };
    });

    return {
      id: q.id ?? idx + 1,
      category: q.category || 'Traffic Rules',
      question: q.question_text || q.question || 'Traffic Safety Rule',
      options,
      correct_answer:
        q.correct_option_index !== undefined
          ? q.correct_option_index
          : q.correct_answer ?? 0,
      explanation:
        q.explanation ||
        'Refer to the Motor Vehicles Act 1988 and IRC regulations.',
      legal_reference: q.legal_reference || 'Motor Vehicles Act, 1988',
      penalty_info:
        q.penalty_info || 'Statutory traffic regulation violation citation',
      teaching_tip:
        q.teaching_tip || 'Comply with statutory road signs and lane discipline.',
    };
  };

  const loadAcademyData = async () => {
    try {
      setLoading(true);
      const [backendSigns, questions] = await Promise.all([
        api.getSignRules().catch(() => []),
        api.getQuizQuestions().catch(() => []),
      ]);

      // Seed map with complete 108 catalog
      const signsMap = new Map<number, SignData>();
      ALL_108_RTO_SIGNS.forEach((s) => signsMap.set(s.class_id, { ...s }));

      // Merge backend database enrichments safely by class_id
      if (Array.isArray(backendSigns) && backendSigns.length > 0) {
        backendSigns.forEach((bs: any) => {
          if (bs.class_id !== undefined && signsMap.has(bs.class_id)) {
            const existing = signsMap.get(bs.class_id)!;
            signsMap.set(bs.class_id, {
              ...existing,
              ...bs,
              meaning: bs.required_action || bs.meaning || existing.meaning,
              penalty_info: bs.penalty_info || existing.penalty_info,
              legal_reference: bs.legal_reference || existing.legal_reference,
              pitfall: bs.mistake_avoidance || bs.pitfall || existing.pitfall,
              image_url:
                existing.image_url ||
                bs.image_url ||
                `/signs/${String(bs.class_id).padStart(3, '0')}.png`,
              sign_code: existing.sign_code || bs.sign_code || `IRC67-${bs.class_id}`,
            });
          }
        });
      }

      const merged = Array.from(signsMap.values()).sort(
        (a, b) => (a.class_id ?? 0) - (b.class_id ?? 0)
      );
      setSigns(merged);
      if (merged.length > 0) {
        setSelectedSign((prev) => prev || merged[0]);
      }

      if (questions && Array.isArray(questions) && questions.length > 0) {
        setQuizQuestions(
          questions.map((q: any, i: number) => normalizeQuestion(q, i))
        );
      } else {
        setQuizQuestions(TRAFFIC_RULES_QUIZ_BANK);
      }
    } catch (err) {
      setSigns(ALL_108_RTO_SIGNS.map((s) => ({ ...s })));
      setSelectedSign(ALL_108_RTO_SIGNS[0]);
      setQuizQuestions(TRAFFIC_RULES_QUIZ_BANK);
    } finally {
      setLoading(false);
    }
  };

  // Audio Speech Synthesis / Voice Tutor
  const speakSign = useCallback((sign: SignData) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking && speakingSignCode === sign.sign_code) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingSignCode(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText =
      sign.tts_prompt ||
      `${sign.name}. Category: ${sign.category}. ${sign.meaning}. Mandatory action: ${sign.halt || ''}. Penalty fine: ${sign.penalty_info || ''}.`;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingSignCode(null);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingSignCode(null);
    };

    setIsSpeaking(true);
    setSpeakingSignCode(sign.sign_code);
    window.speechSynthesis.speak(utterance);
  }, [isSpeaking, speakingSignCode]);

  // Stop speech when unmounting
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Filtered signs computation across Search, Category, and Tag Chips
  const filteredSigns = useMemo(() => {
    return signs.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.sign_code.toLowerCase().includes(q) ||
        s.meaning.toLowerCase().includes(q) ||
        (s.penalty_info && s.penalty_info.toLowerCase().includes(q)) ||
        (s.legal_reference && s.legal_reference.toLowerCase().includes(q)) ||
        (s.pitfall && s.pitfall.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Category check
      if (activeCategory === 'mandatory' && !s.category.toUpperCase().includes('MANDAT')) return false;
      if (activeCategory === 'cautionary' && !s.category.toUpperCase().includes('CAUTION')) return false;
      if (activeCategory === 'informatory' && !s.category.toUpperCase().includes('INFORMAT')) return false;

      // Tag filter check
      if (activeTag !== 'all') {
        const tag = TAG_FILTERS.find((t) => t.id === activeTag);
        if (tag?.query) {
          const tq = tag.query.toLowerCase();
          const matchesTag =
            s.name.toLowerCase().includes(tq) ||
            s.meaning.toLowerCase().includes(tq) ||
            (s.sign_code && s.sign_code.toLowerCase().includes(tq));
          if (!matchesTag) return false;
        }
      }

      return true;
    });
  }, [signs, searchQuery, activeCategory, activeTag]);

  // Pagination slicing
  const totalPages = pageSize === -1 ? 1 : Math.ceil(filteredSigns.length / pageSize);
  const paginatedSigns = useMemo(() => {
    if (pageSize === -1) return filteredSigns;
    const start = (currentPage - 1) * pageSize;
    return filteredSigns.slice(start, start + pageSize);
  }, [filteredSigns, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory, activeTag, pageSize]);

  // Category counts
  const categoryCounts = useMemo(() => {
    let mandatory = 0;
    let cautionary = 0;
    let informatory = 0;
    signs.forEach((s) => {
      const c = (s.category || '').toUpperCase();
      if (c.includes('MANDAT')) mandatory++;
      else if (c.includes('CAUTION')) cautionary++;
      else if (c.includes('INFORMAT')) informatory++;
    });
    return { all: signs.length, mandatory, cautionary, informatory };
  }, [signs]);

  // Select next / previous sign in inspector
  const handleStepSign = (direction: 'next' | 'prev') => {
    if (filteredSigns.length === 0) return;
    const currIdx = selectedSign ? filteredSigns.findIndex((s) => s.sign_code === selectedSign.sign_code) : 0;
    let nextIdx = direction === 'next' ? currIdx + 1 : currIdx - 1;
    if (nextIdx >= filteredSigns.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = filteredSigns.length - 1;
    setSelectedSign(filteredSigns[nextIdx]);
  };

  const handleRandomSign = () => {
    if (filteredSigns.length === 0) return;
    const rand = Math.floor(Math.random() * filteredSigns.length);
    setSelectedSign(filteredSigns[rand]);
  };

  // Flashcard controls
  const currentFlashcard = filteredSigns[flashcardIndex] || filteredSigns[0] || signs[0];

  const handleNextFlashcard = () => {
    setIsFlipped(false);
    setFlashcardIndex((prev) => (prev + 1) % Math.max(1, filteredSigns.length));
  };

  const handlePrevFlashcard = () => {
    setIsFlipped(false);
    setFlashcardIndex((prev) => (prev - 1 + filteredSigns.length) % Math.max(1, filteredSigns.length));
  };

  const handleRandomFlashcard = () => {
    setIsFlipped(false);
    const rand = Math.floor(Math.random() * filteredSigns.length);
    setFlashcardIndex(rand);
  };

  const handleToggleMastered = (cid: number) => {
    setMasteredSignIds((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
    handleNextFlashcard();
  };

  // Quiz calculations
  const filteredQuizQuestions = useMemo(() => {
    if (selectedQuizCategory === 'all') return quizQuestions;
    const cat = QUIZ_CATEGORIES.find((c) => c.id === selectedQuizCategory);
    const matchTerm = cat?.match || selectedQuizCategory;
    return quizQuestions.filter((q) =>
      q.category.toLowerCase().includes(matchTerm.toLowerCase())
    );
  }, [quizQuestions, selectedQuizCategory]);

  const activeQuestion =
    filteredQuizQuestions[currentQIndex] ||
    filteredQuizQuestions[0] ||
    TRAFFIC_RULES_QUIZ_BANK[0];

  const handleSelectQuizCategory = (catId: string) => {
    setSelectedQuizCategory(catId);
    setCurrentQIndex(0);
    setSelectedAnswer(null);
    setQuizFeedback(null);
    setQuizScore(null);
    setUserAnswers({});
    setSubmitSuccess(null);
  };

  const handleSelectAnswer = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    const q = activeQuestion;
    if (q) {
      const isCorrect = idx === q.correct_answer;
      setUserAnswers((prev) => ({
        ...prev,
        [q.id]: { selected: idx, isCorrect },
      }));
      setQuizFeedback({
        isCorrect,
        correctIdx: q.correct_answer,
        explanation:
          q.explanation || 'Refer to MV Act 1988 and IRC:67 regulatory codes.',
      });
    }
  };

  const handleNextQuestion = async () => {
    if (currentQIndex < filteredQuizQuestions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setQuizFeedback(null);
    } else {
      let correctCount = 0;
      const submissionAnswers: any[] = [];

      filteredQuizQuestions.forEach((q) => {
        const recorded = userAnswers[q.id];
        const isRight = recorded
          ? recorded.isCorrect
          : selectedAnswer === q.correct_answer;
        if (isRight) correctCount++;
        submissionAnswers.push({
          question_id: q.id,
          selected_option: recorded ? recorded.selected : (selectedAnswer ?? 0),
        });
      });

      const total = filteredQuizQuestions.length;
      const scorePct = Math.round((correctCount / Math.max(1, total)) * 100);
      setQuizScore(scorePct);

      try {
        setSubmittingQuiz(true);
        await api.submitQuiz({
          category:
            selectedQuizCategory === 'all'
              ? 'Comprehensive Traffic Rules'
              : selectedQuizCategory,
          answers: submissionAnswers,
        });
        setSubmitSuccess(
          'Official Quiz Telemetry Evaluated • +2 Safety Score Credited to Fleet Profile'
        );
      } catch (e) {
        // Offline / Guest
      } finally {
        setSubmittingQuiz(false);
      }
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQIndex(0);
    setSelectedAnswer(null);
    setQuizFeedback(null);
    setQuizScore(null);
    setUserAnswers({});
    setSubmitSuccess(null);
  };

  return (
    <div className="flex flex-col w-full gap-6 max-w-[1720px] mx-auto text-on-surface">
      {/* Title & Status Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span className="font-telemetry-sm text-xs text-cyan-400 tracking-wider uppercase font-semibold">
              IRC:67-2012 COMPLIANCE REPOSITORY • COMPLETE 108 SIGN ENCYCLOPEDIA
            </span>
            <span className="text-slate-500 font-mono text-xs">/</span>
            <span className="font-telemetry-sm text-xs text-slate-400">
              MV ACT SEC 119 - 184
            </span>
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight">
            Traffic Rules & Sign Academy
          </h1>
          <p className="font-body-md text-sm text-slate-400 max-w-3xl mt-1 leading-relaxed">
            Master all 108 official Indian RTO road signs, statutory compliance rules, penalties under the Motor Vehicles Act 2019, and common driving pitfalls with interactive voice guidance.
          </p>
        </div>

        {/* Teaching Mode Toggle & Assessment Launcher */}
        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          {/* Mode switch */}
          <div className="bg-[#10203B] border border-white/10 p-1 rounded-xl flex items-center shadow-lg">
            <button
              onClick={() => switchViewMode('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
                viewMode === 'catalog'
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">grid_view</span>
              <span>108 Catalog</span>
            </button>
            <button
              onClick={() => switchViewMode('flashcards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
                viewMode === 'flashcards'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">style</span>
              <span>Flashcard Training</span>
              {masteredSignIds.size > 0 && (
                <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 font-black rounded-full text-[10px]">
                  {masteredSignIds.size}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-mono border border-white/10 flex items-center gap-1.5 transition-colors"
            title="Export / Print Sign Manual"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span className="hidden sm:inline">Sign Manual PDF</span>
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('mini-quiz');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_16px_rgba(77,142,255,0.4)] hover:brightness-110 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">play_arrow</span>
            <span>Rules Quiz</span>
          </button>
        </div>
      </div>

      {/* Top Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-[#10203B]/70 border border-white/10 backdrop-blur-2xl p-4 rounded-xl flex items-center justify-between shadow-xl relative overflow-hidden group">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 text-red-400">
              <span className="material-symbols-outlined text-2xl">traffic</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-mono text-[10px] text-slate-400 uppercase">MANDATORY SIGNS</span>
              <span className="font-heading font-bold text-base text-white">{categoryCounts.mandatory} Signs Cataloged</span>
              <span className="font-mono text-[11px] text-red-400">Strict Legal Penalties</span>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-[#10203B]/70 border border-white/10 backdrop-blur-2xl p-4 rounded-xl flex items-center justify-between shadow-xl relative overflow-hidden group">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-mono text-[10px] text-slate-400 uppercase">CAUTIONARY SIGNS</span>
              <span className="font-heading font-bold text-base text-white">{categoryCounts.cautionary} Signs Cataloged</span>
              <span className="font-mono text-[11px] text-amber-400">Road Hazard Warnings</span>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-[#10203B]/70 border border-white/10 backdrop-blur-2xl p-4 rounded-xl flex items-center justify-between shadow-xl relative overflow-hidden group">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400">
              <span className="material-symbols-outlined text-2xl">info</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-mono text-[10px] text-slate-400 uppercase">INFORMATORY SIGNS</span>
              <span className="font-heading font-bold text-base text-white">{categoryCounts.informatory} Signs Cataloged</span>
              <span className="font-mono text-[11px] text-blue-400">Wayfinding & Facility</span>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-[#10203B]/70 border border-white/10 backdrop-blur-2xl p-4 rounded-xl flex items-center justify-between shadow-xl relative overflow-hidden group">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-400">
              <span className="material-symbols-outlined text-2xl">school</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-mono text-[10px] text-slate-400 uppercase">TOTAL REPOSITORY</span>
              <span className="font-heading font-bold text-base text-white">{signs.length} Official Signs</span>
              <span className="font-mono text-[11px] text-emerald-400">100% Indian RTO Complete</span>
            </div>
          </div>
          <button
            onClick={handleRandomSign}
            className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded font-mono text-xs text-cyan-300 transition-colors flex items-center gap-1"
            title="Jump to a random sign"
          >
            <span className="material-symbols-outlined text-xs">shuffle</span>
            <span>Random</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filter Section */}
      <div className="bg-[#10203B]/70 border border-white/10 backdrop-blur-2xl p-4 rounded-xl flex flex-col gap-3 shadow-xl">
        {/* Search Bar with Result Counter */}
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-4 text-slate-400 pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all 108 signs by name, rule, penalty (e.g. 'Stop', 'Speed Limit 50', 'No Entry', 'U-Turn', 'Pedestrian', '₹2,000')..."
            className="w-full bg-[#070e1c] text-white placeholder-slate-500 font-body-md text-xs pl-12 pr-28 py-3 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-400 transition-all"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-300 rounded text-xs font-mono flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-xs">close</span>
              <span>Clear</span>
            </button>
          ) : (
            <span className="absolute right-4 font-mono text-[11px] text-slate-500 pointer-events-none">
              {filteredSigns.length} of {signs.length}
            </span>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white font-bold shadow-[0_0_12px_rgba(77,142,255,0.4)]'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-xs">apps</span>
            <span>All Signs ({categoryCounts.all})</span>
          </button>
          <button
            onClick={() => setActiveCategory('mandatory')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeCategory === 'mandatory'
                ? 'bg-red-600 text-white font-bold shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            <span>Mandatory / Regulatory ({categoryCounts.mandatory})</span>
          </button>
          <button
            onClick={() => setActiveCategory('cautionary')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeCategory === 'cautionary'
                ? 'bg-amber-600 text-white font-bold shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Cautionary / Warning ({categoryCounts.cautionary})</span>
          </button>
          <button
            onClick={() => setActiveCategory('informatory')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeCategory === 'informatory'
                ? 'bg-cyan-600 text-white font-bold shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Informatory / Guide ({categoryCounts.informatory})</span>
          </button>
        </div>

        {/* Quick Topic Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none pt-1 border-t border-white/5">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-cyan-400">sell</span>
            <span>Quick Topics:</span>
          </span>
          {TAG_FILTERS.map((tag) => {
            const isTagActive = activeTag === tag.id;
            return (
              <button
                key={tag.id}
                onClick={() => setActiveTag(tag.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono whitespace-nowrap transition-all ${
                  isTagActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW MODE 1: INTERACTIVE FLASHCARD TRAINING */}
      {viewMode === 'flashcards' && (
        <div className="bg-[#10203B]/85 border border-cyan-500/20 backdrop-blur-2xl p-6 sm:p-8 rounded-2xl shadow-2xl flex flex-col gap-6 relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Flashcard Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <span className="material-symbols-outlined text-xl">style</span>
              </div>
              <div>
                <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase tracking-wider bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  RTO FLASHCARD STUDY MODE
                </span>
                <h2 className="font-heading font-extrabold text-lg text-white mt-0.5">
                  Test Your Traffic Sign Recall
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => switchViewMode('catalog')}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 text-xs font-mono border border-cyan-500/30 flex items-center gap-1.5 transition-colors mr-1 cursor-pointer"
                title="Return to the 108 sign catalog view"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>Back to Catalog</span>
              </button>
              <span className="font-mono text-xs text-slate-400">
                Card <strong className="text-white">{flashcardIndex + 1}</strong> of {filteredSigns.length}
              </span>
              <span className="text-slate-600">|</span>
              <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">verified</span>
                <span>{masteredSignIds.size} Mastered</span>
              </span>
            </div>
          </div>

          {/* Big Flashcard Body */}
          {currentFlashcard && (
            <div className="flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`w-full min-h-[380px] bg-[#070e1c] border rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-between cursor-pointer transition-all duration-300 relative group select-none shadow-2xl ${
                  isFlipped
                    ? 'border-cyan-500/50 bg-gradient-to-b from-[#0b162c] to-[#070e1c]'
                    : 'border-white/10 hover:border-cyan-500/30 hover:shadow-cyan-500/10'
                }`}
              >
                {/* Category Pill & Code */}
                <div className="w-full flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wide"
                      style={{
                        backgroundColor: `${currentFlashcard.color_code}22`,
                        color: currentFlashcard.color_code || '#EF4444',
                        border: `1px solid ${currentFlashcard.color_code}44`,
                      }}
                    >
                      {currentFlashcard.category}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      #{String(currentFlashcard.class_id).padStart(3, '0')} • {currentFlashcard.sign_code}
                    </span>
                  </div>

                  <span className="font-mono text-[10px] text-cyan-400 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded">
                    <span className="material-symbols-outlined text-xs">touch_app</span>
                    <span>{isFlipped ? 'Tap to hide' : 'Tap to flip'}</span>
                  </span>
                </div>

                {/* Sign Image */}
                <div className="my-6 relative flex flex-col items-center justify-center">
                  <div className="w-32 h-32 sm:w-36 sm:h-36 bg-[#040810] rounded-2xl p-3 flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-105 transition-transform duration-300">
                    {currentFlashcard.image_url ? (
                      <img
                        src={currentFlashcard.image_url}
                        alt={currentFlashcard.name}
                        className="w-28 h-28 sm:w-32 sm:h-32 object-contain filter drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full border-4 border-red-500 flex items-center justify-center text-white font-bold text-sm">
                        {currentFlashcard.shape}
                      </div>
                    )}
                  </div>
                </div>

                {/* Front vs Back Reveal Content */}
                {!isFlipped ? (
                  <div className="text-center space-y-2">
                    <h3 className="font-heading font-black text-xl text-white">
                      Do you know this sign's rule & penalty?
                    </h3>
                    <p className="font-mono text-xs text-cyan-400">
                      Click anywhere on the card or press Space to reveal the official rule.
                    </p>
                  </div>
                ) : (
                  <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="text-center">
                      <h3 className="font-heading font-black text-2xl text-white">
                        {currentFlashcard.name}
                      </h3>
                      <p className="font-body-md text-xs sm:text-sm text-cyan-300 mt-1 max-w-lg mx-auto">
                        {currentFlashcard.meaning}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-left">
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <span className="font-mono text-[10px] text-emerald-400 uppercase font-bold block">
                          DRIVER MANDATE (HALT/ACTION)
                        </span>
                        <p className="text-xs text-slate-200 mt-0.5">
                          {currentFlashcard.halt || 'Observe strictly according to law.'}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <span className="font-mono text-[10px] text-red-400 uppercase font-bold block">
                          LEGAL STATUTE & PENALTY
                        </span>
                        <p className="text-xs text-slate-200 mt-0.5 font-semibold">
                          {currentFlashcard.penalty_info}
                        </p>
                      </div>
                    </div>

                    {currentFlashcard.pitfall && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
                        <span className="material-symbols-outlined text-sm text-amber-400 shrink-0 mt-0.5">report</span>
                        <span><strong>Common Driver Mistake:</strong> {currentFlashcard.pitfall}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Card Footer Controls */}
                <div className="w-full pt-4 mt-2 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speakSign(currentFlashcard);
                    }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-cyan-300 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isSpeaking && speakingSignCode === currentFlashcard.sign_code ? 'volume_up' : 'campaign'}
                    </span>
                    <span>{isSpeaking && speakingSignCode === currentFlashcard.sign_code ? 'Speaking...' : 'Listen to Rule'}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFlipped(!isFlipped);
                    }}
                    className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 rounded-lg text-xs font-mono transition-colors"
                  >
                    {isFlipped ? 'Hide Answer' : 'Reveal Answer'}
                  </button>
                </div>
              </div>

              {/* Navigation & Self-Assessment Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 w-full mt-4">
                <button
                  onClick={handlePrevFlashcard}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono border border-white/10 flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleMastered(currentFlashcard.class_id ?? flashcardIndex)}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                      masteredSignIds.has(currentFlashcard.class_id ?? flashcardIndex)
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>{masteredSignIds.has(currentFlashcard.class_id ?? flashcardIndex) ? 'Mastered!' : 'I Know This'}</span>
                  </button>

                  <button
                    onClick={handleRandomFlashcard}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono border border-white/10 flex items-center gap-1 transition-colors"
                    title="Random card"
                  >
                    <span className="material-symbols-outlined text-sm">shuffle</span>
                  </button>
                </div>

                <button
                  onClick={handleNextFlashcard}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 text-white text-xs font-mono font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all"
                >
                  <span>Next Sign</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: MAIN TRAFFIC SIGN CATALOG GRID & DETAIL PANEL */}
      {viewMode === 'catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Traffic Sign Grid (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Header info & pagination size selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-heading font-bold text-base text-white">Standard Symbology Catalog</span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 font-mono text-[10px] text-cyan-400 font-bold">
                  {filteredSigns.length} OF {signs.length} SIGNS
                </span>
                {pageSize !== -1 && (
                  <span className="font-mono text-xs text-slate-400">
                    • Page {currentPage} of {totalPages}
                  </span>
                )}
              </div>

              {/* Page size toggle */}
              <div className="flex items-center gap-1 font-mono text-xs text-slate-400">
                <span>Show:</span>
                {[24, 48, -1].map((size) => (
                  <button
                    key={size}
                    onClick={() => setPageSize(size)}
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      pageSize === size
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'bg-white/5 hover:text-white'
                    }`}
                  >
                    {size === -1 ? 'All 108' : size}
                  </button>
                ))}
              </div>
            </div>

            {/* Signs Grid */}
            {filteredSigns.length === 0 ? (
              <div className="bg-[#10203B]/50 border border-white/10 rounded-2xl p-12 text-center flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-slate-500">search_off</span>
                <h3 className="font-heading font-bold text-lg text-white">No Traffic Signs Match Filter</h3>
                <p className="text-xs text-slate-400 max-w-md">
                  No signs matched "{searchQuery}". Try searching for speed limits, stop signs, overtaking, or clear the category filter.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                    setActiveTag('all');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono font-semibold transition-colors mt-2"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedSigns.map((s, idx) => {
                  const isSelected = selectedSign?.sign_code === s.sign_code;
                  const isCurrentlySpeaking = isSpeaking && speakingSignCode === s.sign_code;

                  return (
                    <div
                      key={s.sign_code || idx}
                      onClick={() => setSelectedSign(s)}
                      className={`bg-[#10203B]/70 border border-white/10 backdrop-blur-2xl p-4 rounded-xl flex flex-col justify-between shadow-xl transition-all cursor-pointer relative overflow-hidden group ${
                        isSelected
                          ? 'ring-2 ring-cyan-400 bg-[#162B4D] shadow-[0_0_24px_rgba(6,182,212,0.2)]'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      {/* Left category accent line */}
                      <div
                        className="absolute top-0 left-0 w-1.5 h-full"
                        style={{ backgroundColor: s.color_code || '#EF4444' }}
                      ></div>

                      <div className="flex items-start gap-3.5">
                        {/* Real High-Resolution Sign Graphic */}
                        <div className="w-16 h-16 shrink-0 bg-[#070e1c] rounded-xl p-1.5 flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-105 transition-transform overflow-hidden relative">
                          {s.image_url ? (
                            <img
                              src={s.image_url}
                              alt={s.name}
                              className="w-13 h-13 max-w-full max-h-full object-contain filter drop-shadow-md"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : s.svg ? (
                            <div dangerouslySetInnerHTML={{ __html: s.svg }} />
                          ) : (
                            <div className="w-11 h-11 rounded-full border-2 border-red-500 flex items-center justify-center text-white font-bold text-xs">
                              {s.shape || 'RTO'}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span
                              className="px-1.5 py-0.5 rounded font-mono text-[9px] font-bold"
                              style={{
                                backgroundColor: `${s.color_code}22`,
                                color: s.color_code || '#EF4444',
                              }}
                            >
                              {s.category}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              #{String(s.class_id ?? idx).padStart(3, '0')} • {s.sign_code}
                            </span>
                          </div>

                          <h2 className="font-heading font-bold text-sm text-white group-hover:text-cyan-400 transition-colors truncate">
                            {s.name}
                          </h2>
                          <p className="font-body-sm text-xs text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                            {s.meaning}
                          </p>
                        </div>
                      </div>

                      {/* Card Bottom: Penalties, Speech Button & Inspect Link */}
                      {(() => {
                        const fineBadge = formatFineBadge(s.penalty_info, s.category);
                        return (
                          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between font-mono text-[10px] gap-2">
                            <span
                              className={`${fineBadge.color} flex items-center gap-1 truncate max-w-[210px] font-medium`}
                              title={`Statutory penalty: ${s.penalty_info}\nLegal statute: ${s.legal_reference}`}
                            >
                              <span className="material-symbols-outlined text-xs shrink-0">{fineBadge.icon}</span>
                              <span className="truncate">{fineBadge.text}</span>
                            </span>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Speech button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  speakSign(s);
                                }}
                                className={`p-1 rounded hover:bg-white/10 transition-colors flex items-center ${
                                  isCurrentlySpeaking ? 'text-cyan-400 animate-pulse' : 'text-slate-400 hover:text-cyan-300'
                                }`}
                                title="Listen to driver rule & penalty"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  {isCurrentlySpeaking ? 'volume_up' : 'campaign'}
                                </span>
                              </button>

                              <span className="text-cyan-400 group-hover:underline flex items-center">
                                Inspect <span className="material-symbols-outlined text-xs">chevron_right</span>
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#10203B]/50 border border-white/10 p-3.5 rounded-xl font-mono text-xs mt-2">
                <span className="text-slate-400">
                  Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredSigns.length)} of {filteredSigns.length} signs
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-slate-300 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">chevron_left</span>
                    <span>Prev</span>
                  </button>

                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return (
                        <span key={pageNum} className="text-slate-600 px-0.5">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-slate-300 flex items-center gap-1"
                  >
                    <span>Next</span>
                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sign Detail & Practical Road Context Panel (4 cols) */}
          {selectedSign && (
            <div className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-20">
              <div className="bg-[#10203B]/80 border border-white/10 backdrop-blur-2xl p-6 rounded-2xl shadow-2xl flex flex-col gap-4">
                {/* Inspector Header with Stepper Controls */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    <span className="font-mono text-xs text-slate-300 uppercase tracking-wider font-semibold">
                      HUD RETICLE INSPECTOR
                    </span>
                  </div>

                  {/* Stepper buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStepSign('prev')}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Previous sign"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <span className="font-mono text-[10px] text-cyan-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                      {selectedSign.sign_code}
                    </span>
                    <button
                      onClick={() => handleStepSign('next')}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Next sign"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>

                {/* Graphic with targeting reticle overlay */}
                <div className="flex flex-col items-center justify-center p-6 bg-[#070e1c] border border-white/10 rounded-2xl relative overflow-hidden shadow-inner group">
                  <div className="relative p-3 flex items-center justify-center">
                    {selectedSign.image_url ? (
                      <img
                        src={selectedSign.image_url}
                        alt={selectedSign.name}
                        className="w-28 h-28 object-contain filter drop-shadow-[0_0_18px_rgba(255,255,255,0.18)] transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : selectedSign.svg ? (
                      <div
                        className="w-28 h-28 flex items-center justify-center"
                        dangerouslySetInnerHTML={{ __html: selectedSign.svg }}
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full border-4 border-red-500 flex items-center justify-center text-white font-bold text-sm">
                        {selectedSign.shape}
                      </div>
                    )}

                    {/* Bounding box simulation corners */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>

                    <span className="absolute -bottom-2 right-0 font-mono text-[9px] bg-slate-900 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/40 shadow-sm">
                      AI CONF: 99.4%
                    </span>
                  </div>

                  <div className="mt-4 text-center">
                    <span className="font-heading font-bold text-base text-white block">
                      {selectedSign.name}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      #{String(selectedSign.class_id ?? 0).padStart(3, '0')} • {selectedSign.sign_code} Standard
                    </span>
                  </div>

                  {/* Audio Readout Button */}
                  <button
                    onClick={() => speakSign(selectedSign)}
                    className="mt-3 px-3.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-mono text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isSpeaking && speakingSignCode === selectedSign.sign_code ? 'volume_up' : 'campaign'}
                    </span>
                    <span>
                      {isSpeaking && speakingSignCode === selectedSign.sign_code ? 'Speaking Rule...' : 'Listen to Rule'}
                    </span>
                  </button>
                </div>

                {/* Core Rule & Driver Mandate */}
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col gap-1">
                  <span className="font-mono text-[10px] text-blue-400 font-bold uppercase flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">directions_car</span>
                    <span>DRIVER MANDATE & MEANING</span>
                  </span>
                  <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                    {selectedSign.meaning}
                  </p>
                  {selectedSign.halt && (
                    <div className="mt-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                      <strong>Required Action:</strong> {selectedSign.halt}
                    </div>
                  )}
                </div>

                {/* Common Driver Pitfall */}
                {selectedSign.pitfall && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-1">
                    <span className="font-mono text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">report_problem</span>
                      <span>COMMON DRIVER PITFALL</span>
                    </span>
                    <p className="text-xs text-amber-200 mt-0.5 leading-relaxed">
                      {selectedSign.pitfall}
                    </p>
                  </div>
                )}

                {/* Optical Specifications */}
                <div className="flex flex-col gap-2 bg-[#070e1c] p-3.5 rounded-lg border border-white/5">
                  <span className="font-mono text-[10px] text-slate-400 uppercase font-semibold">
                    OPTICAL & IRC:67 SPECIFICATIONS
                  </span>
                  <div className="grid grid-cols-2 gap-3 mt-1 text-xs">
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[10px]">Substrate Geometry</span>
                      <span className="text-white font-semibold font-mono truncate">{selectedSign.geometry || `${selectedSign.shape} Disc`}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[10px]">Retroreflectivity</span>
                      <span className="text-white font-semibold font-mono truncate">{selectedSign.reflectivity || 'Class XI Prismatic'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[10px]">Color Standard</span>
                      <span className="font-semibold font-mono" style={{ color: selectedSign.color_code || '#EF4444' }}>
                        {selectedSign.category}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[10px]">Statutory Authority</span>
                      <span className="text-cyan-400 font-semibold font-mono truncate">IRC:67-2012</span>
                    </div>
                  </div>
                </div>

                {/* Real-world dashcam scenario screenshot */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 uppercase">
                    <span>REAL-WORLD DASHCAM VALIDATION</span>
                    <span className="text-amber-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> RAIN HUD SCAN
                    </span>
                  </div>

                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10 group">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYqWIyWvldcnwlge8wz-SQeYDZRNQXj53oy1yrbccwKpq3BjQa9Wq1zTBRgNoxAWOZQFIdrIWAXDO8sEs047blMXvCIShQgFJEyLoE2do4VVHtyZGIYJTcR0H8tlqygh5yubUTErN_omk5oYA57WwhRlQWBaPWT3M4c_YUnix-Yw1BXKgtYj-hzTLCZ8MfMQ_eInUAlcYu3zGEcxcoz-57_-X11e6n8HAI2tmzw5wvWRtu_ousqKWIHQ"
                      alt="Rain HUD scan validation"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070B14] via-transparent to-transparent"></div>
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 font-mono text-[9px] text-white flex items-center gap-1 border border-white/10">
                      <span className="material-symbols-outlined text-[11px] text-emerald-400">videocam</span>
                      <span>CAM-04 • 21:42:10 IST</span>
                    </div>
                    <div className="absolute bottom-2 inset-x-2 text-white font-body-sm text-[11px] bg-slate-950/80 p-2 rounded border border-white/10">
                      <span className="font-semibold text-cyan-400">HUD Insight: </span>
                      High retroreflectivity maintains 80m OCR acquisition under heavy rain.
                    </div>
                  </div>
                </div>

                {/* Legal Penalty Liability */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col gap-1 ${
                    selectedSign.category === 'INFORMATORY'
                      ? 'bg-blue-500/10 border-blue-500/20'
                      : selectedSign.category === 'CAUTIONARY'
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-red-500/10 border-red-500/20'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between font-mono text-[10px] font-bold uppercase ${
                      selectedSign.category === 'INFORMATORY'
                        ? 'text-blue-400'
                        : selectedSign.category === 'CAUTIONARY'
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">
                        {selectedSign.category === 'INFORMATORY' ? 'info' : 'gavel'}
                      </span>{' '}
                      {selectedSign.category === 'INFORMATORY' ? 'STATUTORY GUIDELINE & ADVISORY' : 'LEGAL PENALTY LIABILITY'}
                    </span>
                    <span>2019 AMENDMENT</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1 flex-wrap gap-1">
                    <span
                      className={`font-heading font-bold text-base ${
                        selectedSign.category === 'INFORMATORY'
                          ? 'text-emerald-400'
                          : selectedSign.category === 'CAUTIONARY'
                          ? 'text-amber-300'
                          : 'text-red-400'
                      }`}
                    >
                      {selectedSign.penalty_info || 'Statutory fine applies'}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {selectedSign.legal_reference}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {selectedSign.category === 'INFORMATORY'
                      ? 'Informatory facilities assist wayfinding and road navigation. Unauthorized obstruction of facility bays or emergency access incurs statutory towing and clearance fines.'
                      : 'Non-compliance constitutes a statutory offense under the Motor Vehicles Act. Telemetry and camera detections are discoverable by regional RTO enforcement portals for automated e-challan issuance.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION: INTERACTIVE TRAFFIC RULES LEARNING & QUIZ CENTER */}
      <div
        id="mini-quiz"
        className="bg-[#10203B]/85 border border-cyan-500/20 backdrop-blur-2xl p-6 sm:p-7 rounded-2xl shadow-2xl flex flex-col gap-5 mt-4 relative overflow-hidden"
      >
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        {/* Academy Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
              <span className="material-symbols-outlined text-xl">school</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase tracking-wider bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  RTO RULES ACADEMY
                </span>
                <span className="text-slate-500 text-xs">•</span>
                <span className="font-mono text-[11px] text-slate-400">
                  MV Act 1988 & 2019 Amendment
                </span>
              </div>
              <h2 className="font-heading font-extrabold text-lg sm:text-xl text-white tracking-tight mt-0.5">
                Traffic Rules & Regulations Learning Center
              </h2>
            </div>
          </div>

          {/* Action Buttons: Teaching Doctrine Toggle & Restart */}
          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            <button
              onClick={() => setShowTeachingNote(!showTeachingNote)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border flex items-center gap-1.5 transition-all ${
                showTeachingNote
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
              title="Toggle official statutory teaching breakdown before or during testing"
            >
              <span className="material-symbols-outlined text-sm">
                {showTeachingNote ? 'lightbulb' : 'lightbulb_outline'}
              </span>
              <span>{showTeachingNote ? 'Rule Doctrine: ON' : 'Rule Doctrine: OFF'}</span>
            </button>

            <button
              onClick={handleRestartQuiz}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono border border-white/10 flex items-center gap-1.5 transition-all"
              title="Restart current quiz category"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {QUIZ_CATEGORIES.map((cat) => {
            const isSelected = selectedQuizCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleSelectQuizCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5 hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-xs">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Progress & Category Stats Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              MODULE: {activeQuestion.category.toUpperCase()}
            </span>
            <span className="text-slate-400">
              QUESTION {currentQIndex + 1} OF {filteredQuizQuestions.length}
            </span>
          </div>
          {/* Progress track */}
          <div className="w-full bg-slate-900/90 h-2 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-300"
              style={{
                width: `${Math.round(((currentQIndex + 1) / Math.max(1, filteredQuizQuestions.length)) * 100)}%`,
              }}
            ></div>
          </div>
        </div>

        {/* VIEW A: Quiz Completion / Score Certificate Screen */}
        {quizScore !== null ? (
          <div className="bg-[#070e1c] border border-cyan-500/30 rounded-xl p-6 sm:p-8 flex flex-col items-center text-center gap-5 shadow-2xl relative overflow-hidden animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
              <span className="material-symbols-outlined text-3xl">
                {quizScore >= 70 ? 'verified' : 'military_tech'}
              </span>
            </div>

            <div className="space-y-1 max-w-lg">
              <span
                className={`font-mono text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${
                  quizScore >= 70
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {quizScore >= 70
                  ? 'RTO COMPLIANCE CERTIFICATE AWARDED'
                  : 'TRAFFIC REGULATION RE-STUDY RECOMMENDED'}
              </span>
              <h3 className="font-heading font-black text-2xl sm:text-3xl text-white pt-2">
                {quizScore}% Mastery Score
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {quizScore >= 70
                  ? 'Outstanding knowledge of Indian motor vehicle statutory law, IRC:67 sign standards, and right-of-way regulations. Your defensive driving competence is validated.'
                  : 'You completed this section, but some statutory rules and penalty codes require further review. Familiarize yourself with mandatory circular signs and pedestrian rights.'}
              </p>
            </div>

            {submitSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 max-w-lg">
                <span className="material-symbols-outlined text-base shrink-0">check_circle</span>
                <span>{submitSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-md text-left">
              <div className="bg-white/5 border border-white/5 p-3 rounded-lg">
                <span className="text-[10px] font-mono text-slate-400 uppercase">QUESTIONS EVALUATED</span>
                <span className="font-heading font-bold text-lg text-white block mt-0.5">
                  {filteredQuizQuestions.length}
                </span>
              </div>
              <div className="bg-white/5 border border-white/5 p-3 rounded-lg">
                <span className="text-[10px] font-mono text-slate-400 uppercase">CATEGORY</span>
                <span className="font-heading font-bold text-sm text-cyan-400 block mt-0.5 truncate">
                  {activeQuestion.category}
                </span>
              </div>
              <div className="bg-white/5 border border-white/5 p-3 rounded-lg col-span-2 sm:col-span-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">SAFETY IMPACT</span>
                <span className="font-heading font-bold text-sm text-emerald-400 block mt-0.5">
                  +2 Safety Score
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={handleRestartQuiz}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:brightness-110 transition-all"
              >
                <span className="material-symbols-outlined text-base">replay</span>
                <span>Retake This Module</span>
              </button>
              <button
                onClick={() => handleSelectQuizCategory('all')}
                className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-mono text-xs border border-white/10 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">all_inclusive</span>
                <span>Practice All 38 Rules</span>
              </button>
            </div>
          </div>
        ) : (
          /* VIEW B: Active Question Presentation & Teaching Doctrine */
          <div className="flex flex-col gap-4">
            {/* 1. Teaching Doctrine / Official Rule Box */}
            {showTeachingNote && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-[#070e1c] border border-cyan-500/30 flex flex-col gap-2 relative overflow-hidden animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-sm">gavel</span>
                    <span>OFFICIAL STATUTORY LAW & RULE DOCTRINE</span>
                  </div>
                  <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                    {activeQuestion.penalty_info}
                  </span>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed font-body-sm">
                  <strong className="text-cyan-300 font-mono">{activeQuestion.legal_reference}: </strong>
                  {activeQuestion.teaching_tip}
                </div>
              </div>
            )}

            {/* 2. Question Text & Statutory Reference Subtitle */}
            <div className="flex flex-col gap-1.5">
              <h3 className="font-heading font-extrabold text-base sm:text-lg text-white leading-snug">
                {activeQuestion.question}
              </h3>
              <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                <span className="material-symbols-outlined text-sm text-cyan-400">balance</span>
                <span>Statutory Authority: {activeQuestion.legal_reference}</span>
              </div>
            </div>

            {/* 3. Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {activeQuestion.options.map((opt: any, optIdx: number) => {
                const isSelected = selectedAnswer === optIdx;
                const isCorrect = quizFeedback && optIdx === quizFeedback.correctIdx;
                const isWrong = isSelected && quizFeedback && !quizFeedback.isCorrect;

                let optClass =
                  'bg-[#070e1c] text-slate-300 hover:bg-white/5 border border-white/5 hover:border-cyan-500/30';
                if (isCorrect) {
                  optClass =
                    'bg-emerald-500/20 text-emerald-200 border border-emerald-500/70 shadow-[0_0_16px_rgba(16,185,129,0.3)]';
                } else if (isWrong) {
                  optClass =
                    'bg-red-500/20 text-red-200 border border-red-500/70 shadow-[0_0_16px_rgba(239,68,68,0.3)]';
                } else if (isSelected) {
                  optClass = 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/50';
                }

                return (
                  <button
                    key={optIdx}
                    disabled={selectedAnswer !== null}
                    onClick={() => handleSelectAnswer(optIdx)}
                    className={`text-left p-4 rounded-xl transition-all flex items-start gap-3.5 group relative ${optClass} ${
                      selectedAnswer === null
                        ? 'cursor-pointer active:scale-[0.99]'
                        : 'cursor-default'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs shrink-0 font-bold transition-colors ${
                        isCorrect
                          ? 'bg-emerald-500 text-slate-950'
                          : isWrong
                          ? 'bg-red-500 text-white'
                          : isSelected
                          ? 'bg-cyan-400 text-slate-950'
                          : 'bg-white/10 text-slate-300 group-hover:bg-cyan-500/20 group-hover:text-cyan-300'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="text-xs sm:text-sm leading-relaxed self-center">
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 4. Instant Explanation & Legal Rationale Banner */}
            {quizFeedback && (
              <div className="p-4 rounded-xl bg-[#070e1c] border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <span
                    className={`material-symbols-outlined text-2xl shrink-0 mt-0.5 ${
                      quizFeedback.isCorrect ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {quizFeedback.isCorrect ? 'check_circle' : 'cancel'}
                  </span>
                  <div className="space-y-1">
                    <span
                      className={`font-mono text-xs font-bold block uppercase tracking-wider ${
                        quizFeedback.isCorrect ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {quizFeedback.isCorrect
                        ? 'CORRECT • STATUTORY MANDATE VALIDATED'
                        : 'INCORRECT • REGULATION VIOLATION HAZARD'}
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed max-w-2xl">
                      <strong className="text-white">Legal Rationale: </strong>
                      {quizFeedback.explanation}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleNextQuestion}
                  className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 text-white font-mono text-xs font-semibold shrink-0 shadow-lg shadow-blue-500/20 flex items-center gap-1.5 transition-all self-end sm:self-center"
                >
                  <span>
                    {currentQIndex < filteredQuizQuestions.length - 1
                      ? 'Next Rule Question →'
                      : 'Complete & View Scorecard →'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
