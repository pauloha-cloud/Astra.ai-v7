import { useState, useEffect, useRef } from 'react';
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
  EyeOff,
  GraduationCap,
  Puzzle,
  FileText,
  Sparkles,
  Edit2,
  Layout,
  Download,
  Save,
  MoreVertical,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  CreditCard,
  Globe,
  FolderOpen,
  FileUp
} from 'lucide-react';
import { checkHealth, api } from './lib/api';
import { useAuth } from './contexts/AuthContext';
import { analyzeVideoContent, AnalysisResult } from './services/geminiService';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc, limit, deleteDoc } from 'firebase/firestore';
import { db, auth } from './lib/firebase';
import { AnalysisResultView } from './components/AnalysisResultView';
import { handleFirestoreError, OperationType } from './lib/firestoreUtils';
import { Pricing } from './components/Pricing';
import { FAQ } from './components/FAQ';
import { AICore } from './components/AICore';
import { AIActivityFeed } from './components/AIActivityFeed';
import axios from 'axios';
import { BrandLogo } from './components/BrandLogo';
import { SettingsView } from './components/SettingsView';
import { HistoryView } from './components/HistoryView';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfUse } from './components/TermsOfUse';
import { CookieConsent } from './components/CookieConsent';

// User Preferences
export interface UserPreferences {
  defaultStudyFormat: 'summary' | 'quiz' | 'tutor' | 'mindmap';
  explanationLevel: 'basic' | 'intermediate' | 'advanced';
  defaultQuizQuestionCount: 5 | 10 | 15 | 20 | 25;
}

