import React, { useMemo, useEffect, useState, useCallback, memo, useRef } from 'react';
import ReactFlow, { 
  Node, 
  Edge, 
  Background, 
  BackgroundVariant,
  Controls, 
  ConnectionLineType,
  MarkerType,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { motion } from 'motion/react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { 
  Plus, 
  Minus, 
  Layout, 
  Maximize2,
  ZoomIn,
  ZoomOut,
  Info,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Download,
  Zap,
  FileText,
  FileJson,
  Presentation,
  FileImage,
  Send,
  X,
  Sparkles,
  Check,
  AlertCircle,
  Brain,
  Lightbulb,
  HelpCircle,
  Target
} from 'lucide-react';

import { api } from '../lib/api';

const THEME_COLORS = [
  { accent: '#3b82f6', barBg: 'bg-blue-500' },
  { accent: '#10b981', barBg: 'bg-emerald-500' },
  { accent: '#8b5cf6', barBg: 'bg-violet-500' },
  { accent: '#f59e0b', barBg: 'bg-amber-500' },
  { accent: '#ec4899', barBg: 'bg-pink-500' },
  { accent: '#f43f5e', barBg: 'bg-rose-500' },
  { accent: '#6366f1', barBg: 'bg-indigo-500' },
  { accent: '#14b8a6', barBg: 'bg-teal-500' }
];

interface CustomNodeProps {
  id: string;
  data: {
    label: string;
    description?: string;
    level?: number;
    isRoot?: boolean;
    hasChildren: boolean;
    isCollapsed: boolean;
    toggleNode: (id: string, e: React.MouseEvent) => void;
    id: string;
    colorIndex?: number;
    isDarkMode?: boolean;
    lang?: string;
  };
  targetPosition?: Position;
  sourcePosition?: Position;
}

const CustomNode = memo(({ id, data, targetPosition = Position.Left, sourcePosition = Position.Right }: CustomNodeProps) => {
  const { label, description, level = 2, isRoot, hasChildren, isCollapsed, toggleNode, colorIndex, isDarkMode = true, lang = 'pt' } = data;
  
  const catStyle = typeof colorIndex === 'number' 
    ? THEME_COLORS[colorIndex % THEME_COLORS.length] 
    : THEME_COLORS[0];

  // Sizing and hierarchy-based styling
  let widthClass = 'w-[220px] min-h-[70px]';
  let cardBg = isDarkMode ? 'bg-[#070b14] hover:bg-[#0e131f]' : 'bg-slate-50 hover:bg-slate-100/85';
  let titleStyle = isDarkMode ? 'text-[12px] font-semibold text-zinc-300' : 'text-[12px] font-semibold text-slate-750';
  let borderStyle = isDarkMode ? 'border-zinc-850/80 shadow-[0_4px_12px_rgba(0,0,0,0.15)]' : 'border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.02)]';
  let descStyle = isDarkMode ? 'text-zinc-400' : 'text-slate-500';

  if (isRoot || level === 1) {
    widthClass = 'w-[280px] min-h-[90px]';
    cardBg = isDarkMode 
      ? 'bg-gradient-to-br from-[#101524] to-[#1e1b4b]/20 hover:to-[#1e1b4b]/30' 
      : 'bg-gradient-to-br from-white to-indigo-50/30 hover:to-indigo-50/50';
    titleStyle = isDarkMode ? 'text-[14px] font-black text-white' : 'text-[14px] font-black text-slate-900';
    borderStyle = isDarkMode 
      ? 'border-indigo-500/50 ring-2 ring-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)]' 
      : 'border-indigo-500/40 ring-2 ring-indigo-500/5 shadow-[0_0_25px_rgba(99,102,241,0.08)]';
    descStyle = isDarkMode ? 'text-zinc-450' : 'text-slate-600';
  } else if (level === 2) {
    widthClass = 'w-[240px] min-h-[80px]';
    cardBg = isDarkMode ? 'bg-[#0e131f] hover:bg-[#161c2c]' : 'bg-white hover:bg-slate-50';
    titleStyle = isDarkMode ? 'text-[13px] font-extrabold text-zinc-100' : 'text-[13px] font-extrabold text-slate-800';
    borderStyle = isDarkMode ? 'border-zinc-800 shadow-[0_4px_12px_rgba(0,0,0,0.2)]' : 'border-slate-200/90 shadow-[0_4px_12px_rgba(15,23,42,0.03)]';
    descStyle = isDarkMode ? 'text-zinc-400' : 'text-slate-500';
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`relative px-4 py-3.5 rounded-2xl border flex flex-col justify-center gap-1.5 transition-all duration-300 text-left ${widthClass} ${cardBg} ${borderStyle}`}
    >
      <Handle type="target" position={targetPosition} className="!opacity-0 !w-0 !h-0" />
      
      {/* Side Accent Line */}
      {!(isRoot || level === 1) && (
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${catStyle.barBg}`} />
      )}
      {(isRoot || level === 1) && (
        <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-indigo-500" />
      )}

      {/* Content Area */}
      <div className="flex items-start justify-between gap-3 w-full pl-1.5">
        <div className="flex-1 min-w-0 py-0.5">
          <p className={`${titleStyle} break-words leading-snug`}>
            {label}
          </p>
          {description && (
            <p className={`text-[10.5px] leading-relaxed mt-1 font-medium break-words line-clamp-3 ${descStyle}`}>
              {description}
            </p>
          )}
        </div>

        {/* Expand/Collapse Handle */}
        {hasChildren && (
          <button 
            onClick={(e) => toggleNode(id, e)}
            title={isCollapsed 
              ? (lang === 'pt' ? 'Expandir tópico' : lang === 'es' ? 'Expandir tema' : 'Expand topic') 
              : (lang === 'pt' ? 'Recolher tópico' : lang === 'es' ? 'Contraer tema' : 'Collapse topic')
            }
            className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-lg border transition-all shadow-sm mt-0.5 cursor-pointer ${
              isDarkMode 
                ? 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-900 hover:border-zinc-700' 
                : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-350'
            }`}
          >
            {isCollapsed ? <Plus size={11} strokeWidth={2.5} /> : <Minus size={11} strokeWidth={2.5} />}
          </button>
        )}
      </div>

      <Handle type="source" position={sourcePosition} className="!opacity-0 !w-0 !h-0" />
    </motion.div>
  );
});

