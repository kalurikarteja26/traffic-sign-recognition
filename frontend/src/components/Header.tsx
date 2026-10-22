import React, { useState } from 'react';

interface HeaderProps {
  currentTab: string;
  user: any;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNavigate: (tab: string) => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  user,
  onOpenAuth,
  onLogout,
  onNavigate,
  onToggleMobileMenu,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const getBreadcrumbName = (tab: string) => {
    switch (tab) {
      case 'overview':
      case 'landing':
      case 'dashboard':
        return 'Cockpit Telemetry Overview';
      case 'vehicles':
      case 'garage':
        return 'My Vehicles & CAN Diagnostics';
      case 'challans':
        return 'Challan Centre & Evidence Dispute';
      case 'academy':
      case 'rules':
        return 'Traffic Rules & IRC:67 Academy';
      case 'vault':
        return 'Dashcam Evidence Vault';
      case 'ai-studio':
        return 'AI Road Intelligence & HUD Stream';
      case 'nav-alerts':
      case 'navigation':
        return 'Live Navigation & Voice Alert Avionics';
      case 'admin':
        return 'Admin Operations';
      case 'profile':
        return 'Pilot Profile & Safety Metrics';
      default:
        return 'Cockpit Overview';
    }
  };

  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 stitch-glass z-40 px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-white/5">
      {/* Left side: Mobile menu toggle + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
          aria-label="Toggle Navigation"
        >
          <span className="material-symbols-outlined text-xl">menu</span>
        </button>

        <div className="flex items-center gap-2 font-telemetry-sm text-xs text-[#94A3B8]">
          <span className="hidden sm:inline">SYSTEM</span>
          <span className="material-symbols-outlined text-sm hidden sm:inline">chevron_right</span>
          <span className="text-white font-medium tracking-wide">
            {getBreadcrumbName(currentTab)}
          </span>
        </div>
      </div>

      {/* Right side: Quick Search, Help, Notifications, User profile */}
      <div className="flex items-center gap-3">
        {/* Search Input (Hidden on mobile) */}
        <div className="hidden md:flex relative w-56 lg:w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Search plates, signs, rules..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#0e1726]/60 border border-white/10 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onNavigate('academy');
              }
            }}
          />
        </div>

        {/* Quick Rules Academy Shortcut */}
        <button
          onClick={() => onNavigate('academy')}
          title="Traffic Rules & Sign Catalog"
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors hidden sm:flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-xl text-cyan-400">help</span>
        </button>

        {/* Notifications Pill */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors flex items-center justify-center"
            title="Cockpit Notifications"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          </button>

          {notificationsOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 cursor-default" 
                onClick={() => setNotificationsOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-80 bg-[#0d1527] border border-white/15 rounded-xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 text-xs animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                  <span className="font-heading font-bold text-white">System Alerts</span>
                  <span className="font-telemetry-sm text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">3 NEW</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="font-medium text-blue-300">PyTorch 108-Class Model Ready</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Running locally at 11.8ms inference latency.</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="font-medium text-amber-300">New Speed Camera Notice</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Disputable notice logged on NH44 Expressway.</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="font-medium text-emerald-300">IRC:67 Sign Rules Synced</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">108 mandatory, cautionary & informatory signs loaded.</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Account / Sign In */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-[#101A2B] hover:bg-[#15233a] border border-white/10 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-white text-xs shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-white truncate max-w-[110px]">
                  {user.full_name || user.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {user.safety_score ? `Score: ${user.safety_score}` : 'Safe Pilot'}
                </span>
              </div>
              <span className="material-symbols-outlined text-sm text-slate-400">
                arrow_drop_down
              </span>
            </button>

            {profileDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setProfileDropdownOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-64 bg-[#0d1527] border border-white/15 rounded-xl p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl">
                  {/* User Profile Header Card */}
                  <div className="px-3 py-2.5 bg-white/[0.04] rounded-lg border border-white/10 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{user.full_name || 'Cockpit Pilot'}</div>
                        <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                      </div>
                    </div>
                    {user.role === 'admin' && (
                      <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between">
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-300 font-mono text-[9px] font-bold tracking-wider">
                          ADMINISTRATOR
                        </span>
                        <span className="text-[10px] text-cyan-400 font-mono">Full Clearance</span>
                      </div>
                    )}
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        onNavigate('profile');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors group"
                    >
                      <span className="material-symbols-outlined text-base text-cyan-400 group-hover:scale-110 transition-transform">person</span>
                      Pilot Profile
                    </button>

                    <button
                      onClick={() => {
                        onNavigate('vehicles');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors group"
                    >
                      <span className="material-symbols-outlined text-base text-cyan-400 group-hover:scale-110 transition-transform">directions_car</span>
                      Vehicle Garage
                    </button>

                    <button
                      onClick={() => {
                        onNavigate('challans');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors group"
                    >
                      <span className="material-symbols-outlined text-base text-amber-400 group-hover:scale-110 transition-transform">receipt_long</span>
                      Challan Records
                    </button>
                  </div>

                  <div className="border-t border-white/10 my-2"></div>

                  <button
                    onClick={() => {
                      onLogout();
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/15 transition-colors group"
                  >
                    <span className="material-symbols-outlined text-base group-hover:translate-x-0.5 transition-transform">logout</span>
                    Disconnect Cockpit
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium text-xs shadow-[0_0_16px_rgba(34,211,238,0.3)] hover:opacity-95 transition-all"
          >
            <span className="material-symbols-outlined text-base">lock_open</span>
            Sign In Cockpit
          </button>
        )}
      </div>
    </header>
  );
};
