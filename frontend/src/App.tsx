import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Youtube, 
  BookOpen, 
  BrainCircuit, 
  MessageSquare, 
  CheckCircle, 
  ArrowRight, 
  Menu, 
  X, 
  Sun, 
  Moon,
  Zap,
  LayoutDashboard,
  LogOut,
  Settings,
  History,
  User as UserIcon,
  Languages,
  Loader2,
  ExternalLink,
  ChevronRight,
  Search
} from 'lucide-react';
import { checkHealth, api } from './lib/api';
import { useAuth } from './contexts/AuthContext';
import { analyzeVideoContent, AnalysisResult } from './services/geminiService';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './lib/firebase';
import { AnalysisResultView } from './components/AnalysisResultView';
import { handleFirestoreError, OperationType } from './lib/firestoreUtils';
import { Pricing } from './components/Pricing';
import { AICore } from './components/AICore';
import { AIActivityFeed } from './components/AIActivityFeed';
import axios from 'axios';

// Types
type ComponentState = 'landing' | 'dashboard';
type Language = 'pt' | 'en' | 'es';

const TRANSLATIONS = {
  pt: {
    features: "Funcionalidades",
    pricing: "Preços",
    signIn: "Entrar",
    startFree: "Começar Agora",
    watchDemo: "Ver Astra em Ação",
    heroTitle: "TRANSFORME ASSISTIR",
    heroHighlight: "EM APRENDER.",
    heroDesc: "Uma plataforma de aprendizado com IA que transforma vídeos em resumos, mapas mentais, quizzes, flashcards e experiências de estudo personalizadas.",
    pwrByPrecision: "IMPULSIONADO PELA PRECISÃO.",
    aiSummaries: "Resumos com IA",
    aiSummariesDesc: "Obtenha os conceitos centrais sem enrolação.",
    mindMaps: "Mapas Mentais",
    mindMapsDesc: "Visualize a estrutura do vídeo automaticamente.",
    studyTutor: "Tutor de Estudos",
    studyTutorDesc: "Converse com seu vídeo para tirar dúvidas complexas.",
    quizGen: "Geração de Quizzes",
    quizGenDesc: "Teste seus conhecimentos com perguntas orientadas por IA.",
    welcome: "Bem-vindo de volta, Explorador",
    readyAnalyze: "Pronto para analisar outra obra-prima?",
    videoUrl: "URL do Vídeo no YouTube",
    analyze: "Analisar",
    noHistory: "Sem Histórico Ainda",
    noHistoryDesc: "Analise seu primeiro vídeo para ver os resultados aqui.",
    upgradePro: "Upgrade para o Pro",
    upgradeProDesc: "Tokens de IA ilimitados e exportações premium.",
    viewPricing: "Ver Planos",
    menu: "Menu",
    dashboard: "Painel",
    history: "Histórico",
    settings: "Configurações",
    exit: "Sair",
    loginTitle: "BEM-VINDO À ASTRA",
    loginDesc: "Junte-se a milhares de estudantes e pesquisadores transformando sua forma de aprender.",
    continueGoogle: "Continuar com Google",
    terms: "Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade.",
    signOut: "Sair",
    searchHistory: "Pesquisar histórico...",
    clearSearch: "Limpar Pesquisa",
    astraV3: "ASTRA v3",
    premium: "PREMIUM",
    noResults: "Nenhum resultado para",
    adjustSearch: "Tente ajustar sua pesquisa ou palavras-chave.",
    summary: "Resumo",
    quiz: "Quiz",
    mindmap: "Mapa Mental",
    tutor: "Tutor",
    transcript: "Transcrição",
    interactiveTutor: "Tutor de Estudo Interativo",
    tutorDesc: "Experimente o futuro da aprendizagem. Tenha uma conversa de voz e vídeo em tempo real com nosso tutor de IA sobre o conteúdo deste vídeo.",
    lowLatency: "Baixa Latência",
    videoAware: "Consciente do Vídeo",
    synthesizedInsight: "Insight Sintetizado",
    noSummary: "Nenhum resumo disponível.",
    keyTakeaways: "Principais Aprendizados",
    actionableLessons: "Lições Aplicáveis",
    rationale: "Justificativa",
    finishQuiz: "Finalizar Quiz",
    yourScore: "SUA PONTUAÇÃO",
    tryAgain: "Tentar Novamente",
    generateMoreQuestions: "Gerar mais questões",
    aiGeneratingExtra: "IA gerando novos desafios...",
    proComingSoon: "Renderização avançada de mapa visual em breve no Pro.",
    rawTranscript: "Dados da Transcrição",
    downloadTxt: "Baixar .txt",
    noTranscript: "Nenhuma transcrição disponível para este vídeo.",
    closeAnalysis: "Fechar Análise",
    studyTutorLive: "Tutor de Estudos Ao Vivo",
    onboardingTitle: "Bem-vindo ao Astra Tutor",
    onboardingDesc: "Um mentor de IA totalmente conversacional que entende cada detalhe deste vídeo.",
    onboardingStep1Title: "Fale Naturalmente",
    onboardingStep1Desc: "Sem necessidade de digitar. Basta falar com a Astra como faria com um mentor humano.",
    onboardingStep2Title: "Consciente do Contexto",
    onboardingStep2Desc: "A Astra analisou a transcrição completa e pode responder a perguntas complexas dinamicamente.",
    onboardingStep3Title: "Feedback em Tempo Real",
    onboardingStep3Desc: "O núcleo visual reage à sua voz e ao status da IA em tempo real.",
    getStarted: "Começar",
    onboardingStep4Title: "Limitações",
    onboardingStep4Desc: "Como toda IA, a Astra pode ocasionalmente cometer erros ou omitir detalhes técnicos muito específicos. Sempre verifique informações críticas.",
    exampleQuestionsTitle: "Tente perguntar:",
    exampleQuestion1: "Resuma os argumentos dos primeiros 5 minutos.",
    exampleQuestion2: "Explique o conceito de [X] de forma simples.",
    exampleQuestion3: "Quais exemplos práticos foram citados?",
    dontShowAgain: "Não mostrar isso novamente",
    startLearning: "Começar Aprendizado",
    neuralSession: "SESSÃO NEURAL",
    initializingLink: "Inicialize o link para começar a aprendizagem conversacional.",
    connectNeuralLink: "Conectar Link Neural",
    auraActive: "Aura Ativa",
    processing: "Processando...",
    astraAnswering: "Astra está respondendo",
    listeningToYou: "Ouvindo você",
    imListening: "Estou Ouvindo",
    analyzingRequest: "Analisando seu pedido",
    waitForExplanation: "Aguarde a explicação",
    keepTalking: "Continue falando...",
    takeawaysPlaceholder: '"Quais são as principais conclusões?"',
    syncing: "Sincronizando...",
    awaitingLink: "Aguardando Link",
    sourceMaterial: "Material de Origem",
    selfView: "Vista Própria",
    controls: "Controles",
    backToOverview: "Voltar para Visão Geral",
    mute: "Mudo",
    unmute: "Desativar Mudo",
    camOn: "Ligar Cam",
    camOff: "Desligar Cam",
    readyToStart: "Pronto para iniciar a sessão",
    initializingGemini: "Inicializando Gemini 3.1 Live...",
    liveSessionActive: "Sessão Ao Vivo Ativa",
    sessionError: "Erro na sessão. Por favor, reconecte.",
    failedConnectMic: "Falha ao conectar. Verifique se o microfone está ativado.",
    sessionEnded: "Sessão encerrada",
    fallbackTranscript: "Astra Fallback: Transcrição indisponível.",
    aiStatus: "Status da IA",
    transcriptReady: "TRANSCRIÇÃO: PRONTA",
    // Pricing
    pricingTitle: "Planos de Preços",
    pricingHero: "INVISTA NA SUA EVOLUÇÃO.",
    pricingDesc: "Escolha o plano que se aplica à sua jornada de aprendizagem. De exploradores casuais a profissionais de alto desempenho.",
    usageLimits: "Limites de Uso",
    moreFeatures: "Recursos",
    mostPopular: "Mais Popular",
    secureCloud: "Pagamentos seguros e processamento em nuvem 100% seguro",
    signInToChoose: "Por favor, entre para escolher um plano.",
    planUpdated: "Plano atualizado para",
    freeTrial: "Teste Grátis",
    freeTrialDesc: "30 Dias de Acesso",
    basicPlan: "Plano Básico",
    premiumPlan: "Plano Premium",
    tryPlatform: "Experimente a plataforma",
    individualStudents: "Estudantes individuais",
    prosTeachers: "Profissionais e Professores",
    perMonth: "por mês",
    startFreeTrial: "Começar Teste Grátis",
    subscribeBasic: "Assinar Básico",
    getPremium: "Obter Premium",
    limitVidsWeek: "Até 3 vídeos por semana",
    limitDuration15: "Duração máxima de 15 min",
    limitVidsMonth50: "Até 50 vídeos por mês",
    limitDuration60: "Duração máxima de 60 min",
    limitVidsMonth200: "Até 200 vídeos por mês",
    noDurationLimit: "Sem limite de duração",
    featBasicSummary: "Resumo IA Básico",
    featDefaultLang: "Suporte idioma padrão",
    featLimitedHist: "Acesso limitado ao histórico",
    featPptx: "Geração de .pptx",
    featFullTutor: "Tutor interativo completo",
    featFullSummary: "Resumo e transcrição completos",
    featQuizGen: "Geração de Quizzes com IA",
    featMultiLang: "Multi-idioma (PT/EN/ES)",
    featBasicMindmap: "Mapa Mental Básico",
    featStandardHist: "Acesso padrão ao histórico",
    featAdvancedMindmap: "Mapa Mental Avançado",
    featPriority: "Prioridade de Processamento",
    featMultipleFormats: "Histórico completo e formatos variados",
    builtWithPrecision: "Construído com precisão.",
    connecting: "Conectando ao YouTube e Analisando...",
    transcriptUnavailableFallback: "Transcrição indisponível. Usando fallback baseado em metadados...",
    success: "Sucesso!",
    analysisFailed: "Análise Falhou",
    noResponse: "Sem resposta do servidor",
    networkIssue: "Problema de conexão de rede ou tempo de espera do servidor esgotado.",
    hero: {
      badgeOnline: "Astra AI Core Online",
      badgeOffline: "Astra AI Core Offline",
      badgeChecking: "Verificando...",
      subtitle: "Uma plataforma de aprendizado com IA que transforma vídeos em resumos, mapas mentais, quizzes, flashcards e experiências de estudo personalizadas.",
      processingStates: [
        "Analisando transcrição...",
        "Extraindo conceitos principais...",
        "Construindo mapa mental...",
        "Gerando flashcards...",
        "Preparando tutor inteligente...",
        "Quiz concluído."
      ],
      cpuCore: "NÚCLEO CPU: ATIVO",
      neuralLink: "LINK NEURAL: ESTABELECIDO",
      footerStatus: "SISTEMA DE APRENDIZADO ATIVO",
      dataChips: ["VÍDEO", "TRANSCRIÇÃO", "CONCEITOS", "RESUMO", "MAPA MENTAL", "QUIZ", "FLASHCARDS", "TUTOR"],
      orbitingLabels: ["ANALISANDO", "MAPEANDO", "EXTRAINDO", "SINTETIZANDO"],
      infoCards: [
        "Extraindo metadados...",
        "Processando áudio...",
        "Identificando tópicos...",
        "Gerando conexões...",
        "Refinando material..."
      ]
    },
    tutorSystemInstruction: "Você é o Astra Tutor, um educador brilhante e prestativo. Você está em uma sessão ao vivo sobre o vídeo: \"{videoTitle}\". Use o contexto da transcrição para responder perguntas exatamente como um tutor faria. Seja conversacional, conciso e encoraje o pensamento crítico. Mantenha as respostas curtas para melhor interação em tempo real.",
    quizScoreMessage: "Ótimo esforço! Conhecimento é poder.",
    activityFeed: {
      title: "Atividade da IA em tempo real",
      subtitle: "Acompanhe como o Astra.ai transforma conteúdo em experiências de aprendizado personalizadas.",
      now: "agora",
      recent: "recentemente",
      ago2: "há 2 min",
      ago5: "há 5 min",
      items: [
        {
          title: "Resumo gerado com sucesso",
          desc: "Principais conceitos extraídos com precisão neural.",
          type: "summary"
        },
        {
          title: "Mapa mental concluído",
          desc: "Estrutura visual de conhecimento organizada automaticamente.",
          type: "mindmap"
        },
        {
          title: "Quiz criado pela IA",
          desc: "Questões personalizadas para testar sua retenção.",
          type: "quiz"
        },
        {
          title: "Flashcards preparados",
          desc: "Cartões de revisão otimizados para memorização.",
          type: "flashcards"
        },
        {
          title: "Tutor inteligente ativo",
          desc: "IA analisou novo conteúdo e está pronta para ensinar.",
          type: "tutor"
        },
        {
          title: "Recomendações atualizadas",
          desc: "Novos caminhos de estudo sugeridos pela Astra.",
          type: "rec"
        }
      ]
    },
  },
  en: {
    features: "Features",
    pricing: "Pricing",
    signIn: "Sign In",
    startFree: "Get Started Now",
    watchDemo: "See Astra in Action",
    heroTitle: "TURN WATCHING",
    heroHighlight: "INTO LEARNING.",
    heroDesc: "An AI-powered learning platform that transforms videos into summaries, mind maps, quizzes, flashcards, and personalized study experiences.",
    pwrByPrecision: "POWERED BY PRECISION.",
    aiSummaries: "AI Summaries",
    aiSummariesDesc: "Get the core concepts without the fluff.",
    mindMaps: "Mind Maps",
    mindMapsDesc: "Visualize the video structure automatically.",
    studyTutor: "Study Tutor",
    studyTutorDesc: "Chat with your video to clarify complex topics.",
    quizGen: "Quiz Generation",
    quizGenDesc: "Test your knowledge with AI-driven questions.",
    welcome: "Welcome back, Explorer",
    readyAnalyze: "Ready to analyze another masterpiece?",
    videoUrl: "YouTube Video URL",
    analyze: "Analyze",
    noHistory: "No History Yet",
    noHistoryDesc: "Analyze your first video to see results here.",
    upgradePro: "Upgrade to Pro",
    upgradeProDesc: "Unlimited AI tokens and premium exports.",
    viewPricing: "View Pricing",
    menu: "Menu",
    dashboard: "Dashboard",
    history: "History",
    settings: "Settings",
    exit: "Exit",
    loginTitle: "WELCOME TO ASTRA",
    loginDesc: "Join thousands of students and researchers transforming how they learn.",
    continueGoogle: "Continue with Google",
    terms: "By continuing, you agree to our Terms of Service and Privacy Policy.",
    signOut: "Sign Out",
    searchHistory: "Search history...",
    clearSearch: "Clear Search",
    astraV3: "ASTRA v3",
    premium: "PREMIUM",
    noResults: "No results for",
    adjustSearch: "Try adjusting your search or keywords.",
    summary: "Summary",
    quiz: "Quiz",
    mindmap: "Mind Map",
    tutor: "Tutor",
    transcript: "Transcript",
    interactiveTutor: "Interactive Study Tutor",
    tutorDesc: "Experience the future of learning. Have a live, real-time voice and video conversation with our AI tutor about this video's content.",
    lowLatency: "Low Latency",
    videoAware: "Video-Aware",
    synthesizedInsight: "Synthesized Insight",
    noSummary: "No summary available.",
    keyTakeaways: "Key Takeaways",
    actionableLessons: "Actionable Lessons",
    rationale: "Rationale",
    finishQuiz: "Finish Quiz",
    yourScore: "YOUR SCORE",
    tryAgain: "Try Again",
    generateMoreQuestions: "Generate more questions",
    aiGeneratingExtra: "AI generating new challenges...",
    proComingSoon: "Advanced visual map rendering coming soon in Pro.",
    rawTranscript: "Raw Transcript Data",
    downloadTxt: "Download .txt",
    noTranscript: "No transcript available for this video.",
    closeAnalysis: "Close Analysis",
    studyTutorLive: "Study Tutor Live",
    onboardingTitle: "Welcome to Astra Tutor",
    onboardingDesc: "A fully conversational AI mentor that understands every detail of this video.",
    onboardingStep1Title: "Speak Naturally",
    onboardingStep1Desc: "No typing required. Just talk to Astra like you would with a human mentor.",
    onboardingStep2Title: "Context Aware",
    onboardingStep2Desc: "Astra has analyzed the full transcript and can answer complex questions dynamically.",
    onboardingStep3Title: "Real-time Feedback",
    onboardingStep3Desc: "The visual core reacts to your voice and AI status in real-time.",
    getStarted: "Get Started",
    onboardingStep4Title: "Limitations",
    onboardingStep4Desc: "Like all AI, Astra may occasionally make mistakes or miss highly specific technical details. Always verify critical information.",
    exampleQuestionsTitle: "Try asking:",
    exampleQuestion1: "Summarize the arguments from the first 5 mins.",
    exampleQuestion2: "Explain the concept of [X] simply.",
    exampleQuestion3: "What practical examples were mentioned?",
    dontShowAgain: "Don't show this again",
    startLearning: "Start Learning",
    neuralSession: "NEURAL SESSION",
    initializingLink: "Initialize link to start conversational learning.",
    connectNeuralLink: "Connect Neural Link",
    auraActive: "Aura Active",
    processing: "Processing...",
    astraAnswering: "Astra is answering",
    listeningToYou: "Listening to you",
    imListening: "I'm Listening",
    analyzingRequest: "Analyzing your request",
    waitForExplanation: "Wait for the explanation",
    keepTalking: "Keep talking...",
    takeawaysPlaceholder: '"What are the main takeaways?"',
    syncing: "Syncing...",
    awaitingLink: "Awaiting Link",
    sourceMaterial: "Source Material",
    selfView: "Self View",
    controls: "Controls",
    backToOverview: "Back to Overview",
    mute: "Mute",
    unmute: "Unmute",
    camOn: "Cam On",
    camOff: "Cam Off",
    readyToStart: "Ready to start session",
    initializingGemini: "Initializing Gemini 3.1 Live...",
    liveSessionActive: "Live Session Active",
    sessionError: "Session error. Please reconnect.",
    failedConnectMic: "Failed to connect. Ensure your microphone is enabled.",
    sessionEnded: "Session ended",
    fallbackTranscript: "Astra Fallback: Transcript unavailable.",
    aiStatus: "AI Status",
    transcriptReady: "TRANSCRIPT: READY",
    // Pricing
    pricingTitle: "Pricing Plans",
    pricingHero: "INVEST IN YOUR EVOLUTION.",
    pricingDesc: "Choose the plan that fits your learning journey. From casual explorers to high-performance professionals.",
    usageLimits: "Usage Limits",
    moreFeatures: "Features",
    mostPopular: "Most Popular",
    secureCloud: "Safe payments & 100% Secure cloud processing",
    signInToChoose: "Please sign in to choose a plan.",
    planUpdated: "Plan updated to",
    freeTrial: "Free Trial",
    freeTrialDesc: "30 Days Access",
    basicPlan: "Basic Plan",
    premiumPlan: "Premium Plan",
    tryPlatform: "Try the platform",
    individualStudents: "Individual students",
    prosTeachers: "Professionals & Teachers",
    perMonth: "per month",
    startFreeTrial: "Start Free Trial",
    subscribeBasic: "Subscribe Basic",
    getPremium: "Get Premium",
    limitVidsWeek: "Up to 3 videos per week",
    limitDuration15: "Maximum 15 minutes",
    limitVidsMonth50: "Up to 50 videos per month",
    limitDuration60: "Maximum 60 minutes",
    limitVidsMonth200: "Up to 200 videos per month",
    noDurationLimit: "No video length restrictions",
    featBasicSummary: "Basic AI Summary",
    featDefaultLang: "Default language support",
    featLimitedHist: "Limited history access",
    featPptx: ".pptx generation",
    featFullTutor: "Full interactive tutor",
    featFullSummary: "Full AI Summary & Transcription",
    featQuizGen: "AI Quiz Generation",
    featMultiLang: "Multi-language (PT/EN/ES)",
    featBasicMindmap: "Basic Mind Map",
    featStandardHist: "Standard History access",
    featAdvancedMindmap: "Advanced Mind Map & Export",
    featPriority: "AI Processing Priority",
    featMultipleFormats: "Full history & Multiple formats",
    builtWithPrecision: "Built with precision.",
    connecting: "Connecting to YouTube & Analyzing...",
    transcriptUnavailableFallback: "Transcript unavailable. Using metadata-based fallback...",
    success: "Success!",
    analysisFailed: "Analysis Failed",
    noResponse: "No response from server",
    networkIssue: "Network connection issue or server timeout.",
    hero: {
      badgeOnline: "Astra AI Core Online",
      badgeOffline: "Astra AI Core Offline",
      badgeChecking: "Checking...",
      subtitle: "An AI-powered learning platform that transforms videos into summaries, mind maps, quizzes, flashcards and personalized study experiences.",
      processingStates: [
        "Analyzing transcript...",
        "Extracting key concepts...",
        "Building mind map...",
        "Generating flashcards...",
        "Preparing intelligent tutor...",
        "Quiz completed."
      ],
      cpuCore: "CPU CORE: ACTIVE",
      neuralLink: "NEURAL LINK: ESTABLISHED",
      footerStatus: "LEARNING SYSTEM ACTIVE",
      dataChips: ["VIDEO", "TRANSCRIPT", "CONCEPTS", "SUMMARY", "MIND MAP", "QUIZ", "FLASHCARDS", "TUTOR"],
      orbitingLabels: ["ANALYZING", "MAPPING", "EXTRACTING", "SYNTHESIZING"],
      infoCards: [
        "Extracting metadata...",
        "Processing audio...",
        "Identifying topics...",
        "Generating links...",
        "Refining content..."
      ]
    },
    tutorSystemInstruction: "You are Astra Tutor, a brilliant and supportive educator. You are in a live session about the video: \"{videoTitle}\". Use the transcript context to answer questions exactly as a tutor would. Be conversational, concise, and encourage critical thinking. Keep responses short for better real-time interaction.",
    quizScoreMessage: "Great effort! Knowledge is power.",
    activityFeed: {
      title: "Real-time AI activity",
      subtitle: "Watch how Astra.ai transforms content into personalized learning experiences.",
      now: "now",
      recent: "recently",
      ago2: "2 min ago",
      ago5: "5 min ago",
      items: [
        {
          title: "Summary generated successfully",
          desc: "Key concepts extracted with neural precision.",
          type: "summary"
        },
        {
          title: "Mind map completed",
          desc: "Visual knowledge structure organized automatically.",
          type: "mindmap"
        },
        {
          title: "Quiz created by AI",
          desc: "Personalized questions to test your retention.",
          type: "quiz"
        },
        {
          title: "Flashcards prepared",
          desc: "Review cards optimized for memorization.",
          type: "flashcards"
        },
        {
          title: "Intelligent tutor active",
          desc: "AI analyzed new content and is ready to teach.",
          type: "tutor"
        },
        {
          title: "Recommendations updated",
          desc: "New study paths suggested by Astra.",
          type: "rec"
        }
      ]
    },
  },
  es: {
    features: "Funcionalidades",
    pricing: "Precios",
    signIn: "Iniciar Sesión",
    startFree: "Empezar Ahora",
    watchDemo: "Ver Astra en Acción",
    heroTitle: "CONVIERTE MIRAR",
    heroHighlight: "EN APRENDER.",
    heroDesc: "Una plataforma de aprendizaje con IA que transforma videos en resúmenes, mapas mentales, cuestionarios, flashcards y experiencias de estudio personalizadas.",
    pwrByPrecision: "IMPULSIONADO POR LA PRECISÃO.",
    aiSummaries: "Resúmenes con IA",
    aiSummariesDesc: "Obtén los conceptos clave sin rodeos.",
    mindMaps: "Mapas Mentales",
    mindMapsDesc: "Visualiza la estructura del vídeo automáticamente.",
    studyTutor: "Tutor de Estudio",
    studyTutorDesc: "Chatea con tu vídeo para aclarar dudas complejas.",
    quizGen: "Generación de Cuestionarios",
    quizGenDesc: "Pon a prueba tus conocimientos con preguntas guiadas por IA.",
    welcome: "Bienvenido de nuevo, Explorador",
    readyAnalyze: "¿Listo para analizar otra obra maestra?",
    videoUrl: "URL del Vídeo de YouTube",
    analyze: "Analizar",
    noHistory: "Sin Historial Aún",
    noHistoryDesc: "Analiza tu primer vídeo para ver los resultados aquí.",
    upgradePro: "Mejorar a Pro",
    upgradeProDesc: "Tokens de IA ilimitados e exportaciones premium.",
    viewPricing: "Ver Precios",
    menu: "Menú",
    dashboard: "Panel",
    history: "Historial",
    settings: "Ajustes",
    exit: "Salir",
    loginTitle: "BIENVENIDO A ASTRA",
    loginDesc: "Únete a miles de estudiantes e investigadores transformando su forma de aprender.",
    continueGoogle: "Continuar con Google",
    terms: "Al continuar, aceptas nuestros Térmos de Servicio y Política de Privacidad.",
    signOut: "Cerrar Sesión",
    searchHistory: "Buscar historial...",
    clearSearch: "Limpar Búsqueda",
    astraV3: "ASTRA v3",
    premium: "PREMIUM",
    noResults: "No hay resultados para",
    adjustSearch: "Prueba ajustando tu búsqueda o palabras clave.",
    summary: "Resumen",
    quiz: "Cuestionario",
    mindmap: "Mapa Mental",
    tutor: "Tutor",
    transcript: "Transcripción",
    interactiveTutor: "Tutor de Estudio Interactivo",
    tutorDesc: "Experimenta el futuro del aprendizaje. Mantén una conversación de voz y vídeo en tiempo real con nuestro tutor de IA sobre el contenido de este vídeo.",
    lowLatency: "Baja Latencia",
    videoAware: "Consciente del Vídeo",
    synthesizedInsight: "Información Sintetizada",
    noSummary: "No hay resumen disponible.",
    keyTakeaways: "Conclusiones Clave",
    actionableLessons: "Lecciones Aplicables",
    rationale: "Justificación",
    finishQuiz: "Finalizar Cuestionario",
    yourScore: "TU PUNTUACIÓN",
    tryAgain: "Reintentar",
    generateMoreQuestions: "Generar más preguntas",
    aiGeneratingExtra: "IA generando nuevos desafíos...",
    proComingSoon: "Renderizado avanzado de mapas visuales próximamente en Pro.",
    rawTranscript: "Datos de Transcripción",
    downloadTxt: "Descargar .txt",
    noTranscript: "No hay transcripción disponible para este vídeo.",
    closeAnalysis: "Cerrar Análisis",
    studyTutorLive: "Tutor de Estudio en Vivo",
    onboardingTitle: "Bienvenido al Tutor Astra",
    onboardingDesc: "Un mentor de IA totalmente conversacional que entiende cada detalle de este video.",
    onboardingStep1Title: "Habla con Naturalidad",
    onboardingStep1Desc: "No es necesario escribir. Solo habla con Astra como lo harías con un mentor humano.",
    onboardingStep2Title: "Consciente del Contexto",
    onboardingStep2Desc: "Astra ha analizado la transcripción completa y puede responder preguntas complejas dinamicamente.",
    onboardingStep3Title: "Retroalimentación en Tiempo Real",
    onboardingStep3Desc: "El núcleo visual reacciona a tu voz y al estado de la IA en tiempo real.",
    getStarted: "Empezar",
    onboardingStep4Title: "Limitaciones",
    onboardingStep4Desc: "Como toda IA, Astra puede cometer errores ocasionalmente o pasar por alto detalles técnicos muy específicos. Siempre verifica la información crítica.",
    exampleQuestionsTitle: "Prueba preguntando:",
    exampleQuestion1: "Resume los argumentos de los primeros 5 minutos.",
    exampleQuestion2: "Explica el concepto de [X] de forma sencilla.",
    exampleQuestion3: "¿Qué ejemplos prácticos se mencionaron?",
    dontShowAgain: "No volver a mostrar",
    startLearning: "Empezar Aprendizaje",
    neuralSession: "SESIÓN NEURAL",
    initializingLink: "Inicializa el enlace para comenzar el aprendizaje conversacional.",
    connectNeuralLink: "Conectar Enlace Neural",
    auraActive: "Aura Activa",
    processing: "Procesando...",
    astraAnswering: "Astra está respondiendo",
    listeningToYou: "Escuchándote",
    imListening: "Estoy Escuchando",
    analyzingRequest: "Analizando tu solicitud",
    waitForExplanation: "Espera la explicación",
    keepTalking: "Sigue hablando...",
    takeawaysPlaceholder: '"¿Cuáles son las conclusiones principales?"',
    syncing: "Sincronizando...",
    awaitingLink: "Esperando Enlace",
    sourceMaterial: "Material de Origen",
    selfView: "Vista Propia",
    controls: "Controles",
    backToOverview: "Volver a la Vista General",
    mute: "Silenciar",
    unmute: "Activar Sonido",
    camOn: "Cámara On",
    camOff: "Cámara Off",
    readyToStart: "Listo para iniciar sesión",
    initializingGemini: "Inicializando Gemini 3.1 Live...",
    liveSessionActive: "Sesión en Vivo Activa",
    sessionError: "Error de sesión. Por favor, reconéctate.",
    failedConnectMic: "Fallo al conectar. Asegúrate de que tu micrófono esté habilitado.",
    sessionEnded: "Sesión finalizada",
    fallbackTranscript: "Astra Fallback: Transcripción no disponible.",
    aiStatus: "Estado de la IA",
    transcriptReady: "TRANSCRIPCIÓN: LISTA",
    // Pricing
    pricingTitle: "Planes de Precios",
    pricingHero: "INVIERTE EN TU EVOLUCIÓN.",
    pricingDesc: "Elige el plan que se adapte a tu viaje de aprendizaje. Desde exploradores ocasionales hasta profesionales de alto rendimiento.",
    usageLimits: "Límites de Uso",
    moreFeatures: "Funcionalidades",
    mostPopular: "Más Popular",
    secureCloud: "Pagos seguros y procesamiento en la nube 100% seguro",
    signInToChoose: "Por favor, inicia sesión para elegir un plan.",
    planUpdated: "Plan actualizado a",
    freeTrial: "Prueba Gratis",
    freeTrialDesc: "30 Días de Acceso",
    basicPlan: "Plan Básico",
    premiumPlan: "Plan Premium",
    tryPlatform: "Prueba la plataforma",
    individualStudents: "Estudiantes individuales",
    prosTeachers: "Profesionales y Profesores",
    perMonth: "por mes",
    startFreeTrial: "Empezar Prueba Gratis",
    subscribeBasic: "Suscribirse al Básico",
    getPremium: "Obtener Premium",
    limitVidsWeek: "Hasta 3 vídeos por semana",
    limitDuration15: "Duración máxima de 15 min",
    limitVidsMonth50: "Hasta 50 vídeos por mes",
    limitDuration60: "Duración máxima de 60 min",
    limitVidsMonth200: "Hasta 200 vídeos por mes",
    noDurationLimit: "Sin límite de duración",
    featBasicSummary: "Resumen IA Básico",
    featDefaultLang: "Soporte de idioma estándar",
    featLimitedHist: "Acceso limitado al historial",
    featPptx: "Generación de .pptx",
    featFullTutor: "Tutor interactivo completo",
    featFullSummary: "Resumen y transcripción completos",
    featQuizGen: "Generación de Cuestionarios con IA",
    featMultiLang: "Multi-idioma (PT/EN/ES)",
    featBasicMindmap: "Mapa Mental Básico",
    featStandardHist: "Acceso estándar al historial",
    featAdvancedMindmap: "Mapa Mental Avanzado",
    featPriority: "Prioridad de Procesamiento",
    featMultipleFormats: "Historial completo y formatos múltiples",
    builtWithPrecision: "Construido con precisión.",
    connecting: "Conectando con YouTube y Analizando...",
    transcriptUnavailableFallback: "Transcripción no disponible. Usando respaldo basado en metadatos...",
    success: "¡Éxito!",
    analysisFailed: "Análisis Fallido",
    noResponse: "Sin respuesta del servidor",
    networkIssue: "Problema de conexión de red o tiempo de espera del servidor agotado.",
    hero: {
      badgeOnline: "Astra AI Core Online",
      badgeOffline: "Astra AI Core Offline",
      badgeChecking: "Verificando...",
      subtitle: "Una plataforma de aprendizaje con IA que transforma videos en resúmenes, mapas mentales, quizzes, flashcards y experiencias de estudio personalizadas.",
      processingStates: [
        "Analizando transcripción...",
        "Extrayendo conceptos principales...",
        "Construyendo mapa mental...",
        "Generando flashcards...",
        "Preparando tutor inteligente...",
        "Quiz completado."
      ],
      cpuCore: "NÚCLEO CPU: ACTIVO",
      neuralLink: "ENLACE NEURAL: ESTABLECIDO",
      footerStatus: "SISTEMA DE APRENDIZAJE ACTIVO",
      dataChips: ["VIDEO", "TRANSCRIPCIÓN", "CONCEPTOS", "RESUMEN", "MAPA MENTAL", "QUIZ", "FLASHCARDS", "TUTOR"],
      orbitingLabels: ["ANALIZANDO", "MAPA", "EXTRAYENDO", "SINTETIZANDO"],
      infoCards: [
        "Extrayendo metadatos...",
        "Procesando audio...",
        "Identificando temas...",
        "Generando enlaces...",
        "Refinando contenido..."
      ]
    },
    tutorSystemInstruction: "Eres Astra Tutor, un educador brillante y servicial. Estás en una sesión en vivo sobre el video: \"{videoTitle}\". Usa el contexto de la transcripción para responder preguntas exactamente como lo haría un tutor. Sé conversador, conciso y fomenta el pensamiento crítico. Mantén las respuestas cortas para una mejor interacción en tiempo real.",
    quizScoreMessage: "¡Gran esfuerzo! El conocimiento es poder.",
    activityFeed: {
      title: "Actividad de IA en tiempo real",
      subtitle: "Sigue cómo Astra.ai transforma contenido en experiencias de aprendizaje personalizadas.",
      now: "ahora",
      recent: "recientemente",
      ago2: "hace 2 min",
      ago5: "hace 5 min",
      items: [
        {
          title: "Resumen generado con éxito",
          desc: "Conceptos clave extraídos con precisión neural.",
          type: "summary"
        },
        {
          title: "Mapa mental completado",
          desc: "Estructura visual de conocimiento organizada automáticamente.",
          type: "mindmap"
        },
        {
          title: "Quiz creado por la IA",
          desc: "Preguntas personalizadas para probar tu retención.",
          type: "quiz"
        },
        {
          title: "Flashcards preparados",
          desc: "Tarjetas de revisión optimizadas para memorización.",
          type: "flashcards"
        },
        {
          title: "Tutor inteligente activo",
          desc: "La IA analizó contenido nuevo y está lista para enseñar.",
          type: "tutor"
        },
        {
          title: "Recomendaciones actualizadas",
          desc: "Nuevas rutas de estudio sugeridas por Astra.",
          type: "rec"
        }
      ]
    },
  }
};