const nodeTypes = {
  mindmap: CustomNode
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const isHorizontal = direction === 'LR';
  
  dagreGraph.setGraph({ 
    rankdir: direction, 
    marginx: 80, 
    marginy: 60,
    ranksep: isHorizontal ? 120 : 100,
    nodesep: isHorizontal ? 32 : 140
  });

  nodes.forEach((node) => {
    const level = node.data?.level || (node.data?.isRoot ? 1 : 2);
    const hasDesc = !!node.data?.description;
    let w = 220;
    let h = 70;
    if (level === 1) {
      w = 280;
      h = hasDesc ? 110 : 90;
    } else if (level === 2) {
      w = 240;
      h = hasDesc ? 95 : 80;
    } else {
      w = 220;
      h = hasDesc ? 85 : 70;
    }
    dagreGraph.setNode(node.id, { width: w, height: h });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const level = node.data?.level || (node.data?.isRoot ? 1 : 2);
    const hasDesc = !!node.data?.description;
    let w = 220;
    let h = 70;
    if (level === 1) {
      w = 280;
      h = hasDesc ? 110 : 90;
    } else if (level === 2) {
      w = 240;
      h = hasDesc ? 95 : 80;
    } else {
      w = 220;
      h = hasDesc ? 85 : 70;
    }
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - (w / 2),
        y: nodeWithPosition.y - (h / 2),
      },
    };
  });

  return { nodes: newNodes, edges };
};

interface Props {
  data: any;
  centralTopic?: string;
  isDarkMode?: boolean;
  mode?: 'transcript' | 'metadata_fallback';
  lang?: string;
  onRegenerate?: () => void;
  videoTitle?: string;
  summary?: string;
  transcript?: string;
  explanationLevel?: 'basic' | 'intermediate' | 'advanced';
}

const headerTexts = {
  pt: {
    title: "Mapa Mental Gerado",
    subtitle: "Explore os principais tópicos extraídos do vídeo.",
    btnRegenerate: "Gerar novamente",
    btnRegenerateDesc: "Recria o mapa com uma nova organização dos tópicos.",
    btnRecenter: "Centralizar mapa",
    btnExpandAll: "Expandir tudo",
    btnCollapseAll: "Recolher tudo",
    btnExport: "Exportar",
    exportHeader: "Exportar mapa mental",
    exportPDF: "Baixar em PDF",
    exportPDFDesc: "Ideal para estudar, imprimir ou compartilhar.",
    exportPNG: "Baixar em PNG",
    exportPNGDesc: "Ideal para salvar como imagem ou usar em apresentações.",
    sourceMetadata: "Fonte: metadados do vídeo",
    sourceTranscript: "Fonte: transcrição do vídeo",
    tooltipMetadata: "A transcrição do vídeo não estava disponível. Este mapa foi gerado com base no título, descrição, canal e metadados públicos do vídeo.",
    tooltipTranscript: "Este mapa foi gerado com base na transcrição completa e exata do áudio do vídeo."
  },
  es: {
    title: "Mapa Mental Generado",
    subtitle: "Explora los principales temas extraídos del video.",
    btnRegenerate: "Generar de nuevo",
    btnRegenerateDesc: "Recalcula el mapa con uma nueva organización de temas.",
    btnRecenter: "Centrar mapa",
    btnExpandAll: "Expandir todo",
    btnCollapseAll: "Contraer todo",
    btnExport: "Exportar",
    exportHeader: "Exportar mapa mental",
    exportPDF: "Descargar en PDF",
    exportPDFDesc: "Ideal para estudiar, imprimir o compartir.",
    exportPNG: "Descargar en PNG",
    exportPNGDesc: "Ideal para guardar como imagen o usar en presentaciones.",
    sourceMetadata: "Fuente: metadatos del video",
    sourceTranscript: "Fuente: transcripción del video",
    tooltipMetadata: "La transcripción del video no estaba disponible. Este mapa fue generado con base en el título, descripción, canal y metadatos públicos del video.",
    tooltipTranscript: "Este mapa fue generado con base en la transcripción completa y exacta del audio del video."
  },
  en: {
    title: "Generated Mind Map",
    subtitle: "Explore the main topics extracted from the video.",
    btnRegenerate: "Regenerate",
    btnRegenerateDesc: "Recreates the map with a new organization of topics.",
    btnRecenter: "Recenter map",
    btnExpandAll: "Expand all",
    btnCollapseAll: "Collapse all",
    btnExport: "Export",
    exportHeader: "Export mind map",
    exportPDF: "Download as PDF",
    exportPDFDesc: "Ideal for studying, printing, or sharing.",
    exportPNG: "Download as PNG",
    exportPNGDesc: "Ideal for saving as an image or using in presentations.",
    sourceMetadata: "Source: video metadata",
    sourceTranscript: "Source: video transcript",
    tooltipMetadata: "The video transcription was not available. This map was generated based on the title, description, channel, and public metadata of the video.",
    tooltipTranscript: "This map was generated based on the complete and exact audio transcript of the video."
  }
};

const askTexts = {
  pt: {
    placeholder: "Pergunte sobre este mapa mental...",
    explain: "Explique o tema central",
    quiz: "Gere um quiz",
    summary: "Resuma pontos",
    examples: "Exemplos práticos",
    loading: "Astra AI está analisando...",
    aiTitle: "Astra AI Assistente",
    close: "Fechar",
    correct: "Correto!",
    incorrect: "Incorreto. Tente novamente!",
    backToMap: "Voltar para o mapa",
    clickNodeHint: "Dica: Você também pode clicar em qualquer caixa do mapa para perguntar sobre ela!"
  },
  es: {
    placeholder: "Pregunta sobre este mapa mental...",
    explain: "Explicar tema central",
    quiz: "Generar un quiz",
    summary: "Resumir puntos",
    examples: "Ejemplos prácticos",
    loading: "Astra AI está analizando...",
    aiTitle: "Astra AI Asistente",
    close: "Cerrar",
    correct: "¡Correcto!",
    incorrect: "Incorrecto. ¡Inténtalo de nuevo!",
    backToMap: "Volver al mapa",
    clickNodeHint: "Sugerencia: ¡También puedes hacer clic en qualquer casilla del mapa para preguntar sobre ella!"
  },
  en: {
    placeholder: "Ask about this mind map...",
    explain: "Explain central theme",
    quiz: "Generate a quiz",
    summary: "Summarize points",
    examples: "Practical examples",
    loading: "Astra AI is analyzing...",
    aiTitle: "Astra AI Assistant",
    close: "Close",
    correct: "Correct!",
    incorrect: "Incorrect. Try again!",
    backToMap: "Back to map",
    clickNodeHint: "Tip: You can also click on any node in the map to ask about it!"
  }
};

