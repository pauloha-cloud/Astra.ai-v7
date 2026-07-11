import { motion } from 'motion/react';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

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
  const t = {
    pt: {
      title: "Assinatura Ativada!",
      subtitle: "Sua conta foi atualizada com sucesso.",
      description: "Obrigado por fazer parte do Astra Learning Pro! Seu pagamento foi processado com segurança e seus novos limites e recursos premium já estão liberados em sua conta. Comece a explorar agora!",
      cta: "Ir para o Painel de Estudos",
      secured: "Transação 100% segura via Stripe",
    },
    en: {
      title: "Subscription Activated!",
      subtitle: "Your account has been successfully upgraded.",
      description: "Thank you for joining Astra Learning Pro! Your payment has been processed securely, and your new limits and premium features are now unlocked in your account. Start exploring now!",
      cta: "Go to Study Dashboard",
      secured: "100% secure transaction via Stripe",
    },
    es: {
      title: "¡Suscripción Activada!",
      subtitle: "Tu cuenta ha sido actualizada con éxito.",
      description: "¡Gracias por unirte a Astra Learning Pro! Tu pago se procesó de forma segura y tus nuevos límites y funciones premium ya están activos en tu cuenta. ¡Comienza a explorar ahora!",
      cta: "Ir al Panel de Estudios",
      secured: "Transacción 100% segura vía Stripe",
    },
  }[currentLang] || {
    pt: {
      title: "Assinatura Ativada!",
      subtitle: "Sua conta foi atualizada com sucesso.",
      description: "Obrigado por fazer parte do Astra Learning Pro! Seu pagamento foi processado com segurança e seus novos limites e recursos premium já estão liberados em sua conta. Comece a explorar agora!",
      cta: "Ir para o Painel de Estudos",
      secured: "Transação 100% segura via Stripe",
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
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
          {t.title}
        </h1>
        <p className={`text-sm font-semibold mb-6 uppercase tracking-wider ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
          {t.subtitle}
        </p>
        <p className={`text-sm leading-relaxed mb-8 ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
          {t.description}
        </p>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBackToDashboard}
          className="w-full py-4 px-6 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest transition-all duration-300 shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer animate-pulse"
        >
          {t.cta}
          <ArrowRight size={16} />
        </motion.button>

        {/* Secured Label */}
        <p className={`text-[10px] mt-6 uppercase tracking-wider font-semibold ${isDarkMode ? 'text-gray-600' : 'text-slate-400'}`}>
          {t.secured}
        </p>
      </motion.div>
    </div>
  );
};
