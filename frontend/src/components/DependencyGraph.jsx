import React, { useMemo, useCallback, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ShieldCheck, AlertTriangle, ShieldAlert, Package, SlidersHorizontal } from 'lucide-react';

// ── Risk style map ──────────────────────────────────────────────────
const riskCfg = {
  safe:      { border: '#10b981', bg: '#071a11', text: '#10b981', Icon: ShieldCheck,   glow: '0 0 18px rgba(16,185,129,0.4)' },
  warning:   { border: '#f59e0b', bg: '#1a1100', text: '#f59e0b', Icon: AlertTriangle, glow: '0 0 18px rgba(245,158,11,0.4)' },
  malicious: { border: '#ef4444', bg: '#1a0505', text: '#ef4444', Icon: ShieldAlert,   glow: '0 0 22px rgba(239,68,68,0.55)' },
  unknown:   { border: '#334155', bg: '#0f1724', text: '#64748b', Icon: Package,        glow: 'none' },
};

// ── Custom node ───────────────────────────────────────────────────────
const PackageNode = ({ data, selected }) => {
  const cfg = riskCfg[data.classification] || riskCfg.unknown;
  const { Icon } = cfg;
  const isMalicious = data.classification === 'malicious';

  return (
    <>
      <Handle type="target" position={Position.Top}
        style={{ background: cfg.border, border: 0, width: 7, height: 7, top: -4 }} />

      <div style={{
        background: cfg.bg,
        border: `1.5px solid ${selected ? cfg.border : isMalicious ? `${cfg.border}88` : `${cfg.border}40`}`,
        boxShadow: selected ? cfg.glow : isMalicious ? `0 0 10px ${cfg.border}30` : 'none',
        borderRadius: 12,
        padding: '9px 12px',
        minWidth: 150,
        maxWidth: 210,
        transition: 'box-shadow 0.25s, border-color 0.25s',
        cursor: 'grab',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: `${cfg.border}1a`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: cfg.text, flexShrink: 0,
          }}>
            <Icon size={12} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.label}
            </div>
            <div style={{ fontSize: 9.5, color: '#475569', fontFamily: 'monospace', marginTop: 1 }}>
              v{data.version}
            </div>
          </div>
          {/* Score pill */}
          <div style={{
            fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
            color: cfg.text, background: `${cfg.border}18`,
            borderRadius: 5, padding: '2px 6px', flexShrink: 0,
          }}>
            {data.riskScore}
          </div>
        </div>

        {/* Flags row */}
        {data.flagCount > 0 && (
          <div style={{
            marginTop: 7, padding: '3px 7px', borderRadius: 6,
            background: `${cfg.border}12`,
            fontSize: 9.5, fontFamily: 'monospace', color: cfg.text,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ opacity: 0.6 }}>⚑</span>
            {data.flagCount} finding{data.flagCount > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom}
        style={{ background: cfg.border, border: 0, width: 7, height: 7, bottom: -4 }} />
    </>
  );
};

const nodeTypes = { package: PackageNode };

// ── BFS Layout (layered) ──────────────────────────────────────────────
const LAYER_GAP  = 140;
const NODE_GAP_X = 190;

function buildGraph(root, filterMode) {
  const nodes = [];
  const edges = [];
  let id = 0;

  // Filter to include only nodes matching current view mode
  const shouldInclude = (node) => {
    if (filterMode === 'all') return true;
    if (filterMode === 'issues') return node.classification === 'malicious' || node.classification === 'warning';
    if (filterMode === 'malicious') return node.classification === 'malicious';
    return true;
  };

  const queue = [{ node: root, depth: 0, parentId: null }];
  const layers = [];
  const idMap = new Map();

  while (queue.length) {
    const { node, depth, parentId } = queue.shift();
    if (!node || node.skip) continue;

    const nodeId = `n${id++}`;
    idMap.set(node, nodeId);

    if (!layers[depth]) layers[depth] = [];
    layers[depth].push({ id: nodeId, node, parentId });

    (node.dependencies || []).forEach(child => {
      queue.push({ node: child, depth: depth + 1, parentId: nodeId });
    });
  }

  // Position nodes in layers
  layers.forEach((layer, depth) => {
    // For filter modes, only place nodes that pass filter or are root
    const visibleLayer = layer.filter(item =>
      depth === 0 || shouldInclude(item.node)
    );
    if (visibleLayer.length === 0 && filterMode !== 'all') return;

    const displayLayer = filterMode === 'all' ? layer : visibleLayer;
    const totalW = (displayLayer.length - 1) * NODE_GAP_X;
    const startX = -totalW / 2;

    displayLayer.forEach((item, i) => {
      const cfg = riskCfg[item.node.classification] || riskCfg.unknown;

      nodes.push({
        id: item.id,
        type: 'package',
        position: { x: startX + i * NODE_GAP_X, y: depth * LAYER_GAP },
        data: {
          label: item.node.name,
          version: item.node.version || '?',
          classification: item.node.classification || 'unknown',
          riskScore: item.node.riskScore || 0,
          flagCount: (item.node.scanFindings?.length || 0) + (item.node.reasons?.length || 0),
          nodeData: item.node,
        },
      });

      if (item.parentId && nodes.find(n => n.id === item.parentId)) {
        edges.push({
          id: `e_${item.parentId}_${item.id}`,
          source: item.parentId,
          target: item.id,
          type: 'smoothstep',
          animated: item.node.classification === 'malicious',
          style: {
            stroke: `${cfg.border}50`,
            strokeWidth: item.node.classification === 'malicious' ? 2 : 1.2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: `${cfg.border}60`,
            width: 12, height: 12,
          },
        });
      }
    });
  });

  return { nodes, edges };
}

// ── Count helpers ────────────────────────────────────────────────────
const countAll = (node, acc = { safe: 0, warning: 0, malicious: 0, total: 0 }) => {
  if (!node || node.skip) return acc;
  acc.total++;
  const c = node.classification;
  if (c in acc) acc[c]++;
  (node.dependencies || []).forEach(d => countAll(d, acc));
  return acc;
};

// ── Filter Bar ───────────────────────────────────────────────────────
const FilterBar = ({ counts, filterMode, setFilterMode, onDownload }) => {
  const filters = [
    { key: 'all',       label: `All (${counts.total})`,               color: 'text-slate-400' },
    { key: 'issues',    label: `Issues (${counts.warning + counts.malicious})`, color: 'text-amber-400' },
    { key: 'malicious', label: `Malicious (${counts.malicious})`,     color: 'text-red-400'   },
  ];

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-xl glass border border-white/[0.05] text-xs font-mono mb-3 shrink-0">
      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
      <div className="flex gap-1">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilterMode(f.key)}
            className={`px-3 py-1 rounded-lg transition-all ${
              filterMode === f.key
                ? 'bg-brand/20 text-brand border border-brand/30'
                : `${f.color} hover:bg-white/[0.05] border border-transparent`
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 ml-auto text-slate-500">
        <span className="text-emerald-400">✓ {counts.safe}</span>
        <span className="text-amber-400">⚠ {counts.warning}</span>
        <span className="text-red-400">✕ {counts.malicious}</span>
        <div className="w-px h-4 bg-white/10" />
        <button
          onClick={onDownload}
          className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
          title="Download JSON report"
        >
          ↓ report.json
        </button>
      </div>
    </div>
  );
};

// ── Inner graph (has access to ReactFlow instance) ────────────────────
const GraphInner = ({ treeData, onSelectNode }) => {
  const [filterMode, setFilterMode] = useState('all');
  const { fitView } = useReactFlow();

  const counts = useMemo(() => countAll(treeData), [treeData]);

  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildGraph(treeData, filterMode),
    [treeData, filterMode]
  );

  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, , onEdgesChange] = useEdgesState(initEdges);

  const onNodeClick = useCallback((_, node) => {
    onSelectNode(node.data.nodeData);
  }, [onSelectNode]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([JSON.stringify(treeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safeinstall-${treeData.name}-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [treeData]);

  return (
    <div className="flex flex-col h-full">
      <FilterBar
        counts={counts}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        onDownload={handleDownload}
      />

      <div className="flex-1 rounded-2xl overflow-hidden border border-white/[0.05]" style={{ minHeight: '62vh' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.05}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
          style={{ background: '#050810' }}
          defaultEdgeOptions={{ type: 'smoothstep' }}
        >
          <Background color="#1a2340" gap={24} size={1} variant="dots" />
          <Controls
            style={{
              background: '#0d1424',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
              gap: 2,
            }}
          />
          <MiniMap
            nodeColor={n => (riskCfg[n.data?.classification] || riskCfg.unknown).border}
            style={{
              background: '#080c14',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
            }}
            maskColor="rgba(0,0,0,0.7)"
            zoomable
            pannable
          />
        </ReactFlow>
      </div>
    </div>
  );
};

// ── Exported wrapper ─────────────────────────────────────────────────
const DependencyGraph = ({ treeData, onSelectNode }) => {
  if (!treeData) return null;
  return (
    <ReactFlowProvider>
      <GraphInner treeData={treeData} onSelectNode={onSelectNode} />
    </ReactFlowProvider>
  );
};

export default DependencyGraph;