const InteractiveMindMapInner = ({ 
  data, 
  centralTopic, 
  isDarkMode = true, 
  mode = 'transcript', 
  lang = 'pt', 
  onRegenerate,
  videoTitle,
  summary,
  transcript,
  explanationLevel = 'intermediate'
}: Props) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [layout, setLayout] = useState<'LR' | 'TB'>('LR');
  const tAsk = askTexts[lang as 'pt' | 'es' | 'en'] || askTexts.pt;
  
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const fitViewRef = useRef(fitView);
  fitViewRef.current = fitView;
  const shouldFitViewRef = useRef(true);

  useEffect(() => {
    shouldFitViewRef.current = true;
  }, [data]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // AI Interaction states (Phase 4)
  const [question, setQuestion] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedAnswerIdx, setSelectedAnswerIdx] = useState<Record<number, number>>({});

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isPopoverOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPopoverOpen]);

  useEffect(() => {
    if (!isExportOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportOpen]);

  const handleRecenter = useCallback(() => {
    fitView({ padding: 0.25, duration: 600, maxZoom: 0.95 });
  }, [fitView]);

  const toggleNode = useCallback((nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  // Normalize data format
  const normalizedData = useMemo(() => {
    if (!data) return null;
    
    if (data.centralTopic && Array.isArray(data.nodes)) {
      const transformNode = (node: any, depth = 1): any => {
        if (depth > 25) return null;
        return {
          topic: node.label,
          description: node.description,
          level: node.level || depth,
          children: Array.isArray(node.children) 
            ? node.children.map((c: any) => transformNode(c, depth + 1)).filter(Boolean) 
            : []
        };
      };
      
      return {
        topic: data.centralTopic,
        description: data.description,
        children: data.nodes.map((n: any) => transformNode(n, 1))
      };
    }
    
    return data;
  }, [data]);

  const masterGraph = useMemo(() => {
    const masterNodes: Node[] = [];
    const masterEdges: Edge[] = [];
    let idCounter = 0;
    const seenNodes = new Set<string>();

    const addNode = (nodeData: any, parentId: string | null = null, colorIndex?: number, level = 1): string => {
      const label = typeof nodeData === 'string' ? nodeData : (nodeData.topic || nodeData.label || "Untitled");
      const description = typeof nodeData === 'object' ? (nodeData.description || nodeData.desc) : undefined;
      const nodeKey = `${parentId}-${label}`;
      
      if (parentId && seenNodes.has(nodeKey)) {
        return "";
      }
      seenNodes.add(nodeKey);

      const id = `node-${idCounter++}`;
      const isRoot = parentId === null;
      
      masterNodes.push({
        id,
        type: 'mindmap',
        data: { 
          label, 
          description,
          level,
          isRoot, 
          parentId,
          colorIndex,
          id
        },
        position: { x: 0, y: 0 },
      });

      if (parentId) {
        masterEdges.push({
          id: `edge-${parentId}-${id}`,
          source: parentId,
          target: id,
          type: ConnectionLineType.Bezier,
        });
      }

      return id;
    };

    const targetSource = normalizedData || {};
    const rootId = addNode(
      typeof targetSource === 'object' && targetSource.topic ? targetSource : (centralTopic || "Topic"),
      null,
      undefined,
      1
    );

    const parseRecursive = (nodeData: any, parentId: string, parentColorIndex?: number, parentLevel = 1) => {
      if (parentLevel > 25) return;
      const children = nodeData.children || nodeData.subtopics;
      if (children && Array.isArray(children)) {
        children.forEach((child, index) => {
          const childColorIndex = parentId === rootId ? index % THEME_COLORS.length : parentColorIndex;
          const currentLevel = parentLevel + 1;
          const childId = addNode(child, parentId, childColorIndex, currentLevel);
          if (typeof child === 'object' && childId) {
            parseRecursive(child, childId, childColorIndex, currentLevel);
          }
        });
      }
    };

    if (Array.isArray(targetSource)) {
      targetSource.forEach((item, idx) => addNode(item, rootId, idx % THEME_COLORS.length, 2));
    } else if (typeof targetSource === 'object' && targetSource !== null) {
      parseRecursive(targetSource, rootId, undefined, 1);
    } else if (typeof targetSource === 'string') {
      const lines = targetSource.split('\n').filter(l => l.trim().length > 0);
      lines.forEach((line, idx) => addNode(line.trim(), rootId, idx % THEME_COLORS.length, 2));
    }

    return { masterNodes, masterEdges };
  }, [normalizedData, centralTopic]);

  const subTopics = useMemo(() => {
    const { masterNodes } = masterGraph;
    return masterNodes
      .filter(n => !n.data.isRoot && n.data.level === 2)
      .map(n => n.data.label)
      .slice(0, 3);
  }, [masterGraph]);

  const generateResponse = useCallback((query: string, selection?: string) => {
    const cleanQuery = query.toLowerCase();
    const topicName = selection || centralTopic || "tópico principal";
    const subList = subTopics.length > 0 ? subTopics : ["Conceitos fundamentais", "Aplicações práticas", "Aprofundamento"];

    if (cleanQuery.includes('quiz') || cleanQuery.includes('pergunta') || cleanQuery.includes('test')) {
      return {
        type: 'quiz',
        title: `Mini-Quiz: ${topicName}`,
        questions: [
          {
            question: lang === 'pt' 
              ? `Qual das seguintes opções melhor descreve o objetivo central de "${topicName}"?`
              : lang === 'es'
              ? `¿Cuál de las siguientes opciones describe mejor el objetivo central de "${topicName}"?`
              : `Which of the following options best describes the central objective of "${topicName}"?`,
            options: [
              lang === 'pt' ? `Aprofundar a compreensão sistemática dos conceitos e suas conexões práticas.` : `Deepening the systematic understanding of concepts and their practical connections.`,
              lang === 'pt' ? `Apenas memorizar datas e fatos isolados sem contextualização.` : `Just memorizing isolated dates and facts without contextualization.`,
              lang === 'pt' ? `Substituir o estudo ativo por visualizações passivas.` : `Replacing active study with passive visualizations.`,
            ],
            correctIdx: 0,
            explanation: lang === 'pt' 
              ? `O estudo sistemático e as conexões práticas ajudam na fixação e na compreensão profunda de ${topicName}.`
              : `Systematic study and practical connections help in retention and deep understanding of ${topicName}.`
          },
          {
            question: lang === 'pt'
              ? `Em relação ao sub-tema "${subList[0] || 'Tópico Secundário'}", o que podemos inferir?`
              : `Regarding the sub-topic "${subList[0] || 'Secondary Topic'}", what can we infer?`,
            options: [
              lang === 'pt' ? `Trata-se de uma vertente sem importância para a compreensão global.` : `It is an unimportant branch for global understanding.`,
              lang === 'pt' ? `É uma das ramificações essenciais conectadas diretamente ao tema central.` : `It is one of the essential branches connected directly to the central theme.`,
              lang === 'pt' ? `Não possui qualquer correlação com o conteúdo extraído.` : `It has no correlation with the extracted content.`,
            ],
            correctIdx: 1,
            explanation: lang === 'pt'
              ? `As ramificações conectadas ajudam a dividir a complexidade do assunto central em partes gerenciáveis.`
              : `Connected branches help break down the complexity of the central subject into manageable parts.`
          }
        ]
      };
    }

    if (cleanQuery.includes('exemplo') || cleanQuery.includes('prático') || cleanQuery.includes('practic') || cleanQuery.includes('example')) {
      return {
        type: 'markdown',
        title: lang === 'pt' ? `Exemplos Práticos: ${topicName}` : lang === 'es' ? `Ejemplos Prácticos: ${topicName}` : `Practical Examples: ${topicName}`,
        content: lang === 'pt' ? `
Aqui estão alguns exemplos de como aplicar os conceitos de **${topicName}** no mundo real:

1. **Cenário de Resolução de Problemas**
   - Ao aplicar os ensinamentos de *${subList[0] || 'Conceitos Fundamentais'}*, você pode estruturar e isolar variáveis complexas de forma modular, permitindo testes rápidos e redução de erros.

2. **Estudo de Caso Prático**
   - No gerenciamento ou execução de *${subList[1] || 'Processos Chave'}*, empresas utilizam esses mesmos pilares estruturais para desenhar fluxos de trabalho que facilitam a colaboração.

3. **Aplicação do Aprendizado Ativo**
   - Utilize as divisões apresentadas em *${subList[2] || 'Aprofundamento'}* como uma lista de verificação diária ou metas de estudo para solidificar a retenção de longo prazo.
` : `
Here are some examples of how to apply **${topicName}** concepts in the real world:

1. **Problem Solving Scenario**
   - By applying the teachings of *${subList[0] || 'Key Concepts'}*, you can structure and isolate complex variables modularly, allowing rapid testing.

2. **Practical Case Study**
   - In managing or executing *${subList[1] || 'Key Processes'}*, companies use these same structural pillars to design workflows that facilitate collaboration.

3. **Active Learning Application**
   - Use the divisions shown in *${subList[2] || 'Deepening'}* as a checklist or study goals to solidify long-term retention.
`
      };
    }

    if (cleanQuery.includes('resum') || cleanQuery.includes('pontos') || cleanQuery.includes('key') || cleanQuery.includes('summar') || cleanQuery.includes('point')) {
      return {
        type: 'markdown',
        title: lang === 'pt' ? `Resumo dos Pontos-Chave: ${topicName}` : lang === 'es' ? `Resumen de Puntos Clave: ${topicName}` : `Key Points Summary: ${topicName}`,
        content: lang === 'pt' ? `
Aqui está um resumo compacto estruturado em torno do mapa mental de **${topicName}**:

*   **Tema Central**: O núcleo do aprendizado, servindo como a âncora principal para todas as ramificações visuais.
*   **Ramificação Primária (${subList[0] || 'Conceitos'})**: Define a base conceitual e teórica do tópico. Entender esta parte é crucial antes de passar para detalhes complexos.
*   **Ramificação Secundária (${subList[1] || 'Processamento'})**: Foca em como os conceitos interagem entre si na prática.
*   **Aprofundamento (${subList[2] || 'Tópico Avançado'})**: Onde residem as nuances e ramificações avançadas que tornam o domínio deste tópico completo.
` : `
Here is a compact summary structured around the **${topicName}** mind map:

*   **Central Theme**: The core of the learning, serving as the primary anchor for all visual branches.
*   **Primary Branch (${subList[0] || 'Concepts'})**: Defines the conceptual and theoretical foundation of the topic. Understanding this is crucial before moving to complex details.
*   **Secondary Branch (${subList[1] || 'Processing'})**: Focuses on how concepts interact with each other in practice.
*   **Deepening (${subList[2] || 'Advanced Topic'})**: Where nuances and advanced branches reside that make mastering this topic complete.
`
      };
    }

    return {
      type: 'markdown',
      title: lang === 'pt' ? `Explicação do Astra AI: ${topicName}` : lang === 'es' ? `Explicación de Astra AI: ${topicName}` : `Astra AI Explanation: ${topicName}`,
      content: lang === 'pt' ? `
O tema central **${topicName}** é uma estrutura de aprendizado focada e densa. Ao desmembrá-lo através das ramificações deste mapa mental, conseguimos:

1.  **Mapear conexões entre conceitos**: Como as ramificações mais profundas, como *${subList[0] || 'a base'}*, se sustentam e estendem a ideia original.
2.  **Identificar pontos-chave**: Os nós de nível secundário (por exemplo, *${subList[1] || 'aplicações'}* e *${subList[2] || 'desafios'}*) servem como pontes para o conhecimento prático.
3.  **Facilitar a retenção visual**: A hierarquia de cores e nós recolhíveis do Astra Learning estimula a memória espacial durante seus estudos.

*Para discussões adicionais altamente específicas sobre outros aspectos deste vídeo, sinta-se à vontade para alternar para a aba **Tutor** acima!*
` : `
The central theme **${topicName}** is a focused and dense learning structure. By breaking it down through the branches of this mind map, we can:

1.  **Map connections between concepts**: How deep branches, like *${subList[0] || 'the foundation'}*, support and extend the original idea.
2.  **Identify key nodes**: Second-level nodes (such as *${subList[1] || 'applications'}* and *${subList[2] || 'challenges'}*) serve as bridges to practical knowledge.
3.  **Facilitate visual retention**: Astra Learning's hierarchy of colors and collapsible nodes stimulates spatial memory during your studies.

*For highly specific additional discussions on other aspects of this video, feel free to switch to the **Tutor** tab above!*
`
    };
  }, [centralTopic, subTopics, lang]);

  const handleSend = useCallback((customQuery?: string) => {
    const q = customQuery !== undefined ? customQuery : question;
    if (!q.trim()) return;

    setIsAiLoading(true);
    setAiResponse(null);
    setSelectedAnswerIdx({});

    const payload = {
      question: q,
      centralTopic,
      mindMap: data,
      videoTitle,
      summary,
      transcript,
      mode,
      lang,
      targetLanguage: lang,
      explanationLevel
    };

    api.post('/mindmap-chat', payload)
      .then((res) => {
        setAiResponse(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch mindmap chat response:", err);
        let errorMsg = lang === 'pt'
          ? "Desculpe, não consegui obter uma resposta da IA neste momento. Por favor, tente novamente!"
          : lang === 'es'
            ? "Lo siento, no pude obtener una respuesta de la IA en este momento. ¡Por favor, inténtalo de nuevo!"
            : "Sorry, I couldn't get an AI response right now. Please try again!";
        if ((err as any).isHtmlResponse) {
          errorMsg = lang === 'pt'
            ? "Sessão expirada ou cookies bloqueados. Por favor, recarregue a página ou abra o aplicativo em uma nova aba."
            : lang === 'es'
              ? "Sesión expirada o cookies bloqueadas. Por favor, recargue la página o abra la aplicación en una pestaña nueva."
              : "Session expired or cookies blocked. Please refresh the page or open the application in a new tab.";
        }
        setAiResponse({
          type: 'markdown',
          title: lang === 'pt' ? "Erro na IA" : lang === 'es' ? "Error en la IA" : "AI Error",
          content: errorMsg
        });
      })
      .finally(() => {
        setIsAiLoading(false);
      });

    setQuestion('');
  }, [question, centralTopic, data, videoTitle, summary, transcript, mode, lang, explanationLevel]);

  useEffect(() => {
    const { masterNodes, masterEdges } = masterGraph;

    const hiddenNodes = new Set<string>();
    const isNodeHidden = (nodeId: string, visited = new Set<string>()): boolean => {
      if (hiddenNodes.has(nodeId)) return true;
      if (visited.has(nodeId)) return false; // Break parental/ancestry cycles
      const node = masterNodes.find(n => n.id === nodeId);
      if (!node) return false;
      const parentId = node.data.parentId;
      if (parentId) {
        visited.add(nodeId);
        const parentHidden = isNodeHidden(parentId, visited) || collapsedNodes.has(parentId);
        visited.delete(nodeId);
        if (parentHidden) {
          hiddenNodes.add(nodeId);
          return true;
        }
      }
      return false;
    };

    const visibleNodes = masterNodes
      .filter(n => !isNodeHidden(n.id))
      .map(n => ({
        ...n,
        data: {
          ...n.data,
          hasChildren: masterEdges.some(e => e.source === n.id),
          isCollapsed: collapsedNodes.has(n.id),
          toggleNode,
          isDarkMode,
          lang
        }
      }));

    const visibleEdges = masterEdges
      .filter(e => !hiddenNodes.has(e.source) && !hiddenNodes.has(e.target))
      .map(e => {
        const targetNode = masterNodes.find(n => n.id === e.target);
        const colorIndex = targetNode?.data.colorIndex;
        const catStyle = typeof colorIndex === 'number' 
          ? THEME_COLORS[colorIndex % THEME_COLORS.length] 
          : THEME_COLORS[0];
        
        return {
          ...e,
          style: { 
            stroke: catStyle.accent, 
            strokeWidth: 1.5,
            opacity: isDarkMode ? 0.22 : 0.28
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 8,
            height: 8,
            color: catStyle.accent,
          },
        };
      });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      visibleNodes,
      visibleEdges,
      layout
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);

    if (shouldFitViewRef.current) {
      setTimeout(() => {
        if (fitViewRef.current) {
          fitViewRef.current({ padding: 0.25, duration: 450, maxZoom: 0.95 });
        }
      }, 100);
      shouldFitViewRef.current = false;
    }

  }, [masterGraph, collapsedNodes, setNodes, setEdges, toggleNode, layout, isDarkMode, lang]);

  const hTexts = headerTexts[lang as 'pt' | 'es' | 'en'] || headerTexts['en'];

  const sourceLabel = mode === 'metadata_fallback' ? hTexts.sourceMetadata : hTexts.sourceTranscript;
  const tooltipText = mode === 'metadata_fallback' ? hTexts.tooltipMetadata : hTexts.tooltipTranscript;

  const handleExpandAll = () => {
    setCollapsedNodes(new Set());
  };

  const handleCollapseAll = () => {
    const parentNodeIds = masterGraph.masterNodes
      .filter(n => masterGraph.masterEdges.some(e => e.source === n.id))
      .map(n => n.id);
    setCollapsedNodes(new Set(parentNodeIds));
  };

  const exportToMarkdown = () => {
    const traverse = (node: any, depth = 0): string => {
      const indent = "  ".repeat(depth);
      let str = `${indent}- **${node.topic || node.label || "Tópico"}**`;
      if (node.description || node.desc) {
        str += `: ${node.description || node.desc}`;
      }
      str += "\n";
      const children = node.children || node.subtopics;
      if (children && Array.isArray(children)) {
        children.forEach((child: any) => {
          str += traverse(child, depth + 1);
        });
      }
      return str;
    };
    
    if (!normalizedData) return;
    const mdText = traverse(normalizedData);
    const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${centralTopic || 'mapa-mental'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    if (!normalizedData) return;
    const jsonString = JSON.stringify(normalizedData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${centralTopic || 'mapa-mental'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPNG = () => {
    const element = document.querySelector('.react-flow') as HTMLElement;
    if (!element) return;

    toPng(element, {
      backgroundColor: isDarkMode ? '#060a13' : '#f8fafc',
      style: {
        borderRadius: '2rem',
      },
      filter: (domNode: any) => {
        if (domNode.classList?.contains('react-flow__panel')) {
          return false;
        }
        return true;
      }
    })
    .then((dataUrl) => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${centralTopic || 'mapa-mental'}.png`;
      a.click();
    })
    .catch((err) => {
      console.error('Error generating PNG:', err);
    });
  };

  const exportToPDF = () => {
    const element = document.querySelector('.react-flow') as HTMLElement;
    if (!element) return;

    toPng(element, {
      backgroundColor: isDarkMode ? '#060a13' : '#f8fafc',
      style: {
        borderRadius: '2rem',
      },
      filter: (domNode: any) => {
        if (domNode.classList?.contains('react-flow__panel')) {
          return false;
        }
        return true;
      }
    })
    .then((dataUrl) => {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();

      // Top decorative bar
      pdf.setFillColor(234, 88, 12); // #ea580c (Orange-600)
      pdf.rect(0, 0, width, 6, 'F');

      // Header Brand
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(15, 23, 42); // slate-900
      pdf.text('Astra Learning', 15, 18);

      pdf.setFontSize(13);
      pdf.setTextColor(71, 85, 105); // slate-600
      pdf.text(lang === 'pt' ? 'Mapa Mental do Vídeo' : lang === 'es' ? 'Mapa Mental del Video' : 'Video Mind Map', 15, 25);

      // Topic Name
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      pdf.text(`${lang === 'pt' ? 'Vídeo' : lang === 'es' ? 'Video' : 'Video'}:`, 15, 33);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(51, 65, 85);
      const titleText = centralTopic || '';
      const wrappedTitle = pdf.splitTextToSize(titleText, 250);
      pdf.text(wrappedTitle, 28, 33);

      // Wrapped lines offset
      const titleLines = Array.isArray(wrappedTitle) ? wrappedTitle.length : 1;
      const metadataY = 33 + (titleLines * 4.5);

      // Source & Generation Date info
      const sourceText = mode === 'metadata_fallback'
        ? (lang === 'pt' ? 'Fonte: Metadados do vídeo' : lang === 'es' ? 'Fuente: Metadatos del video' : 'Source: Video metadata')
        : (lang === 'pt' ? 'Fonte: Transcrição do vídeo' : lang === 'es' ? 'Fuente: Transcripción del video' : 'Source: Video transcript');

      const currentDate = new Date().toLocaleDateString(lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text(`${sourceText}   |   ${lang === 'pt' ? 'Gerado em' : lang === 'es' ? 'Generado el' : 'Generated on'}: ${currentDate}`, 15, metadataY);

      const imageY = metadataY + 5;
      const maxImgHeight = 210 - imageY - 14;
      const imgWidth = 267; // Landscape margins fit

      pdf.addImage(dataUrl, 'PNG', 15, imageY, imgWidth, maxImgHeight);

      // Simple footer
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184); // slate-400
      pdf.text('Astra Learning - Inteligência Artificial para Aprendizado Dinâmico', 15, 202);

      pdf.save(`${centralTopic || 'mapa-mental'}.pdf`);
    })
    .catch((err) => {
      console.error('Error generating PDF:', err);
    });
  };

  return (
    <div className={`w-full h-[580px] xs:h-[660px] sm:h-[760px] md:h-[840px] lg:h-[880px] relative flex flex-col overflow-hidden transition-all bg-transparent`}>
      {/* Sleek Action Bar - Integrated directly at the top of the workspace canvas */}
      <div className={`p-4 sm:p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-50 shrink-0 transition-all ${
        isDarkMode 
          ? 'bg-[#08080c]/90 border-zinc-900/80' 
          : 'bg-white border-slate-200/80 shadow-sm shadow-slate-100/50'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
          {/* Left Side: Title, Pro Badge & Source Info */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-base sm:text-lg font-black tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {hTexts.title}
                </h3>
                
                {/* Pro Preview Badge in a subtle pill layout */}
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-600/10 border border-orange-600/20 rounded-full select-none shrink-0">
                  <Zap size={9} className="text-orange-500 fill-current animate-pulse" />
                  <span className="text-[8px] font-extrabold text-orange-500 uppercase tracking-widest">Pro Preview</span>
                </div>
              </div>
              
              {/* Elegant Source Data indicator */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold ${
                  isDarkMode ? 'text-zinc-400' : 'text-slate-600'
                }`}>
                  <Info size={12} className={isDarkMode ? 'text-orange-400/80' : 'text-orange-500/80'} />
                  <span>{sourceLabel}</span>
                </div>
 
                {/* Details popover activator */}
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                    className={`text-[9px] px-1.5 py-0.5 rounded-md border transition-all font-bold cursor-pointer ${
                      isDarkMode 
                        ? 'text-zinc-500 border-zinc-800/80 hover:text-zinc-300 hover:bg-zinc-800/60' 
                        : 'text-slate-400 border-slate-200 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                    title="Detalhes da fonte"
                  >
                    {lang === 'pt' ? 'Detalhes' : lang === 'es' ? 'Detalles' : 'Details'}
                  </button>
 
                  {/* Explanation popover inline */}
                  {isPopoverOpen && (
                    <div 
                      ref={popoverRef}
                      className={`absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-2.5rem)] p-4 rounded-xl border shadow-2xl z-50 text-xs leading-relaxed transition-all ${
                        isDarkMode 
                          ? 'bg-[#0d0e12] border-zinc-800 text-zinc-300 shadow-black' 
                          : 'bg-white border-slate-200 text-slate-600 shadow-slate-200/50'
                      }`}
                    >
                      <p>{tooltipText}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
 
          {/* Sutil Vertical Divisor (only on desktop md+) */}
          <div className="hidden md:block w-px h-8 bg-slate-200/60 dark:bg-zinc-800/60 mx-2 shrink-0" />
 
          {/* Right Side: Actions Container - Side-by-side in a horizontal row */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 md:justify-end shrink-0 w-full md:w-auto">
            {/* Gerar novamente */}
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-orange-600/10 hover:shadow-orange-600/20 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer h-10 shrink-0"
              >
                <RefreshCw size={13} className="shrink-0" />
                <span>{hTexts.btnRegenerate}</span>
              </button>
            )}
 
            {/* Modo apresentação */}
            <button
              type="button"
              onClick={() => {
                shouldFitViewRef.current = true;
                setLayout(l => l === 'LR' ? 'TB' : 'LR');
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 rounded-xl text-xs font-bold border transition-all h-10 shrink-0 cursor-pointer ${
                isDarkMode 
                  ? 'bg-[#0c0c10]/40 border-zinc-800 text-zinc-300 hover:border-orange-500/40 hover:bg-zinc-800/60 hover:text-orange-400' 
                  : 'bg-white border-slate-200 text-slate-700 hover:border-orange-400 hover:bg-slate-50 hover:text-orange-600 shadow-sm'
              }`}
            >
              <Presentation size={13} className="shrink-0" />
              <span className="truncate">{lang === 'pt' ? 'Modo apresentação' : lang === 'es' ? 'Modo presentación' : 'Presentation Mode'}</span>
            </button>
 
            {/* Exportar Dropdown */}
            <div ref={exportRef} className="relative shrink-0 flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => setIsExportOpen(!isExportOpen)}
                className={`w-full flex items-center justify-center gap-1.5 px-4 rounded-xl text-xs font-bold border transition-all h-10 shrink-0 cursor-pointer ${
                  isDarkMode 
                    ? 'bg-[#0c0c10]/40 border-zinc-800 text-zinc-300 hover:border-orange-500/40 hover:bg-zinc-800/60 hover:text-orange-400' 
                    : 'bg-white border-slate-200 text-slate-700 hover:border-orange-400 hover:bg-slate-50 hover:text-orange-600 shadow-sm'
                }`}
              >
                <Download size={13} className="shrink-0" />
                <span>{hTexts.btnExport}</span>
              </button>
 
              {isExportOpen && (
                <div className={`absolute right-0 top-full mt-2 w-[260px] xs:w-[280px] sm:w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl z-50 p-2 transition-all ${
                  isDarkMode 
                    ? 'bg-[#0e0f14] border-zinc-800/90 text-zinc-200 shadow-black shadow-2xl' 
                    : 'bg-white border-slate-200 text-slate-700 shadow-slate-200/50 shadow-2xl'
                }`}>
                  {/* Header */}
                  <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b mb-1.5 ${
                    isDarkMode ? 'text-zinc-500 border-zinc-800/60' : 'text-slate-400 border-slate-100'
                  }`}>
                    {hTexts.exportHeader}
                  </div>

                  {/* PDF Option */}
                  <button
                    type="button"
                    onClick={() => {
                      exportToPDF();
                      setIsExportOpen(false);
                    }}
                    className={`w-full flex items-start gap-3.5 p-3 rounded-xl text-left transition-all duration-300 cursor-pointer border border-transparent group ${
                      isDarkMode 
                        ? 'hover:bg-zinc-900 hover:border-orange-500/10 hover:shadow-lg hover:shadow-orange-500/5' 
                        : 'hover:bg-orange-50/30 hover:border-orange-200/50 hover:shadow-md hover:shadow-orange-500/5'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20 group-hover:text-orange-300 group-hover:scale-105 group-hover:rotate-3' 
                        : 'bg-orange-50 text-orange-600 group-hover:bg-orange-100 group-hover:text-orange-700 group-hover:scale-105 group-hover:rotate-3'
                    }`}>
                      <FileText size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-xs font-extrabold transition-colors duration-300 ${
                        isDarkMode 
                          ? 'text-zinc-200 group-hover:text-orange-400' 
                          : 'text-slate-800 group-hover:text-orange-600'
                      }`}>
                        {hTexts.exportPDF}
                      </span>
                      <span className={`text-[10px] sm:text-xs leading-normal mt-0.5 transition-colors duration-300 ${
                        isDarkMode ? 'text-zinc-500 group-hover:text-zinc-400' : 'text-slate-500 group-hover:text-slate-600'
                      }`}>
                        {hTexts.exportPDFDesc}
                      </span>
                    </div>
                  </button>

                  {/* PNG Option */}
                  <button
                    type="button"
                    onClick={() => {
                      exportToPNG();
                      setIsExportOpen(false);
                    }}
                    className={`w-full flex items-start gap-3.5 p-3 rounded-xl text-left transition-all duration-300 cursor-pointer border border-transparent group ${
                      isDarkMode 
                        ? 'hover:bg-zinc-900 hover:border-amber-500/10 hover:shadow-lg hover:shadow-amber-500/5' 
                        : 'hover:bg-amber-50/30 hover:border-amber-200/50 hover:shadow-md hover:shadow-amber-500/5'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 group-hover:text-amber-300 group-hover:scale-105 group-hover:-rotate-3' 
                        : 'bg-amber-50 text-amber-600 group-hover:bg-amber-100 group-hover:text-amber-700 group-hover:scale-105 group-hover:-rotate-3'
                    }`}>
                      <FileImage size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-xs font-extrabold transition-colors duration-300 ${
                        isDarkMode 
                          ? 'text-zinc-200 group-hover:text-amber-400' 
                          : 'text-slate-800 group-hover:text-amber-600'
                      }`}>
                        {hTexts.exportPNG}
                      </span>
                      <span className={`text-[10px] sm:text-xs leading-normal mt-0.5 transition-colors duration-300 ${
                        isDarkMode ? 'text-zinc-500 group-hover:text-zinc-400' : 'text-slate-500 group-hover:text-slate-600'
                      }`}>
                        {hTexts.exportPNGDesc}
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* The Map view canvas - Fills the rest of the workspace container */}
      <div className="flex-1 w-full relative overflow-hidden bg-transparent">
        {/* Map Controls positioned absolutely in the top-right */}
        <div className={`absolute top-5 right-5 z-40 pointer-events-auto flex items-center gap-2 p-1.5 backdrop-blur border rounded-full shadow-xl shrink-0 transition-colors ${
          isDarkMode 
            ? 'bg-zinc-950/95 border-zinc-800/85 text-zinc-300 shadow-black/40' 
            : 'bg-white border-slate-200 text-slate-700 shadow-slate-100/60'
        }`}>
          <button
            type="button"
            onClick={() => zoomIn()}
            className={`p-2 rounded-full transition-colors shrink-0 ${
              isDarkMode ? 'text-slate-400 hover:text-white hover:bg-zinc-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Zoom In"
          >
            <ZoomIn size={14} className="shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => zoomOut()}
            className={`p-2 rounded-full transition-colors shrink-0 ${
              isDarkMode ? 'text-slate-400 hover:text-white hover:bg-zinc-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Zoom Out"
          >
            <ZoomOut size={14} className="shrink-0" />
          </button>
          <div className={`w-px h-4 shrink-0 ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'}`} />
          <button
            type="button"
            onClick={handleRecenter}
            className={`p-2 px-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              isDarkMode ? 'text-slate-400 hover:text-white hover:bg-zinc-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Recenter Map"
          >
            <Maximize2 size={12} className="shrink-0" />
            <span>{lang === 'pt' ? 'Centralizar' : lang === 'es' ? 'Centrar' : 'Recenter'}</span>
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitViewOptions={{ padding: 0.25, maxZoom: 0.95 }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.4}
          maxZoom={2}
          nodesDraggable={true}
          panOnDrag={true}
          zoomOnScroll={true}
          onNodeClick={(event, node) => {
            const nodeLabel = node.data.label;
            const query = lang === 'pt' ? `Explique o tópico: ${nodeLabel}` : lang === 'es' ? `Explicar tema: ${nodeLabel}` : `Explain topic: ${nodeLabel}`;
            setQuestion(query);
            setIsInputFocused(true);
            handleSend(query);
          }}
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            color={isDarkMode ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.04)"} 
            gap={24} 
            size={1.2}
          />
        </ReactFlow>

        {/* --- FLOATING BAR OF INTERACTION (PHASE 4) --- */}
        <div className="fixed bottom-6 left-0 right-0 px-4 z-50 flex flex-col items-center gap-2 pointer-events-none">
          {/* --- FLOATING AI INTERACTION POPUP PANEL (PHASE 4) --- */}
          {isAiLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`w-full max-w-lg md:w-[450px] p-5 rounded-3xl border shadow-2xl z-30 flex items-center gap-3 backdrop-blur-md pointer-events-auto mb-2 ${
                isDarkMode 
                  ? 'bg-[#0a0c16]/95 border-orange-500/20 text-zinc-100 shadow-[0_0_50px_rgba(249,115,22,0.15)]' 
                  : 'bg-white/95 border-slate-200 text-slate-800 shadow-[0_0_50px_rgba(249,115,22,0.08)]'
              }`}
            >
              <RefreshCw size={18} className="text-orange-500 animate-spin shrink-0" />
              <span className="text-xs font-bold tracking-wide uppercase">{tAsk.loading}</span>
            </motion.div>
          )}

          {aiResponse && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`w-full max-w-lg md:w-[450px] max-h-[380px] sm:max-h-[440px] overflow-y-auto rounded-3xl border shadow-2xl z-30 p-5 backdrop-blur-md flex flex-col gap-4 custom-scrollbar pointer-events-auto mb-2 ${
                isDarkMode 
                  ? 'bg-[#0a0c16]/95 border-orange-500/20 text-zinc-100 shadow-[0_0_50px_rgba(249,115,22,0.15)]' 
                  : 'bg-white/95 border-slate-200 text-slate-800 shadow-[0_0_50px_rgba(249,115,22,0.08)]'
              }`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-zinc-800/60' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className={`animate-pulse ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                  <h4 className={`text-xs sm:text-sm font-black tracking-tight ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>{aiResponse.title}</h4>
                </div>
                <button
                  onClick={() => setAiResponse(null)}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-slate-150 text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Content Area */}
              <div className="text-xs leading-relaxed overflow-y-auto pr-1 flex-1 custom-scrollbar">
                {aiResponse.type === 'markdown' ? (
                  <div className={`whitespace-pre-line space-y-2 ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                    {aiResponse.content}
                  </div>
                ) : (
                  /* Interactive Quiz */
                  <div className="space-y-4">
                    {aiResponse.questions.map((q: any, qIdx: number) => (
                      <div key={qIdx} className={`space-y-2 p-3 rounded-2xl border ${
                        isDarkMode 
                          ? 'bg-zinc-900/40 border-zinc-800/40 text-zinc-300' 
                          : 'bg-slate-50/50 border-slate-200 text-slate-800'
                      }`}>
                        <p className={`font-bold text-xs ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>{qIdx + 1}. {q.question}</p>
                        <div className="space-y-1.5">
                          {q.options.map((opt: string, oIdx: number) => {
                            const isSelected = selectedAnswerIdx[qIdx] === oIdx;
                            const isCorrect = q.correctIdx === oIdx;
                            let optStyle = isDarkMode 
                              ? 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/40 text-zinc-300' 
                              : 'bg-white border-slate-200 hover:bg-orange-50/30 hover:border-orange-200/80 text-slate-700 shadow-xs';
                            
                            if (selectedAnswerIdx[qIdx] !== undefined) {
                              if (isSelected) {
                                optStyle = isCorrect
                                  ? isDarkMode
                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold'
                                    : 'bg-emerald-50 border-emerald-400 text-emerald-700 font-semibold'
                                  : isDarkMode
                                    ? 'bg-rose-500/10 border-rose-500 text-rose-400 font-semibold'
                                    : 'bg-rose-50 border-rose-400 text-rose-700 font-semibold';
                              } else if (isCorrect) {
                                optStyle = isDarkMode
                                  ? 'bg-emerald-500/5 border-emerald-500/40 text-emerald-500/80'
                                  : 'bg-emerald-500/5 border-emerald-300 text-emerald-600 font-medium';
                              }
                            }

                            return (
                              <button
                                key={oIdx}
                                disabled={selectedAnswerIdx[qIdx] !== undefined}
                                onClick={() => {
                                  setSelectedAnswerIdx(prev => ({ ...prev, [qIdx]: oIdx }));
                                }}
                                className={`w-full text-left p-2.5 rounded-xl border text-[11px] transition-all flex items-center justify-between gap-2 cursor-pointer ${optStyle}`}
                              >
                                <span>{opt}</span>
                                {selectedAnswerIdx[qIdx] !== undefined && isSelected && (
                                  isCorrect 
                                    ? <Check size={12} className="text-emerald-500 shrink-0" />
                                    : <X size={12} className="text-rose-500 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {selectedAnswerIdx[qIdx] !== undefined && (
                          <p className={`text-[10px] mt-2 transition-opacity duration-300 ${
                            selectedAnswerIdx[qIdx] === q.correctIdx 
                              ? 'text-emerald-500 font-semibold' 
                              : 'text-rose-500/80 font-medium'
                          }`}>
                            {selectedAnswerIdx[qIdx] === q.correctIdx ? `✓ ${q.explanation}` : `✗ ${tAsk.incorrect}`}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Predefined suggestion chips */}
          {isInputFocused && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-row flex-nowrap overflow-x-auto gap-2 justify-start md:justify-center mb-1 max-w-full scrollbar-none py-1.5 px-4 md:px-0 scroll-smooth w-full max-w-4xl pointer-events-auto"
            >
              {[
                {
                  key: 'explain',
                  label: tAsk.explain,
                  query: lang === 'pt' ? 'Explique o tema central' : lang === 'es' ? 'Explicar tema central' : 'Explain central theme',
                  icon: Lightbulb
                },
                {
                  key: 'quiz',
                  label: tAsk.quiz,
                  query: lang === 'pt' ? 'Gere um quiz sobre o mapa' : lang === 'es' ? 'Generar un quiz sobre el mapa' : 'Generate a quiz about the map',
                  icon: HelpCircle
                },
                {
                  key: 'summary',
                  label: tAsk.summary,
                  query: lang === 'pt' ? 'Resuma pontos do mapa' : lang === 'es' ? 'Resumir pontos del mapa' : 'Summarize points of the map',
                  icon: FileText
                },
                {
                  key: 'examples',
                  label: tAsk.examples,
                  query: lang === 'pt' ? 'Exemplos práticos' : lang === 'es' ? 'Ejemplos prácticos' : 'Practical examples',
                  icon: Target
                }
              ].map((action) => {
                const IconComponent = action.icon;
                return (
                  <button
                    key={action.key}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent input blur
                      setQuestion(action.query);
                      handleSend(action.query);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] sm:text-xs font-semibold border transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                      isDarkMode 
                        ? 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-[#fff9f5] hover:border-orange-200 hover:text-slate-950 shadow-xs'
                    }`}
                  >
                    <IconComponent size={14} className={`shrink-0 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </motion.div>
          )}

          {/* Chat Input Container */}
          <div className="w-full max-w-2xl flex flex-col gap-1.5 pointer-events-auto">
            <div className={`w-full relative flex items-center rounded-full border shadow-2xl transition-all p-1 ${
              isDarkMode 
                ? `${isInputFocused ? 'border-orange-500/40 ring-2 ring-orange-500/10' : 'border-zinc-800/80'} bg-zinc-950/95 shadow-black/40` 
                : `${isInputFocused ? 'border-orange-500/40 ring-2 ring-orange-500/10' : 'border-slate-200'} bg-white shadow-slate-100/60`
            }`}>
              <div className="pl-3.5 pr-2 py-2 flex items-center justify-center shrink-0">
                <Brain size={15} className={isInputFocused ? 'text-orange-500 animate-pulse' : isDarkMode ? 'text-zinc-500' : 'text-slate-400'} />
              </div>

              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSend();
                  }
                }}
                placeholder={tAsk.placeholder}
                className={`w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-xs py-1.5 pr-10 ${
                  isDarkMode ? 'text-zinc-100 placeholder-zinc-500' : 'text-slate-900 placeholder-slate-400'
                }`}
              />

              {/* Send button */}
              <button
                onClick={() => handleSend()}
                disabled={!question.trim()}
                className={`absolute right-1.5 top-1.5 bottom-1.5 aspect-square rounded-full flex items-center justify-center transition-all ${
                  question.trim() 
                    ? 'bg-orange-600 text-white hover:bg-orange-500 hover:scale-105 active:scale-95 cursor-pointer shadow-md shadow-orange-600/10' 
                    : `${isDarkMode ? 'bg-zinc-900 text-zinc-600' : 'bg-slate-100 text-slate-400'} cursor-not-allowed`
                }`}
              >
                <Send size={11} className="transform" />
              </button>
            </div>

            {/* Hint text */}
            {isInputFocused && (
              <span className={`text-[9px] font-medium tracking-wide animate-fade-in text-center md:text-left ${
                isDarkMode ? 'text-zinc-500' : 'text-slate-400'
              }`}>
                {tAsk.clickNodeHint}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const InteractiveMindMap = (props: Props) => {
  return (
    <ReactFlowProvider>
      <InteractiveMindMapInner {...props} />
    </ReactFlowProvider>
  );
};
