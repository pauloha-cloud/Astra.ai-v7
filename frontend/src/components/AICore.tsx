import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useMemo } from 'react';
import { Brain, Network } from 'lucide-react';

interface DataChipProps {
  label: string;
  delay: number;
  initialAngle: number;
  isDarkMode: boolean;
}

const DataChip = ({ label, delay, initialAngle, isDarkMode }: DataChipProps) => {
  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        scale: 0.5,
        x: Math.cos(initialAngle) * 280,
        y: Math.sin(initialAngle) * 280
      }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1, 0.8, 0.4],
        x: [Math.cos(initialAngle) * 280, Math.cos(initialAngle) * 60],
        y: [Math.sin(initialAngle) * 280, Math.sin(initialAngle) * 60],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        delay: delay,
        ease: "linear"
      }}
      className={`absolute px-4 py-1.5 rounded-full border text-[8px] font-mono whitespace-nowrap shadow-xl backdrop-blur-md z-20 ${
        isDarkMode 
          ? 'bg-black/80 border-orange-500/30 text-orange-400' 
          : 'bg-white/90 border-orange-200 text-orange-600 shadow-orange-600/5'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(234,88,12,0.8)]" />
        {label}
      </div>
    </motion.div>
  );
};

const OrbitingLabel = ({ label, delay, radius, speed, isDarkMode }: { 
  label: string; 
  delay: number; 
  radius: number; 
  speed: number;
  isDarkMode: boolean;
}) => {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: speed, repeat: Infinity, ease: "linear", delay }}
      className="absolute flex items-center justify-center"
      style={{ width: radius * 2, height: radius * 2 }}
    >
      <div 
        className={`absolute top-0 px-2 py-0.5 rounded-md text-[6px] font-black uppercase tracking-[0.2em] pointer-events-none opacity-20 ${
          isDarkMode ? 'text-orange-500' : 'text-orange-600'
        }`}
        style={{ transform: 'translateY(-50%)' }}
      >
        {label}
      </div>
    </motion.div>
  );
};

const InfoCard = ({ text, delay, initialAngle, isDarkMode }: { 
  text: string; 
  delay: number; 
  initialAngle: number;
  isDarkMode: boolean;
}) => {
  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        scale: 0.8,
        x: Math.cos(initialAngle) * 350,
        y: Math.sin(initialAngle) * 350,
        rotate: initialAngle * (180 / Math.PI)
      }}
      animate={{ 
        opacity: [0, 0.4, 0.1, 0],
        x: [Math.cos(initialAngle) * 350, Math.cos(initialAngle) * 100],
        y: [Math.sin(initialAngle) * 350, Math.sin(initialAngle) * 100],
      }}
      transition={{
        duration: 15,
        repeat: Infinity,
        delay: delay,
        ease: "linear"
      }}
      className={`absolute p-2 rounded-lg border flex flex-col gap-1 w-24 pointer-events-none ${
        isDarkMode 
          ? 'bg-orange-500/5 border-orange-500/10' 
          : 'bg-orange-500/3 border-orange-200'
      }`}
    >
      <div className="w-full h-1 bg-orange-600/20 rounded-full overflow-hidden">
        <motion.div 
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-1/2 h-full bg-orange-600/40"
        />
      </div>
      <p className={`text-[6px] font-mono leading-tight truncate ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        {text}
      </p>
    </motion.div>
  );
};

