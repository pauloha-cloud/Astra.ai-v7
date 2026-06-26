import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Zap, Shield, Rocket, Crown, Clock, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface Props {
  t: any;
  isDarkMode?: boolean;
  lang?: string;
}

// Secure placeholders as requested
export const STRIPE_PRICE_IDS = {
  starter_monthly: "price_starter_monthly",
  starter_annual: "price_starter_annual",
  explorer_monthly: "price_explorer_monthly",
  explorer_annual: "price_explorer_annual",
  pro_monthly: "price_pro_monthly",
  pro_annual: "price_pro_annual",
  power_tutor_monthly: "price_power_tutor_monthly",
  power_tutor_annual: "price_power_tutor_annual",
  addon_100_min: "price_addon_100_min",
  addon_500_min: "price_addon_500_min",
  addon_1000_min: "price_addon_1000_min"
};

const LOCAL_PRICING_LANG = {
  pt: {
    eyebrow: "PLANOS DE PREÇOS",
    title: "INVISTA NA SUA EVOLUÇÃO.",
    subtitle: "Escolha o plano que se aplica à sua jornada de aprendizagem. De exploradores casuais a profissionais de alto desempenho.",
    monthly: "Mensal",
    annual: "Anual",
    saveBadge: "Economize 40%",
    billedAnnually: "Cobrado anualmente",
    mostPopular: "MAIS POPULAR",
    intensiveUse: "USO INTENSIVO",
    secureCloud: "Garantia de segurança com checkout criptografado. Cancele quando quiser.",
    signInToChoose: "Por favor, entre para escolher um plano.",
    planUpdated: "Plano atualizado para",
    usageLimitsTitle: "Limites de Uso",
    moreFeaturesTitle: "Recursos e Benefícios",
    mo: "/mês",
    
    // Add-ons Translation
    addonsTitle: "Minutos Extras do Tutor por Voz",
    addonsSubtitle: "Acabou seu limite mensal? Continue estudando comprando minutos extras para o Voice Tutor.",
    addonsExpiry: "Minutos extras válidos por 90 dias.",
    addonBuyBtn: "Comprar minutos",
    checkoutSoon: "Checkout em breve.",
    
    // Explain text
    explainText: "O Voice Tutor usa minutos mensais porque conversas por voz consomem recursos de IA em tempo real. Isso garante uma experiência estável e sustentável.",

    // Plan Descriptions
    starterDesc: "Para usuários que querem começar a estudar vídeos com IA de forma simples.",
    explorerDesc: "Para estudantes frequentes que querem estudar com mais profundidade, produtividade e experimentar o Tutor por voz.",
    proDesc: "Para professores, criadores, pesquisadores e usuários avançados que precisam de mais minutos de Tutor por voz.",
    powerTutorDesc: "Para usuários intensivos que usam o Tutor por voz diariamente e precisam de uma experiência avançada de aprendizagem.",

    // Plan Targets
    starterTarget: "Para aprendizes casuais",
    explorerTarget: "Para estudantes ativos",
    proTarget: "Para profissionais",
    powerTutorTarget: "Para uso avançado",

    // Plan CTAs
    starterCTA: "Começar com Starter",
    explorerCTA: "Assinar Explorer",
    proCTA: "Obter Pro",
    powerTutorCTA: "Assinar Power Tutor",

    // Packages names
    package100: "+100 min",
    package500: "+500 min",
    package1000: "+1.000 min",
    package100Label: "+100 min de Tutor por Voz",
    package500Label: "+500 min de Tutor por Voz",
    package1000Label: "+1.000 min de Tutor por Voz",

    // Live Limit warnings
    limitReached: "Você atingiu seu limite mensal de Tutor por Voz. Compre minutos extras ou faça upgrade para continuar.",
    limitsLeft: "Você ainda tem {minutes} minutos de Tutor por Voz disponíveis.",

    // Plan features & limits
    starterLimits: [
      "Até 50 análises por mês",
      "Vídeos de até 60 minutos",
      "Sem Voice Tutor"
    ],
    starterFeatures: [
      "Tutor por texto limitado",
      "Resumos com IA",
      "Quizzes de revisão",
      "Mapas mentais básicos",
      "Histórico de estudos limitado"
    ],

    explorerLimits: [
      "Até 150 análises por mês",
      "Prioridade padrão de processamento",
      "30 minutos/mês de Voice Tutor"
    ],
    explorerFeatures: [
      "Tudo do Starter",
      "Tutor por texto incluso",
      "Compra de minutos extras disponível",
      "Mapas mentais avançados",
      "Geração de questões extras",
      "Multi-idioma PT/EN/ES",
      "Histórico de estudos completo"
    ],

    proLimits: [
      "Até 300 análises por mês",
      "Fila de processamento prioritária",
      "300 minutos/mês de Voice Tutor"
    ],
    proFeatures: [
      "Tudo do Explorer",
      "Tutor inteligente por voz ao vivo",
      "Exportações premium",
      "Prioridade de processamento",
      "Sem limite de duração de vídeos",
      "Acesso antecipado a novas funções"
    ],

    powerTutorLimits: [
      "Até 500 análises por mês",
      "Fila máxima de prioridade",
      "1.500 minutos/mês de Voice Tutor"
    ],
    powerTutorFeatures: [
      "Tudo do Pro",
      "Ideal para uso diário intensivo",
      "Indicado para criadores de cursos",
      "Indicado para pesquisadores",
      "Compra de minutos extras disponível"
    ]
  },
  en: {
    eyebrow: "PRICING PLANS",
    title: "INVEST IN YOUR EVOLUTION.",
    subtitle: "Choose the plan that fits your learning journey. From casual explorers to high-performance professionals.",
    monthly: "Monthly",
    annual: "Annual",
    saveBadge: "Save 40%",
    billedAnnually: "Billed annually",
    mostPopular: "MOST POPULAR",
    intensiveUse: "INTENSIVE USE",
    secureCloud: "Secured and encrypted checkout. Cancel anytime.",
    signInToChoose: "Please sign in to choose a plan.",
    planUpdated: "Plan updated to",
    usageLimitsTitle: "Usage Limits",
    moreFeaturesTitle: "Features & Benefits",
    mo: "/mo",

    // Add-ons Translation
    addonsTitle: "Extra Voice Tutor Minutes",
    addonsSubtitle: "Reached your monthly limit? Keep learning by purchasing extra Voice Tutor minutes.",
    addonsExpiry: "Extra minutes are valid for 90 days.",
    addonBuyBtn: "Buy minutes",
    checkoutSoon: "Checkout coming soon.",
    
    // Explain text
    explainText: "Voice Tutor uses monthly minutes because voice conversations consume real-time AI resources. This keeps the experience stable and sustainable.",

    // Plan Descriptions
    starterDesc: "For users who want to start studying videos with AI in a simple way.",
    explorerDesc: "For frequent learners who want deeper study, better productivity, and access to Voice Tutor.",
    proDesc: "For teachers, creators, researchers, and power users who need more Voice Tutor minutes.",
    powerTutorDesc: "For intensive users who use Voice Tutor daily and need an advanced learning experience.",

    // Plan Targets
    starterTarget: "For casual learners",
    explorerTarget: "For active students",
    proTarget: "For professionals",
    powerTutorTarget: "For intensive use",

    // Plan CTAs
    starterCTA: "Start Starter",
    explorerCTA: "Subscribe Explorer",
    proCTA: "Get Pro",
    powerTutorCTA: "Subscribe Power Tutor",

    // Packages names
    package100: "+100 min",
    package500: "+500 min",
    package1000: "+1,000 min",
    package100Label: "+100 Voice Tutor min",
    package500Label: "+500 Voice Tutor min",
    package1000Label: "+1,000 Voice Tutor min",

    // Live Limit warnings
    limitReached: "You have reached your monthly Voice Tutor limit. Buy extra minutes or upgrade to continue.",
    limitsLeft: "You still have {minutes} Voice Tutor minutes available.",

    starterLimits: [
      "Up to 50 analyses per month",
      "Videos up to 60 minutes",
      "No Voice Tutor"
    ],
    starterFeatures: [
      "Limited chat tutor",
      "AI summaries",
      "Review quizzes",
      "Basic mind maps",
      "Limited study history"
    ],

    explorerLimits: [
      "Up to 150 analyses per month",
      "Standard processing priority",
      "30 minutes/month of Voice Tutor"
    ],
    explorerFeatures: [
      "Everything in Starter",
      "Chat tutor included",
      "Purchase extra minutes",
      "Advanced mind maps",
      "Extra question generation",
      "Multi-language PT/EN/ES",
      "Full study history"
    ],

    proLimits: [
      "Up to 300 analyses per month",
      "Priority processing queue",
      "300 minutes/month of Voice Tutor"
    ],
    proFeatures: [
      "Everything in Explorer",
      "Live voice tutor",
      "Premium exports",
      "Processing priority",
      "No video length limit",
      "Early access to uploads, image analysis, and multi-file sessions"
    ],

    powerTutorLimits: [
      "Up to 500 analyses per month",
      "Maximum priority queue",
      "1,500 minutes/month of Voice Tutor"
    ],
    powerTutorFeatures: [
      "Everything in Pro",
      "Ideal for heavy daily usage",
      "Indicated for course creators",
      "Indicated for researchers",
      "Purchase extra minutes"
    ]
  },
  es: {
    eyebrow: "PLANES DE PRECIOS",
    title: "INVIERTE EN TU EVOLUCIÓN.",
    subtitle: "Elige el plan que se adapte a tu viaje de aprendizaje. Desde exploradores ocasionales hasta profesionales de alto rendimiento.",
    monthly: "Mensual",
    annual: "Anual",
    saveBadge: "Ahorra 40%",
    billedAnnually: "Cobrado anualmente",
    mostPopular: "MÁS POPULAR",
    intensiveUse: "USO INTENSIVO",
    secureCloud: "Garantía de seguridad en el pago cifrado. Cancela cuando quieras.",
    signInToChoose: "Por favor, inicia sesión para elegir un plan.",
    planUpdated: "Plan actualizado a",
    usageLimitsTitle: "Límites de Uso",
    moreFeaturesTitle: "Recursos y Beneficios",
    mo: "/mes",

    // Add-ons Translation
    addonsTitle: "Minutos Extra del Tutor por Voz",
    addonsSubtitle: "¿Alcanzaste tu límite mensual? Sigue aprendiendo comprando minutos extra para el Voice Tutor.",
    addonsExpiry: "Los minutos extra son válidos por 90 días.",
    addonBuyBtn: "Comprar minutos",
    checkoutSoon: "Checkout próximamente.",
    
    // Explain text
    explainText: "El Tutor por Voz usa minutos mensuales porque las conversaciones por voz consumen recursos de IA en tiempo real. Esto mantiene la experiencia estable y sostenible.",

    // Plan Descriptions
    starterDesc: "Para usuarios que quieren comenzar a estudiar videos con IA de forma sencilla.",
    explorerDesc: "Para estudiantes frecuentes que quieren estudiar con más profundidad, productividad y acceso al Tutor por voz.",
    proDesc: "Para profesores, creadores, investigadores y usuarios avanzados que necesitan más minutos de Tutor por voz.",
    powerTutorDesc: "Para usuarios intensivos que usan el Tutor por voz diariamente y necesitan una experiencia avanzada de aprendizaje.",

    // Plan Targets
    starterTarget: "Para estudiantes ocasionales",
    explorerTarget: "Para estudiantes activos",
    proTarget: "Para profesionales",
    powerTutorTarget: "Para uso intensivo",

    // Plan CTAs
    starterCTA: "Comenzar con Starter",
    explorerCTA: "Suscribirse a Explorer",
    proCTA: "Obtener Pro",
    powerTutorCTA: "Suscribirse a Power Tutor",

    // Packages names
    package100: "+100 min",
    package500: "+500 min",
    package1000: "+1.000 min",
    package100Label: "+100 min de Tutor por Voz",
    package500Label: "+500 min de Tutor por Voz",
    package1000Label: "+1.000 min de Tutor por Voz",

    // Live Limit warnings
    limitReached: "Has alcanzado tu límite mensual del Tutor por Voz. Compra minutos extra o actualiza tu plan para continuar.",
    limitsLeft: "Todavía tienes {minutes} minutos de Tutor por Voz disponibles.",

    starterLimits: [
      "Hasta 50 análisis al mes",
      "Videos de hasta 60 minutos",
      "Sin Voice Tutor"
    ],
    starterFeatures: [
      "Tutor por texto limitado",
      "Resúmenes por inteligencia artificial",
      "Cuestionarios de revisión con IA",
      "Mapas mentales básicos",
      "Historial de estudios limitado"
    ],

    explorerLimits: [
      "Hasta 150 análisis al mes",
      "Prioridad de procesamiento estándar",
      "30 minutos/mes de Voice Tutor"
    ],
    explorerFeatures: [
      "Todo lo de Starter",
      "Tutor por texto incluido",
      "Compra de minutos extras disponible",
      "Mapas mentais avanzados",
      "Generación de preguntas extras",
      "Soporte multiidioma (PT/EN/ES)",
      "Historial de estudios completo"
    ],

    proLimits: [
      "Hasta 300 análisis al mes",
      "Cola de prioridad dedicada",
      "300 minutos/mes de Voice Tutor"
    ],
    proFeatures: [
      "Todo lo de Explorer",
      "Tutor inteligente por voz en vivo",
      "Exportaciones premium",
      "Prioridad de procesamiento",
      "Sin límite de duración de video",
      "Acceso anticipado a cargas, análisis de imágenes y sesiones de múltiples archivos"
    ],

    powerTutorLimits: [
      "Hasta 500 análisis al mes",
      "Fila máxima de prioridad",
      "1.500 minutos/mes de Voice Tutor"
    ],
    powerTutorFeatures: [
      "Todo lo de Pro",
      "Ideal para uso diario intensivo",
      "Indicado para creadores de cursos",
      "Indicado para investigadores",
      "Compra de minutos extras disponible"
    ]
  }
};

