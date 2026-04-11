import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { ShieldCheck, Terminal, AlertCircle, Zap, ToggleLeft, ToggleRight, Clock, X } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import DependencyGraph from '../components/DependencyGraph';
import CodeSnippetViewer from '../components/CodeSnippetViewer';

// ── Scanning overlay ────────────────────────────────────────────────
const ScanningOverlay = ({ packageName }) => (
  <div className="flex flex-col items-center justify-center py-28 gap-8 fade-in">
    <div className="relative w-24 h-24">
      <div className="absolute inset-0 rounded-full border-2 border-brand/20 animate-ping" style={{ animationDuration: '1.5s' }} />
      <div className="absolute inset-3 rounded-full border border-brand/30 animate-spin-slow" />
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <div className="w-full h-full scan-loader" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Zap className="w-8 h-8 text-brand" />
      </div>
    </div>
    <div className="text-center space-y-2">
      <p className="text-white font-semibold text-lg">
        Scanning <span className="text-brand font-mono">{packageName}</span>…
      </p>
      <p className="text-slate-500 text-sm font-mono">downloading · extracting · scanning line-by-line</p>
      <p className="text-slate-600 text-xs font-mono mt-1">Deep nested scan — this may take a minute</p>
    </div>
  </div>
);

// ── Landing state ───────────────────────────────────────────────────
const Landing = ({ onQuickSearch }) => (
  <div className="flex flex-col items-center text-center py-20 gap-6 fade-in">
    <div className="w-20 h-20 rounded-3xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-2">
      <Terminal className="w-9 h-9 text-brand" />
    </div>
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Scan before you install</h2>
      <p className="text-slate-500 text-sm max-w-md leading-relaxed">
        SafeInstall downloads every npm tarball, extracts it, and analyzes each file
        for dangerous APIs, obfuscation, lifecycle hooks, and typosquatting.
      </p>
    </div>

    <div className="flex flex-wrap justify-center gap-2">
      {[
        { icon: '🔍', label: 'Static code analysis' },
        { icon: '🌳', label: 'Draggable dependency graph' },
        { icon: '📄', label: 'Exact file · line · snippet' },
        { icon: '🛡️', label: 'Typosquatting detection' },
      ].map(f => (
        <div key={f.label} className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl glass border border-white/[0.07] text-slate-400">
          <span>{f.icon}</span><span>{f.label}</span>
        </div>
      ))}
    </div>

    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-slate-600 font-mono">try:</span>
      {['express', 'lodash', 'axios', 'chalk'].map(p => (
        <button
          key={p}
          onClick={() => onQuickSearch(p)}
          className="font-mono text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-white hover:border-brand/40 transition-all"
        >
          {p}
        </button>
      ))}
    </div>
  </div>
);

