import React, { useMemo, useEffect, useState, useCallback, memo } from 'react';
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
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { motion } from 'motion/react';
import { 
  Zap, 
  Plus, 
  Minus, 
  Layout, 
  BookOpen, 
  Lightbulb, 
  Target, 
  Layers, 
  Cpu, 
  Globe, 
  Activity
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  'BookOpen': BookOpen,
  'Lightbulb': Lightbulb,
  'Target': Target,
  'Layers': Layers,
  'Cpu': Cpu,
  'Globe': Globe,
  'Activity': Activity,
  'Zap': Zap
};

const CATEGORY_COLORS: Record<string, { bg: string, text: string, border: string, accent: string, iconBg: string }> = {
  'Concept': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', accent: '#3b82f6', iconBg: 'bg-blue-500/20' },
  'Example': { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20', accent: '#10b981', iconBg: 'bg-green-500/20' },
  'Detail': { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20', accent: '#a855f7', iconBg: 'bg-purple-500/20' },
  'Definition': { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', accent: '#f59e0b', iconBg: 'bg-amber-500/20' },
  'Method': { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', accent: '#10b981', iconBg: 'bg-emerald-500/20' },
  'Benefit': { bg: 'bg-pink-500/10', text: 'text-pink-500', border: 'border-pink-500/20', accent: '#ec4899', iconBg: 'bg-pink-500/20' },
  'Risk': { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20', accent: '#f43f5e', iconBg: 'bg-rose-500/20' },
  'Trend': { bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500/20', accent: '#6366f1', iconBg: 'bg-indigo-500/20' }
};

interface CustomNodeProps {
  data: {
    label: string;
    isRoot?: boolean;
    importance?: number;
    category?: string;
    icon?: string;
    isDarkMode: boolean;
    hasChildren: boolean;
    isCollapsed: boolean;
    toggleNode: (id: string, e: React.MouseEvent) => void;
    id: string;
  };
}

const CustomNode = memo(({ data }: CustomNodeProps) => {
  const { label, isRoot, importance, category, icon, isDarkMode, hasChildren, isCollapsed, toggleNode, id } = data;
  
  const IconComponent = icon && ICON_MAP[icon] ? ICON_MAP[icon] : (isRoot ? Zap : BookOpen);
  const catStyle = category ? CATEGORY_COLORS[category] || CATEGORY_COLORS['Concept'] : CATEGORY_COLORS['Concept'];
  
  const importanceScale = (importance || 3) / 5;
  const fontSize = isRoot ? 'text-[12px]' : importanceScale > 0.8 ? 'text-[11px]' : 'text-[10px]';
  const width = isRoot ? 'w-[260px]' : importanceScale > 0.8 ? 'w-[220px]' : 'w-[200px]';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className={`relative px-4 py-4 rounded-2xl border flex items-center gap-3.5 transition-all duration-500 group ${width} ${
        isRoot 
          ? 'bg-gradient-to-br from-orange-600 to-orange-500 border-white/30 shadow-[0_15px_40px_-10px_rgba(234,88,12,0.5)] z-20 hover:scale-[1.02]' 
          : isDarkMode 
            ? `bg-white/5 backdrop-blur-xl ${catStyle.border} hover:bg-white/10 hover:border-white/20 shadow-xl shadow-black/20` 
            : `bg-white ${catStyle.border} shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.1)] border-opacity-50`
      }`}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg ${
        isRoot ? 'bg-white/25 border border-white/20' : catStyle.iconBg
      }`}>
        <IconComponent 
          size={18} 
          className={isRoot ? 'text-white drop-shadow-sm' : catStyle.text} 
          strokeWidth={isRoot ? 2.5 : 2}
        />
      </div>

      <div className="flex-grow min-w-0 pr-1">
        {category && !isRoot && (
          <span className={`text-[9px] font-black uppercase tracking-[0.18em] opacity-90 block mb-1.5 ${catStyle.text}`}>
            {category}
          </span>
        )}
        <span className={`font-black leading-[1.3] uppercase tracking-tight line-clamp-3 ${fontSize} ${isRoot ? 'text-white' : isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          {label}
        </span>
      </div>

      {hasChildren && (
        <button 
          onClick={(e) => toggleNode(id, e)}
          className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-xl border transition-all hover:scale-110 hover:shadow-lg
            ${isRoot 
              ? 'bg-white/20 border-white/40 text-white hover:bg-white/30' 
              : isDarkMode 
                ? 'bg-white/10 border-white/15 text-gray-400 hover:text-white hover:bg-white/20' 
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-white'}
          `}
        >
          {isCollapsed ? <Plus size={14} strokeWidth={3} /> : <Minus size={14} strokeWidth={3} />}
        </button>
      )}

      <Handle type="source" position={Position.Right} className="!opacity-0" />
      
      {importance >= 4 && !isRoot && (
        <div className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full animate-pulse border-[3px] border-black/10 ${catStyle.bg.replace('/10', '/100')}`} />
      )}
      
      {isRoot && (
        <div className="absolute -inset-1 blur-3xl opacity-20 bg-orange-600 -z-10 rounded-full" />
      )}
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
    marginx: 150, 
    marginy: 150,
    ranksep: isHorizontal ? 240 : 160,
    nodesep: isHorizontal ? 80 : 200
  });

  nodes.forEach((node) => {
    // Increase box size for better spacing distribution
    dagreGraph.setNode(node.id, { width: 300, height: 140 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - 150,
        y: nodeWithPosition.y - 70,
      },
    };
  });

  return { nodes: newNodes, edges };
};

interface Props {
  data: any;
  centralTopic?: string;
  isDarkMode?: boolean;
}

export const InteractiveMindMap = ({ data, centralTopic, isDarkMode = true }: Props) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [layout, setLayout] = useState<'LR' | 'TB'>('LR');

  const toggleNode = useCallback((nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const masterGraph = useMemo(() => {
    const masterNodes: Node[] = [];
    const masterEdges: Edge[] = [];
    let idCounter = 0;
    const seenNodes = new Set<string>();

    const addNode = (nodeData: any, parentId: string | null = null): string => {
      const label = typeof nodeData === 'string' ? nodeData : (nodeData.topic || nodeData.label || "Untitled");
      const nodeKey = `${parentId}-${label}`;
      
      // Basic avoidance of exact duplicate child labels under same parent
      if (parentId && seenNodes.has(nodeKey)) {
        return ""; // Skip
      }
      seenNodes.add(nodeKey);

      const id = `node-${idCounter++}`;
      const isRoot = parentId === null;
      
      masterNodes.push({
        id,
        type: 'mindmap',
        data: { 
          label, 
          isRoot, 
          parentId,
          importance: nodeData.importance || 3,
          category: nodeData.category,
          icon: nodeData.icon,
          isDarkMode,
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

    const rootId = addNode(typeof data === 'object' && data.topic ? data : (centralTopic || "Topic"));

    const parseRecursive = (nodeData: any, parentId: string) => {
      const children = nodeData.children || nodeData.subtopics;
      if (children && Array.isArray(children)) {
        children.forEach(child => {
          const childId = addNode(child, parentId);
          if (typeof child === 'object') {
            parseRecursive(child, childId);
          }
        });
      }
    };

    if (Array.isArray(data)) {
      data.forEach(item => addNode(item, rootId));
    } else if (typeof data === 'object' && data !== null) {
      parseRecursive(data, rootId);
    } else if (typeof data === 'string') {
      const lines = data.split('\n').filter(l => l.trim().length > 0);
      lines.forEach(line => addNode(line.trim(), rootId));
    }

    return { masterNodes, masterEdges };
  }, [data, centralTopic, isDarkMode]);

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
        const category = targetNode?.data.category;
        const catStyle = category ? CATEGORY_COLORS[category] || CATEGORY_COLORS['Concept'] : null;
        
        return {
          ...e,
          animated: targetNode?.data.importance >= 4,
          style: { 
            stroke: catStyle ? catStyle.accent : (isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'), 
            strokeWidth: targetNode?.data.importance >= 4 ? 2.5 : 2,
            opacity: targetNode?.data.importance >= 4 ? 0.8 : 0.4
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 12,
            height: 12,
            color: catStyle ? catStyle.accent : (isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'),
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
  }, [masterGraph, collapsedNodes, isDarkMode, setNodes, setEdges, toggleNode, layout]);

  return (
    <div className={`w-full h-[500px] rounded-3xl overflow-hidden border relative ${isDarkMode ? 'bg-[#050505] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background 
          variant={BackgroundVariant.Lines} 
          color={isDarkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"} 
          gap={40} 
        />
        <Controls 
          showInteractive={false} 
          className={`!border-none !shadow-2xl !rounded-xl overflow-hidden ${isDarkMode ? '!bg-white/10 !backdrop-blur-xl' : '!bg-white/80'}`} 
        />
        
        <Panel position="top-right" className="flex gap-2 p-4">
          <button
            onClick={() => setLayout(l => l === 'LR' ? 'TB' : 'LR')}
            className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${
              isDarkMode 
                ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10' 
                : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900'
            }`}
          >
            <Layout size={12} />
            {layout === 'LR' ? 'Horizontal' : 'Vertical'}
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
};
