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
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AudioStreamer, AudioPlayer } from '../lib/audio-utils';

interface Props {
  videoTitle?: string;
  videoId?: string;
  transcript: string;
  onClose: () => void;
  t: any;
}

export const StudyTutor = ({ videoTitle = 'Selected Video', videoId, transcript, onClose, t }: Props) => {
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
          transcript
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
        setStatus(t.sessionError);
        stopSession();
      };

      sessionRef.current = ws;

    } catch (error) {
      console.error("Failed to start session:", error);
      setIsConnecting(false);
      setStatus(t.failedConnectMic);
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

  const toggleCamera = async () => {
    if (!isCameraOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraOn(true);
          startCameraStreaming();
        }
      } catch (err) {
        console.error("Camera error:", err);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-4xl h-[calc(100dvh-2rem)] md:h-[80vh] max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden shadow-2xl shadow-orange-600/10"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full transition-colors duration-500 ${
              visualState === 'speaking' ? 'bg-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.8)]' : 
              visualState === 'thinking' ? 'bg-orange-400 animate-pulse' :
              visualState === 'listening' ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]' :
              isConnected ? 'bg-green-500' : 'bg-gray-600'
            }`} />
            <div>
              <h2 className="font-bold text-white tracking-tight">{t.studyTutorLive}</h2>
              <p className="text-[10px] uppercase font-black tracking-widest text-gray-500">{status}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-all hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Main Interaction Area */}
          <div className="flex-1 p-8 flex flex-col items-center justify-center relative overflow-hidden bg-[radial-gradient(circle_at_center,rgba(234,88,12,0.03)_0%,transparent_100%)]">
            {/* Dynamic Particle Swarm & Neural Grid */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
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
                    i % 4 === 0 ? 'bg-orange-400' : i % 4 === 1 ? 'bg-orange-500' : i % 4 === 2 ? 'bg-white' : 'bg-blue-400'
                  }`}
                />
              ))}
            </div>

            <div className="relative z-10 flex flex-col items-center gap-12">
              {/* AI Visualizer - The Astra Star Core */}
              <div className="relative w-80 h-80 flex items-center justify-center">
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
                  className={`w-56 h-56 rounded-full flex items-center justify-center relative z-20 transition-all duration-700 ${
                    isConnected 
                      ? 'bg-black/60 border border-white/10' 
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="absolute inset-2 rounded-full border border-white/5 backdrop-blur-md" />
                  
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
                        <span className="text-[10px] font-black tracking-widest text-orange-500/50 uppercase">{t.syncing}</span>
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
                            <Mic size={80} className="text-blue-400 transition-colors duration-500" />
                          ) : (
                            <Brain size={80} className={`${visualState === 'speaking' || visualState === 'thinking' ? 'text-orange-400' : 'text-orange-600'} transition-colors duration-500`} />
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
                             className="absolute w-1 h-1 bg-white rounded-full blur-[1px]"
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
                      <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} className="flex flex-col items-center gap-4">
                        <Brain size={80} className="text-gray-400" />
                        <span className="text-[10px] font-black tracking-widest text-gray-500 uppercase">{t.awaitingLink}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Core Status Badge */}
                {isConnected && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-30"
                  >
                    <div className="px-6 py-2 bg-black border border-orange-500/30 rounded-full text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(234,88,12,0.2)] flex items-center gap-3">
                      <motion.div 
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-2 h-2 bg-orange-500 rounded-full"
                      />
                      ASTRA 3.1 LIVE
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="text-center space-y-6 max-w-sm">
                {!isConnected && !isConnecting ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <div className="space-y-3">
                       <h3 className="text-3xl font-black italic tracking-tighter text-white">{t.neuralSession}</h3>
                       <p className="text-xs text-gray-400 font-medium leading-relaxed uppercase tracking-widest opacity-60">{t.initializingLink}</p>
                    </div>

                    {errorMessage && (
                      <div className="p-4 bg-red-950/45 border border-red-500/20 rounded-2xl flex items-start gap-3 text-left">
                        <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Server Configuration Needed</p>
                          <p className="text-[11px] text-red-200/90 leading-normal">
                            {errorMessage}
                          </p>
                          <p className="text-[10px] text-gray-400/60 leading-normal mt-1.5 font-medium">
                            ℹ️ Check your <span className="font-mono text-gray-300 bg-white/5 px-1 rounded">GEMINI_API_KEY</span> inside the Secrets section in AI Studio.
                          </p>
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={startSession}
                      className="group relative px-16 py-6 bg-orange-600 text-white rounded-3xl font-black text-xl transition-all transform hover:-translate-y-2 active:translate-y-0 shadow-[0_20px_50px_rgba(234,88,12,0.3)] flex items-center gap-4 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                      <Volume2 size={28} className="group-hover:rotate-12 transition-transform duration-300" /> 
                      {t.connectNeuralLink}
                    </button>
                  </motion.div>
                ) : isConnected && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-2xl bg-orange-600/10 border border-orange-600/30 text-[11px] font-black text-orange-400 uppercase tracking-[0.2em] shadow-lg shadow-orange-600/5">
                      <motion.div
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <MessageCircle size={14} />
                      </motion.div>
                      {t.auraActive}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-white tracking-tight uppercase">
                        {isAiThinking ? t.processing : isAiSpeaking ? t.astraAnswering : isUserSpeaking ? t.listeningToYou : t.imListening}
                      </h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest opacity-40 italic">
                        {isAiThinking ? t.analyzingRequest : isAiSpeaking ? t.waitForExplanation : isUserSpeaking ? t.keepTalking : t.takeawaysPlaceholder}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Transcription Display */}
            {isConnected && (
              <div className="absolute bottom-10 left-10 right-10 max-w-2xl mx-auto z-40">
                <div 
                  ref={transcriptionContainerRef}
                  className="bg-black/80 backdrop-blur-3xl rounded-3xl border border-white/10 p-6 shadow-2xl flex flex-col gap-4 max-h-56 overflow-y-auto custom-scrollbar scroll-smooth"
                >
                  {transcription.length === 0 ? (
                    <div className="h-full flex items-center justify-center py-4">
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest animate-pulse">
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
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className={`flex flex-col ${isAstra ? 'items-start' : 'items-end'}`}
                          >
                            <div className={`max-w-[90%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                              isAstra 
                                ? 'bg-orange-600/10 border border-orange-500/20 text-orange-200' 
                                : 'bg-white/5 border border-white/10 text-gray-200'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isAstra ? 'text-orange-500' : 'text-gray-500'}`}>
                                  {isAstra ? 'ASTRA LEARNING AI' : 'YOU'}
                                </span>
                                {isAstra && isAiSpeaking && i === transcription.length - 1 && (
                                  <motion.div 
                                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
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
          <div className="w-full md:w-80 bg-black/40 border-l border-white/5 p-4 flex flex-col gap-4 md:overflow-hidden overflow-y-auto custom-scrollbar">
            {/* YouTube Player */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{t.sourceMaterial}</h4>
              <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                {videoId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 bg-white/5">
                    <Video size={32} />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{t.selfView}</h4>
              <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/10 relative group bg-black/40">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {!isCameraOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                    <VideoOff size={24} />
                    <span className="text-[8px] mt-2 font-mono">{t.camOff}</span>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" width="320" height="240" />
              </div>
            </div>

            <div className="space-y-3">
               <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{t.controls}</h4>
               <div className="grid grid-cols-2 gap-2">
                 <button 
                  disabled={!isConnected}
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${isMuted ? 'bg-red-600/20 text-red-500' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 border border-white/5'}`}
                 >
                   {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                   <span className="text-[8px] font-bold uppercase">{isMuted ? t.unmute : t.mute}</span>
                 </button>
                 <button 
                  disabled={!isConnected}
                  onClick={toggleCamera}
                  className={`p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${isCameraOn ? 'bg-green-600/20 text-green-500 shadow-lg shadow-green-600/10' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 border border-white/5'}`}
                 >
                   {isCameraOn ? <Video size={18} /> : <VideoOff size={18} />}
                   <span className="text-[8px] font-bold uppercase">{isCameraOn ? t.camOn : t.camOff}</span>
                 </button>
               </div>
            </div>

            <button 
              onClick={onClose}
              className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-500 hover:text-white rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest"
            >
              {t.backToOverview}
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
            className="absolute inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-[2rem] md:rounded-[2.5rem] w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto custom-scrollbar shadow-2xl relative"
            >
              <div className="p-5 sm:p-6 md:p-8 space-y-6 md:space-y-8">
                {/* Header Side */}
                <div className="flex flex-col items-center text-center gap-6">
                  <div className="w-16 h-16 bg-orange-600/20 rounded-3xl flex items-center justify-center border border-orange-500/30 shadow-lg shadow-orange-600/20">
                    <Brain size={32} className="text-orange-500" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white uppercase">{t.onboardingTitle}</h2>
                    <p className="text-gray-400 text-base leading-relaxed">{t.onboardingDesc}</p>
                  </div>
                </div>

                {/* Primary Features */}
                <div className="grid gap-4">
                  {[
                    { icon: <Mic className="text-orange-500" />, title: t.onboardingStep1Title, desc: t.onboardingStep1Desc },
                    { icon: <BrainCircuit className="text-orange-500" />, title: t.onboardingStep2Title, desc: t.onboardingStep2Desc },
                    { icon: <Zap className="text-orange-500" />, title: t.onboardingStep3Title, desc: t.onboardingStep3Desc },
                  ].map((step, idx) => (
                    <div key={idx} className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex-shrink-0 w-10 h-10 bg-orange-600/10 rounded-xl flex items-center justify-center border border-orange-500/20">
                        {step.icon}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-white text-sm">{step.title}</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Example Questions Section */}
                <div className="p-6 rounded-3xl bg-orange-600/5 border border-orange-500/20 space-y-4">
                  <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
                    <HelpCircle size={18} />
                    <span>{t.exampleQuestionsTitle}</span>
                  </div>
                  <div className="grid gap-2">
                    {[t.exampleQuestion1, t.exampleQuestion2, t.exampleQuestion3].map((q, i) => (
                      <div key={i} className="text-sm text-gray-400 italic">
                        &quot;{q}&quot;
                      </div>
                    ))}
                  </div>
                </div>

                {/* Limitations Alert */}
                <div className="flex gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                  <AlertTriangle size={20} className="text-yellow-500/60 flex-shrink-0" />
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-yellow-500/80">{t.onboardingStep4Title}</h4>
                    <p className="text-[11px] text-gray-500 leading-normal">{t.onboardingStep4Desc}</p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="space-y-6 pt-4 border-t border-white/5">
                  <div 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => setDontShowAgain(!dontShowAgain)}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${dontShowAgain ? 'bg-orange-600 border-orange-600' : 'border-white/20 bg-white/5 group-hover:border-white/40'}`}>
                      {dontShowAgain && <div className="w-2 h-2 bg-white rounded-sm" />}
                    </div>
                    <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors uppercase font-black tracking-widest">{t.dontShowAgain}</span>
                  </div>

                  <button 
                    onClick={() => {
                      if (dontShowAgain) {
                        localStorage.setItem('astra_onboarding_dismissed', 'true');
                      }
                      setShowOnboarding(false);
                    }}
                    className="w-full py-4 md:py-5 bg-orange-600 text-white rounded-3xl font-black text-lg md:text-xl hover:bg-orange-500 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-orange-600/25 uppercase tracking-tight"
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