export const AICore = ({ 
  isDarkMode, 
  states, 
  dataChips,
  orbitingLabels = [],
  infoCards = []
}: { 
  isDarkMode: boolean, 
  states: string[], 
  dataChips: string[],
  orbitingLabels?: string[],
  infoCards?: string[]
}) => {
  const [currentStateIndex, setCurrentStateIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStateIndex((prev) => (prev + 1) % states.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [states.length]);

  const memoizedChips = useMemo(() => {
    return dataChips.map((label, i) => ({
      label,
      delay: i * 2,
      angle: (i / dataChips.length) * Math.PI * 2
    }));
  }, [dataChips]);

  const memoizedOrbits = useMemo(() => {
    return orbitingLabels.map((label, i) => ({
      label,
      delay: i * 5,
      radius: 120 + i * 40,
      speed: 30 + i * 10
    }));
  }, [orbitingLabels]);

  const memoizedCards = useMemo(() => {
    return infoCards.map((text, i) => ({
      text,
      delay: i * 3,
      angle: (i / infoCards.length) * Math.PI * 2 + Math.PI / 4
    }));
  }, [infoCards]);

  return (
    <div className="relative w-full aspect-square max-w-lg mx-auto flex items-center justify-center select-none overflow-visible">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-orange-600/5 blur-[120px] rounded-full" />
      
      {/* Connection Lines Layer (Static background) */}
      <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
        <defs>
          <radialGradient id="lineGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ea580c" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
          </radialGradient>
        </defs>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <line
            key={angle}
            x1="50%"
            y1="50%"
            x2={`${50 + Math.cos(angle * Math.PI / 180) * 40}%`}
            y2={`${50 + Math.sin(angle * Math.PI / 180) * 40}%`}
            stroke="url(#lineGrad)"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
        ))}
      </svg>
      
      {/* Background Orbits */}
      {[1, 1.5, 2, 2.5].map((scale, i) => (
        <motion.div
          key={i}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 40 + i * 20, repeat: Infinity, ease: "linear" }}
          className="absolute border border-orange-600/5 rounded-full"
          style={{ width: `${40 + i * 20}%`, height: `${40 + i * 20}%` }}
        />
      ))}

      {/* Orbiting Labels */}
      {memoizedOrbits.map((orbit, i) => (
        <OrbitingLabel 
          key={`${orbit.label}-${i}`}
          label={orbit.label}
          delay={orbit.delay}
          radius={orbit.radius}
          speed={orbit.speed}
          isDarkMode={isDarkMode}
        />
      ))}

      {/* Info Cards Layer */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
        {memoizedCards.map((card, i) => (
          <InfoCard 
            key={`${card.text}-${i}`}
            text={card.text}
            delay={card.delay}
            initialAngle={card.angle}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>

      {/* Floating Data Chips Layer */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {memoizedChips.map((chip, i) => (
          <DataChip 
            key={`${chip.label}-${i}`}
            label={chip.label}
            delay={chip.delay}
            initialAngle={chip.angle}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>
      
      {/* Decorative dots orbit */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute w-full h-full"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-500 rounded-full blur-[1px] shadow-[0_0_12px_rgba(234,88,12,0.8)]" />
      </motion.div>

      {/* Central Orb Container */}
      <div className="relative flex flex-col items-center justify-center z-10">
        {/* Breathing Base Glow */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.25, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute w-72 h-72 bg-orange-600 rounded-full blur-[90px]"
        />

        {/* The Core Orb */}
        <motion.div
          animate={{
            y: [-12, 12, -12],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative"
        >
          {/* Outer Ring Effect */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-8 border border-orange-600/10 rounded-full border-dashed"
          />

          {/* Glowing Aura */}
          <div className="absolute -inset-4 bg-orange-600/20 rounded-full blur-2xl animate-pulse" />

          {/* The Core Orb */}
          <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-full p-[3px] bg-gradient-to-tr from-orange-600/50 via-orange-400 to-orange-600/50 shadow-[0_0_60px_-10px_rgba(234,88,12,0.5)]">
            <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden relative ${isDarkMode ? 'bg-[#050505]' : 'bg-white'}`}>
               {/* Technical Background */}
               <motion.div 
                 animate={{ 
                   rotate: 360,
                   opacity: [0.1, 0.2, 0.1]
                 }}
                 transition={{ 
                   rotate: { duration: 30, repeat: Infinity, ease: "linear" },
                   opacity: { duration: 5, repeat: Infinity, ease: "easeInOut" }
                 }}
                 className="absolute inset-0"
               >
                 <Network className="w-full h-full p-8 text-orange-500" />
               </motion.div>

               {/* Inner technical grid (CSS only) */}
               <div 
                 className="absolute inset-0 opacity-[0.03]"
                 style={{ 
                   backgroundImage: 'radial-gradient(#ea580c 0.5px, transparent 0.5px)',
                   backgroundSize: '8px 8px'
                 }}
               />

               {/* Core Icon */}
               <div className="relative z-10 flex flex-col items-center gap-2">
                 <motion.div
                   animate={{
                     scale: [1, 1.15, 1],
                     filter: ["drop-shadow(0 0 0px rgba(234,88,12,0))", "drop-shadow(0 0 20px rgba(234,88,12,0.6))", "drop-shadow(0 0 0px rgba(234,88,12,0))"]
                   }}
                   transition={{ duration: 4, repeat: Infinity }}
                 >
                   <Brain className="w-12 h-12 md:w-16 md:h-16 text-orange-500" />
                 </motion.div>
               </div>

               {/* Scanning Overlay */}
               <motion.div 
                 animate={{ y: ['-100%', '100%'] }}
                 transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/20 to-transparent w-full h-[30%] pointer-events-none"
               />

               {/* Digital noise/overlay */}
               <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none mix-blend-overlay" />
            </div>
          </div>
        </motion.div>

        {/* State Label & Streaming Dots */}
        <div className="mt-20 h-14 flex flex-col items-center justify-center space-y-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentStateIndex}-${states[currentStateIndex]}`}
              initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -15, filter: 'blur(10px)' }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 p-1 px-2.5 rounded-full bg-orange-600/10 border border-orange-600/20">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-orange-500">LIVE</span>
                </div>
                <span className={`text-[10px] md:text-[13px] font-mono tracking-[0.25em] uppercase font-black ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {states[currentStateIndex] || '...'}
                </span>
              </div>
              
              {/* Progress Indicator (Synchronized) */}
              <div className={`w-56 h-[3px] rounded-full relative overflow-hidden mt-2 ${isDarkMode ? 'bg-white/5' : 'bg-gray-200'}`}>
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: `${((currentStateIndex + 1) / states.length) * 100}%` }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-700 via-orange-500 to-orange-400 shadow-[0_0_15px_rgba(234,88,12,0.6)]"
                />
                {/* Secondary scanning line */}
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
