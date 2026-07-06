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
  Panel,
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
  FileImage
} from 'lucide-react';

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
  };
  targetPosition?: Position;
  sourcePosition?: Position;
}

const CustomNode = memo(({ id, data, targetPosition = Position.Left, sourcePosition = Position.Right }: CustomNodeProps) => {
  const { label, description, level = 2, isRoot, hasChildren, isCollapsed, toggleNode, colorIndex } = data;
  
  const catStyle = typeof colorIndex === 'number' 
    ? THEME_COLORS[colorIndex % THEME_COLORS.length] 
    : THEME_COLORS[0];

  // Sizing and hierarchy-based styling
  let widthClass = 'w-[220px] min-h-[70px]';
  let cardBg = 'bg-[#070b14] hover:bg-[#0e131f]';
  let titleStyle = 'text-[12px] font-bold text-slate-300';
  let borderStyle = 'border-slate-800/60';

  if (isRoot || level === 1) {
    widthClass = 'w-[260px] min-h-[90px]';
    cardBg = 'bg-gradient-to-br from-[#101524] to-[#1e1b4b]/20 hover:to-[#1e1b4b]/30';
    titleStyle = 'text-[14px] font-black text-white';
    borderStyle = 'border-indigo-500/50 ring-2 ring-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)]';
  } else if (level === 2) {
    widthClass = 'w-[240px] min-h-[80px]';
    cardBg = 'bg-[#0e131f] hover:bg-[#161c2c]';
    titleStyle = 'text-[13px] font-extrabold text-slate-100';
    borderStyle = 'border-slate-800/80';
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`relative px-4 py-3.5 rounded-2xl border flex flex-col justify-center gap-1.5 transition-all duration-300 shadow-xl text-left ${widthClass} ${cardBg} ${borderStyle}`}
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
            <p className="text-[10.5px] leading-relaxed text-slate-400 mt-1 font-medium break-words line-clamp-3">
              {description}
            </p>
          )}
        </div>

        {/* Expand/Collapse Handle */}
        {hasChildren && (
          <button 
            onClick={(e) => toggleNode(id, e)}
            className="shrink-0 w-5.5 h-5.5 flex items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-all shadow-sm mt-0.5"
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
      w = 260;
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
      w = 260;
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

const InteractiveMindMapInner = ({ data, centralTopic, isDarkMode = true, mode = 'transcript', lang = 'pt', onRegenerate }: Props) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [layout, setLayout] = useState<'LR' | 'TB'>('LR');
  
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const shouldFitViewRef = useRef(true);

  useEffect(() => {
    shouldFitViewRef.current = true;
  }, [data]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

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
        return {
          topic: node.label,
          description: node.description,
          level: node.level || depth,
          children: Array.isArray(node.children) ? node.children.map((c: any) => transformNode(c, depth + 1)) : []
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

  useEffect(() => {
    const { masterNodes, masterEdges } = masterGraph;

    const hiddenNodes = new Set<string>();
    const isNodeHidden = (nodeId: string): boolean => {
      if (hiddenNodes.has(nodeId)) return true;
      const node = masterNodes.find(n => n.id === nodeId);
      if (!node) return false;
      const parentId = node.data.parentId;
      if (parentId) {
        if (isNodeHidden(parentId) || collapsedNodes.has(parentId)) {
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
          toggleNode
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
            opacity: 0.22
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
        fitView({ padding: 0.25, duration: 450, maxZoom: 0.95 });
      }, 100);
      shouldFitViewRef.current = false;
    }

  }, [masterGraph, collapsedNodes, setNodes, setEdges, toggleNode, layout, fitView]);

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
    <div className="space-y-4">
      {/* Sleek Action Bar */}
      <div className={`p-6 sm:p-8 rounded-[2.2rem] border transition-all ${
        isDarkMode 
          ? 'bg-[#0a0a0c]/90 border-zinc-800 shadow-2xl shadow-black/30' 
          : 'bg-white border-slate-200/80 shadow-xl shadow-slate-100/50'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left Side: Title, Pro Badge & Source Info */}
          <div className="flex-1 space-y-3.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className={`text-2xl sm:text-3xl font-black tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {hTexts.title}
              </h3>
              
              {/* Pro Preview Badge in a subtle pill layout */}
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-orange-600/10 border border-orange-600/20 rounded-full select-none">
                <Zap size={10} className="text-orange-500 fill-current animate-pulse" />
                <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Pro Preview</span>
              </div>
            </div>
            
            {/* Elegant Source Data indicator */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className={`inline-flex items-center gap-2 text-xs sm:text-sm font-semibold ${
                isDarkMode ? 'text-zinc-400' : 'text-slate-600'
              }`}>
                <Info size={14} className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} />
                <span>{sourceLabel}</span>
              </div>

              {/* Details popover activator */}
              <div className="relative flex items-center">
                <button
                  type="button"
                  onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all font-bold ${
                    isDarkMode 
                      ? 'text-zinc-400 border-zinc-800/80 hover:text-zinc-200 hover:bg-zinc-800' 
                      : 'text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                  title="Detalhes da fonte"
                >
                  {lang === 'pt' ? 'Detalhes' : lang === 'es' ? 'Detalles' : 'Details'}
                </button>

                {/* Explanation popover inline */}
                {isPopoverOpen && (
                  <div 
                    ref={popoverRef}
                    className={`absolute left-0 bottom-full mb-3 w-72 p-4 rounded-2xl border shadow-2xl z-50 text-xs leading-relaxed transition-all ${
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

          {/* Sutil Vertical Divisor (only on desktop md+) */}
          <div className="hidden md:block w-px h-12 bg-slate-200/80 dark:bg-zinc-800/60 mx-2 shrink-0" />

          {/* Right Side: Actions Container - Side-by-side in a horizontal row */}
          <div className="flex flex-row items-center flex-wrap md:flex-nowrap gap-2.5 sm:gap-3 md:justify-end shrink-0">
            {/* Gerar novamente */}
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-orange-600/15 hover:shadow-orange-600/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer h-11 shrink-0"
              >
                <RefreshCw size={14} className="shrink-0" />
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
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 rounded-2xl text-xs sm:text-sm font-extrabold border transition-all h-11 shrink-0 ${
                isDarkMode 
                  ? 'bg-[#0d0d10]/60 border-zinc-800 text-zinc-300 hover:border-orange-500/40 hover:bg-zinc-800/80 hover:text-orange-400' 
                  : 'bg-white border-slate-200 text-slate-700 hover:border-orange-400 hover:bg-slate-50 hover:text-orange-600'
              }`}
            >
              <Presentation size={13} className="shrink-0" />
              <span>{lang === 'pt' ? 'Modo apresentação' : lang === 'es' ? 'Modo presentación' : 'Presentation Mode'}</span>
            </button>

            {/* Exportar Dropdown */}
            <div ref={exportRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsExportOpen(!isExportOpen)}
                className={`flex items-center justify-center gap-2 px-4 sm:px-5 rounded-2xl text-xs sm:text-sm font-extrabold border transition-all h-11 shrink-0 ${
                  isDarkMode 
                    ? 'bg-[#0d0d10]/60 border-zinc-800 text-zinc-300 hover:border-orange-500/40 hover:bg-zinc-800/80 hover:text-orange-400 ring-1 ring-orange-500/10' 
                    : 'bg-white border-slate-200 text-slate-700 hover:border-orange-400 hover:bg-slate-50 hover:text-orange-600 ring-1 ring-orange-400/10 shadow-sm'
                }`}
              >
                <Download size={13} className="shrink-0" />
                <span>{hTexts.btnExport}</span>
              </button>

              {isExportOpen && (
                <div className={`absolute right-0 top-full mt-2 w-[280px] sm:w-[320px] rounded-2xl border shadow-2xl z-50 p-2 transition-all ${
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

      {/* The Map view block */}
      <div className={`w-full h-[620px] rounded-[2rem] overflow-hidden border relative transition-colors ${
        isDarkMode 
          ? 'bg-[#060a13] border-zinc-900 shadow-2xl shadow-black/35' 
          : 'bg-slate-50 border-slate-200/80 shadow-md shadow-slate-100'
      }`}>
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
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            color={isDarkMode ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.04)"} 
            gap={24} 
            size={1.2}
          />
          
          {/* Label no canto inferior do mapa */}
          <Panel position="bottom-left" className="relative">
            <div className={`flex items-center gap-1.5 p-2 px-3 backdrop-blur rounded-2xl shadow-lg border text-[10px] sm:text-xs font-mono transition-colors ${
              isDarkMode 
                ? 'bg-slate-950/80 border-slate-900 text-slate-400' 
                : 'bg-white/80 border-slate-200 text-slate-500'
            }`}>
              <span className="font-bold tracking-wide">
                <span>Visual Neural Map · </span>
                {mode === 'metadata_fallback' ? (
                  <span>{lang === 'pt' ? 'metadados' : lang === 'es' ? 'metadatos' : 'metadata'}</span>
                ) : (
                  <span>{lang === 'pt' ? 'transcrição' : lang === 'es' ? 'transcripción' : 'transcript'}</span>
                )}
              </span>
            </div>
          </Panel>

          {/* Minimal Float Controls Panel */}
          <Panel position="bottom-right" className={`flex gap-2 p-2.5 backdrop-blur border rounded-2xl shadow-lg transition-colors ${
            isDarkMode 
              ? 'bg-slate-950/80 border-slate-900' 
              : 'bg-white/80 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => zoomIn()}
              className={`p-2 rounded-xl transition-colors ${
                isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
            <button
              type="button"
              onClick={() => zoomOut()}
              className={`p-2 rounded-xl transition-colors ${
                isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <button
              type="button"
              onClick={handleRecenter}
              className={`p-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 ${
                isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Recenter Map"
            >
              <Maximize2 size={12} />
              {lang === 'pt' ? 'Centralizar' : lang === 'es' ? 'Centrar' : 'Recenter'}
            </button>
          </Panel>
        </ReactFlow>
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
