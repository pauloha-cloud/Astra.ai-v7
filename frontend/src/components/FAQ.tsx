import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle } from 'lucide-react';

type CategoryId = 'all' | 'getting-started' | 'learning' | 'astra-tutor' | 'security' | 'plans';

interface FAQItem {
  id: number;
  category: CategoryId;
  question: string;
  answer: string;
}

interface FAQData {
  titleFirstWord: string;
  titleRest: string;
  subtitle: string;
  categories: Record<CategoryId, string>;
  items: FAQItem[];
}

const CATEGORY_KEYS: CategoryId[] = [
  'all',
  'getting-started',
  'learning',
  'astra-tutor',
  'security',
  'plans'
];

const FAQ_DATA: Record<'pt' | 'en' | 'es', FAQData> = {
  pt: {
    titleFirstWord: "Perguntas",
    titleRest: "Frequentes",
    subtitle: "Tudo o que você precisa saber para começar a aprender com o Astra.",
    categories: {
      all: "Todos",
      'getting-started': "Começando",
      learning: "Aprendizado",
      'astra-tutor': "Astra Tutor",
      security: "Segurança e Privacidade",
      plans: "Planos e Assinatura"
    },
    items: [
      {
        id: 1,
        category: 'getting-started',
        question: "O que é o Astra Learning AI?",
        answer: "O Astra Learning AI transforma conteúdos que você precisa estudar em uma experiência personalizada de aprendizagem.\n\nEm vez de apenas entregar respostas, o Astra ajuda você a compreender conteúdos, revisar conceitos, praticar com quizzes e flashcards, organizar informações com mapas mentais e tirar dúvidas com um Tutor AI."
      },
      {
        id: 2,
        category: 'learning',
        question: "Como o Astra pode me ajudar a aprender mais rápido?",
        answer: "O Astra reduz o tempo gasto organizando materiais de estudo e transforma conteúdos em diferentes experiências de aprendizagem.\n\nEle pode ajudar a identificar os conceitos mais importantes, criar explicações, resumos, atividades de revisão, flashcards, quizzes e outros recursos disponíveis na plataforma, permitindo que você dedique mais tempo à compreensão e à prática."
      },
      {
        id: 3,
        category: 'learning',
        question: "O Astra apenas resume conteúdos ou realmente me ajuda a aprender?",
        answer: "O objetivo do Astra não é apenas gerar resumos ou fornecer respostas prontas.\n\nA plataforma foi desenvolvida para apoiar diferentes etapas da aprendizagem, ajudando o usuário a compreender, praticar e revisar um assunto através de explicações, Tutor AI, quizzes, flashcards, mapas mentais e outros recursos disponíveis na plataforma."
      },
      {
        id: 4,
        category: 'getting-started',
        question: "Para quem o Astra Learning AI é indicado?",
        answer: "O Astra pode apoiar diferentes perfis de aprendizagem, incluindo estudantes, universitários, profissionais, pessoas que estão estudando para certificações, aprendendo novos assuntos ou realizando treinamentos.\n\nA experiência pode ser utilizada tanto para conteúdos acadêmicos quanto para desenvolvimento profissional e aprendizado contínuo."
      },
      {
        id: 5,
        category: 'getting-started',
        question: "Que tipos de conteúdo posso estudar com o Astra?",
        answer: "Atualmente, você pode estudar a partir de links de vídeos do YouTube e arquivos nos formatos PDF, TXT, DOCX e imagens (PNG, JPG, WEBP).\n\nO Astra processa esses materiais para extrair os pontos principais e transformar o conteúdo em diferentes experiências de estudo, como explicações, resumos, quizzes e flashcards."
      },
      {
        id: 6,
        category: 'getting-started',
        question: "Preciso saber usar Inteligência Artificial para usar o Astra?",
        answer: "Não. O Astra foi desenvolvido para tornar a interação com Inteligência Artificial simples e natural.\n\nO usuário pode adicionar seu conteúdo, escolher uma experiência de aprendizagem ou conversar com a Astra sem precisar conhecer prompts avançados ou conceitos técnicos de IA."
      },
      {
        id: 7,
        category: 'learning',
        question: "O Astra se adapta ao meu nível de conhecimento?",
        answer: "O Astra pode adaptar a forma como apresenta e explica conteúdos de acordo com o contexto da interação e com as informações fornecidas pelo usuário.\n\nDependendo da experiência utilizada, você pode pedir explicações mais simples, mais detalhadas ou direcionadas para um determinado nível de conhecimento."
      },
      {
        id: 8,
        category: 'learning',
        question: "Como posso saber se realmente estou aprendendo?",
        answer: "O Astra combina diferentes formas de estudo e prática.\n\nRecursos como quizzes, flashcards e atividades de revisão podem ajudar você a testar sua compreensão e identificar assuntos que precisam de mais atenção."
      },
      {
        id: 9,
        category: 'astra-tutor',
        question: "Posso conversar com a Astra como conversaria com um tutor?",
        answer: "Sim. O Astra Tutor AI foi desenvolvido para tornar o estudo mais interativo.\n\nVocê pode fazer perguntas, pedir exemplos, solicitar explicações mais simples ou mais detalhadas e continuar a conversa para explorar melhor um assunto."
      },
      {
        id: 10,
        category: 'astra-tutor',
        question: "Em que o Astra Learning AI é diferente de um chatbot de IA como o ChatGPT?",
        answer: "Assistentes de IA de propósito geral são desenvolvidos para atender muitos tipos de tarefas.\n\nO Astra Learning AI foi desenvolvido com foco na experiência de aprendizagem.\n\nNo Astra, conteúdos podem ser transformados em diferentes experiências de estudo, como explicações, resumos, mapas mentais, flashcards, quizzes e interação com o Tutor AI, utilizando os recursos atualmente disponíveis na plataforma.\n\nA proposta do Astra é apoiar uma jornada que combina compreensão, prática e revisão, em vez de apenas uma interação isolada de perguntas e respostas."
      },
      {
        id: 11,
        category: 'astra-tutor',
        question: "O Astra substitui professores, escolas ou cursos?",
        answer: "Não. O Astra funciona como uma ferramenta complementar de aprendizagem.\n\nProfessores, escolas, universidades, cursos e especialistas continuam tendo um papel importante na orientação, avaliação e desenvolvimento do aluno.\n\nO Astra oferece suporte adicional para estudar, revisar conteúdos e esclarecer dúvidas."
      },
      {
        id: 12,
        category: 'security',
        question: "Posso confiar nas respostas geradas pela Inteligência Artificial?",
        answer: "O Astra utiliza Inteligência Artificial para apoiar a experiência de aprendizagem, mas sistemas de IA podem eventualmente produzir informações incorretas, incompletas ou imprecisas.\n\nPor isso, informações importantes devem ser verificadas quando necessário, especialmente em contextos acadêmicos, profissionais, técnicos ou de alta responsabilidade.\n\nO Astra deve ser utilizado como uma ferramenta de apoio ao aprendizado e não como única fonte para decisões críticas."
      },
      {
        id: 13,
        category: 'security',
        question: "Como o Astra protege meus dados e materiais de estudo?",
        answer: "A segurança e a privacidade dos usuários são tratadas com prioridade no Astra. A plataforma utiliza autenticação segura para controle de acesso às contas, criptografia em trânsito e isolamento das informações do usuário no banco de dados.\n\nPara mais informações sobre o tratamento de dados e privacidade, você pode consultar nossos Termos de Uso e Política de Privacidade."
      },
      {
        id: 14,
        category: 'getting-started',
        question: "O Astra Learning AI entende vídeos em diferentes idiomas?",
        answer: "Sim. O Astra Learning AI foi pensado para funcionar em português, inglês e espanhol, permitindo que o usuário estude e interaja com o conteúdo no idioma mais adequado."
      },
      {
        id: 15,
        category: 'plans',
        question: "Uma assinatura dá acesso a todas as funcionalidades?",
        answer: "Depende do plano contratado. Algumas funcionalidades podem estar disponíveis no plano gratuito, enquanto recursos avançados, maior limite de uso ou experiências premium podem fazer parte dos planos pagos."
      },
      {
        id: 16,
        category: 'plans',
        question: "Existem limites de utilização?",
        answer: "Sim. O Astra possui limites de uso mensais definidos de acordo com cada plano, que variam na quantidade de análises de conteúdos, duração dos vídeos e minutos disponíveis para o Tutor por Voz (Voice Tutor). Os detalhes específicos estão descritos na página de Preços."
      },
      {
        id: 17,
        category: 'plans',
        question: "Posso cancelar minha assinatura quando quiser?",
        answer: "Sim. Se você possui uma assinatura ativa, pode gerenciar ou cancelar seu plano a qualquer momento através do portal de gerenciamento de assinatura disponível nas Configurações da sua conta."
      }
    ]
  },
  en: {
    titleFirstWord: "Frequently",
    titleRest: "Asked Questions",
    subtitle: "Everything you need to know to start learning with Astra.",
    categories: {
      all: "All",
      'getting-started': "Getting Started",
      learning: "Learning",
      'astra-tutor': "Astra Tutor",
      security: "Security & Privacy",
      plans: "Plans & Subscription"
    },
    items: [
      {
        id: 1,
        category: 'getting-started',
        question: "What is Astra Learning AI?",
        answer: "Astra Learning AI transforms the content you need to study into a personalized learning experience.\n\nInstead of just delivering answers, Astra helps you understand content, review concepts, practice with quizzes and flashcards, organize information with mind maps, and ask questions with an AI Tutor."
      },
      {
        id: 2,
        category: 'learning',
        question: "How can Astra help me learn faster?",
        answer: "Astra reduces the time spent organizing study materials and transforms content into different learning experiences.\n\nIt helps identify key concepts, create explanations, summaries, review activities, flashcards, quizzes, and other resources available on the platform, allowing you to spend more time on understanding and practice."
      },
      {
        id: 3,
        category: 'learning',
        question: "Does Astra only summarize content or does it actually help me learn?",
        answer: "Astra's goal is not just to generate summaries or provide ready-made answers.\n\nThe platform was developed to support different stages of learning, helping users understand, practice, and review topics through explanations, AI Tutor, quizzes, flashcards, mind maps, and other available resources on the platform."
      },
      {
        id: 4,
        category: 'getting-started',
        question: "Who is Astra Learning AI for?",
        answer: "Astra can support different learning profiles, including students, university students, professionals, people studying for certifications, learning new subjects, or undergoing training.\n\nThe experience can be used for academic content as well as professional development and continuous learning."
      },
      {
        id: 5,
        category: 'getting-started',
        question: "What types of content can I study with Astra?",
        answer: "Currently, you can study using YouTube video links and files in PDF, TXT, DOCX, and image formats (PNG, JPG, WEBP).\n\nAstra processes these materials to extract key points and transform the content into different study experiences, such as explanations, summaries, quizzes, and flashcards."
      },
      {
        id: 6,
        category: 'getting-started',
        question: "Do I need to know how to use Artificial Intelligence to use Astra?",
        answer: "No. Astra was developed to make interacting with Artificial Intelligence simple and natural.\n\nYou can add your content, choose a learning experience, or talk with Astra without needing advanced prompts or technical AI concepts."
      },
      {
        id: 7,
        category: 'learning',
        question: "Does Astra adapt to my knowledge level?",
        answer: "Astra can adapt how it presents and explains content according to the context of the interaction and the information provided by the user.\n\nDepending on the experience used, you can ask for simpler, more detailed explanations or explanations tailored to a specific level of knowledge."
      },
      {
        id: 8,
        category: 'learning',
        question: "How can I know if I am really learning?",
        answer: "Astra combines different ways to study and practice.\n\nFeatures such as quizzes, flashcards, and review activities can help you test your understanding and identify subjects that need more attention."
      },
      {
        id: 9,
        category: 'astra-tutor',
        question: "Can I talk to Astra like I would talk to a tutor?",
        answer: "Yes. Astra Tutor AI was developed to make studying more interactive.\n\nYou can ask questions, request examples, ask for simpler or more detailed explanations, and continue the conversation to better explore a subject."
      },
      {
        id: 10,
        category: 'astra-tutor',
        question: "How is Astra Learning AI different from an AI chatbot like ChatGPT?",
        answer: "General-purpose AI assistants are developed to serve many types of tasks.\n\nAstra Learning AI was developed with a focus on the learning experience.\n\nIn Astra, content can be transformed into different study experiences, such as explanations, summaries, mind maps, flashcards, quizzes, and interaction with the AI Tutor, using the features currently available on the platform.\n\nAstra's goal is to support a journey that combines understanding, practice, and review, rather than just an isolated interaction of questions and answers."
      },
      {
        id: 11,
        category: 'astra-tutor',
        question: "Does Astra replace teachers, schools, or courses?",
        answer: "No. Astra works as a complementary learning tool.\n\nTeachers, schools, universities, courses, and specialists continue to play an important role in student guidance, assessment, and development.\n\nAstra offers additional support for studying, reviewing content, and clarifying doubts."
      },
      {
        id: 12,
        category: 'security',
        question: "Can I trust AI-generated answers?",
        answer: "Astra uses Artificial Intelligence to support the learning experience, but AI systems may occasionally produce incorrect, incomplete, or inaccurate information.\n\nTherefore, important information should be verified when necessary, especially in academic, professional, technical, or high-responsibility contexts.\n\nAstra should be used as a learning support tool and not as the sole source for critical decisions."
      },
      {
        id: 13,
        category: 'security',
        question: "How does Astra protect my data and study materials?",
        answer: "User security and privacy are treated as top priorities at Astra. The platform uses secure authentication for account access control, encryption in transit, and isolation of user data in the database.\n\nFor more details regarding data handling and privacy, you can consult our Terms of Use and Privacy Policy."
      },
      {
        id: 14,
        category: 'getting-started',
        question: "Does Astra Learning AI support multiple languages?",
        answer: "Yes. Astra Learning AI is designed to support Portuguese, English and Spanish, allowing users to study and interact with content in their preferred language."
      },
      {
        id: 15,
        category: 'plans',
        question: "Does one subscription unlock all features?",
        answer: "It depends on the selected plan. Some features may be available in the free plan, while advanced features, higher usage limits or premium experiences may be included in paid plans."
      },
      {
        id: 16,
        category: 'plans',
        question: "Are there usage limits?",
        answer: "Yes. Astra has monthly usage limits defined according to each plan, varying in the number of content analyses, video duration, and available Voice Tutor minutes. Specific details are described on the Pricing page."
      },
      {
        id: 17,
        category: 'plans',
        question: "Can I cancel my subscription at any time?",
        answer: "Yes. If you have an active subscription, you can manage or cancel your plan at any time through the subscription management portal available in your account Settings."
      }
    ]
  },
  es: {
    titleFirstWord: "Preguntas",
    titleRest: "Frecuentes",
    subtitle: "Todo lo que necesitas saber para comenzar a aprender con Astra.",
    categories: {
      all: "Todos",
      'getting-started': "Primeros pasos",
      learning: "Aprendizaje",
      'astra-tutor': "Astra Tutor",
      security: "Seguridad y Privacidad",
      plans: "Planes y Suscripción"
    },
    items: [
      {
        id: 1,
        category: 'getting-started',
        question: "¿Qué es Astra Learning AI?",
        answer: "Astra Learning AI transforma los contenidos que necesitas estudiar en una experiencia personalizada de aprendizaje.\n\nEn lugar de solo entregar respuestas, Astra te ayuda a comprender contenidos, revisar conceptos, practicar con quizzes y flashcards, organizar información con mapas mentales y resolver dudas con un Tutor AI."
      },
      {
        id: 2,
        category: 'learning',
        question: "¿Cómo me puede ayudar Astra a aprender más rápido?",
        answer: "Astra reduce el tiempo dedicado a organizar materiales de estudio y transforma contenidos en diferentes experiencias de aprendizaje.\n\nPuede ayudar a identificar los conceptos más importantes, crear explicaciones, resúmenes, actividades de revisión, flashcards, quizzes y otros recursos disponibles en la plataforma, permitiéndote dedicar más tiempo a la comprensión y la práctica."
      },
      {
        id: 3,
        category: 'learning',
        question: "¿Astra solo resume contenidos o realmente me ayuda a aprender?",
        answer: "El objetivo de Astra no es solo generar resúmenes o proporcionar respuestas listas.\n\nLa plataforma fue desarrollada para apoyar diferentes etapas del aprendizaje, ayudando al usuario a comprender, practicar y revisar un tema a través de explicaciones, Tutor AI, quizzes, flashcards, mapas mentales y otros recursos disponibles en la plataforma."
      },
      {
        id: 4,
        category: 'getting-started',
        question: "¿Para quién está indicado Astra Learning AI?",
        answer: "Astra puede apoyar diferentes perfiles de aprendizaje, incluidos estudiantes, universitarios, profesionales, personas que están estudiando para certificaciones, aprendiendo nuevos temas o realizando capacitaciones.\n\nLa experiencia se puede utilizar tanto para contenidos académicos como para desarrollo profesional y aprendizaje continuo."
      },
      {
        id: 5,
        category: 'getting-started',
        question: "¿Qué tipos de contenido puedo estudiar con Astra?",
        answer: "Actualmente, puedes estudiar a partir de enlaces de videos de YouTube y archivos en formatos PDF, TXT, DOCX e imágenes (PNG, JPG, WEBP).\n\nAstra procesa estos materiales para extraer los puntos principales y transformar el contenido en diferentes experiencias de estudio, como explicaciones, resúmenes, quizzes y flashcards."
      },
      {
        id: 6,
        category: 'getting-started',
        question: "¿Necesito saber usar Inteligencia Artificial para usar Astra?",
        answer: "No. Astra fue desarrollado para hacer que la interacción con la Inteligencia Artificial sea simple y natural.\n\nEl usuario puede agregar su contenido, elegir una experiencia de aprendizaje o conversar con Astra sin necesidad de conocer prompts avanzados o conceptos técnicos de IA."
      },
      {
        id: 7,
        category: 'learning',
        question: "¿Astra se adapta a mi nivel de conocimiento?",
        answer: "Astra puede adaptar la forma en que presenta y explica los contenidos de acuerdo con el contexto de la interacción y la información proporcionada por el usuario.\n\nSegún la experiencia utilizada, puedes solicitar explicaciones más simples, más detalladas o dirigidas a un determinado nivel de conocimiento."
      },
      {
        id: 8,
        category: 'learning',
        question: "¿Cómo puedo saber si realmente estoy aprendiendo?",
        answer: "Astra combina diferentes formas de estudio y práctica.\n\nRecursos como quizzes, flashcards y actividades de revisión pueden ayudarte a probar tu comprensión e identificar temas que necesitan más atención."
      },
      {
        id: 9,
        category: 'astra-tutor',
        question: "¿Puedo conversar con Astra como conversaría con un tutor?",
        answer: "Sí. Astra Tutor AI fue desarrollado para hacer que el estudio sea más interactivo.\n\nPuedes hacer preguntas, pedir ejemplos, solicitar explicaciones más simples o más detalladas y continuar la conversación para explorar mejor un tema."
      },
      {
        id: 10,
        category: 'astra-tutor',
        question: "¿En qué se diferencia Astra Learning AI de un chatbot de IA como ChatGPT?",
        answer: "Los asistentes de IA de propósito general están desarrollados para atender muchos tipos de tareas.\n\nAstra Learning AI fue desarrollado con un enfoque en la experiencia de aprendizaje.\n\nEn Astra, los contenidos se pueden transformar en diferentes experiencias de estudio, como explicaciones, resúmenes, mapas mentales, flashcards, quizzes e interacción con el Tutor AI, utilizando los recursos actualmente disponibles en la plataforma.\n\nLa propuesta de Astra es apoyar un viaje que combina comprensión, práctica y revisión, en lugar de solo una interacción aislada de preguntas y respuestas."
      },
      {
        id: 11,
        category: 'astra-tutor',
        question: "¿Astra reemplaza a profesores, escuelas o cursos?",
        answer: "No. Astra funciona como una herramienta complementaria de aprendizaje.\n\nProfesores, escuelas, universidades, cursos y especialistas continúan teniendo un papel importante en la orientación, evaluación y desarrollo del estudiante.\n\nAstra ofrece soporte adicional para estudiar, revisar contenidos y aclarar dudas."
      },
      {
        id: 12,
        category: 'security',
        question: "¿Puedo confiar en las respuestas generadas por la Inteligencia Artificial?",
        answer: "Astra utiliza Inteligencia Artificial para apoyar la experiencia de aprendizaje, pero los sistemas de IA pueden eventualmente producir información incorrecta, incompleta o imprecisa.\n\nPor lo tanto, la información importante debe verificarse cuando sea necesario, especialmente en contextos académicos, profesionales, técnicos o de alta responsabilidad.\n\nAstra debe utilizarse como una herramienta de apoyo al aprendizaje y no como la única fuente para decisiones críticas."
      },
      {
        id: 13,
        category: 'security',
        question: "¿Cómo protege Astra mis datos y materiales de estudio?",
        answer: "La seguridad y la privacidad de los usuarios se tratan con máxima prioridad en Astra. La plataforma utiliza autenticación segura para el control de acceso a las cuentas, cifrado en tránsito e aislamiento de los datos del usuario en la base de datos.\n\nPara obtener más información sobre el tratamiento de datos y la privacidad, puedes consultar nuestros Términos de Uso y Política de Privacidad."
      },
      {
        id: 14,
        category: 'getting-started',
        question: "¿Astra Learning AI soporta varios idiomas?",
        answer: "Sí. Astra Learning AI está pensado para funcionar en portugués, inglés y español, permitiendo que el usuario estudie e interactúe con el contenido en el idioma más adecuado."
      },
      {
        id: 15,
        category: 'plans',
        question: "¿Una suscripción da acceso a todas las funcionalidades?",
        answer: "Depende del plan contratado. Algunas funcionalidades pueden estar disponibles en el plan gratuito, mientras que recursos avanzados, mayores límites de uso o experiencias premium pueden formar parte de los planes pagos."
      },
      {
        id: 16,
        category: 'plans',
        question: "¿Existen límites de uso?",
        answer: "Sí. Astra tiene límites de uso mensuales definidos según cada plan, que varían en la cantidad de análisis de contenidos, duración de los videos y minutos disponibles para el Tutor por Voz (Voice Tutor). Los detalles específicos se describen en la página de Precios."
      },
      {
        id: 17,
        category: 'plans',
        question: "¿Puedo cancelar mi suscripción cuando quiera?",
        answer: "Sí. Si tienes una suscripción activa, puedes gestionar o cancelar tu plan en cualquier momento a través del portal de gestión de suscripciones disponible en la Configuración de tu cuenta."
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
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');

  const data = FAQ_DATA[lang] || FAQ_DATA['en'];

  const handleCategorySelect = (categoryKey: CategoryId) => {
    setSelectedCategory(categoryKey);
    if (openId !== null) {
      const isStillVisible = data.items.some(
        item => item.id === openId && (categoryKey === 'all' || item.category === categoryKey)
      );
      if (!isStillVisible) {
        setOpenId(null);
      }
    }
  };

  const toggleItem = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  const filteredItems = data.items.filter(
    item => selectedCategory === 'all' || item.category === selectedCategory
  );

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
        <div className="text-center mb-12 space-y-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${
            isDarkMode 
              ? 'bg-orange-600/10 border-orange-600/20 text-orange-500' 
              : 'bg-orange-50 border-orange-100 text-orange-700'
          }`}>
            <HelpCircle size={12} />
            <span>FAQ</span>
          </div>
          
          <h2 className={`text-4xl sm:text-5xl section-heading-typography ${
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

        {/* Category Navigation Bar */}
        <div 
          role="tablist"
          aria-label="FAQ Categories"
          className="flex items-center justify-start sm:justify-center gap-2.5 overflow-x-auto pb-3 mb-10 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none"
        >
          {CATEGORY_KEYS.map((catKey) => {
            const isSelected = selectedCategory === catKey;
            const label = data.categories[catKey];
            return (
              <button
                key={catKey}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleCategorySelect(catKey)}
                className={`min-h-[44px] px-4.5 py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                  isSelected
                    ? 'bg-orange-500 text-white font-semibold shadow-md shadow-orange-500/20 scale-[1.02]'
                    : isDarkMode
                      ? 'bg-[#111827] text-gray-400 hover:text-white border border-white/5 hover:border-white/10 hover:bg-white/5'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Accordion list */}
        <div className="space-y-3.5">
          {filteredItems.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div 
                key={item.id}
                id={`faq-item-${item.id}`}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isDarkMode 
                    ? `bg-[#111827] ${isOpen ? 'border-orange-500/40 shadow-lg shadow-orange-600/5' : 'border-white/5 hover:border-white/10'}` 
                    : `bg-white ${isOpen ? 'border-orange-400 shadow-md shadow-slate-200/60' : 'border-slate-200/80 hover:border-slate-300'}`
                }`}
              >
                <button
                  type="button"
                  id={`faq-btn-${item.id}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${item.id}`}
                  onClick={() => toggleItem(item.id)}
                  className="w-full min-h-[52px] px-5 sm:px-6 py-4.5 flex items-center justify-between text-left gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset transition-colors cursor-pointer"
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
                      id={`faq-answer-${item.id}`}
                      role="region"
                      aria-labelledby={`faq-btn-${item.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className={`px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm leading-relaxed sm:leading-7 ${
                        isDarkMode ? 'text-gray-400' : 'text-slate-600'
                      }`}>
                        <div className={`border-t border-dashed pt-4 ${isDarkMode ? 'border-white/10' : 'border-slate-200'} whitespace-pre-line`}>
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
