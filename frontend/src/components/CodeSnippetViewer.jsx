import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileCode2, ShieldCheck, AlertOctagon, Sparkles, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import RiskBadge from './RiskBadge';

// ── Per-severity config ─────────────────────────────────────────────
const sevCfg = {
  high:   { label: 'HIGH',  labelCls: 'text-red-400 bg-red-500/15 border-red-500/30',   bar: 'bg-red-500',     lineHighlight: 'rgba(239,68,68,0.08)'   },
  medium: { label: 'MED',   labelCls: 'text-amber-400 bg-amber-500/15 border-amber-500/30', bar: 'bg-amber-500', lineHighlight: 'rgba(245,158,11,0.07)' },
  low:    { label: 'LOW',   labelCls: 'text-sky-400 bg-sky-500/15 border-sky-500/30',   bar: 'bg-sky-500',     lineHighlight: 'rgba(56,189,248,0.05)'  },
};

const typeCfg = {
  script:      { label: 'lifecycle script', color: '#c084fc' },
  api:         { label: 'dangerous API',    color: '#f87171' },
  obfuscation: { label: 'obfuscation',      color: '#fb923c' },
  network:     { label: 'network call',     color: '#38bdf8' },
};

// ── Copy button ─────────────────────────────────────────────────────
const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-colors">
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'copied' : 'copy'}
    </button>
  );
};

// ── Single code finding card ────────────────────────────────────────
const FindingCard = ({ finding, index }) => {
  const [open, setOpen] = useState(true);
  const sev  = sevCfg[finding.severity]  || sevCfg.low;
  const type = typeCfg[finding.type]     || { label: finding.type, color: '#94a3b8' };

  // The snippet may be a single line — we show it in a real syntax highlighter
  const code = finding.snippet || '// no code captured';

  return (
    <div
      className="rounded-xl overflow-hidden border border-white/[0.06] fade-in"
      style={{ animationDelay: `${index * 50}ms`, opacity: 0, animationFillMode: 'forwards', background: '#090d16' }}
    >
      {/* ── File / line header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.05]">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="font-mono text-xs text-slate-300 truncate" title={finding.file}>
            {finding.file}
          </span>
          <span className="font-mono text-xs text-brand shrink-0 font-bold">
            :L{finding.line}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          {/* Severity */}
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${sev.labelCls}`}>
            {sev.label}
          </span>
          {/* Type marker */}
          <span className="text-[10px] font-mono" style={{ color: type.color }}>
            {type.label}
          </span>
          {/* Copy */}
          <CopyBtn text={code} />
          {/* Expand toggle */}
          <button onClick={() => setOpen(o => !o)} className="text-slate-600 hover:text-slate-400 transition-colors">
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Code block with syntax highlighting ── */}
      {open && (
        <>
          <div className="relative">
            {/* Left severity bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${sev.bar}`} />

            <SyntaxHighlighter
              language="javascript"
              style={vscDarkPlus}
              showLineNumbers
              startingLineNumber={Math.max(1, finding.line - 0)}
              wrapLines
              lineProps={lineNumber => ({
                style: {
                  background: lineNumber === finding.line ? sev.lineHighlight : 'transparent',
                  display: 'block',
                  padding: '0 12px',
                },
              })}
              customStyle={{
                margin: 0,
                padding: '12px 0',
                background: 'transparent',
                fontSize: '11.5px',
                lineHeight: '1.65',
                fontFamily: "'JetBrains Mono', monospace",
                borderRadius: 0,
              }}
              lineNumberStyle={{
                color: '#2d3d5a',
                minWidth: '2.5em',
                paddingRight: '1em',
                borderRight: '1px solid #1e2535',
                marginRight: '1em',
                userSelect: 'none',
              }}
            >
              {code}
            </SyntaxHighlighter>
          </div>

          {/* ── Reason footer ── */}
          <div className="flex items-start gap-2 px-4 py-2.5 bg-white/[0.02] border-t border-white/[0.04]">
            <span style={{ color: type.color }} className="text-xs mt-0.5 shrink-0">⚑</span>
            <p className="text-xs text-slate-400 leading-relaxed">{finding.reason}</p>
          </div>
        </>
      )}
    </div>
  );
};

// ── Empty state ─────────────────────────────────────────────────────
const EmptyState = ({ icon: Icon, title, subtitle, color = 'text-slate-600' }) => (
  <div className="flex flex-col items-center justify-center h-full text-center py-14">
    <div className={`w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4 ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <p className="text-slate-300 font-medium mb-1.5">{title}</p>
    <p className="text-slate-600 text-sm max-w-xs leading-relaxed">{subtitle}</p>
  </div>
);

// ── Main component ──────────────────────────────────────────────────
const CodeSnippetViewer = ({ selectedNode }) => {
  if (!selectedNode) {
    return (
      <div className="glass rounded-2xl border border-white/[0.05] h-full">
        <EmptyState
          icon={Sparkles}
          title="Select a node"
          subtitle="Click any node in the dependency graph to inspect its static analysis results and flagged code."
        />
      </div>
    );
  }

  const findings  = selectedNode.scanFindings || [];
  const reasons   = selectedNode.reasons || [];
  const isClean   = findings.length === 0 && reasons.length === 0;
  const maxScore  = 100;
  const fillPct   = Math.min((selectedNode.riskScore || 0) / maxScore * 100, 100);
  const barColor  = selectedNode.classification === 'safe'      ? '#10b981'
                  : selectedNode.classification === 'warning'   ? '#f59e0b'
                  : selectedNode.classification === 'malicious' ? '#ef4444'
                  : '#475569';

  return (
    <div className="glass rounded-2xl border border-white/[0.05] flex flex-col h-full overflow-hidden fade-in">

      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white leading-tight truncate">{selectedNode.name}</h2>
            <span className="font-mono text-xs text-slate-500">v{selectedNode.version}</span>
          </div>
          <RiskBadge classification={selectedNode.classification} score={selectedNode.riskScore} />
        </div>

        {/* Score meter */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-600">
            <span>Risk score</span>
            <span style={{ color: barColor }}>{selectedNode.riskScore ?? 0} / {maxScore}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${fillPct}%`, background: barColor, boxShadow: `0 0 10px ${barColor}80` }}
            />
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* General flags / reasons */}
        {reasons.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <AlertOctagon className="w-3.5 h-3.5" />
              General Flags
            </div>
            <ul className="space-y-1">
              {reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-amber-500 shrink-0 mt-0.5">›</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Code findings */}
        {findings.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-mono text-slate-600 uppercase tracking-widest">
              {findings.length} finding{findings.length !== 1 ? 's' : ''} · static analysis
            </p>
            {findings.map((finding, i) => (
              <FindingCard key={i} finding={finding} index={i} />
            ))}
          </div>
        )}

        {/* All clear */}
        {isClean && (
          <EmptyState
            icon={ShieldCheck}
            title="No issues found"
            subtitle="Static analysis found no dangerous APIs, obfuscation, lifecycle scripts, or network calls in this package."
            color="text-emerald-500"
          />
        )}
      </div>
    </div>
  );
};

export default CodeSnippetViewer;
