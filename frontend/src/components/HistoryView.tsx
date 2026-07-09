import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Search, 
  X, 
  Youtube, 
  MoreVertical, 
  Trash2, 
  ChevronRight, 
  Play,
  Filter,
  FileText,
  HelpCircle,
  Network,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Inbox
} from 'lucide-react';

interface HistoryViewProps {
  history: any[];
  isDarkMode: boolean;
  t: any;
  currentLang: 'pt' | 'en' | 'es';
  onOpenItem: (item: any) => void;
  setConfirmModalType: (type: 'delete_item' | 'clear_all') => void;
  setIsConfirmModalOpen: (open: boolean) => void;
  setItemToDelete: (item: any) => void;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  setDashboardSubView: (view: 'panel' | 'history' | 'settings') => void;
  onGoToPanel?: () => void;
}

const DICTIONARY = {
  pt: {
    history: "Histórico",
    subtitle: "Consulte seus vídeos analisados anteriormente.",
    searchPlaceholder: "Pesquisar histórico...",
    filterAll: "Todos",
    filterSummary: "Resumo",
    filterQuiz: "Quiz",
    filterMindMap: "Mapa Mental",
    filterTutor: "Tutor",
    clearHistory: "Limpar histórico",
    openAnalysis: "Abrir análise",
    openBtn: "Abrir",
    removeFromHistory: "Remover do histórico",
    noHistoryTitle: "Nenhum histórico ainda",
    noHistoryDesc: "Analise seu primeiro vídeo para que ele apareça aqui.",
    btnGoToPanel: "Ir para o Painel",
    noResultsTitle: "Nenhum resultado encontrado",
    noResultsDesc: "Tente ajustar sua busca ou remover os filtros aplicados.",
    btnClearFilters: "Limpar busca e filtros",
    sourceMetadata: "Fonte: metadados",
    sourceTranscript: "Fonte: transcrição",
    astraV3: "Astra AI v3",
    showingRecent: "Mostrando os vídeos recentes.",
  },
  en: {
    history: "History",
    subtitle: "Review your previously analyzed videos.",
    searchPlaceholder: "Search history...",
    filterAll: "All",
    filterSummary: "Summary",
    filterQuiz: "Quiz",
    filterMindMap: "Mind Map",
    filterTutor: "Tutor",
    clearHistory: "Clear history",
    openAnalysis: "Open analysis",
    openBtn: "Open",
    removeFromHistory: "Remove from history",
    noHistoryTitle: "No history yet",
    noHistoryDesc: "Analyze your first video and it will appear here.",
    btnGoToPanel: "Go to Dashboard",
    noResultsTitle: "No results found",
    noResultsDesc: "Try adjusting your search or removing the applied filters.",
    btnClearFilters: "Clear search and filters",
    sourceMetadata: "Source: metadata",
    sourceTranscript: "Source: transcript",
    astraV3: "Astra AI v3",
    showingRecent: "Showing recent videos.",
  },
  es: {
    history: "Historial",
    subtitle: "Consulta tus videos analizados anteriormente.",
    searchPlaceholder: "Buscar historial...",
    filterAll: "Todos",
    filterSummary: "Resumen",
    filterQuiz: "Cuestionario",
    filterMindMap: "Mapa Mental",
    filterTutor: "Tutor",
    clearHistory: "Limpiar historial",
    openAnalysis: "Abrir análisis",
    openBtn: "Abrir",
    removeFromHistory: "Eliminar del historial",
    noHistoryTitle: "Aún no hay historial",
    noHistoryDesc: "Analiza tu primer video y aparecerá aquí.",
    btnGoToPanel: "Ir al Panel",
    noResultsTitle: "No se encontraron resultados",
    noResultsDesc: "Intenta ajustar tu búsqueda o eliminar los filtros aplicados.",
    btnClearFilters: "Limpiar búsqueda y filtros",
    sourceMetadata: "Fuente: metadatos",
    sourceTranscript: "Fuente: transcripción",
    astraV3: "Astra AI v3",
    showingRecent: "Mostrando los videos recientes.",
  }
};

