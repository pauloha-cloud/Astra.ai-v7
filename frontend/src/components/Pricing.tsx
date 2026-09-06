import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Zap, Shield, Rocket, Clock, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { api } from '../lib/api';

interface Props {
  t: any;
  isDarkMode?: boolean;
  lang?: string;
  showToast?: (message: string) => void;
}

// Secure placeholders as requested
export const STRIPE_PRICE_IDS = {
  starter_monthly: "price_starter_monthly",
  starter_annual: "price_starter_annual",
  explorer_monthly: "price_explorer_monthly",
  explorer_annual: "price_explorer_annual",
  pro_monthly: "price_pro_monthly",
  pro_annual: "price_pro_annual",
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
    saveBadge: "Economize até 40%",
    billedAnnually: "Cobrado anualmente",
    mostPopular: "MAIS POPULAR",
    secureCloud: "Garantia de segurança com checkout criptografado. Cancele quando quiser.",
    signInToChoose: "Por favor, entre para escolher um plano.",
    planUpdated: "Plano atualizado para",
    usageLimitsTitle: "Limites de Uso",
    moreFeaturesTitle: "Recursos e Benefícios",
    mo: "/mês",
    
    // Add-ons Translation
    addonsTitle: "MINUTOS EXTRAS DO TUTOR POR VOZ",
    addonsSubtitle: "Precisa de mais tempo com a Astra? Adicione minutos extras do Voice Tutor a qualquer momento e continue sua sessão de aprendizado.",
    addonsExpiry: "Válidos por 90 dias após a compra",
    addonBuyBtn: "ADICIONAR MINUTOS",
    checkoutSoon: "Checkout em breve.",
    
    // Explain text
    explainText: "Os minutos do Voice Tutor permitem conversas em tempo real com a Astra. Seu plano mensal inclui uma quantidade de minutos, e você pode adicionar minutos extras a qualquer momento sem alterar sua assinatura.",

    // Plan Descriptions
    starterDesc: "Para quem quer começar a estudar com IA de forma simples e acessível.",
    explorerDesc: "Para estudantes frequentes que querem mais profundidade, produtividade e acesso inicial ao Tutor por voz.",
    proDesc: "Para professores, criadores, pesquisadores e usuários avançados que precisam de mais minutos de Tutor por voz.",

    // Plan Targets
    starterTarget: "Para aprendizes casuais",
    explorerTarget: "Para estudantes ativos",
    proTarget: "Para profissionais",

    // Plan CTAs
    starterCTA: "Começar com Starter",
    explorerCTA: "Assinar Explorer",
    proCTA: "Obter Pro",

    // Packages names
    package100: "100 MINUTOS EXTRAS",
    package500: "500 MINUTOS EXTRAS",
    package1000: "1.000 MINUTOS EXTRAS",
    package100Label: "Ideal para sessões extras ocasionais",
    package500Label: "Ideal para uso regular do Voice Tutor",
    package1000Label: "Ideal para aprendizado intensivo",
    package100Btn: "ADICIONAR 100 MINUTOS",
    package500Btn: "ADICIONAR 500 MINUTOS",
    package1000Btn: "ADICIONAR 1.000 MINUTOS",
    package500Value: "Melhor custo por minuto",
    package1000Value: "Melhor valor por minuto",

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
      "Análise de vídeos do YouTube",
      "Resumos com IA",
      "Quizzes de revisão",
      "Mapas mentais básicos",
      "Histórico limitado"
    ],

    explorerLimits: [
      "Até 150 análises por mês",
      "Prioridade padrão de processamento",
      "30 min/mês de Voice Tutor"
    ],
    explorerFeatures: [
      "Tudo no Starter",
      "Tutor por texto incluso",
      "Mapas mentais avançados",
      "Geração de questões extras",
      "Multi-idioma PT/EN/ES",
      "Histórico completo",
      "Compra de minutos extras disponível"
    ],

    proLimits: [
      "Até 300 análises por mês",
      "Fila prioritária",
      "300 min/mês de Voice Tutor"
    ],
    proFeatures: [
      "Tudo no Explorer",
      "Tutor por texto incluso",
      "Tutor inteligente por voz ao vivo",
      "Exportações premium",
      "Prioridade de processamento",
      "Sem limite de duração de vídeos",
      "Acesso antecipado a novas funções",
      "Compra de minutos extras disponível"
    ],
  },
  en: {
    eyebrow: "PRICING PLANS",
    title: "INVEST IN YOUR EVOLUTION.",
    subtitle: "Choose the plan that fits your learning journey. From casual explorers to high-performance professionals.",
    monthly: "Monthly",
    annual: "Annual",
    saveBadge: "Save up to 40%",
    billedAnnually: "Billed annually",
    mostPopular: "MOST POPULAR",
    secureCloud: "Secured and encrypted checkout. Cancel anytime.",
    signInToChoose: "Please sign in to choose a plan.",
    planUpdated: "Plan updated to",
    usageLimitsTitle: "Usage Limits",
    moreFeaturesTitle: "Features & Benefits",
    mo: "/mo",

    // Add-ons Translation
    addonsTitle: "EXTRA VOICE TUTOR MINUTES",
    addonsSubtitle: "Need more time with Astra? Add extra Voice Tutor minutes anytime and keep your learning session going.",
    addonsExpiry: "Valid for 90 days after purchase",
    addonBuyBtn: "ADD MINUTES",
    checkoutSoon: "Checkout coming soon.",
    
    // Explain text
    explainText: "Voice Tutor minutes power real-time AI conversations with Astra. Your monthly plan includes a set allowance, and you can add extra minutes anytime without changing your subscription.",

    // Plan Descriptions
    starterDesc: "For users who want to start studying with AI in a simple and affordable way.",
    explorerDesc: "For frequent learners who want deeper study, better productivity, and initial access to Voice Tutor.",
    proDesc: "For teachers, creators, researchers, and power users who need more Voice Tutor minutes.",

    // Plan Targets
    starterTarget: "For casual learners",
    explorerTarget: "For active students",
    proTarget: "For professionals",

    // Plan CTAs
    starterCTA: "Start Starter",
    explorerCTA: "Subscribe Explorer",
    proCTA: "Get Pro",

    // Packages names
    package100: "100 EXTRA MINUTES",
    package500: "500 EXTRA MINUTES",
    package1000: "1,000 EXTRA MINUTES",
    package100Label: "Ideal for occasional extra sessions",
    package500Label: "Great for regular Voice Tutor use",
    package1000Label: "Best for intensive learning",
    package100Btn: "ADD 100 MINUTES",
    package500Btn: "ADD 500 MINUTES",
    package1000Btn: "ADD 1,000 MINUTES",
    package500Value: "Better value per minute",
    package1000Value: "Best value per minute",

    // Live Limit warnings
    limitReached: "You have reached your monthly Voice Tutor limit. Buy extra minutes or upgrade to continue.",
    limitsLeft: "You still have {minutes} Voice Tutor minutes available.",

    starterLimits: [
      "Up to 50 analyses per month",
      "Videos up to 60 minutes",
      "No Voice Tutor"
    ],
    starterFeatures: [
      "YouTube video analysis",
      "AI summaries",
      "Review quizzes",
      "Basic mind maps",
      "Limited history"
    ],

    explorerLimits: [
      "Up to 150 analyses per month",
      "Standard processing priority",
      "30 Voice Tutor min/month"
    ],
    explorerFeatures: [
      "Everything in Starter",
      "Text tutor included",
      "Advanced mind maps",
      "Extra question generation",
      "Multi-language PT/EN/ES",
      "Full study history",
      "Extra minutes available for purchase"
    ],

    proLimits: [
      "Up to 300 analyses per month",
      "Priority queue",
      "300 Voice Tutor min/month"
    ],
    proFeatures: [
      "Everything in Explorer",
      "Text tutor included",
      "Live intelligent Voice Tutor",
      "Premium exports",
      "Processing priority",
      "No video length limit",
      "Early access to new features",
      "Extra minutes available for purchase"
    ]
  },
  es: {
    eyebrow: "PLANES DE PRECIOS",
    title: "INVIERTE EN TU EVOLUCIÓN.",
    subtitle: "Elige el plan que se adapte a tu viaje de aprendizaje. Desde exploradores ocasionales hasta profesionales de alto rendimiento.",
    monthly: "Mensual",
    annual: "Anual",
    saveBadge: "Ahorra hasta 40%",
    billedAnnually: "Cobrado anualmente",
    mostPopular: "MÁS POPULAR",
    secureCloud: "Garantía de seguridad en el pago cifrado. Cancela cuando quieras.",
    signInToChoose: "Por favor, inicia sesión para elegir un plan.",
    planUpdated: "Plan actualizado a",
    usageLimitsTitle: "Límites de Uso",
    moreFeaturesTitle: "Recursos y Beneficios",
    mo: "/mes",

    // Add-ons Translation
    addonsTitle: "MINUTOS EXTRA DEL TUTOR POR VOZ",
    addonsSubtitle: "¿Necesitas más tiempo con Astra? Añade minutos adicionales de Voice Tutor en cualquier momento y continúa tu sesión de aprendizaje.",
    addonsExpiry: "Válidos durante 90 días después de la compra",
    addonBuyBtn: "AÑADIR MINUTOS",
    checkoutSoon: "Checkout próximamente.",
    
    // Explain text
    explainText: "Los minutos de Voice Tutor permiten conversaciones en tiempo real con Astra. Tu plan mensual incluye una cantidad de minutos y puedes añadir minutos adicionales en cualquier momento sin cambiar tu suscripción.",

    // Plan Descriptions
    starterDesc: "Para quienes quieren comenzar a estudiar con IA de forma simple y accesible.",
    explorerDesc: "Para estudiantes frecuentes que quieren más profundidad, productividad y acceso inicial al Tutor por voz.",
    proDesc: "Para profesores, creadores, investigadores y usuarios avanzados que necesitan más minutos de Tutor por voz.",

    // Plan Targets
    starterTarget: "Para estudiantes ocasionales",
    explorerTarget: "Para estudiantes activos",
    proTarget: "Para profesionales",

    // Plan CTAs
    starterCTA: "Comenzar con Starter",
    explorerCTA: "Suscribirse a Explorer",
    proCTA: "Obtener Pro",

    // Packages names
    package100: "100 MINUTOS EXTRA",
    package500: "500 MINUTOS EXTRA",
    package1000: "1.000 MINUTOS EXTRA",
    package100Label: "Ideal para sesiones adicionales ocasionales",
    package500Label: "Ideal para el uso habitual de Voice Tutor",
    package1000Label: "Ideal para un aprendizaje intensivo",
    package100Btn: "AÑADIR 100 MINUTOS",
    package500Btn: "AÑADIR 500 MINUTOS",
    package1000Btn: "AÑADIR 1.000 MINUTOS",
    package500Value: "Mejor valor por minuto",
    package1000Value: "Excelente valor por minuto",

    // Live Limit warnings
    limitReached: "Has alcanzado tu límite mensual del Tutor por Voz. Compra minutos extra o actualiza tu plan para continuar.",
    limitsLeft: "Todavía tienes {minutes} minutos de Tutor por Voz disponibles.",

    starterLimits: [
      "Hasta 50 análisis al mes",
      "Videos de hasta 60 minutos",
      "Sin Tutor por Voz"
    ],
    starterFeatures: [
      "Análisis de videos de YouTube",
      "Resúmenes con IA",
      "Cuestionarios de revisión",
      "Mapas mentales básicos",
      "Historial limitado"
    ],

    explorerLimits: [
      "Hasta 150 análisis al mes",
      "Prioridad estándar de procesamiento",
      "30 min/mes de Tutor por Voz"
    ],
    explorerFeatures: [
      "Todo en Starter",
      "Tutor por texto incluido",
      "Mapas mentales avanzados",
      "Generación de preguntas extra",
      "Multi-idioma PT/EN/ES",
      "Historial completo",
      "Compra de minutos extra disponible"
    ],

    proLimits: [
      "Hasta 300 análisis al mes",
      "Cola prioritaria",
      "300 min/mes de Tutor por Voz"
    ],
    proFeatures: [
      "Todo en Explorer",
      "Tutor por texto incluido",
      "Tutor inteligente por voz en vivo",
      "Exportaciones premium",
      "Prioridad de procesamiento",
      "Sin límite de duración de videos",
      "Acceso anticipado a nuevas funciones",
      "Compra de minutos extra disponible"
    ]
  }
};

