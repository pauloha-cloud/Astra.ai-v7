import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Cookie, Check, X } from 'lucide-react';

export interface CookiePreferences {
  essentials: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsentProps {
  isDarkMode: boolean;
  currentLang: 'pt' | 'en' | 'es';
  forceOpenPreferences?: boolean;
  onClosePreferences?: () => void;
}

export function CookieConsent({
  isDarkMode,
  currentLang,
  forceOpenPreferences = false,
  onClosePreferences
}: CookieConsentProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essentials: true,
    analytics: false,
    marketing: false
  });

  const translations = {
    pt: {
      bannerText: "Usamos cookies e tecnologias semelhantes para manter sua sessão, melhorar sua experiência e analisar o uso da plataforma.",
      btnAcceptAll: "Aceitar todos",
      btnRejectAll: "Recusar não essenciais",
      btnPreferences: "Gerenciar preferências",
      modalTitle: "Preferências de Cookies",
      modalDesc: "Gerencie suas preferências de privacidade e escolha quais categorias de cookies deseja ativar.",
      btnSave: "Salvar escolhas",
      categories: {
        essentials: {
          title: "Essenciais",
          status: "Sempre ativos",
          desc: "Necessários para login, segurança e funcionamento da plataforma."
        },
        analytics: {
          title: "Analytics",
          status: "Opcional",
          desc: "Usados para entender o uso da plataforma e melhorar funcionalidades."
        },
        marketing: {
          title: "Marketing",
          status: "Opcional",
          desc: "Usados para personalização e comunicações futuras."
        }
      }
    },
    en: {
      bannerText: "We use cookies and similar technologies to keep your session active, improve your experience, and analyze platform usage.",
      btnAcceptAll: "Accept all",
      btnRejectAll: "Reject non-essential",
      btnPreferences: "Manage preferences",
      modalTitle: "Cookie Preferences",
      modalDesc: "Manage your privacy preferences and choose which categories of cookies you want to enable.",
      btnSave: "Save choices",
      categories: {
        essentials: {
          title: "Essential",
          status: "Always active",
          desc: "Necessary for login, security, and the functioning of the platform."
        },
        analytics: {
          title: "Analytics",
          status: "Optional",
          desc: "Used to understand platform usage and improve features."
        },
        marketing: {
          title: "Marketing",
          status: "Optional",
          desc: "Used for personalization and future communications."
        }
      }
    },
    es: {
      bannerText: "Usamos cookies y tecnologías similares para mantener tu sesión, mejorar tu experiencia y analizar el uso de la plataforma.",
      btnAcceptAll: "Aceptar todos",
      btnRejectAll: "Rechazar no esenciales",
      btnPreferences: "Gestionar preferencias",
      modalTitle: "Preferencias de Cookies",
      modalDesc: "Gestione sus preferencias de privacidad y elija qué categorías de cookies desea activar.",
      btnSave: "Guardar elecciones",
      categories: {
        essentials: {
          title: "Esenciales",
          status: "Siempre activos",
          desc: "Necesarios para el inicio de sesión, la seguridad y el funcionamiento de la plataforma."
        },
        analytics: {
          title: "Analytics",
          status: "Opcional",
          desc: "Utilizados para comprender el uso de la plataforma y mejorar las funciones."
        },
        marketing: {
          title: "Marketing",
          status: "Opcional",
          desc: "Utilizados para personalización y comunicaciones futuras."
        }
      }
    }
  };

  const t = translations[currentLang] || translations.pt;

  useEffect(() => {
    const saved = localStorage.getItem('astra_cookie_consent');
    if (!saved) {
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(saved);
        setPreferences({
          essentials: true,
          analytics: !!parsed.analytics,
          marketing: !!parsed.marketing
        });
      } catch (e) {
        setShowBanner(true);
      }
    }
  }, []);

  useEffect(() => {
    if (forceOpenPreferences) {
      setShowModal(true);
    }
  }, [forceOpenPreferences]);

  const handleAcceptAll = () => {
    const allPrefs = { essentials: true, analytics: true, marketing: true };
    localStorage.setItem('astra_cookie_consent', JSON.stringify(allPrefs));
    setPreferences(allPrefs);
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    const essentialPrefs = { essentials: true, analytics: false, marketing: false };
    localStorage.setItem('astra_cookie_consent', JSON.stringify(essentialPrefs));
    setPreferences(essentialPrefs);
    setShowBanner(false);
  };

  const handleOpenPreferences = () => {
    setShowModal(true);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('astra_cookie_consent', JSON.stringify(preferences));
    setShowModal(false);
    setShowBanner(false);
    if (onClosePreferences) {
      onClosePreferences();
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (onClosePreferences) {
      onClosePreferences();
    }
  };

  return (
    <>
      {/* Banner: fixed at bottom of page with beautiful design */}
      <AnimatePresence>
        {showBanner && !showModal && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-[90] p-4 sm:p-6"
          >
            <div className={`max-w-7xl mx-auto rounded-3xl border p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-xl ${
              isDarkMode
                ? 'bg-black/90 border-zinc-800 text-white shadow-black/40'
                : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-900/10'
            }`}>
              <div className="flex items-start sm:items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-orange-600/10 flex items-center justify-center text-orange-500 shrink-0">
                  <Cookie size={24} className="animate-bounce" />
                </div>
                <p className="text-xs sm:text-sm font-medium leading-relaxed">
                  {t.bannerText}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                <button
                  onClick={handleOpenPreferences}
                  className={`py-2.5 px-4 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                    isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-850'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {t.btnPreferences}
                </button>
                <button
                  onClick={handleRejectAll}
                  className={`py-2.5 px-4 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                    isDarkMode
                      ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                  }`}
                >
                  {t.btnRejectAll}
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="py-2.5 px-5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-md shadow-orange-600/10 active:scale-95 cursor-pointer text-center"
                >
                  {t.btnAcceptAll}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preferences Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative w-full max-w-lg rounded-3xl border p-6 shadow-2xl overflow-hidden z-10 transition-colors ${
                isDarkMode
                  ? 'bg-[#0d0d0f] border-zinc-800 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-orange-600" />

              {/* Close Button */}
              <button
                onClick={handleCloseModal}
                className={`absolute top-4 right-4 p-2 rounded-xl transition-colors cursor-pointer ${
                  isDarkMode ? 'hover:bg-zinc-900 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-950'
                }`}
              >
                <X size={18} />
              </button>

              <div className="space-y-3 mb-6 pr-6">
                <h3 className="text-xl font-black italic tracking-tight uppercase flex items-center gap-2">
                  <Cookie className="text-orange-500" size={20} />
                  {t.modalTitle}
                </h3>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                  {t.modalDesc}
                </p>
              </div>

              {/* Preferences Category List */}
              <div className="space-y-4">
                {/* 1. Essentials */}
                <div className={`p-4 rounded-2xl border ${
                  isDarkMode ? 'bg-[#121215] border-zinc-800/80' : 'bg-slate-50/60 border-slate-200/80'
                }`}>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black uppercase tracking-wide">{t.categories.essentials.title}</h4>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-orange-600/10 text-orange-500 border border-orange-500/15 px-2 py-0.5 rounded-full shrink-0">
                        {t.categories.essentials.status}
                      </span>
                    </div>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                    {t.categories.essentials.desc}
                  </p>
                </div>

                {/* 2. Analytics */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-[#121215] border-zinc-800/80' : 'bg-slate-50/60 border-slate-200/80'
                }`}>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <h4 className="text-sm font-black uppercase tracking-wide">{t.categories.analytics.title}</h4>
                    <button
                      type="button"
                      onClick={() => setPreferences({ ...preferences, analytics: !preferences.analytics })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        preferences.analytics ? 'bg-orange-600' : (isDarkMode ? 'bg-zinc-800' : 'bg-slate-250')
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          preferences.analytics ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                    {t.categories.analytics.desc}
                  </p>
                </div>

                {/* 3. Marketing */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-[#121215] border-zinc-800/80' : 'bg-slate-50/60 border-slate-200/80'
                }`}>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <h4 className="text-sm font-black uppercase tracking-wide">{t.categories.marketing.title}</h4>
                    <button
                      type="button"
                      onClick={() => setPreferences({ ...preferences, marketing: !preferences.marketing })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        preferences.marketing ? 'bg-orange-600' : (isDarkMode ? 'bg-zinc-800' : 'bg-slate-250')
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          preferences.marketing ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                    {t.categories.marketing.desc}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-8 pt-4 border-t border-zinc-800/10 dark:border-zinc-800/80 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border cursor-pointer ${
                    isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
                  }`}
                >
                  X
                </button>
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="py-2.5 px-5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-md shadow-orange-600/10 active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  {t.btnSave}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