// UI Components
const Button = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  className = "",
  disabled = false
}: { 
  children: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'ghost', 
  onClick?: () => void,
  className?: string,
  disabled?: boolean
}) => {
  const variants = {
    primary: "bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 shadow-[0_0_20px_-10px_rgba(234,88,12,0.5)] hover:shadow-[0_0_25px_-5px_rgba(234,88,12,0.6)]",
    secondary: "bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md disabled:opacity-50 shadow-lg",
    ghost: "bg-transparent hover:bg-white/5 text-gray-400 hover:text-white disabled:opacity-50"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 rounded-full font-medium transition-all duration-200 flex items-center gap-2 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default function App() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const [view, setView] = useState<ComponentState>('landing');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [apiStatus, setApiStatus] = useState<string>(''); 
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentLang, setCurrentLang] = useState<Language>('pt');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Analysis State
  const [videoUrl, setVideoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const t = TRANSLATIONS[currentLang];

  useEffect(() => {
    setApiStatus(t.hero.badgeChecking);
    checkHealth().then(() => setApiStatus(t.hero.badgeOnline)).catch(() => setApiStatus(t.hero.badgeOffline));
  }, [t.hero.badgeOnline, t.hero.badgeOffline, t.hero.badgeChecking]);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'users', user.uid, 'analyses'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(docs);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/analyses`);
    }
  };

  useEffect(() => {
    if (user) {
      setView('dashboard');
      setShowLoginModal(false);
      setCurrentLang('pt');
      fetchHistory();
    } else {
      setView('landing');
      setHistory([]);
    }
  }, [user]);

  const handleAnalyze = async () => {
    if (!videoUrl || !user) return;
    
    setIsAnalyzing(true);
    setAnalysisStatus(t.connecting);
    
    try {
      // 1. Get info and analysis from backend
      console.log(`[Frontend] Requesting analysis for: "${videoUrl}" (lang: ${currentLang})`);
      const response = await api.post('youtube-info', { url: videoUrl, lang: currentLang }, { timeout: 60000 });
      const data = response.data as AnalysisResult;
      
      console.log(`[Frontend] Received analysis for: ${data.video.videoId} (Mode: ${data.mode})`);
      
      if (data.mode === 'metadata_fallback') {
        setAnalysisStatus(t.transcriptUnavailableFallback);
      } else {
        setAnalysisStatus(t.success);
      }
      
      // 2. Save to Firestore
      const analysesPath = `users/${user.uid}/analyses`;
      try {
        await addDoc(collection(db, analysesPath), {
          userId: user.uid,
          video: {
            videoId: data.video.videoId,
            url: data.video.url,
            title: data.video.title,
            channel: data.video.channel,
            thumbnail: data.video.thumbnail
          },
          mode: data.mode,
          summary: data.summary,
          key_points: data.key_points,
          quiz: data.quiz,
          mind_map: data.mind_map,
          tutor_questions: data.tutor_questions || [],
          limitations: data.limitations || [],
          transcript: data.transcript,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, analysesPath);
      }

      setCurrentResult(data);
      fetchHistory();
      setVideoUrl('');
    } catch (error: any) {
      console.error("Analysis failed:", error);
      
      let errorMessage = t.analysisFailed;
      let errorDetails = "";
      
      if (error.response) {
        // The server responded with a status code outside the 2xx range
        const data = error.response?.data;
        errorMessage = (typeof data === 'object' && data?.error) ? data.error : `${t.analysisFailed} (${error.response.status})`;
        errorDetails = (typeof data === 'object' && data?.details) ? data.details : error.message;
        
        // Specific case for configuration issues
        if (error.response.status === 500 && errorDetails.includes("GEMINI_API_KEY")) {
          errorMessage = "Configuração Necessária";
          errorDetails = "A chave da API do Gemini não foi encontrada ou é inválida. Por favor, verifique as variáveis de ambiente.";
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = t.noResponse;
        errorDetails = t.networkIssue;
      } else {
        errorMessage = t.analysisFailed;
        errorDetails = error.message;
      }
      
      // Use a more subtle alert or handle it via state in the future
      alert(`${errorMessage}\n\n${errorDetails}`);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const filteredHistory = history.filter(item => {
    const title = item.video?.title || item.title || '';
    const transcriptText = item.transcript || '';
    return title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           transcriptText.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleStart = () => {
    if (user) {
      setView('dashboard');
    } else {
      setShowLoginModal(true);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#0a0a0a] text-white dark' : 'bg-gray-50 text-gray-900 light'}`}>
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 border-b backdrop-blur-md ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {view === 'dashboard' && (
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2 md:hidden transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('landing')}>
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
                <Zap className="text-white w-6 h-6 fill-current" />
              </div>
              <span className="text-2xl font-bold tracking-tight">Astra<span className="text-orange-600">.ai</span></span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden md:flex items-center gap-6 mr-6 transition-all">
              <a href="#features" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>{t.features}</a>
              <a href="#pricing" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>{t.pricing}</a>
            </div>
            
            {/* Language Selector */}
            <div className={`flex items-center gap-1 p-1 rounded-full border shrink-0 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-200/50 border-gray-300'}`}>
              <div className="px-1.5 sm:px-2 text-gray-500 hidden sm:block">
                <Languages size={14} />
              </div>
              {(['pt', 'en', 'es'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setCurrentLang(lang)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    currentLang === lang 
                      ? 'bg-orange-600 text-white shadow-sm' 
                      : isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <Button variant="ghost" onClick={toggleTheme} className={`px-2 sm:px-3 ${isDarkMode ? '' : 'bg-gray-200/50 hover:bg-gray-200'}`}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            
            {user ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <div className={`flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full border max-w-[120px] sm:max-w-none overflow-hidden ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                  <img src={user.photoURL || ''} alt="" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full shrink-0" />
                  <span className="text-xs sm:text-sm font-medium truncate hidden sm:inline-block">{user.displayName}</span>
                </div>
                <Button 
                  variant="secondary" 
                  onClick={signOut} 
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 group transition-all flex items-center gap-2 ${
                    isDarkMode 
                      ? 'hover:border-red-500/50 hover:text-red-500' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 shadow-sm'
                  }`}
                >
                  <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline-block">{t.signOut}</span>
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowLoginModal(true)} className="px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm">{t.signIn}</Button>
            )}
          </div>
        </div>
      </nav>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-md border rounded-3xl p-8 shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#0d0d0d] border-white/10' : 'bg-white border-gray-100'}`}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-orange-600" />
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center rotate-3 shadow-lg shadow-orange-600/30">
                  <Zap className="text-white w-8 h-8 fill-current" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold italic">{t.loginTitle}</h2>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t.loginDesc}</p>
                </div>
                <Button 
                  className="w-full justify-center py-4 text-lg shadow-xl shadow-orange-600/10" 
                  onClick={signInWithGoogle}
                >
                  <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5 mr-2" />
                  {t.continueGoogle}
                </Button>
                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {t.terms}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {view === 'landing' ? (
        <main className="pt-20">
          {/* Hero Section */}
          <section className="relative min-h-[calc(100vh-80px)] flex items-center overflow-hidden py-12 lg:py-0">
            {/* Ambient Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-1/4 -right-1/4 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[120px] animate-pulse" />
              <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center text-center lg:items-start lg:text-left"
                >
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-[0.2em] mb-10 ${isDarkMode ? 'bg-orange-600/10 border-orange-600/20 text-orange-500 shadow-[0_0_15px_-5px_rgba(234,88,12,0.3)]' : 'bg-orange-50 border-orange-200 text-orange-600 font-bold shadow-sm'}`}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                    {apiStatus}
                  </motion.div>
                  
                  <h1 className={`text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold leading-[0.9] tracking-tighter mb-10 italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {t.heroTitle} <br />
                    <span className="text-orange-600 drop-shadow-[0_0_30px_rgba(234,88,12,0.1)]">{t.heroHighlight}</span>
                  </h1>
                  
                  <p className={`text-lg sm:text-xl md:text-2xl mb-12 max-w-[540px] leading-relaxed font-light ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t.hero.subtitle}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row flex-wrap gap-5 w-full sm:w-auto">
                    <Button onClick={handleStart} className="justify-center px-10 py-5 text-lg group shadow-xl shadow-orange-600/20 active:scale-95 transition-transform">
                      {t.startFree} <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button variant="secondary" className={`justify-center px-10 py-5 text-lg group active:scale-95 transition-transform ${isDarkMode ? '' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                      {t.watchDemo}
                    </Button>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="relative w-full"
                >
                  <AICore 
                    isDarkMode={isDarkMode} 
                    states={t.hero.processingStates} 
                    dataChips={t.hero.dataChips}
                    orbitingLabels={t.hero.orbitingLabels}
                    infoCards={t.hero.infoCards}
                  />
                  
                  {/* Decorative Streaming Text Elements */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 2 }}
                    className="absolute -bottom-10 left-12 right-12 hidden lg:block"
                  >
                    <div className="flex justify-between items-center px-6 py-3 border border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
                       <div className="flex items-center gap-4 text-orange-500/40 font-mono text-[8px] tracking-[0.3em] uppercase">
                         <span>{t.hero.cpuCore}</span>
                         <div className="w-1 h-1 bg-orange-600/40 rounded-full animate-pulse" />
                         <span>{t.hero.neuralLink}</span>
                       </div>
                       <div className="text-orange-500/60 font-mono text-[8px] tracking-[0.1em] uppercase hidden sm:block">
                         {t.hero.footerStatus}
                       </div>
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: "100%" }}
                         transition={{ duration: 10, repeat: Infinity }}
                         className="h-[1px] bg-gradient-to-r from-transparent via-orange-600/20 to-transparent absolute bottom-0 left-0"
                       />
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </section>

          <AIActivityFeed isDarkMode={isDarkMode} t={t.activityFeed} />

          {/* Features Grid */}
          <section id="features" className={`py-32 border-y ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-100 border-gray-200'}`}>
            <div className="max-w-7xl mx-auto px-6">
              <h2 className="text-4xl font-bold mb-16 text-center italic">{t.pwrByPrecision}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: BookOpen, title: t.aiSummaries, desc: t.aiSummariesDesc },
                  { icon: BrainCircuit, title: t.mindMaps, desc: t.mindMapsDesc },
                  { icon: MessageSquare, title: t.studyTutor, desc: t.studyTutorDesc },
                  { icon: CheckCircle, title: t.quizGen, desc: t.quizGenDesc }
                ].map((feat, i) => (
                  <div key={i} className={`p-8 rounded-3xl border transition-all flex flex-col gap-4 ${isDarkMode ? 'bg-[#0d0d0d] border-white/5 hover:border-orange-600/50' : 'bg-white border-gray-200 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-600/5'}`}>
                    <div className="w-12 h-12 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-500">
                      <feat.icon size={24} />
                    </div>
                    <h3 className="text-xl font-bold">{feat.title}</h3>
                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div id="pricing">
            <Pricing t={t} />
          </div>
        </main>
      ) : (
        /* Dashboard Interface */
        <main className="pt-20 flex min-h-screen relative overflow-hidden">
          {/* Sidebar Overlay for Mobile */}
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              />
            )}
          </AnimatePresence>

          {/* Sidebar */}
          <aside className={`
            fixed md:relative z-50 md:z-auto h-[calc(100vh-80px)] w-64 border-r p-6 space-y-2 transition-transform duration-300 ease-in-out
            ${isDarkMode ? 'translate-x-0 bg-[#0a0a0a] border-white/5' : 'translate-x-0 bg-white border-gray-200'}
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            <div className={`text-xs font-bold uppercase tracking-widest mb-4 mt-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t.menu}</div>
            <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isDarkMode ? 'bg-orange-600/10 text-orange-500' : 'bg-orange-50 text-orange-600 shadow-sm'}`}>
              <LayoutDashboard size={20} /> {t.dashboard}
            </button>
            <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
              <History size={20} /> {t.history}
            </button>
            <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
              <Settings size={20} /> {t.settings}
            </button>
          </aside>

          <section className={`flex-1 p-4 sm:p-8 overflow-y-auto ${isDarkMode ? '' : 'bg-gray-50/50'}`}>
            <div className="max-w-4xl mx-auto space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <h1 className="text-2xl sm:text-3xl font-bold">{t.welcome}</h1>
                <p className={`text-sm sm:text-base italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t.readyAnalyze}</p>
              </motion.div>

              {/* URL Input Area */}
              <div className={`border p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl shadow-black/5 ${isDarkMode ? 'bg-[#0d0d0d] border-white/5' : 'bg-white border-gray-200'}`}>
                <div className="space-y-4">
                  <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t.videoUrl}</label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input 
                      type="text" 
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..." 
                      className={`flex-1 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-orange-600 outline-none transition-all text-sm sm:text-base ${isDarkMode ? 'bg-white/5 border-white/10 border' : 'bg-gray-50 border-gray-200 border text-gray-900'}`}
                    />
                    <Button 
                      onClick={handleAnalyze} 
                      disabled={isAnalyzing || !videoUrl} 
                      className="justify-center sm:w-auto shadow-lg shadow-orange-600/20"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 size={20} className="animate-spin" /> {analysisStatus}
                        </>
                      ) : (
                        <>{t.analyze} <ArrowRight size={20} /></>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  {[t.summary, t.quiz, t.mindmap, t.tutor].map((tool) => (
                    <div key={tool} className={`flex items-center gap-2 p-2 sm:p-3 rounded-xl border text-xs sm:text-sm ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-100 text-gray-600 font-medium'}`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-600 shrink-0" />
                      <span className="truncate">{tool}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analysis Result or Recent Activity */}
              <AnimatePresence mode="wait">
                {currentResult ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                  >
                    <AnalysisResultView 
                      data={currentResult} 
                      onClose={() => setCurrentResult(null)} 
                      isDarkMode={isDarkMode}
                      t={t}
                      lang={currentLang}
                    />
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                        <h3 className={`font-bold uppercase tracking-widest text-[10px] sm:text-xs flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <History size={14} /> {t.history}
                        </h3>
                        
                        <div className="relative group">
                          <input 
                            type="text"
                            placeholder={t.searchHistory}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full sm:w-64 pl-9 pr-4 py-2 rounded-xl text-xs outline-none transition-all border ${
                              isDarkMode 
                                ? 'bg-white/5 border-white/10 text-white focus:border-orange-600/50 focus:bg-white/10' 
                                : 'bg-white border-gray-200 text-gray-900 focus:border-orange-200 focus:shadow-sm'
                            }`}
                          />
                          <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                            isDarkMode ? 'text-gray-500 group-focus-within:text-orange-500' : 'text-gray-400 group-focus-within:text-orange-600'
                          }`}>
                            <Search size={14} className={searchQuery.length > 0 ? "scale-110" : ""} />
                          </div>
                          {searchQuery && (
                            <button 
                              onClick={() => setSearchQuery('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-600"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {filteredHistory.length > 0 ? (
                          filteredHistory.map((item) => (
                            <motion.div 
                              key={item.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              onClick={() => setCurrentResult(item)}
                              className={`group flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${isDarkMode ? 'bg-[#0d0d0d] border-white/5 hover:border-orange-600/50' : 'bg-white border-gray-100 hover:border-orange-200 shadow-sm shadow-black/5 hover:shadow-md'}`}
                            >
                              <div className={`w-20 h-12 rounded-lg overflow-hidden shrink-0 relative ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                <img src={item.video?.thumbnail || item.thumbnail} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Youtube size={16} className={`group-hover:text-white transition-colors ${isDarkMode ? 'text-white/50' : 'text-gray-400'}`} />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className={`font-bold text-sm sm:text-base truncate group-hover:text-orange-500 transition-colors ${isDarkMode ? '' : 'text-gray-800'}`}>
                                  {item.video?.title || item.title}
                                </h4>
                                <p className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-2">
                                  <span className="text-orange-600/60 font-mono italic">{t.astraV3}</span>
                                  <span>•</span>
                                  <span>{new Date(item.createdAt?.toDate?.() || item.createdAt).toLocaleDateString()}</span>
                                </p>
                              </div>
                              <ChevronRight size={18} className="text-gray-400 group-hover:text-orange-600 transition-colors" />
                            </motion.div>
                          ))
                        ) : searchQuery ? (
                          <div className={`p-12 rounded-3xl border flex flex-col items-center justify-center text-center space-y-4 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <div className="w-16 h-16 rounded-full bg-red-600/5 flex items-center justify-center text-red-500">
                              <Search size={32} />
                            </div>
                            <div className="space-y-1">
                              <h3 className="font-bold">{t.noResults} "{searchQuery}"</h3>
                              <p className="text-sm text-gray-500">{t.adjustSearch}</p>
                            </div>
                            <Button variant="ghost" onClick={() => setSearchQuery('')} className="text-xs">
                              {t.clearSearch}
                            </Button>
                          </div>
                        ) : (
                          <div className={`p-12 rounded-3xl border flex flex-col items-center justify-center text-center space-y-4 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <div className="w-16 h-16 rounded-full bg-orange-600/5 flex items-center justify-center text-orange-600">
                              <History size={32} />
                            </div>
                            <div className="space-y-1">
                              <h3 className="font-bold">{t.noHistory}</h3>
                              <p className="text-sm text-gray-500">{t.noHistoryDesc}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className={`font-bold uppercase tracking-widest text-[10px] sm:text-xs px-2 flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Zap size={14} /> {t.premium}
                      </h3>
                      <div className="p-8 rounded-3xl bg-orange-600 flex flex-col items-center text-center space-y-4 shadow-orange-600/30 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-white/20 transition-colors" />
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-md relative z-10">
                          <Zap size={32} fill="currentColor" />
                        </div>
                        <div className="space-y-1 relative z-10">
                          <h3 className="font-bold text-lg text-white">{t.upgradePro}</h3>
                          <p className="text-xs text-white/80 italic leading-relaxed">{t.upgradeProDesc}</p>
                        </div>
                        <button className="w-full py-3 bg-white text-orange-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-lg relative z-10">
                          {t.viewPricing}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </main>
      )}

      {/* Footer */}
      <footer className={`py-12 border-t text-center text-sm transition-colors ${isDarkMode ? 'border-white/5 text-gray-600' : 'border-gray-200 text-gray-400'}`}>
        <p>© 2026 Astra.ai — {t.builtWithPrecision}</p>
      </footer>
    </div>
  );
}
