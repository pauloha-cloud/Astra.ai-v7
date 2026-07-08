import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Settings, 
  Shield, 
  Globe, 
  Sun, 
  Moon, 
  Laptop,
  HelpCircle, 
  MessageSquare, 
  PlusCircle, 
  LogOut, 
  Sparkles, 
  Check, 
  CheckCircle, 
  X,
  ArrowRight,
  ChevronRight,
  HeartHandshake,
  FileText,
  Cookie
} from 'lucide-react';

interface SettingsViewProps {
  user: any;
  currentLang: 'pt' | 'en' | 'es';
  setCurrentLang: (lang: 'pt' | 'en' | 'es') => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  signOut: () => void;
  preferences: {
    defaultStudyFormat: 'summary' | 'quiz' | 'tutor' | 'mindmap';
    explanationLevel: 'basic' | 'intermediate' | 'advanced';
    defaultQuizQuestionCount: 5 | 10 | 15 | 20 | 25;
  };
  onUpdatePreference: (key: any, value: any) => void;
  onOpenPrivacyPolicy?: () => void;
  onOpenTermsOfUse?: () => void;
  onOpenCookiePrefs?: () => void;
}

export function SettingsView({
  user,
  currentLang,
  setCurrentLang,
  isDarkMode,
  setIsDarkMode,
  signOut,
  preferences,
  onUpdatePreference,
  onOpenPrivacyPolicy,
  onOpenTermsOfUse,
  onOpenCookiePrefs
}: SettingsViewProps) {
  const studyFormat = preferences.defaultStudyFormat;
  const explanationLevel = preferences.explanationLevel;
  const quizQuestionCount = preferences.defaultQuizQuestionCount;

  const setStudyFormat = (val: 'summary' | 'quiz' | 'tutor' | 'mindmap') => {
    onUpdatePreference('defaultStudyFormat', val);
  };

  const setExplanationLevel = (val: 'basic' | 'intermediate' | 'advanced') => {
    onUpdatePreference('explanationLevel', val);
  };

  const setQuizQuestionCount = (val: 5 | 10 | 15 | 20 | 25) => {
    onUpdatePreference('defaultQuizQuestionCount', val);
  };

  // Modal states
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Translations for the settings page itself
  const text = {
    pt: {
      title: "Configurações",
      subtitle: "Personalize sua experiência no Astra Learning.",
      sections: {
        account: "Conta",
        preferences: "Preferências",
        languageTheme: "Idioma e Tema",
        support: "Suporte e Feedback"
      },
      account: {
        plan: "Plano atual",
        viewPlans: "Ver planos",
        signOut: "Sair da conta",
        memberSince: "Explorador desde"
      },
      preferences: {
        formatLabel: "Formato padrão de estudo",
        levelLabel: "Nível de explicação",
        quizCountLabel: "Quantidade padrão de perguntas do quiz",
        formats: {
          summary: "Resumo",
          quiz: "Quiz",
          tutor: "Tutor",
          mindmap: "Mapa Mental"
        },
        levels: {
          basic: "Básico",
          intermediate: "Intermediário",
          advanced: "Avançado"
        }
      },
      langTheme: {
        langLabel: "Idioma da interface",
        themeLabel: "Tema",
        themes: {
          sun: "Sol",
          moon: "Lua",
          system: "Sistema"
        }
      },
      support: {
        feedbackBtn: "Enviar feedback",
        featureBtn: "Solicitar nova feature",
        faqBtn: "Visualizar FAQ",
        privacyBtn: "Política de Privacidade",
        termsBtn: "Termos de Uso",
        cookiesBtn: "Preferências de Cookies",
        modalTitleFeedback: "Enviar Feedback",
        modalTitleFeature: "Solicitar Nova Feature",
        placeholderFeedback: "Como podemos melhorar sua experiência com o Astra Learning?",
        placeholderFeature: "Que recurso ou integração você gostaria de ver?",
        sendBtn: "Enviar",
        successMsg: "Recebemos sua mensagem! Obrigado por nos ajudar a evoluir o Astra Learning.",
        closeBtn: "Fechar"
      },
      plans: {
        title: "Planos Disponíveis",
        desc: "Escolha o ideal para acelerar seu aprendizado.",
        freePlan: "Plano Free",
        freeDesc: "Funcionalidades essenciais de estudo.",
        proPlan: "Plano Pro",
        proDesc: "Tutor ilimitado, mapas avançados e exportação de dados.",
        active: "Ativo Atualmente",
        upgrade: "Fazer Upgrade",
        comingSoon: "Sistema de pagamento premium em breve no Astra Learning."
      }
    },
    en: {
      title: "Settings",
      subtitle: "Personalize your experience on Astra Learning.",
      sections: {
        account: "Account",
        preferences: "Preferences",
        languageTheme: "Language and Theme",
        support: "Support and Feedback"
      },
      account: {
        plan: "Current plan",
        viewPlans: "View plans",
        signOut: "Sign out",
        memberSince: "Explorer since"
      },
      preferences: {
        formatLabel: "Default study format",
        levelLabel: "Explanation level",
        quizCountLabel: "Default quiz questions quantity",
        formats: {
          summary: "Summary",
          quiz: "Quiz",
          tutor: "Tutor",
          mindmap: "Mind Map"
        },
        levels: {
          basic: "Basic",
          intermediate: "Intermediate",
          advanced: "Advanced"
        }
      },
      langTheme: {
        langLabel: "Interface language",
        themeLabel: "Theme",
        themes: {
          sun: "Sun",
          moon: "Moon",
          system: "System"
        }
      },
      support: {
        feedbackBtn: "Send feedback",
        featureBtn: "Request new feature",
        faqBtn: "View FAQ",
        privacyBtn: "Privacy Policy",
        termsBtn: "Terms of Use",
        cookiesBtn: "Cookie Preferences",
        modalTitleFeedback: "Send Feedback",
        modalTitleFeature: "Request New Feature",
        placeholderFeedback: "How can we improve your experience with Astra Learning?",
        placeholderFeature: "What feature or integration would you love to see?",
        sendBtn: "Send",
        successMsg: "Message received! Thank you for helping us evolve Astra Learning.",
        closeBtn: "Close"
      },
      plans: {
        title: "Available Plans",
        desc: "Choose the ideal plan to accelerate your learning.",
        freePlan: "Free Plan",
        freeDesc: "Essential study features.",
        proPlan: "Pro Plan",
        proDesc: "Unlimited tutor, advanced maps, and data export.",
        active: "Currently Active",
        upgrade: "Upgrade Now",
        comingSoon: "Premium checkout system coming soon to Astra Learning."
      }
    },
    es: {
      title: "Ajustes",
      subtitle: "Personaliza tu experiencia en Astra Learning.",
      sections: {
        account: "Cuenta",
        preferences: "Preferencias",
        languageTheme: "Idioma y Tema",
        support: "Soporte y Feedback"
      },
      account: {
        plan: "Plan actual",
        viewPlans: "Ver planes",
        signOut: "Cerrar sesión",
        memberSince: "Explorador desde"
      },
      preferences: {
        formatLabel: "Formato de estudio predeterminado",
        levelLabel: "Nivel de explicación",
        quizCountLabel: "Cantidad estándar de preguntas del quiz",
        formats: {
          summary: "Resumen",
          quiz: "Cuestionario",
          tutor: "Tutor",
          mindmap: "Mapa Mental"
        },
        levels: {
          basic: "Básico",
          intermediate: "Intermedio",
          advanced: "Avanzado"
        }
      },
      langTheme: {
        langLabel: "Idioma de interfaz",
        themeLabel: "Tema",
        themes: {
          sun: "Sol",
          moon: "Luna",
          system: "Sistema"
        }
      },
      support: {
        feedbackBtn: "Enviar feedback",
        featureBtn: "Solicitar nueva función",
        faqBtn: "Ver FAQ",
        privacyBtn: "Política de Privacidad",
        termsBtn: "Términos de Uso",
        cookiesBtn: "Preferencias de Cookies",
        modalTitleFeedback: "Enviar Feedback",
        modalTitleFeature: "Solicitar Nueva Función",
        placeholderFeedback: "¿Cómo podemos mejorar tu experiencia con Astra Learning?",
        placeholderFeature: "¿Qué función o integración te gustaría ver?",
        sendBtn: "Enviar",
        successMsg: "¡Mensaje recibido! Gracias por ayudarnos a evolucionar Astra Learning.",
        closeBtn: "Cerrar"
      },
      plans: {
        title: "Planes Disponibles",
        desc: "Elige el ideal para acelerar tu aprendizaje.",
        freePlan: "Plan Free",
        freeDesc: "Funcionalidades esenciales de estudio.",
        proPlan: "Plan Pro",
        proDesc: "Tutor ilimitado, mapas avanzados y exportación de datos.",
        active: "Activo Actualmente",
        upgrade: "Hacer Upgrade",
        comingSoon: "El sistema de pago premium llegará pronto a Astra Learning."
      }
    }
  };

  const t = text[currentLang] || text.pt;

  // Custom User Avatar Placeholder Generator
  const userInitials = user?.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : (user?.email ? user.email[0].toUpperCase() : 'A');

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    
    // Simulating API submit success
    setFeedbackSuccess(true);
    setTimeout(() => {
      setFeedbackSuccess(false);
      setShowFeedbackModal(null);
      setFeedbackText('');
    }, 2500);
  };

  const handleSystemTheme = () => {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(systemPrefersDark);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-black italic tracking-tight uppercase text-orange-600 drop-shadow-[0_0_15px_rgba(234,88,12,0.1)]">
          {t.title}
        </h1>
        <p className={`text-sm sm:text-base font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
          {t.subtitle}
        </p>
      </div>

      {/* Main Grid: 2 columns in desktop, 1 column in mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Account */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`p-6 rounded-3xl border flex flex-col justify-between shadow-sm transition-all duration-300 ${
            isDarkMode 
              ? 'bg-[#0c0c0e] border-zinc-800/80 hover:border-zinc-700/80 shadow-black/20' 
              : 'bg-white border-slate-200/80 hover:shadow-md hover:shadow-slate-100/50'
          }`}
          id="settings_card_account"
        >
          <div className="space-y-5">
            <h3 className={`font-bold uppercase tracking-wider text-xs flex items-center gap-2 ${
              isDarkMode ? 'text-zinc-400' : 'text-slate-500'
            }`}>
              <User size={16} className="text-orange-500" /> {t.sections.account}
            </h3>

            <div className="flex items-center gap-4 py-1">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="" 
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-full border-2 border-orange-500/30 object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-600 to-amber-500 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-orange-600/15">
                  {userInitials}
                </div>
              )}
              
              <div className="min-w-0 flex-1">
                <h4 className={`font-black text-lg truncate leading-tight ${
                  isDarkMode ? 'text-zinc-100' : 'text-slate-900'
                }`}>
                  {user?.displayName || (user?.email ? user.email.split('@')[0] : 'Explorador')}
                </h4>
                <p className={`text-xs truncate font-medium mt-1 ${
                  isDarkMode ? 'text-zinc-500' : 'text-slate-500'
                }`}>
                  {user?.email || 'pauloazevedo2@gmail.com'}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
                    isDarkMode 
                      ? 'bg-orange-600/10 text-orange-400 border border-orange-500/20' 
                      : 'bg-orange-50 text-orange-700 border border-orange-100'
                  }`}>
                    {t.account.plan}: <span className="underline">Free</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-8 pt-4 border-t border-dashed border-zinc-800/10 dark:border-zinc-800/80">
            <button
              onClick={() => setShowPlansModal(true)}
              className="flex-1 py-3 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 text-center shadow-lg shadow-orange-600/15 active:scale-95 cursor-pointer"
            >
              {t.account.viewPlans}
            </button>
            <button
              onClick={signOut}
              className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border cursor-pointer ${
                isDarkMode 
                  ? 'bg-zinc-900/50 hover:bg-red-500/10 border-zinc-800 text-zinc-400 hover:text-red-500 hover:border-red-500/30' 
                  : 'bg-slate-50 hover:bg-red-50/50 border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200'
              }`}
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">{t.account.signOut}</span>
            </button>
          </div>
        </motion.div>

        {/* Card 2: Preferences */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-6 rounded-3xl border flex flex-col justify-between shadow-sm transition-all duration-300 ${
            isDarkMode 
              ? 'bg-[#0c0c0e] border-zinc-800/80 hover:border-zinc-700/80 shadow-black/20' 
              : 'bg-white border-slate-200/80 hover:shadow-md hover:shadow-slate-100/50'
          }`}
          id="settings_card_preferences"
        >
          <div className="space-y-5">
            <h3 className={`font-bold uppercase tracking-wider text-xs flex items-center gap-2 ${
              isDarkMode ? 'text-zinc-400' : 'text-slate-500'
            }`}>
              <Settings size={16} className="text-orange-500" /> {t.sections.preferences}
            </h3>

            {/* Default Study Format */}
            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase tracking-wider block ${
                isDarkMode ? 'text-zinc-500' : 'text-slate-500'
              }`}>
                {t.preferences.formatLabel}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['summary', 'quiz', 'tutor', 'mindmap'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setStudyFormat(fmt)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide border transition-all cursor-pointer ${
                      studyFormat === fmt
                        ? 'bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-600/10'
                        : isDarkMode
                          ? 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                    }`}
                  >
                    {t.preferences.formats[fmt]}
                  </button>
                ))}
              </div>
            </div>

            {/* Level of Explanation */}
            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase tracking-wider block ${
                isDarkMode ? 'text-zinc-500' : 'text-slate-500'
              }`}>
                {t.preferences.levelLabel}
              </label>
              <div className="flex gap-2">
                {(['basic', 'intermediate', 'advanced'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setExplanationLevel(lvl)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide border transition-all cursor-pointer ${
                      explanationLevel === lvl
                        ? 'bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-600/10'
                        : isDarkMode
                          ? 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                    }`}
                  >
                    {t.preferences.levels[lvl]}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Quiz Question Count */}
            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase tracking-wider block ${
                isDarkMode ? 'text-zinc-500' : 'text-slate-500'
              }`}>
                {t.preferences.quizCountLabel}
              </label>
              <div className="flex gap-2">
                {([5, 10, 15, 20, 25] as const).map((num) => (
                  <button
                    key={num}
                    onClick={() => setQuizQuestionCount(num)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      quizQuestionCount === num
                        ? 'bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-600/10'
                        : isDarkMode
                          ? 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Idioma e Tema */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`p-6 rounded-3xl border flex flex-col justify-between shadow-sm transition-all duration-300 ${
            isDarkMode 
              ? 'bg-[#0c0c0e] border-zinc-800/80 hover:border-zinc-700/80 shadow-black/20' 
              : 'bg-white border-slate-200/80 hover:shadow-md hover:shadow-slate-100/50'
          }`}
          id="settings_card_language_theme"
        >
          <div className="space-y-5">
            <h3 className={`font-bold uppercase tracking-wider text-xs flex items-center gap-2 ${
              isDarkMode ? 'text-zinc-400' : 'text-slate-500'
            }`}>
              <Globe size={16} className="text-orange-500" /> {t.sections.languageTheme}
            </h3>

            {/* Language Selector */}
            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase tracking-wider block ${
                isDarkMode ? 'text-zinc-500' : 'text-slate-500'
              }`}>
                {t.langTheme.langLabel}
              </label>
              <div className="flex gap-2">
                {(['pt', 'en', 'es'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setCurrentLang(lang)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all cursor-pointer ${
                      currentLang === lang
                        ? 'bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-600/10'
                        : isDarkMode
                          ? 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Selector */}
            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase tracking-wider block ${
                isDarkMode ? 'text-zinc-500' : 'text-slate-500'
              }`}>
                {t.langTheme.themeLabel}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsDarkMode(false)}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    !isDarkMode
                      ? 'bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-600/10'
                      : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <Sun size={14} />
                  <span>{t.langTheme.themes.sun}</span>
                </button>
                
                <button
                  onClick={() => setIsDarkMode(true)}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isDarkMode
                      ? 'bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-600/10'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                  }`}
                >
                  <Moon size={14} />
                  <span>{t.langTheme.themes.moon}</span>
                </button>

                <button
                  onClick={handleSystemTheme}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isDarkMode
                      ? 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                  }`}
                >
                  <Laptop size={14} />
                  <span>{t.langTheme.themes.system}</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 4: Suporte e Feedback */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-6 rounded-3xl border flex flex-col justify-between shadow-sm transition-all duration-300 ${
            isDarkMode 
              ? 'bg-[#0c0c0e] border-zinc-800/80 hover:border-zinc-700/80 shadow-black/20' 
              : 'bg-white border-slate-200/80 hover:shadow-md hover:shadow-slate-100/50'
          }`}
          id="settings_card_support"
        >
          <div className="space-y-5">
            <h3 className={`font-bold uppercase tracking-wider text-xs flex items-center gap-2 ${
              isDarkMode ? 'text-zinc-400' : 'text-slate-500'
            }`}>
              <HelpCircle size={16} className="text-orange-500" /> {t.sections.support}
            </h3>

            <div className="flex flex-col gap-2.5">
              {/* Send Feedback Button */}
              <button
                onClick={() => {
                  setShowFeedbackModal('feedback');
                  setFeedbackText('');
                }}
                className={`w-full p-3.5 rounded-xl border text-xs font-black uppercase tracking-widest text-left flex items-center justify-between transition-colors group cursor-pointer ${
                  isDarkMode 
                    ? 'bg-zinc-900/30 border-zinc-800/80 text-zinc-300 hover:border-orange-500/35 hover:text-white hover:bg-zinc-900/50' 
                    : 'bg-slate-50 border-slate-200/60 text-slate-700 hover:border-orange-500/20 hover:text-slate-900 hover:bg-slate-100/30 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare size={16} className="text-orange-500" />
                  <span>{t.support.feedbackBtn}</span>
                </div>
                <ChevronRight size={16} className="text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Request Feature Button */}
              <button
                onClick={() => {
                  setShowFeedbackModal('feature');
                  setFeedbackText('');
                }}
                className={`w-full p-3.5 rounded-xl border text-xs font-black uppercase tracking-widest text-left flex items-center justify-between transition-colors group cursor-pointer ${
                  isDarkMode 
                    ? 'bg-zinc-900/30 border-zinc-800/80 text-zinc-300 hover:border-orange-500/35 hover:text-white hover:bg-zinc-900/50' 
                    : 'bg-slate-50 border-slate-200/60 text-slate-700 hover:border-orange-500/20 hover:text-slate-900 hover:bg-slate-100/30 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sparkles size={16} className="text-orange-500" />
                  <span>{t.support.featureBtn}</span>
                </div>
                <ChevronRight size={16} className="text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* View FAQ */}
              <a
                href="#faq"
                className={`w-full p-3.5 rounded-xl border text-xs font-black uppercase tracking-widest text-left flex items-center justify-between transition-colors group cursor-pointer ${
                  isDarkMode 
                    ? 'bg-zinc-900/30 border-zinc-800/80 text-zinc-300 hover:border-orange-500/35 hover:text-white hover:bg-zinc-900/50' 
                    : 'bg-slate-50 border-slate-200/60 text-slate-700 hover:border-orange-500/20 hover:text-slate-900 hover:bg-slate-100/30 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <HeartHandshake size={16} className="text-orange-500" />
                  <span>{t.support.faqBtn}</span>
                </div>
                <ChevronRight size={16} className="text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
              </a>

              {/* Privacy Policy */}
              <button
                type="button"
                onClick={onOpenPrivacyPolicy}
                className={`w-full p-3.5 rounded-xl border text-xs font-black uppercase tracking-widest text-left flex items-center justify-between transition-colors group cursor-pointer ${
                  isDarkMode 
                    ? 'bg-zinc-900/30 border-zinc-800/80 text-zinc-300 hover:border-orange-500/35 hover:text-white hover:bg-zinc-900/50' 
                    : 'bg-slate-50 border-slate-200/60 text-slate-700 hover:border-orange-500/20 hover:text-slate-900 hover:bg-slate-100/30 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-orange-500" />
                  <span>{t.support.privacyBtn}</span>
                </div>
                <ChevronRight size={16} className="text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Terms of Use */}
              <button
                type="button"
                onClick={onOpenTermsOfUse}
                className={`w-full p-3.5 rounded-xl border text-xs font-black uppercase tracking-widest text-left flex items-center justify-between transition-colors group cursor-pointer ${
                  isDarkMode 
                    ? 'bg-zinc-900/30 border-zinc-800/80 text-zinc-300 hover:border-orange-500/35 hover:text-white hover:bg-zinc-900/50' 
                    : 'bg-slate-50 border-slate-200/60 text-slate-700 hover:border-orange-500/20 hover:text-slate-900 hover:bg-slate-100/30 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-orange-500" />
                  <span>{t.support.termsBtn}</span>
                </div>
                <ChevronRight size={16} className="text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Cookie Preferences */}
              <button
                type="button"
                onClick={onOpenCookiePrefs}
                className={`w-full p-3.5 rounded-xl border text-xs font-black uppercase tracking-widest text-left flex items-center justify-between transition-colors group cursor-pointer ${
                  isDarkMode 
                    ? 'bg-zinc-900/30 border-zinc-800/80 text-zinc-300 hover:border-orange-500/35 hover:text-white hover:bg-zinc-900/50' 
                    : 'bg-slate-50 border-slate-200/60 text-slate-700 hover:border-orange-500/20 hover:text-slate-900 hover:bg-slate-100/30 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Cookie size={16} className="text-orange-500" />
                  <span>{t.support.cookiesBtn}</span>
                </div>
                <ChevronRight size={16} className="text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* --- MODAL 1: PRE-DEFINED PLANS DIALOG --- */}
      <AnimatePresence>
        {showPlansModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPlansModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative w-full max-w-xl rounded-3xl border p-6 shadow-2xl overflow-hidden z-10 transition-colors ${
                isDarkMode 
                  ? 'bg-[#0d0d0f] border-zinc-800 text-white' 
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-orange-600" />
              
              {/* Close button */}
              <button
                onClick={() => setShowPlansModal(false)}
                className={`absolute top-4 right-4 p-2 rounded-xl transition-colors cursor-pointer ${
                  isDarkMode ? 'hover:bg-zinc-900 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-950'
                }`}
              >
                <X size={18} />
              </button>

              <div className="space-y-4 pr-6 mb-6">
                <h3 className="text-xl font-black italic tracking-tight uppercase flex items-center gap-2">
                  <Shield className="text-orange-500" size={20} />
                  {t.plans.title}
                </h3>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                  {t.plans.desc}
                </p>
              </div>

              {/* Grid of Plans */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Free Plan card */}
                <div className={`p-5 rounded-2xl border flex flex-col justify-between h-44 ${
                  isDarkMode 
                    ? 'bg-zinc-900/30 border-orange-500/20' 
                    : 'bg-orange-50/10 border-orange-500/20'
                }`}>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase bg-orange-600/15 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-full inline-block mb-1">
                      {t.plans.active}
                    </span>
                    <h4 className="text-base font-black uppercase tracking-wide">{t.plans.freePlan}</h4>
                    <p className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>{t.plans.freeDesc}</p>
                  </div>
                  <div className="text-xl font-black italic text-orange-500">
                    $0.00 <span className="text-[10px] font-bold not-italic text-zinc-400 uppercase">/mês</span>
                  </div>
                </div>

                {/* Pro Plan card */}
                <div className={`p-5 rounded-2xl border flex flex-col justify-between h-44 cursor-pointer hover:border-orange-500 transition-all ${
                  isDarkMode 
                    ? 'bg-[#121217] border-zinc-800' 
                    : 'bg-slate-50 border-slate-200'
                }`} onClick={() => alert(t.plans.comingSoon)}>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full inline-block mb-1">
                      PRO
                    </span>
                    <h4 className="text-base font-black uppercase tracking-wide">{t.plans.proPlan}</h4>
                    <p className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>{t.plans.proDesc}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-black italic text-orange-500">
                      $29.90 <span className="text-[10px] font-bold not-italic text-zinc-400 uppercase">/mês</span>
                    </div>
                    <ChevronRight size={16} className="text-orange-500 animate-pulse" />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/10 dark:border-zinc-800/80 flex justify-end">
                <button
                  onClick={() => setShowPlansModal(false)}
                  className={`py-2 px-5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border cursor-pointer ${
                    isDarkMode 
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800' 
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {t.support.closeBtn}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: FEEDBACK / FEATURE REQUEST DIALOG --- */}
      <AnimatePresence>
        {showFeedbackModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFeedbackModal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative w-full max-w-md rounded-3xl border p-6 shadow-2xl overflow-hidden z-10 transition-colors ${
                isDarkMode 
                  ? 'bg-[#0d0d0f] border-zinc-800 text-white' 
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-orange-600" />
              
              {/* Close button */}
              <button
                onClick={() => setShowFeedbackModal(null)}
                className={`absolute top-4 right-4 p-2 rounded-xl transition-colors cursor-pointer ${
                  isDarkMode ? 'hover:bg-zinc-900 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-950'
                }`}
              >
                <X size={18} />
              </button>

              {feedbackSuccess ? (
                <div className="flex flex-col items-center text-center space-y-4 py-8 animate-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/10">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-wide text-emerald-500 italic">
                    {currentLang === 'pt' ? 'Sucesso!' : currentLang === 'es' ? '¡Éxito!' : 'Success!'}
                  </h3>
                  <p className={`text-xs leading-relaxed max-w-xs ${isDarkMode ? 'text-gray-350' : 'text-slate-600'}`}>
                    {t.support.successMsg}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendFeedback} className="space-y-4">
                  <h3 className="text-lg font-black italic tracking-tight uppercase flex items-center gap-2">
                    {showFeedbackModal === 'feedback' ? (
                      <>
                        <MessageSquare className="text-orange-500" size={18} />
                        {t.support.modalTitleFeedback}
                      </>
                    ) : (
                      <>
                        <Sparkles className="text-orange-500" size={18} />
                        {t.support.modalTitleFeature}
                      </>
                    )}
                  </h3>

                  <div className="space-y-1.5">
                    <textarea
                      required
                      rows={4}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder={
                        showFeedbackModal === 'feedback' 
                          ? t.support.placeholderFeedback 
                          : t.support.placeholderFeature
                      }
                      className={`w-full rounded-2xl border p-4 text-xs focus:outline-none focus:ring-2 focus:ring-orange-600/50 transition-all resize-none ${
                        isDarkMode 
                          ? 'bg-[#121214] border-zinc-800 text-white placeholder-gray-500 focus:border-orange-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-600 focus:bg-white'
                      }`}
                    />
                  </div>

                  <div className="flex gap-3 pt-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowFeedbackModal(null)}
                      className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border cursor-pointer ${
                        isDarkMode 
                          ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800' 
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {t.support.closeBtn}
                    </button>
                    <button
                      type="submit"
                      className="py-2 px-5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-md shadow-orange-600/10 active:scale-95 cursor-pointer"
                    >
                      {t.support.sendBtn}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
