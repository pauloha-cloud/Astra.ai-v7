import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

interface FAQData {
  titleFirstWord: string;
  titleRest: string;
  subtitle: string;
  items: FAQItem[];
}

const FAQ_DATA: Record<'pt' | 'en' | 'es', FAQData> = {
  pt: {
    titleFirstWord: "Perguntas",
    titleRest: "Frequentes",
    subtitle: "Tudo o que você precisa saber sobre como o Astra Learning AI acelera sua jornada educacional.",
    items: [
      {
        id: 1,
        question: "O que é o Astra Learning AI?",
        answer: "O Astra Learning AI é uma plataforma educacional com inteligência artificial que ajuda estudantes a aprenderem melhor a partir de vídeos. Ele transforma conteúdos em explicações, resumos, pontos-chave e uma experiência de estudo mais interativa."
      },
      {
        id: 2,
        question: "Como o Astra Learning AI pode ajudar meu filho?",
        answer: "Ele ajuda o aluno a entender o conteúdo em uma linguagem mais simples, revisar os principais conceitos e estudar no próprio ritmo. A ideia não é apenas entregar respostas, mas apoiar a compreensão real do assunto."
      },
      {
        id: 3,
        question: "Para quem o Astra Learning AI é indicado?",
        answer: "É indicado para estudantes, pais, professores, profissionais e qualquer pessoa que queira aprender melhor usando vídeos educacionais, aulas gravadas, treinamentos ou conteúdos online."
      },
      {
        id: 4,
        question: "O Astra Learning AI funciona com qualquer vídeo?",
        answer: "A plataforma é otimizada para vídeos educacionais e conteúdos que possuam informações claras para análise. Alguns vídeos podem ter limitações dependendo da transcrição, idioma, qualidade do áudio ou permissões da plataforma de origem."
      },
      {
        id: 5,
        question: "O Astra Learning AI entende vídeos em diferentes idiomas?",
        answer: "Sim. O Astra Learning AI foi pensado para funcionar em português, inglês e espanhol, permitindo que o usuário estude e interaja com o conteúdo no idioma mais adequado."
      },
      {
        id: 6,
        question: "Uma assinatura dá acesso a todas as funcionalidades?",
        answer: "Depende do plano contratado. Algumas funcionalidades podem estar disponíveis no plano gratuito, enquanto recursos avançados, maior limite de uso ou experiências premium podem fazer parte dos planos pagos."
      },
      {
        id: 7,
        question: "O Astra Learning AI apenas entrega respostas prontas?",
        answer: "Não. O foco do Astra Learning AI é ajudar o usuário a compreender o conteúdo. Ele pode gerar resumos, explicar conceitos, destacar pontos importantes e apoiar o aprendizado de forma guiada."
      },
      {
        id: 8,
        question: "Em que o Astra Learning AI é diferente do ChatGPT?",
        answer: "O ChatGPT é uma IA conversacional geral. O Astra Learning AI é uma experiência educacional focada em vídeos, estudo guiado, explicações do conteúdo, resumos, tutor e apoio ao aprendizado a partir de materiais específicos."
      },
      {
        id: 9,
        question: "O Astra Learning AI pode substituir um professor ou tutor?",
        answer: "Não. O Astra Learning AI funciona como apoio ao estudo. Ele pode explicar, resumir e orientar o aluno, mas não substitui o acompanhamento de professores, tutores ou responsáveis."
      },
      {
        id: 10,
        question: "Como o Astra Learning AI garante a segurança e a privacidade dos dados?",
        answer: "A segurança e a privacidade dos dados devem ser tratadas como prioridade. O Astra Learning AI deve aplicar boas práticas de proteção de dados, controle de acesso e uso responsável das informações fornecidas pelo usuário."
      }
    ]
  },
  en: {
    titleFirstWord: "Frequently",
    titleRest: "Asked Questions",
    subtitle: "Everything you need to know about how Astra Learning AI accelerates your educational journey.",
    items: [
      {
        id: 1,
        question: "What is Astra Learning AI?",
        answer: "Astra Learning AI is an AI-powered learning platform that helps students learn better from videos. It turns content into explanations, summaries, key points and a more interactive study experience."
      },
      {
        id: 2,
        question: "How can Astra Learning AI help my child?",
        answer: "It helps students understand content in simpler language, review key concepts and learn at their own pace. The goal is not just to provide answers, but to support real understanding."
      },
      {
        id: 3,
        question: "Who is Astra Learning AI for?",
        answer: "It is designed for students, parents, teachers, professionals and anyone who wants to learn better from educational videos, recorded classes, training sessions or online content."
      },
      {
        id: 4,
        question: "Does Astra Learning AI work with any video?",
        answer: "The platform is optimized for educational videos and clear learning content. Some videos may have limitations depending on transcript availability, language, audio quality or source platform permissions."
      },
      {
        id: 5,
        question: "Does Astra Learning AI support multiple languages?",
        answer: "Yes. Astra Learning AI is designed to support Portuguese, English and Spanish, allowing users to study and interact with content in their preferred language."
      },
      {
        id: 6,
        question: "Does one subscription unlock all features?",
        answer: "It depends on the selected plan. Some features may be available in the free plan, while advanced features, higher usage limits or premium experiences may be included in paid plans."
      },
      {
        id: 7,
        question: "Does Astra Learning AI only provide ready-made answers?",
        answer: "No. Astra Learning AI focuses on helping users understand the content. It can generate summaries, explain concepts, highlight important points and support guided learning."
      },
      {
        id: 8,
        question: "How is Astra Learning AI different from ChatGPT?",
        answer: "ChatGPT is a general-purpose conversational AI. Astra Learning AI is an educational experience focused on videos, guided study, content explanations, summaries, tutoring and learning support based on specific materials."
      },
      {
        id: 9,
        question: "Can Astra Learning AI replace a teacher or tutor?",
        answer: "No. Astra Learning AI is a study assistant. It can explain, summarize and guide students, but it does not replace teachers, tutors or parental support."
      },
      {
        id: 10,
        question: "How does Astra Learning AI protect data privacy and security?",
        answer: "Security and privacy should be a priority. Astra Learning AI should follow good practices for data protection, access control and responsible use of user-provided information."
      }
    ]
  },
  es: {
    titleFirstWord: "Preguntas",
    titleRest: "Frecuentes",
    subtitle: "Todo lo que necesitas saber sobre cómo Astra Learning AI acelera tu viaje educativo.",
    items: [
      {
        id: 1,
        question: "¿Qué es Astra Learning AI?",
        answer: "Astra Learning AI es una plataforma educativa con inteligencia artificial que ayuda a los estudiantes a aprender mejor a partir de videos. Transforma el contenido en explicaciones, resúmenes, puntos clave y una experiencia de estudio más interactiva."
      },
      {
        id: 2,
        question: "¿Cómo puede Astra Learning AI ayudar a mi hijo?",
        answer: "Ayuda al estudiante a comprender el contenido con un lenguaje más simple, revisar los conceptos principales y aprender a su propio ritmo. El objetivo no es solo entregar respuestas, sino apoyar la comprensión real."
      },
      {
        id: 3,
        question: "¿Para quién está indicado Astra Learning AI?",
        answer: "Está indicado para estudiantes, padres, profesores, profesionales y cualquier persona que quiera aprender mejor usando videos educativos, clases grabadas, entrenamientos o contenidos online."
      },
      {
        id: 4,
        question: "¿Astra Learning AI funciona con cualquier video?",
        answer: "La plataforma está optimizada para videos educativos y contenidos claros de aprendizaje. Algunos videos pueden tener limitaciones según la disponibilidad de transcripción, idioma, calidad del audio o permisos de la plataforma de origen."
      },
      {
        id: 5,
        question: "¿Astra Learning AI soporta varios idiomas?",
        answer: "Sí. Astra Learning AI está pensado para funcionar en portugués, inglés y español, permitiendo que el usuario estudie e interactúe con el contenido en el idioma más adecuado."
      },
      {
        id: 6,
        question: "¿Una suscripción da acceso a todas las funcionalidades?",
        answer: "Depende del plan contratado. Algunas funcionalidades pueden estar disponibles en el plan gratuito, mientras que recursos avanzados, mayores límites de uso o experiencias premium pueden formar parte de los planes pagos."
      },
      {
        id: 7,
        question: "¿Astra Learning AI solo entrega respuestas listas?",
        answer: "No. El enfoque de Astra Learning AI es ayudar al usuario a comprender el contenido. Puede generar resúmenes, explicar conceptos, destacar puntos importantes y apoyar el aprendizaje guiado."
      },
      {
        id: 8,
        question: "¿En qué se diferencia Astra Learning AI de ChatGPT?",
        answer: "ChatGPT es una IA conversacional general. Astra Learning AI es una experiencia educativa enfocada en videos, estudio guiado, explicaciones del contenido, resúmenes, tutoría y apoyo al aprendizaje basado en materiales específicos."
      },
      {
        id: 9,
        question: "¿Astra Learning AI puede reemplazar a un profesor o tutor?",
        answer: "No. Astra Learning AI funciona como apoyo al estudio. Puede explicar, resumir y guiar al estudiante, pero no reemplaza a profesores, tutores o responsables."
      },
      {
        id: 10,
        question: "¿Cómo Astra Learning AI protege la privacidad y seguridad de los datos?",
        answer: "La seguridad y la privacidad deben ser una prioridad. Astra Learning AI debe aplicar buenas prácticas de proteção de dados, controle de acesso y uso responsável da informação fornecida pelo usuário."
      }
    ]
  }
};

