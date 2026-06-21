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
  Search,
  Mail,
  Lock,
  ArrowLeft,
  AlertCircle,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { checkHealth, api } from './lib/api';
import { useAuth } from './contexts/AuthContext';
import { analyzeVideoContent, AnalysisResult } from './services/geminiService';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './lib/firebase';
import { AnalysisResultView } from './components/AnalysisResultView';
import { handleFirestoreError, OperationType } from './lib/firestoreUtils';
import { Pricing } from './components/Pricing';
import { AICore } from './components/AICore';
import { AIActivityFeed } from './components/AIActivityFeed';
import axios from 'axios';
import { BrandLogo } from './components/BrandLogo';

// Types
type ComponentState = 'landing' | 'dashboard';
type Language = 'pt' | 'en' | 'es';

const TRANSLATIONS = {
  pt: {
    features: "Funcionalidades",
    pricing: "Preços",
    signIn: "Entrar",
    startFree: "Começar Agora",
    watchDemo: "Ver Astra Learning AI em Ação",
    heroTitle: "TRANSFORME ASSISTIR",
    heroHighlight: "EM APRENDER.",
    heroDesc: "Uma plataforma de aprendizado com IA que transforma vídeos em resumos, mapas mentais, quizzes, flashcards e experiências de estudo personalizadas.",
    pwrByPrecision: "ECOSSISTEMA INTEGRADO DE ESTUDOS.",
    aiSummaries: "Resumos com IA",
    aiSummariesDesc: "Economize horas de estudo e absorva os pontos fundamentais em segundos.",
    mindMaps: "Mapas Mentais",
    mindMapsDesc: "Visualize conexões semânticas fundamentais para dominar conceitos complexos.",
    studyTutor: "Tutor de Estudos",
    studyTutorDesc: "Esclareça dúvidas complexas e receba explicações direcionadas da nossa IA.",
    quizGen: "Geração de Quizzes",
    quizGenDesc: "Avalie sua fixação de conteúdo com avaliações dinâmicas sob demanda.",
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
    loginTitle: "BEM-VINDO AO ASTRA LEARNING AI",
    loginDesc: "Junte-se a milhares de estudantes e pesquisadores transformando sua forma de aprender.",
    continueGoogle: "Continuar com Google",
    continueApple: "Continuar com Apple",
    continueEmail: "Continuar com e-mail",
    emailPlaceholder: "Seu endereço de e-mail",
    passwordPlaceholder: "Sua senha (mín. 6 caracteres)",
    loginButton: "Entrar",
    signupButton: "Criar Conta",
    dontHaveAccount: "Não tem uma conta? Cadastre-se",
    alreadyHaveAccount: "Já tem uma conta? Conecte-se",
    verifyEmailTitle: "CONFIRME SEU E-MAIL",
    verifyEmailDesc: "Enviamos um link de confirmação para {email}. Por favor, verifique sua caixa de entrada e spam para ativar sua conta.",
    checkVerificationButton: "Já verifiquei meu e-mail",
    resendButton: "Reenviar e-mail de verificação",
    cancelButton: "Cancelar e sair",
    backToSocial: "Voltar para opções de login",
    backToLogin: "Voltar para o login",
    enterEmailAndPasswordDesc: "Insira suas credenciais para acessar a conta.",
    createAccountDesc: "Cadastre-se para começar a estudar.",
    forgotPassword: "Esqueceu sua senha?",
    passwordResetTitle: "REDEFINIR SENHA",
    passwordResetDesc: "Insira seu e-mail para receber um link de redefinição de senha.",
    sendResetLinkButton: "Enviar link de redefinição",
    resetLinkSent: "Link de redefinição enviado com sucesso! Verifique seu e-mail.",
    terms: "Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade.",
    signOut: "Sair",
    searchHistory: "Pesquisar histórico...",
    clearSearch: "Limpar Pesquisa",
    astraV3: "Astra Learning AI",
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
    onboardingTitle: "Bem-vindo ao Tutor Astra Learning AI",
    onboardingDesc: "Um mentor de IA totalmente conversacional que entende cada detalhe deste vídeo.",
    onboardingStep1Title: "Fale Naturalmente",
    onboardingStep1Desc: "Sem necessidade de digitar. Basta falar com o Astra Learning AI como faria com um mentor humano.",
    onboardingStep2Title: "Consciente do Contexto",
    onboardingStep2Desc: "O Astra Learning AI analisou a transcrição completa e pode responder a perguntas complexas dinamicamente.",
    onboardingStep3Title: "Feedback em Tempo Real",
    onboardingStep3Desc: "O núcleo visual reage à sua voz e ao status da IA em tempo real.",
    getStarted: "Começar",
    onboardingStep4Title: "Limitações",
    onboardingStep4Desc: "Como toda IA, o Astra Learning AI pode ocasionalmente cometer erros ou omitir detalhes técnicos muito específicos. Sempre verifique informações críticas.",
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
    astraAnswering: "Astra Learning AI está respondendo",
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
    fallbackTranscript: "Astra Learning AI Fallback: Transcrição indisponível.",
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
      badgeOnline: "Astra Learning AI Core Online",
      badgeOffline: "Astra Learning AI Core Offline",
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
    tutorSystemInstruction: "Você é o Tutor Astra Learning AI, um educador brilhante e prestativo. Você está em uma sessão ao vivo sobre o vídeo: \"{videoTitle}\". Use o contexto da transcrição para responder perguntas exatamente como um tutor faria. Seja conversacional, conciso e encoraje o pensamento crítico. Mantenha as respostas curtas para melhor interação em tempo real.",
    quizScoreMessage: "Ótimo esforço! Conhecimento é poder.",
    activityFeed: {
      title: "FLUXO INTELIGENTE EM TEMPO REAL",
      subtitle: "Do vídeo ao plano de estudo: acompanhe as etapas que preparam o conteúdo para você.",
      now: "agora",
      recent: "recentemente",
      ago2: "há 2 min",
      ago5: "há 5 min",
      items: [
        {
          title: "Sintetizando fluxo do conteúdo",
          desc: "Ingestão e processamento da transcrição para consolidação de ideias centrais.",
          type: "summary"
        },
        {
          title: "Mapeando ramificações semânticas",
          desc: "Estruturação gráfica de conexões lógicas e hierarquia de conceitos de aprendizagem.",
          type: "mindmap"
        },
        {
          title: "Estruturando matriz de avaliação",
          desc: "Análise quantitativa do conteúdo para formulação de testes de fixação personalizados.",
          type: "quiz"
        },
        {
          title: "Otimizando espaçamento de repetição",
          desc: "Geração de cartões mnemônicos baseados em lacunas de conhecimento identificadas.",
          type: "flashcards"
        },
        {
          title: "Alinhando modelo cognitivo",
          desc: "Ajuste de parâmetros do tutor de estudos com base nos metadados do vídeo.",
          type: "tutor"
        },
        {
          title: "Calculando vetores de contexto",
          desc: "Mapeamento de rotas de aprendizado complementares recomendadas.",
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
    watchDemo: "See Astra Learning AI in Action",
    heroTitle: "TURN WATCHING",
    heroHighlight: "INTO LEARNING.",
    heroDesc: "An AI-powered learning platform that transforms videos into summaries, mind maps, quizzes, flashcards, and personalized study experiences.",
    pwrByPrecision: "INTELLIGENT STUDY ECOSYSTEM.",
    aiSummaries: "AI Summaries",
    aiSummariesDesc: "Save hours of watching by instantly capturing essential insights and takeaways.",
    mindMaps: "Mind Maps",
    mindMapsDesc: "Map out key connections visually to organize complex topics and boost retention.",
    studyTutor: "Study Tutor",
    studyTutorDesc: "Get tailored explanations and clarify doubts in real-time with our smart AI.",
    quizGen: "Quiz Generation",
    quizGenDesc: "Validate your comprehension instantly with dynamically generated assessments.",
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
    loginTitle: "WELCOME TO ASTRA LEARNING AI",
    loginDesc: "Join thousands of students and researchers transforming how they learn.",
    continueGoogle: "Continue with Google",
    continueApple: "Continue with Apple",
    continueEmail: "Continue with email",
    emailPlaceholder: "Your email address",
    passwordPlaceholder: "Your password (min. 6 characters)",
    loginButton: "Log In",
    signupButton: "Create Account",
    dontHaveAccount: "Don't have an account? Sign up",
    alreadyHaveAccount: "Already have an account? Log in",
    verifyEmailTitle: "VERIFY YOUR EMAIL",
    verifyEmailDesc: "We sent a confirmation link to {email}. Please check your inbox and spam folders to activate your account.",
    checkVerificationButton: "I've verified my email",
    resendButton: "Resend verification email",
    cancelButton: "Cancel and sign out",
    backToSocial: "Back to login options",
    backToLogin: "Back to login",
    enterEmailAndPasswordDesc: "Enter your credentials to access your account.",
    createAccountDesc: "Sign up to start learning.",
    forgotPassword: "Forgot password?",
    passwordResetTitle: "RESET PASSWORD",
    passwordResetDesc: "Enter your email address to receive a password reset link.",
    sendResetLinkButton: "Send reset link",
    resetLinkSent: "Password reset link sent successfully! Please check your email.",
    terms: "By continuing, you agree to our Terms of Service and Privacy Policy.",
    signOut: "Sign Out",
    searchHistory: "Search history...",
    clearSearch: "Clear Search",
    astraV3: "Astra Learning AI",
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
    onboardingTitle: "Welcome to Astra Learning AI Tutor",
    onboardingDesc: "A fully conversational AI mentor that understands every detail of this video.",
    onboardingStep1Title: "Speak Naturally",
    onboardingStep1Desc: "No typing required. Just talk to Astra Learning AI like you would with a human mentor.",
    onboardingStep2Title: "Context Aware",
    onboardingStep2Desc: "Astra Learning AI has analyzed the full transcript and can answer complex questions dynamically.",
    onboardingStep3Title: "Real-time Feedback",
    onboardingStep3Desc: "The visual core reacts to your voice and AI status in real-time.",
    getStarted: "Get Started",
    onboardingStep4Title: "Limitations",
    onboardingStep4Desc: "Like all AI, Astra Learning AI may occasionally make mistakes or miss highly specific technical details. Always verify critical information.",
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
    astraAnswering: "Astra Learning AI is answering",
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
    fallbackTranscript: "Astra Learning AI Fallback: Transcript unavailable.",
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
      badgeOnline: "Astra Learning AI Core Online",
      badgeOffline: "Astra Learning AI Core Offline",
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
    tutorSystemInstruction: "You are Astra Learning AI Tutor, a brilliant and supportive educator. You are in a live session about the video: \"{videoTitle}\". Use the transcript context to answer questions exactly as a tutor would. Be conversational, concise, and encourage critical thinking. Keep responses short for better real-time interaction.",
    quizScoreMessage: "Great effort! Knowledge is power.",
    activityFeed: {
      title: "REAL-TIME LEARNING WORKFLOW",
      subtitle: "From video input to study plan, see how Astra Learning AI prepares your content step by step.",
      now: "now",
      recent: "recently",
      ago2: "2 min ago",
      ago5: "5 min ago",
      items: [
        {
          title: "Synthesizing content stream",
          desc: "Parsing and filtering transcripts to consolidate high-value core insights.",
          type: "summary"
        },
        {
          title: "Mapping visual cognitive paths",
          desc: "Structuring logical connections and topic hierarchies into visual nodes.",
          type: "mindmap"
        },
        {
          title: "Generating active recall matrix",
          desc: "Formulating challenge checkpoints directly derived from video timelines.",
          type: "quiz"
        },
        {
          title: "Constructing spaced recall decks",
          desc: "Creating high-retention active study cards based on conceptual patterns.",
          type: "flashcards"
        },
        {
          title: "Calibrating contextual tutor model",
          desc: "Feeding real-time video parameters into the interactive learning assistant.",
          type: "tutor"
        },
        {
          title: "Predicting adaptive learning vector",
          desc: "Calculating personalized supplemental pathways for next-step expansion.",
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
    watchDemo: "Ver Astra Learning AI en Acción",
    heroTitle: "CONVIERTE MIRAR",
    heroHighlight: "EN APRENDER.",
    heroDesc: "Una plataforma de aprendizaje con IA que transforma videos en resúmenes, mapas mentales, cuestionarios, flashcards y experiencias de estudio personalizadas.",
    pwrByPrecision: "ECOSISTEMA DE ESTUDIO INTELIGENTE.",
    aiSummaries: "Resúmenes con IA",
    aiSummariesDesc: "Ahorra horas de estudio extrayendo los conceptos clave al instante.",
    mindMaps: "Mapas Mentales",
    mindMapsDesc: "Visualiza la conexión entre temas para estructurar materias complejas.",
    studyTutor: "Tutor de Estudio",
    studyTutorDesc: "Resuelve dudas difíciles y obtén explicaciones personalizadas con nuestra IA.",
    quizGen: "Generación de Cuestionarios",
    quizGenDesc: "Evalúa tu aprendizaje de inmediato con test creados de manera automática.",
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
    loginTitle: "BIENVENIDO A ASTRA LEARNING AI",
    loginDesc: "Únete a miles de estudiantes e investigadores transformando su forma de aprender.",
    continueGoogle: "Continuar con Google",
    continueApple: "Continuar con Apple",
    continueEmail: "Continuar con correo",
    emailPlaceholder: "Tu dirección de correo electrónico",
    passwordPlaceholder: "Tu contraseña (mín. 6 caracteres)",
    loginButton: "Iniciar Sesión",
    signupButton: "Crear Cuenta",
    dontHaveAccount: "¿No tienes una cuenta? Regístrate",
    alreadyHaveAccount: "¿Ya tienes una cuenta? Inicia sesión",
    verifyEmailTitle: "CONFIRMA TU CORREO",
    verifyEmailDesc: "Enviamos un enlace de confirmación a {email}. Por favor, revisa tu bandeja de entrada y correo no deseado para activar tu cuenta.",
    checkVerificationButton: "Ya he verificado mi correo",
    resendButton: "Reenviar correo de verificación",
    cancelButton: "Cancelar y salir",
    backToSocial: "Volver a opciones de inicio",
    backToLogin: "Volver al inicio de sesión",
    enterEmailAndPasswordDesc: "Introduce tus credenciales para acceder a tu cuenta.",
    createAccountDesc: "Regístrate para empezar a aprender.",
    forgotPassword: "¿Olvidaste tu contraseña?",
    passwordResetTitle: "RESTABLECER CONTRASEÑA",
    passwordResetDesc: "Introduce tu correo para recibir un enlace de restablecimiento.",
    sendResetLinkButton: "Enviar enlace de restablecimiento",
    resetLinkSent: "¡Enlace de restablecimiento enviado con éxito! Revisa tu correo.",
    terms: "Al continuar, aceptas nuestros Térmos de Servicio y Política de Privacidad.",
    signOut: "Cerrar Sesión",
    searchHistory: "Buscar historial...",
    clearSearch: "Limpar Búsqueda",
    astraV3: "Astra Learning AI",
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
    onboardingTitle: "Bienvenido al Tutor Astra Learning AI",
    onboardingDesc: "Un mentor de IA totalmente conversacional que entiende cada detalle de este video.",
    onboardingStep1Title: "Habla con Naturalidad",
    onboardingStep1Desc: "No es necesario escribir. Solo habla con Astra Learning AI como lo harías con un mentor humano.",
    onboardingStep2Title: "Consciente del Contexto",
    onboardingStep2Desc: "Astra Learning AI ha analizado la transcripción completa y puede responder preguntas complejas dinamicamente.",
    onboardingStep3Title: "Retroalimentación en Tiempo Real",
    onboardingStep3Desc: "El núcleo visual reacciona a tu voz y al estado de la IA en tiempo real.",
    getStarted: "Empezar",
    onboardingStep4Title: "Limitaciones",
    onboardingStep4Desc: "Como toda IA, Astra Learning AI puede cometer errores ocasionalmente o pasar por alto detalles técnicos muy específicos. Siempre verifica la información crítica.",
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
    astraAnswering: "Astra Learning AI está respondiendo",
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
    fallbackTranscript: "Astra Learning AI Fallback: Transcripción no disponible.",
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
      badgeOnline: "Astra Learning AI Core Online",
      badgeOffline: "Astra Learning AI Core Offline",
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
    tutorSystemInstruction: "Eres el Tutor Astra Learning AI, un educador brillante y servicial. Estás en uma sesión en vivo sobre el video: \"{videoTitle}\". Usa el contexto de la transcripción para responder preguntas exactamente como lo haría un tutor. Sé conversador, conciso y fomenta el pensamiento crítico. Mantén las respuestas cortas para una mejor interacción en tiempo real.", // wait, "estás en una..." (Spanish is "una" not "uma")
    // Eres el Tutor Astra Learning AI, un educador brillante y servicial. Estás en una sesión en vivo sobre el video: "{videoTitle}". Usa el contexto de la transcripción para responder preguntas exactamente como lo haría un tutor. Sé conversador, conciso y fomenta el pensamiento crítico. Mantén las respuestas cortas para una mejor interacción en tiempo real.
    quizScoreMessage: "¡Gran esfuerzo! El conocimiento es poder.",
    activityFeed: {
      title: "FLUJO INTELIGENTE EN TIEMPO REAL",
      subtitle: "Del video al plan de estudio: sigue cómo Astra Learning AI prepara el contenido paso a paso.",
      now: "ahora",
      recent: "recientemente",
      ago2: "hace 2 min",
      ago5: "hace 5 min",
      items: [
        {
          title: "Sintetizando flujo de contenido",
          desc: "Procesando transcripciones para consolidar ideas esenciales en tiempo real.",
          type: "summary"
        },
        {
          title: "Mapeando rutas cognitivas visuales",
          desc: "Estructurando conexiones lógicas y jerarquías de temas en nodos visuales.",
          type: "mindmap"
        },
        {
          title: "Estructurando matriz de evaluación",
          desc: "Formulando puntos de control interactivos basados en el progreso del video.",
          type: "quiz"
        },
        {
          title: "Generando mazos de repaso activo",
          desc: "Creando tarjetas de memoria optimizadas para la retención conceptual continua.",
          type: "flashcards"
        },
        {
          title: "Calibrando modelo de tutor virtual",
          desc: "Cargando parámetros de aprendizaje conversacional en el asistente inteligente.",
          type: "tutor"
        },
        {
          title: "Calculando vectores de aprendizaje",
          desc: "Proyectando recomendaciones de estudio y temas complementarios sugeridos.",
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
  disabled = false,
  isDarkMode = true
}: { 
  children: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'ghost', 
  onClick?: () => void,
  className?: string,
  disabled?: boolean,
  isDarkMode?: boolean
}) => {
  const variants = {
    primary: "bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 shadow-[0_0_20px_-10px_rgba(234,88,12,0.5)] hover:shadow-[0_0_25px_-5px_rgba(234,88,12,0.6)]",
    secondary: isDarkMode 
      ? "bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md disabled:opacity-50 shadow-lg"
      : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 disabled:opacity-50 shadow-sm",
    ghost: isDarkMode
      ? "bg-transparent hover:bg-white/5 text-gray-400 hover:text-white disabled:opacity-50"
      : "bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-50"
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

const getPasswordStrength = (pass: string, currentLang: Language) => {
  if (!pass) return { score: 0, label: '', color: 'bg-gray-300', width: 'w-0', checks: { length: false, mixed: false, digit: false, special: false } };
  
  let score = 0;
  
  // Rule 1: Minimum length of 8 chars
  const hasMinLength = pass.length >= 8;
  if (hasMinLength) score += 1;
  else if (pass.length > 0) score += 0.5;
  
  // Rule 2: Upper and lower case
  const hasMixedCase = /[a-z]/.test(pass) && /[A-Z]/.test(pass);
  if (hasMixedCase) score += 1;
  
  // Rule 3: Number
  const hasDigit = /[0-9]/.test(pass);
  if (hasDigit) score += 1;
  
  // Rule 4: Special char
  const hasSpecial = /[^A-Za-z0-9]/.test(pass);
  if (hasSpecial) score += 1;
  
  const finalScore = Math.min(4, Math.floor(score));
  
  let label = '';
  let color = '';
  let width = '';
  
  if (pass.length === 0) {
    label = '';
    color = 'bg-gray-300';
    width = 'w-0';
  } else if (finalScore <= 1) {
    label = currentLang === 'pt' ? 'Fraca' : currentLang === 'es' ? 'Débil' : 'Weak';
    color = 'bg-red-500';
    width = 'w-1/4';
  } else if (finalScore === 2) {
    label = currentLang === 'pt' ? 'Média' : currentLang === 'es' ? 'Media' : 'Medium';
    color = 'bg-yellow-500';
    width = 'w-2/4';
  } else if (finalScore === 3) {
    label = currentLang === 'pt' ? 'Boa' : currentLang === 'es' ? 'Buena' : 'Good';
    color = 'bg-emerald-500';
    width = 'w-3/4';
  } else {
    label = currentLang === 'pt' ? 'Forte' : currentLang === 'es' ? 'Fuerte' : 'Strong';
    color = 'bg-blue-500';
    width = 'w-full';
  }
  
  return { 
    score: finalScore, 
    label, 
    color, 
    width,
    checks: {
      length: hasMinLength,
      mixed: hasMixedCase,
      digit: hasDigit,
      special: hasSpecial
    }
  };
};

const getRequirementsText = (currentLang: Language) => {
  if (currentLang === 'pt') {
    return {
      length: 'Pelo menos 8 caracteres',
      mixed: 'Maiúsculas e minúsculas',
      digit: 'Pelo menos um número',
      special: 'Caractere especial',
      strengthLabel: 'Força da senha'
    };
  } else if (currentLang === 'es') {
    return {
      length: 'Al menos 8 caracteres',
      mixed: 'Mayúsculas y minúsculas',
      digit: 'Al menos un número',
      special: 'Carácter especial',
      strengthLabel: 'Fuerza de la contraseña'
    };
  } else {
    return {
      length: 'At least 8 characters',
      mixed: 'Uppercase and lowercase',
      digit: 'At least one number',
      special: 'Special character',
      strengthLabel: 'Password strength'
    };
  }
};

const formatAuthError = (code: string, message: string, lang: Language): string => {
  switch (code) {
    case 'auth/operation-not-allowed':
      if (lang === 'pt') {
        return 'O método de login solicitado não está habilitado no Console do Firebase. Ative-o em Autenticação > Sign-in method.';
      }
      if (lang === 'es') {
        return 'El método de inicio de sesión solicitado no está habilitado en la Consola Firebase. Actívalo en Autenticación > Sign-in method.';
      }
      return 'The requested sign-in method is not enabled in your Firebase Console. Please enable it under Authentication > Sign-in method.';
      
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      if (lang === 'pt') {
        return 'E-mail ou senha incorretos. Por favor, verifique suas credenciais.';
      }
      if (lang === 'es') {
        return 'Usuario o contraseña incorrectos. Por favor comprueba sus credenciales.';
      }
      return 'Incorrect email or password. Please check your credentials.';
      
    case 'auth/email-already-in-use':
      if (lang === 'pt') {
        return 'Este endereço de e-mail já está em uso por outra conta.';
      }
      if (lang === 'es') {
        return 'Esta dirección de correo ya está en uso por otra cuenta.';
      }
      return 'This email address is already in use by another account.';

    case 'auth/weak-password':
      if (lang === 'pt') {
        return 'A senha é muito fraca. Escolha uma senha mais forte (mínimo de 6 caracteres).';
      }
      if (lang === 'es') {
        return 'La contraseña es demasiado débil. Elija una contraseña más fuerte (mínimo 6 caracteres).';
      }
      return 'The password is too weak. Please choose a stronger password (minimum 6 characters).';

    case 'auth/invalid-email':
      if (lang === 'pt') {
        return 'Formato de e-mail inválido. Por favor, digite um e-mail correto.';
      }
      if (lang === 'es') {
        return 'Formato de correo inválido. Por favor introduce un correo correcto.';
      }
      return 'Invalid email format. Please make sure you have entered it correctly.';

    case 'auth/popup-closed-by-user':
      if (lang === 'pt') {
        return 'A janela de autenticação foi fechada antes de concluir o processo.';
      }
      if (lang === 'es') {
        return 'La ventana emergente se cerró antes de completar la autenticación.';
      }
      return 'The authentication popup was closed before completion.';

    case 'auth/user-disabled':
      if (lang === 'pt') {
        return 'Esta conta de usuário foi desativada por um administrador.';
      }
      if (lang === 'es') {
        return 'Esta cuenta de usuario ha sido inhabilitada por un administrador.';
      }
      return 'This user account has been disabled by an administrator.';

    case 'auth/too-many-requests':
      if (lang === 'pt') {
        return 'Muitas tentativas fracassadas de login. O acesso foi temporariamente bloqueado. Redefina sua senha ou tente novamente mais tarde.';
      }
      if (lang === 'es') {
        return 'Demasiados intentos fallidos. El acceso ha sido bloqueado temporalmente. Restablece tu contraseña o inténtalo más tarde.';
      }
      return 'Too many failed login attempts. Access has been temporarily blocked. Please reset your password or try again later.';

    default:
      if (message && message.includes('auth/')) {
        // extract the auth code if embedded
        const match = message.match(/auth\/[a-zA-Z0-9-]+/);
        if (match) return formatAuthError(match[0], message, lang);
      }
      return message || (lang === 'pt' ? 'Ocorreu um erro inesperado.' : lang === 'es' ? 'Ocurrió un error inesperado.' : 'An unexpected error occurred.');
  }
};

export default function App() {
  const { 
    user, 
    signInWithGoogle, 
    signInWithApple, 
    signUpWithEmail, 
    signInWithEmail, 
    sendVerificationEmail, 
    sendPasswordReset,
    reloadUser, 
    signOut 
  } = useAuth();
  
  const [authMethod, setAuthMethod] = useState<'social' | 'login' | 'signup' | 'forgot'>('social');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const [verificationChecking, setVerificationChecking] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
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

  useEffect(() => {
    setPassword('');
    setShowPassword(false);
  }, [authMethod]);

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
      if (user.emailVerified) {
        if (verificationSuccess) {
          return;
        }
        setView('dashboard');
        setShowLoginModal(false);
        setCurrentLang('pt');
        fetchHistory();
      } else {
        setView('landing');
        setShowLoginModal(true);
      }
    } else {
      setView('landing');
      setHistory([]);
    }
  }, [user, verificationSuccess]);

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
    if (user && user.emailVerified) {
      setView('dashboard');
    } else {
      setShowLoginModal(true);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      setShowLoginModal(false);
    } catch (err: any) {
      console.warn("Google sign in error", err);
      setAuthError(formatAuthError(err.code, err.message, currentLang));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      await signInWithApple();
      setShowLoginModal(false);
    } catch (err: any) {
      console.warn("Apple sign in error", err);
      setAuthError(formatAuthError(err.code, err.message, currentLang));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setAuthError('');
    setAuthLoading(true);
    try {
      await signInWithEmail(email, password);
      setEmail('');
      setPassword('');
      setShowLoginModal(false);
    } catch (err: any) {
      console.warn("Email login error", err);
      setAuthError(formatAuthError(err.code, err.message, currentLang));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 6) {
      setAuthError(
        currentLang === 'pt' 
          ? 'A senha deve ter pelo menos 6 caracteres.' 
          : currentLang === 'es' 
            ? 'La contraseña debe tener al menos 6 caracteres.' 
            : 'Password must be at least 6 characters.'
      );
      return;
    }
    setAuthError('');
    setAuthLoading(true);
    try {
      await signUpWithEmail(email, password);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.warn("Email sign up error", err);
      setAuthError(formatAuthError(err.code, err.message, currentLang));
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setAuthError('');
    setAuthLoading(true);
    setPasswordResetSuccess(false);
    try {
      await sendPasswordReset(email);
      setPasswordResetSuccess(true);
      setEmail('');
    } catch (err: any) {
      console.warn("Password reset error", err);
      setAuthError(formatAuthError(err.code, err.message, currentLang));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setAuthError('');
    setVerificationChecking(true);
    try {
      await reloadUser();
      if (auth.currentUser?.emailVerified) {
        setVerificationSuccess(true);
        setTimeout(() => {
          setView('dashboard');
          setShowLoginModal(false);
          setCurrentLang('pt');
          fetchHistory();
          setVerificationSuccess(false);
        }, 2200);
      } else {
        setAuthError(
          currentLang === 'pt' 
            ? 'O e-mail ainda não está verificado. Verifique sua caixa de entrada e clique no link de validação enviado.' 
            : currentLang === 'es' 
              ? 'El correo electrónico aún no está verificado. Por favor revise su bandeja de entrada y haga clic en el enlace.' 
              : 'Our verification check indicates the email is not verified yet. Please check your spam/inbox and click the link first.'
        );
      }
    } catch (err: any) {
      console.warn("Check verification error", err);
      setAuthError(err.message || 'Error checking verification status');
    } finally {
      setVerificationChecking(false);
    }
  };

  const handleResendEmail = async () => {
    setAuthError('');
    setResendSuccess(false);
    setAuthLoading(true);
    try {
      await sendVerificationEmail();
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 6000);
    } catch (err: any) {
      console.warn("Resend email error", err);
      setAuthError(err.message || 'Error sending email');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#0a0a0a] text-white dark' : 'bg-[#f6f7fb] text-slate-950 light'}`}>
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 border-b backdrop-blur-md ${isDarkMode ? 'border-white/5' : 'bg-white/85 border-slate-200/70 shadow-sm shadow-slate-900/5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {view === 'dashboard' && (
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2 md:hidden transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-950'}`}
              >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('landing')}>
              <BrandLogo variant="horizontal" size="md" isDarkMode={isDarkMode} />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden md:flex items-center gap-6 mr-6 transition-all">
              <a href="#features" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'}`}>{t.features}</a>
              <a href="#pricing" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'}`}>{t.pricing}</a>
            </div>
            
            {/* Language Selector */}
            <div className={`flex items-center gap-1 p-1 rounded-full border shrink-0 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200/80'}`}>
              <div className={`px-1.5 sm:px-2 hidden sm:block ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                <Languages size={14} />
              </div>
              {(['pt', 'en', 'es'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setCurrentLang(lang)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    currentLang === lang 
                      ? 'bg-orange-600 text-white shadow-sm' 
                      : isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <Button variant="ghost" onClick={toggleTheme} isDarkMode={isDarkMode} className={`px-2 sm:px-3 ${isDarkMode ? '' : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-700'}`}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            
            {user ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <div className={`flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full border max-w-[120px] sm:max-w-none overflow-hidden ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm text-slate-800'}`}>
                  <img src={user.photoURL || ''} alt="" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full shrink-0" />
                  <span className="text-xs sm:text-sm font-medium truncate hidden sm:inline-block">{user.displayName}</span>
                </div>
                <Button 
                  variant="secondary" 
                  onClick={signOut} 
                  isDarkMode={isDarkMode}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 group transition-all flex items-center gap-2 ${
                    isDarkMode 
                      ? 'hover:border-red-500/50 hover:text-red-500' 
                      : '!bg-white border-slate-200 !text-slate-600 hover:!bg-red-50 hover:!border-red-200 hover:!text-red-600 shadow-sm'
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
              onClick={() => {
                if (!user || user.emailVerified) {
                  setShowLoginModal(false);
                  setAuthError('');
                }
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-md border rounded-3xl p-8 shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#0d0d0d] border-white/10 text-white' : 'bg-white border-slate-200 shadow-xl shadow-slate-900/5 text-slate-900'}`}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-orange-600" />
              
              {verificationSuccess ? (
                <div className="flex flex-col items-center text-center space-y-6 py-6 animate-in fade-in zoom-in-95 duration-300">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.25, 1] }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-20 h-20 bg-emerald-500/10 dark:bg-emerald-400/10 rounded-full flex items-center justify-center relative shadow-lg shadow-emerald-500/5"
                  >
                    <motion.div
                      initial={{ rotate: -45, scale: 0.5 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    >
                      <CheckCircle className="text-emerald-500 dark:text-emerald-400 w-12 h-12" />
                    </motion.div>
                    <span className="absolute inset-0 rounded-full animate-ping bg-emerald-500/10 dark:bg-emerald-400/20" />
                  </motion.div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 uppercase italic">
                      {currentLang === 'pt' ? 'E-mail Verificado!' : currentLang === 'es' ? '¡Correo Verificado!' : 'Email Verified!'}
                    </h2>
                    <p className={`text-sm leading-relaxed max-w-xs mx-auto ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                      {currentLang === 'pt' 
                        ? 'Seu endereço de e-mail foi confirmado com sucesso. Redirecionando para o painel...' 
                        : currentLang === 'es' 
                          ? 'Su dirección de correo electrónico ha sido confirmada con éxito. Redirigiendo al panel...' 
                          : 'Your email address has been successfully confirmed. Redirecting to the dashboard...'}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce"></span>
                  </div>
                </div>
              ) : user && !user.emailVerified ? (
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="w-16 h-16 bg-orange-600/10 rounded-2xl flex items-center justify-center relative shadow-lg shadow-orange-600/5">
                    <Mail className="text-orange-500 w-8 h-8 animate-bounce" />
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-500 border border-white dark:border-[#0d0d0d]"></span>
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight uppercase italic text-orange-500">{t.verifyEmailTitle}</h2>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                      {t.verifyEmailDesc.replace('{email}', user.email || '')}
                    </p>
                  </div>

                  {authError && (
                    <div className="w-full flex items-center gap-2 p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs text-left">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <AnimatePresence>
                    {resendSuccess && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -8 }}
                        className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-xs text-left relative overflow-hidden ${
                          isDarkMode 
                            ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' 
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm shadow-emerald-100/50'
                        }`}
                      >
                        <motion.div
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
                          className="shrink-0 mt-0.5"
                        >
                          <div className="relative">
                            <CheckCircle size={18} className="text-emerald-500 dark:text-emerald-400" />
                            <span className="absolute inset-0 rounded-full animate-ping bg-emerald-500/10 dark:bg-emerald-400/20" />
                          </div>
                        </motion.div>
                        <div className="flex-1 space-y-0.5">
                          <span className="font-semibold block text-[13px] text-emerald-600 dark:text-emerald-400 leading-none">
                            {currentLang === 'pt' ? 'E-mail Enviado!' : currentLang === 'es' ? '¡Correo Enviado!' : 'Email Sent!'}
                          </span>
                          <span className="opacity-95 leading-relaxed text-emerald-700 dark:text-emerald-300/90">
                            {currentLang === 'pt' ? 'Verifique sua caixa de entrada e pasta de spam.' : currentLang === 'es' ? 'Por favor, revise su bandeja de entrada y carpeta de spam.' : 'Please check your inbox and spam folder.'}
                          </span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setResendSuccess(false)} 
                          className={`p-1 -mr-1.5 -mt-1.5 rounded-full transition-colors ${
                            isDarkMode ? 'hover:bg-white/5 text-emerald-500/50 hover:text-emerald-300' : 'hover:bg-emerald-100 text-emerald-600/70 hover:text-emerald-900'
                          }`}
                        >
                          <X size={14} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="w-full space-y-3">
                    <Button 
                      type="button"
                      className="w-full justify-center py-3.5 shadow-lg shadow-orange-600/20 text-lg" 
                      onClick={handleCheckVerification}
                      disabled={verificationChecking}
                    >
                      {verificationChecking ? (
                        <>
                          <Loader2 className="animate-spin w-5 h-5 mr-2" />
                          {currentLang === 'pt' ? 'Verificando...' : currentLang === 'es' ? 'Verificando...' : 'Checking...'}
                        </>
                      ) : (
                        t.checkVerificationButton
                      )}
                    </Button>

                    <Button 
                      type="button"
                      variant="secondary"
                      className="w-full justify-center py-3 text-sm font-semibold" 
                      onClick={handleResendEmail}
                      disabled={authLoading}
                      isDarkMode={isDarkMode}
                    >
                      {authLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : null}
                      {t.resendButton}
                    </Button>

                    <Button 
                      type="button"
                      variant="ghost"
                      className="w-full justify-center py-2 text-xs !text-red-500 hover:bg-red-500/5" 
                      onClick={signOut}
                      isDarkMode={isDarkMode}
                    >
                      {t.cancelButton}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {authMethod === 'social' ? (
                    <div className="flex flex-col items-center text-center space-y-6">
                      <BrandLogo variant="horizontal" size="lg" isDarkMode={isDarkMode} className="mb-2" />
                      <div className="space-y-2">
                        <h2 className="text-sm font-semibold tracking-widest text-orange-500 uppercase">{t.loginTitle}</h2>
                        <p className={`${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>{t.loginDesc}</p>
                      </div>

                      {authError && (
                        <div className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-xs text-left relative animate-in fade-in slide-in-from-top-1 duration-200 ${isDarkMode ? 'border-red-500/20 bg-red-500/5 text-red-400' : 'border-red-200 bg-red-50 text-red-700'}`}>
                          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                          <div className="flex-1">
                            <span className="font-semibold block mb-0.5">{currentLang === 'pt' ? 'Falha na Autenticação' : currentLang === 'es' ? 'Fallo en la Autenticación' : 'Authentication Failed'}</span>
                            <span className="opacity-95 leading-relaxed">{authError}</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setAuthError('')} 
                            className={`p-1 -mr-1.5 -mt-1.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      <div className="w-full space-y-3">
                        <Button 
                          type="button"
                          className="w-full justify-center py-3.5 shadow-md font-semibold text-base" 
                          onClick={handleGoogleLogin}
                          disabled={authLoading}
                        >
                          {authLoading ? (
                            <Loader2 className="animate-spin w-5 h-5 mr-3 shrink-0" />
                          ) : (
                            <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5 mr-3 shrink-0" />
                          )}
                          {authLoading ? (currentLang === 'pt' ? 'Conectando...' : currentLang === 'es' ? 'Conectando...' : 'Connecting...') : t.continueGoogle}
                        </Button>

                        <Button 
                          type="button"
                          variant="secondary"
                          className="w-full justify-center py-3.5 shadow-sm font-semibold text-base" 
                          onClick={handleAppleLogin}
                          isDarkMode={isDarkMode}
                          disabled={authLoading}
                        >
                          {authLoading ? (
                            <Loader2 className="animate-spin w-5 h-5 mr-3 shrink-0" />
                          ) : (
                            <svg className="w-5 h-5 mr-3 shrink-0 fill-current" viewBox="0 0 24 24">
                              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.83-.98 2.94 1.07.08 2.15-.52 2.81-1.33z" />
                            </svg>
                          )}
                          {authLoading ? (currentLang === 'pt' ? 'Conectando...' : currentLang === 'es' ? 'Conectando...' : 'Connecting...') : t.continueApple}
                        </Button>

                        <Button 
                          type="button"
                          variant="secondary"
                          className="w-full justify-center py-3.5 shadow-sm font-semibold text-base" 
                          onClick={() => { setAuthMethod('login'); setAuthError(''); }}
                          isDarkMode={isDarkMode}
                          disabled={authLoading}
                        >
                          <Mail className="w-5 h-5 mr-3 shrink-0 text-orange-500" />
                          {t.continueEmail}
                        </Button>
                      </div>

                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                        {t.terms}
                      </p>
                    </div>
                  ) : authMethod === 'login' ? (
                    <div className="flex flex-col space-y-6">
                      <div className="flex items-center justify-between">
                        <button 
                          type="button"
                          onClick={() => { if (!authLoading) { setAuthMethod('social'); setAuthError(''); } }}
                          disabled={authLoading}
                          className={`p-2 rounded-full transition-colors ${authLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
                        >
                          <ArrowLeft size={20} />
                        </button>
                        <span className="text-xs font-bold uppercase tracking-widest text-orange-500">{t.loginButton}</span>
                        <div className="w-8 h-8" />
                      </div>

                      <div className="space-y-1.5 text-center">
                        <h2 className="text-2xl font-bold italic tracking-tight uppercase text-orange-500">{t.loginButton}</h2>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{t.enterEmailAndPasswordDesc}</p>
                      </div>

                      {authError && (
                        <div className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-xs text-left relative animate-in fade-in slide-in-from-top-1 duration-200 ${isDarkMode ? 'border-red-500/20 bg-red-500/5 text-red-400' : 'border-red-200 bg-red-50 text-red-700'}`}>
                          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                          <div className="flex-1">
                            <span className="font-semibold block mb-0.5">{currentLang === 'pt' ? 'Falha no Login' : currentLang === 'es' ? 'Error de Inicio de Sesión' : 'Login Failed'}</span>
                            <span className="opacity-95 leading-relaxed">{authError}</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setAuthError('')} 
                            className={`p-1 -mr-1.5 -mt-1.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div className="space-y-1.5 relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                          <input 
                            type="email"
                            required
                            disabled={authLoading}
                            placeholder={t.emailPlaceholder}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`relative w-full rounded-2xl border pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600/50 transition-all ${authLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-[#121212] border-white/10 text-white placeholder-gray-500 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-600 focus:bg-white'}`}
                          />
                        </div>

                        <div className="space-y-1.5 relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                          <input 
                            type={showPassword ? "text" : "password"}
                            required
                            disabled={authLoading}
                            placeholder={t.passwordPlaceholder}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`relative w-full rounded-2xl border pl-11 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600/50 transition-all ${authLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-[#121212] border-white/10 text-white placeholder-gray-500 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-600 focus:bg-white'}`}
                          />
                          {password && (
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 dark:hover:text-white transition-colors"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          )}
                        </div>

                        <div className="flex justify-end pr-1">
                          <button
                            type="button"
                            disabled={authLoading}
                            onClick={() => { if (!authLoading) { setAuthMethod('forgot'); setAuthError(''); setPasswordResetSuccess(false); } }}
                            className={`text-xs font-semibold hover:underline ${authLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            {t.forgotPassword}
                          </button>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full justify-center py-3 text-sm font-semibold shadow-md shadow-orange-600/10"
                          disabled={authLoading}
                        >
                          {authLoading ? (
                            <>
                              <Loader2 className="animate-spin w-5 h-5 mr-2" />
                              {currentLang === 'pt' ? 'Entrando...' : currentLang === 'es' ? 'Entrando...' : 'Logging in...'}
                            </>
                          ) : (
                            t.loginButton
                          )}
                        </Button>
                      </form>

                      <div className="text-center">
                        <button 
                          type="button"
                          disabled={authLoading}
                          onClick={() => { if (!authLoading) { setAuthMethod('signup'); setAuthError(''); } }}
                          className={`text-xs font-semibold hover:underline ${authLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          {t.dontHaveAccount}
                        </button>
                      </div>
                    </div>
                  ) : authMethod === 'forgot' ? (
                    <div className="flex flex-col space-y-6">
                      <div className="flex items-center justify-between">
                        <button 
                          type="button"
                          onClick={() => { if (!authLoading) { setAuthMethod('login'); setAuthError(''); setPasswordResetSuccess(false); } }}
                          disabled={authLoading}
                          className={`p-2 rounded-full transition-colors ${authLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
                        >
                          <ArrowLeft size={20} />
                        </button>
                        <span className="text-xs font-bold uppercase tracking-widest text-orange-500">{t.passwordResetTitle}</span>
                        <div className="w-8 h-8" />
                      </div>

                      <div className="space-y-1.5 text-center">
                        <h2 className="text-2xl font-bold italic tracking-tight uppercase text-orange-500">{t.passwordResetTitle}</h2>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{t.passwordResetDesc}</p>
                      </div>

                      {authError && (
                        <div className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-xs text-left relative animate-in fade-in slide-in-from-top-1 duration-200 ${isDarkMode ? 'border-red-500/20 bg-red-500/5 text-red-400' : 'border-red-200 bg-red-50 text-red-700'}`}>
                          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                          <div className="flex-1">
                            <span className="font-semibold block mb-0.5">{currentLang === 'pt' ? 'Erro ao Enviar Link' : currentLang === 'es' ? 'Error al Enviar Enlace' : 'Send Link Failed'}</span>
                            <span className="opacity-95 leading-relaxed">{authError}</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setAuthError('')} 
                            className={`p-1 -mr-1 -mt-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/5 text-gray-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      <AnimatePresence>
                        {passwordResetSuccess && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: -8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -8 }}
                            className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-xs text-left relative overflow-hidden ${
                              isDarkMode 
                                ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' 
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm shadow-emerald-100/50'
                            }`}
                          >
                            <motion.div
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
                              className="shrink-0 mt-0.5"
                            >
                              <div className="relative">
                                <CheckCircle size={18} className="text-emerald-500 dark:text-emerald-400" />
                                <span className="absolute inset-0 rounded-full animate-ping bg-emerald-500/10 dark:bg-emerald-400/20" />
                              </div>
                            </motion.div>
                            <div className="flex-1 space-y-0.5">
                              <span className="font-semibold block text-[13px] text-emerald-600 dark:text-emerald-400 leading-none">
                                {currentLang === 'pt' ? 'Sucesso!' : currentLang === 'es' ? '¡Éxito!' : 'Success!'}
                              </span>
                              <span className="opacity-95 leading-relaxed text-emerald-700 dark:text-emerald-300/90">{t.resetLinkSent}</span>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setPasswordResetSuccess(false)} 
                              className={`p-1 -mr-1.5 -mt-1.5 rounded-full transition-colors ${
                                isDarkMode ? 'hover:bg-white/5 text-emerald-500/50 hover:text-emerald-300' : 'hover:bg-emerald-100 text-emerald-600/70 hover:text-emerald-900'
                              }`}
                            >
                              <X size={14} />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                        <div className="space-y-1.5 relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                          <input 
                            type="email"
                            required
                            disabled={authLoading}
                            placeholder={t.emailPlaceholder}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`relative w-full rounded-2xl border pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600/50 transition-all ${authLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-[#121212] border-white/10 text-white placeholder-gray-500 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-600 focus:bg-white'}`}
                          />
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full justify-center py-3 text-sm font-semibold shadow-md shadow-orange-600/10"
                          disabled={authLoading}
                        >
                          {authLoading ? (
                            <>
                              <Loader2 className="animate-spin w-5 h-5 mr-2" />
                              {currentLang === 'pt' ? 'Enviando...' : currentLang === 'es' ? 'Enviando...' : 'Sending...'}
                            </>
                          ) : (
                            t.sendResetLinkButton
                          )}
                        </Button>
                      </form>

                      <div className="text-center">
                        <button 
                          type="button"
                          disabled={authLoading}
                          onClick={() => { if (!authLoading) { setAuthMethod('login'); setAuthError(''); setPasswordResetSuccess(false); } }}
                          className={`text-xs font-semibold hover:underline ${authLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          {t.backToLogin}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-6">
                      <div className="flex items-center justify-between">
                        <button 
                          type="button"
                          onClick={() => { if (!authLoading) { setAuthMethod('social'); setAuthError(''); } }}
                          disabled={authLoading}
                          className={`p-2 rounded-full transition-colors ${authLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
                        >
                          <ArrowLeft size={20} />
                        </button>
                        <span className="text-xs font-bold uppercase tracking-widest text-orange-500">{t.signupButton}</span>
                        <div className="w-8 h-8" />
                      </div>

                      <div className="space-y-1.5 text-center">
                        <h2 className="text-2xl font-bold italic tracking-tight uppercase text-orange-500">{t.signupButton}</h2>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{t.createAccountDesc}</p>
                      </div>

                      {authError && (
                        <div className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-xs text-left relative animate-in fade-in slide-in-from-top-1 duration-200 ${isDarkMode ? 'border-red-500/20 bg-red-500/5 text-red-400' : 'border-red-200 bg-red-50 text-red-700'}`}>
                          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                          <div className="flex-1">
                            <span className="font-semibold block mb-0.5">{currentLang === 'pt' ? 'Erro no Cadastro' : currentLang === 'es' ? 'Error de Registro' : 'Sign Up Failed'}</span>
                            <span className="opacity-95 leading-relaxed">{authError}</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setAuthError('')} 
                            className={`p-1 -mr-1 -mt-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      <form onSubmit={handleEmailSignUp} className="space-y-4">
                        <div className="space-y-1.5 relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                          <input 
                            type="email"
                            required
                            disabled={authLoading}
                            placeholder={t.emailPlaceholder}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`relative w-full rounded-2xl border pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600/50 transition-all ${authLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-[#121212] border-white/10 text-white placeholder-gray-500 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-600 focus:bg-white'}`}
                          />
                        </div>

                        <div className="space-y-1.5 relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                          <input 
                            type={showPassword ? "text" : "password"}
                            required
                            disabled={authLoading}
                            placeholder={t.passwordPlaceholder}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`relative w-full rounded-2xl border pl-11 pr-12 py-3 text-sm focus:outline-none focus:ring-2 transition-all ${authLoading ? 'opacity-50 cursor-not-allowed' : ''} ${
                              password.length > 0
                                ? (() => {
                                    const score = getPasswordStrength(password, currentLang).score;
                                    if (score <= 1) return isDarkMode ? 'border-red-500/50 bg-[#121212] text-white focus:border-red-500 focus:ring-red-500/30' : 'border-red-300 bg-red-50/10 text-slate-900 focus:border-red-500 focus:ring-red-500/20';
                                    if (score === 2) return isDarkMode ? 'border-yellow-500/50 bg-[#121212] text-white focus:border-yellow-500 focus:ring-yellow-500/30' : 'border-yellow-300 bg-yellow-50/10 text-slate-900 focus:border-yellow-500 focus:ring-yellow-500/20';
                                    if (score === 3) return isDarkMode ? 'border-emerald-500/50 bg-[#121212] text-white focus:border-emerald-500 focus:ring-emerald-500/30' : 'border-emerald-300 bg-emerald-50/10 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500/20';
                                    return isDarkMode ? 'border-blue-500/50 bg-[#121212] text-white focus:border-blue-500 focus:ring-blue-500/30' : 'border-blue-300 bg-blue-50/10 text-slate-900 focus:border-blue-500 focus:ring-blue-500/20';
                                  })()
                                : isDarkMode ? 'bg-[#121212] border-white/10 text-white placeholder-gray-500 focus:border-orange-500 focus:ring-orange-600/50' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-600 focus:bg-white focus:ring-orange-600/50'
                            }`}
                          />
                          {password && (
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 dark:hover:text-white transition-colors"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          )}

                          {password.length > 0 && (() => {
                            const strength = getPasswordStrength(password, currentLang);
                            const reqs = getRequirementsText(currentLang);
                            return (
                              <div className="mt-2 space-y-2 text-left animate-in fade-in duration-200">
                                <div className="flex items-center justify-between text-[11px] font-semibold">
                                  <span className={isDarkMode ? "text-gray-400" : "text-slate-500"}>
                                    {reqs.strengthLabel}:
                                  </span>
                                  <span className={`font-bold uppercase tracking-wider text-[10px] ${
                                    strength.score <= 1 ? 'text-red-500 animate-pulse' :
                                    strength.score === 2 ? 'text-yellow-500' :
                                    strength.score === 3 ? 'text-emerald-500' : 'text-blue-500'
                                  }`}>
                                    {strength.label}
                                  </span>
                                </div>

                                {/* Progress segments */}
                                <div className="flex gap-1 h-1.5 w-full">
                                  <div className={`flex-1 rounded-full transition-all duration-300 ${strength.score >= 1 ? strength.color : (isDarkMode ? 'bg-white/10' : 'bg-slate-200')}`} />
                                  <div className={`flex-1 rounded-full transition-all duration-300 ${strength.score >= 2 ? strength.color : (isDarkMode ? 'bg-white/10' : 'bg-slate-200')}`} />
                                  <div className={`flex-1 rounded-full transition-all duration-300 ${strength.score >= 3 ? strength.color : (isDarkMode ? 'bg-white/10' : 'bg-slate-200')}`} />
                                  <div className={`flex-1 rounded-full transition-all duration-300 ${strength.score >= 4 ? strength.color : (isDarkMode ? 'bg-white/10' : 'bg-slate-200')}`} />
                                </div>

                                {/* Checklist code with micro-animations */}
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                                  <div className="flex items-center gap-1.5">
                                    <motion.span
                                      key={strength.checks.length ? 'checked_len' : 'unchecked_len'}
                                      initial={{ scale: 0.8 }}
                                      animate={{ scale: strength.checks.length ? [1, 1.25, 1] : 1 }}
                                      transition={{ duration: 0.2 }}
                                      className="shrink-0"
                                    >
                                      <Check size={12} className={`transition-colors ${strength.checks.length ? 'text-green-500 font-bold' : (isDarkMode ? 'text-gray-600' : 'text-slate-300')}`} />
                                    </motion.span>
                                    <span className={`transition-all duration-300 ${strength.checks.length ? (isDarkMode ? 'text-gray-200 font-medium' : 'text-slate-800 font-medium') : (isDarkMode ? 'text-gray-500' : 'text-slate-400')}`}>{reqs.length}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <motion.span
                                      key={strength.checks.mixed ? 'checked_mix' : 'unchecked_mix'}
                                      initial={{ scale: 0.8 }}
                                      animate={{ scale: strength.checks.mixed ? [1, 1.25, 1] : 1 }}
                                      transition={{ duration: 0.2 }}
                                      className="shrink-0"
                                    >
                                      <Check size={12} className={`transition-colors ${strength.checks.mixed ? 'text-green-500 font-bold' : (isDarkMode ? 'text-gray-600' : 'text-slate-300')}`} />
                                    </motion.span>
                                    <span className={`transition-all duration-300 ${strength.checks.mixed ? (isDarkMode ? 'text-gray-200 font-medium' : 'text-slate-800 font-medium') : (isDarkMode ? 'text-gray-500' : 'text-slate-400')}`}>{reqs.mixed}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <motion.span
                                      key={strength.checks.digit ? 'checked_dig' : 'unchecked_dig'}
                                      initial={{ scale: 0.8 }}
                                      animate={{ scale: strength.checks.digit ? [1, 1.25, 1] : 1 }}
                                      transition={{ duration: 0.2 }}
                                      className="shrink-0"
                                    >
                                      <Check size={12} className={`transition-colors ${strength.checks.digit ? 'text-green-500 font-bold' : (isDarkMode ? 'text-gray-600' : 'text-slate-300')}`} />
                                    </motion.span>
                                    <span className={`transition-all duration-300 ${strength.checks.digit ? (isDarkMode ? 'text-gray-200 font-medium' : 'text-slate-800 font-medium') : (isDarkMode ? 'text-gray-500' : 'text-slate-400')}`}>{reqs.digit}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <motion.span
                                      key={strength.checks.special ? 'checked_spec' : 'unchecked_spec'}
                                      initial={{ scale: 0.8 }}
                                      animate={{ scale: strength.checks.special ? [1, 1.25, 1] : 1 }}
                                      transition={{ duration: 0.2 }}
                                      className="shrink-0"
                                    >
                                      <Check size={12} className={`transition-colors ${strength.checks.special ? 'text-green-500 font-bold' : (isDarkMode ? 'text-gray-600' : 'text-slate-300')}`} />
                                    </motion.span>
                                    <span className={`transition-all duration-300 ${strength.checks.special ? (isDarkMode ? 'text-gray-200 font-medium' : 'text-slate-800 font-medium') : (isDarkMode ? 'text-gray-500' : 'text-slate-400')}`}>{reqs.special}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full justify-center py-3 text-sm font-semibold shadow-md shadow-orange-600/10"
                          disabled={authLoading}
                        >
                          {authLoading ? (
                            <>
                              <Loader2 className="animate-spin w-5 h-5 mr-2" />
                              {currentLang === 'pt' ? 'Criando Conta...' : currentLang === 'es' ? 'Creando Cuenta...' : 'Creating Account...'}
                            </>
                          ) : (
                            t.signupButton
                          )}
                        </Button>
                      </form>

                      <div className="text-center">
                        <button 
                          type="button"
                          disabled={authLoading}
                          onClick={() => { if (!authLoading) { setAuthMethod('login'); setAuthError(''); } }}
                          className={`text-xs font-semibold hover:underline ${authLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          {t.alreadyHaveAccount}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {view === 'landing' || (user && !user.emailVerified) ? (
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
                  
                  <h1 className={`text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold leading-[0.9] tracking-tighter mb-10 italic ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                    {t.heroTitle} <br />
                    <span className="text-orange-600 drop-shadow-[0_0_30px_rgba(234,88,12,0.1)]">{t.heroHighlight}</span>
                  </h1>
                  
                  <p className={`text-lg sm:text-xl md:text-2xl mb-12 max-w-[540px] leading-relaxed font-light ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                    {t.hero.subtitle}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row flex-wrap gap-5 w-full sm:w-auto">
                    <Button onClick={handleStart} className="justify-center px-10 py-5 text-lg group shadow-xl shadow-orange-600/20 active:scale-95 transition-transform">
                      {t.startFree} <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button variant="secondary" isDarkMode={isDarkMode} className={`justify-center px-10 py-5 text-lg group active:scale-95 transition-transform ${isDarkMode ? '' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm'}`}>
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
                    <div className={`flex justify-between items-center px-6 py-3 border backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${isDarkMode ? 'border-white/5 bg-black/40 shadow-slate-950/20' : 'border-slate-200 bg-white/90 shadow-md shadow-slate-900/5'}`}>
                       <div className={`flex items-center gap-4 font-mono text-[8px] tracking-[0.3em] uppercase ${isDarkMode ? 'text-orange-500/40' : 'text-orange-600/60'}`}>
                         <span>{t.hero.cpuCore}</span>
                         <div className="w-1 h-1 bg-orange-600/40 rounded-full animate-pulse" />
                         <span>{t.hero.neuralLink}</span>
                       </div>
                       <div className={`font-mono text-[8px] tracking-[0.1em] uppercase hidden sm:block ${isDarkMode ? 'text-orange-500/60' : 'text-orange-600/80'}`}>
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
          <section id="features" className={`py-32 border-y ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200/70'}`}>
            <div className="max-w-7xl mx-auto px-6">
              <h2 className="text-4xl font-bold mb-16 text-center italic">{t.pwrByPrecision}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: BookOpen, title: t.aiSummaries, desc: t.aiSummariesDesc },
                  { icon: BrainCircuit, title: t.mindMaps, desc: t.mindMapsDesc },
                  { icon: MessageSquare, title: t.studyTutor, desc: t.studyTutorDesc },
                  { icon: CheckCircle, title: t.quizGen, desc: t.quizGenDesc }
                ].map((feat, i) => (
                  <div key={i} className={`p-8 rounded-3xl border transition-all flex flex-col gap-4 ${isDarkMode ? 'bg-[#0d0d0d] border-white/5 hover:border-orange-600/50' : 'bg-white border-slate-200 hover:border-orange-200 hover:shadow-xl hover:shadow-slate-900/5'}`}>
                    <div className="w-12 h-12 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-500">
                      <feat.icon size={24} />
                    </div>
                    <h3 className="text-xl font-bold">{feat.title}</h3>
                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-500' : 'text-slate-600'}`}>{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div id="pricing">
            <Pricing t={t} isDarkMode={isDarkMode} />
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
            ${isDarkMode ? 'translate-x-0 bg-[#0a0a0a] border-white/5' : 'translate-x-0 bg-white/90 border-slate-200 shadow-sm'}
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            <div className={`text-xs font-bold uppercase tracking-widest mb-4 mt-4 ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>{t.menu}</div>
            <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isDarkMode ? 'bg-orange-600/10 text-orange-500' : 'bg-orange-50 text-orange-700 border border-orange-100 shadow-sm'}`}>
              <LayoutDashboard size={20} /> {t.dashboard}
            </button>
            <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-950 hover:bg-slate-100'}`}>
              <History size={20} /> {t.history}
            </button>
            <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-950 hover:bg-slate-100'}`}>
              <Settings size={20} /> {t.settings}
            </button>
          </aside>

          <section className={`flex-1 p-4 sm:p-8 overflow-y-auto ${isDarkMode ? '' : 'bg-transparent'}`}>
            <div className="max-w-4xl mx-auto space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <h1 className="text-2xl sm:text-3xl font-bold">{t.welcome}</h1>
                <p className={`text-sm sm:text-base italic ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>{t.readyAnalyze}</p>
              </motion.div>

              {/* URL Input Area */}
              <div className={`border p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl shadow-black/5 ${isDarkMode ? 'bg-[#0d0d0d] border-white/5' : 'bg-white border-slate-200 shadow-xl shadow-slate-900/5'}`}>
                <div className="space-y-4">
                  <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>{t.videoUrl}</label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input 
                      type="text" 
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..." 
                      className={`flex-1 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-orange-600 outline-none transition-all text-sm sm:text-base ${isDarkMode ? 'bg-white/5 border-white/10 border' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20'}`}
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
                    <div key={tool} className={`flex items-center gap-2 p-2 sm:p-3 rounded-xl border text-xs sm:text-sm ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200 text-slate-600 font-medium'}`}>
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
                        <h3 className={`font-bold uppercase tracking-widest text-[10px] sm:text-xs flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
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
                                : 'bg-white border-slate-200 text-slate-950 focus:border-orange-300 focus:shadow-sm'
                            }`}
                          />
                          <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                            isDarkMode ? 'text-gray-500 group-focus-within:text-orange-500' : 'text-slate-500 group-focus-within:text-orange-600'
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
                              className={`group flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${isDarkMode ? 'bg-[#0d0d0d] border-white/5 hover:border-orange-600/50' : 'bg-white border-slate-200 hover:border-orange-200 shadow-sm shadow-slate-900/5 hover:shadow-md'}`}
                            >
                              <div className={`w-20 h-12 rounded-lg overflow-hidden shrink-0 relative ${isDarkMode ? 'bg-gray-800' : 'bg-slate-100'}`}>
                                <img src={item.video?.thumbnail || item.thumbnail} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Youtube size={16} className={`group-hover:text-white transition-colors ${isDarkMode ? 'text-white/50' : 'text-slate-400'}`} />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className={`font-bold text-sm sm:text-base truncate group-hover:text-orange-500 transition-colors ${isDarkMode ? '' : 'text-slate-900'}`}>
                                  {item.video?.title || item.title}
                                </h4>
                                <p className={`text-[10px] sm:text-xs flex items-center gap-2 ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                                  <span className="text-orange-600/60 font-mono italic">{t.astraV3}</span>
                                  <span>•</span>
                                  <span>{new Date(item.createdAt?.toDate?.() || item.createdAt).toLocaleDateString()}</span>
                                </p>
                              </div>
                              <ChevronRight size={18} className="text-gray-400 group-hover:text-orange-600 transition-colors" />
                            </motion.div>
                          ))
                        ) : searchQuery ? (
                          <div className={`p-12 rounded-3xl border flex flex-col items-center justify-center text-center space-y-4 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-xl shadow-slate-900/5'}`}>
                            <div className="w-16 h-16 rounded-full bg-red-600/5 flex items-center justify-center text-red-500">
                              <Search size={32} />
                            </div>
                            <div className="space-y-1">
                              <h3 className="font-bold">{t.noResults} "{searchQuery}"</h3>
                              <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>{t.adjustSearch}</p>
                            </div>
                            <Button variant="ghost" onClick={() => setSearchQuery('')} className="text-xs">
                              {t.clearSearch}
                            </Button>
                          </div>
                        ) : (
                          <div className={`p-12 rounded-3xl border flex flex-col items-center justify-center text-center space-y-4 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-xl shadow-slate-900/5'}`}>
                            <div className="w-16 h-16 rounded-full bg-orange-600/5 flex items-center justify-center text-orange-600">
                              <History size={32} />
                            </div>
                            <div className="space-y-1">
                              <h3 className="font-bold">{t.noHistory}</h3>
                              <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>{t.noHistoryDesc}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className={`font-bold uppercase tracking-widest text-[10px] sm:text-xs px-2 flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
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
      <footer className={`py-12 border-t text-center text-sm transition-colors ${isDarkMode ? 'border-white/5 text-gray-600' : 'border-slate-200 text-slate-500'}`}>
        <p>© 2026 Astra Learning AI — {t.builtWithPrecision}</p>
      </footer>
    </div>
  );
}