export function HistoryView({
  history,
  isDarkMode,
  t,
  currentLang,
  onOpenItem,
  setConfirmModalType,
  setIsConfirmModalOpen,
  setItemToDelete,
  activeMenuId,
  setActiveMenuId,
  setDashboardSubView,
  onGoToPanel
}: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'summary' | 'quiz' | 'mind_map' | 'tutor'>('all');

  const lang = DICTIONARY[currentLang] || DICTIONARY.en;

  // Filter history based on search query AND active chip filter
  const filteredHistory = history.filter(item => {
    // 1. Search filter (title, channel, transcript text)
    const title = item.video?.title || item.title || '';
    const channel = item.video?.channel || '';
    const transcriptText = item.transcript || '';
    
    const matchesSearch = 
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transcriptText.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Chip type filter
    if (activeFilter === 'all') return true;
    if (activeFilter === 'summary') return !!(item.summary || item.key_points);
    if (activeFilter === 'quiz') return !!(item.quiz && (Array.isArray(item.quiz) ? item.quiz.length > 0 : Object.keys(item.quiz).length > 0));
    if (activeFilter === 'mind_map') return !!item.mind_map;
    if (activeFilter === 'tutor') return !!(item.tutor_questions && item.tutor_questions.length > 0);

    return true;
  });

  // Reset filters helper
  const handleClearFilters = () => {
    setSearchQuery('');
    setActiveFilter('all');
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      
      {/* 1. Cabeçalho da página (Header Section) */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-zinc-200/50 dark:border-zinc-800/50"
      >
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-orange-500/10 rounded-2xl text-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.1)]">
              <History size={24} />
            </div>
            <span>{lang.history}</span>
          </h1>
          <p className={`text-sm italic font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
            {lang.subtitle}
          </p>
        </div>

        {/* Clear History Secondary Trigger */}
        {history.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setConfirmModalType('clear_all');
              setIsConfirmModalOpen(true);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
              isDarkMode 
                ? 'border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 hover:border-red-500/35' 
                : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700'
            }`}
          >
            <Trash2 size={13} />
            <span>{lang.clearHistory}</span>
          </motion.button>
        )}
      </motion.div>

      {/* Main Container when we actually have history data */}
      {history.length > 0 ? (
        <div className="space-y-6">
          
          {/* 2. Barra de busca e filtros */}
          <div className="flex flex-col gap-4">
            
            {/* Search and chip container */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              
              {/* Search input: 4 cols on medium */}
              <div className="relative group md:col-span-5 w-full">
                <input 
                  type="text"
                  placeholder={lang.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-10 py-3 rounded-2xl text-xs sm:text-sm outline-none transition-all border ${
                    isDarkMode 
                      ? 'bg-zinc-950/60 border-zinc-800/80 text-white focus:border-orange-500 focus:bg-zinc-900/60 focus:ring-1 focus:ring-orange-500/20 shadow-inner' 
                      : 'bg-white border-slate-200 text-slate-950 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:shadow-sm'
                  }`}
                />
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                  isDarkMode ? 'text-zinc-500 group-focus-within:text-orange-500' : 'text-slate-400 group-focus-within:text-orange-500'
                }`}>
                  <Search size={15} />
                </div>
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 transition-colors ${
                      isDarkMode ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filters list of chips: 7 cols on medium */}
              <div className="md:col-span-7 flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                <div className={`p-1 rounded-2xl flex items-center gap-1 ${isDarkMode ? 'bg-zinc-900/40' : 'bg-slate-100/80'}`}>
                  
                  {/* Todo / All */}
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeFilter === 'all'
                        ? 'bg-orange-500 text-white shadow-sm font-bold'
                        : isDarkMode
                          ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    {lang.filterAll}
                  </button>

                  {/* Resumo / Summary */}
                  <button
                    onClick={() => setActiveFilter('summary')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeFilter === 'summary'
                        ? 'bg-orange-500 text-white shadow-sm font-bold'
                        : isDarkMode
                          ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <FileText size={12} />
                    <span>{lang.filterSummary}</span>
                  </button>

                  {/* Quiz */}
                  <button
                    onClick={() => setActiveFilter('quiz')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeFilter === 'quiz'
                        ? 'bg-orange-500 text-white shadow-sm font-bold'
                        : isDarkMode
                          ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <HelpCircle size={12} />
                    <span>{lang.filterQuiz}</span>
                  </button>

                  {/* Mapa Mental */}
                  <button
                    onClick={() => setActiveFilter('mind_map')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeFilter === 'mind_map'
                        ? 'bg-orange-500 text-white shadow-sm font-bold'
                        : isDarkMode
                          ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <Network size={12} />
                    <span>{lang.filterMindMap}</span>
                  </button>

                  {/* Tutor */}
                  <button
                    onClick={() => setActiveFilter('tutor')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeFilter === 'tutor'
                        ? 'bg-orange-500 text-white shadow-sm font-bold'
                        : isDarkMode
                          ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <MessageSquare size={12} />
                    <span>{lang.filterTutor}</span>
                  </button>

                </div>
              </div>

            </div>
          </div>

          {/* 3. Lista de vídeos analisados (History List) */}
          <div className="space-y-4">
            {filteredHistory.length > 0 ? (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredHistory.map((item) => {
                  const hasTranscript = !!item.transcript;
                  const channelTitle = item.video?.channel || 'Astra Learning AI';
                  const title = item.video?.title || item.title || '';
                  const thumbnail = item.video?.thumbnail || item.thumbnail;
                  const ts = item.lastAnalyzedAt || item.createdAt;
                  const formattedDate = ts ? new Date(ts.toDate?.() || ts).toLocaleDateString(currentLang === 'pt' ? 'pt-BR' : currentLang === 'es' ? 'es-ES' : 'en-US') : '';

                  // Extract active feature flags to show custom badges
                  const features = [];
                  if (item.summary || item.key_points) features.push(lang.filterSummary);
                  if (item.quiz && (Array.isArray(item.quiz) ? item.quiz.length > 0 : Object.keys(item.quiz).length > 0)) features.push(lang.filterQuiz);
                  if (item.mind_map) features.push(lang.filterMindMap);
                  if (item.tutor_questions && item.tutor_questions.length > 0) features.push(lang.filterTutor);

                  return (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      onClick={() => onOpenItem(item)}
                      className={`group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-300 relative ${
                        isDarkMode 
                          ? 'bg-zinc-950/40 border-zinc-800/60 hover:border-orange-500/40 hover:bg-zinc-900/40 hover:shadow-xl hover:shadow-black/20' 
                          : 'bg-white border-slate-200/80 hover:border-orange-300 shadow-sm shadow-slate-900/5 hover:shadow-md'
                      }`}
                    >
                      {/* Video Thumbnail left */}
                      <div className={`w-full sm:w-32 h-36 sm:h-20 rounded-xl overflow-hidden shrink-0 relative ${isDarkMode ? 'bg-zinc-900/60' : 'bg-slate-100'}`}>
                        <img 
                          src={thumbnail} 
                          alt="" 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" 
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/0 transition-colors">
                          <div className="p-1.5 rounded-lg bg-red-600/90 text-white scale-90 group-hover:scale-110 group-hover:bg-red-600 transition-all shadow-md">
                            <Youtube size={16} />
                          </div>
                        </div>
                      </div>

                      {/* Video Information middle */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <h4 className={`font-bold text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-orange-500 transition-colors ${
                          isDarkMode ? 'text-zinc-100' : 'text-slate-900'
                        }`}>
                          {title}
                        </h4>
                        
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                          <span className={`font-semibold ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
                            {channelTitle}
                          </span>
                          <span className={isDarkMode ? 'text-zinc-700' : 'text-slate-200'}>•</span>
                          <span className={`${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                            {formattedDate}
                          </span>
                        </div>

                        {/* Badges: Source badge and micro-features */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {/* Dynamic Source badge */}
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-tight border ${
                            hasTranscript 
                              ? isDarkMode 
                                ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' 
                                : 'bg-orange-50 border-orange-100 text-orange-700'
                              : isDarkMode 
                                ? 'bg-zinc-800/60 border-zinc-700 text-zinc-400' 
                                : 'bg-slate-100 border-slate-200 text-slate-600'
                          }`}>
                            {hasTranscript ? lang.sourceTranscript : lang.sourceMetadata}
                          </span>

                          {/* Mini feature chips */}
                          {features.map((feat, idx) => (
                            <span 
                              key={idx}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border ${
                                isDarkMode 
                                  ? 'bg-zinc-900/60 border-zinc-800/40 text-zinc-500' 
                                  : 'bg-slate-50 border-slate-200/50 text-slate-500'
                              }`}
                            >
                              {feat}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right-side action buttons */}
                      <div className="flex items-center justify-end gap-2.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-200/40 dark:border-zinc-800/40 shrink-0" onClick={(e) => e.stopPropagation()}>
                        
                        {/* Inline Open Action button */}
                        <button
                          onClick={() => onOpenItem(item)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            isDarkMode 
                              ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800/80' 
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200/50'
                          }`}
                        >
                          <span>{lang.openBtn}</span>
                          <ChevronRight size={13} className="text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
                        </button>

                        {/* Three Dots Menu */}
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === item.id ? null : item.id);
                            }}
                            className={`p-2 rounded-xl transition-all cursor-pointer ${
                              isDarkMode 
                                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white border border-transparent hover:border-zinc-800' 
                                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-transparent hover:border-slate-200'
                            }`}
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          <AnimatePresence>
                            {activeMenuId === item.id && (
                              <>
                                {/* Backdrop */}
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setActiveMenuId(null)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                  className={`absolute right-0 mt-1.5 w-44 rounded-xl shadow-xl border p-1 z-20 transition-colors ${
                                    isDarkMode 
                                      ? 'bg-zinc-950 border-zinc-800 text-white shadow-black/60' 
                                      : 'bg-white border-slate-200 text-slate-800 shadow-slate-100/50'
                                  }`}
                                >
                                  {/* Open Analysis Option */}
                                  <button
                                    onClick={() => {
                                      onOpenItem(item);
                                      setActiveMenuId(null);
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left cursor-pointer ${
                                      isDarkMode ? 'hover:bg-zinc-900 text-zinc-200' : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    <Play size={13} className="text-zinc-500" />
                                    {lang.openAnalysis}
                                  </button>
                                  
                                  {/* Delete option */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setItemToDelete(item);
                                      setConfirmModalType('delete_item');
                                      setIsConfirmModalOpen(true);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-all text-left cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                    {lang.removeFromHistory}
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>

                      </div>

                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* 8. Estado sem resultado de busca (Search / Filter Not Found) */
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-12 sm:p-16 rounded-3xl border flex flex-col items-center justify-center text-center space-y-4 ${
                  isDarkMode ? 'bg-[#0B0C10]/40 border-zinc-800/80' : 'bg-white border-slate-200 shadow-xl shadow-slate-900/5'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.1)]">
                  <Search size={30} />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h3 className={`font-bold text-lg ${isDarkMode ? 'text-zinc-200' : 'text-slate-800'}`}>
                    {lang.noResultsTitle}
                  </h3>
                  <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                    {lang.noResultsDesc}
                  </p>
                </div>
                <button 
                  onClick={handleClearFilters} 
                  className={`px-5 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                    isDarkMode 
                      ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-white hover:border-zinc-700' 
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                  }`}
                >
                  <Filter size={13} />
                  {lang.btnClearFilters}
                </button>
              </motion.div>
            )}
          </div>

        </div>
      ) : (
        /* 7. Estado vazio (History Empty State) */
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-12 sm:p-20 rounded-[2.5rem] border flex flex-col items-center justify-center text-center space-y-5 ${
            isDarkMode ? 'bg-[#0B0C10]/40 border-zinc-800/60' : 'bg-white border-slate-200 shadow-xl shadow-slate-900/5'
          }`}
        >
          <div className="w-20 h-20 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-[0_0_30px_rgba(234,88,12,0.15)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Inbox size={40} className="relative z-10 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div className="space-y-2 max-w-sm">
            <h3 className={`font-bold text-xl tracking-tight ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
              {lang.noHistoryTitle}
            </h3>
            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
              {lang.noHistoryDesc}
            </p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (onGoToPanel) {
                onGoToPanel();
              } else {
                setDashboardSubView('panel');
              }
            }}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-600/20 flex items-center gap-2 cursor-pointer transition-all"
          >
            <span>{lang.btnGoToPanel}</span>
            <ArrowRight size={15} />
          </motion.button>
        </motion.div>
      )}

    </div>
  );
}
