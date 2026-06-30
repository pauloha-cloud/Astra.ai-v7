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
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnalysisResult, generateExtraQuestions } from '../services/geminiService';
import { StudyTutor } from './StudyTutor';
import { InteractiveMindMap } from './InteractiveMindMap';

interface Props {
  data: AnalysisResult;
  onClose: () => void;
  isDarkMode?: boolean;
  t: any;
  lang?: string;
  activeTab?: 'summary' | 'quiz' | 'mindmap' | 'tutor' | 'transcript';
  setActiveTab?: (tab: 'summary' | 'quiz' | 'mindmap' | 'tutor' | 'transcript') => void;
  showInternalTabs?: boolean;
}

export const AnalysisResultView = ({ 
  data, 
  onClose, 
  isDarkMode = true, 
  t, 
  lang = 'en',
  activeTab: externalActiveTab,
  setActiveTab: externalSetActiveTab,
  showInternalTabs = true
}: Props) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'summary' | 'quiz' | 'mindmap' | 'tutor' | 'transcript'>('summary');
  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = externalSetActiveTab || setInternalActiveTab;
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  const [localMindMap, setLocalMindMap] = useState<any>(null);
  const [isGeneratingMindMap, setIsGeneratingMindMap] = useState(false);
  const [mindMapError, setMindMapError] = useState<string | null>(null);

  useEffect(() => {
    setLocalMindMap(data.mind_map || (data as any).mindMap || null);
    setIsGeneratingMindMap(false);
    setMindMapError(null);
  }, [data.video?.videoId, data.mind_map, (data as any).mindMap]);

  const handleGenerateMindMap = async () => {
    setIsGeneratingMindMap(true);
    setMindMapError(null);
    try {
      const response = await fetch('/api/generate-mindmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: data.video?.title || "Video",
          summary: data.summary || "",
          keyTakeaways: data.key_points || [],
          actionableLessons: (data as any).actionable_lessons || (data as any).actionableLessons || [],
          transcript: data.transcript || "",
          fallbackReason: data.mode === 'metadata_fallback' ? (data.message || "Transcript unavailable") : "",
          lang: lang
        })
      });

      if (!response.ok) {
        let errMsg = "";
        try {
          const errData = await response.json();
          errMsg = errData.message;
        } catch (_) {}
        throw new Error(errMsg || "Failed to generate mind map");
      }

      const result = await response.json();
      if (result.mindMap) {
        setLocalMindMap(result.mindMap);
        data.mind_map = result.mindMap;
      } else {
        throw new Error("Invalid mind map payload");
      }
    } catch (error: any) {
      console.error("Failed to generate mind map:", error);
      setMindMapError(error.message || t.mindMapError || "Não foi possível gerar o mapa mental. Tente novamente.");
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
      const questions = await generateExtraQuestions(data.video?.title || 'Unknown', content, lang || 'en', questionCount);
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
      {/* Fallback Banner */}
      {data.mode === 'metadata_fallback' && (
        <div className={`border-b px-6 py-4 flex flex-col gap-2 ${isDarkMode ? 'bg-orange-600/10 border-orange-600/20' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={14} className="text-orange-500 shrink-0" />
            <p className={`text-[10px] font-bold uppercase tracking-widest leading-none ${isDarkMode ? 'text-orange-500' : 'text-orange-700'}`}>
              {data.message || t.fallbackTranscript}
            </p>
          </div>
          {data.limitations && data.limitations.length > 0 && (
            <ul className="pl-7 space-y-1">
              {data.limitations.map((lim, idx) => (
                <li key={idx} className={`text-[9px] list-disc ${isDarkMode ? 'text-orange-400 opacity-80' : 'text-orange-600 font-medium'}`}>{lim}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Tabs */}
      {showInternalTabs && (
        <div className={`flex border-b p-1.5 transition-colors ${isDarkMode ? 'border-white/5 bg-[#080808]' : 'border-slate-200 bg-slate-50'}`}>
          {(['summary', 'quiz', 'mindmap', 'tutor', 'transcript'] as const).map((tab) => (
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
              <span className="capitalize font-bold text-[10px] sm:text-xs tracking-widest">{t[tab]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content Area */}
      <div className={`p-6 sm:p-10 relative ${isDarkMode ? 'bg-[radial-gradient(circle_at_50%_0%,rgba(255,100,0,0.03),transparent)]' : 'bg-[radial-gradient(circle_at_50%_0%,rgba(255,100,0,0.035),transparent_45%),linear-gradient(to_bottom,#ffffff,#f8fafc)]'}`}>
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
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b transition-colors ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.8)]" />
                  <span className="text-[10px] font-mono text-orange-600 tracking-[0.2em] font-bold uppercase">{t.synthesizedInsight}</span>
                </div>
              </div>
              <div className="space-y-8">
                <div className="markdown-body">
                  <ReactMarkdown>
                    {data.summary || (data as any).summaries?.detailed || (data as any).summaries?.concise || t.noSummary}
                  </ReactMarkdown>
                </div>
                
                {data.key_points && data.key_points.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-widest text-orange-600">{t.keyTakeaways}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.key_points.map((point, idx) => (
                        <div key={idx} className={`p-4 rounded-2xl border flex gap-3 transition-colors ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
                          <CheckCircle size={16} className="text-orange-600 shrink-0 mt-0.5" />
                          <p className="text-sm leading-relaxed">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (data as any).summaries?.actionable && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-widest text-orange-600">{t.actionableLessons}</h4>
                    <div className={`p-6 rounded-2xl border transition-colors ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="markdown-body">
                        <ReactMarkdown>{(data as any).summaries.actionable}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collapsible Transcript Section */}
                {!showInternalTabs && data.transcript && (
                  <div className={`mt-8 pt-6 border-t transition-colors ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                    <details className="group">
                      <summary className={`flex items-center justify-between cursor-pointer list-none font-bold text-sm sm:text-base ${isDarkMode ? 'text-gray-200 hover:text-white' : 'text-slate-800 hover:text-slate-950'}`}>
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-orange-600" />
                          <span>{t.transcript}</span>
                        </div>
                        <ChevronRight size={16} className="transition-transform group-open:rotate-90 text-orange-600" />
                      </summary>
                      <div className="mt-4">
                        <div className={`p-6 rounded-2xl border text-xs sm:text-sm leading-relaxed max-h-60 overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                          {data.transcript}
                        </div>
                      </div>
                    </details>
                  </div>
                )}
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
                    <div className="flex justify-center gap-2">
                      {[5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setQuestionCount(num)}
                          disabled={isGenerating}
                          className={`w-10 h-10 rounded-xl border text-sm font-bold transition-all ${
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
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.8)]" />
                      <span className="text-[10px] font-mono text-orange-600 tracking-[0.2em] font-bold uppercase">{t.quizGen}</span>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.8)]" />
                  <span className="text-[10px] font-mono text-orange-600 tracking-[0.2em] font-bold uppercase">Visual Neural Map</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-600/10 border border-orange-600/20 rounded-full">
                  <Zap size={10} className="text-orange-500 fill-current" />
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Pro Preview</span>
                </div>
              </div>              {(() => {
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
                  return (
                    <div className={`flex flex-col items-center justify-center p-20 border border-dashed rounded-[3rem] transition-colors ${isDarkMode ? 'border-orange-500/20 bg-orange-950/5 text-gray-400' : 'border-orange-500/30 bg-orange-50/20 text-slate-700 shadow-inner'} min-h-[450px]`}>
                      <Loader2 size={48} className="mb-6 text-orange-500 animate-spin" />
                      <h3 className={`text-xl font-bold mb-2 text-center ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {texts.generatingTitle}
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
                    <div className="space-y-6">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={handleGenerateMindMap}
                          className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                            isDarkMode 
                              ? 'bg-orange-600/10 border-orange-500/20 text-orange-400 hover:bg-orange-600/20' 
                              : 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 shadow-sm'
                          }`}
                        >
                          <Zap size={12} className="fill-current" />
                          {texts.btnRegenerate}
                        </button>
                      </div>
                      
                      <InteractiveMindMap 
                        data={localMindMap} 
                        centralTopic={data.video?.title}
                        isDarkMode={isDarkMode}
                      />
                      
                      <div className={`p-6 rounded-3xl border transition-colors ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-slate-50 border-slate-200 text-slate-600 shadow-sm'}`}>
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-orange-600/10 rounded-xl mt-1">
                            <Maximize2 size={16} className="text-orange-500" />
                          </div>
                          <div>
                            <h4 className={`font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>{texts.explTitle}</h4>
                            <p className="text-sm opacity-80 leading-relaxed font-medium">
                              {texts.explDesc}
                            </p>
                          </div>
                        </div>
                      </div>
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

              <div className={`mt-8 p-8 border border-dashed rounded-[2rem] transition-all ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div className="space-y-1">
                    <h4 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                      Advanced Mind Map Tools
                      <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-orange-600 text-white rounded-full">Coming Soon</span>
                    </h4>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{t.proFeaturesDesc || "Planned Pro features for deep visual learning."}</p>
                  </div>
                  <button className="px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-600/20 hover:scale-105 transition-transform">
                    Join Pro Waitlist
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { icon: <Edit2 size={14} />, label: "Node Editing", desc: "Modify text and reorder nodes" },
                    { icon: <Layout size={14} />, label: "Advanced Branching", desc: "Collapse and expand branches" },
                    { icon: <Download size={14} />, label: "Export as Image", desc: "High-quality PNG/SVG for study" },
                    { icon: <FileJson size={14} />, label: "Export as JSON", desc: "Structured data for other tools" },
                    { icon: <Save size={14} />, label: "Save Custom Maps", desc: "Cloud sync and persistent storage" },
                    { icon: <Zap size={14} />, label: "AI Map Expansion", desc: "Deepen nodes with AI context" },
                  ].map((feature, i) => (
                    <div key={i} className={`p-4 rounded-2xl border transition-all flex items-start gap-4 ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div className="p-2 bg-orange-600/10 rounded-xl text-orange-500">
                        {feature.icon}
                      </div>
                      <div className="space-y-0.5">
                        <span className={`text-[10px] font-bold tracking-wide ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>{feature.label}</span>
                        <p className={`text-[9px] opacity-60 leading-tight ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
        </AnimatePresence>
      </div>

      <div className={`p-4 border-t flex justify-end transition-colors ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
        <button onClick={onClose} className={`transition-colors flex items-center gap-2 font-medium text-sm ${isDarkMode ? 'text-gray-500 hover:text-white' : 'text-slate-500 hover:text-slate-950 font-semibold'}`}>
          {t.closeAnalysis} <X size={16} />
        </button>
      </div>
    </div>
  );
};
