import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { Package, ShieldCheck, AlertTriangle, ShieldAlert, ChevronDown, ChevronRight } from 'lucide-react';

// ── Color tokens per risk level ────────────────────────────────────
const riskStyle = {
  safe:      { border: '#10b981', bg: '#052015', text: '#10b981', icon: ShieldCheck,   glow: 'rgba(16,185,129,0.3)' },
  warning:   { border: '#f59e0b', bg: '#1c1500', text: '#f59e0b', icon: AlertTriangle, glow: 'rgba(245,158,11,0.3)' },
  malicious: { border: '#ef4444', bg: '#1c0505', text: '#ef4444', icon: ShieldAlert,   glow: 'rgba(239,68,68,0.3)'  },
  unknown:   { border: '#475569', bg: '#111827', text: '#94a3b8', icon: Package,        glow: 'rgba(71,85,105,0.2)'  },
};

// ── Single Node Card ────────────────────────────────────────────────
const NodeCard = ({ node, isSelected, onClick, depth }) => {
  const classification = node.classification || 'unknown';
  const s = riskStyle[classification] || riskStyle.unknown;
  const Icon = s.icon;
  const hasChildren = node.dependencies && node.dependencies.length > 0;
  const [open, setOpen] = useState(depth < 2); // auto-open the first 2 levels

  return (
    <div className="flex flex-col" style={{ '--glow': s.glow }}>
      {/* ── The node itself ── */}
      <div
        className={`
          group relative flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer
          border transition-all duration-200 select-none
          ${isSelected
            ? 'border-current bg-opacity-20 shadow-[0_0_0_2px_var(--glow)]'
            : 'hover:border-opacity-60 hover:shadow-[0_0_16px_var(--glow)]'
          }
        `}
        style={{
          borderColor: isSelected ? s.border : `${s.border}40`,
          backgroundColor: isSelected ? `${s.border}15` : `${s.border}08`,
        }}
        onClick={() => onClick(node)}
      >
        {/* Icon */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${s.border}20`, color: s.text }}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>

        {/* Package name + version */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-slate-100 truncate" style={{ maxWidth: '120px' }}>
              {node.name}
            </span>
            <span className="text-[10px] font-mono text-slate-500 shrink-0">
              v{node.version}
            </span>
          </div>
          {node.reasons && node.reasons.length > 0 && (
            <div className="text-[10px] truncate mt-0.5" style={{ color: s.text }}>
              {node.reasons[0]}
            </div>
          )}
        </div>

        {/* Risk score badge */}
        <div
          className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md shrink-0"
          style={{ backgroundColor: `${s.border}18`, color: s.text }}
        >
          {node.riskScore ?? '—'}
        </div>

        {/* Expand toggle */}
        {hasChildren && (
          <button
            className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          >
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* ── Children with connector line ── */}
      {hasChildren && open && (
        <div className="flex mt-1">
          {/* Vertical + horizontal connector lines */}
          <div className="relative flex flex-col items-center" style={{ width: '28px', marginLeft: '18px' }}>
            <div
              className="absolute left-1/2 top-0 bottom-0 w-px"
              style={{ background: `linear-gradient(to bottom, ${s.border}40, transparent)` }}
            />
          </div>

          {/* Children stack */}
          <div className="flex-1 flex flex-col gap-1.5 pl-2 pt-1 border-l"
               style={{ borderColor: `${s.border}25` }}>
            {node.dependencies.map((child, i) => (
              <NodeCard
                key={`${child.name}-${i}`}
                node={child}
                isSelected={isSelected && false}
                onClick={onClick}
                depth={depth + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


// ── Stats bar at the top ────────────────────────────────────────────
const countByClass = (node, counts = { safe: 0, warning: 0, malicious: 0 }) => {
  if (!node) return counts;
  const c = node.classification;
  if (c in counts) counts[c]++;
  (node.dependencies || []).forEach(d => countByClass(d, counts));
  return counts;
};

const StatsBar = ({ treeData }) => {
  const counts = countByClass(treeData);
  const total = counts.safe + counts.warning + counts.malicious;
  return (
    <div className="flex items-center gap-6 px-4 py-2 rounded-xl glass border border-white/[0.05] text-xs font-mono mb-4">
      <span className="text-slate-500">Total: <span className="text-slate-300 font-semibold">{total}</span></span>
      <span className="text-emerald-400">✓ {counts.safe} safe</span>
      <span className="text-amber-400">⚠ {counts.warning} warn</span>
      <span className="text-red-400">✕ {counts.malicious} malicious</span>
    </div>
  );
};


// ── Main exported component ─────────────────────────────────────────
const ResultTree = ({ treeData, onSelectNode }) => {
  const [selectedNode, setSelectedNode] = useState(null);

  const handleSelect = useCallback((node) => {
    setSelectedNode(node.name + node.version);
    onSelectNode(node);
  }, [onSelectNode]);

  if (!treeData) return null;

  return (
    <div className="flex flex-col h-full">
      <StatsBar treeData={treeData} />
      <div
        className="flex-1 overflow-y-auto rounded-2xl glass border border-white/[0.05] p-4"
        style={{ maxHeight: '72vh' }}
      >
        <p className="text-[11px] font-mono text-slate-600 mb-4 uppercase tracking-widest">Dependency Graph</p>
        <NodeCard
          node={treeData}
          isSelected={selectedNode === treeData.name + treeData.version}
          onClick={handleSelect}
          depth={0}
        />
      </div>
    </div>
  );
};

export default ResultTree;
