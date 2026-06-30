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
  Panel,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { motion } from 'motion/react';
import { 
  Plus, 
  Minus, 
  Layout, 
  Maximize2,
  ZoomIn,
  ZoomOut
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
  data: {
    label: string;
    isRoot?: boolean;
    hasChildren: boolean;
    isCollapsed: boolean;
    toggleNode: (id: string, e: React.MouseEvent) => void;
    id: string;
    colorIndex?: number;
  };
}

const CustomNode = memo(({ data }: CustomNodeProps) => {
  const { label, isRoot, hasChildren, isCollapsed, toggleNode, id, colorIndex } = data;
  
  const catStyle = typeof colorIndex === 'number' 
    ? THEME_COLORS[colorIndex % THEME_COLORS.length] 
    : THEME_COLORS[0];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`relative px-4 py-3 rounded-xl border flex items-center justify-between gap-3.5 transition-all duration-300 w-[210px] min-h-[50px] bg-[#0e131f] hover:bg-[#161c2c] text-left shadow-lg
        ${isRoot 
          ? 'border-slate-500 ring-2 ring-slate-400/10' 
          : 'border-slate-800'
        }`}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0 !w-0 !h-0" />
      
      {/* Side Accent Line */}
      {!isRoot && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${catStyle.barBg}`} />
      )}
      {isRoot && (
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-slate-400" />
      )}

      {/* Label Text */}
      <div className="flex-1 min-w-0 pl-1.5">
        <p className="text-[11px] leading-[1.35] font-semibold text-slate-200 tracking-wide break-words">
          {label}
        </p>
      </div>

      {/* Expand/Collapse Handle */}
      {hasChildren && (
        <button 
          onClick={(e) => toggleNode(id, e)}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded-md border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-all shadow-sm"
        >
          {isCollapsed ? <Plus size={10} strokeWidth={2.5} /> : <Minus size={10} strokeWidth={2.5} />}
        </button>
      )}

      <Handle type="source" position={Position.Right} className="!opacity-0 !w-0 !h-0" />
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
    ranksep: isHorizontal ? 100 : 80,
    nodesep: isHorizontal ? 24 : 120
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 220, height: 60 });
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
        x: nodeWithPosition.x - 110,
        y: nodeWithPosition.y - 30,
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

const InteractiveMindMapInner = ({ data, centralTopic, isDarkMode = true }: Props) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [layout, setLayout] = useState<'LR' | 'TB'>('LR');
  
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const handleRecenter = useCallback(() => {
    fitView({ padding: 0.2, duration: 600 });
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
          children: Array.isArray(node.children) ? node.children.map((c: any) => transformNode(c, depth + 1)) : []
        };
      };
      
      return {
        topic: data.centralTopic,
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

    const addNode = (nodeData: any, parentId: string | null = null, colorIndex?: number): string => {
      const label = typeof nodeData === 'string' ? nodeData : (nodeData.topic || nodeData.label || "Untitled");
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
    const rootId = addNode(typeof targetSource === 'object' && targetSource.topic ? targetSource : (centralTopic || "Topic"));

    const parseRecursive = (nodeData: any, parentId: string, parentColorIndex?: number) => {
      const children = nodeData.children || nodeData.subtopics;
      if (children && Array.isArray(children)) {
        children.forEach((child, index) => {
          const childColorIndex = parentId === rootId ? index % THEME_COLORS.length : parentColorIndex;
          const childId = addNode(child, parentId, childColorIndex);
          if (typeof child === 'object' && childId) {
            parseRecursive(child, childId, childColorIndex);
          }
        });
      }
    };

    if (Array.isArray(targetSource)) {
      targetSource.forEach((item, idx) => addNode(item, rootId, idx % THEME_COLORS.length));
    } else if (typeof targetSource === 'object' && targetSource !== null) {
      parseRecursive(targetSource, rootId);
    } else if (typeof targetSource === 'string') {
      const lines = targetSource.split('\n').filter(l => l.trim().length > 0);
      lines.forEach((line, idx) => addNode(line.trim(), rootId, idx % THEME_COLORS.length));
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

    setTimeout(() => {
      fitView({ padding: 0.15, duration: 400 });
    }, 60);

  }, [masterGraph, collapsedNodes, setNodes, setEdges, toggleNode, layout, fitView]);

  return (
    <div className="w-full h-[620px] rounded-3xl overflow-hidden border relative bg-[#060a13] border-slate-900 shadow-2xl">
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
        nodesDraggable={true}
        panOnDrag={true}
        zoomOnScroll={true}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          color="rgba(255,255,255,0.02)" 
          gap={24} 
          size={1.2}
        />
        
        {/* Minimal Float Controls Panel */}
        <Panel position="bottom-right" className="flex gap-2 p-3 bg-slate-950/80 backdrop-blur border border-slate-900 rounded-2xl shadow-xl">
          <button
            onClick={() => zoomIn()}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => zoomOut()}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={handleRecenter}
            className="p-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-900 transition-colors flex items-center gap-1.5"
            title="Recenter Map"
          >
            <Maximize2 size={12} />
            Recenter
          </button>
          <div className="w-[1px] h-5 bg-slate-800 self-center mx-1" />
          <button
            onClick={() => setLayout(l => l === 'LR' ? 'TB' : 'LR')}
            className="p-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-900 transition-colors flex items-center gap-1.5"
          >
            <Layout size={12} />
            {layout === 'LR' ? 'Horizontal' : 'Vertical'}
          </button>
        </Panel>
      </ReactFlow>
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
