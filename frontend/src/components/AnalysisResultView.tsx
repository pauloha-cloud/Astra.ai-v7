import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  CheckCircle, 
  Map as MapIcon, 
  BookOpen, 
  ChevronRight,
  BrainCircuit,
  MessageSquare,
  Trophy,
  Ear,
  X,
  FileText,
  AlertTriangle,
  Zap,
  Maximize2,
  Edit2,
  Layout,
  Download,
  Save,
  FileJson,
  Loader2,
  HelpCircle,
  Copy,
  Check,
  Layers,
  Sparkles,
  ChevronLeft,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { AnalysisResult, generateExtraQuestions } from '../services/geminiService';
import { StudyTutor } from './StudyTutor';
import { InteractiveMindMap } from './InteractiveMindMap';
import { api } from '../lib/api';

interface Props {
  data: AnalysisResult;
  onClose: () => void;
  isDarkMode?: boolean;
  t: any;
  lang?: string;
  activeTab?: 'summary' | 'quiz' | 'mindmap' | 'tutor' | 'transcript' | 'flashcards';
  setActiveTab?: (tab: 'summary' | 'quiz' | 'mindmap' | 'tutor' | 'transcript' | 'flashcards') => void;
  showInternalTabs?: boolean;
  preferences?: any;
}