interface FAQProps {
  lang: 'pt' | 'en' | 'es';
  isDarkMode: boolean;
}

export const FAQ = ({ lang, isDarkMode }: FAQProps) => {
  const [openId, setOpenId] = useState<number | null>(null);
  const data = FAQ_DATA[lang] || FAQ_DATA['en'];

  const toggleItem = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section 
      id="faq" 
      className={`py-32 border-t px-4 sm:px-6 relative overflow-hidden transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-[#0a0a0a] border-white/5' 
          : 'bg-[#f4f5f9] border-slate-200/60'
      }`}
    >
      {/* Decorative ambient gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 -left-1/4 w-[400px] h-[400px] bg-orange-600/5 rounded-full blur-[100px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[400px] h-[400px] bg-orange-600/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-16 space-y-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${
            isDarkMode 
              ? 'bg-orange-600/10 border-orange-600/20 text-orange-500' 
              : 'bg-orange-50 border-orange-100 text-orange-700'
          }`}>
            <HelpCircle size={12} />
            <span>FAQ</span>
          </div>
          
          <h2 className={`text-4xl sm:text-5xl font-extrabold tracking-tight italic ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <span className="text-orange-500">{data.titleFirstWord}</span> {data.titleRest}
          </h2>
          
          <p className={`text-sm sm:text-base max-w-lg mx-auto ${
            isDarkMode ? 'text-gray-500' : 'text-slate-600'
          }`}>
            {data.subtitle}
          </p>
        </div>

        {/* Accordion list */}
        <div className="space-y-4">
          {data.items.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div 
                key={item.id}
                id={`faq-item-${item.id}`}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isDarkMode 
                    ? `bg-[#111827] ${isOpen ? 'border-orange-500/40 shadow-lg shadow-orange-600/5' : 'border-white/5 hover:border-white/10'}` 
                    : `bg-white ${isOpen ? 'border-orange-400 shadow-md shadow-slate-200' : 'border-slate-200/80 hover:border-slate-300'}`
                }`}
              >
                <button
                  type="button"
                  id={`faq-btn-${item.id}`}
                  onClick={() => toggleItem(item.id)}
                  className="w-full px-5 sm:px-6 py-5 flex items-center justify-between text-left gap-4 focus:outline-none transition-colors"
                >
                  <span className={`text-sm sm:text-base font-semibold tracking-tight transition-colors ${
                    isOpen 
                      ? 'text-orange-500' 
                      : isDarkMode ? 'text-gray-100' : 'text-slate-900'
                  }`}>
                    {item.question}
                  </span>
                  
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isOpen 
                        ? 'bg-orange-500/15 text-orange-500' 
                        : isDarkMode ? 'bg-white/5 text-gray-400' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <ChevronDown size={16} />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className={`px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm leading-relaxed ${
                        isDarkMode ? 'text-gray-400' : 'text-slate-600'
                      }`}>
                        <div className="border-t border-dashed pt-4 border-gray-700/20">
                          {item.answer}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