// ── Safe Mode Toggle ────────────────────────────────────────────────
const SafeModeToggle = ({ enabled, onToggle }) => (
  <button
    onClick={onToggle}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all duration-300 ${
      enabled
        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.2)]'
        : 'bg-white/[0.03] border-white/[0.08] text-slate-500 hover:border-white/20'
    }`}
    title="When enabled, blocks installation of any malicious packages."
  >
    {enabled
      ? <ToggleRight className="w-4 h-4" />
      : <ToggleLeft className="w-4 h-4" />}
    Safe Mode
  </button>
);

// ── Scan History Item ───────────────────────────────────────────────
const HistoryItem = ({ entry, onRestore }) => (
  <button
    onClick={() => onRestore(entry)}
    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.05] text-left transition-colors group"
  >
    <div className={`w-2 h-2 rounded-full shrink-0 ${
      entry.classification === 'safe'      ? 'bg-emerald-500' :
      entry.classification === 'warning'   ? 'bg-amber-500'   :
      entry.classification === 'malicious' ? 'bg-red-500'     : 'bg-slate-500'
    }`} />
    <div className="flex-1 min-w-0">
      <p className="text-xs font-mono text-slate-300 truncate group-hover:text-white transition-colors">{entry.name}</p>
      <p className="text-[10px] text-slate-600 font-mono">v{entry.version} · {entry.riskScore}pts</p>
    </div>
    <Clock className="w-3 h-3 text-slate-700 group-hover:text-slate-500 transition-colors shrink-0" />
  </button>
);

// ── Safe Mode Banner ────────────────────────────────────────────────
const SafeModeBanner = ({ treeData, safeMode }) => {
  if (!safeMode || !treeData) return null;

  // Count malicious in tree
  const countMalicious = (node, acc = 0) => {
    if (!node || node.skip) return acc;
    if (node.classification === 'malicious') acc++;
    (node.dependencies || []).forEach(d => { acc = countMalicious(d, acc); });
    return acc;
  };
  const mal = countMalicious(treeData);
  if (mal === 0) return null;

  return (
    <div className="flex items-center gap-3 glass border border-red-500/30 bg-red-500/[0.06] px-5 py-3.5 rounded-xl mb-4 fade-in">
      <ShieldCheck className="w-5 h-5 text-red-400 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-red-400">Safe Mode — Installation Blocked</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {mal} malicious package{mal > 1 ? 's' : ''} detected. Installation would be blocked if run via SafeInstall CLI.
        </p>
      </div>
    </div>
  );
};

// ── Dashboard ───────────────────────────────────────────────────────
const Dashboard = () => {
  const [isLoading, setIsLoading]       = useState(false);
  const [treeData, setTreeData]         = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [error, setError]               = useState('');
  const [safeMode, setSafeMode]         = useState(false);
  const [history, setHistory]           = useState([]);
  const [showHistory, setShowHistory]   = useState(false);

  const doScan = useCallback(async (packageName) => {
    setIsLoading(true);
    setError('');
    setTreeData(null);
    setSelectedNode(null);

    try {
      const res = await axios.post('http://localhost:5000/api/scan', { package: packageName });
      setTreeData(res.data);
      setSelectedNode(res.data);

      // Add to history (max 8)
      setHistory(prev => {
        const item = {
          name: res.data.name,
          version: res.data.version,
          riskScore: res.data.riskScore,
          classification: res.data.classification,
          data: res.data,
          ts: Date.now(),
        };
        const filtered = prev.filter(h => h.name !== res.data.name);
        return [item, ...filtered].slice(0, 8);
      });
    } catch (err) {
      setError(
        err.response?.data?.message || err.response?.data?.error ||
        err.message || 'Backend unreachable — is the server running on port 5000?'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restoreHistory = useCallback((entry) => {
    setTreeData(entry.data);
    setSelectedNode(entry.data);
    setShowHistory(false);
  }, []);

  return (
    <div className="relative min-h-screen grid-bg">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-60 -left-40 w-[500px] h-[500px] rounded-full bg-brand/[0.08] blur-[140px]" />
        <div className="absolute top-1/2 -right-60 w-[400px] h-[400px] rounded-full bg-indigo-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-5 py-7 flex flex-col min-h-screen">

        {/* ── Topbar ── */}
        <header className="flex items-center gap-5 mb-8">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-brand/15 border border-brand/25 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-none">SafeInstall</h1>
              <p className="text-[10px] text-slate-600 font-mono leading-none mt-0.5">npm dependency scanner</p>
            </div>
          </div>

          {/* Search (flex-1 centered) */}
          <div className="flex-1 flex justify-center">
            <SearchBar onSearch={doScan} isLoading={isLoading} />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3 shrink-0">
            <SafeModeToggle enabled={safeMode} onToggle={() => setSafeMode(s => !s)} />

            {history.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowHistory(s => !s)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:border-white/20 text-xs font-semibold transition-all"
                >
                  <Clock className="w-3.5 h-3.5" />
                  History ({history.length})
                </button>

                {showHistory && (
                  <div className="absolute right-0 top-full mt-2 w-64 glass border border-white/[0.08] rounded-2xl p-2 shadow-2xl z-50 fade-in">
                    <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                      <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">Recent Scans</span>
                      <button onClick={() => setShowHistory(false)} className="text-slate-600 hover:text-slate-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {history.map((entry) => (
                      <HistoryItem key={entry.ts} entry={entry} onRestore={restoreHistory} />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dot-safe" />
              API live
            </div>
          </div>
        </header>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-3 glass border border-red-500/25 text-red-400 px-5 py-4 rounded-xl mb-6 fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* ── Safe mode blocked banner ── */}
        <SafeModeBanner treeData={treeData} safeMode={safeMode} />

        {/* ── States ── */}
        {isLoading && <ScanningOverlay packageName="" />}

        {!isLoading && !treeData && !error && (
          <Landing onQuickSearch={doScan} />
        )}

        {!isLoading && treeData && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-5 items-start fade-in">
            <div style={{ height: 'calc(100vh - 150px)' }}>
              <DependencyGraph treeData={treeData} onSelectNode={setSelectedNode} />
            </div>
            <div className="sticky top-6" style={{ height: 'calc(100vh - 150px)' }}>
              <CodeSnippetViewer selectedNode={selectedNode} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