// Pricing Helper Functions
function calculateDiscountPercent(monthlyPrice: number, annualMonthlyPrice: number) {
  return Math.round(((monthlyPrice - annualMonthlyPrice) / monthlyPrice) * 100);
}

function calculateAnnualTotal(annualMonthlyPrice: number) {
  return annualMonthlyPrice * 12;
}

function getSaveText(percent: number, lang: string) {
  if (lang === 'pt') return `Economize ${percent}%`;
  if (lang === 'es') return `Ahorra ${percent}%`;
  return `Save ${percent}%`;
}

function getBilledAnnuallyText(total: string, lang: string) {
  if (lang === 'pt') return `Cobrado anualmente em $${total}`;
  if (lang === 'es') return `Cobrado anualmente en $${total}`;
  return `Billed annually at $${total}`;
}

export const Pricing = ({ t, isDarkMode = true, lang = 'en', showToast }: Props) => {
  const { user, userPlan, stripeSubscriptionId, subscriptionStatus } = useAuth();
  const [isAnnual, setIsAnnual] = useState(true);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const langKey = (lang && ['pt', 'en', 'es'].includes(lang)) ? (lang as 'pt' | 'en' | 'es') : 'en';
  const local = LOCAL_PRICING_LANG[langKey];

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      target: local.starterTarget,
      description: local.starterDesc,
      monthlyPrice: 9.90,
      annualPrice: 5.90,
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
      monthlyPrice: 19.90,
      annualPrice: 14.90,
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
      monthlyPrice: 39.90,
      annualPrice: 29.90,
      limits: local.proLimits,
      features: local.proFeatures,
      cta: local.proCTA,
      icon: Zap,
      highlighted: false,
    },
  ];

  const addonsList = [
    {
      id: 'addon_100',
      title: local.package100,
      price: '$9.90',
      label: local.package100Label,
      btnText: local.package100Btn,
    },
    {
      id: 'addon_500',
      title: local.package500,
      price: '$39.00',
      label: local.package500Label,
      btnText: local.package500Btn,
    },
    {
      id: 'addon_1000',
      title: local.package1000,
      price: '$69.00',
      label: local.package1000Label,
      btnText: local.package1000Btn,
      valueBadge: local.package1000Value,
    },
  ];

  const handleSubscribe = async (planId: string) => {
    const notify = (msg: string) => {
      if (showToast) {
        showToast(msg);
      } else {
        alert(msg);
      }
    };

    if (!user) {
      notify(local.signInToChoose);
      return;
    }

    const mappedPlanId = planId === 'starter' ? 'start' : planId;
    const currentPlan = (userPlan || 'free').toLowerCase();
    const selectedPlan = mappedPlanId.toLowerCase();
    const hasActiveSubscription = subscriptionStatus === "active" && stripeSubscriptionId && stripeSubscriptionId.length > 0;

    console.log("[Billing] Current plan:", currentPlan);
    console.log("[Billing] Target plan:", selectedPlan);
    console.log("[Billing] Has active subscription:", hasActiveSubscription);

    if (currentPlan === selectedPlan) {
      console.log("[Billing] Clicked current active plan. Doing nothing.");
      return;
    }

    if (hasActiveSubscription) {
      console.log("[Billing] Opening Customer Portal");
      try {
        setIsLoading(planId);
        const res = await api.post('/stripe/create-portal-session', {});
        const data = res.data;
        if (data?.url) {
          window.location.href = data.url;
          return;
        } else {
          throw new Error('No portal URL received');
        }
      } catch (err: any) {
        console.error('Error opening billing portal from Pricing card:', err);
        notify(
          lang === 'pt' 
            ? 'Erro ao carregar o portal. Acesse as Configurações para gerenciar sua assinatura.' 
            : lang === 'es'
              ? 'Error al cargar el portal. Vaya a Ajustes para gestionar su suscripción.'
              : 'Error loading the portal. Go to Settings to manage your subscription.'
        );
      } finally {
        setIsLoading(null);
      }
      return;
    }

    try {
      setIsLoading(planId);
      console.log(`[Stripe Checkout] Initiating checkout for user: ${user.email}, plan: ${selectedPlan}`);
      
      const res = await api.post('/stripe/create-checkout-session', {
        plan: selectedPlan,
        successUrl: `${window.location.origin}/dashboard?checkout=success`,
        cancelUrl: `${window.location.origin}/dashboard?checkout=cancel`
      });

      const data = res.data;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received from server');
      }
    } catch (error: any) {
      console.error('[Stripe Checkout] Error:', error);
      const msg = error.response?.data?.error || error.message || 'Error processing transaction';
      notify(msg);
    } finally {
      setIsLoading(null);
    }
  };

  const handleBuyAddon = (addonId: string) => {
    if (showToast) {
      showToast(local.checkoutSoon);
    } else {
      alert(local.checkoutSoon);
    }
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
            className={`text-3xl md:text-4xl section-heading-typography mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
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
              className={`px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold rounded-full transition-all duration-300 ${
                isAnnual
                  ? 'bg-orange-600 text-white shadow-md'
                  : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                <span>{local.annual}</span>
                <motion.span
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] leading-none whitespace-nowrap font-black shadow-sm ${
                    isAnnual 
                      ? 'bg-black text-orange-500' 
                      : 'bg-orange-600 text-white'
                  }`}
                >
                  {local.saveBadge}
                </motion.span>
              </div>
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

        {/* 3-Column Grid for Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xl:gap-8 items-stretch max-w-5xl mx-auto mb-24">
          {plans.map((plan, index) => {
            const IconComponent = plan.icon;
            
            // Prices formatting
            const displayPriceVal = isAnnual ? plan.annualPrice : plan.monthlyPrice;
            const displayPrice = `$${displayPriceVal.toFixed(2)}`;
            const displayOldPrice = `$${plan.monthlyPrice.toFixed(2)}`;
            
            const hasBadge = !!plan.badge;
            const isMostPopular = plan.id === 'explorer';
            
            // Savings calculations
            const discountPercent = calculateDiscountPercent(plan.monthlyPrice, plan.annualPrice);
            const saveText = getSaveText(discountPercent, langKey);
            const annualTotal = calculateAnnualTotal(plan.annualPrice).toFixed(2);
            const billedAnnuallyText = getBilledAnnuallyText(annualTotal, langKey);
            
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

                  <p className={`text-xs font-semibold leading-relaxed mb-4 min-h-[48px] ${
                    isDarkMode ? 'text-gray-400' : 'text-slate-500'
                  }`}>
                    {plan.description}
                  </p>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl sm:text-4xl font-black tracking-tight ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {displayPrice}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-450' : 'text-slate-500'
                      }`}>
                        {local.mo}
                      </span>
                    </div>

                    {isAnnual && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-bold line-through tracking-wide ${
                          isDarkMode ? 'text-gray-500' : 'text-slate-450'
                        }`}>
                          {displayOldPrice}
                        </span>
                        <span className="px-2.5 py-0.5 text-[9px] font-black bg-orange-600 text-white rounded-full uppercase tracking-wider leading-none">
                          {saveText}
                        </span>
                      </div>
                    )}

                    {isAnnual && (
                      <span className={`text-[11px] font-bold mt-1 tracking-wide ${
                        isDarkMode ? 'text-gray-450' : 'text-slate-600'
                      }`}>
                        {billedAnnuallyText}
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
                          <Check size={14} className="text-orange-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Primary plan CTA */}
                {(() => {
                  const PLAN_TIERS_LOCAL: Record<string, number> = {
                    free: 0,
                    start: 1,
                    starter: 1,
                    explorer: 2,
                    pro: 3
                  };
                  const currentTier = PLAN_TIERS_LOCAL[(userPlan || 'free').toLowerCase()];
                  const cardTier = PLAN_TIERS_LOCAL[plan.id.toLowerCase()];
                  const hasStripeSub = stripeSubscriptionId && stripeSubscriptionId.length > 0;

                  let buttonText = plan.cta;
                  if (user) {
                    if (currentTier === cardTier) {
                      buttonText = lang === 'pt' ? 'PLANO ATIVO' : lang === 'es' ? 'PLAN ACTIVO' : 'ACTIVE PLAN';
                    } else if (cardTier > currentTier) {
                      buttonText = lang === 'pt' ? 'Melhorar plano' : lang === 'es' ? 'Mejorar plan' : 'Upgrade Plan';
                    } else if (hasStripeSub && cardTier < currentTier) {
                      buttonText = lang === 'pt' ? 'Gerenciar no portal' : lang === 'es' ? 'Gestionar en el portal' : 'Manage in portal';
                    }
                  }

                  return (
                    <button 
                      type="button"
                      disabled={isLoading !== null}
                      onClick={() => handleSubscribe(plan.id)}
                      className={`w-full py-3.5 mt-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 group relative overflow-hidden shadow active:scale-95 ${
                        isLoading === plan.id
                          ? 'bg-orange-600/50 cursor-not-allowed text-white/50 border-orange-600/50'
                          : isMostPopular 
                            ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/10' 
                            : isDarkMode
                              ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                              : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200'
                      }`}
                    >
                      <span className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
                      {isLoading === plan.id ? '...' : buttonText}
                    </button>
                  );
                })()}
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
            <h3 className={`text-2xl sm:text-3xl section-heading-typography ${
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
                className={`p-6 rounded-2xl border flex flex-col justify-between relative transition-all duration-300 h-full ${
                  isDarkMode
                    ? 'bg-white/[0.01] border-white/5 hover:border-orange-500/30'
                    : 'bg-white border-slate-200 hover:border-orange-500/30 shadow-md'
                }`}
              >
                <div className="flex flex-col">
                  {/* Reserved Badge Row (Same height across all 3 cards) */}
                  <div className="h-6 flex items-center mb-3">
                    {addon.valueBadge ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                        {addon.valueBadge}
                      </span>
                    ) : null}
                  </div>

                  {/* Title Row */}
                  <div className="flex items-center justify-between min-h-[28px] mb-3">
                    <span className="text-sm sm:text-base font-black text-orange-500 uppercase tracking-tight">
                      {addon.title}
                    </span>
                    <Clock size={18} className="text-orange-500/60 flex-shrink-0 ml-2" />
                  </div>
                  
                  {/* Price Row */}
                  <div className="mb-3">
                    <span className={`text-3xl font-black tracking-tight ${
                      isDarkMode ? 'text-white' : 'text-slate-950'
                    }`}>
                      {addon.price}
                    </span>
                  </div>

                  {/* Description Row */}
                  <div className="min-h-[36px] mb-6">
                    <p className={`text-xs font-semibold leading-relaxed ${
                      isDarkMode ? 'text-gray-400' : 'text-slate-600'
                    }`}>
                      {addon.label}
                    </p>
                  </div>
                </div>

                {/* Bottom Area */}
                <div className="space-y-4 pt-2">
                  <span className={`block text-[10px] font-bold uppercase tracking-wider text-center ${
                    isDarkMode ? 'text-gray-500' : 'text-slate-400'
                  }`}>
                    {local.addonsExpiry}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleBuyAddon(addon.id)}
                    className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest transition-all duration-300 active:scale-95 text-center"
                  >
                    {addon.btnText || local.addonBuyBtn}
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