export const AnalysisResultView = ({ 
  data, 
  onClose, 
  isDarkMode = true, 
  t, 
  lang = 'en',
  activeTab: externalActiveTab,
  setActiveTab: externalSetActiveTab,
  showInternalTabs = true,
  preferences
}: Props) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'summary' | 'quiz' | 'mindmap' | 'tutor' | 'transcript' | 'flashcards'>('summary');
  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = externalSetActiveTab || setInternalActiveTab;
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(() => {
    return Number(localStorage.getItem('astra_pref_quiz_count')) || 5;
  });
  const [selectedDifficulty, setSelectedDifficulty] = useState<'basic' | 'intermediate' | 'advanced'>(() => {
    return (localStorage.getItem('astra_pref_level') as any) || preferences?.explanationLevel || 'intermediate';
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  // New Summary & Transcript enhanced experience states & functions
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Flashcards state
  const [viewMode, setViewMode] = useState<'slider' | 'grid'>('slider');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flippedGridCards, setFlippedGridCards] = useState<Record<number, boolean>>({});
  const [learnedCards, setLearnedCards] = useState<Record<number, boolean>>({});

  const getSlugifiedTitle = (titleText: string) => {
    if (!titleText) return 'untitled';
    return titleText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 50);
  };

  const getFormattedDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleExportCSV = (flashcards: any[]) => {
    if (!flashcards || flashcards.length === 0) return;
    
    const escapeCSVField = (field: string | any) => {
      if (field === null || field === undefined) return '""';
      const stringVal = String(field);
      const escaped = stringVal.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const headers = ["Front", "Back", "Topic", "Difficulty"];
    const rows = flashcards.map(fc => [
      escapeCSVField(fc.front || ''),
      escapeCSVField(fc.back || ''),
      escapeCSVField(fc.topic || ''),
      escapeCSVField(fc.difficulty || '')
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const rawTitle = data.video?.title || data.title || 'analysis';
    const slug = getSlugifiedTitle(rawTitle);
    const dateStr = getFormattedDate();
    
    a.href = url;
    a.download = `astra-flashcards-${slug}-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTSV = (flashcards: any[]) => {
    if (!flashcards || flashcards.length === 0) return;

    const cleanTSVField = (field: string | any) => {
      if (field === null || field === undefined) return '';
      return String(field)
        .replace(/\t/g, ' ')
        .replace(/[\r\n]+/g, ' ');
    };

    const headers = ["Front", "Back", "Topic", "Difficulty"];
    const rows = flashcards.map(fc => [
      cleanTSVField(fc.front || ''),
      cleanTSVField(fc.back || ''),
      cleanTSVField(fc.topic || ''),
      cleanTSVField(fc.difficulty || '')
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\r\n');
    const blob = new Blob([tsvContent], { type: "text/tab-separated-values;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const rawTitle = data.video?.title || data.title || 'analysis';
    const slug = getSlugifiedTitle(rawTitle);
    const dateStr = getFormattedDate();
    
    a.href = url;
    a.download = `astra-flashcards-${slug}-${dateStr}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parsePoint = (point: string) => {
    let title = '';
    let description = point;

    const boldMatch = point.match(/^\*\*(.*?)\*\*:\s*(.*)/);
    if (boldMatch) {
      title = boldMatch[1];
      description = boldMatch[2];
    } else {
      const colonIndex = point.indexOf(':');
      if (colonIndex > 0 && colonIndex < 40) {
        title = point.substring(0, colonIndex).trim();
        description = point.substring(colonIndex + 1).trim();
      }
    }
    return { title, description };
  };

  const getImportantConcepts = (resData: AnalysisResult): string[] => {
    const conceptsSet = new Set<string>();

    if (resData.key_points && Array.isArray(resData.key_points)) {
      resData.key_points.forEach(point => {
        const { title } = parsePoint(point);
        if (title && title.length < 30) {
          conceptsSet.add(title);
        }
      });
    }

    const mindMap = resData.mind_map || (resData as any).mindMap;
    if (mindMap) {
      if (Array.isArray(mindMap)) {
        mindMap.forEach((item: any) => {
          if (typeof item === 'string' && item.length < 25) {
            conceptsSet.add(item);
          } else if (item && typeof item === 'object') {
            const name = item.topic || item.name || item.title;
            if (name && typeof name === 'string' && name.length < 25) {
              conceptsSet.add(name);
            }
          }
        });
      } else if (typeof mindMap === 'object') {
        const children = mindMap.children || mindMap.subtopics || (mindMap as any).nodes;
        if (children && Array.isArray(children)) {
          children.forEach((child: any) => {
            if (typeof child === 'string' && child.length < 25) {
              conceptsSet.add(child);
            } else if (child && typeof child === 'object') {
              const name = child.topic || child.name || child.title;
              if (name && typeof name === 'string' && name.length < 25) {
                conceptsSet.add(name);
              }
            }
          });
        }
      }
    }

    if (conceptsSet.size < 3 && resData.summary) {
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;
      let count = 0;
      while ((match = boldRegex.exec(resData.summary)) !== null && count < 8) {
        const concept = match[1].trim();
        if (concept && concept.length > 2 && concept.length < 25 && !concept.includes('\n')) {
          conceptsSet.add(concept);
          count++;
        }
      }
    }

    return Array.from(conceptsSet).filter(Boolean);
  };

  const handleCopyTranscript = () => {
    if (data.transcript) {
      navigator.clipboard.writeText(data.transcript);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleExportPDF = () => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      let y = 15;
      
      pdf.setFillColor(234, 88, 12);
      pdf.rect(0, 0, pageWidth, 6, 'F');
      y += 5;
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(15, 23, 42);
      const sectionTitle = lang === 'pt' ? 'Seu Resumo - Astra Learning' : lang === 'es' ? 'Tu Resumen - Astra Learning' : 'Your Summary - Astra Learning';
      pdf.text(sectionTitle, margin, y);
      y += 10;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(71, 85, 105);
      const videoTitleText = `${lang === 'pt' ? 'Vídeo' : lang === 'es' ? 'Video' : 'Video'}: ${data.video?.title || ''}`;
      const wrappedVideoTitle = pdf.splitTextToSize(videoTitleText, contentWidth);
      pdf.text(wrappedVideoTitle, margin, y);
      y += wrappedVideoTitle.length * 6 + 4;
      
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(234, 88, 12);
      pdf.text(lang === 'pt' ? 'Resumo geral' : lang === 'es' ? 'Resumen general' : 'General summary', margin, y);
      y += 8;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(51, 65, 85);
      
      const cleanSummary = (data.summary || (data as any).summaries?.detailed || '')
        .replace(/\*\*|__/g, '')
        .replace(/#+\s+/g, '')
        .replace(/-\s+/g, '• ');
        
      const wrappedSummary = pdf.splitTextToSize(cleanSummary, contentWidth);
      
      for (const line of wrappedSummary) {
        if (y > pageHeight - margin) {
          pdf.addPage();
          pdf.setFillColor(234, 88, 12);
          pdf.rect(0, 0, pageWidth, 6, 'F');
          y = 20;
        }
        pdf.text(line, margin, y);
        y += 5.5;
      }
      y += 10;
      
      if (data.key_points && data.key_points.length > 0) {
        if (y > pageHeight - margin - 30) {
          pdf.addPage();
          pdf.setFillColor(234, 88, 12);
          pdf.rect(0, 0, pageWidth, 6, 'F');
          y = 20;
        }
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(234, 88, 12);
        pdf.text(lang === 'pt' ? 'Principais aprendizados' : lang === 'es' ? 'Aprendizajes clave' : 'Key takeaways', margin, y);
        y += 8;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(51, 65, 85);
        
        for (const point of data.key_points) {
          const cleanPoint = '• ' + point.replace(/\*\*|__/g, '');
          const wrappedPoint = pdf.splitTextToSize(cleanPoint, contentWidth);
          
          if (y + (wrappedPoint.length * 5.5) > pageHeight - margin) {
            pdf.addPage();
            pdf.setFillColor(234, 88, 12);
            pdf.rect(0, 0, pageWidth, 6, 'F');
            y = 20;
          }
          
          for (const line of wrappedPoint) {
            pdf.text(line, margin, y);
            y += 5.5;
          }
          y += 2;
        }
      }
      
      const fileName = `${data.video?.title ? data.video.title.substring(0, 30).trim().replace(/[^a-zA-Z0-9]/g, '-') : 'resumo'}-resumo.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const [localMindMap, setLocalMindMap] = useState<any>(null);
  const [isGeneratingMindMap, setIsGeneratingMindMap] = useState(false);
  const [mindMapError, setMindMapError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (!isGeneratingMindMap) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % 4);
    }, 1800);
    return () => clearInterval(interval);
  }, [isGeneratingMindMap]);

  useEffect(() => {
    setLocalMindMap(data.mind_map || (data as any).mindMap || null);
    setIsGeneratingMindMap(false);
    setMindMapError(null);
  }, [data.video?.videoId, data.mind_map, (data as any).mindMap]);

  const handleGenerateMindMap = async () => {
    setIsGeneratingMindMap(true);
    setMindMapError(null);
    try {
      const response = await api.post('/generate-mindmap', {
        title: data.video?.title || "Video",
        summary: data.summary || "",
        keyTakeaways: data.key_points || [],
        actionableLessons: (data as any).actionable_lessons || (data as any).actionableLessons || [],
        transcript: data.transcript || "",
        fallbackReason: data.mode === 'metadata_fallback' ? (data.message || "Transcript unavailable") : "",
        lang: lang,
        targetLanguage: lang,
        explanationLevel: localStorage.getItem('astra_pref_level') || 'intermediate'
      });

      const result = response.data;
      if (result && result.mindMap) {
        setLocalMindMap(result.mindMap);
        data.mind_map = result.mindMap;
      } else {
        throw new Error("Invalid mind map payload");
      }
    } catch (error: any) {
      console.error("Failed to generate mind map:", error);
      let errMsg = error.message || t.mindMapError || "Não foi possível gerar o mapa mental. Tente novamente.";
      if (error.response?.data?.message) {
        errMsg = error.response.data.message;
      } else if (error.isHtmlResponse) {
        errMsg = lang === 'pt' ? "Sessão expirada ou cookies bloqueados. Por favor, recarregue a página." :
                 lang === 'es' ? "Sesión expirada o cookies bloqueadas. Por favor, recargue la página." :
                 "Session expired or cookies blocked. Please refresh the page.";
      }
      setMindMapError(errMsg);
    } finally {
      setIsGeneratingMindMap(false);
    }
  };

  useEffect(() => {
    setQuizQuestions([]);
    setHasGenerated(false);
    setQuizAnswers({});
    setShowResults(false);
    setQuizError(null);
    const savedCount = Number(localStorage.getItem('astra_pref_quiz_count')) || 5;
    setQuestionCount(savedCount);
  }, [data.video?.videoId]);

  const calculateScore = () => {
    let score = 0;
    quizQuestions.forEach((q, i) => {
      const correctAnswer = q.answer || (q as any).correctAnswer;
      if (quizAnswers[i] === correctAnswer) score++;
    });
    return score;
  };

  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    setQuizError(null);
    try {
      const content = data.transcript || data.summary || (data as any).summaries?.detailed || (data as any).summaries?.concise || data.key_points?.join("\n") || "";
      const questions = await generateExtraQuestions(data.video?.title || 'Unknown', content, lang || 'en', questionCount, selectedDifficulty);
      if (questions && questions.length > 0) {
        setQuizQuestions(questions);
        setHasGenerated(true);
        setQuizAnswers({});
        setShowResults(false);
      } else {
        throw new Error("No questions returned");
      }
    } catch (error) {
      console.error("Failed to generate quiz:", error);
      setQuizError(t.quizError || "Could not generate the quiz. Try again or analyze another video.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`border rounded-3xl overflow-hidden flex flex-col min-h-[600px] shadow-2xl transition-colors duration-300 ${isDarkMode ? 'bg-[#0d0d0d] border-white/5 shadow-black/50' : 'bg-white border-slate-200 shadow-2xl shadow-slate-900/10'}`}>
      {/* Tabs */}
      {showInternalTabs && (
        <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b p-1.5 gap-2 transition-colors ${isDarkMode ? 'border-white/5 bg-[#080808]' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(['summary', 'quiz', 'mindmap', 'tutor', 'transcript', 'flashcards'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 relative group overflow-hidden ${
                  activeTab === tab 
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' 
                    : isDarkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-slate-500 hover:text-slate-950 hover:bg-white font-medium'
                }`}
              >
                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute inset-0 bg-orange-600 -z-10"
                  />
                )}
                {tab === 'summary' && <BookOpen size={16} className={activeTab === tab ? 'animate-pulse' : ''} />}
                {tab === 'quiz' && <CheckCircle size={16} className={activeTab === tab ? 'animate-bounce' : ''} />}
                {tab === 'mindmap' && <BrainCircuit size={16} className={activeTab === tab ? 'rotate-12' : ''} />}
                {tab === 'tutor' && <MessageSquare size={16} className={activeTab === tab ? 'animate-pulse' : ''} />}
                {tab === 'transcript' && <FileText size={16} className={activeTab === tab ? 'animate-bounce' : ''} />}
                {tab === 'flashcards' && <Layers size={16} className={activeTab === tab ? 'animate-pulse' : ''} />}
                <span className="capitalize font-bold text-[10px] sm:text-xs tracking-widest">{t[tab]}</span>
              </button>
            ))}
          </div>
          <button 
            onClick={onClose}
            aria-label={t.closeAnalysis}
            title={t.closeAnalysis}
            className={`transition-all duration-200 flex items-center gap-2 font-semibold text-xs sm:text-sm px-4 py-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-xl ${
              isDarkMode 
                ? 'text-gray-400 hover:text-orange-500 dark:hover:text-white' 
                : 'text-slate-500 hover:text-orange-600'
            }`}
          >
            <span className="hidden md:inline">{t.closeAnalysis}</span>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header bar when showInternalTabs is false */}
      {!showInternalTabs && (
        <div className={`flex items-center justify-between border-b p-4 px-6 transition-colors ${isDarkMode ? 'border-white/5 bg-[#080808]' : 'border-slate-200 bg-slate-50/50'}`}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.8)]" />
            <span className={`text-xs font-mono tracking-[0.2em] font-bold uppercase ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
              {t[activeTab] || activeTab}
            </span>
          </div>
          <button 
            onClick={onClose}
            aria-label={t.closeAnalysis}
            title={t.closeAnalysis}
            className={`transition-all duration-200 flex items-center gap-2 font-semibold text-xs sm:text-sm px-4 py-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-xl ${
              isDarkMode 
                ? 'text-gray-400 hover:text-orange-500 dark:hover:text-white' 
                : 'text-slate-500 hover:text-orange-600'
            }`}
          >
            <span className="hidden md:inline">{t.closeAnalysis}</span>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className={`relative transition-all duration-300 ${
        (activeTab === 'mindmap' && localMindMap) 
          ? 'p-0' 
          : 'p-6 sm:p-10'
      } ${
        isDarkMode 
          ? 'bg-[radial-gradient(circle_at_50%_0%,rgba(255,100,0,0.03),transparent)]' 
          : 'bg-[radial-gradient(circle_at_50%_0%,rgba(255,100,0,0.035),transparent_45%),linear-gradient(to_bottom,#ffffff,#f8fafc)]'
      }`}>
        <AnimatePresence mode="wait">
          {activeTab === 'tutor' && (
            <motion.div
              key="tutor"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full flex flex-col items-center justify-center space-y-6"
            >
              <div className="text-center space-y-4 max-w-lg">
                <div className={`w-20 h-20 bg-orange-600/20 rounded-3xl flex items-center justify-center mx-auto border transition-colors ${isDarkMode ? 'border-orange-600/30' : 'border-orange-200'}`}>
                  <MessageSquare size={40} className="text-orange-500" />
                </div>
                <h2 className={`text-3xl font-black transition-colors ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>{t.interactiveTutor}</h2>
                <p className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>{t.tutorDesc}</p>
                <div className="flex flex-wrap justify-center gap-3 py-4">
                  <div className={`px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-500' : 'bg-slate-50 border-slate-200 text-slate-500 font-medium shadow-sm'}`}>
                    <Ear size={12} /> {t.lowLatency}
                  </div>
                  <div className={`px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-500' : 'bg-slate-50 border-slate-200 text-slate-500 font-medium shadow-sm'}`}>
                    <BrainCircuit size={12} /> {t.videoAware}
                  </div>
                </div>
              </div>

              <StudyTutor 
                videoTitle={data.video?.title || 'Unknown Video'} 
                videoId={data.video?.videoId || ''}
                transcript={data.transcript || ''} 
                onClose={() => setActiveTab('summary')}
                t={t}
                lang={lang}
                explanationLevel={preferences?.explanationLevel || 'intermediate'}
              />
            </motion.div>
          )}

          {activeTab === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`prose max-w-none ${isDarkMode ? 'prose-invert' : ''} prose-orange`}
            >
              {/* Cabeçalho do Resumo */}
              <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b transition-colors ${isDarkMode ? 'border-zinc-800/80' : 'border-slate-200'}`}>
                <div className="space-y-2 max-w-2xl">
                  <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight m-0 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t.summarySectionTitle}
                  </h2>
                  <p className={`text-sm m-0 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                    {t.summarySectionDesc}
                  </p>
                  <p className={`text-xs m-0 italic ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                    {data.mode === 'metadata_fallback' 
                      ? t.sourceMetadataDesc 
                      : t.sourceTranscriptDesc}
                  </p>
                </div>
                <div className="shrink-0 flex items-center">
                  <span className={`text-[11px] font-bold px-3.5 py-2 rounded-xl uppercase tracking-wider border flex items-center gap-1.5 ${
                    isDarkMode 
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
                      : 'bg-orange-50 text-orange-700 border-orange-100 shadow-sm'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    {data.mode === 'metadata_fallback' ? t.sourceMetadata : t.sourceTranscript}
                  </span>
                </div>
              </div>

              {/* Low confidence warning banner if confidence is low */}
              {data.sourceMetadata?.confidence === 'low' && (
                <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 border ${
                  isDarkMode 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                    : 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm'
                }`}>
                  <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                  <div className="text-xs sm:text-sm font-semibold leading-relaxed">
                    {lang === 'pt' 
                      ? 'A imagem foi analisada, mas parte do conteúdo pode não ter sido reconhecida com precisão.' 
                      : lang === 'es' 
                        ? 'La imagen fue analizada, pero parte del contenido puede no haberse reconocido con precisión.' 
                        : 'The image was analyzed, but some content may not have been recognized accurately.'}
                  </div>
                </div>
              )}

              <div className="space-y-8">
                {/* Resumo Geral */}
                <div className={`p-6 rounded-3xl border transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-zinc-900/30 border-zinc-800/80 hover:border-zinc-800' 
                    : 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-50/80 shadow-sm'
                }`}>
                  <h3 className={`text-lg font-extrabold tracking-tight mb-4 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t.generalSummaryTitle}
                  </h3>
                  <div className={`text-sm sm:text-base leading-relaxed max-w-none ${isDarkMode ? 'text-zinc-300 prose-invert' : 'text-slate-700'} prose prose-orange markdown-body`}>
                    <ReactMarkdown>
                      {data.summary || (data as any).summaries?.detailed || (data as any).summaries?.concise || t.noSummary}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Principais Aprendizados */}
                {data.key_points && data.key_points.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className={`text-lg font-extrabold tracking-tight transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {t.summaryKeyTakeaways}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.key_points.map((point, idx) => {
                        const { title, description } = parsePoint(point);
                        return (
                          <div 
                            key={idx} 
                            className={`p-5 rounded-2xl border flex gap-4 transition-all duration-300 hover:scale-[1.01] ${
                              isDarkMode 
                                ? 'bg-zinc-900/40 border-zinc-800/60 hover:border-orange-500/30 hover:bg-zinc-900/60' 
                                : 'bg-slate-50/80 border-slate-200/80 hover:border-orange-200 hover:bg-white shadow-sm'
                            }`}
                          >
                            <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl h-fit shrink-0">
                              <CheckCircle size={18} />
                            </div>
                            <div className="space-y-1">
                              {title ? (
                                <>
                                  <h5 className={`font-extrabold text-sm tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {title}
                                  </h5>
                                  <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
                                    {description}
                                  </p>
                                </>
                              ) : (
                                <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                                  {point}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (data as any).summaries?.actionable && (
                  <div className="space-y-4">
                    <h3 className={`text-lg font-extrabold tracking-tight transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {t.actionableLessons}
                    </h3>
                    <div className={`p-6 rounded-2xl border transition-colors ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="markdown-body">
                        <ReactMarkdown>{(data as any).summaries.actionable}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}

                {/* Conceitos Importantes */}
                {(() => {
                  const concepts = getImportantConcepts(data);
                  if (concepts.length === 0) return null;
                  return (
                    <div className="space-y-3">
                      <h3 className={`text-lg font-extrabold tracking-tight transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {t.importantConceptsTitle}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {concepts.map((concept, idx) => (
                          <div 
                            key={idx} 
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 hover:scale-105 ${
                              isDarkMode 
                                ? 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-orange-500/40 hover:text-white' 
                                : 'bg-slate-50 border border-slate-200 text-slate-700 hover:border-orange-300 hover:text-slate-900 shadow-sm'
                            }`}
                          >
                            {concept}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Continuar Estudando */}
                <div className="space-y-4">
                  <h3 className={`text-lg font-extrabold tracking-tight transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t.continueStudying}
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Gerar Quiz */}
                    <button
                      onClick={() => setActiveTab('quiz')}
                      className={`p-5 rounded-2xl border text-left flex flex-col justify-between gap-4 transition-all duration-300 hover:scale-[1.03] active:scale-95 group cursor-pointer ${
                        isDarkMode 
                          ? 'bg-zinc-900/40 border-zinc-800/60 hover:border-orange-500/30 hover:bg-zinc-900/60 shadow-md shadow-black/10' 
                          : 'bg-slate-50/80 border-slate-200/80 hover:border-orange-200 hover:bg-white shadow-sm hover:shadow-md shadow-slate-100'
                      }`}
                    >
                      <div className={`p-3 rounded-xl w-fit ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                        <CheckCircle size={20} className="transition-transform group-hover:rotate-12 duration-300" />
                      </div>
                      <div>
                        <h4 className={`font-bold text-sm tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {t.generateQuiz || 'Gerar Quiz'}
                        </h4>
                        <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                          {lang === 'pt' ? 'Teste seus conhecimentos.' : lang === 'es' ? 'Pon a prueba tus conocimientos.' : 'Test your knowledge.'}
                        </p>
                      </div>
                    </button>

                    {/* Criar Mapa Mental */}
                    <button
                      onClick={() => setActiveTab('mindmap')}
                      className={`p-5 rounded-2xl border text-left flex flex-col justify-between gap-4 transition-all duration-300 hover:scale-[1.03] active:scale-95 group cursor-pointer ${
                        isDarkMode 
                          ? 'bg-zinc-900/40 border-zinc-800/60 hover:border-orange-500/30 hover:bg-zinc-900/60 shadow-md shadow-black/10' 
                          : 'bg-slate-50/80 border-slate-200/80 hover:border-orange-200 hover:bg-white shadow-sm hover:shadow-md shadow-slate-100'
                      }`}
                    >
                      <div className={`p-3 rounded-xl w-fit ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                        <BrainCircuit size={20} className="transition-transform group-hover:scale-110 duration-300" />
                      </div>
                      <div>
                        <h4 className={`font-bold text-sm tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {t.generateMindMap || 'Criar Mapa Mental'}
                        </h4>
                        <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                          {lang === 'pt' ? 'Visualize conexões.' : lang === 'es' ? 'Visualizar conexiones.' : 'Visualize connections.'}
                        </p>
                      </div>
                    </button>

                    {/* Abrir Tutor */}
                    <button
                      onClick={() => setActiveTab('tutor')}
                      className={`p-5 rounded-2xl border text-left flex flex-col justify-between gap-4 transition-all duration-300 hover:scale-[1.03] active:scale-95 group cursor-pointer ${
                        isDarkMode 
                          ? 'bg-zinc-900/40 border-zinc-800/60 hover:border-orange-500/30 hover:bg-zinc-900/60 shadow-md shadow-black/10' 
                          : 'bg-slate-50/80 border-slate-200/80 hover:border-orange-200 hover:bg-white shadow-sm hover:shadow-md shadow-slate-100'
                      }`}
                    >
                      <div className={`p-3 rounded-xl w-fit ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                        <MessageSquare size={20} className="transition-transform group-hover:scale-110 duration-300" />
                      </div>
                      <div>
                        <h4 className={`font-bold text-sm tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {t.openTutor || 'Abrir Tutor'}
                        </h4>
                        <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                          {lang === 'pt' ? 'Tire dúvidas por voz.' : lang === 'es' ? 'Resuelve dudas por voz.' : 'Ask questions with voice.'}
                        </p>
                      </div>
                    </button>

                    {/* Exportar PDF */}
                    <button
                      onClick={handleExportPDF}
                      className={`p-5 rounded-2xl border text-left flex flex-col justify-between gap-4 transition-all duration-300 hover:scale-[1.03] active:scale-95 group cursor-pointer ${
                        isDarkMode 
                          ? 'bg-zinc-900/40 border-zinc-800/60 hover:border-orange-500/30 hover:bg-zinc-900/60 shadow-md shadow-black/10' 
                          : 'bg-slate-50/80 border-slate-200/80 hover:border-orange-200 hover:bg-white shadow-sm hover:shadow-md shadow-slate-100'
                      }`}
                    >
                      <div className={`p-3 rounded-xl w-fit ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                        <Download size={20} className="transition-transform group-hover:translate-y-0.5 duration-300" />
                      </div>
                      <div>
                        <h4 className={`font-bold text-sm tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {t.exportPdf || 'Exportar PDF'}
                        </h4>
                        <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                          {lang === 'pt' ? 'Baixar material offline.' : lang === 'es' ? 'Descargar material offline.' : 'Download offline material.'}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Accordion Transcrição */}
                <div className={`pt-6 border-t transition-colors ${isDarkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                  <div 
                    onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                    className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isTranscriptExpanded 
                        ? isDarkMode ? 'bg-zinc-900/20 border-orange-500/20' : 'bg-slate-50 border-orange-200 shadow-inner'
                        : isDarkMode ? 'bg-zinc-900/10 border-zinc-800/60 hover:border-zinc-800 hover:bg-zinc-900/20' : 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                        <FileText size={20} />
                      </div>
                      <div className="space-y-1">
                        <h4 className={`font-bold text-sm sm:text-base tracking-tight m-0 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {t.videoTranscriptTitle}
                        </h4>
                        <p className={`text-xs m-0 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                          {t.videoTranscriptDesc}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsTranscriptExpanded(!isTranscriptExpanded);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 border cursor-pointer ${
                        isDarkMode 
                          ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800' 
                          : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 shadow-sm'
                      }`}
                    >
                      {isTranscriptExpanded ? t.collapseTranscript : t.expandTranscript}
                      <ChevronRight size={14} className={`transition-transform duration-300 ${isTranscriptExpanded ? 'rotate-90 text-orange-500' : 'text-gray-400'}`} />
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {isTranscriptExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 p-4 border rounded-2xl relative space-y-4 transition-colors bg-zinc-950/20 border-zinc-800">
                          {data.transcript ? (
                            <>
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={handleCopyTranscript}
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    isDarkMode 
                                      ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800' 
                                      : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200'
                                  }`}
                                >
                                  {isCopied ? (
                                    <>
                                      <Check size={14} className="text-green-500" />
                                      {t.transcriptCopied}
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={14} />
                                      {t.copyTranscript}
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className={`p-4 rounded-xl border text-xs sm:text-sm leading-relaxed max-h-60 overflow-y-auto custom-scrollbar ${
                                isDarkMode ? 'bg-zinc-950/50 border-zinc-900/60 text-zinc-300' : 'bg-slate-100/50 border-slate-200 text-slate-700'
                              }`}>
                                {data.transcript}
                              </div>
                            </>
                          ) : (
                            <div className={`p-4 rounded-xl border text-xs sm:text-sm leading-relaxed text-center ${
                              isDarkMode ? 'bg-zinc-950/50 border-zinc-900/60 text-zinc-500' : 'bg-slate-100/50 border-slate-200 text-slate-500'
                            }`}>
                              {t.transcriptUnavailableDesc}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'quiz' && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              {!hasGenerated || quizQuestions.length === 0 ? (
                <div className={`p-8 rounded-3xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200 shadow-sm'} max-w-xl mx-auto space-y-6 text-center`}>
                  <div className="flex flex-col items-center space-y-3">
                    <div className="p-4 bg-orange-600/10 rounded-full text-orange-600">
                      <BrainCircuit size={40} className="animate-pulse" />
                    </div>
                    <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.quizGen || "Quiz Generation"}</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                      {t.quizGenerateDesc || "Choose how many questions you want to generate based on the video content."}
                    </p>
                  </div>

                  {quizError && (
                    <div className={`p-4 rounded-2xl border text-sm flex gap-3 items-center justify-center ${isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                      <AlertTriangle size={16} className="text-red-500" />
                      <span>{quizError}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className={`block text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                      {t.questionCount || "Number of questions"}
                    </label>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[5, 10, 15, 20, 25].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setQuestionCount(num)}
                          disabled={isGenerating}
                          className={`w-12 h-10 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                            questionCount === num
                              ? 'bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-600/25'
                              : isDarkMode
                                ? 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nível de dificuldade */}
                  <div className="space-y-3">
                    <label className={`block text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                      {lang === 'pt' ? 'NÍVEL DE DIFICULDADE' : lang === 'es' ? 'NIVEL DE DIFICULTAD' : 'DIFFICULTY LEVEL'}
                    </label>
                    <div className="flex flex-wrap justify-center gap-2">
                      {([
                        { value: 'basic', label: lang === 'pt' ? 'Básico' : lang === 'es' ? 'Básico' : 'Basic' },
                        { value: 'intermediate', label: lang === 'pt' ? 'Intermediário' : lang === 'es' ? 'Intermedio' : 'Intermediate' },
                        { value: 'advanced', label: lang === 'pt' ? 'Avançado' : lang === 'es' ? 'Avanzado' : 'Advanced' }
                      ] as const).map((diff) => (
                        <button
                          key={diff.value}
                          type="button"
                          onClick={() => setSelectedDifficulty(diff.value)}
                          disabled={isGenerating}
                          className={`px-4 h-10 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            selectedDifficulty === diff.value
                              ? 'bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-600/25'
                              : isDarkMode
                                ? 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
                          }`}
                        >
                          {diff.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateQuiz}
                    disabled={isGenerating}
                    className="w-full bg-orange-600 py-4 rounded-2xl font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        {t.generatingQuiz || "Generating quiz..."}
                      </>
                    ) : (
                      <>
                        <Zap size={20} className="fill-current" />
                        {t.generateQuiz || "Generate Quiz"}
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-6 border-b transition-colors ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                    <div className="space-y-1">
                      <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight m-0 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {lang === 'pt' ? 'Seu Quiz' : lang === 'es' ? 'Tu Quiz' : 'Your Quiz'}
                      </h2>
                      <p className={`text-sm m-0 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                        {lang === 'pt' ? 'Teste seus conhecimentos sobre os principais tópicos do vídeo.' : lang === 'es' ? 'Pon a prueba tus conocimientos sobre los temas principales del video.' : 'Test your knowledge on the main topics of the video.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${
                        isDarkMode ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-orange-50 text-orange-700 border border-orange-100'
                      }`}>
                        {lang === 'pt' ? 'Fonte: ' : lang === 'es' ? 'Fuente: ' : 'Source: '}
                        {data.mode === 'metadata_fallback' 
                          ? (lang === 'pt' ? 'metadados' : lang === 'es' ? 'metadatos' : 'metadata')
                          : (lang === 'pt' ? 'transcrição' : lang === 'es' ? 'transcripción' : 'transcript')}
                      </span>
                    </div>
                  </div>

                  {quizQuestions.map((q, i) => (
                    <div key={i} className="space-y-4">
                      <h3 className={`text-xl font-bold flex gap-3 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                        <span className="text-orange-600">Q{i + 1}.</span> {q.question}
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {q.options.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => !showResults && setQuizAnswers({ ...quizAnswers, [i]: opt })}
                            className={`w-full text-left p-4 rounded-2xl border transition-all ${
                              quizAnswers[i] === opt
                                ? showResults
                                  ? opt === (q.answer || (q as any).correctAnswer)
                                    ? 'bg-green-600/20 border-green-600 text-green-500'
                                    : 'bg-red-600/20 border-red-600 text-red-500'
                                  : 'bg-orange-600/20 border-orange-600 text-orange-500 shadow-sm shadow-orange-600/10'
                                : isDarkMode ? 'bg-white/5 border-white/5 text-gray-400' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80 shadow-sm'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      {showResults && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mt-4 p-4 rounded-xl border text-sm italic transition-colors ${isDarkMode ? 'bg-blue-600/10 border-blue-600/20 text-blue-400' : 'bg-blue-50/80 border-blue-200 text-blue-700'}`}>
                          <strong>{t.rationale}:</strong> {q.explanation}
                        </motion.div>
                      )}
                    </div>
                  ))}
                  
                  {!showResults ? (
                    <button
                      onClick={() => setShowResults(true)}
                      disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                      className="w-full bg-orange-600 py-4 rounded-2xl font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20"
                    >
                      <Trophy size={20} /> {t.finishQuiz}
                    </button>
                  ) : (
                    <div className="p-8 rounded-3xl bg-orange-600 flex flex-col items-center text-center space-y-4 shadow-xl shadow-orange-600/30">
                      <Trophy size={48} className="text-yellow-400 animate-bounce" />
                      <div className="space-y-1">
                        <h2 className="text-3xl font-black text-white">{t.yourScore}: {calculateScore()}/{quizQuestions.length}</h2>
                        <p className="opacity-90 font-medium text-white">{t.quizScoreMessage}</p>
                      </div>
                      <button 
                        onClick={() => { setShowResults(false); setQuizAnswers({}); }}
                        className="mt-4 px-8 py-3 bg-white text-orange-600 rounded-full font-bold hover:bg-gray-100 transition-colors shadow-lg"
                      >
                        {t.tryAgain}
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'mindmap' && (
            <motion.div
              key="mindmap"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full flex flex-col space-y-6"
            >
              {(() => {
                const mindMapTexts = {
                  pt: {
                    beforeTitle: "Clique para gerar o mapa mental.",
                    generatingTitle: "Gerando mapa mental...",
                    generatingSub: "Organizando os conceitos principais em uma estrutura visual.",
                    errorTitle: "Não foi possível gerar o mapa mental.",
                    btnGenerate: "Gerar Mapa Mental",
                    btnRegenerate: "Regerar Mapa",
                    btnRetry: "Tentar Novamente",
                    explTitle: "Exploração Interativa",
                    explDesc: "Arraste para mover, use o scroll para zoom. Clique nos nós com sinal de [+] para expandir ou recolher ramos.",
                    recenterBtn: "Centralizar"
                  },
                  en: {
                    beforeTitle: "Click to generate the mind map.",
                    generatingTitle: "Generating mind map...",
                    generatingSub: "Organizing the main concepts into a visual structure.",
                    errorTitle: "Could not generate the mind map.",
                    btnGenerate: "Generate Mind Map",
                    btnRegenerate: "Regenerate Map",
                    btnRetry: "Try Again",
                    explTitle: "Interactive Exploration",
                    explDesc: "Drag to pan, use scroll to zoom. Click nodes with [+] to expand or collapse branches.",
                    recenterBtn: "Recenter"
                  },
                  es: {
                    beforeTitle: "Haz clic para generar el mapa mental.",
                    generatingTitle: "Generando mapa mental...",
                    generatingSub: "Organizando los conceptos principales en una estructura visual.",
                    errorTitle: "No fue posible generar el mapa mental.",
                    btnGenerate: "Generar Mapa Mental",
                    btnRegenerate: "Regenerar Mapa",
                    btnRetry: "Intentar de Nuevo",
                    explTitle: "Exploración Interactiva",
                    explDesc: "Arrastra para mover, usa el scroll para zoom. Haz clic en los nodos con [+] para expandir o contraer ramas.",
                    recenterBtn: "Centrar"
                  }
                };

                const texts = mindMapTexts[lang as 'pt' | 'es' | 'en'] || mindMapTexts['en'];

                if (isGeneratingMindMap) {
                  const loadingStepsText = {
                    pt: [
                      "Analisando transcrição...",
                      "Gerando mapa mental...",
                      "Organizando tópicos...",
                      "Renderizando mapa..."
                    ],
                    en: [
                      "Analyzing transcript...",
                      "Generating mind map...",
                      "Organizing topics...",
                      "Rendering map..."
                    ],
                    es: [
                      "Analizando transcripción...",
                      "Generando mapa mental...",
                      "Organizando temas...",
                      "Renderizando mapa..."
                    ]
                  };
                  const stepTexts = loadingStepsText[lang as 'pt' | 'es' | 'en'] || loadingStepsText['en'];
                  const currentStepText = stepTexts[loadingStep];

                  return (
                    <div className={`flex flex-col items-center justify-center p-20 border border-dashed rounded-[3rem] transition-colors ${isDarkMode ? 'border-orange-500/20 bg-orange-950/5 text-gray-400' : 'border-orange-500/30 bg-orange-50/20 text-slate-700 shadow-inner'} min-h-[450px]`}>
                      <Loader2 size={48} className="mb-6 text-orange-500 animate-spin" />
                      <h3 className={`text-xl font-bold mb-2 text-center ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {currentStepText}
                      </h3>
                      <p className={`text-sm text-center max-w-md ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                        {texts.generatingSub}
                      </p>
                    </div>
                  );
                }

                if (mindMapError) {
                  return (
                    <div className={`flex flex-col items-center justify-center p-20 border border-dashed rounded-[3rem] transition-colors ${isDarkMode ? 'border-red-500/20 bg-red-950/5 text-gray-400' : 'border-red-500/30 bg-red-50/20 text-slate-700 shadow-inner'} min-h-[450px]`}>
                      <BrainCircuit size={48} className="mb-4 text-red-500" />
                      <p className={`text-center font-bold text-red-500 mb-6 max-w-md`}>
                        {texts.errorTitle}
                      </p>
                      <button 
                        onClick={handleGenerateMindMap}
                        className="px-8 py-3 bg-red-600 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-500 hover:scale-105 transition-all"
                      >
                        {texts.btnRetry}
                      </button>
                    </div>
                  );
                }

                if (localMindMap) {
                  return (
                    <div className="space-y-6 animate-fade-in">
                      <InteractiveMindMap 
                        data={localMindMap} 
                        centralTopic={data.video?.title}
                        isDarkMode={isDarkMode}
                        mode={data.mode}
                        lang={lang}
                        onRegenerate={handleGenerateMindMap}
                        videoTitle={data.video?.title}
                        summary={data.summary}
                        transcript={data.transcript}
                        explanationLevel={preferences?.explanationLevel || 'intermediate'}
                      />
                    </div>
                  );
                }

                // Antes de gerar state
                return (
                  <div className={`flex flex-col items-center justify-center p-20 border-2 border-dashed rounded-[3rem] transition-colors ${isDarkMode ? 'border-white/10 text-gray-500' : 'border-slate-300 text-slate-500 bg-slate-50/50'} min-h-[450px]`}>
                    <BrainCircuit size={54} className="mb-6 text-orange-500 opacity-85 animate-pulse" />
                    <h3 className={`text-lg font-bold mb-6 text-center max-w-lg ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      {texts.beforeTitle}
                    </h3>
                    <button
                      onClick={handleGenerateMindMap}
                      className="px-10 py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-600/30 hover:shadow-orange-600/50 hover:scale-105 transition-all flex items-center gap-3"
                    >
                      <Zap size={14} className="fill-current animate-bounce" />
                      {texts.btnGenerate}
                    </button>
                  </div>
                );
              })()}

            </motion.div>
          )}

          {activeTab === 'transcript' && (
            <motion.div
              key="transcript"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className={`flex items-center justify-between gap-3 mb-6 pb-4 border-b transition-colors ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.8)]" />
                  <span className="text-[10px] font-mono text-orange-600 tracking-[0.2em] font-bold uppercase">{t.rawTranscript}</span>
                </div>
                <button 
                  onClick={() => {
                    const blob = new Blob([data.transcript || ''], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${data.video?.title || 'transcript'}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className={`px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm'}`}
                >
                  {t.downloadTxt}
                </button>
              </div>
              <div className={`p-8 rounded-[2rem] border transition-colors leading-relaxed opacity-80 text-sm sm:text-base ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                {data.transcript || t.noTranscript}
              </div>
            </motion.div>
          )}

          {activeTab === 'flashcards' && (
            <motion.div
              key="flashcards"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {(() => {
                const flashcards = data.flashcards || [];

                const flashcardTexts = {
                  pt: {
                    title: "Flashcards do Astra",
                    subtitle: "Pratique e memorize os conceitos chaves com cartões interativos.",
                    front: "Frente",
                    back: "Verso",
                    flip: "Clique no cartão para revelar a resposta",
                    prev: "Anterior",
                    next: "Próximo",
                    difficulty: "Dificuldade",
                    topic: "Tópico",
                    basic: "Básico",
                    intermediate: "Intermediário",
                    advanced: "Avançado",
                    viewGrid: "Grade",
                    viewSlider: "Fichas",
                    noFlashcards: "Não há flashcards para exportar.",
                    statsProgress: "Progresso",
                    flipButton: "Virar card",
                    showAnswer: "Ver resposta",
                    showQuestion: "Ver pergunta",
                    markReviewed: "Marcar como revisado",
                    noAnswer: "Resposta não disponível para este flashcard.",
                    questionLabel: "Pergunta",
                    answerLabel: "Resposta"
                  },
                  en: {
                    title: "Astra Flashcards",
                    subtitle: "Practice and memorize key concepts with interactive cards.",
                    front: "Front",
                    back: "Back",
                    flip: "Click on the card to flip and reveal the answer",
                    prev: "Previous",
                    next: "Next",
                    difficulty: "Difficulty",
                    topic: "Topic",
                    basic: "Basic",
                    intermediate: "Intermediate",
                    advanced: "Advanced",
                    viewGrid: "Grid",
                    viewSlider: "Slider",
                    noFlashcards: "There are no flashcards to export.",
                    statsProgress: "Progress",
                    flipButton: "Flip card",
                    showAnswer: "Show answer",
                    showQuestion: "Show question",
                    markReviewed: "Mark as reviewed",
                    noAnswer: "Answer not available for this flashcard.",
                    questionLabel: "Question",
                    answerLabel: "Answer"
                  },
                  es: {
                    title: "Flashcards de Astra",
                    subtitle: "Practica y memoriza los conceptos clave con tarjetas interactivas.",
                    front: "Frente",
                    back: "Reverso",
                    flip: "Haz clic en la tarjeta para revelar a respuesta",
                    prev: "Anterior",
                    next: "Siguiente",
                    difficulty: "Dificultad",
                    topic: "Tema",
                    basic: "Básico",
                    intermediate: "Intermedio",
                    advanced: "Avanzado",
                    viewGrid: "Cuadrícula",
                    viewSlider: "Deslizador",
                    noFlashcards: "No hay flashcards para exportar.",
                    statsProgress: "Progreso",
                    flipButton: "Girar tarjeta",
                    showAnswer: "Ver respuesta",
                    showQuestion: "Ver pregunta",
                    markReviewed: "Marcar como revisado",
                    noAnswer: "Respuesta no disponible para este flashcard.",
                    questionLabel: "Pregunta",
                    answerLabel: "Respuesta"
                  }
                }[lang as 'pt' | 'en' | 'es'] || {
                  title: "Astra Flashcards",
                  subtitle: "Practice and memorize key concepts with interactive cards.",
                  front: "Front",
                  back: "Back",
                  flip: "Click on the card to flip and reveal the answer",
                  prev: "Previous",
                  next: "Next",
                  difficulty: "Difficulty",
                  topic: "Topic",
                  basic: "Basic",
                  intermediate: "Intermediate",
                  advanced: "Advanced",
                  viewGrid: "Grid",
                  viewSlider: "Slider",
                  noFlashcards: "There are no flashcards to export.",
                  statsProgress: "Progress",
                  flipButton: "Flip card",
                  showAnswer: "Show answer",
                  showQuestion: "Show question",
                  markReviewed: "Mark as reviewed",
                  noAnswer: "Answer not available for this flashcard.",
                  questionLabel: "Question",
                  answerLabel: "Answer"
                };

                if (flashcards.length === 0) {
                  return (
                    <div className={`flex flex-col items-center justify-center p-20 border-2 border-dashed rounded-[3rem] transition-colors ${isDarkMode ? 'border-white/10 text-gray-500' : 'border-slate-300 text-slate-500 bg-slate-50/50'} min-h-[350px]`}>
                      <Layers size={54} className="mb-6 text-orange-500 opacity-80" />
                      <h3 className={`text-lg font-bold mb-2 text-center ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                        {flashcardTexts.noFlashcards}
                      </h3>
                    </div>
                  );
                }

                const currentCard = flashcards[currentCardIndex];
                const learnedCount = Object.keys(learnedCards).filter(k => learnedCards[Number(k)]).length;
                const progressPercentage = Math.round((learnedCount / flashcards.length) * 100);

                const handleNext = () => {
                  setIsFlipped(false);
                  setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
                };

                const handlePrev = () => {
                  setIsFlipped(false);
                  setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
                };

                const toggleLearned = (idx: number, e: React.MouseEvent) => {
                  e.stopPropagation();
                  setLearnedCards(prev => ({
                    ...prev,
                    [idx]: !prev[idx]
                  }));
                };

                const getDifficultyBadge = (difficulty: string) => {
                  const colors = {
                    basic: isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    intermediate: isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200',
                    advanced: isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200'
                  }[difficulty as 'basic' | 'intermediate' | 'advanced'] || (isDarkMode ? 'bg-zinc-500/15 text-zinc-400' : 'bg-zinc-100 text-zinc-700');

                  const labels = {
                    basic: flashcardTexts.basic,
                    intermediate: flashcardTexts.intermediate,
                    advanced: flashcardTexts.advanced
                  }[difficulty as 'basic' | 'intermediate' | 'advanced'] || difficulty;

                  return (
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${colors}`}>
                      {labels}
                    </span>
                  );
                };

                return (
                  <div className="space-y-6">
                    {/* Flashcards Header */}
                    <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b transition-colors ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                      <div>
                        <h2 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                          <Layers size={22} className="text-orange-500" />
                          {flashcardTexts.title}
                        </h2>
                        <p className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                          {flashcardTexts.subtitle}
                        </p>
                      </div>

                      {/* Controls Area */}
                      <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
                        {/* Export Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleExportCSV(flashcards)}
                            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                              isDarkMode
                                ? 'bg-zinc-900 border-white/5 hover:border-orange-500/50 hover:text-orange-400 text-zinc-300'
                                : 'bg-white border-slate-200 hover:border-orange-500/50 hover:text-orange-600 text-slate-700 shadow-sm'
                            }`}
                          >
                            <Download size={13} className="text-orange-500" />
                            <span>{lang === 'pt' ? 'Exportar CSV' : lang === 'es' ? 'Exportar CSV' : 'Export CSV'}</span>
                          </button>
                          
                          <button
                            onClick={() => handleExportTSV(flashcards)}
                            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                              isDarkMode
                                ? 'bg-zinc-900 border-white/5 hover:border-orange-500/50 hover:text-orange-400 text-zinc-300'
                                : 'bg-white border-slate-200 hover:border-orange-500/50 hover:text-orange-600 text-slate-700 shadow-sm'
                            }`}
                          >
                            <Download size={13} className="text-orange-500" />
                            <span>{lang === 'pt' ? 'Exportar TSV' : lang === 'es' ? 'Exportar TSV' : 'Export TSV'}</span>
                          </button>
                        </div>

                        {/* View Mode Switcher */}
                        <div className={`flex p-1 rounded-xl border ${isDarkMode ? 'bg-[#121216] border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                          <button
                            onClick={() => setViewMode('slider')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                              viewMode === 'slider'
                                ? 'bg-orange-600 text-white shadow'
                                : isDarkMode ? 'text-zinc-500 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {flashcardTexts.viewSlider}
                          </button>
                          <button
                            onClick={() => setViewMode('grid')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                              viewMode === 'grid'
                                ? 'bg-orange-600 text-white shadow'
                                : isDarkMode ? 'text-zinc-500 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {flashcardTexts.viewGrid}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Help/Export Banner */}
                    <div className={`p-4 rounded-[1.5rem] border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      isDarkMode 
                        ? 'bg-[#121216]/40 border-white/5 text-zinc-400' 
                        : 'bg-orange-50/20 border-orange-200/40 text-slate-600'
                    }`}>
                      <div className="flex items-start gap-2.5">
                        <Sparkles size={16} className="text-orange-500 shrink-0 mt-0.5" />
                        <div>
                          <p className={`font-semibold ${isDarkMode ? 'text-zinc-200' : 'text-slate-800'}`}>
                            {lang === 'pt' 
                              ? 'Exporte em CSV ou TSV para importar seus flashcards no Anki.' 
                              : lang === 'es' 
                                ? 'Exporta en CSV o TSV para importar tus flashcards en Anki.' 
                                : 'Export as CSV or TSV to import your flashcards into Anki.'}
                          </p>
                          <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                            💡 {lang === 'pt' 
                              ? 'TSV costuma funcionar melhor para importação simples no Anki.' 
                              : lang === 'es' 
                                ? 'TSV suele funcionar mejor para importaciones simples en Anki.' 
                                : 'TSV usually works best for simple Anki imports.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress tracker */}
                    <div className={`p-4 rounded-2xl border transition-colors ${isDarkMode ? 'bg-zinc-950/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-center text-xs font-semibold mb-2">
                        <span className={isDarkMode ? 'text-zinc-400' : 'text-slate-600'}>
                          {flashcardTexts.statsProgress}: {learnedCount} / {flashcards.length} ({progressPercentage}%)
                        </span>
                      </div>
                      <div className={`h-2 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'}`}>
                        <motion.div 
                          className="h-full bg-gradient-to-r from-orange-600 to-orange-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercentage}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>

                    {/* Render Selected Mode */}
                    {viewMode === 'slider' ? (
                      <div className="flex flex-col items-center justify-center space-y-6 py-4">
                        {/* 3D Flip Card Container */}
                        <div className="w-full max-w-2xl [perspective:1000px] h-80 sm:h-96">
                          <motion.div
                            onClick={() => setIsFlipped(!isFlipped)}
                            initial={false}
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="w-full h-full relative [transform-style:preserve-3d] cursor-pointer"
                          >
                            {/* FRONT SIDE */}
                            <div className={`absolute inset-0 w-full h-full p-6 rounded-3xl border flex flex-col justify-between [backface-visibility:hidden] shadow-xl ${
                              isDarkMode 
                                ? 'bg-[#0f0f12] border-white/10 text-white' 
                                : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/50'
                            }`}>
                              {/* Topo layout */}
                              <div className="flex justify-between items-center gap-2 border-b border-zinc-800/10 dark:border-white/5 pb-3">
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="text-[11px] font-bold text-orange-500 uppercase tracking-wider">
                                    {lang === 'pt' ? `Card ${currentCardIndex + 1} de ${flashcards.length}` : lang === 'es' ? `Tarjeta ${currentCardIndex + 1} de ${flashcards.length}` : `Card ${currentCardIndex + 1} of ${flashcards.length}`}
                                  </span>
                                  <span className={`text-[11px] font-medium truncate max-w-[150px] sm:max-w-[200px] ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
                                    {currentCard.topic}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  {getDifficultyBadge(currentCard.difficulty)}
                                  <button
                                    onClick={(e) => toggleLearned(currentCardIndex, e)}
                                    className={`px-2 py-1 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] font-bold ${
                                      learnedCards[currentCardIndex]
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                                        : isDarkMode 
                                          ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white' 
                                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800'
                                    }`}
                                    title={flashcardTexts.markReviewed}
                                  >
                                    <Check size={11} className={learnedCards[currentCardIndex] ? "stroke-[3px]" : ""} />
                                    <span className="hidden sm:inline">{flashcardTexts.markReviewed}</span>
                                  </button>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const textToCopy = `${flashcardTexts.questionLabel}:\n${currentCard.front}\n\n${flashcardTexts.answerLabel}:\n${currentCard.back || flashcardTexts.noAnswer}\n\n${flashcardTexts.topic}:\n${currentCard.topic}\n\n${flashcardTexts.difficulty}:\n${currentCard.difficulty}`;
                                      navigator.clipboard.writeText(textToCopy);
                                    }}
                                    className={`p-1 rounded-lg border transition-all ${
                                      isDarkMode 
                                        ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white' 
                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800'
                                    }`}
                                    title={lang === 'pt' ? 'Copiar Flashcard' : lang === 'es' ? 'Copiar Flashcard' : 'Copy Flashcard'}
                                  >
                                    <Copy size={11} />
                                  </button>
                                </div>
                              </div>

                              {/* Centro layout */}
                              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                                <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold mb-3">
                                  {flashcardTexts.front}
                                </span>
                                <h3 className="text-base sm:text-lg md:text-xl font-bold leading-relaxed max-w-lg">
                                  {currentCard.front}
                                </h3>
                              </div>

                              <div className={`text-[10px] font-mono text-center tracking-widest uppercase transition-opacity duration-300 ${isDarkMode ? 'text-zinc-600' : 'text-slate-400'}`}>
                                {flashcardTexts.flip}
                              </div>
                            </div>

                            {/* BACK SIDE */}
                            <div className={`absolute inset-0 w-full h-full p-6 rounded-3xl border flex flex-col justify-between [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-xl ${
                              isDarkMode 
                                ? 'bg-orange-950/20 border-orange-500/20 text-white' 
                                : 'bg-orange-50/50 border-orange-200/60 text-slate-800 shadow-slate-200/50'
                            }`}>
                              {/* Topo layout */}
                              <div className="flex justify-between items-center gap-2 border-b border-zinc-800/10 dark:border-white/5 pb-3 [transform:rotateY(180deg)]">
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="text-[11px] font-bold text-orange-500 uppercase tracking-wider">
                                    {lang === 'pt' ? `Card ${currentCardIndex + 1} de ${flashcards.length}` : lang === 'es' ? `Tarjeta ${currentCardIndex + 1} de ${flashcards.length}` : `Card ${currentCardIndex + 1} of ${flashcards.length}`}
                                  </span>
                                  <span className={`text-[11px] font-medium truncate max-w-[150px] sm:max-w-[200px] ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
                                    {currentCard.topic}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  {getDifficultyBadge(currentCard.difficulty)}
                                  <button
                                    onClick={(e) => toggleLearned(currentCardIndex, e)}
                                    className={`px-2 py-1 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] font-bold ${
                                      learnedCards[currentCardIndex]
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                                        : isDarkMode 
                                          ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white' 
                                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800'
                                    }`}
                                    title={flashcardTexts.markReviewed}
                                  >
                                    <Check size={11} className={learnedCards[currentCardIndex] ? "stroke-[3px]" : ""} />
                                    <span className="hidden sm:inline">{flashcardTexts.markReviewed}</span>
                                  </button>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const textToCopy = `${flashcardTexts.questionLabel}:\n${currentCard.front}\n\n${flashcardTexts.answerLabel}:\n${currentCard.back || flashcardTexts.noAnswer}\n\n${flashcardTexts.topic}:\n${currentCard.topic}\n\n${flashcardTexts.difficulty}:\n${currentCard.difficulty}`;
                                      navigator.clipboard.writeText(textToCopy);
                                    }}
                                    className={`p-1 rounded-lg border transition-all ${
                                      isDarkMode 
                                        ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white' 
                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800'
                                    }`}
                                    title={lang === 'pt' ? 'Copiar Flashcard' : lang === 'es' ? 'Copiar Flashcard' : 'Copy Flashcard'}
                                  >
                                    <Copy size={11} />
                                  </button>
                                </div>
                              </div>

                              {/* Centro layout */}
                              <div className="flex-1 flex flex-col items-center justify-center text-center px-4 [transform:rotateY(180deg)]">
                                <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold mb-3">
                                  {flashcardTexts.back}
                                </span>
                                <p className="text-sm leading-relaxed max-w-lg font-medium">
                                  {currentCard.back ? currentCard.back : <span className="text-zinc-500 italic">{flashcardTexts.noAnswer}</span>}
                                </p>
                              </div>

                              <div className={`text-[10px] font-mono text-center tracking-widest uppercase [transform:rotateY(180deg)] ${isDarkMode ? 'text-orange-500/40' : 'text-orange-600/40'}`}>
                                {flashcardTexts.flip}
                              </div>
                            </div>
                          </motion.div>
                        </div>

                        {/* Primary Flip Button */}
                        <button
                          onClick={() => setIsFlipped(!isFlipped)}
                          className="px-6 py-3 rounded-2xl text-sm font-extrabold bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer mt-2"
                        >
                          <RefreshCw size={15} className={`transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`} />
                          <span>{flashcardTexts.flipButton}</span>
                        </button>

                        {/* Slider navigation controls */}
                        <div className="flex items-center gap-6 mt-2">
                          <button
                            onClick={handlePrev}
                            className={`px-4 py-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold ${
                              isDarkMode 
                                ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800' 
                                : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-sm'
                            }`}
                          >
                            <ChevronLeft size={14} />
                            <span>{flashcardTexts.prev}</span>
                          </button>

                          <span className={`text-xs font-mono font-bold tracking-widest ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                            {currentCardIndex + 1} / {flashcards.length}
                          </span>

                          <button
                            onClick={handleNext}
                            className={`px-4 py-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold ${
                              isDarkMode 
                                ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800' 
                                : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-sm'
                            }`}
                          >
                            <span>{flashcardTexts.next}</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Grid View */
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
                        {flashcards.map((card, idx) => {
                          const isCardFlipped = !!flippedGridCards[idx];
                          const isCardLearned = !!learnedCards[idx];
                          return (
                            <div key={idx} className="[perspective:1000px] h-80">
                              <motion.div
                                onClick={() => {
                                  setFlippedGridCards(prev => ({
                                    ...prev,
                                    [idx]: !prev[idx]
                                  }));
                                }}
                                initial={false}
                                animate={{ rotateY: isCardFlipped ? 180 : 0 }}
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                                className="w-full h-full relative [transform-style:preserve-3d] cursor-pointer"
                              >
                                {/* Grid Card FRONT */}
                                <div className={`absolute inset-0 w-full h-full p-5 rounded-2xl border flex flex-col justify-between [backface-visibility:hidden] shadow ${
                                  isDarkMode 
                                    ? 'bg-[#0f0f12] border-white/10 text-white' 
                                    : 'bg-white border-slate-200 text-slate-800 shadow-slate-100'
                                }`}>
                                  {/* Header */}
                                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800/10 dark:border-white/5">
                                    <span className={`text-[10px] font-mono tracking-widest uppercase ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'} font-bold`}>
                                      {flashcardTexts.front}
                                    </span>
                                    
                                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                      {/* Copy button */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const textToCopy = `${flashcardTexts.questionLabel}:\n${card.front}\n\n${flashcardTexts.answerLabel}:\n${card.back || flashcardTexts.noAnswer}\n\n${flashcardTexts.topic}:\n${card.topic}\n\n${flashcardTexts.difficulty}:\n${card.difficulty}`;
                                          navigator.clipboard.writeText(textToCopy);
                                        }}
                                        className={`p-1 rounded-lg border transition-all ${
                                          isDarkMode 
                                            ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white' 
                                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800'
                                        }`}
                                        title={lang === 'pt' ? 'Copiar Flashcard' : lang === 'es' ? 'Copiar Flashcard' : 'Copy Flashcard'}
                                      >
                                        <Copy size={11} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-3 overflow-hidden">
                                    <span className="text-[9px] font-bold uppercase text-orange-500 tracking-wider mb-1">
                                      {card.topic}
                                    </span>
                                    <h4 className="text-xs font-bold leading-relaxed max-h-[85px] overflow-y-auto no-scrollbar">
                                      {card.front}
                                    </h4>
                                    
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFlippedGridCards(prev => ({ ...prev, [idx]: true }));
                                      }}
                                      className="mt-2.5 w-full py-1.5 px-3 rounded-xl bg-orange-600/10 hover:bg-orange-600 text-orange-600 hover:text-white dark:text-orange-400 dark:hover:text-white dark:bg-orange-500/10 text-[10px] font-bold transition-all border border-orange-500/20"
                                    >
                                      {flashcardTexts.showAnswer}
                                    </button>
                                  </div>

                                  {/* Footer */}
                                  <div className="flex justify-between items-center pt-2 border-t border-zinc-800/10 dark:border-white/5">
                                    {getDifficultyBadge(card.difficulty)}
                                    <button
                                      onClick={(e) => toggleLearned(idx, e)}
                                      className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] font-bold ${
                                        isCardLearned
                                          ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
                                          : isDarkMode 
                                            ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white' 
                                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800'
                                      }`}
                                    >
                                      <Check size={11} className={isCardLearned ? "stroke-[3px]" : ""} />
                                      <span>{isCardLearned ? (lang === 'pt' ? 'Revisado' : lang === 'es' ? 'Revisado' : 'Reviewed') : flashcardTexts.markReviewed}</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Grid Card BACK */}
                                <div className={`absolute inset-0 w-full h-full p-5 rounded-2xl border [backface-visibility:hidden] [transform:rotateY(180deg)] shadow ${
                                  isDarkMode 
                                    ? 'bg-[#151210] border-orange-500/10 text-white' 
                                    : 'bg-orange-50/35 border-orange-200/50 text-slate-800 shadow-slate-100'
                                }`}>
                                  <div className="flex flex-col justify-between h-full w-full [transform:rotateY(180deg)]">
                                    {/* Header */}
                                    <div className="flex justify-between items-center pb-2 border-b border-orange-500/10">
                                      <span className="text-[10px] font-mono tracking-widest uppercase text-orange-500 font-bold">
                                        {flashcardTexts.back}
                                      </span>
                                      
                                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        {/* Copy button */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const textToCopy = `${flashcardTexts.questionLabel}:\n${card.front}\n\n${flashcardTexts.answerLabel}:\n${card.back || flashcardTexts.noAnswer}\n\n${flashcardTexts.topic}:\n${card.topic}\n\n${flashcardTexts.difficulty}:\n${card.difficulty}`;
                                            navigator.clipboard.writeText(textToCopy);
                                          }}
                                          className={`p-1 rounded-lg border transition-all ${
                                            isDarkMode 
                                              ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white' 
                                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800'
                                          }`}
                                          title={lang === 'pt' ? 'Copiar Flashcard' : lang === 'es' ? 'Copiar Flashcard' : 'Copy Flashcard'}
                                        >
                                          <Copy size={11} />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-3 overflow-hidden">
                                      <span className="text-[9px] font-bold uppercase text-orange-500 tracking-wider mb-1">
                                        {card.topic}
                                      </span>
                                      <p className="text-xs leading-relaxed max-h-[85px] overflow-y-auto no-scrollbar font-medium">
                                        {card.back ? card.back : <span className="text-zinc-500 italic">{flashcardTexts.noAnswer}</span>}
                                      </p>
                                      
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setFlippedGridCards(prev => ({ ...prev, [idx]: false }));
                                        }}
                                        className="mt-2.5 w-full py-1.5 px-3 rounded-xl bg-orange-600/15 hover:bg-orange-600 text-orange-600 hover:text-white dark:text-orange-400 dark:hover:text-white text-[10px] font-bold transition-all border border-orange-500/20"
                                      >
                                        {flashcardTexts.showQuestion}
                                      </button>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex justify-between items-center pt-2 border-t border-orange-500/10">
                                      {getDifficultyBadge(card.difficulty)}
                                      <button
                                        onClick={(e) => toggleLearned(idx, e)}
                                        className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] font-bold ${
                                          isCardLearned
                                            ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
                                            : isDarkMode 
                                              ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white' 
                                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800'
                                        }`}
                                      >
                                        <Check size={11} className={isCardLearned ? "stroke-[3px]" : ""} />
                                        <span>{isCardLearned ? (lang === 'pt' ? 'Revisado' : lang === 'es' ? 'Revisado' : 'Reviewed') : flashcardTexts.markReviewed}</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
