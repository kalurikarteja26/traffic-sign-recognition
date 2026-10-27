import React from 'react';

interface MobileBottomBarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  user?: any;
  onOpenAuth?: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  currentTab,
  onNavigate,
  user,
  onOpenAuth,
}) => {
  const tabs = [
    { id: 'overview', label: 'Cockpit', icon: 'grid_view', auth: false },
    { id: 'vehicles', label: 'Garage', icon: 'directions_car', auth: true },
    { id: 'challans', label: 'Challans', icon: 'receipt_long', auth: true },
    { id: 'academy', label: '108 Signs', icon: 'school', auth: false },
    { id: 'nav-alerts', label: 'Live ADAS', icon: 'navigation', auth: false },
  ];

  const handleSelect = (tabId: string, authRequired: boolean) => {
    if (authRequired && !user && onOpenAuth) {
      onOpenAuth();
      return;
    }
    onNavigate(tabId);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#070e1c]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1 safe-area-bottom shadow-[0_-8px_25px_rgba(0,0,0,0.65)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab.id, tab.auth)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all touch-target relative ${
                isActive
                  ? 'text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              aria-label={tab.label}
            >
              {/* Active Indicator Top Glow */}
              {isActive && (
                <div className="absolute -top-1 w-8 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_#22D3EE]" />
              )}

              <span
                className={`material-symbols-outlined text-2xl transition-transform ${
                  isActive ? 'scale-110 text-cyan-400' : 'text-slate-400'
                }`}
              >
                {tab.icon}
              </span>
              <span className="text-[10px] tracking-tight mt-0.5 leading-none font-medium">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
