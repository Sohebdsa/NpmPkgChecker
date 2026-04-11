import React, { useState } from 'react';
import { Search, Loader2, Package } from 'lucide-react';

const SearchBar = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 glass ${
        focused
          ? 'border border-brand/50 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]'
          : 'border border-white/[0.06]'
      }`}>
        <div className="flex items-center gap-2 text-slate-500">
          <Package className="w-4 h-4" />
          <span className="text-xs font-mono text-slate-600 hidden sm:block">npm install</span>
        </div>
        <div className="w-px h-5 bg-white/10" />
        <input
          type="text"
          placeholder="package-name"
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-600 font-mono text-sm py-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
            isLoading || !query.trim()
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-brand hover:bg-indigo-500 text-white shadow-[0_2px_12px_rgba(99,102,241,0.4)]'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scanning…</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Analyze</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
