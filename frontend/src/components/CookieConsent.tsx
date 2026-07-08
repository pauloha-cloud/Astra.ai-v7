import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, Check, X } from 'lucide-react';

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
  onOpenPrivacyPolicy?: () => void;
}

export function CookieConsent({
  isDarkMode,
  currentLang,
  forceOpenPreferences = false,
  onClosePreferences,
  onOpenPrivacyPolicy
}: CookieConsentProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essentials: true,
    analytics: false,
    marketing: false
  });

  const bannerTranslations = {
    pt: {
      text: "Usamos cookies e armazenamento do navegador para manter sua sessão, lembrar preferências e melhorar sua experiência com o Astra Learning. Consulte nossa ",
      link: "Política de Privacidade",
      btn: "Entendi"
    },
    en: {
      text: "We use cookies and browser storage to keep your session active, remember preferences, and improve your Astra Learning experience. See our ",
      link: "Privacy Policy",
      btn: "Got it"
    },
    es: {
      text: "Usamos cookies y almacenamiento del navegador para mantener tu sesión, recordar preferencias y mejorar tu experiencia en Astra Learning. Consulta nuestra ",
      link: "Política de Privacidad",
      btn: "Entendido"
    }
  };

  const modalTranslations = {
    pt: {
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

  const bannerText = bannerTranslations[currentLang] || bannerTranslations.pt;
  const modalText = modalTranslations[currentLang] || modalTranslations.pt;

  useEffect(() => {
    // Check if user already accepted the new cookie/privacy notice
    const savedNotice = localStorage.getItem('astra_cookie_notice_accepted');
    if (!savedNotice) {
      setShowBanner(true);
    }

    // Populate cookie choices if saved previously
    const savedPrefs = localStorage.getItem('astra_cookie_consent');
    if (savedPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        setPreferences({
          essentials: true,
          analytics: !!parsed.analytics,
          marketing: !!parsed.marketing
        });
      } catch (e) {
        // Safe fallback
      }
    }
  }, []);

  useEffect(() => {
    if (forceOpenPreferences) {
      setShowModal(true);
    }
  }, [forceOpenPreferences]);

  const handleAccept = () => {
    localStorage.setItem('astra_cookie_notice_accepted', 'true');
    // Also save preferences of essentials + optional as per banner acceptance
    const defaultConsent = { essentials: true, analytics: true, marketing: true };
    localStorage.setItem('astra_cookie_consent', JSON.stringify(defaultConsent));
    setPreferences(defaultConsent);
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('astra_cookie_notice_accepted', 'true');
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
      {/* Discrete Floating Privacy & Cookies Banner (Bottom Right) */}
      <AnimatePresence>
        {showBanner && !showModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[90] w-[calc(100%-2rem)] mx-4 sm:mx-0 sm:w-96 rounded-2xl border p-5 shadow-2xl backdrop-blur-md transition-all ${
              isDarkMode
                ? 'bg-[#0d0d0f]/95 border-zinc-800/90 text-white shadow-black/40'
                : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-900/10'
            }`}
          >
            {/* Close Button "X" */}
            <button
              onClick={handleAccept}
              className={`absolute top-3 right-3 p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDarkMode
                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  : 'hover:bg-slate-100 text-slate-400 hover:text-slate-650'
              }`}
            >
              <X size={14} />
            </button>

            {/* Layout Content */}
            <div className="flex items-start gap-3.5 pr-4">
              <div className="w-9 h-9 rounded-full bg-orange-600/10 flex items-center justify-center text-orange-500 shrink-0">
                <Cookie size={18} />
              </div>
              <div className="flex-1">
                <p className={`text-xs sm:text-sm leading-relaxed mb-3.5 ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                  {bannerText.text}
                  <button
                    type="button"
                    onClick={onOpenPrivacyPolicy}
                    className="text-orange-500 hover:underline font-bold inline cursor-pointer text-left"
                  >
                    {bannerText.link}
                  </button>
                  .
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowModal(true)}
                    className={`py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border cursor-pointer text-center ${
                      isDarkMode
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {currentLang === 'pt' ? 'Gerenciar' : currentLang === 'es' ? 'Gestionar' : 'Manage'}
                  </button>
                  <button
                    onClick={handleAccept}
                    className="py-1.5 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-md shadow-orange-600/10 active:scale-95 cursor-pointer text-center"
                  >
                    {bannerText.btn}
                  </button>
                </div>
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
                  {modalText.modalTitle}
                </h3>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                  {modalText.modalDesc}
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
                      <h4 className="text-sm font-black uppercase tracking-wide">{modalText.categories.essentials.title}</h4>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-orange-600/10 text-orange-500 border border-orange-500/15 px-2 py-0.5 rounded-full shrink-0">
                        {modalText.categories.essentials.status}
                      </span>
                    </div>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                    {modalText.categories.essentials.desc}
                  </p>
                </div>

                {/* 2. Analytics */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-[#121215] border-zinc-800/80' : 'bg-slate-50/60 border-slate-200/80'
                }`}>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <h4 className="text-sm font-black uppercase tracking-wide">{modalText.categories.analytics.title}</h4>
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
                    {modalText.categories.analytics.desc}
                  </p>
                </div>

                {/* 3. Marketing */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-[#121215] border-zinc-800/80' : 'bg-slate-50/60 border-slate-200/80'
                }`}>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <h4 className="text-sm font-black uppercase tracking-wide">{modalText.categories.marketing.title}</h4>
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
                    {modalText.categories.marketing.desc}
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
                  {currentLang === 'pt' ? 'Cancelar' : currentLang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="py-2.5 px-5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-md shadow-orange-600/10 active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  {modalText.btnSave}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
