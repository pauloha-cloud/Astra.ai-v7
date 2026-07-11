import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, ArrowRight, Sparkles, CreditCard, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface BillingSuccessProps {
  isDarkMode?: boolean;
  currentLang?: 'pt' | 'en' | 'es';
  onBackToDashboard: () => void;
}

export const BillingSuccess = ({
  isDarkMode = true,
  currentLang = 'pt',
  onBackToDashboard,
}: BillingSuccessProps) => {
  const { user } = useAuth();
  const [fetchedPlan, setFetchedPlan] = useState<string>('');
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [portalLoading, setPortalLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const planLabels: Record<string, Record<string, string>> = {
    pt: {
      free: 'Gratuito',
      start: 'Starter',
      explorer: 'Explorer',
      pro: 'Pro'
    },
    en: {
      free: 'Free',
      start: 'Starter',
      explorer: 'Explorer',
      pro: 'Pro'
    },
    es: {
      free: 'Gratuito',
      start: 'Starter',
      explorer: 'Explorer',
      pro: 'Pro'
    }
  };

  const currentLabels = planLabels[currentLang] || planLabels.pt;

  const getPlanLabel = (plan: string) => {
    const normalized = (plan || 'free').toLowerCase();
    return currentLabels[normalized] || normalized.toUpperCase();
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setIsFetching(false);
        return;
      }
      try {
        setIsFetching(true);
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setFetchedPlan(data.plan || 'free');
        }
      } catch (err) {
        console.error('Error fetching user document in success page:', err);
      } finally {
        setIsFetching(false);
      }
    };

    fetchUserData();
    
    // Poll a few times just in case Firestore is still updating from the webhook
    const intervals = [1000, 3000, 5000];
    const timers = intervals.map(delay => 
      setTimeout(fetchUserData, delay)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [user]);

  const handleManageSubscription = async () => {
    if (!user) return;
    try {
      setPortalLoading(true);
      setErrorMessage(null);
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create portal session');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned from server');
      }
    } catch (err: any) {
      console.error('Error opening billing portal:', err);
      setErrorMessage(
        currentLang === 'pt' 
          ? 'Não foi possível carregar o portal. Verifique se possui uma assinatura ativa ou tente mais tarde.' 
          : currentLang === 'es'
            ? 'No se pudo cargar el portal. Verifique si tiene una suscripción activa o intente más tarde.'
            : 'Could not load the portal. Make sure you have an active subscription or try again later.'
      );
    } finally {
      setPortalLoading(false);
    }
  };

  const t = {
    pt: {
      title: "Assinatura Ativada!",
      subtitle: "Sua conta foi atualizada com sucesso.",
      description: "Obrigado por fazer parte do Astra Learning! Seu pagamento foi processado com segurança e seus novos limites e recursos premium já estão liberados em sua conta.",
      activePlan: "Plano Ativo:",
      cta: "Ir para o Painel de Estudos",
      manageBtn: "Gerenciar assinatura",
      secured: "Transação 100% segura via Stripe",
      loading: "Buscando dados da conta..."
    },
    en: {
      title: "Subscription Activated!",
      subtitle: "Your account has been successfully upgraded.",
      description: "Thank you for joining Astra Learning! Your payment has been processed securely, and your new limits and premium features are now unlocked in your account.",
      activePlan: "Active Plan:",
      cta: "Go to Study Dashboard",
      manageBtn: "Manage subscription",
      secured: "100% secure transaction via Stripe",
      loading: "Fetching account data..."
    },
    es: {
      title: "¡Suscripción Activada!",
      subtitle: "Tu cuenta ha sido actualizada con éxito.",
      description: "¡Gracias por unirte a Astra Learning! Tu pago se procesó de forma segura y tus nuevos límites y funciones premium ya están activos en tu cuenta.",
      activePlan: "Plan Activo:",
      cta: "Ir al Panel de Estudios",
      manageBtn: "Gestionar suscripción",
      secured: "Transacción 100% segura vía Stripe",
      loading: "Buscando datos de la cuenta..."
    },
  }[currentLang] || {
    pt: {
      title: "Assinatura Ativada!",
      subtitle: "Sua conta foi atualizada com sucesso.",
      description: "Obrigado por fazer parte do Astra Learning! Seu pagamento foi processado com segurança e seus novos limites e recursos premium já estão liberados em sua conta.",
      activePlan: "Plano Ativo:",
      cta: "Ir para o Painel de Estudos",
      manageBtn: "Gerenciar assinatura",
      secured: "Transação 100% segura via Stripe",
      loading: "Buscando dados da conta..."
    },
  }.pt;

  return (
    <div className={`min-h-[80vh] flex flex-col items-center justify-center p-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full max-w-lg p-8 sm:p-10 rounded-3xl border text-center shadow-2xl relative overflow-hidden ${
          isDarkMode 
            ? 'bg-[#0c0d12]/95 border-zinc-800/80 shadow-black/50' 
            : 'bg-white border-slate-200 shadow-slate-100'
        }`}
      >
        {/* Glow behind icon */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-orange-600/10 rounded-full blur-[60px] pointer-events-none" />

        {/* Dynamic Success Mark */}
        <div className="relative mb-8 inline-flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-20 h-20 bg-orange-600/10 text-orange-500 rounded-full flex items-center justify-center border border-orange-500/20 shadow-[0_0_40px_-5px_rgba(234,88,12,0.4)]"
          >
            <CheckCircle size={40} className="stroke-[2.5]" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute -top-1 -right-1 text-yellow-400"
          >
            <Sparkles size={20} className="fill-yellow-400" />
          </motion.div>
        </div>

        {/* Title & Description */}
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3 italic uppercase">
          {t.title}
        </h1>
        <p className={`text-sm font-semibold mb-6 uppercase tracking-wider ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
          {t.subtitle}
        </p>
        <p className={`text-sm leading-relaxed mb-6 ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
          {t.description}
        </p>

        {/* Plan Display Box */}
        <div className={`p-4 rounded-2xl mb-8 flex flex-col items-center justify-center border ${
          isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-slate-50 border-slate-200'
        }`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
            {t.activePlan}
          </span>
          {isFetching && !fetchedPlan ? (
            <div className="flex items-center gap-2 mt-1">
              <Loader2 size={14} className="animate-spin text-orange-500" />
              <span className="text-xs font-semibold text-zinc-500">{t.loading}</span>
            </div>
          ) : (
            <span className="text-xl font-black italic tracking-wide text-orange-500 uppercase mt-1">
              {getPlanLabel(fetchedPlan)}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBackToDashboard}
            className="w-full py-4 px-6 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest transition-all duration-300 shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {t.cta}
            <ArrowRight size={16} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 border flex items-center justify-center gap-2 cursor-pointer ${
              isDarkMode 
                ? 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900' 
                : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {portalLoading ? (
              <Loader2 size={16} className="animate-spin text-orange-500" />
            ) : (
              <CreditCard size={16} className="text-orange-500" />
            )}
            {t.manageBtn}
          </motion.button>
        </div>

        {errorMessage && (
          <p className="text-red-500 text-xs mt-3 font-semibold">
            {errorMessage}
          </p>
        )}

        {/* Secured Label */}
        <p className={`text-[10px] mt-6 uppercase tracking-wider font-semibold ${isDarkMode ? 'text-gray-600' : 'text-slate-400'}`}>
          {t.secured}
        </p>
      </motion.div>
    </div>
  );
};