export const Pricing = ({ t, isDarkMode = true, lang = 'en' }: Props) => {
  const { user } = useAuth();
  const [isAnnual, setIsAnnual] = useState(true);

  const langKey = (lang && ['pt', 'en', 'es'].includes(lang)) ? (lang as 'pt' | 'en' | 'es') : 'en';
  const local = LOCAL_PRICING_LANG[langKey];

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      target: local.starterTarget,
      description: local.starterDesc,
      monthlyPrice: '$9.99',
      annualPrice: '$5.99',
      oldPrice: '$9.99',
      limits: local.starterLimits,
      features: local.starterFeatures,
      cta: local.starterCTA,
      icon: Shield,
      highlighted: false,
    },
    {
      id: 'explorer',
      name: 'Explorer',
      target: local.explorerTarget,
      description: local.explorerDesc,
      monthlyPrice: '$19.99',
      annualPrice: '$14.99',
      oldPrice: '$19.99',
      limits: local.explorerLimits,
      features: local.explorerFeatures,
      cta: local.explorerCTA,
      icon: Rocket,
      highlighted: true,
      badge: local.mostPopular,
    },
    {
      id: 'pro',
      name: 'Pro',
      target: local.proTarget,
      description: local.proDesc,
      monthlyPrice: '$39.99',
      annualPrice: '$29.99',
      oldPrice: '$39.99',
      limits: local.proLimits,
      features: local.proFeatures,
      cta: local.proCTA,
      icon: Zap,
      highlighted: false,
    },
    {
      id: 'power_tutor',
      name: 'Power Tutor',
      target: local.powerTutorTarget,
      description: local.powerTutorDesc,
      monthlyPrice: '$119.00',
      annualPrice: '$89.99',
      oldPrice: '$119.00',
      limits: local.powerTutorLimits,
      features: local.powerTutorFeatures,
      cta: local.powerTutorCTA,
      icon: Crown,
      highlighted: false,
      badge: local.intensiveUse,
    },
  ];

  const addonsList = [
    {
      id: 'addon_100',
      title: local.package100,
      price: '$9.90',
      label: local.package100Label,
    },
    {
      id: 'addon_500',
      title: local.package500,
      price: '$39.00',
      label: local.package500Label,
    },
    {
      id: 'addon_1000',
      title: local.package1000,
      price: '$69.00',
      label: local.package1000Label,
    },
  ];

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      alert(local.signInToChoose);
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      
      let vLimit = 0;
      let mAnalyses = 50;
      let maxVideoLen = 60;
      
      if (planId === 'explorer') {
        vLimit = 30;
        mAnalyses = 150;
        maxVideoLen = 60;
      } else if (planId === 'pro') {
        vLimit = 300;
        mAnalyses = 300;
        maxVideoLen = 999999;
      } else if (planId === 'power_tutor') {
        vLimit = 1500;
        mAnalyses = 500;
        maxVideoLen = 999999;
      }

      await updateDoc(userRef, {
        plan: planId,
        billingCycle: isAnnual ? 'annual' : 'monthly',
        voiceTutor: {
          monthlyIncludedMinutes: vLimit,
          monthlyUsedMinutes: 0,
          addonAvailableMinutes: 0,
          addonUsedMinutes: 0,
          addonExpiresAt: null,
          currentPeriodStart: serverTimestamp(),
          currentPeriodEnd: serverTimestamp()
        },
        limits: {
          monthlyVoiceTutorMinutes: vLimit,
          monthlyAnalyses: mAnalyses,
          maxVideoDurationMinutes: maxVideoLen === 999999 ? null : maxVideoLen
        },
        updatedAt: serverTimestamp()
      });
      alert(`${local.planUpdated} ${planId.toUpperCase()}!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleBuyAddon = (addonId: string) => {
    alert(local.checkoutSoon);
  };

  return (
    <section
      id="pricing"
      className={`py-32 px-4 sm:px-6 relative overflow-hidden transition-colors duration-500 ${
        isDarkMode
          ? 'bg-[#0a0a0a] text-white border-t border-white/5'
          : 'bg-[#f6f7fb] text-slate-950 border-t border-slate-200'
      }`}
    >
      {/* Background radial overlays */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-12 right-12 w-[350px] h-[350px] bg-orange-600/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16 space-y-4">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`inline-block text-[11px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full border ${
              isDarkMode 
                ? 'bg-orange-600/10 border-orange-600/20 text-orange-500' 
                : 'bg-orange-50 border-orange-100 text-orange-700'
            }`}
          >
            {local.eyebrow}
          </motion.span>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className={`text-4xl sm:text-5xl md:text-6xl font-black italic tracking-tighter mb-2 uppercase ${
              isDarkMode ? 'text-white' : 'text-slate-950'
            }`}
          >
            {local.title}
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className={`max-w-2xl mx-auto text-sm sm:text-base font-medium ${
              isDarkMode ? 'text-gray-400' : 'text-slate-600'
            }`}
          >
            {local.subtitle}
          </motion.p>
        </div>

        {/* Toggle Billing Cycle */}
        <div className="flex flex-col items-center justify-center gap-2 mb-16">
          <div className="inline-flex items-center gap-4 bg-orange-600/5 border border-orange-500/10 p-1.5 rounded-full relative z-10">
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              className={`px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold rounded-full transition-all duration-300 ${
                !isAnnual
                  ? 'bg-orange-600 text-white shadow-md'
                  : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {local.monthly}
            </button>
            
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              className={`px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold rounded-full transition-all duration-300 flex items-center gap-2 ${
                isAnnual
                  ? 'bg-orange-600 text-white shadow-md'
                  : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <span>{local.annual}</span>
              <motion.span
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className={`px-2 py-0.5 text-[9px] font-black rounded-full shadow-sm leading-none ${
                  isAnnual 
                    ? 'bg-black text-orange-500' 
                    : 'bg-orange-600 text-white'
                }`}
              >
                {local.saveBadge}
              </motion.span>
            </button>
          </div>
          
          <AnimatePresence>
            {isAnnual && (
              <motion.span
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`text-[10px] font-black uppercase tracking-wider ${
                  isDarkMode ? 'text-orange-500/80' : 'text-orange-600'
                }`}
              >
                * {local.billedAnnually}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* 4-Column Grid for Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 xl:gap-8 items-stretch mb-24">
          {plans.map((plan, index) => {
            const IconComponent = plan.icon;
            const currentPrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;
            const hasBadge = !!plan.badge;
            const isMostPopular = plan.id === 'explorer';
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -6 }}
                className={`relative flex flex-col p-6 sm:p-8 rounded-[2rem] transition-all duration-500 ${
                  isMostPopular 
                    ? isDarkMode 
                      ? 'bg-gradient-to-b from-[#1c1917] to-[#0c0a09] border-2 border-orange-500 shadow-[0_25px_60px_-15px_rgba(234,88,12,0.3)] z-10'
                      : 'bg-white border-2 border-orange-500 shadow-[0_25px_65px_rgba(234,88,12,0.15)] z-10' 
                    : isDarkMode 
                      ? 'bg-[#111827]/40 border border-white/5 hover:border-orange-500/30'
                      : 'bg-white border border-slate-200 hover:border-orange-500/30 shadow-[0_15px_45px_rgba(15,23,42,0.04)]'
                }`}
              >
                {hasBadge && (
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-600 text-[10px] font-black text-white uppercase tracking-widest rounded-full shadow-md border border-orange-400/30 whitespace-nowrap`}>
                    {plan.badge}
                  </div>
                )}

                {/* Top of Card */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                      isMostPopular 
                        ? isDarkMode 
                          ? 'bg-orange-500/10 text-orange-400' 
                          : 'bg-orange-50 text-orange-650'
                        : isDarkMode 
                          ? 'bg-white/5 text-gray-400' 
                          : 'bg-slate-100 text-slate-500'
                    }`}>
                      {plan.target}
                    </span>
                    
                    <div className={`p-2 rounded-lg ${
                      isMostPopular 
                        ? 'bg-orange-500/10 text-orange-500' 
                        : isDarkMode ? 'bg-white/5 text-gray-400' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <IconComponent size={18} />
                    </div>
                  </div>

                  <h3 className={`text-2xl font-black italic tracking-tight mb-2 uppercase ${
                    isDarkMode ? 'text-white' : 'text-slate-950'
                  }`}>
                    {plan.name}
                  </h3>

                  <p className={`text-xs font-semibold leading-relaxed mb-4 ${
                    isDarkMode ? 'text-gray-400' : 'text-slate-500'
                  }`}>
                    {plan.description}
                  </p>

                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl sm:text-4xl font-black tracking-tight ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {currentPrice}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-450' : 'text-slate-500'
                      }`}>
                        {local.mo}
                      </span>
                    </div>

                    {isAnnual && (
                      <span className="text-[11px] font-bold text-gray-440 line-through tracking-wide opacity-75">
                        {plan.oldPrice}
                      </span>
                    )}
                  </div>
                </div>

                <hr className={`my-2 border-dashed ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`} />

                {/* Requirements & Features lists */}
                <div className="space-y-5 my-4 flex-1">
                  {/* Limits block */}
                  <div className="space-y-2">
                    <h4 className={`text-[9px] font-black uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-400' : 'text-slate-500'
                    }`}>
                      {local.usageLimitsTitle}
                    </h4>
                    <ul className="space-y-1.5">
                      {plan.limits.map((limit, lIdx) => (
                        <li key={lIdx} className={`flex gap-2 text-xs font-bold leading-normal ${
                          isDarkMode ? 'text-gray-300' : 'text-slate-700'
                        }`}>
                          <Check size={14} className="text-orange-500 shrink-0 mt-0.5" />
                          <span>{limit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Features list */}
                  <div className="space-y-2">
                    <h4 className={`text-[9px] font-black uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-400' : 'text-slate-500'
                    }`}>
                      {local.moreFeaturesTitle}
                    </h4>
                    <ul className="space-y-1.5">
                      {plan.features.map((feature, fIdx) => (
                        <li key={fIdx} className={`flex gap-2 text-xs font-medium leading-normal ${
                          isDarkMode ? 'text-gray-300' : 'text-slate-700'
                        }`}>
                          <Check size={14} className="text-orange-500 shrink-0 " />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Primary plan CTA */}
                <button 
                  type="button"
                  onClick={() => handleSubscribe(plan.id)}
                  className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 group relative overflow-hidden shadow active:scale-95 ${
                    isMostPopular 
                      ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/10' 
                      : isDarkMode
                        ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200'
                  }`}
                >
                  <span className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
                  {plan.cta}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Informative Sustainability Notice */}
        <div className={`max-w-3xl mx-auto p-6 rounded-2xl mb-24 border text-center ${
          isDarkMode 
            ? 'bg-white/[0.02] border-white/5 text-gray-300' 
            : 'bg-white border-slate-200 text-slate-700 shadow-sm'
        }`}>
          <HelpCircle className="mx-auto mb-2 text-orange-500" size={24} />
          <p className="text-xs sm:text-sm font-semibold leading-relaxed">
            {local.explainText}
          </p>
        </div>

        {/* Extra Voice Tutor Add-ons Section */}
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-10 space-y-2">
            <h3 className={`text-2xl sm:text-3xl font-black italic uppercase tracking-tight ${
              isDarkMode ? 'text-white' : 'text-slate-950'
            }`}>
              {local.addonsTitle}
            </h3>
            <p className={`text-xs sm:text-sm max-w-xl mx-auto font-medium ${
              isDarkMode ? 'text-gray-400' : 'text-slate-600'
            }`}>
              {local.addonsSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {addonsList.map((addon) => (
              <motion.div
                key={addon.id}
                whileHover={{ y: -4 }}
                className={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 ${
                  isDarkMode
                    ? 'bg-white/[0.01] border-white/5 hover:border-orange-500/30'
                    : 'bg-white border-slate-200 hover:border-orange-500/30 shadow-md'
                }`}
              >
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-orange-500 uppercase tracking-tight">
                      {addon.title}
                    </span>
                    <Clock size={18} className="text-orange-500/60" />
                  </div>
                  
                  <div>
                    <span className={`text-3xl font-black tracking-tight ${
                      isDarkMode ? 'text-white' : 'text-slate-950'
                    }`}>
                      {addon.price}
                    </span>
                  </div>

                  <p className={`text-xs font-bold ${
                    isDarkMode ? 'text-gray-400' : 'text-slate-600'
                  }`}>
                    {addon.label}
                  </p>
                </div>

                <div className="space-y-4">
                  <span className={`block text-[10px] font-black uppercase tracking-wider text-center ${
                    isDarkMode ? 'text-gray-650' : 'text-slate-400'
                  }`}>
                    {local.addonsExpiry}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleBuyAddon(addon.id)}
                    className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest transition-all duration-300 active:scale-95 text-center"
                  >
                    {local.addonBuyBtn}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Checkout guarantee banner footer */}
        <div className="mt-24 text-center">
          <p className={`text-[10px] sm:text-xs font-bold tracking-widest uppercase ${
            isDarkMode ? 'text-gray-650' : 'text-slate-500'
          }`}>
            {local.secureCloud}
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
