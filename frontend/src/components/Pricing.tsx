import { motion } from 'motion/react';
import { Check, X, Zap, Shield, Rocket, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface Props {
  t: any;
  isDarkMode?: boolean;
}

export const Pricing = ({ t, isDarkMode = true }: Props) => {
  const { user } = useAuth();

  const plans = [
    {
      id: 'free',
      name: t.freeTrial,
      target: t.tryPlatform,
      price: '$0',
      description: t.freeTrialDesc,
      limits: [
        t.limitVidsWeek,
        t.limitDuration15
      ],
      features: [
        { text: t.featBasicSummary, included: true },
        { text: t.featDefaultLang, included: true },
        { text: t.featLimitedHist, included: true },
        { text: t.featPptx, included: false },
        { text: t.featFullTutor, included: false }
      ],
      cta: t.startFreeTrial,
      accentColor: 'gray'
    },
    {
      id: 'basic',
      name: t.basicPlan,
      target: t.individualStudents,
      price: '$12',
      description: t.perMonth,
      limits: [
        t.limitVidsMonth50,
        t.limitDuration60
      ],
      features: [
        { text: t.featFullSummary, included: true },
        { text: t.featQuizGen, included: true },
        { text: t.featMultiLang, included: true },
        { text: t.featBasicMindmap, included: true },
        { text: t.featStandardHist, included: true }
      ],
      cta: t.subscribeBasic,
      accentColor: 'orange'
    },
    {
      id: 'premium',
      name: t.premiumPlan,
      target: t.prosTeachers,
      price: '$29',
      description: t.perMonth,
      limits: [
        t.limitVidsMonth200,
        t.noDurationLimit
      ],
      features: [
        { text: t.featFullTutor, included: true },
        { text: t.featPptx, included: true },
        { text: t.featAdvancedMindmap, included: true },
        { text: t.featPriority, included: true },
        { text: t.featMultipleFormats, included: true }
      ],
      cta: t.getPremium,
      highlighted: true,
      accentColor: 'orange'
    }
  ];

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      alert(t.signInToChoose);
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        plan: planId,
        updatedAt: serverTimestamp()
      });
      alert(`${t.planUpdated} ${planId.toUpperCase()}!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <section
      id="pricing"
      className={`py-24 px-4 transition-colors duration-300 ${
        isDarkMode
          ? 'bg-[#0a0a0a] text-white'
          : 'bg-[#f6f7fb] text-slate-950 border-t border-slate-200'
      }`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-orange-600 font-black tracking-[0.3em] text-xs uppercase"
          >
            {t.pricingTitle}
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className={`text-4xl md:text-5xl font-black italic tracking-tighter ${
              isDarkMode ? 'text-white' : 'text-slate-950'
            }`}
          >
            {t.pricingHero}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className={`max-w-2xl mx-auto font-medium ${
              isDarkMode ? 'text-gray-500' : 'text-slate-600'
            }`}
          >
            {t.pricingDesc}
          </motion.p>
        </div>
 
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan: any, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className={`relative flex flex-col p-8 rounded-[2.5rem] transition-all duration-500 ${
                plan.highlighted 
                ? isDarkMode 
                  ? 'bg-gradient-to-b from-orange-600/20 to-transparent border-2 border-orange-600/50 shadow-[0_20px_50px_rgba(234,88,12,0.15)] z-10'
                  : 'bg-gradient-to-b from-orange-50 to-white border-2 border-orange-300 shadow-2xl shadow-orange-600/10 z-10' 
                : isDarkMode 
                  ? 'bg-white/[0.03] border border-white/10 hover:border-white/20'
                  : 'bg-white border border-slate-200 hover:border-orange-200 shadow-xl shadow-slate-900/5 hover:shadow-orange-600/10'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-600 text-[10px] font-black text-white uppercase tracking-widest rounded-full shadow-lg">
                  {t.mostPopular}
                </div>
              )}
 
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-black uppercase tracking-widest ${
                    plan.highlighted 
                      ? 'text-orange-500' 
                      : isDarkMode 
                        ? 'text-gray-500' 
                        : 'text-slate-500'
                  }`}>
                    {plan.target}
                  </span>
                  {plan.id === 'free' && <Shield className={isDarkMode ? 'text-gray-600' : 'text-slate-400'} size={20} />}
                  {plan.id === 'basic' && <Rocket className="text-orange-600/50" size={20} />}
                  {plan.id === 'premium' && <Zap className="text-orange-500" size={20} />}
                </div>
                <h3 className={`text-3xl font-black italic tracking-tight mb-2 uppercase ${
                  isDarkMode ? 'text-white' : 'text-slate-950'
                }`}>{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className={`text-5xl font-black ${
                    isDarkMode ? 'text-white' : 'text-slate-950'
                  }`}>{plan.price}</span>
                  <span className={`text-sm font-bold uppercase tracking-widest ${
                    isDarkMode ? 'text-gray-500' : 'text-slate-500'
                  }`}>{plan.description}</span>
                </div>
              </div>
 
              <div className="space-y-6 mb-10 flex-1">
                <div className="space-y-3">
                  <h4 className={`text-[10px] font-black uppercase tracking-widest ${
                    isDarkMode ? 'text-gray-400' : 'text-slate-500'
                  }`}>{t.usageLimits}</h4>
                  <ul className="space-y-2">
                    {plan.limits.map((limit: string, lIdx: number) => (
                      <li key={lIdx} className={`flex gap-3 text-sm font-medium ${
                        isDarkMode ? 'text-gray-300' : 'text-slate-700'
                      }`}>
                        <ArrowRight size={16} className="text-orange-600 shrink-0 mt-0.5" />
                        {limit}
                      </li>
                    ))}
                  </ul>
                </div>
 
                <div className="space-y-4">
                  <h4 className={`text-[10px] font-black uppercase tracking-widest ${
                    isDarkMode ? 'text-gray-400' : 'text-slate-500'
                  }`}>{t.moreFeatures}</h4>
                  <ul className="space-y-3">
                    {plan.features.map((feature: any, fIdx: number) => (
                      <li key={fIdx} className={`flex gap-3 text-sm transition-opacity duration-300 ${
                        feature.included 
                          ? isDarkMode 
                            ? 'text-white' 
                            : 'text-slate-800' 
                          : isDarkMode 
                            ? 'text-gray-600 opacity-50' 
                            : 'text-slate-400 opacity-70'
                      }`}>
                        {feature.included ? (
                          <Check size={18} className="text-orange-600 shrink-0" />
                        ) : (
                          <X size={18} className="shrink-0" />
                        )}
                        <span className={feature.included ? 'font-medium' : 'font-normal italic'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
 
              <button 
                onClick={() => handleSubscribe(plan.id)}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all transform active:scale-95 ${
                  plan.highlighted 
                  ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-xl shadow-orange-600/20' 
                  : isDarkMode
                    ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-sm hover:border-orange-200'
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
 
        <div className="mt-16 text-center">
          <p className={`text-xs font-medium tracking-widest uppercase ${
            isDarkMode ? 'text-gray-600' : 'text-slate-500'
          }`}>
            {t.secureCloud}
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
