import { ArrowLeft, Shield } from 'lucide-react';
import { motion } from 'motion/react';

interface PrivacyPolicyProps {
  isDarkMode: boolean;
  currentLang: 'pt' | 'en' | 'es';
  onBack: () => void;
}

export function PrivacyPolicy({ isDarkMode, currentLang, onBack }: PrivacyPolicyProps) {
  const content = {
    pt: {
      title: "Política de Privacidade",
      subtitle: "Como protegemos e gerenciamos suas informações no Astra Learning.",
      lastUpdated: "Última atualização: Julho de 2026",
      backBtn: "Voltar",
      baseText: "O Astra Learning utiliza dados de conta, preferências, histórico de vídeos e conteúdos gerados para oferecer funcionalidades educacionais com inteligência artificial. As informações podem ser processadas por serviços de infraestrutura e IA, como Firebase, Google Cloud e Gemini, sempre com o objetivo de entregar a experiência da plataforma.",
      sections: [
        {
          title: "1. Introdução",
          text: "Bem-vindo ao Astra Learning. Nós nos comprometemos com a proteção de seus dados pessoais e com a transparência sobre como coletamos, usamos e compartilhamos as informações que você confia a nós."
        },
        {
          title: "2. Dados que coletamos",
          text: "Coletamos dados fornecidos diretamente por você ao criar sua conta (nome, e-mail, foto de perfil) ou ao interagir com a plataforma. Também coletamos o histórico de URLs de vídeos analisados e as preferências configuradas no sistema."
        },
        {
          title: "3. Como usamos seus dados",
          text: "Os dados coletados são usados exclusivamente para: manter sua sessão ativa, personalizar as sugestões e formatos de estudo, processar as requisições de análise de vídeo, gerar resumos e mapas mentais, e para comunicação sobre melhorias na plataforma."
        },
        {
          title: "4. Uso de IA e processamento de conteúdo",
          text: "Para oferecer os recursos inteligentes (como resumos, tutoria e mapas mentais), as informações de transcrição e metadados dos vídeos podem ser processadas por serviços de inteligência artificial de parceiros tecnológicos, especificamente a API Gemini da Google Cloud. Nossos fluxos garantem que esses dados sejam enviados de forma segura e não sejam usados para treinar modelos de IA externos de forma pública."
        },
        {
          title: "5. Compartilhamento com terceiros",
          text: "Não vendemos ou alugamos seus dados pessoais. Compartilhamos informações estritamente necessárias para o funcionamento técnico da plataforma com provedores de infraestrutura hospedados na nuvem (Firebase Authentication, Cloud Run, Firestore) e com a API do Gemini, seguindo rigorosos padrões de segurança."
        },
        {
          title: "6. Cookies e tecnologias semelhantes",
          text: "Utilizamos cookies essenciais para manter sua sessão conectada com segurança e autenticar seu acesso. Cookies de análise (Analytics) podem ser utilizados, caso consentido por você, para mensurar padrões de tráfego e otimizar as funcionalidades da plataforma."
        },
        {
          title: "7. Armazenamento e segurança",
          text: "Seus dados de conta e preferências são armazenados em servidores seguros gerenciados pelo Firebase da Google Cloud Platform, protegidos por criptografia em repouso e em trânsito. Adotamos medidas técnicas recomendadas de segurança da informação para evitar acessos não autorizados."
        },
        {
          title: "8. Retenção de dados",
          text: "Mantemos seus dados pessoais de conta e histórico pelo tempo em que sua conta estiver ativa na plataforma. Você pode apagar seu histórico ou solicitar a exclusão de sua conta a qualquer momento."
        },
        {
          title: "9. Direitos do usuário",
          text: "Você possui direitos de privacidade garantidos por lei (como a LGPD no Brasil e GDPR na Europa), incluindo o direito de acessar, corrigir, portar e excluir seus dados, bem como revogar o consentimento para o uso de cookies não essenciais."
        },
        {
          title: "10. Como solicitar exclusão ou alteração dos dados",
          text: "Você pode atualizar seu nome de perfil diretamente nas configurações de sua conta. Para solicitar a exclusão definitiva de seus dados e de sua conta, basta enviar um e-mail com a solicitação para suporte@astralearning.com. O processamento será feito em até 15 dias úteis."
        },
        {
          title: "11. Contato",
          text: "Para esclarecer dúvidas sobre esta Política de Privacidade ou sobre o tratamento de seus dados pessoais, entre em contato através de: privacidade@astralearning.com ou suporte@astralearning.com."
        }
      ]
    },
    en: {
      title: "Privacy Policy",
      subtitle: "How we protect and manage your information at Astra Learning.",
      lastUpdated: "Last updated: July 2026",
      backBtn: "Back",
      baseText: "Astra Learning uses account data, preferences, video history, and generated content to offer educational features powered by artificial intelligence. Information may be processed by infrastructure and AI services such as Firebase, Google Cloud, and Gemini, always with the purpose of delivering the platform experience.",
      sections: [
        {
          title: "1. Introduction",
          text: "Welcome to Astra Learning. We are committed to protecting your personal data and maintaining transparency regarding how we collect, use, and share the information you trust us with."
        },
        {
          title: "2. Data We Collect",
          text: "We collect data directly provided by you when creating your account (name, email, profile picture) or when interacting with the platform. We also collect the history of analyzed video URLs and study preferences configured in the system."
        },
        {
          title: "3. How We Use Your Data",
          text: "Collected data is used exclusively to: keep your session active, personalize study suggestions and formats, process video analysis requests, generate summaries and mind maps, and communicate about platform improvements."
        },
        {
          title: "4. Use of AI and Content Processing",
          text: "To offer our smart features (such as summaries, tutoring, and mind maps), video transcripts and metadata may be processed by artificial intelligence services from technology partners, specifically Google Cloud's Gemini API. Our workflows ensure this data is securely transmitted and not used to train public AI models."
        },
        {
          title: "5. Sharing with Third Parties",
          text: "We do not sell or rent your personal data. We share information strictly required for the platform's technical operations with cloud-hosted infrastructure providers (Firebase Authentication, Cloud Run, Firestore) and the Gemini API, adhering to high security standards."
        },
        {
          title: "6. Cookies and Similar Technologies",
          text: "We use essential cookies to keep your session safely connected and authenticate your access. Analytics cookies may be used, if consented by you, to measure traffic patterns and optimize platform features."
        },
        {
          title: "7. Storage and Security",
          text: "Your account data and preferences are stored in secure servers managed by Google Cloud Platform's Firebase, protected by encryption at rest and in transit. We adopt standard technical information security measures to prevent unauthorized access."
        },
        {
          title: "8. Data Retention",
          text: "We retain your personal account data and history as long as your account remains active on our platform. You can clear your history or request account deletion at any time."
        },
        {
          title: "9. User Rights",
          text: "You have legal privacy rights (such as LGPD and GDPR), including the right to access, correct, port, and delete your data, as well as withdraw consent for non-essential cookies."
        },
        {
          title: "10. How to Request Deletion or Modification of Data",
          text: "You can update your profile name directly in your account settings. To request permanent deletion of your data and account, simply email your request to support@astralearning.com. Processing will be completed within 15 business days."
        },
        {
          title: "11. Contact",
          text: "To clear up doubts about this Privacy Policy or the handling of your personal data, reach out via: privacy@astralearning.com or support@astralearning.com."
        }
      ]
    },
    es: {
      title: "Política de Privacidad",
      subtitle: "Cómo protegemos y gestionamos su información en Astra Learning.",
      lastUpdated: "Última actualización: Julio de 2026",
      backBtn: "Volver",
      baseText: "Astra Learning utiliza datos de cuenta, preferencias, historial de videos y contenidos generados para ofrecer funcionalidades educativas con inteligencia artificial. La información puede ser procesada por servicios de infraestructura e IA, como Firebase, Google Cloud y Gemini, siempre con el objetivo de entregar la experiencia de la plataforma.",
      sections: [
        {
          title: "1. Introducción",
          text: "Bienvenido a Astra Learning. Nos comprometemos con la protección de sus datos personales y la transparencia sobre cómo recopilamos, usamos y compartimos la información que confía en nosotros."
        },
        {
          title: "2. Datos que recopilamos",
          text: "Recopilamos datos proporcionados directamente por usted al crear su cuenta (nombre, correo electrónico, foto de perfil) o al interactuar con la plataforma. También recopilamos el historial de URL de videos analizados y las preferencias configuradas en el sistema."
        },
        {
          title: "3. Cómo usamos seus datos",
          text: "Los datos recopilados se utilizan exclusivamente para: mantener su sesión activa, personalizar las sugerencias y formatos de estudio, procesar las solicitudes de análisis de video, generar resúmenes y mapas mentales, y para la comunicación sobre mejoras en la plataforma."
        },
        {
          title: "4. Uso de IA y procesamiento de contenido",
          text: "Para ofrecer las características inteligentes (como resúmenes, tutorías y mapas mentales), las transcripciones e información de los videos pueden ser procesadas por servicios de inteligencia artificial de socios tecnológicos, específicamente la API Gemini de Google Cloud. Nuestros flujos garantizan que estos datos se envíen de forma segura y no se utilicen de manera pública para entrenar modelos de IA externos."
        },
        {
          title: "5. Compartir con terceros",
          text: "No vendemos ni alquilamos seus datos personales. Compartimos información estrictamente necesaria para el funcionamiento técnico de la plataforma con proveedores de infraestructura alojados en la nube (Firebase Authentication, Cloud Run, Firestore) y la API Gemini, siguiendo rigurosos estándares de seguridad."
        },
        {
          title: "6. Cookies y tecnologías similares",
          text: "Utilizamos cookies esenciales para mantener su sesión conectada de manera segura y autenticar su acceso. Se pueden utilizar cookies de análisis (Analytics), con su consentimiento, para medir patrones de tráfico y optimizar las funciones de la plataforma."
        },
        {
          title: "7. Almacenamiento y seguridad",
          text: "Los datos de su cuenta y preferencias se almacenan en servidores seguros gestionados por Firebase de Google Cloud Platform, protegidos mediante cifrado en reposo y en tránsito. Adoptamos medidas técnicas recomendadas de seguridad de la información para evitar accesos no autorizados."
        },
        {
          title: "8. Retención de datos",
          text: "Conservamos seus datos personales de cuenta y el historial mientras su cuenta esté activa en la plataforma. Puede borrar su historial o solicitar la eliminación de su cuenta en cualquier momento."
        },
        {
          title: "9. Derechos del usuario",
          text: "Tiene derechos de privacidad garantizados por la ley (como GDPR y LGPD), incluido el derecho a acceder, corregir, portar y eliminar seus datos, así como retirar el consentimiento para el uso de cookies no esenciales."
        },
        {
          title: "10. Cómo solicitar la eliminación o modificación de datos",
          text: "Puede actualizar su nombre de perfil directamente en la configuración de su cuenta. Para solicitar la eliminación definitiva de seus datos y de su cuenta, simplemente envíe un correo electrónico con la solicitud a support@astralearning.com. El procesamiento se completará en un plazo de 15 días hábiles."
        },
        {
          title: "11. Contacto",
          text: "Para resolver dudas sobre esta Política de Privacidad o sobre el tratamiento de seus datos personales, póngase en contacto a través de: privacy@astralearning.com o support@astralearning.com."
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
            <Shield size={20} />
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
        <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${
          isDarkMode
            ? 'bg-[#121215] border-orange-500/10 text-orange-400/90'
            : 'bg-orange-50/40 border-orange-200/50 text-orange-850'
        }`}>
          {t.baseText}
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