export function extractYouTubeVideoId(url: string | any): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }
  const cleanUrl = url.trim();
  try {
    const urlWithProtocol = cleanUrl.includes('://') ? cleanUrl : `https://${cleanUrl}`;
    const urlObj = new URL(urlWithProtocol);
    
    if (urlObj.hostname === 'youtu.be') {
      const id = urlObj.pathname.slice(1).split(/[?#&]/)[0];
      if (id.length === 11) {
        return id;
      }
    }
    
    if (urlObj.hostname.includes('youtube.com')) {
      const v = urlObj.searchParams.get('v');
      if (v && v.length === 11) {
        return v;
      }
      
      const pathParts = urlObj.pathname.split('/');
      const idFromPath = pathParts.find(part => part.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(part));
      if (idFromPath) {
        return idFromPath;
      }
    }
  } catch (e) {
    // ignore
  }

  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
    /shorts\/([a-zA-Z0-9_-]{11})/,
    /live\/([a-zA-Z0-9_-]{11})/,
    /v\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  return null;
}

export const processHistory = (rawHistory: any[]): any[] => {
  const uniqueMap = new Map<string, any>();

  // Sort rawHistory so that we process them: most recent first.
  const sorted = [...rawHistory].sort((a, b) => {
    const valA = a.lastAnalyzedAt || a.createdAt;
    const valB = b.lastAnalyzedAt || b.createdAt;
    const timeA = valA ? new Date(valA.toDate?.() || valA).getTime() : 0;
    const timeB = valB ? new Date(valB.toDate?.() || valB).getTime() : 0;
    return timeB - timeA;
  });

  for (const item of sorted) {
    let videoId = item.video?.videoId || item.videoId;
    if (!videoId) {
      const url = item.video?.url || item.url;
      if (url) {
        videoId = extractYouTubeVideoId(url);
      }
    }
    const key = videoId || `${item.video?.title || item.title || ''}_${item.video?.url || item.url || ''}`;
    
    if (key && !uniqueMap.has(key)) {
      uniqueMap.set(key, {
        ...item,
        videoId: videoId || undefined
      });
    }
  }

  return Array.from(uniqueMap.values()).slice(0, 10);
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultStudyFormat: 'summary',
  explanationLevel: 'intermediate',
  defaultQuizQuestionCount: 5
};

const PREF_FORMAT_KEY = 'astra_pref_format';
const PREF_LEVEL_KEY = 'astra_pref_level';
const PREF_QUIZ_COUNT_KEY = 'astra_pref_quiz_count';

export const loadLocalPreferences = (): UserPreferences => {
  const format = localStorage.getItem(PREF_FORMAT_KEY);
  const level = localStorage.getItem(PREF_LEVEL_KEY);
  const quizCount = Number(localStorage.getItem(PREF_QUIZ_COUNT_KEY));

  return {
    defaultStudyFormat: (format === 'summary' || format === 'quiz' || format === 'tutor' || format === 'mindmap') ? format : DEFAULT_PREFERENCES.defaultStudyFormat,
    explanationLevel: (level === 'basic' || level === 'intermediate' || level === 'advanced') ? level : DEFAULT_PREFERENCES.explanationLevel,
    defaultQuizQuestionCount: (quizCount === 5 || quizCount === 10 || quizCount === 15 || quizCount === 20 || quizCount === 25) ? (quizCount as 5 | 10 | 15 | 20 | 25) : DEFAULT_PREFERENCES.defaultQuizQuestionCount
  };
};

export const saveLocalPreferences = (prefs: UserPreferences) => {
  localStorage.setItem(PREF_FORMAT_KEY, prefs.defaultStudyFormat);
  localStorage.setItem(PREF_LEVEL_KEY, prefs.explanationLevel);
  localStorage.setItem(PREF_QUIZ_COUNT_KEY, String(prefs.defaultQuizQuestionCount));
};

export const loadUserPreferences = async (userId?: string): Promise<UserPreferences> => {
  const local = loadLocalPreferences();
  if (!userId) {
    return local;
  }
  try {
    const prefRef = doc(db, 'users', userId, 'preferences', 'app');
    const docSnap = await getDoc(prefRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const loaded: UserPreferences = {
        defaultStudyFormat: (data.defaultStudyFormat === 'summary' || data.defaultStudyFormat === 'quiz' || data.defaultStudyFormat === 'tutor' || data.defaultStudyFormat === 'mindmap') ? data.defaultStudyFormat : local.defaultStudyFormat,
        explanationLevel: (data.explanationLevel === 'basic' || data.explanationLevel === 'intermediate' || data.explanationLevel === 'advanced') ? data.explanationLevel : local.explanationLevel,
        defaultQuizQuestionCount: (data.defaultQuizQuestionCount === 5 || data.defaultQuizQuestionCount === 10 || data.defaultQuizQuestionCount === 15 || data.defaultQuizQuestionCount === 20 || data.defaultQuizQuestionCount === 25) ? (data.defaultQuizQuestionCount as 5 | 10 | 15 | 20 | 25) : local.defaultQuizQuestionCount
      };
      saveLocalPreferences(loaded);
      return loaded;
    } else {
      await saveUserPreferences(userId, local);
      return local;
    }
  } catch (error) {
    console.warn('[Preferences] Failed to load from Firestore, using local storage cache:', error);
    return local;
  }
};

export const saveUserPreferences = async (userId: string | undefined, prefs: UserPreferences): Promise<void> => {
  saveLocalPreferences(prefs);
  if (!userId) {
    return;
  }
  try {
    const prefRef = doc(db, 'users', userId, 'preferences', 'app');
    await setDoc(prefRef, {
      defaultStudyFormat: prefs.defaultStudyFormat,
      explanationLevel: prefs.explanationLevel,
      defaultQuizQuestionCount: prefs.defaultQuizQuestionCount,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.warn('[Preferences] Failed to save to Firestore:', error);
  }
};

export const updateUserPreference = async <K extends keyof UserPreferences>(
  userId: string | undefined,
  key: K,
  value: UserPreferences[K]
): Promise<UserPreferences> => {
  const prefs = loadLocalPreferences();
  prefs[key] = value;
  await saveUserPreferences(userId, prefs);
  return prefs;
};

// Types
type ComponentState = 'landing' | 'dashboard' | 'privacy-policy' | 'terms';
type Language = 'pt' | 'en' | 'es';

const TRANSLATIONS = {
  pt: {
    features: "Funcionalidades",
    pricing: "Preços",
    faq: "FAQ",
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
    welcomeBack: "Bem-vindo de volta, {name}",
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
    historyLimitDesc: "Mostrando os 10 vídeos mais recentes.",
    clearHistory: "Limpar Histórico",
    confirmRemoveVideo: "Deseja remover este vídeo do histórico?",
    confirmClearHistory: "Deseja limpar todo o histórico? Esta ação não pode ser desfeita.",
    cancel: "Cancelar",
    remove: "Remover",
    clearAll: "Limpar tudo",
    removeSuccess: "Vídeo removido do histórico!",
    clearSuccess: "Histórico limpo!",
    settings: "Configurações",
    newFeatures: "Novas Features",
    soon: "Em breve",
    newFeaturesTitle: "Novas Features",
    newFeaturesSub: "Recursos planejados para melhorar sua experiência com mapas mentais.",
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
    summarySectionTitle: "Seu Resumo",
    summarySectionDesc: "Explore os principais tópicos extraídos do vídeo.",
    summaryKeyTakeaways: "Principais aprendizados",
    sourceMetadata: "Fonte: metadados",
    sourceTranscript: "Fonte: transcrição",
    summaryTranscriptTitle: "Transcrição",
    continueStudying: "Continuar estudando",
    sourceMetadataDesc: "Resumo gerado com base nas informações disponíveis do vídeo.",
    sourceTranscriptDesc: "Resumo gerado com base no conteúdo falado do vídeo.",
    generalSummaryTitle: "Resumo geral",
    importantConceptsTitle: "Conceitos importantes",
    expandTranscript: "Expandir",
    collapseTranscript: "Recolher",
    copyTranscript: "Copiar transcrição",
    transcriptCopied: "Copiado!",
    videoTranscriptDesc: "Veja o texto usado como base para a análise.",
    videoTranscriptTitle: "Transcrição do vídeo",
    transcriptUnavailableDesc: "Transcrição indisponível. Este resumo foi gerado com base nos metadados do vídeo.",
    openTutor: "Abrir Tutor",
    exportPdf: "Exportar PDF",
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
    generateQuiz: "Gerar Quiz",
    generatingQuiz: "Gerando quiz...",
    questionCount: "Quantidade de questões",
    questions: "questões",
    quizGenerateDesc: "Escolha quantas questões deseja gerar com base no conteúdo do vídeo.",
    quizError: "Não foi possível gerar o quiz. Tente novamente ou analise outro vídeo.",
    yourScore: "SUA PONTUAÇÃO",
    tryAgain: "Tentar Novamente",
    generateMoreQuestions: "Gerar mais questões",
    aiGeneratingExtra: "IA gerando novos desafios...",
    proComingSoon: "Renderização avançada de mapa visual em breve no Pro.",
    mindMapPromptBefore: "Clique para gerar um mapa mental com base no conteúdo do vídeo.",
    mindMapGenerating: "Gerando mapa mental inteligente...",
    mindMapSubtext: "Organizando conceitos, relações e tópicos principais do vídeo.",
    mindMapError: "Não foi possível gerar o mapa mental. Tente novamente.",
    generateMindMap: "Gerar Mapa Mental",
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
    faq: "FAQ",
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
    welcomeBack: "Welcome back, {name}",
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
    historyLimitDesc: "Showing the 10 most recent videos.",
    clearHistory: "Clear History",
    confirmRemoveVideo: "Do you want to remove this video from history?",
    confirmClearHistory: "Do you want to clear the entire history? This action cannot be undone.",
    cancel: "Cancel",
    remove: "Remove",
    clearAll: "Clear all",
    removeSuccess: "Video removed from history!",
    clearSuccess: "History cleared!",
    settings: "Settings",
    newFeatures: "New Features",
    soon: "Soon",
    newFeaturesTitle: "New Features",
    newFeaturesSub: "Planned features to enhance your mind mapping experience.",
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
    summarySectionTitle: "Your Summary",
    summarySectionDesc: "Explore the main topics extracted from the video.",
    summaryKeyTakeaways: "Key takeaways",
    sourceMetadata: "Source: metadata",
    sourceTranscript: "Source: transcript",
    summaryTranscriptTitle: "Transcript",
    continueStudying: "Continue studying",
    sourceMetadataDesc: "Summary generated based on the video information available.",
    sourceTranscriptDesc: "Summary generated based on the spoken content of the video.",
    generalSummaryTitle: "General summary",
    importantConceptsTitle: "Important concepts",
    expandTranscript: "Expand",
    collapseTranscript: "Collapse",
    copyTranscript: "Copy transcript",
    transcriptCopied: "Copied!",
    videoTranscriptDesc: "See the text used as the basis for the analysis.",
    videoTranscriptTitle: "Video transcript",
    transcriptUnavailableDesc: "Transcript unavailable. This summary was generated based on the video metadata.",
    openTutor: "Open Tutor",
    exportPdf: "Export PDF",
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
    generateQuiz: "Generate Quiz",
    generatingQuiz: "Generating quiz...",
    questionCount: "Number of questions",
    questions: "questions",
    quizGenerateDesc: "Choose how many questions you want to generate based on the video content.",
    quizError: "Could not generate the quiz. Try again or analyze another video.",
    yourScore: "YOUR SCORE",
    tryAgain: "Try Again",
    generateMoreQuestions: "Generate more questions",
    aiGeneratingExtra: "AI generating new challenges...",
    proComingSoon: "Advanced visual map rendering coming soon in Pro.",
    mindMapPromptBefore: "Click to generate a mind map based on the video content.",
    mindMapGenerating: "Generating intelligent mind map...",
    mindMapSubtext: "Organizing concepts, relationships, and key topics from the video.",
    mindMapError: "Could not generate the mind map. Please try again.",
    generateMindMap: "Generate Mind Map",
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
    faq: "FAQ",
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
    welcomeBack: "Bienvenido de vuelta, {name}",
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
    historyLimitDesc: "Mostrando los 10 videos más recientes.",
    clearHistory: "Limpiar Historial",
    confirmRemoveVideo: "¿Deseas eliminar este video del historial?",
    confirmClearHistory: "¿Deseas limpiar todo el historial? Esta acción no se puede deshacer.",
    cancel: "Cancelar",
    remove: "Eliminar",
    clearAll: "Limpiar todo",
    removeSuccess: "¡Video eliminado del historial!",
    clearSuccess: "¡Historial limpiado!",
    settings: "Ajustes",
    newFeatures: "Nuevas Features",
    soon: "Muy pronto",
    newFeaturesTitle: "Nuevas Características",
    newFeaturesSub: "Funcionalidades planeadas para mejorar tu experiencia con mapas mentais.",
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
    summarySectionTitle: "Tu resumen",
    summarySectionDesc: "Explora los principales temas extraídos del video.",
    summaryKeyTakeaways: "Aprendizajes clave",
    sourceMetadata: "Fuente: metadatos",
    sourceTranscript: "Fuente: transcripción",
    summaryTranscriptTitle: "Transcripción",
    continueStudying: "Continuar estudiando",
    sourceMetadataDesc: "Resumen generado con base en la información disponible del video.",
    sourceTranscriptDesc: "Resumen generado con base en el contenido hablado del video.",
    generalSummaryTitle: "Resumen general",
    importantConceptsTitle: "Conceptos importantes",
    expandTranscript: "Expandir",
    collapseTranscript: "Contraer",
    copyTranscript: "Copiar transcripción",
    transcriptCopied: "¡Copiado!",
    videoTranscriptDesc: "Vea el texto utilizado como base para el análisis.",
    videoTranscriptTitle: "Transcripción del video",
    transcriptUnavailableDesc: "Transcripción no disponible. Este resumen fue generado a partir de los metadatos del video.",
    openTutor: "Abrir Tutor",
    exportPdf: "Exportar PDF",
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
    finishQuiz: "Finalizar Quiz",
    generateQuiz: "Generar Quiz",
    generatingQuiz: "Generando quiz...",
    questionCount: "Cantidad de preguntas",
    questions: "preguntas",
    quizGenerateDesc: "Elige cuántas preguntas deseas generar con base en el contenido del video.",
    quizError: "No fue posible generar el quiz. Inténtalo nuevamente o analiza otro video.",
    yourScore: "TU PUNTUACIÓN",
    tryAgain: "Reintentar",
    generateMoreQuestions: "Generar más preguntas",
    aiGeneratingExtra: "IA generando nuevos desafíos...",
    proComingSoon: "Renderizado avanzado de mapas visuales próximamente en Pro.",
    mindMapPromptBefore: "Haz clic para generar un mapa mental basado en el contenido del video.",
    mindMapGenerating: "Generando mapa mental inteligente...",
    mindMapSubtext: "Organizando conceptos, relaciones y temas principales del video.",
    mindMapError: "No fue posible generar el mapa mental. Inténtalo nuevamente.",
    generateMindMap: "Generar Mapa Mental",
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

function getFirstName(user: any) {
  if (user?.displayName) {
    return user.displayName.trim().split(" ")[0];
  }

  if (user?.email) {
    return user.email.split("@")[0];
  }

  return null;
}

export default function App() {
  const { 
    user, 
    signInWithGoogle, 
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
  const [dashboardSubView, setDashboardSubView] = useState<'panel' | 'history' | 'settings'>('panel');
  const [forceCookiePrefs, setForceCookiePrefs] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [apiStatus, setApiStatus] = useState<string>(''); 
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentLang, setCurrentLang] = useState<Language>('pt');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('astra_sidebar_collapsed');
    return saved === 'true';
  });
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Analysis State
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedSourceType, setSelectedSourceType] = useState<'youtube' | 'document' | 'website' | 'drive'>('youtube');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);

  const handleDocumentSelect = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const size = file.size;
    
    const allowedExtensions = ['pdf', 'txt', 'docx', 'png', 'jpg', 'jpeg', 'webp'];
    if (!ext || !allowedExtensions.includes(ext)) {
      showToast(
        currentLang === 'pt' ? "Formato não suportado. Envie PDF, TXT, DOCX ou imagem." :
        currentLang === 'es' ? "Formato no soportado. Sube PDF, TXT, DOCX o imagen." :
        "Unsupported format. Please upload PDF, TXT, DOCX, or an image."
      );
      return;
    }
    
    let maxSize = 0;
    if (ext === 'pdf' || ext === 'docx') maxSize = 20 * 1024 * 1024;
    else if (ext === 'txt') maxSize = 5 * 1024 * 1024;
    else maxSize = 10 * 1024 * 1024; // images
    
    if (size > maxSize) {
      const mbLimit = maxSize / (1024 * 1024);
      showToast(
        currentLang === 'pt' ? `O arquivo excede o limite de ${mbLimit} MB para este formato.` :
        currentLang === 'es' ? `El archivo supera el límite de ${mbLimit} MB para este formato.` :
        `File exceeds the ${mbLimit} MB limit for this format.`
      );
      return;
    }
    
    setSelectedFile(file);
  };

  const handleAnalyzeDocument = () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    
    const statuses = currentLang === 'pt' ? [
      "Enviando documento...",
      "Processando conteúdo...",
      "Identificando tópicos...",
      "Construindo mapa mental...",
      "Sucesso!"
    ] : currentLang === 'es' ? [
      "Enviando documento...",
      "Procesando contenido...",
      "Identificando temas...",
      "Construyendo mapa mental...",
      "¡Éxito!"
    ] : [
      "Uploading document...",
      "Processing content...",
      "Identifying topics...",
      "Building mind map...",
      "Success!"
    ];
    
    setAnalysisStatus(statuses[0]);
    
    setTimeout(() => {
      setAnalysisStatus(statuses[1]);
      setTimeout(() => {
        setAnalysisStatus(statuses[2]);
        setTimeout(() => {
          setAnalysisStatus(statuses[3]);
          setTimeout(() => {
            setAnalysisStatus(statuses[4]);
            
            const fileName = selectedFile.name;
            const mockResult: AnalysisResult = {
              video: {
                videoId: `doc-${Date.now()}`,
                url: `document://${fileName}`,
                title: fileName,
                channel: currentLang === 'pt' ? "Documento Local" : currentLang === 'es' ? "Documento Local" : "Local Document",
                thumbnail: ""
              },
              mode: 'transcript',
              message: "Análise realizada com sucesso a partir de documento local.",
              summary: currentLang === 'pt' ? `# Resumo do Documento: ${fileName}\n\nEste documento foi carregado e analisado pelo **Astra Learning**. A análise identificou os tópicos centrais estruturados para otimização do seu aprendizado.\n\n## Principais Pilares Estudados\n1. **Consolidação de Conceitos**: Organização das ideias fundamentais contidas no material.\n2. **Conexões Semânticas**: Identificação das relações entre os temas principais e secundários.\n3. **Avaliação Prática**: Geração de perguntas direcionadas para fixação de conteúdo a longo prazo.\n\n---\n\n### Visão Geral Detalhada\nO material de estudo fornece uma base sólida para a compreensão do tópico. Recomenda-se explorar cada ramificação no **Mapa Mental** e testar seus conhecimentos na seção de **Quiz**. Se houver qualquer dúvida ou necessidade de aprofundamento, o **Tutor de Estudos** está pronto para explicar detalhadamente cada conceito.` :
                       currentLang === 'es' ? `# Resumen del Documento: ${fileName}\n\nEste documento ha sido cargado y analizado por **Astra Learning**. El análisis identificó los temas centrales estructurados para optimizar su aprendizaje.\n\n## Pilares Clave Estudiados\n1. **Consolidación de Conceptos**: Organización de las ideas fundamentales contenidas en el material.\n2. **Conexiones Semánticas**: Identificación de relaciones entre temas principales y secundarios.\n3. **Evaluación Práctica**: Generación de preguntas dirigidas para la retención a largo plazo.\n\n---\n\n### Descripción General Detalhada\nEl material de estudio proporciona una base sólida para comprender el tema. Se recomienda explorar cada rama en el **Mapa Mental** y poner a prueba sus conocimientos en la sección de **Cuestionario**. Si tiene alguna duda o necesita profundizar, el **Tutor de Estudios** está listo para explicar cada concepto en detalle.` :
                       `# Document Summary: ${fileName}\n\nThis document has been uploaded and analyzed by **Astra Learning**. The analysis identified the core topics structured to optimize your learning.\n\n## Key Studied Pillars\n1. **Concept Consolidation**: Organization of the fundamental ideas contained in the material.\n2. **Semantic Connections**: Identification of relationships between primary and secondary themes.\n3. **Practical Evaluation**: Generation of targeted questions for long-term retention.\n\n---\n\n### Detailed Overview\nThe study material provides a solid foundation for understanding the topic. It is highly recommended to explore each branch in the **Mind Map** and test your knowledge in the **Quiz** section. If you have any questions or need deep explanation, the **Study Tutor** is ready to explain each concept in detail.`,
              key_points: currentLang === 'pt' ? [
                "Leitura ativa e identificação de tópicos centrais",
                "Estruturação hierárquica do material analisado",
                "Retenção de conteúdo otimizada com repetição espaçada"
              ] : currentLang === 'es' ? [
                "Lectura activa e identificación de temas centrales",
                "Estructuración jerárquica del material analizado",
                "Retención de contenido optimizada con repetición espaciada"
              ] : [
                "Active reading and identification of central topics",
                "Hierarchical structuring of analyzed material",
                "Optimized content retention with spaced repetition"
              ],
              quiz: currentLang === 'pt' ? [
                {
                  question: "Qual é o principal objetivo do Astra Learning ao analisar este documento?",
                  options: [
                    "Apenas ler o texto sem organizar",
                    "Transformar o conteúdo em recursos dinâmicos como Resumo, Tutor, Quiz e Mapa Mental",
                    "Traduzir o documento para outros idiomas sem explicar",
                    "Excluir o arquivo permanentemente da nuvem"
                  ],
                  answer: "Transformar o conteúdo em recursos dinâmicos como Resumo, Tutor, Quiz e Mapa Mental",
                  explanation: "O Astra analisa o material para criar uma experiência de aprendizado ativa e multimodal."
                },
                {
                  question: "Quais formatos de arquivo são suportados pelo Astra Learning na fonte 'Documento'?",
                  options: [
                    "Apenas arquivos MP3",
                    "Apenas imagens PNG",
                    "PDF, TXT, DOCX e imagens",
                    "Planilhas de Excel complexas"
                  ],
                  answer: "PDF, TXT, DOCX e imagens",
                  explanation: "O Astra suporta múltiplos formatos de texto e imagem para flexibilidade de estudo."
                },
                {
                  question: "Como o Tutor de Estudos pode te ajudar após a análise do documento?",
                  options: [
                    "Fazendo o resumo por você",
                    "Respondendo dúvidas complexas e explicando conceitos de forma personalizada",
                    "Bloqueando o acesso aos arquivos",
                    "Criando um novo arquivo do zero"
                  ],
                  answer: "Respondendo dúvidas complexas e explicando conceitos de forma personalizada",
                  explanation: "O Tutor interativo interage diretamente com base no contexto do documento analisado."
                }
              ] : currentLang === 'es' ? [
                {
                  question: "¿Cuál es el objetivo principal de Astra Learning al analizar este documento?",
                  options: [
                    "Solo leer el texto sin organizar",
                    "Transformar el contenido en recursos dinámicos como Resumen, Tutor, Cuestionario y Mapa Mental",
                    "Traducir el documento a otros idiomas sin explicar",
                    "Eliminar permanentemente el archivo de la nube"
                  ],
                  answer: "Transformar el contenido en recursos dinámicos como Resumen, Tutor, Cuestionario y Mapa Mental",
                  explanation: "Astra analiza el material para crear una experiencia de aprendizaje activa y multimodal."
                },
                {
                  question: "¿Qué formatos de archivo son compatibles con Astra Learning en la fuente 'Documento'?",
                  options: [
                    "Solo archivos MP3",
                    "Solo imágenes PNG",
                    "PDF, TXT, DOCX e imágenes",
                    "Hojas de cálculo de Excel complejas"
                  ],
                  answer: "PDF, TXT, DOCX e imágenes",
                  explanation: "Astra admite múltiples formatos de texto e imagen para mayor flexibilidad de estudio."
                },
                {
                  question: "¿Como o Tutor de Estudos pode te ajudar após a análise do documento?",
                  options: [
                    "Haciendo el resumen por ti",
                    "Respondiendo preguntas complejas y explicando conceptos de forma personalizada",
                    "Bloqueando el acceso a los archivos",
                    "Creando un nuevo archivo desde cero"
                  ],
                  answer: "Respondiendo preguntas complejas y explicando conceptos de forma personalizada",
                  explanation: "El Tutor interactivo interactúa directamente según el contexto del documento analizado."
                }
              ] : [
                {
                  question: "What is the primary objective of Astra Learning when analyzing this document?",
                  options: [
                    "Just reading the text without organizing",
                    "Transforming the content into dynamic resources like Summary, Tutor, Quiz, and Mind Map",
                    "Translating the document into other languages without explaining",
                    "Permanently deleting the file from the cloud"
                  ],
                  answer: "Transforming the content into dynamic resources like Summary, Tutor, Quiz, and Mind Map",
                  explanation: "Astra analyzes the material to create an active and multimodal learning experience."
                },
                {
                  question: "Which file formats are supported by Astra Learning in the 'Document' source?",
                  options: [
                    "Only MP3 files",
                    "Only PNG images",
                    "PDF, TXT, DOCX, and images",
                    "Complex Excel spreadsheets"
                  ],
                  answer: "PDF, TXT, DOCX, and images",
                  explanation: "Astra supports multiple text and image formats for study flexibility."
                },
                {
                  question: "How can the Study Tutor help you after analyzing the document?",
                  options: [
                    "Writing the summary for you",
                    "Answering complex questions and explaining concepts in a personalized way",
                    "Blocking access to files",
                    "Creating a new file from scratch"
                  ],
                  answer: "Answering complex questions and explaining concepts in a personalized way",
                  explanation: "The interactive Tutor engages directly based on the context of the analyzed document."
                }
              ],
              mind_map: {
                topic: fileName,
                children: currentLang === 'pt' ? [
                  {
                    topic: "Conceitos Fundamentais",
                    children: [
                      { topic: "Análise Estrutural" },
                      { topic: "Extração Semântica" }
                    ]
                  },
                  {
                    topic: "Fixação Prática",
                    children: [
                      { topic: "Resolução de Quizzes" },
                      { topic: "Diálogo com o Tutor" }
                    ]
                  },
                  {
                    topic: "Formatos Soportados",
                    children: [
                      { topic: "Documentos (PDF, TXT, DOCX)" },
                      { topic: "Imagens e Gráficos" }
                    ]
                  }
                ] : currentLang === 'es' ? [
                  {
                    topic: "Conceptos Fundamentales",
                    children: [
                      { topic: "Análisis Estructural" },
                      { topic: "Extracción Semántica" }
                    ]
                  },
                  {
                    topic: "Retención Práctica",
                    children: [
                      { topic: "Resolución de Cuestionarios" },
                      { topic: "Diálogo con el Tutor" }
                    ]
                  },
                  {
                    topic: "Formatos Soportados",
                    children: [
                      { topic: "Documentos (PDF, TXT, DOCX)" },
                      { topic: "Imágenes y Gráficos" }
                    ]
                  }
                ] : [
                  {
                    topic: "Fundamental Concepts",
                    children: [
                      { topic: "Structural Analysis" },
                      { topic: "Semantic Extraction" }
                    ]
                  },
                  {
                    topic: "Practical Retention",
                    children: [
                      { topic: "Quiz Solving" },
                      { topic: "Tutor Dialogue" }
                    ]
                  },
                  {
                    topic: "Supported Formats",
                    children: [
                      { topic: "Documents (PDF, TXT, DOCX)" },
                      { topic: "Images & Graphics" }
                    ]
                  }
                ]
              },
              tutor_questions: currentLang === 'pt' ? [
                "Me explique os pontos fundamentais do documento",
                "Como posso aplicar esses conceitos na prática?",
                "Crie um roteiro de estudos baseado nesse arquivo"
              ] : currentLang === 'es' ? [
                "Explícame los puntos fundamentales de este documento",
                "¿Cómo puedo aplicar estos conceptos en la práctica?",
                "Crea un plan de estudio basado en este archivo"
              ] : [
                "Explain the core points of this document to me",
                "How can I apply these concepts in practice?",
                "Create a study plan based on this file"
              ],
              limitations: []
            };
            
            setCurrentResult(mockResult);
            setActiveTab(preferences.defaultStudyFormat);
            setIsAnalyzing(false);
            setSelectedFile(null);
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);
  };

  // History delete/clear state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalType, setConfirmModalType] = useState<'delete_item' | 'clear_all'>('delete_item');
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const urlInputRef = useRef<HTMLInputElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (message: string) => {
    setToastMessage(message);
  };

  const focusUrlInput = () => {
    if (urlInputRef.current) {
      urlInputRef.current.focus();
    }
  };

  const handleGoToPanelAndFocus = () => {
    setDashboardSubView('panel');
    setTimeout(() => {
      focusUrlInput();
    }, 150);
  };

  const confirmDeleteAction = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      if (confirmModalType === 'delete_item' && itemToDelete) {
        // Delete a single item
        const docRef = doc(db, 'users', user.uid, 'analyses', itemToDelete.id);
        await deleteDoc(docRef);

        // If the deleted item is currently opened, reset currentResult
        const currentId = currentResult?.video?.videoId || (currentResult as any)?.id || (currentResult as any)?.videoId;
        const deletedId = itemToDelete.id || itemToDelete.video?.videoId || itemToDelete.videoId;
        if (currentResult && currentId === deletedId) {
          setCurrentResult(null);
        }
      } else if (confirmModalType === 'clear_all') {
        // Clear all items in user's analyses collection
        const q = query(collection(db, 'users', user.uid, 'analyses'));
        const querySnapshot = await getDocs(q);
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // Reset current active result if any
        setCurrentResult(null);
      }
      
      // Close active menu and refresh history
      setActiveMenuId(null);
      setItemToDelete(null);
      setIsConfirmModalOpen(false);
      await fetchHistory();
    } catch (error) {
      console.error("Failed to perform delete action:", error);
      try {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/analyses`);
      } catch (err) {
        console.error("Handled deletion Firestore error:", err);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // User preferences state
  const [preferences, setPreferences] = useState<UserPreferences>(() => loadLocalPreferences());

  const handleUpdatePreference = async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    await saveUserPreferences(user?.uid, updated);
  };

  const [activeTab, setActiveTab] = useState<'summary' | 'quiz' | 'mindmap' | 'tutor' | 'transcript'>(() => {
    return loadLocalPreferences().defaultStudyFormat;
  });

  // Fetch and apply user preferences from Firestore when user changes
  useEffect(() => {
    const fetchAndApplyPrefs = async () => {
      if (user) {
        try {
          const dbPrefs = await loadUserPreferences(user.uid);
          setPreferences(dbPrefs);
          if (dbPrefs.defaultStudyFormat) {
            setActiveTab(dbPrefs.defaultStudyFormat);
          }
        } catch (error) {
          console.warn('[Preferences] Error fetching user preferences:', error);
        }
      } else {
        const localPrefs = loadLocalPreferences();
        setPreferences(localPrefs);
        setActiveTab(localPrefs.defaultStudyFormat);
      }
    };
    fetchAndApplyPrefs();
  }, [user]);
  const [history, setHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setPassword('');
    setShowPassword(false);
  }, [authMethod]);

  const t = TRANSLATIONS[currentLang];

  const firstName = getFirstName(user);
  const fallbackNames: Record<string, string> = {
    pt: "Explorador",
    en: "Explorer",
    es: "Explorador",
  };
  const displayName = firstName || fallbackNames[currentLang] || "Explorer";

  useEffect(() => {
    setApiStatus(t.hero.badgeChecking);
    checkHealth().then(() => setApiStatus(t.hero.badgeOnline)).catch(() => setApiStatus(t.hero.badgeOffline));
  }, [t.hero.badgeOnline, t.hero.badgeOffline, t.hero.badgeChecking]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsBillingModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      // Query up to 40 items to ensure we have enough to find 10 unique ones even with legacy duplicates
      const q = query(
        collection(db, 'users', user.uid, 'analyses'),
        orderBy('createdAt', 'desc'),
        limit(40)
      );
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const processedDocs = processHistory(docs);
      setHistory(processedDocs);
    } catch (error) {
      console.error("Failed to fetch history:", error);
      try {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/analyses`);
      } catch (err) {
        // Swallow error to prevent crashing, just log the handled firestore details
        console.error("Handled Firestore history error:", err);
      }
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
      setDashboardSubView('panel');
    }
  }, [user, verificationSuccess]);

  const handleAnalyze = async () => {
    if (!videoUrl || !user) return;
    
    setIsAnalyzing(true);
    setAnalysisStatus(t.connecting);
    
    try {
      // 1. Get info and analysis from backend
      console.log(`[Frontend] Requesting analysis for: "${videoUrl}" (lang: ${currentLang})`);
      const response = await api.post('youtube-info', { 
        url: videoUrl, 
        lang: currentLang,
        targetLanguage: currentLang,
        explanationLevel: preferences.explanationLevel
      }, { timeout: 180000 });
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
        const videoId = data.video?.videoId || extractYouTubeVideoId(data.video?.url || videoUrl);
        if (videoId) {
          const docRef = doc(db, 'users', user.uid, 'analyses', videoId);
          await setDoc(docRef, {
            userId: user.uid,
            video: {
              videoId: videoId,
              url: data.video?.url || videoUrl,
              title: data.video?.title || '',
              channel: data.video?.channel || '',
              thumbnail: data.video?.thumbnail || ''
            },
            mode: data.mode,
            summary: data.summary,
            key_points: data.key_points,
            quiz: data.quiz,
            mind_map: data.mind_map,
            tutor_questions: data.tutor_questions || [],
            limitations: data.limitations || [],
            transcript: data.transcript,
            createdAt: serverTimestamp(),
            lastAnalyzedAt: serverTimestamp()
          });
        } else {
          await addDoc(collection(db, analysesPath), {
            userId: user.uid,
            video: {
              videoId: null,
              url: data.video?.url || videoUrl,
              title: data.video?.title || '',
              channel: data.video?.channel || '',
              thumbnail: data.video?.thumbnail || ''
            },
            mode: data.mode,
            summary: data.summary,
            key_points: data.key_points,
            quiz: data.quiz,
            mind_map: data.mind_map,
            tutor_questions: data.tutor_questions || [],
            limitations: data.limitations || [],
            transcript: data.transcript,
            createdAt: serverTimestamp(),
            lastAnalyzedAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error("Failed to save analysis to history:", error);
        try {
          handleFirestoreError(error, OperationType.CREATE, analysesPath);
        } catch (err) {
          // Swallow error to prevent crashing the main analysis result display, just log
          console.error("Handled Firestore save error:", err);
        }
      }

      setCurrentResult(data);
      setActiveTab(preferences.defaultStudyFormat);
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
            {!user && (
              <div className="hidden md:flex items-center gap-6 mr-6 transition-all">
                <a href="#features" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'}`}>{t.features}</a>
                <a href="#pricing" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'}`}>{t.pricing}</a>
                <a href="#faq" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'}`}>{t.faq}</a>
              </div>
            )}
            
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
                {/* Dashboard button in header - desktop only */}
                <button
                  onClick={() => {
                    setView('dashboard');
                    setDashboardSubView('panel');
                  }}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'text-gray-300 hover:text-white hover:bg-white/5' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-sm'
                  }`}
                >
                  <LayoutDashboard size={16} className="text-orange-500" />
                  <span>Dashboard</span>
                </button>

                {/* User menu container */}
                <div className="relative" ref={userMenuRef}>
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    aria-label="User Menu"
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="menu"
                    className={`flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-full border transition-all hover:bg-orange-600/5 hover:border-orange-500/40 cursor-pointer ${
                      isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                    }`}
                  >
                    <img src={user.photoURL || ''} alt="" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full shrink-0 object-cover" />
                    <span className="text-xs sm:text-sm font-semibold truncate max-w-[100px] sm:max-w-[150px] hidden sm:inline-block">
                      {user.displayName || (currentLang === 'pt' ? 'Explorador' : currentLang === 'es' ? 'Explorador' : 'Explorer')}
                    </span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 shrink-0 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute right-0 mt-2 w-72 rounded-2xl border p-4 shadow-xl z-50 text-left ${
                          isDarkMode 
                            ? 'bg-[#0d0d0d] border-zinc-800/80 text-white shadow-black/80' 
                            : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/50'
                        }`}
                      >
                        {/* User Info Header */}
                        <div className="flex items-center gap-3 pb-3 mb-3 border-b border-white/5 dark:border-white/5 border-slate-100">
                          <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold truncate">
                              {user.displayName || (currentLang === 'pt' ? 'Explorador' : currentLang === 'es' ? 'Explorador' : 'Explorer')}
                            </h4>
                            <p className="text-xs text-gray-400 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        {/* Dropdown Options */}
                        <div className="space-y-1">
                          {/* Dashboard */}
                          <button
                            onClick={() => {
                              setView('dashboard');
                              setDashboardSubView('panel');
                              setIsUserMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left cursor-pointer ${
                              isDarkMode ? 'hover:bg-white/5 text-gray-200 hover:text-white' : 'hover:bg-slate-50 text-slate-700 hover:text-slate-950'
                            }`}
                          >
                            <LayoutDashboard size={16} className="text-orange-500" />
                            <span>Dashboard</span>
                          </button>

                          {/* Configurações */}
                          <button
                            onClick={() => {
                              setView('dashboard');
                              setDashboardSubView('settings');
                              setIsUserMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left cursor-pointer ${
                              isDarkMode ? 'hover:bg-white/5 text-gray-200 hover:text-white' : 'hover:bg-slate-50 text-slate-700 hover:text-slate-950'
                            }`}
                          >
                            <Settings size={16} className="text-orange-500" />
                            <span>
                              {currentLang === 'pt' ? 'Configurações' : currentLang === 'es' ? 'Configuración' : 'Settings'}
                            </span>
                          </button>

                          {/* Plano e assinatura */}
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              setIsBillingModalOpen(true);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left cursor-pointer ${
                              isDarkMode ? 'hover:bg-white/5 text-gray-200 hover:text-white' : 'hover:bg-slate-50 text-slate-700 hover:text-slate-950'
                            }`}
                          >
                            <CreditCard size={16} className="text-orange-500" />
                            <span>
                              {currentLang === 'pt' ? 'Plano e assinatura' : currentLang === 'es' ? 'Plan y facturación' : 'Plan and Billing'}
                            </span>
                          </button>

                          {/* Sair */}
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              signOut();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors text-left text-red-500 hover:bg-red-500/10 mt-2 border-t border-white/5 dark:border-white/5 border-slate-100 pt-3 cursor-pointer"
                          >
                            <LogOut size={16} />
                            <span>
                              {currentLang === 'pt' ? 'Sair' : currentLang === 'es' ? 'Cerrar sesión' : 'Sign Out'}
                            </span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Login */}
                <button 
                  onClick={() => setShowLoginModal(true)} 
                  className={`text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer px-3 py-2 rounded-xl ${
                    isDarkMode ? 'text-gray-300 hover:text-white' : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  {currentLang === 'pt' ? 'Login' : currentLang === 'es' ? 'Iniciar sesión' : 'Login'}
                </button>
                {/* Começar agora */}
                <Button 
                  onClick={() => setShowLoginModal(true)} 
                  className="px-3 sm:px-5 py-2 text-xs sm:text-sm font-bold shadow-md"
                >
                  {currentLang === 'pt' ? 'Começar agora' : currentLang === 'es' ? 'Empezar' : 'Get Started'}
                </Button>
              </div>
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
                          onClick={() => { setAuthMethod('login'); setAuthError(''); }}
                          isDarkMode={isDarkMode}
                          disabled={authLoading}
                        >
                          <Mail className="w-5 h-5 mr-3 shrink-0 text-orange-500" />
                          {t.continueEmail}
                        </Button>
                      </div>

                      <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                        {currentLang === 'pt' ? (
                          <>
                            Ao continuar, você concorda com os{' '}
                            <button
                              type="button"
                              onClick={() => {
                                setView('terms');
                                setShowLoginModal(false);
                              }}
                              className="text-orange-500 hover:underline font-semibold cursor-pointer"
                            >
                              Termos de Uso
                            </button>{' '}
                            e declara ter lido a{' '}
                            <button
                              type="button"
                              onClick={() => {
                                setView('privacy-policy');
                                setShowLoginModal(false);
                              }}
                              className="text-orange-500 hover:underline font-semibold cursor-pointer"
                            >
                              Política de Privacidade
                            </button>
                            .
                          </>
                        ) : currentLang === 'es' ? (
                          <>
                            Al continuar, aceptas los{' '}
                            <button
                              type="button"
                              onClick={() => {
                                setView('terms');
                                setShowLoginModal(false);
                              }}
                              className="text-orange-500 hover:underline font-semibold cursor-pointer"
                            >
                              Términos de Uso
                            </button>{' '}
                            y confirmas que has leído la{' '}
                            <button
                              type="button"
                              onClick={() => {
                                setView('privacy-policy');
                                setShowLoginModal(false);
                              }}
                              className="text-orange-500 hover:underline font-semibold cursor-pointer"
                            >
                              Política de Privacidad
                            </button>
                            .
                          </>
                        ) : (
                          <>
                            By continuing, you agree to the{' '}
                            <button
                              type="button"
                              onClick={() => {
                                setView('terms');
                                setShowLoginModal(false);
                              }}
                              className="text-orange-500 hover:underline font-semibold cursor-pointer"
                            >
                              Terms of Use
                            </button>{' '}
                            and acknowledge that you have read the{' '}
                            <button
                              type="button"
                              onClick={() => {
                                setView('privacy-policy');
                                setShowLoginModal(false);
                              }}
                              className="text-orange-500 hover:underline font-semibold cursor-pointer"
                            >
                              Privacy Policy
                            </button>
                            .
                          </>
                        )}
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

      {view === 'privacy-policy' ? (
        <main className="pt-20 min-h-screen relative overflow-hidden">
          <PrivacyPolicy
            isDarkMode={isDarkMode}
            currentLang={currentLang}
            onBack={() => setView(user ? 'dashboard' : 'landing')}
          />
        </main>
      ) : view === 'terms' ? (
        <main className="pt-20 min-h-screen relative overflow-hidden">
          <TermsOfUse
            isDarkMode={isDarkMode}
            currentLang={currentLang}
            onBack={() => setView(user ? 'dashboard' : 'landing')}
          />
        </main>
      ) : view === 'landing' || (user && !user.emailVerified) ? (
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
            <Pricing t={t} isDarkMode={isDarkMode} lang={currentLang} />
          </div>

          <FAQ lang={currentLang} isDarkMode={isDarkMode} />
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
            fixed md:relative z-50 md:z-auto h-[calc(100vh-80px)] border-r space-y-2 transition-all duration-300 ease-in-out
            ${isSidebarCollapsed ? 'w-64 md:w-20 p-5 md:p-4' : 'w-64 p-5 md:p-6'}
            ${isDarkMode ? 'translate-x-0 bg-[#0a0a0a] border-white/5' : 'translate-x-0 bg-white/90 border-slate-200 shadow-sm'}
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            {/* Sidebar Title & Collapse Toggle Button */}
            <div className="flex items-center justify-between gap-2 mb-4 mt-2">
              <span className={`text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                isSidebarCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden' : 'opacity-100'
              } ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                {t.menu}
              </span>
              <button 
                onClick={() => {
                  const nextVal = !isSidebarCollapsed;
                  setIsSidebarCollapsed(nextVal);
                  localStorage.setItem('astra_sidebar_collapsed', String(nextVal));
                }}
                aria-label={isSidebarCollapsed 
                  ? (currentLang === 'pt' ? 'Expandir menu lateral' : currentLang === 'es' ? 'Expandir menú lateral' : 'Expand sidebar') 
                  : (currentLang === 'pt' ? 'Recolher menu lateral' : currentLang === 'es' ? 'Contraer menú lateral' : 'Collapse sidebar')
                }
                title={isSidebarCollapsed 
                  ? (currentLang === 'pt' ? 'Expandir' : currentLang === 'es' ? 'Expandir' : 'Expand') 
                  : (currentLang === 'pt' ? 'Recolher' : currentLang === 'es' ? 'Contraer' : 'Collapse')
                }
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isSidebarCollapsed ? 'w-full md:w-10' : 'w-10'
                } ${
                  isDarkMode 
                    ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white border-transparent hover:border-zinc-750' 
                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900 border-transparent hover:border-slate-200'
                }`}
              >
                {isSidebarCollapsed ? (
                  <>
                    <PanelLeftOpen size={18} className="hidden md:block" />
                    <PanelLeftClose size={18} className="block md:hidden" />
                  </>
                ) : (
                  <PanelLeftClose size={18} />
                )}
              </button>
            </div>

            {/* Dashboard Button */}
            <button 
              onClick={() => {
                setDashboardSubView('panel');
                setIsSidebarOpen(false);
              }}
              className={`relative group w-full flex items-center rounded-xl font-medium transition-all cursor-pointer ${
                isSidebarCollapsed 
                  ? 'gap-3 px-4 py-3 md:justify-center md:px-0 md:gap-0' 
                  : 'gap-3 px-4 py-3'
              } ${
                dashboardSubView === 'panel' 
                  ? isDarkMode ? 'bg-orange-600/10 text-orange-500 font-bold border border-orange-500/10 shadow-md shadow-orange-600/5' : 'bg-orange-50 text-orange-700 border border-orange-100 shadow-sm font-bold'
                  : isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-950 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard size={20} className="shrink-0" />
              <span className={`transition-all duration-300 ${isSidebarCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden whitespace-nowrap' : 'opacity-100'}`}>
                {t.dashboard}
              </span>

              {isSidebarCollapsed && (
                <div className={`hidden md:block absolute left-full ml-3 px-3 py-1.5 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-[60] shadow-lg border ${
                  isDarkMode 
                    ? 'bg-[#121215] text-white border-zinc-800' 
                    : 'bg-white text-slate-950 border-slate-200 shadow-slate-900/10'
                }`}>
                  {t.dashboard}
                </div>
              )}
            </button>

            {/* History Button */}
            <button 
              onClick={() => {
                setDashboardSubView('history');
                setIsSidebarOpen(false);
              }}
              className={`relative group w-full flex items-center rounded-xl font-medium transition-all cursor-pointer ${
                isSidebarCollapsed 
                  ? 'gap-3 px-4 py-3 md:justify-center md:px-0 md:gap-0' 
                  : 'gap-3 px-4 py-3'
              } ${
                dashboardSubView === 'history' 
                  ? isDarkMode ? 'bg-orange-600/10 text-orange-500 font-bold border border-orange-500/10 shadow-md shadow-orange-600/5' : 'bg-orange-50 text-orange-700 border border-orange-100 shadow-sm font-bold'
                  : isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-950 hover:bg-slate-100'
              }`}
            >
              <History size={20} className="shrink-0" />
              <span className={`transition-all duration-300 ${isSidebarCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden whitespace-nowrap' : 'opacity-100'}`}>
                {t.history}
              </span>

              {isSidebarCollapsed && (
                <div className={`hidden md:block absolute left-full ml-3 px-3 py-1.5 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-[60] shadow-lg border ${
                  isDarkMode 
                    ? 'bg-[#121215] text-white border-zinc-800' 
                    : 'bg-white text-slate-950 border-slate-200 shadow-slate-900/10'
                }`}>
                  {t.history}
                </div>
              )}
            </button>

            {/* Settings Button */}
            <button 
              onClick={() => {
                setDashboardSubView('settings');
                setIsSidebarOpen(false);
              }}
              className={`relative group w-full flex items-center rounded-xl font-medium transition-all cursor-pointer ${
                isSidebarCollapsed 
                  ? 'gap-3 px-4 py-3 md:justify-center md:px-0 md:gap-0' 
                  : 'gap-3 px-4 py-3'
              } ${
                dashboardSubView === 'settings'
                  ? isDarkMode ? 'bg-orange-600/10 text-orange-500 font-bold border border-orange-500/10 shadow-md shadow-orange-600/5' : 'bg-orange-50 text-orange-700 border border-orange-100 shadow-sm font-bold'
                  : isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-950 hover:bg-slate-100'
              }`}
            >
              <Settings size={20} className="shrink-0" />
              <span className={`transition-all duration-300 ${isSidebarCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden whitespace-nowrap' : 'opacity-100'}`}>
                {t.settings}
              </span>

              {isSidebarCollapsed && (
                <div className={`hidden md:block absolute left-full ml-3 px-3 py-1.5 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-[60] shadow-lg border ${
                  isDarkMode 
                    ? 'bg-[#121215] text-white border-zinc-800' 
                    : 'bg-white text-slate-950 border-slate-200 shadow-slate-900/10'
                }`}>
                  {t.settings}
                </div>
              )}
            </button>

            {/* New Features Button */}
            <button 
              onClick={() => setIsFeaturesModalOpen(true)}
              className={`relative group w-full flex items-center justify-between rounded-xl font-medium transition-all cursor-pointer ${
                isSidebarCollapsed 
                  ? 'px-4 py-3 md:justify-center md:px-0' 
                  : 'px-4 py-3'
              } ${
                isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-950 hover:bg-slate-100'
              }`}
            >
              <div className={`flex items-center ${isSidebarCollapsed ? 'gap-3 md:gap-0' : 'gap-3'}`}>
                <Sparkles size={20} className="text-orange-500 shrink-0" />
                <span className={`text-left transition-all duration-300 ${isSidebarCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden whitespace-nowrap' : 'opacity-100'}`}>
                  {t.newFeatures}
                </span>
              </div>
              <span className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-orange-600/10 text-orange-500 border border-orange-500/20 rounded-full shrink-0 transition-all duration-300 ${
                isSidebarCollapsed ? 'md:opacity-0 md:w-0 md:p-0 md:border-0 md:overflow-hidden' : 'opacity-100'
              }`}>
                {t.soon}
              </span>

              {isSidebarCollapsed && (
                <div className={`hidden md:block absolute left-full ml-3 px-3 py-1.5 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-[60] shadow-lg border ${
                  isDarkMode 
                    ? 'bg-[#121215] text-white border-zinc-800' 
                    : 'bg-white text-slate-950 border-slate-200 shadow-slate-900/10'
                }`}>
                  {t.newFeatures}
                </div>
              )}
            </button>
          </aside>

          <section id="main-scrollable-section" className={`flex-1 p-4 sm:p-8 overflow-y-auto ${isDarkMode ? '' : 'bg-transparent'}`}>
            <div className="max-w-[1440px] mx-auto w-full space-y-8">
              {dashboardSubView === 'settings' ? (
                <SettingsView 
                  user={user}
                  currentLang={currentLang}
                  setCurrentLang={setCurrentLang}
                  isDarkMode={isDarkMode}
                  setIsDarkMode={setIsDarkMode}
                  signOut={signOut}
                  preferences={preferences}
                  onUpdatePreference={handleUpdatePreference}
                  onOpenPrivacyPolicy={() => setView('privacy-policy')}
                  onOpenTermsOfUse={() => setView('terms')}
                  onOpenCookiePrefs={() => setForceCookiePrefs(true)}
                />
              ) : dashboardSubView === 'history' ? (
                <HistoryView 
                  history={history}
                  isDarkMode={isDarkMode}
                  t={t}
                  currentLang={currentLang}
                  onOpenItem={(item) => {
                    setCurrentResult(item);
                    setActiveTab(preferences.defaultStudyFormat);
                    setDashboardSubView('panel');
                  }}
                  setConfirmModalType={setConfirmModalType}
                  setIsConfirmModalOpen={setIsConfirmModalOpen}
                  setItemToDelete={setItemToDelete}
                  activeMenuId={activeMenuId}
                  setActiveMenuId={setActiveMenuId}
                  setDashboardSubView={setDashboardSubView}
                  onGoToPanel={handleGoToPanelAndFocus}
                />
              ) : (
                <>
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <h1 className="text-2xl sm:text-3xl font-bold">
                      {t.welcomeBack.replace("{name}", displayName)}
                    </h1>
                    <p className={`text-sm sm:text-base italic ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>{t.readyAnalyze}</p>
                  </motion.div>

                  {/* Compact Command Bar */}
                  <div className={`border p-6 sm:p-8 rounded-3xl shadow-xl transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-[#0B0C10] border-zinc-800/80 shadow-black/40' 
                      : 'bg-white border-slate-200 shadow-slate-100/50'
                  }`}>
                    <div className="flex flex-col gap-6 w-full">
                      
                      {/* Central Study Source Block */}
                      <div className="text-center max-w-2xl mx-auto space-y-3 mb-2">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                          {currentLang === 'pt' ? "Comece com uma fonte de estudo" :
                           currentLang === 'es' ? "Comienza con una fuente de estudio" :
                           "Start with a study source"}
                        </h2>
                        <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                          {currentLang === 'pt' ? "Cole uma URL do YouTube ou envie um documento para o Astra transformar o conteúdo em resumo, tutor, quiz e mapa mental." :
                           currentLang === 'es' ? "Pega una URL de YouTube o sube un documento para que Astra transforme el contenido en resumen, tutor, cuestionario y mapa mental." :
                           "Paste a YouTube URL or upload a document and let Astra turn the content into summary, tutor, quiz, and mind map."}
                        </p>
                      </div>

                      {/* Source Selector */}
                      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                        {/* YouTube tab */}
                        <button
                          onClick={() => setSelectedSourceType('youtube')}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border cursor-pointer ${
                            selectedSourceType === 'youtube'
                              ? 'bg-orange-500/10 border-orange-500 text-orange-500 shadow-md shadow-orange-500/5'
                              : isDarkMode
                                ? 'bg-[#030304]/60 border-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                          }`}
                        >
                          <Youtube size={16} />
                          <span>YouTube</span>
                        </button>

                        {/* Documento tab */}
                        <button
                          onClick={() => setSelectedSourceType('document')}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border cursor-pointer ${
                            selectedSourceType === 'document'
                              ? 'bg-orange-500/10 border-orange-500 text-orange-500 shadow-md shadow-orange-500/5'
                              : isDarkMode
                                ? 'bg-[#030304]/60 border-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                          }`}
                        >
                          <FileText size={16} />
                          <span>{currentLang === 'pt' ? 'Documento' : currentLang === 'es' ? 'Documento' : 'Document'}</span>
                        </button>

                        {/* Link de site (disabled with badge Em breve) */}
                        <button
                          onClick={() => setSelectedSourceType('website')}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border cursor-pointer ${
                            selectedSourceType === 'website'
                              ? 'bg-orange-500/10 border-orange-500 text-orange-500 shadow-md shadow-orange-500/5'
                              : isDarkMode
                                ? 'bg-[#030304]/20 border-zinc-800/40 text-zinc-600 hover:text-zinc-500'
                                : 'bg-slate-50/50 border-slate-100 text-slate-400 hover:text-slate-500'
                          }`}
                        >
                          <Globe size={16} />
                          <span>{currentLang === 'pt' ? 'Link de site' : currentLang === 'es' ? 'Enlace de sitio' : 'Website link'}</span>
                          <span className="px-1.5 py-0.5 text-[8px] font-extrabold bg-orange-500/15 text-orange-500 rounded-full border border-orange-500/20 tracking-wider">
                            {currentLang === 'pt' ? 'Em breve' : currentLang === 'es' ? 'Em breve' : 'Soon'}
                          </span>
                        </button>

                        {/* Google Drive (disabled with badge Em breve) */}
                        <button
                          onClick={() => setSelectedSourceType('drive')}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border cursor-pointer ${
                            selectedSourceType === 'drive'
                              ? 'bg-orange-500/10 border-orange-500 text-orange-500 shadow-md shadow-orange-500/5'
                              : isDarkMode
                                ? 'bg-[#030304]/20 border-zinc-800/40 text-zinc-600 hover:text-zinc-500'
                                : 'bg-slate-50/50 border-slate-100 text-slate-400 hover:text-slate-500'
                          }`}
                        >
                          <FolderOpen size={16} />
                          <span>Google Drive</span>
                          <span className="px-1.5 py-0.5 text-[8px] font-extrabold bg-orange-500/15 text-orange-500 rounded-full border border-orange-500/20 tracking-wider">
                            {currentLang === 'pt' ? 'Em breve' : currentLang === 'es' ? 'Em breve' : 'Soon'}
                          </span>
                        </button>
                      </div>

                      {/* Active Source UI Area */}
                      <div className="w-full mt-2">
                        {/* YouTube Source UI */}
                        {selectedSourceType === 'youtube' && (
                          <div className="flex flex-col sm:flex-row items-stretch gap-3 text-left">
                            <div className="relative flex-1 flex flex-col gap-1.5 w-full">
                              <div className="relative flex items-center">
                                <div className="absolute left-4 shrink-0 flex items-center">
                                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837z" fill="#FF0000"/>
                                    <polygon points="9.545 15.568 15.818 12 9.545 8.432 9.545 15.568" fill="#FFFFFF"/>
                                  </svg>
                                </div>
                                <input 
                                  ref={urlInputRef}
                                  type="text" 
                                  value={videoUrl}
                                  onChange={(e) => setVideoUrl(e.target.value)}
                                  placeholder={
                                    currentLang === 'pt' ? "Cole aqui a URL do YouTube…" :
                                    currentLang === 'es' ? "Pega aquí la URL de YouTube…" :
                                    "Paste the YouTube URL here…"
                                  } 
                                  className={`w-full rounded-xl pl-12 pr-4 h-12 outline-none transition-all text-sm sm:text-base border ${
                                    isDarkMode 
                                      ? 'bg-[#030304]/80 border-zinc-800/80 text-white placeholder-zinc-600 focus:border-orange-500/85 focus:ring-4 focus:ring-orange-500/5' 
                                      : 'bg-[#f8fafc] border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/5'
                                  }`}
                                />
                              </div>
                              <span className={`text-[11px] font-medium pl-2 ${isDarkMode ? 'text-zinc-600' : 'text-slate-400'}`}>
                                {currentLang === 'pt' ? "Exemplo: https://youtube.com/watch?v=..." :
                                 currentLang === 'es' ? "Ejemplo: https://youtube.com/watch?v=..." :
                                 "Example: https://youtube.com/watch?v=..."}
                              </span>
                            </div>
                            <Button 
                              onClick={handleAnalyze} 
                              disabled={isAnalyzing || !videoUrl} 
                              className="justify-center h-12 px-6 text-sm font-extrabold rounded-xl shadow-md transition-all duration-300 shrink-0 cursor-pointer"
                            >
                              {isAnalyzing ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 size={16} className="animate-spin" /> {analysisStatus}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 group">
                                  <span>{t.analyze}</span>
                                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                                </span>
                              )}
                            </Button>
                          </div>
                        )}

                        {/* Document Source UI */}
                        {selectedSourceType === 'document' && (
                          <div className="space-y-4">
                            {!selectedFile ? (
                              <div
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setIsDragging(false);
                                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                    handleDocumentSelect(e.dataTransfer.files[0]);
                                  }
                                }}
                                onClick={() => document.getElementById('document-upload-input')?.click()}
                                className={`border-2 border-dashed p-8 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group ${
                                  isDragging
                                    ? 'border-orange-500 bg-orange-500/5'
                                    : isDarkMode
                                      ? 'border-zinc-800 hover:border-orange-500/50 bg-[#030304]/40 hover:bg-[#030304]/80'
                                      : 'border-slate-200 hover:border-orange-400 bg-slate-50/50 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="file"
                                  className="hidden"
                                  id="document-upload-input"
                                  accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.webp"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleDocumentSelect(e.target.files[0]);
                                    }
                                  }}
                                />
                                <div className={`p-3 rounded-full transition-colors ${
                                  isDarkMode 
                                    ? 'bg-zinc-800 text-zinc-400 group-hover:bg-orange-500/10 group-hover:text-orange-500' 
                                    : 'bg-slate-100 text-slate-500 group-hover:bg-orange-50 group-hover:text-orange-600'
                                }`}>
                                  <FileUp size={24} className="animate-bounce" style={{ animationDuration: '3s' }} />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm font-bold">
                                    {currentLang === 'pt' ? "Envie ou solte seu arquivo aqui" :
                                     currentLang === 'es' ? "Sube o suelta tu archivo aquí" :
                                     "Upload or drop your file here"}
                                  </p>
                                  <p className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                    {currentLang === 'pt' ? "PDF, TXT, DOCX ou imagem" :
                                     currentLang === 'es' ? "PDF, TXT, DOCX o imagen" :
                                     "PDF, TXT, DOCX, or image"}
                                  </p>
                                </div>
                                <p className={`text-[10px] max-w-lg mt-2 ${isDarkMode ? 'text-zinc-600' : 'text-slate-400'}`}>
                                  {currentLang === 'pt' ? "Arquivos enviados são processados temporariamente. O Astra salva apenas os resultados gerados." :
                                   currentLang === 'es' ? "Los archivos enviados se procesan temporalmente. Astra guarda solo los resultados generados." :
                                   "Uploaded files are processed temporarily. Astra saves only the generated results."}
                                </p>
                                <button className="mt-2 text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1">
                                  <span>{currentLang === 'pt' ? "Enviar arquivo" : currentLang === 'es' ? "Subir archivo" : "Upload file"}</span>
                                  <ArrowRight size={12} />
                                </button>
                              </div>
                            ) : (
                              <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left ${
                                isDarkMode 
                                  ? 'bg-[#030304]/80 border-zinc-800/80' 
                                  : 'bg-slate-50 border-slate-200'
                              }`}>
                                <div className="flex items-center gap-3">
                                  <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                                    <FileText size={24} />
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="text-sm font-bold truncate pr-4">{selectedFile.name}</p>
                                    <p className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.name.split('.').pop()?.toUpperCase()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                  <button
                                    onClick={() => setSelectedFile(null)}
                                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                                      isDarkMode ? 'hover:bg-white/5 text-zinc-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                                    }`}
                                  >
                                    <X size={20} />
                                  </button>
                                  <Button
                                    onClick={handleAnalyzeDocument}
                                    disabled={isAnalyzing}
                                    className="h-10 px-5 text-xs font-extrabold rounded-xl cursor-pointer"
                                  >
                                    {isAnalyzing ? (
                                      <span className="flex items-center gap-2">
                                        <Loader2 size={14} className="animate-spin" /> {analysisStatus}
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1">
                                        <span>{currentLang === 'pt' ? "Analisar Documento" : currentLang === 'es' ? "Analizar Documento" : "Analyze Document"}</span>
                                        <ArrowRight size={14} />
                                      </span>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Website Link Placeholder UI */}
                        {selectedSourceType === 'website' && (
                          <div className={`p-6 sm:p-8 rounded-2xl border text-center flex flex-col items-center justify-center gap-3 transition-all ${
                            isDarkMode 
                              ? 'bg-[#030304]/40 border-zinc-800/40' 
                              : 'bg-slate-50 border-slate-100'
                          }`}>
                            <div className={`p-3.5 rounded-full ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                              <Globe size={28} />
                            </div>
                            <h3 className="text-sm sm:text-base font-bold">
                              {currentLang === 'pt' ? "Fase 2: Link de Site" :
                               currentLang === 'es' ? "Fase 2: Enlace de Sitio" :
                               "Phase 2: Website Link"}
                            </h3>
                            <p className={`text-xs sm:text-sm max-w-md ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                              {currentLang === 'pt' ? "Link de site estará disponível em breve." :
                               currentLang === 'es' ? "Los enlaces de sitios estarán disponibles pronto." :
                               "Website links will be available soon."}
                            </p>
                          </div>
                        )}

                        {/* Google Drive Placeholder UI */}
                        {selectedSourceType === 'drive' && (
                          <div className={`p-6 sm:p-8 rounded-2xl border text-center flex flex-col items-center justify-center gap-3 transition-all ${
                            isDarkMode 
                              ? 'bg-[#030304]/40 border-zinc-800/40' 
                              : 'bg-slate-50 border-slate-100'
                          }`}>
                            <div className={`p-3.5 rounded-full ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                              <FolderOpen size={28} />
                            </div>
                            <h3 className="text-sm sm:text-base font-bold">
                              {currentLang === 'pt' ? "Fase 3: Google Drive" :
                               currentLang === 'es' ? "Fase 3: Google Drive" :
                               "Phase 3: Google Drive"}
                            </h3>
                            <p className={`text-xs sm:text-sm max-w-md ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                              {currentLang === 'pt' ? "Google Drive estará disponível em breve." :
                               currentLang === 'es' ? "Google Drive estará disponible pronto." :
                               "Google Drive will be available soon."}
                            </p>
                          </div>
                        )}
                      </div>

                  {/* Row 2: Features cards with standard elegant Astra UI */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                    {([
                      { id: 'summary', label: t.summary, icon: FileText },
                      { id: 'tutor', label: t.tutor, icon: GraduationCap },
                      { id: 'quiz', label: t.quiz, icon: Puzzle },
                      { id: 'mindmap', label: t.mindmap, icon: BrainCircuit }
                    ] as const).map((btn) => {
                      const hasResult = !!currentResult;
                      const isActive = activeTab === btn.id;
                      
                      let cardClass = "";
                      let iconColor = "";
                      
                      if (!hasResult) {
                        if (isDarkMode) {
                          cardClass = "bg-[#0B0C10]/40 border-white/5 text-zinc-400 cursor-not-allowed opacity-60";
                          iconColor = "text-zinc-500";
                        } else {
                          cardClass = "bg-slate-50/50 border-slate-200 text-slate-500 cursor-not-allowed opacity-60";
                          iconColor = "text-slate-400";
                        }
                      } else if (isActive) {
                        if (isDarkMode) {
                          cardClass = "bg-gradient-to-r from-[#FF5F1F] to-[#ea580c] border-[#FF5F1F] text-white shadow-[0_0_25px_rgba(255,95,31,0.45)] scale-[1.02] font-bold";
                          iconColor = "text-white animate-pulse";
                        } else {
                          cardClass = "bg-[#FF5F1F] border-[#FF5F1F] text-white shadow-[0_0_15px_rgba(255,95,31,0.25)] scale-[1.02] font-bold";
                          iconColor = "text-white";
                        }
                      } else {
                        if (isDarkMode) {
                          cardClass = "bg-[#0B0C10] border-white/10 text-white shadow-sm hover:border-[#00F5D4]/50 hover:shadow-[0_0_15px_rgba(0,245,212,0.15)] hover:text-white hover:-translate-y-0.5 active:translate-y-0 font-semibold";
                          iconColor = "text-[#FF5F1F] transition-colors duration-300 group-hover:text-[#00F5D4]";
                        } else {
                          cardClass = "bg-white border-slate-200 text-slate-700 shadow-sm hover:border-[#FF5F1F]/50 hover:shadow-[0_0_15px_rgba(255,95,31,0.15)] hover:text-[#FF5F1F] hover:-translate-y-0.5 active:translate-y-0 font-semibold";
                          iconColor = "text-[#FF5F1F]";
                        }
                      }

                      const IconComponent = btn.icon;

                      return (
                        <button
                          key={btn.id}
                          onClick={() => {
                            if (hasResult) {
                              setActiveTab(btn.id);
                            } else {
                              showToast(
                                currentLang === 'pt' ? "Cole uma URL e clique em Analisar primeiro." :
                                currentLang === 'es' ? "Pega uma URL e haz clic en Analizar primero." :
                                "Paste a URL and click Analyze first."
                              );
                            }
                          }}
                          disabled={false}
                          aria-label={btn.label}
                          className={`flex flex-col items-center justify-center text-center gap-3.5 p-5 rounded-2xl border text-xs sm:text-sm tracking-widest uppercase transition-all duration-300 relative group overflow-hidden select-none min-h-[96px] md:min-h-[105px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F1F] ${cardClass}`}
                        >
                          <IconComponent size={24} className={`${iconColor} shrink-0 transition-all duration-300 ${hasResult ? 'group-hover:scale-110' : ''}`} />
                          <span className="truncate w-full font-bold">{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
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
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      showInternalTabs={false}
                      preferences={preferences}
                    />
                  </motion.div>
                ) : (
                  <div className="space-y-8">
                    {/* Pre-analysis empty state card */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`border-2 border-dashed p-10 sm:p-14 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-6 transition-all duration-300 ${
                        isDarkMode 
                          ? 'bg-[#0c0c0e]/60 border-orange-500/20 text-zinc-300' 
                          : 'bg-white border-orange-500/30 text-slate-700 shadow-sm shadow-slate-100/50'
                      }`}
                    >
                      <div className="w-20 h-20 rounded-3xl bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-[0_0_25px_rgba(234,88,12,0.15)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Sparkles size={36} className="relative z-10 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="space-y-3 max-w-lg">
                        <h3 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
                          {currentLang === 'pt' ? 'Comece analisando um vídeo' : currentLang === 'es' ? 'Comienza analizando un video' : 'Start by analyzing a video'}
                        </h3>
                        <p className={`text-sm sm:text-base leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                          {currentLang === 'pt' ? 'Cole uma URL do YouTube, escolha uma funcionalidade e deixe o Astra transformar o conteúdo em uma experiência de estudo.' : 
                           currentLang === 'es' ? 'Pega una URL de YouTube, elige una funcionalidad y deja que Astra transforme el contenido en una experiencia de estudio.' : 
                           'Paste a YouTube URL, choose a feature, and let Astra turn the content into a study experience.'}
                        </p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 w-full max-w-xs sm:max-w-md justify-center">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={focusUrlInput}
                          className="w-full sm:w-auto px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all duration-300"
                        >
                          <Youtube size={16} />
                          <span>
                            {currentLang === 'pt' ? 'Colar URL' : currentLang === 'es' ? 'Pegar URL' : 'Paste URL'}
                          </span>
                        </motion.button>
                        
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setDashboardSubView('history')}
                          className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 border ${
                            isDarkMode 
                              ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300' 
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'
                          }`}
                        >
                          <History size={16} />
                          <span>
                            {currentLang === 'pt' ? 'Ver histórico' : currentLang === 'es' ? 'Ver historial' : 'View history'}
                          </span>
                        </motion.button>
                      </div>
                    </motion.div>
                  </div>
              )}
              </AnimatePresence>
                </>
              )}
            </div>
          </section>
        </main>
      )}

      {/* Modal for Novas Features (Roadmap) */}
      <AnimatePresence>
        {isFeaturesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFeaturesModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-2xl rounded-[2rem] border p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh] z-10 transition-colors ${
                isDarkMode 
                  ? 'bg-[#0c0d12] border-zinc-800 text-white shadow-black' 
                  : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/50'
              }`}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsFeaturesModalOpen(false)}
                className={`absolute top-6 right-6 p-2 rounded-xl transition-colors cursor-pointer ${
                  isDarkMode ? 'hover:bg-zinc-900 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                }`}
              >
                <X size={20} />
              </button>

              {/* Title & Description */}
              <div className="flex items-start gap-4 mb-2 pr-8">
                <div className="p-3 bg-orange-600/10 rounded-2xl text-orange-500 shrink-0">
                  <Sparkles size={24} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black">{t.newFeaturesTitle}</h2>
                  <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                    {t.newFeaturesSub}
                  </p>
                </div>
              </div>

              {/* Separation Divider */}
              <div className={`h-px w-full my-6 ${isDarkMode ? 'bg-zinc-800/80' : 'bg-slate-100'}`} />

              {/* List of features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(() => {
                  const items = {
                    pt: [
                      {
                        icon: <Edit2 size={16} />,
                        title: "Editing",
                        desc: "Edite textos e reorganize os nós do mapa mental.",
                        badge: "Em breve",
                        badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20"
                      },
                      {
                        icon: <Layout size={16} />,
                        title: "Advanced Branching",
                        desc: "Expanda e recolha ramificações avançadas.",
                        badge: "Planejado",
                        badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      },
                      {
                        icon: <Download size={16} />,
                        title: "Export as Image",
                        desc: "Exporte o mapa como imagem em alta qualidade.",
                        badge: "Planejado",
                        badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      },
                      {
                        icon: <Save size={16} />,
                        title: "Save Custom Maps",
                        desc: "Salve mapas personalizados na sua conta.",
                        badge: "Pro Preview",
                        badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      },
                      {
                        icon: <Zap size={16} />,
                        title: "AI Map Expansion",
                        desc: "Expanda tópicos automaticamente com ajuda da IA.",
                        badge: "Em breve",
                        badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20"
                      }
                    ],
                    en: [
                      {
                        icon: <Edit2 size={16} />,
                        title: "Editing",
                        desc: "Edit text and reorganize mind map nodes.",
                        badge: "Soon",
                        badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20"
                      },
                      {
                        icon: <Layout size={16} />,
                        title: "Advanced Branching",
                        desc: "Expand and collapse advanced branches.",
                        badge: "Planned",
                        badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      },
                      {
                        icon: <Download size={16} />,
                        title: "Export as Image",
                        desc: "Export the map as a high-quality image.",
                        badge: "Planned",
                        badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      },
                      {
                        icon: <Save size={16} />,
                        title: "Save Custom Maps",
                        desc: "Save custom maps to your account.",
                        badge: "Pro Preview",
                        badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      },
                      {
                        icon: <Zap size={16} />,
                        title: "AI Map Expansion",
                        desc: "Automatically expand topics with AI assistance.",
                        badge: "Soon",
                        badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20"
                      }
                    ],
                    es: [
                      {
                        icon: <Edit2 size={16} />,
                        title: "Editing",
                        desc: "Edite textos y reorganice los nodos del mapa mental.",
                        badge: "Muy pronto",
                        badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20"
                      },
                      {
                        icon: <Layout size={16} />,
                        title: "Advanced Branching",
                        desc: "Expanda y contraiga ramas avanzadas.",
                        badge: "Planeado",
                        badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      },
                      {
                        icon: <Download size={16} />,
                        title: "Export as Image",
                        desc: "Exporte el mapa como una imagen de alta calidad.",
                        badge: "Planeado",
                        badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      },
                      {
                        icon: <Save size={16} />,
                        title: "Save Custom Maps",
                        desc: "Guarde mapas personalizados en su cuenta.",
                        badge: "Pro Preview",
                        badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      },
                      {
                        icon: <Zap size={16} />,
                        title: "AI Map Expansion",
                        desc: "Expanda temas automáticamente con ayuda de la IA.",
                        badge: "Muy pronto",
                        badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20"
                      }
                    ]
                  };

                  const currentFeatures = items[currentLang] || items.en;

                  return currentFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                        isDarkMode 
                          ? 'bg-[#12131a]/50 border-zinc-800/80 hover:bg-[#12131a] hover:border-orange-500/30' 
                          : 'bg-[#fafbfc] border-slate-200 hover:bg-white hover:shadow-lg hover:shadow-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="p-2 bg-orange-600/10 rounded-xl text-orange-500">
                          {feat.icon}
                        </div>
                        <span className={`px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-widest border rounded-full ${feat.badgeColor}`}>
                          {feat.badge}
                        </span>
                      </div>
                      <div className="space-y-1 mt-1">
                        <h4 className="text-sm font-bold tracking-tight">{feat.title}</h4>
                        <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                          {feat.desc}
                        </p>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Join Waitlist Footer */}
              <div className={`mt-8 p-4 rounded-2xl border text-center space-y-3 ${
                isDarkMode ? 'bg-[#0f1115] border-zinc-800/80' : 'bg-slate-50 border-slate-100'
              }`}>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                  {currentLang === 'pt' ? 'Quer acesso antecipado aos recursos Premium?' : currentLang === 'es' ? '¿Quieres acceso anticipado a las funciones Premium?' : 'Want early access to premium features?'}
                </p>
                <button className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-600/20 hover:scale-[1.03] active:scale-95 transition-all cursor-pointer">
                  {currentLang === 'pt' ? 'Entrar na Lista de Espera Pro' : currentLang === 'es' ? 'Unirse a la Lista de Espera Pro' : 'Join Pro Waitlist'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for History Deletion */}
      <AnimatePresence>
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isDeleting) {
                  setIsConfirmModalOpen(false);
                  setItemToDelete(null);
                }
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-md rounded-3xl border p-6 shadow-2xl z-10 transition-colors ${
                isDarkMode 
                  ? 'bg-[#0c0d12] border-zinc-800 text-white shadow-black' 
                  : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/50'
              }`}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-red-600/10 rounded-2xl text-red-500 shrink-0">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">
                    {confirmModalType === 'delete_item' ? t.remove : t.clearHistory}
                  </h3>
                  <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                    {confirmModalType === 'delete_item' 
                      ? t.confirmRemoveVideo 
                      : t.confirmClearHistory}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setIsConfirmModalOpen(false);
                    setItemToDelete(null);
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                  } disabled:opacity-50`}
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={confirmDeleteAction}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : null}
                  {confirmModalType === 'delete_item' ? t.remove : t.clearAll}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Plan & Billing Modal */}
      <AnimatePresence>
        {isBillingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBillingModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-md rounded-3xl border p-6 sm:p-8 shadow-2xl z-10 transition-colors ${
                isDarkMode 
                  ? 'bg-[#0c0d12] border-zinc-800 text-white shadow-black' 
                  : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/50'
              }`}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsBillingModalOpen(false)}
                className={`absolute top-6 right-6 p-2 rounded-xl transition-colors cursor-pointer ${
                  isDarkMode ? 'hover:bg-zinc-900 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                }`}
              >
                <X size={20} />
              </button>

              {/* Title & Description */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3.5 bg-orange-600/10 rounded-2xl text-orange-500 shrink-0">
                  <CreditCard size={28} className="animate-pulse" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black">
                  {currentLang === 'pt' ? 'Plano e Assinatura' : currentLang === 'es' ? 'Plan y Facturación' : 'Plan and Billing'}
                </h2>
                <div className={`text-xs sm:text-sm mt-1 leading-relaxed space-y-3 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                  <p>
                    {currentLang === 'pt' 
                      ? 'O gerenciamento completo de planos e faturamento estará disponível em breve!' 
                      : currentLang === 'es' 
                        ? '¡La gestión completa de suscripciones y facturación estará disponible pronto!' 
                        : 'Full subscription and billing management is coming soon!'}
                  </p>
                  <p>
                    {currentLang === 'pt' 
                      ? 'Você poderá gerenciar seu plano de estudos, atualizar para Premium e visualizar faturas diretamente por aqui.' 
                      : currentLang === 'es' 
                        ? 'Podrás administrar tu plan de estudios, actualizar a Premium y ver facturas directamente desde aquí.' 
                        : 'You will be able to manage your study plan, upgrade to Premium, and view invoices directly from here.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsBillingModalOpen(false)}
                  className="w-full px-6 py-3 text-xs font-semibold rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20 active:scale-95 transition-all text-center cursor-pointer"
                >
                  {currentLang === 'pt' ? 'Entendi' : currentLang === 'es' ? 'Entendido' : 'Got it'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className={`py-12 border-t text-center text-sm transition-colors ${isDarkMode ? 'border-white/5 text-gray-600' : 'border-slate-200 text-slate-500'}`}>
        <p>© 2026 Astra Learning AI — {t.builtWithPrecision}</p>
      </footer>

      {/* Premium Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm"
          >
            <div className={`p-4 rounded-2xl border shadow-xl flex items-center gap-3 backdrop-blur-md ${
              isDarkMode 
                ? 'bg-zinc-950/90 border-orange-500/30 text-white shadow-black/80' 
                : 'bg-white/95 border-orange-200 text-slate-900 shadow-slate-200/50'
            }`}>
              <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500 shrink-0">
                <Sparkles size={16} />
              </div>
              <p className="text-xs sm:text-sm font-semibold pr-4 leading-tight">{toastMessage}</p>
              <button 
                onClick={() => setToastMessage(null)}
                className={`text-zinc-500 hover:text-zinc-400 p-1 rounded-lg transition-colors cursor-pointer ml-auto`}
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CookieConsent
        isDarkMode={isDarkMode}
        currentLang={currentLang}
        forceOpenPreferences={forceCookiePrefs}
        onClosePreferences={() => setForceCookiePrefs(false)}
        onOpenPrivacyPolicy={() => setView('privacy-policy')}
      />
    </div>
  );
}
