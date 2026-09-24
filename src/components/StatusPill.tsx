import React from 'react';

interface StatusPillProps {
  label: string;
  value: string;
  status: 'active' | 'warning' | 'idle' | 'error';
  icon?: React.ReactNode;
}

export default function StatusPill({ label, value, status, icon }: StatusPillProps) {
  const getColors = () => {
    switch (status) {
      case 'active':
        return 'border-[#00f0ff]/50 bg-[#00f0ff]/10 text-[#00f0ff]';
      case 'warning':
        return 'border-[#ffaa00]/50 bg-[#ffaa00]/10 text-[#ffaa00]';
      case 'error':
        return 'border-[#ff007f]/50 bg-[#ff007f]/10 text-[#ff007f]';
      default:
        return 'border-slate-700 bg-slate-800/40 text-slate-400';
    }
  };

  const getDotColor = () => {
    switch (status) {
      case 'active':
        return 'bg-[#00f0ff] shadow-[0_0_8px_#00f0ff]';
      case 'warning':
        return 'bg-[#ffaa00] shadow-[0_0_8px_#ffaa00]';
      case 'error':
        return 'bg-[#ff007f] shadow-[0_0_8px_#ff007f]';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1 text-xs border rounded backdrop-blur-md cyber-clip-badge ${getColors()}`}>
      <span className={`w-2 h-2 rounded-full ${getDotColor()} animate-pulse`} />
      <span className="font-semibold uppercase tracking-wider text-slate-300 font-mono-tech">{label}:</span>
      <span className="font-bold tracking-wide font-mono-tech">{value}</span>
      {icon && <span className="ml-1">{icon}</span>}
    </div>
  );
}
