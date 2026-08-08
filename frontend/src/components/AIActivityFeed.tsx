import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Network, 
  Puzzle, 
  Layers, 
  Brain, 
  Sparkles,
  Search,
  Clock,
  Play,
  X
} from 'lucide-react';

interface ActivityItem {
  title: string;
  desc: string;
  type: string;
  status?: string;
}

interface AIActivityFeedProps {
  isDarkMode: boolean;
  lang?: string;
  onPlayDemoRef?: (fn: (e?: React.MouseEvent | React.KeyboardEvent) => void) => void;
  t: {
    title: string;
    subtitle: string;
    now: string;
    recent: string;
    ago2: string;
    ago5: string;
    supportingMsg?: string;
    items: ActivityItem[];
  };
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'summary': return FileText;
    case 'mindmap': return Network;
    case 'quiz': return Puzzle;
    case 'flashcards': return Layers;
    case 'tutor': return Brain;
    case 'rec': return Sparkles;
    default: return Search;
  }
};

const ActivityItemComponent = ({ 
  item, 
  isDarkMode, 
  index, 
  timestamp 
}: { 
  item: ActivityItem, 
  isDarkMode: boolean, 
  index: number,
  timestamp: string
}) => {
  const Icon = getActivityIcon(item.type);
  const isNew = index === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.02, translateY: -4 }}
      className={`relative group p-5 rounded-2xl border transition-all duration-300 ${
        isDarkMode 
          ? 'bg-black/40 border-white/5 hover:border-orange-500/30' 
          : 'bg-white border-black/5 hover:border-orange-500/20 shadow-sm'
      }`}
    >
      {/* Background radial gradient on hover */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${
        isDarkMode 
          ? 'bg-[radial-gradient(circle_at_50%_0%,rgba(234,88,12,0.1),transparent_70%)]' 
          : 'bg-[radial-gradient(circle_at_50%_0%,rgba(234,88,12,0.05),transparent_70%)]'
      }`} />

      <div className="flex gap-4 relative z-10">
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
          isDarkMode ? 'bg-orange-500/10' : 'bg-orange-500/5'
        }`}>
          <Icon className="w-6 h-6 text-orange-500" />
        </div>

        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-start mb-1 gap-2">
            <h4 className={`text-sm font-bold truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              {item.title}
            </h4>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {item.status ? (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded border bg-orange-500/10 border-orange-500/20">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
                  </span>
                  <span className="text-[9px] font-mono font-bold tracking-wider text-orange-500 uppercase">{item.status}</span>
                </div>
              ) : (
                <>
                  {isNew && (
                    <div className="flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                      </span>
                      <span className="text-[9px] font-black tracking-tighter text-orange-500/80 uppercase">LIVE</span>
                    </div>
                  )}
                  <span className={`text-[10px] font-mono flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Clock className="w-2.5 h-2.5" />
                    {timestamp}
                  </span>
                </>
              )}
            </div>
          </div>
          <p className={`text-xs leading-relaxed line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {item.desc}
          </p>
        </div>
      </div>

      {/* Subtle bottom accent line */}
      <div className={`absolute bottom-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-orange-500/0 to-transparent transition-all duration-500 group-hover:via-orange-500/40 group-hover:left-2 group-hover:right-2`} />
    </motion.div>
  );
};

const playAriaLabels: Record<string, string> = {
  pt: "Assistir vídeo demonstrativo do Astra",
  en: "Watch Astra demo video",
  es: "Ver video demostrativo de Astra"
};

const iframeTitles: Record<string, string> = {
  pt: "Vídeo demonstrativo do Astra Learning",
  en: "Astra Learning demo video",
  es: "Video demostrativo de Astra Learning"
};

export const AIActivityFeed = ({ isDarkMode, t, lang, onPlayDemoRef }: AIActivityFeedProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const currentLang = (lang as 'pt' | 'en' | 'es') || 'pt';

  const playLabel = playAriaLabels[currentLang] || playAriaLabels.pt;
  const videoTitle = iframeTitles[currentLang] || iframeTitles.pt;

  const timestamps = [t.now, t.ago2, t.ago5, t.recent, t.recent, t.recent];

  const handlePlayVideo = useCallback((e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Smooth scroll to video section considering header height
    const el = videoContainerRef.current || document.getElementById('demo-video-container');
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }

    // Open video player modal if not open
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (onPlayDemoRef) {
      onPlayDemoRef(handlePlayVideo);
    }
  }, [onPlayDemoRef, handlePlayVideo]);

  // Esc key closure handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-20">
        <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] ${isDarkMode ? 'bg-orange-900/10' : 'bg-orange-500/5'}`} />
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[120px] ${isDarkMode ? 'bg-orange-900/10' : 'bg-orange-500/5'}`} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4 ${
              isDarkMode ? 'bg-orange-500/5 border-orange-500/10' : 'bg-orange-500/5 border-orange-500/20'
            }`}
          >
            <Sparkles className="w-3 h-3 text-orange-500" />
            <span className="text-[10px] font-black tracking-widest text-orange-500 uppercase">Astra Learning AI Engine</span>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className={`text-3xl md:text-4xl section-heading-typography mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
          >
            {t.title}
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className={`max-w-2xl mx-auto text-sm md:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
          >
            {t.subtitle}
          </motion.p>
        </div>

        {/* Video Block Area */}
        <motion.div
          id="demo-video-container"
          ref={videoContainerRef}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-4xl mx-auto mb-16 scroll-mt-28"
        >
          <div
            onClick={handlePlayVideo}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handlePlayVideo(e);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={playLabel}
            className={`group relative aspect-video w-full overflow-hidden rounded-3xl border cursor-pointer transition-all duration-500 shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              isDarkMode 
                ? 'border-white/10 bg-black/40 hover:border-orange-500/40 hover:shadow-orange-500/5 shadow-black/40' 
                : 'border-slate-200/80 bg-white hover:border-orange-500/30 hover:shadow-orange-500/5 shadow-slate-200/50'
            }`}
          >
            {/* Glowing ambient background on hover */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10 ${
              isDarkMode 
                ? 'bg-gradient-to-t from-orange-500/5 to-transparent' 
                : 'bg-gradient-to-t from-orange-500/2 to-transparent'
            }`} />

            {/* Thumbnail Image */}
            <img
              src={thumbError ? "https://img.youtube.com/vi/rND6AqYkOEA/hqdefault.jpg" : "https://img.youtube.com/vi/rND6AqYkOEA/maxresdefault.jpg"}
              alt="Astra Learning Video Thumbnail"
              onError={() => setThumbError(true)}
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />

            {/* Overlay to dim thumbnail */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-500" />

            {/* Play Button Container */}
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="relative">
                {/* Outer pulsing ring */}
                <div className="absolute -inset-4 rounded-full bg-orange-600/35 animate-ping opacity-60 pointer-events-none" />
                {/* Second pulsing ring */}
                <div className="absolute -inset-2 rounded-full bg-orange-600/20 animate-pulse pointer-events-none" />
                
                {/* Play Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayVideo(e);
                  }}
                  aria-label={playLabel}
                  className="relative w-16 h-16 sm:w-20 sm:h-20 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-xl hover:bg-orange-500 active:scale-95 transition-all duration-300 animate-fade-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current ml-1" />
                </button>
              </div>
            </div>

            {/* Video duration or preview badge in corner */}
            <div className="absolute bottom-4 right-4 z-20 px-2.5 py-1 rounded-lg text-[10px] font-mono tracking-widest bg-black/60 backdrop-blur-md text-white border border-white/10 uppercase font-bold">
              01:15
            </div>
          </div>
        </motion.div>

        {/* Workflow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {t.items.map((item, index) => (
            <ActivityItemComponent 
              key={index} 
              item={item} 
              isDarkMode={isDarkMode} 
              index={index}
              timestamp={timestamps[index] || t.recent}
            />
          ))}
        </div>

        {t.supportingMsg && (
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className={`text-center text-xs sm:text-sm mt-10 max-w-2xl mx-auto italic font-medium leading-relaxed ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            "{t.supportingMsg}"
          </motion.p>
        )}
      </div>

      {/* Modal Video Player */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with fade-in and click-to-close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl aspect-video rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0c0c0e] overflow-hidden shadow-2xl shadow-black/80 z-10"
            >
              {/* Close Button Inside the Top-Right Corner */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full border border-white/15 hover:border-white/30 transition-all z-50 hover:scale-105 active:scale-95"
                title={lang === 'pt' ? "Fechar" : lang === 'es' ? "Cerrar" : "Close"}
              >
                <X className="w-5 h-5" />
              </button>

              {/* YouTube Iframe Player (Mounted only when modal is open) */}
              <iframe
                src="https://www.youtube-nocookie.com/embed/rND6AqYkOEA?autoplay=1&rel=0"
                title={videoTitle}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
