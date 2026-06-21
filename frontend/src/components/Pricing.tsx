import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Zap, Shield, Rocket } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface Props {
  t: any;
  isDarkMode?: boolean;
  lang?: string;
}

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
    secureCloud: "Garantia de segurança com checkout criptografado. Cancele quando quiser.",
    signInToChoose: "Por favor, entre para escolher um plano.",
    planUpdated: "Plano atualizado para",
    
    starterTarget: "Para aprendizes casuais",
    starterCTA: "Começar Teste Grátis",
    explorerTarget: "Para estudantes ativos",
    explorerCTA: "Assinar Explorer",
    proTarget: "Para profissionais de alta performance",
    proCTA: "Obter Pro",
    
    usageLimitsTitle: "Limites de Uso",
    moreFeaturesTitle: "Recursos e Benefícios",
    mo: "/mês",

    // Plan features
    starterLimits: [
      "Até 50 análises por mês",
      "Vídeos de até 60 minutos"
    ],
    starterFeatures: [
      "Análise de vídeos do YouTube",
      "Resumos por inteligência artificial",
      "Quizzes de revisão com IA",
      "Mapas mentais básicos",
      "Histórico de estudos limitado"
    ],

    explorerLimits: [
      "Até 150 análises por mês",
      "Prioridade padrão de processamento"
    ],
    explorerFeatures: [
      "Tudo do plano Starter",
      "Tutor de IA para tirar dúvidas",
      "Mapas mentais avançados",
      "Geração de perguntas extras",
      "Suporte multi-idioma (PT/EN/ES)",
      "Histórico de estudos completo"
    ],

    proLimits: [
      "Até 300 análises por mês",
      "Fila de processamento dedicada"
    ],
    proFeatures: [
      "Tudo do plano Explorer",
      "Tutor por voz ao vivo",
      "Exportações premium",
      "Alta prioridade de processamento",
      "Sem limite de duração de vídeo",
      "Uploads, análise de imagens e sessões multiarquivos"
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
    secureCloud: "Secured and encrypted checkout. Cancel anytime.",
    signInToChoose: "Please sign in to choose a plan.",
    planUpdated: "Plan updated to",
    
    starterTarget: "For casual learners",
    starterCTA: "Start Free Trial",
    explorerTarget: "For active students",
    explorerCTA: "Subscribe Explorer",
    proTarget: "For high performers",
    proCTA: "Get Pro",
    
    usageLimitsTitle: "Usage Limits",
    moreFeaturesTitle: "Features & Benefits",
    mo: "/mo",

    starterLimits: [
      "Up to 50 analyses per month",
      "Videos up to 60 minutes"
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
      "Standard processing priority"
    ],
    explorerFeatures: [
      "Everything in Starter",
      "AI tutor for questions",
      "Advanced mind maps",
      "Extra question generation",
      "Multi-language PT/EN/ES",
      "Full study history"
    ],

    proLimits: [
      "Up to 300 analyses per month",
      "Priority queue"
    ],
    proFeatures: [
      "Everything in Explorer",
      "Live voice tutor",
      "Premium exports",
      "Processing priority",
      "No video length limit",
      "Early access to uploads, image analysis, and multi-file sessions"
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
    secureCloud: "Garantía de seguridad en el pago cifrado. Cancela cuando quieras.",
    signInToChoose: "Por favor, inicia sesión para elegir un plan.",
    planUpdated: "Plan actualizado a",
    
    starterTarget: "Para estudiantes ocasionales",
    starterCTA: "Comenzar Prueba Gratis",
    explorerTarget: "Para estudiantes activos",
    explorerCTA: "Suscribirse a Explorer",
    proTarget: "Para profesionales de alto rendimiento",
    proCTA: "Obtener Pro",
    
    usageLimitsTitle: "Límites de Uso",
    moreFeaturesTitle: "Recursos y Beneficios",
    mo: "/mes",

    starterLimits: [
      "Hasta 50 análisis al mes",
      "Videos de hasta 60 minutos"
    ],
    starterFeatures: [
      "Análisis de videos de YouTube",
      "Resúmenes por inteligencia artificial",
      "Cuestionarios de revisión con IA",
      "Mapas mentales básicos",
      "Historial de estudios limitado"
    ],

    explorerLimits: [
      "Hasta 150 análisis al mes",
      "Prioridad de procesamiento estándar"
    ],
    explorerFeatures: [
      "Todo lo de Starter",
      "Tutor de IA para preguntas",
      "Mapas mentales avanzados",
      "Generación de preguntas extras",
      "Soporte multiidioma (PT/EN/ES)",
      "Historial de estudios completo"
    ],

    proLimits: [
      "Hasta 300 análisis al mes",
      "Cola de prioridad dedicada"
    ],
    proFeatures: [
      "Todo lo de Explorer",
      "Tutor de voz en vivo",
      "Exportaciones premium",
      "Prioridad de procesamiento",
      "Sin límite de duración de video",
      "Acceso anticipado a cargas, análisis de imágenes y sesiones de múltiples archivos"
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
      monthlyPrice: '$14.99',
      annualPrice: '$8.99',
      oldPrice: '$14.99',
      limits: local.explorerLimits,
      features: local.explorerFeatures,
      cta: local.explorerCTA,
      icon: Rocket,
      highlighted: true,
    },
    {
      id: 'pro',
      name: 'Pro',
      target: local.proTarget,
      monthlyPrice: '$24.99',
      annualPrice: '$14.99',
      oldPrice: '$24.99',
      limits: local.proLimits,
      features: local.proFeatures,
      cta: local.proCTA,
      icon: Zap,
      highlighted: false,
    },
  ];

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      alert(local.signInToChoose);
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        plan: planId,
        billingCycle: isAnnual ? 'annual' : 'monthly',
        updatedAt: serverTimestamp()
      });
      alert(`${local.planUpdated} ${planId.toUpperCase()}!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
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
      {/* Dynamic glow overlays in dark mode */}
      {isDarkMode && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-600/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-12 right-12 w-[350px] h-[350px] bg-orange-600/5 rounded-full blur-[100px]" />
        </div>
      )}

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
              isDarkMode ? 'text-gray-500' : 'text-slate-600'
            }`}
          >
            {local.subtitle}
          </motion.p>
        </div>

        {/* Monthly/Annual Toggle */}
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

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 items-stretch">
          {plans.map((plan, index) => {
            const IconComponent = plan.icon;
            const currentPrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -6 }}
                className={`relative flex flex-col p-8 sm:p-10 rounded-[2.5rem] transition-all duration-500 ${
                  plan.highlighted 
                    ? isDarkMode 
                      ? 'bg-gradient-to-b from-[#1c1917] to-[#0c0a09] border-2 border-orange-500/80 shadow-[0_25px_60px_-15px_rgba(234,88,12,0.25)] lg:scale-105 z-10'
                      : 'bg-white border-2 border-orange-500 shadow-[0_25px_65px_rgba(234,88,12,0.12)] lg:scale-105 z-10' 
                    : isDarkMode 
                      ? 'bg-[#111827]/40 border border-white/5 hover:border-orange-500/30'
                      : 'bg-white border border-slate-200 hover:border-orange-500/30 shadow-[0_15px_45px_rgba(15,23,42,0.04)]'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-orange-600 text-[10px] font-black text-white uppercase tracking-widest rounded-full shadow-[0_8px_20px_rgba(234,88,12,0.3)] border border-orange-400/30">
                    {local.mostPopular}
                  </div>
                )}

                {/* Card Top Block */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg ${
                      plan.highlighted 
                        ? isDarkMode 
                          ? 'bg-orange-500/10 text-orange-400' 
                          : 'bg-orange-50 text-orange-600'
                        : isDarkMode 
                          ? 'bg-white/5 text-gray-400' 
                          : 'bg-slate-100 text-slate-500'
                    }`}>
                      {plan.target}
                    </span>
                    
                    <div className={`p-2.5 rounded-xl ${
                      plan.highlighted 
                        ? 'bg-orange-500/10 text-orange-500' 
                        : isDarkMode ? 'bg-white/5 text-gray-400' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <IconComponent size={20} />
                    </div>
                  </div>

                  <h3 className={`text-3xl sm:text-4xl font-extrabold italic tracking-tight mb-3 uppercase ${
                    isDarkMode ? 'text-white' : 'text-slate-950'
                  }`}>
                    {plan.name}
                  </h3>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl sm:text-5xl font-black ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {currentPrice}
                      </span>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-400' : 'text-slate-500'
                      }`}>
                        {local.mo}
                      </span>
                    </div>

                    {/* Old Price Crossed Out when Annual is active */}
                    {isAnnual && (
                      <span className="text-xs font-bold text-gray-400/80 line-through tracking-wide">
                        {plan.oldPrice}
                      </span>
                    )}
                  </div>
                </div>

                {/* Features Divider */}
                <hr className={`my-2 border-dashed ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`} />

                {/* Card Content Lists */}
                <div className="space-y-6 my-6 flex-1">
                  {/* Limits */}
                  <div className="space-y-3">
                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${
                      isDarkMode ? 'text-gray-400' : 'text-slate-500'
                    }`}>
                      {local.usageLimitsTitle}
                    </h4>
                    <ul className="space-y-2.5">
                      {plan.limits.map((limit, lIdx) => (
                        <li key={lIdx} className={`flex gap-3 text-xs sm:text-sm font-semibold leading-relaxed ${
                          isDarkMode ? 'text-gray-300' : 'text-slate-700'
                        }`}>
                          <Check size={16} className="text-orange-500 shrink-0 mt-0.5" />
                          <span>{limit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${
                      isDarkMode ? 'text-gray-400' : 'text-slate-500'
                    }`}>
                      {local.moreFeaturesTitle}
                    </h4>
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, fIdx) => (
                        <li key={fIdx} className={`flex gap-3 text-xs sm:text-sm font-medium leading-relaxed ${
                          isDarkMode ? 'text-gray-300' : 'text-slate-700'
                        }`}>
                          <Check size={16} className="text-orange-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* CTA Button */}
                <button 
                  type="button"
                  onClick={() => handleSubscribe(plan.id)}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 group relative overflow-hidden shadow-md active:scale-95 ${
                    plan.highlighted 
                      ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/20 hover:ring-2 hover:ring-orange-500/50' 
                      : isDarkMode
                        ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-orange-500/20 hover:ring-2 hover:ring-orange-500/20'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-orange-500 hover:ring-2 hover:ring-orange-500/20'
                  }`}
                >
                  {/* Sliding Sheen Overlay */}
                  <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
                  
                  {plan.cta}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Footer Guarantee */}
        <div className="mt-20 text-center">
          <p className={`text-[10px] sm:text-xs font-bold tracking-widest uppercase ${
            isDarkMode ? 'text-gray-600' : 'text-slate-500'
          }`}>
            {local.secureCloud}
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
