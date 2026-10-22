import React from 'react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: any;
  onOpenAuth: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onOpenAuth,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: 'grid_view', authRequired: false },
    { id: 'vehicles', label: 'My Vehicles', icon: 'directions_car', authRequired: true },
    { id: 'challans', label: 'Challan Centre', icon: 'receipt_long', authRequired: true },
    { id: 'academy', label: 'Traffic Rules Academy', icon: 'school', authRequired: false },
    { id: 'nav-alerts', label: 'Nav & Voice Alerts', icon: 'navigation', authRequired: false },
    { id: 'vault', label: 'Dashcam Vault', icon: 'videocam', authRequired: true },
    { id: 'ai-studio', label: 'AI Road Intelligence', icon: 'smart_toy', authRequired: false },
  ];

  if (user && user.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin Ops', icon: 'security', authRequired: true });
  }

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-72 stitch-glass z-50 flex-col justify-between shadow-[0_8px_32px_0_rgba(0,0,0,0.45)]">
      <div className="flex flex-col">
        {/* Emblem & Brand Title */}
        <div 
          onClick={() => setCurrentTab('overview')}
          className="h-16 px-6 flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-[0_0_16px_rgba(34,211,238,0.3)] group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#070B14] rounded-[10px] flex items-center justify-center text-electric-cyan">
              <span className="material-symbols-outlined text-2xl">shield</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-md text-xl tracking-tight text-white font-bold group-hover:text-cyan-400 transition-colors">
              AeroVision
            </span>
            <span className="font-telemetry-sm text-[11px] text-[#94A3B8]">
              AI COCKPIT v2.4
            </span>
          </div>
        </div>

        {/* Telemetry Synced Micro Bar */}
        <div className="px-4 py-2">
          <div className="px-3 py-1.5 flex items-center justify-between bg-[#070e1c] rounded-lg border border-white/5">
            <span className="font-telemetry-sm text-[11px] text-[#10B981] flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              TELEMETRY ACTIVE
            </span>
            <span className="font-telemetry-sm text-[11px] text-[#94A3B8]">
              11.8ms
            </span>
          </div>
        </div>

        {/* Navigation Item Links */}
        <nav className="flex flex-col gap-1 px-4 mt-2">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.authRequired && !user) {
                    onOpenAuth();
                  } else {
                    setCurrentTab(item.id);
                  }
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-left ${
                  isActive
                    ? 'bg-[#3B82F6] text-white font-semibold shadow-[0_0_16px_rgba(59,130,246,0.35)]'
                    : 'text-[#c2c6d6] hover:bg-[#232a39] hover:text-white'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] transition-colors ${
                    isActive ? 'text-white' : 'text-[#94A3B8]'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="font-body-md text-sm">{item.label}</span>
                {item.id === 'admin' && (
                  <span className="ml-auto text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    ADMIN
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Sensor Sync Gauge */}
      <div className="p-4 flex flex-col gap-2 border-t border-white/5">
        <div className="p-3.5 rounded-xl bg-[#070e1c]/80 border border-white/5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-telemetry-sm text-[10px] text-[#c2c6d6] uppercase tracking-wider font-semibold">
              HUD SENSOR SYNC
            </span>
            <span className="font-telemetry-sm text-[11px] text-[#10B981] font-bold">
              100%
            </span>
          </div>
          <div className="w-full bg-[#232a39] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#22D3EE] h-full w-full shadow-[0_0_8px_#22D3EE]"></div>
          </div>
        </div>
      </div>
    </aside>
  );
};
