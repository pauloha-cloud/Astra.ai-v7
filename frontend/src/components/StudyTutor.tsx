import React, { useEffect, useRef, useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  X, 
  Loader2, 
  MessageCircle,
  Ear,
  Brain,
  Volume2,
  BrainCircuit,
  Zap,
  AlertTriangle,
  HelpCircle,
  Info,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AudioStreamer, AudioPlayer } from '../lib/audio-utils';

interface Props {
  videoTitle?: string;
  videoId?: string;
  transcript: string;
  onClose: () => void;
  t: any;
  lang?: string;
  explanationLevel?: string;
  isDarkMode?: boolean;
}

export const StudyTutor = ({ videoTitle = 'Selected Video', videoId, transcript, onClose, t, lang = 'en', explanationLevel = 'intermediate', isDarkMode = true }: Props) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [status, setStatus] = useState(t.readyToStart);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [aiVolume, setAiVolume] = useState(0);
  const [userVolume, setUserVolume] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('astra_onboarding_dismissed') !== 'true';
  });
  const [dontShowAgain, setDontShowAgain] = useState(false);
  
  const aiRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const transcriptionContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcriptions
  useEffect(() => {
    if (transcriptionContainerRef.current) {
      const container = transcriptionContainerRef.current;
      // Use requestAnimationFrame to wait for the next render cycle when the DOM is updated
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  }, [transcription]);

  const playNotificationSound = (type: 'connect' | 'disconnect' | 'thinking') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'connect') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      } else if (type === 'disconnect') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      }
      
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio feedback failed:", e);
    }
  };

  const startSession = async () => {
    setErrorMessage(null);
    setIsConnecting(true);
    setStatus(t.initializingGemini);
    
    try {
      playerRef.current = new AudioPlayer((playing) => {
        setIsAiSpeaking(playing);
        if (playing) setIsAiThinking(false);
      }, (vol) => {
        setAiVolume(vol);
      });

      streamerRef.current = new AudioStreamer((base64Data) => {
        if (sessionRef.current && sessionRef.current.readyState === WebSocket.OPEN && !isMuted) {
          sessionRef.current.send(JSON.stringify({
            type: "audio",
            data: base64Data
          }));
        }
      }, (active) => {
        setIsUserSpeaking(active);
        if (!active && isConnected && !isAiSpeaking) {
          setIsAiThinking(true);
        }
      }, (vol) => {
        setUserVolume(vol);
      });

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socketUrl = `${protocol}//${window.location.host}/ws/tutor`;
      
      console.log(`[Tutor Client] Connecting to: ${socketUrl}`);
      const ws = new WebSocket(socketUrl);
      
      ws.onopen = () => {
        console.log("[Tutor Client] WebSocket connected, sending setup packet...");
        setIsConnected(true);
        setIsConnecting(false);
        setStatus(t.liveSessionActive);
        playNotificationSound('connect');
        
        // Send setup payload to configure the backend's Gemini Live connection
        ws.send(JSON.stringify({
          type: "setup",
          videoTitle,
          transcript,
          lang,
          explanationLevel
        }));

        // Start mic streamer
        streamerRef.current?.start();
      };

      ws.onmessage = async (event) => {
        try {
          const envelope = JSON.parse(event.data);
          
          if (envelope.event === "open") {
            console.log("[Tutor Client] Server-side session opened");
          } else if (envelope.event === "close") {
            console.log("[Tutor Client] Server-side session closed");
            stopSession();
          } else if (envelope.event === "error") {
            console.error("[Tutor Client] Server error:", envelope.details);
            setErrorMessage(envelope.details);
            setStatus(t.sessionError);
            stopSession();
          } else if (envelope.event === "message") {
            const message = envelope.data;

            // Check if model started or stopped a turn for thinking state
            if (message.serverContent?.modelTurn) {
              setIsAiThinking(false);
            }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              playerRef.current?.playFromBase64(base64Audio);
            }

            // Handle Transcriptions
            const modelTranscription = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (modelTranscription) {
              setTranscription(prev => [...prev.slice(-19), `ASTRA: ${modelTranscription}`]);
            }

            const userTranscription = (message.serverContent as any)?.userTurn?.parts?.[0]?.text;
            if (userTranscription) {
              setTranscription(prev => [...prev.slice(-19), `YOU: ${userTranscription}`]);
            }
          }
        } catch (e) {
          console.error("[Tutor Client] Error parsing incoming websocket message:", e);
        }
      };

      ws.onclose = () => {
        console.log("[Tutor Client] Client WebSocket closed");
        stopSession();
      };

      ws.onerror = (err) => {
        console.error("[Tutor Client] WebSocket Error:", err);
        setStatus(t.sessionError || "Não foi possível iniciar a conversa. Tente novamente.");
        setErrorMessage(t.sessionError || "Não foi possível iniciar a conversa. Tente novamente.");
        stopSession();
      };

      sessionRef.current = ws;

    } catch (error: any) {
      console.error("Failed to start session:", error);
      setIsConnecting(false);
      const isPermErr = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError';
      const isNotFoundErr = error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError';
      const msg = isPermErr 
        ? (t.micPermissionError || "Não foi possível acessar o microfone. Verifique a permissão do navegador.") 
        : isNotFoundErr 
        ? (t.deviceNotFoundError || "Nenhum dispositivo compatível foi encontrado.") 
        : (t.sessionError || "Não foi possível iniciar a conversa. Tente novamente.");
      setErrorMessage(msg);
      setStatus(t.sessionError || "Não foi possível iniciar a conversa.");
    }
  };

  const stopSession = () => {
    if (isConnected) playNotificationSound('disconnect');
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        // ignore
      }
    }
    streamerRef.current?.stop();
    playerRef.current?.close();
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setStatus(t.sessionEnded);
  };

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      stopSession();
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showOnboarding) {
          setShowOnboarding(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showOnboarding, onClose]);

  const toggleCamera = async () => {
    if (!isCameraOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraOn(true);
          startCameraStreaming();
        }
      } catch (err: any) {
        console.error("Camera error:", err);
        const isPermErr = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
        const isNotFoundErr = err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError';
        const msg = isPermErr 
          ? (t.camPermissionError || "Não foi possível acessar a câmera. Verifique a permissão do navegador.") 
          : isNotFoundErr 
          ? (t.deviceNotFoundError || "Nenhum dispositivo compatível foi encontrado.") 
          : (t.camPermissionError || "Não foi possível acessar a câmera. Verifique a permissão do navegador.");
        setErrorMessage(msg);
      }
    } else {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
      setIsCameraOn(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const startCameraStreaming = () => {
    const sendFrame = () => {
      if (sessionRef.current && sessionRef.current.readyState === WebSocket.OPEN && isCameraOn && videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64Data = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
          sessionRef.current.send(JSON.stringify({
            type: "video",
            data: base64Data
          }));
        }
      }
      animationFrameRef.current = requestAnimationFrame(sendFrame);
    };
    sendFrame();
  };

  const visualState = isAiSpeaking ? 'speaking' : isAiThinking ? 'thinking' : isUserSpeaking ? 'listening' : 'idle';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm overflow-y-auto transition-colors ${
      isDarkMode ? 'bg-black/80' : 'bg-slate-900/40'
    }`}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl sm:rounded-3xl w-full max-w-4xl my-auto max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] md:h-[82vh] flex flex-col overflow-hidden shadow-2xl transition-colors ${
          isDarkMode 
            ? 'bg-[#0a0a0a] border border-white/10 shadow-orange-600/10' 
            : 'bg-white border border-slate-200 shadow-slate-300/50'
        }`}
      >
        {/* ARIA-LIVE Status Announcement Region */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {isConnected ? (
            isMuted ? (t.micPaused || "Microfone pausado") :
            isAiThinking ? t.processing :
            isAiSpeaking ? t.astraAnswering :
            isUserSpeaking ? t.listeningToYou :
            t.imListening
          ) : (
            status
          )}
        </div>

        {/* Header */}
        <div className={`p-3.5 sm:p-5 border-b flex items-center justify-between transition-colors shrink-0 ${
          isDarkMode ? 'border-white/5 bg-black/40' : 'border-slate-100 bg-slate-50/50'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors duration-500 ${
              visualState === 'speaking' ? 'bg-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.8)]' : 
              visualState === 'thinking' ? 'bg-orange-400 animate-pulse' :
              visualState === 'listening' ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]' :
              isConnected ? 'bg-green-500' : (isDarkMode ? 'bg-gray-600' : 'bg-slate-300')
            }`} />
            <div className="min-w-0">
              <h2 className={`font-semibold text-sm sm:text-base tracking-tight truncate transition-colors ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>{t.studyTutorLive}</h2>
              <p className={`text-xs font-medium truncate transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-slate-500'
              }`}>{status}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            aria-label={t.backToOverview || "Encerrar"}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
              isDarkMode 
                ? 'border-white/10 hover:bg-white/10 text-gray-300 hover:text-white dark:focus-visible:ring-offset-black' 
                : 'border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-slate-900 focus-visible:ring-offset-white'
            }`}
          >
            <X size={16} />
            <span className="hidden sm:inline">{t.backToOverview}</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden min-h-0">
          {/* Main Interaction Area */}
          <div className={`flex-1 p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center relative overflow-x-hidden overflow-y-auto transition-colors min-h-[350px] sm:min-h-[400px] ${
            isDarkMode 
              ? 'bg-[radial-gradient(circle_at_center,rgba(234,88,12,0.03)_0%,transparent_100%)]' 
              : 'bg-[radial-gradient(circle_at_center,rgba(234,88,12,0.05)_0%,transparent_100%)] bg-slate-50/50'
          }`}>
            {/* Dynamic Particle Swarm & Neural Grid */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
              {/* Reactive Background Glow */}
              <motion.div 
                animate={{ 
                  opacity: visualState === 'speaking' ? 0.2 : visualState === 'thinking' ? 0.15 : visualState === 'listening' ? 0.08 : 0.05,
                  scale: visualState === 'speaking' ? 1.2 : 1
                }}
                className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,88,12,1)_0%,transparent_70%)]" 
              />
              
              {/* Neural Grid Overlay */}
              <div 
                className="absolute inset-0 opacity-[0.03]" 
                style={{ 
                  backgroundImage: `radial-gradient(circle at 2px 2px, rgba(234,88,12,0.5) 1px, transparent 0)`,
                  backgroundSize: '40px 40px' 
                }} 
              />

              {/* Reactive Particle Swarm */}
              {isConnected && [...Array(40)].map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  initial={{ x: "50%", y: "50%", opacity: 0 }}
                  animate={{
                    x: [
                      "50%",
                      `${50 + (Math.random() - 0.5) * (visualState === 'speaking' ? 120 : visualState === 'thinking' ? 40 : 80)}%`,
                      `${50 + (Math.random() - 0.5) * (visualState === 'speaking' ? 150 : visualState === 'thinking' ? 60 : 100)}%`
                    ],
                    y: [
                      "50%",
                      `${50 + (Math.random() - 0.5) * (visualState === 'speaking' ? 120 : visualState === 'thinking' ? 40 : 80)}%`,
                      `${50 + (Math.random() - 0.5) * (visualState === 'speaking' ? 150 : visualState === 'thinking' ? 60 : 100)}%`
                    ],
                    opacity: visualState === 'speaking' ? [0, 0.9, 0] : visualState === 'thinking' ? [0, 0.4, 0] : [0, 0.3, 0],
                    scale: visualState === 'speaking' ? [0.5, 2, 0.5] : [0.5, 1.2, 0.5],
                  }}
                  transition={{
                    duration: (visualState === 'speaking' ? 1.2 : visualState === 'thinking' ? 5 : 3) + Math.random() * 2,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: i * 0.1,
                  }}
                  className={`absolute w-1.5 h-1.5 rounded-full blur-[1px] ${
                    i % 4 === 0 ? 'bg-orange-400' : i % 4 === 1 ? 'bg-orange-500' : i % 4 === 2 ? (isDarkMode ? 'bg-white' : 'bg-orange-300') : 'bg-blue-400'
                  }`}
                />
              ))}
            </div>

            <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-10 md:gap-12 py-2">
              {/* AI Visualizer - The Astra Star Core */}
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center shrink-0">
                <AnimatePresence>
                  {isConnected && (
                    <motion.div
                      key="orb-glow"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0"
                    >
                      {/* Neural Ripple Effect (Speaking Only) */}
                      {visualState === 'speaking' && (
                        <motion.div
                          animate={{ 
                            scale: [1, 2.5],
                            opacity: [0.5, 0],
                            borderWidth: ["4px", "1px"]
                          }}
                          transition={{ 
                            duration: 0.8,
                            repeat: Infinity,
                            ease: "easeOut"
                          }}
                          className="absolute inset-0 border-orange-500 rounded-full blur-[2px]"
                        />
                      )}

                      {/* Outer Glow Spheres */}
                      <motion.div 
                        animate={{ 
                          scale: visualState === 'speaking' ? [1.5, 2] : visualState === 'listening' ? [1, 1.2] : 1.8,
                          opacity: visualState === 'speaking' ? 0.3 : 0.1
                        }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: "mirror" }}
                        className="absolute inset-0 bg-orange-600/10 rounded-full blur-[100px]"
                      />

                      {/* Orbital Rings */}
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={`ring-${i}`}
                          animate={{ 
                            opacity: visualState === 'speaking' ? 0.5 : 0.2, 
                            rotateY: 360,
                            rotateZ: i * 45,
                            scale: visualState === 'speaking' ? [1, 1.3, 1] : 1
                          }}
                          transition={{ 
                            duration: (visualState === 'speaking' ? 5 : 15) + i * 5, 
                            repeat: Infinity, 
                            ease: "linear" 
                          }}
                          className="absolute border border-orange-500/30 rounded-full"
                          style={{
                            width: `${180 + i * 60}px`,
                            height: `${100 + i * 20}px`,
                            transformStyle: "preserve-3d"
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* The Central Core Container */}
                <motion.div 
                  animate={{ 
                    scale: visualState === 'listening' ? [1, 1.05, 1] : 1,
                    boxShadow: visualState === 'listening' ? '0 0 50px rgba(96,165,250,0.3)' : '0 0 100px rgba(234,88,12,0.3)'
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`w-44 h-44 sm:w-56 sm:h-56 rounded-full flex items-center justify-center relative z-20 transition-all duration-700 ${
                    isConnected 
                      ? (isDarkMode ? 'bg-black/60 border border-white/10' : 'bg-white/90 border border-slate-200/80 shadow-xl shadow-orange-500/10') 
                      : (isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200')
                  }`}
                >
                  <div className={`absolute inset-2 rounded-full border backdrop-blur-md ${
                    isDarkMode ? 'border-white/5' : 'border-slate-200/60'
                  }`} />
                  
                  <AnimatePresence mode="wait">
                    {isConnecting ? (
                      <motion.div
                        key="connecting"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-4"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 size={64} className="text-orange-500" />
                        </motion.div>
                        <span className="text-[10px] font-black tracking-widest text-orange-500/80 uppercase">{t.syncing}</span>
                      </motion.div>
                    ) : isConnected ? (
                      <motion.div 
                        key="connected"
                        className="relative flex items-center justify-center"
                      >
                        {/* Core Brain Icon */}
                        <motion.div
                          animate={{ 
                            filter: visualState === 'speaking' 
                              ? ["brightness(1) drop-shadow(0 0 10px rgba(234,88,12,0.4))", "brightness(2) drop-shadow(0 0 50px rgba(234,88,12,1))", "brightness(1) drop-shadow(0 0 10px rgba(234,88,12,0.4))"]
                              : visualState === 'listening'
                              ? ["brightness(1) drop-shadow(0 0 10px rgba(96,165,250,0.3))", "brightness(1.5) drop-shadow(0 0 20px rgba(96,165,250,0.5))", "brightness(1) drop-shadow(0 0 10px rgba(96,165,250,0.3))"]
                              : ["brightness(1) drop-shadow(0 0 5px rgba(234,88,12,0.2))", "brightness(1.2) drop-shadow(0 0 15px rgba(234,88,12,0.4))", "brightness(1) drop-shadow(0 0 5px rgba(234,88,12,0.2))"],
                            scale: visualState === 'speaking' ? [1, 1 + (aiVolume * 0.6), 1] : visualState === 'thinking' ? [1, 1.05, 1] : 1,
                            rotateZ: visualState === 'thinking' ? [0, 10, -10, 0] : 0
                          }}
                          transition={{ 
                            duration: visualState === 'speaking' ? 0.15 : visualState === 'thinking' ? 1.5 : 4, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                          }}
                        >
                          {visualState === 'listening' ? (
                            <Mic size={80} className="text-blue-500 dark:text-blue-400 transition-colors duration-500" />
                          ) : (
                            <Brain size={80} className={`${visualState === 'speaking' || visualState === 'thinking' ? 'text-orange-500' : 'text-orange-600'} transition-colors duration-500`} />
                          )}
                        </motion.div>

                        {/* User Volume Pulse */}
                        {isUserSpeaking && (
                          <motion.div 
                            animate={{ scale: [1, 1 + (userVolume * 2)], opacity: [0.3, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                            className="absolute inset-0 border-2 border-orange-400/30 rounded-full -z-20"
                          />
                        )}

                        {/* Multi-Layered Energy Glows */}
                        <motion.div 
                          animate={{ 
                            scale: isAiSpeaking ? [1, 1.2, 1] : [1, 1.05, 1],
                            opacity: isAiSpeaking ? [0.2, 0.4, 0.3] : [0.1, 0.2, 0.1]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 bg-orange-600/20 rounded-full blur-2xl -z-10" 
                        />
                        <motion.div 
                          animate={{ 
                            rotate: 360,
                            scale: isAiSpeaking ? [1, 1.1, 1] : 1
                          }}
                          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 border border-orange-500/10 rounded-full -z-5" 
                        />

                        {/* Neural Sparks - Flashes when speaking */}
                        {isAiSpeaking && [...Array(3)].map((_, i) => (
                           <motion.div
                             key={`spark-${i}`}
                             animate={{ 
                               opacity: [0, 1, 0],
                               scale: [0.5, 1.5, 0.5],
                               x: (Math.random() - 0.5) * 40,
                               y: (Math.random() - 0.5) * 40
                             }}
                             transition={{ 
                               duration: 0.3 + Math.random() * 0.4, 
                               repeat: Infinity,
                               delay: i * 0.2
                             }}
                             className={`absolute w-1 h-1 rounded-full blur-[1px] ${
                               isDarkMode ? 'bg-white' : 'bg-orange-400'
                             }`}
                           />
                        ))}
                        
                        {/* Thinking Indicator */}
                        <AnimatePresence>
                          {isAiThinking && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute -top-12 flex gap-1"
                            >
                              {[0, 1, 2].map(i => (
                                <motion.div
                                  key={i}
                                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                  className="w-1.5 h-1.5 bg-orange-500 rounded-full"
                                />
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ) : (
                      <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} className="flex flex-col items-center gap-4">
                        <Brain size={80} className={isDarkMode ? 'text-gray-400' : 'text-slate-400'} />
                        <span className={`text-[10px] font-black tracking-widest uppercase ${
                          isDarkMode ? 'text-gray-500' : 'text-slate-500'
                        }`}>{t.awaitingLink}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Status Indicator Badge */}
                {isConnected && (
                  <motion.div 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-30"
                  >
                    <div className={`px-4 py-1.5 border rounded-full text-xs font-semibold flex items-center gap-2 transition-colors ${
                      isDarkMode 
                        ? 'bg-black/80 border-orange-500/30 text-orange-400 shadow-md shadow-orange-950/50' 
                        : 'bg-white/90 border-orange-500/30 text-orange-600 shadow-sm shadow-orange-500/10'
                    }`}>
                      <motion.div 
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 bg-orange-500 rounded-full"
                      />
                      <span>{t.liveSessionActive || "Conversa em andamento"}</span>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="text-center space-y-4 max-w-sm mx-auto">
                {!isConnected && !isConnecting ? (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                       <h3 className={`text-2xl font-bold tracking-tight transition-colors ${
                         isDarkMode ? 'text-white' : 'text-slate-900'
                       }`}>{t.readyToStart || "Pronto para conversar"}</h3>
                       <p className={`text-xs sm:text-sm font-medium leading-relaxed transition-colors ${
                         isDarkMode ? 'text-gray-400' : 'text-slate-600'
                       }`}>{t.initializingLink}</p>
                    </div>

                    {errorMessage && (
                      <div className={`p-3.5 border rounded-2xl flex items-start gap-3 text-left transition-colors ${
                        isDarkMode ? 'bg-red-950/45 border-red-500/20' : 'bg-red-50 border-red-200'
                      }`}>
                        <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                        <div className="space-y-1">
                          <p className={`text-xs font-bold ${
                            isDarkMode ? 'text-red-400' : 'text-red-700'
                          }`}>{t.sessionError}</p>
                          <p className={`text-[11px] leading-normal ${
                            isDarkMode ? 'text-red-200/90' : 'text-red-800'
                          }`}>
                            {errorMessage}
                          </p>
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={startSession}
                      aria-label={t.connectNeuralLink || "Iniciar conversa por voz"}
                      className="group relative px-8 py-3.5 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-bold text-sm sm:text-base transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-orange-600/25 flex items-center justify-center gap-3 mx-auto min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black"
                    >
                      <Volume2 size={20} className="group-hover:scale-110 transition-transform duration-300" /> 
                      {t.connectNeuralLink}
                    </button>
                  </motion.div>
                ) : isConnected && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-2"
                  >
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-600/10 border border-orange-600/20 text-xs font-semibold text-orange-600 dark:text-orange-400">
                      <motion.div
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-1.5 h-1.5 bg-orange-500 rounded-full"
                      />
                      {t.auraActive}
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold tracking-tight transition-colors ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {isMuted ? (t.micPaused || "Microfone pausado") : isAiThinking ? t.processing : isAiSpeaking ? t.astraAnswering : isUserSpeaking ? t.listeningToYou : t.imListening}
                      </h3>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Disclaimer Footer */}
            <div className="mt-4 text-center z-10">
              <p className={`text-[11px] font-medium transition-colors ${
                isDarkMode ? 'text-gray-500' : 'text-slate-400'
              }`}>
                {t.disclaimerText || "A Astra pode cometer erros. Confira informações importantes."}
              </p>
            </div>

            {/* Transcription Display */}
            {isConnected && (
              <div className="absolute bottom-12 left-8 right-8 max-w-xl mx-auto z-40">
                <div 
                  ref={transcriptionContainerRef}
                  className={`backdrop-blur-2xl rounded-2xl border p-4 shadow-xl flex flex-col gap-3 max-h-48 overflow-y-auto custom-scrollbar scroll-smooth transition-colors ${
                    isDarkMode 
                      ? 'bg-black/80 border-white/10' 
                      : 'bg-white/95 border-slate-200 shadow-slate-200/50'
                  }`}
                >
                  {transcription.length === 0 ? (
                    <div className="h-full flex items-center justify-center py-2">
                      <p className={`text-xs font-medium animate-pulse ${
                        isDarkMode ? 'text-gray-500' : 'text-slate-400'
                      }`}>
                        {t.auraActive}
                      </p>
                    </div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {transcription.map((text, i) => {
                        const isAstra = text.startsWith('ASTRA:');
                        const cleanText = text.replace(/^(ASTRA|YOU):\s*/, '');
                        
                        return (
                          <motion.div 
                            key={`msg-${i}`}
                            initial={{ opacity: 0, y: 15, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className={`flex flex-col ${isAstra ? 'items-start' : 'items-end'}`}
                          >
                            <div className={`max-w-[90%] px-3.5 py-2 rounded-xl text-xs sm:text-sm leading-relaxed transition-colors ${
                              isAstra 
                                ? (isDarkMode ? 'bg-orange-600/10 border border-orange-500/20 text-orange-200' : 'bg-orange-50 border border-orange-200 text-orange-950') 
                                : (isDarkMode ? 'bg-white/5 border border-white/10 text-gray-200' : 'bg-slate-100 border border-slate-200 text-slate-800')
                            }`}>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={`text-[10px] font-semibold tracking-wide ${
                                  isAstra 
                                    ? (isDarkMode ? 'text-orange-400' : 'text-orange-600') 
                                    : (isDarkMode ? 'text-gray-400' : 'text-slate-500')
                                }`}>
                                  {isAstra ? 'Astra' : 'Você'}
                                </span>
                                {isAstra && isAiSpeaking && i === transcription.length - 1 && (
                                  <motion.div 
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    className="w-1 h-1 bg-orange-500 rounded-full"
                                  />
                                )}
                              </div>
                              <p className="font-medium">{cleanText}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Side Panel: Video and Controls */}
          <div className={`w-full md:w-80 border-t md:border-t-0 md:border-l p-4 sm:p-5 flex flex-col justify-between gap-4 sm:gap-5 shrink-0 md:overflow-y-auto custom-scrollbar transition-colors ${
            isDarkMode 
              ? 'bg-black/40 border-white/5' 
              : 'bg-slate-50/80 border-slate-200'
          }`}>
            <div className="space-y-5">
              {/* Study Content */}
              <div className="space-y-2">
                <h4 className={`text-xs font-bold transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-slate-600'
                }`}>{t.sourceMaterial}</h4>
                <div className={`aspect-video rounded-xl overflow-hidden border shadow-sm transition-colors ${
                  isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-200/60 border-slate-200'
                }`}>
                  {videoId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center p-3 text-center ${
                      isDarkMode ? 'text-gray-500 bg-white/5' : 'text-slate-400 bg-slate-100'
                    }`}>
                      <Video size={24} className="mb-1 opacity-70" />
                      <span className="text-xs font-medium">{t.sourceMaterial}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Camera */}
              <div className="space-y-2">
                <h4 className={`text-xs font-bold transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-slate-600'
                }`}>{t.selfView}</h4>
                {isCameraOn ? (
                  <div className={`aspect-video rounded-xl overflow-hidden border relative shadow-sm transition-colors ${
                    isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-200/60 border-slate-200'
                  }`}>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" width="320" height="240" />
                  </div>
                ) : (
                  <div className={`py-3.5 px-3 rounded-xl border flex items-center gap-2.5 transition-colors ${
                    isDarkMode ? 'bg-white/5 border-white/5 text-gray-400' : 'bg-slate-100/80 border-slate-200 text-slate-500'
                  }`}>
                    <VideoOff size={16} className="opacity-70 flex-shrink-0" />
                    <span className="text-xs font-medium">{t.camOff}</span>
                    <canvas ref={canvasRef} className="hidden" width="320" height="240" />
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="space-y-2">
                 <h4 className={`text-xs font-bold transition-colors ${
                   isDarkMode ? 'text-gray-400' : 'text-slate-600'
                 }`}>{t.controls}</h4>
                 <div className="grid grid-cols-2 gap-2">
                   <button 
                    disabled={!isConnected}
                    onClick={() => setIsMuted(!isMuted)}
                    aria-label={isMuted ? (t.unmute || "Ativar microfone") : (t.mute || "Silenciar")}
                    aria-pressed={!isMuted}
                    aria-disabled={!isConnected}
                    className={`p-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-medium min-h-[44px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                      isMuted 
                        ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                        : (isDarkMode 
                            ? 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-30 border border-white/5 dark:focus-visible:ring-offset-black' 
                            : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 border border-slate-200 shadow-sm focus-visible:ring-offset-white')
                    }`}
                   >
                     {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                     <span>{isMuted ? (t.unmute || "Ativar microfone") : (t.mute || "Silenciar")}</span>
                   </button>
                   <button 
                    disabled={!isConnected}
                    onClick={toggleCamera}
                    aria-label={isCameraOn ? (t.camOff || "Desativar câmera") : (t.camOn || "Ativar câmera")}
                    aria-pressed={isCameraOn}
                    aria-disabled={!isConnected}
                    className={`p-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-medium min-h-[44px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                      isCameraOn 
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                        : (isDarkMode 
                            ? 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-30 border border-white/5 dark:focus-visible:ring-offset-black' 
                            : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 border border-slate-200 shadow-sm focus-visible:ring-offset-white')
                    }`}
                   >
                     {isCameraOn ? <Video size={16} /> : <VideoOff size={16} />}
                     <span>{isCameraOn ? (t.camOn || "Desativar câmera") : (t.camOff || "Câmera desativada")}</span>
                   </button>
                 </div>
              </div>
            </div>

            {/* End Session Button */}
            <button 
              onClick={onClose}
              aria-label={t.backToOverview || "Encerrar"}
              className={`w-full py-2.5 min-h-[44px] border rounded-xl transition-all font-medium text-xs flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                isDarkMode 
                  ? 'bg-white/5 hover:bg-red-500/10 hover:border-red-500/30 border-white/5 text-gray-300 hover:text-red-400 dark:focus-visible:ring-offset-black' 
                  : 'bg-white hover:bg-red-50 border-slate-200 text-slate-700 hover:text-red-600 hover:border-red-200 shadow-sm focus-visible:ring-offset-white'
              }`}
            >
              <span>{t.backToOverview}</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Onboarding Overlay */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 backdrop-blur-md overflow-hidden transition-colors ${
              isDarkMode ? 'bg-black/80' : 'bg-slate-900/40'
            }`}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className={`border rounded-3xl sm:rounded-[2rem] w-full max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto custom-scrollbar shadow-2xl relative transition-colors ${
                isDarkMode 
                  ? 'bg-[#0f0f0f] border-white/10 text-white' 
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="p-5 sm:p-6 space-y-4 sm:space-y-5">
                {/* Header Side */}
                <div className="flex flex-col items-center text-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-md shadow-orange-600/15 ${
                    isDarkMode ? 'bg-orange-600/20 border-orange-500/30' : 'bg-orange-50 border-orange-200'
                  }`}>
                    <Brain size={24} className="text-orange-500" />
                  </div>
                  <div className="space-y-1">
                    <h2 className={`text-xl sm:text-2xl font-black tracking-tight transition-colors ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>{t.onboardingTitle}</h2>
                    <p className={`text-xs sm:text-sm leading-relaxed transition-colors ${
                      isDarkMode ? 'text-gray-400' : 'text-slate-600'
                    }`}>{t.onboardingDesc}</p>
                  </div>
                </div>

                {/* Benefits List (Compact 1 line per benefit) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                  {[
                    { icon: <BookOpen size={16} className="text-orange-500 flex-shrink-0" />, title: t.onboardingStep1Title },
                    { icon: <Mic size={16} className="text-orange-500 flex-shrink-0" />, title: t.onboardingStep2Title },
                    { icon: <BrainCircuit size={16} className="text-orange-500 flex-shrink-0" />, title: t.onboardingStep3Title },
                  ].map((benefit, idx) => (
                    <div key={idx} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-colors ${
                      isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200/80'
                    }`}>
                      <div className={`p-1.5 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isDarkMode ? 'bg-orange-600/10' : 'bg-orange-100/60'
                      }`}>
                        {benefit.icon}
                      </div>
                      <span className={`text-xs font-semibold leading-tight transition-colors ${
                        isDarkMode ? 'text-gray-200' : 'text-slate-800'
                      }`}>{benefit.title}</span>
                    </div>
                  ))}
                </div>

                {/* Example Questions Section (Max 2 examples) */}
                <div className={`p-3.5 sm:p-4 rounded-2xl border space-y-1.5 transition-colors ${
                  isDarkMode ? 'bg-orange-600/5 border-orange-500/20' : 'bg-orange-50/80 border-orange-200/80'
                }`}>
                  <div className="flex items-center gap-2 text-orange-500 font-bold text-xs">
                    <HelpCircle size={15} />
                    <span>{t.exampleQuestionsTitle}</span>
                  </div>
                  <div className="space-y-1">
                    {[t.exampleQuestion1, t.exampleQuestion2].map((q, i) => (
                      <p key={i} className={`text-xs italic leading-relaxed transition-colors ${
                        isDarkMode ? 'text-gray-300' : 'text-slate-700'
                      }`}>
                        &quot;{q}&quot;
                      </p>
                    ))}
                  </div>
                </div>

                {/* Discrete Limitations Alert */}
                <div className={`flex items-center gap-2 px-1 py-0.5 text-xs transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-slate-500'
                }`}>
                  <AlertTriangle size={15} className="flex-shrink-0 text-amber-500/90" />
                  <span className="leading-tight">{t.onboardingStep4Desc}</span>
                </div>

                {/* Footer Actions */}
                <div className={`space-y-3.5 pt-3 border-t transition-colors ${
                  isDarkMode ? 'border-white/5' : 'border-slate-100'
                }`}>
                  <label 
                    htmlFor="dont-show-tutor-onboarding"
                    className="flex items-center gap-3 cursor-pointer group select-none"
                  >
                    <input 
                      type="checkbox"
                      id="dont-show-tutor-onboarding"
                      name="dontShowAgain"
                      checked={dontShowAgain}
                      onChange={(e) => setDontShowAgain(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500 peer-focus-visible:ring-offset-2 ${
                      dontShowAgain 
                        ? 'bg-orange-600 border-orange-600' 
                        : (isDarkMode ? 'border-white/20 bg-white/5 group-hover:border-white/40' : 'border-slate-300 bg-slate-50 group-hover:border-slate-400')
                    }`}>
                      {dontShowAgain && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                    </div>
                    <span className={`text-xs transition-colors font-semibold ${
                      isDarkMode ? 'text-gray-400 group-hover:text-gray-200' : 'text-slate-500 group-hover:text-slate-800'
                    }`}>{t.dontShowAgain}</span>
                  </label>

                  <button 
                    onClick={() => {
                      if (dontShowAgain) {
                        localStorage.setItem('astra_onboarding_dismissed', 'true');
                      }
                      setShowOnboarding(false);
                    }}
                    className="w-full min-h-[44px] py-3 bg-orange-600 hover:bg-orange-500 active:scale-[0.99] text-white rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all shadow-lg shadow-orange-600/20 tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black"
                  >
                    {t.startLearning}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
