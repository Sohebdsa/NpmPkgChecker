import React from 'react';

const classMap = {
  safe:      { bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400', dot: 'bg-emerald-400 dot-safe' },
  warning:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   text: 'text-amber-400',   dot: 'bg-amber-400 dot-warning' },
  malicious: { bg: 'bg-red-500/10',     border: 'border-red-500/25',     text: 'text-red-400',     dot: 'bg-red-400 dot-danger' },
};

const RiskBadge = ({ classification = 'safe', score }) => {
  const c = classMap[classification] || classMap.safe;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold tracking-wide ${c.bg} ${c.border} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      <span className="capitalize">{classification}</span>
      {score !== undefined && (
        <span className="opacity-60 font-normal">· {score}pts</span>
      )}
    </div>
  );
};

export default RiskBadge;
