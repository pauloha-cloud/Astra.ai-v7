import { ArrowLeft, FileText } from 'lucide-react';
import { motion } from 'motion/react';

interface TermsOfUseProps {
  isDarkMode: boolean;
  currentLang: 'pt' | 'en' | 'es';
  onBack: () => void;
}

export function TermsOfUse({ isDarkMode, currentLang, onBack }: TermsOfUseProps) {
  const content = {
    pt: {
      title: "Termos de Uso",
      subtitle: "Regras, obrigações e limitações de responsabilidade para uso do Astra Learning.",
      lastUpdated: "Última atualização: Julho de 2026",
      backBtn: "Voltar",
      warningText: "ATENÇÃO: As respostas geradas por IA podem conter imprecisões. O usuário deve revisar informações importantes antes de tomar decisões com base no conteúdo.",
      sections: [
        {
          title: "1. Aceitação dos termos",
          text: "Ao acessar, cadastrar-se ou utilizar o Astra Learning, você expressa sua concordância integral com estes Termos de Uso e com a nossa Política de Privacidade. Caso não concorde com qualquer disposição aqui estabelecida, você deve abster-se de utilizar a plataforma."
        },
        {
          title: "2. Uso da plataforma",
          text: "O Astra Learning concede a você uma licença pessoal, limitada, revogável, não exclusiva e não transferível para utilizar os recursos de nossa plataforma exclusivamente para fins de estudos, aprendizado pessoal ou acadêmico."
        },
        {
          title: "3. Conta do usuário",
          text: "Para acessar as funcionalidades completas, é necessário criar uma conta utilizando seu e-mail ou autenticação por terceiros autorizados (como Google ou Apple). Você é responsável por manter o sigilo de suas credenciais de acesso e por todas as atividades que ocorrem em sua conta."
        },
        {
          title: "4. Conteúdos gerados por IA",
          text: "Nossa plataforma processa dados de vídeos públicos e gera resumos, quizzes, análises de tutor e mapas mentais automáticos por meio de Inteligência Artificial. Os direitos de propriedade intelectual sobre as informações brutas inseridas pertencem aos seus respectivos criadores, enquanto os materiais de estudos gerados são para seu proveito pessoal."
        },
        {
          title: "5. Limitações das respostas da IA",
          text: "Nossos recursos são fornecidos por modelos avançados de IA (API Gemini), que embora precisos, são propensos a alucinações de dados ou imprecisões técnicas. As respostas fornecidas não substituem o aconselhamento de profissionais qualificados e não devem ser usadas como fonte médica, jurídica ou de decisões críticas sem verificação prévia."
        },
        {
          title: "6. Planos e pagamentos",
          text: "O Astra Learning opera sob o modelo freemium. Recursos essenciais de estudo são fornecidos gratuitamente (Plano Free), mas planos adicionais premium (Plano Pro) com tokens adicionais e exportações ampliadas poderão ser assinados de forma recorrente em nosso ambiente seguro de faturamento futuramente."
        },
        {
          title: "7. Uso permitido e uso proibido",
          text: "Você concorda em não: explorar a plataforma para engenharia reversa, fazer web scraping automatizado abusivo que sobrecarregue nossa API, burlar limites de cotas de IA, utilizar a plataforma para gerar conteúdos ilegais, preconceituosos, difamatórios ou violar direitos autorais de terceiros."
        },
        {
          title: "8. Propriedade intelectual",
          text: "Todos os elementos visuais, logotipos, códigos de desenvolvimento, design de interface e estrutura de software pertencem exclusivamente ao Astra Learning e estão protegidos pelas leis de propriedade intelectual vigentes."
        },
        {
          title: "9. Suspensão ou encerramento de conta",
          text: "Reservamo-nos o direito de suspender ou banir contas de usuários que violarem reiteradamente estes termos, praticarem fraude, abusarem tecnicamente da infraestrutura ou violarem as diretrizes de conduta ética da plataforma."
        },
        {
          title: "10. Limitação de responsabilidade",
          text: "O Astra Learning fornece seus serviços 'como estão' e 'conforme disponíveis'. Não nos responsabilizamos por perdas de dados ocasionadas por falhas técnicas de provedores, imprecisões de IA, ou interrupções temporárias decorrentes de manutenção ou atualizações de sistema."
        },
        {
          title: "11. Contato",
          text: "Para obter esclarecimentos sobre estes Termos de Uso, entre em contato com nossa equipe jurídica e de suporte pelo endereço eletrônico: suporte@astralearning.com."
        }
      ]
    },
    en: {
      title: "Terms of Use",
      subtitle: "Rules, obligations, and limitations of liability for using Astra Learning.",
      lastUpdated: "Last updated: July 2026",
      backBtn: "Back",
      warningText: "ATTENTION: AI-generated answers can contain inaccuracies. The user should review important information before making decisions based on this content.",
      sections: [
        {
          title: "1. Acceptance of Terms",
          text: "By accessing, registering for, or using Astra Learning, you express your complete agreement with these Terms of Use and our Privacy Policy. If you do not agree with any provision set forth herein, you must refrain from using the platform."
        },
        {
          title: "2. Use of the Platform",
          text: "Astra Learning grants you a personal, limited, revocable, non-exclusive, and non-transferable license to use our platform features solely for study, personal learning, or academic purposes."
        },
        {
          title: "3. User Account",
          text: "To access all features, you must create an account using your email or authorized third-party authentication (such as Google or Apple). You are responsible for keeping your login credentials confidential and for all activities that occur under your account."
        },
        {
          title: "4. AI-Generated Content",
          text: "Our platform processes public video data and generates automatic summaries, quizzes, tutor feedback, and mind maps through Artificial Intelligence. Intellectual property rights for raw data remain with their respective creators, while study materials are generated for your personal study use."
        },
        {
          title: "5. Limitations of AI Responses",
          text: "Our features are powered by advanced AI models (Gemini API) which, while accurate, are prone to data hallucinations or technical inaccuracies. Provided responses do not substitute professional advice and should not be used as a medical, legal, or critical decision source without validation."
        },
        {
          title: "6. Plans and Payments",
          text: "Astra Learning operates on a freemium model. Essential study features are provided for free (Free Plan), but additional premium plans (Pro Plan) with more tokens and exports may be subscribed to recurringly through our secure billing system in the future."
        },
        {
          title: "7. Permitted and Prohibited Use",
          text: "You agree not to: reverse-engineer the platform, perform abusive web scraping that overloads our APIs, bypass AI quota limitations, or use the platform to generate illegal, hateful, defamatory, or copyright-violating content."
        },
        {
          title: "8. Intellectual Property",
          text: "All visual elements, logos, codebase, interface design, and software structure belong exclusively to Astra Learning and are protected by applicable intellectual property laws."
        },
        {
          title: "9. Account Suspension or Termination",
          text: "We reserve the right to suspend or ban user accounts that repeatedly violate these terms, practice fraud, technically abuse our infrastructure, or violate our ethical platform guidelines."
        },
        {
          title: "10. Limitation of Liability",
          text: "Astra Learning provides services on an 'as is' and 'as available' basis. We are not liable for data loss caused by third-party technical failures, AI inaccuracies, or temporary service interruptions due to maintenance or updates."
        },
        {
          title: "11. Contact",
          text: "For clarifications regarding these Terms of Use, contact our legal and support team at: support@astralearning.com."
        }
      ]
    },
    es: {
      title: "Términos de Uso",
      subtitle: "Reglas, obligaciones y limitaciones de responsabilidad para el uso de Astra Learning.",
      lastUpdated: "Last updated: Julio de 2026",
      backBtn: "Volver",
      warningText: "ATENCIÓN: Las respuestas generadas por IA pueden contener imprecisiones. El usuario debe revisar la información importante antes de tomar decisiones basadas en este contenido.",
      sections: [
        {
          title: "1. Aceptación de los términos",
          text: "Al acceder, registrarse o utilizar Astra Learning, expresa su total conformidad con estos Términos de Uso y nuestra Política de Privacidad. Si no está de acuerdo con alguna disposición establecida aquí, debe abstenerse de utilizar la plataforma."
        },
        {
          title: "2. Uso de la plataforma",
          text: "Astra Learning le otorga una licencia personal, limitada, revocable, no exclusiva y no transferible para utilizar las características de nuestra plataforma exclusivamente para fines de estudio, aprendizaje personal o académico."
        },
        {
          title: "3. Cuenta de usuario",
          text: "Para acceder a las funciones completas, debe crear una cuenta utilizando su correo electrónico o autenticación de terceros autorizada (como Google o Apple). Usted es responsable de mantener la confidencialidad de sus credenciales y de todas las actividades bajo su cuenta."
        },
        {
          title: "4. Contenido generado por IA",
          text: "Nuestra plataforma procesa datos de videos públicos y genera resúmenes, cuestionarios, tutorías y mapas mentales automáticos a través de Inteligencia Artificial. Los derechos de propiedad intelectual de los datos sin procesar pertenecen a sus creadores, mientras que los materiales de estudio generados son para su uso personal."
        },
        {
          title: "5. Limitaciones de las respuestas de la IA",
          text: "Nuestras funciones funcionan con modelos avanzados de IA (API Gemini), que aunque son precisos, son propensos a alucinaciones de datos o imprecisiones técnicas. Las respuestas proporcionadas no sustituyen el asesoramiento profesional y no deben utilizarse como fuente médica, legal o de decisiones críticas sin validación."
        },
        {
          title: "6. Planes y pagos",
          text: "Astra Learning opera bajo un modelo freemium. Las funciones de estudio esenciales son gratuitas (Plan Free), pero los planes premium adicionales (Plan Pro) con más tokens y exportaciones extendidas se podrán contratar de forma recurrente a través de nuestro sistema seguro de facturación en el futuro."
        },
        {
          title: "7. Uso permitido y prohibido",
          text: "Usted acepta no: aplicar ingeniería inversa a la plataforma, realizar web scraping abusivo que sobrecargue nuestras API, eludir los límites de cuotas de IA ni utilizar la plataforma para generar contenido ilegal, de odio, difamatorio o que viole los derechos de autor."
        },
        {
          title: "8. Propiedad intelectual",
          text: "Todos los elementos visuales, logotipos, código, diseño de interfaz y estructura de software pertenecen exclusivamente a Astra Learning y están protegidos por las leyes de propiedad intelectual vigentes."
        },
        {
          title: "9. Suspensión o terminación de cuenta",
          text: "Nos reservamos el derecho de suspender o prohibir cuentas de usuarios que violen reiteradamente estos términos, practiquen fraude, abusen técnicamente de nuestra infraestructura o violen las pautas éticas de la plataforma."
        },
        {
          title: "10. Limitación de responsabilidad",
          text: "Astra Learning proporciona servicios 'tal cual' y 'según disponibilidad'. No nos hacemos responsables de la pérdida de datos causada por fallas técnicas de terceros, imprecisiones de IA o interrupciones del servicio debido a mantenimiento o actualizaciones."
        },
        {
          title: "11. Contacto",
          text: "Para aclaraciones sobre estos Términos de Uso, póngase en contacto con nuestro equipo legal y de soporte en: support@astralearning.com."
        }
      ]
    }
  };

  const t = content[currentLang] || content.pt;

  return (
    <div className="w-full max-w-4xl mx-auto py-10 px-4 sm:px-6 animate-in fade-in duration-300">
      {/* Back button */}
      <button
        onClick={onBack}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border mb-8 transition-colors cursor-pointer ${
          isDarkMode
            ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850'
            : 'bg-white border-slate-200 text-slate-500 hover:text-slate-950 hover:bg-slate-50 shadow-sm'
        }`}
      >
        <ArrowLeft size={14} />
        {t.backBtn}
      </button>

      {/* Header card */}
      <div className={`p-6 sm:p-8 rounded-3xl border mb-8 shadow-sm ${
        isDarkMode
          ? 'bg-[#0c0c0e] border-zinc-800/85'
          : 'bg-white border-slate-200/80 shadow-md shadow-slate-100/50'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-orange-600/10 flex items-center justify-center text-orange-500">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black italic tracking-tight uppercase text-orange-600 drop-shadow-[0_0_15px_rgba(234,88,12,0.1)]">
              {t.title}
            </h1>
            <p className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
              {t.lastUpdated}
            </p>
          </div>
        </div>
        <p className={`text-sm sm:text-base font-semibold leading-relaxed mb-6 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
          {t.subtitle}
        </p>
        <div className="p-4 rounded-2xl border text-xs leading-relaxed bg-amber-500/10 border-amber-500/20 text-amber-500">
          {t.warningText}
        </div>
      </div>

      {/* Content sections */}
      <div className="space-y-6">
        {t.sections.map((sec, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className={`p-6 rounded-3xl border shadow-sm transition-all duration-300 ${
              isDarkMode
                ? 'bg-[#0c0c0e] border-zinc-800/80 hover:border-zinc-700/80'
                : 'bg-white border-slate-200/80 hover:shadow-md'
            }`}
          >
            <h3 className={`font-black uppercase tracking-wider text-sm mb-3 ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
              {sec.title}
            </h3>
            <p className={`text-xs sm:text-sm leading-relaxed font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
              {sec.text}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
