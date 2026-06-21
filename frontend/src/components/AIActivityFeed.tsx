import { motion } from 'motion/react';
import { 
  FileText, 
  Network, 
  Puzzle, 
  Layers, 
  Brain, 
  Sparkles,
  Search,
  Clock
} from 'lucide-react';
import { useMemo } from 'react';

interface ActivityItem {
  title: string;
  desc: string;
  type: string;
}

interface AIActivityFeedProps {
  isDarkMode: boolean;
  t: {
    title: string;
    subtitle: string;
    now: string;
    recent: string;
    ago2: string;
    ago5: string;
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

export const AIActivityFeed = ({ isDarkMode, t }: AIActivityFeedProps) => {
  const timestamps = [t.now, t.ago2, t.ago5, t.recent, t.recent, t.recent];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-20">
        <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] ${isDarkMode ? 'bg-orange-900/10' : 'bg-orange-500/5'}`} />
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[120px] ${isDarkMode ? 'bg-orange-900/10' : 'bg-orange-500/5'}`} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16">
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
            className={`text-3xl md:text-4xl font-bold italic tracking-tight mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
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
      </div>
    </section>
  );
};
