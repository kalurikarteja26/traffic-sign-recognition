import React from 'react';
import { Compass, AlertTriangle, ArrowRight, Home, Navigation, Shield, BookOpen } from 'lucide-react';

interface NotFoundViewProps {
  onNavigate: (tab: string) => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center text-center px-4 py-12 max-w-2xl mx-auto relative">
      {/* Radar Pulse Background */}
      <div className="relative w-40 h-40 mb-6 flex items-center justify-center">
        {/* Concentric Radar Rings */}
        <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping opacity-30 pointer-events-none" />
        <div className="absolute inset-4 rounded-full border border-cyan-500/40 pointer-events-none" />
        <div className="absolute inset-8 rounded-full border border-blue-500/30 pointer-events-none" />
        <div className="absolute inset-12 rounded-full border border-purple-500/30 pointer-events-none" />

        {/* Center Scanner Core */}
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
          <Compass className="w-8 h-8 animate-spin" style={{ animationDuration: '8s' }} />
        </div>
      </div>

      {/* Code Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs font-bold uppercase tracking-wider mb-3">
        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
        <span>ERROR 404 // GPS TELEMETRY DISCONNECTED</span>
      </div>

      <h1 className="font-heading font-black text-3xl sm:text-4xl text-white tracking-tight mb-3">
        Route Coordinates Off-Grid
      </h1>

      <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg mb-6">
        The requested cockpit telemetry view or waypoint corridor does not exist on the active road network. It may have been relocated, decommissioned, or entered incorrectly.
      </p>

      {/* Diagnostic Readout Box */}
      <div className="w-full bg-[#070e1c] rounded-xl border border-white/10 p-4 font-mono text-xs text-left mb-8 max-w-md shadow-xl">
        <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-white/5">
          <span>COCKPIT_DIAGNOSTIC</span>
          <span className="text-cyan-400">WAYPOINT_NULL</span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
          <div>
            <span className="text-slate-500">CORRIDOR_ID:</span>{' '}
            <span className="text-slate-300">UNKNOWN</span>
          </div>
          <div>
            <span className="text-slate-500">SATELLITE_LOCK:</span>{' '}
            <span className="text-red-400 font-bold">0 / 12</span>
          </div>
          <div>
            <span className="text-slate-500">CAN_BUS:</span>{' '}
            <span className="text-emerald-400">STANDBY</span>
          </div>
          <div>
            <span className="text-slate-500">RE-ROUTE:</span>{' '}
            <span className="text-cyan-400">RECOMMENDED</span>
          </div>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 w-full">
        <button
          onClick={() => onNavigate('overview')}
          className="btn-primary text-xs sm:text-sm px-6 py-3"
        >
          <Home className="w-4 h-4" />
          <span>Return to Cockpit Overview</span>
        </button>

        <button
          onClick={() => onNavigate('nav-alerts')}
          className="btn-secondary text-xs sm:text-sm px-5 py-3 border-cyan-500/30 text-cyan-300 hover:text-white"
        >
          <Navigation className="w-4 h-4 text-cyan-400" />
          <span>Launch Live Navigation</span>
        </button>

        <button
          onClick={() => onNavigate('academy')}
          className="btn-secondary text-xs sm:text-sm px-5 py-3"
        >
          <BookOpen className="w-4 h-4 text-purple-400" />
          <span>Explore 108 RTO Signs</span>
        </button>
      </div>

      {/* Quick Links Footer */}
      <div className="mt-12 pt-6 border-t border-white/10 w-full flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
        <button
          onClick={() => onNavigate('vehicles')}
          className="hover:text-cyan-400 transition-colors"
        >
          My Vehicles
        </button>
        <span>•</span>
        <button
          onClick={() => onNavigate('challans')}
          className="hover:text-cyan-400 transition-colors"
        >
          Challan Centre
        </button>
        <span>•</span>
        <button
          onClick={() => onNavigate('vault')}
          className="hover:text-cyan-400 transition-colors"
        >
          Dashcam Vault
        </button>
        <span>•</span>
        <button
          onClick={() => onNavigate('ai-studio')}
          className="hover:text-cyan-400 transition-colors"
        >
          AI Perception
        </button>
      </div>
    </div>
  );
};
