import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './pages/LandingPage';
import { DashboardView } from './pages/DashboardView';
import { GarageView } from './pages/GarageView';
import { ChallanView } from './pages/ChallanView';
import { RulesView } from './pages/RulesView';
import { VaultView } from './pages/VaultView';
import { AIStudioView } from './pages/AIStudioView';
import { ProfileView } from './pages/ProfileView';
import { AdminView } from './pages/AdminView';
import { NavigationAlertsView } from './pages/NavigationAlertsView';
import { api } from './api';
import { Shield, Lock } from 'lucide-react';

// Normalizes tab aliases and strips out query parameters or sub-routes
const normalizeTab = (raw: string): string => {
  const clean = raw
    .replace(/^#\/?/, '')
    .split('?')[0]
    .split('/')[0]
    .trim()
    .toLowerCase();

  if (clean === 'dashboard') return 'overview';
  if (clean === 'garage') return 'vehicles';
  if (clean === 'rules') return 'academy';
  if (clean === 'navigation' || clean === 'nav' || clean === 'map' || clean === 'alerts') return 'nav-alerts';

  const validTabs = [
    'overview',
    'vehicles',
    'challans',
    'academy',
    'vault',
    'ai-studio',
    'nav-alerts',
    'admin',
    'profile',
    'landing',
  ];
  return validTabs.includes(clean) ? clean : 'overview';
};

const getTabFromLocation = (): string => {
  return normalizeTab(window.location.hash || 'overview');
};

export const App: React.FC = () => {
  const [currentTab, setCurrentTabState] = useState<string>(getTabFromLocation);

  // Navigate function that pushes browser history state (enables mouse back/forward buttons!)
  const setCurrentTab = (tab: string, pushHistory = true) => {
    const target = normalizeTab(tab);
    setCurrentTabState(target);
    setMobileMenuOpen(false);

    const targetHash = `#${target}`;
    if (pushHistory) {
      if (window.location.hash !== targetHash) {
        window.history.pushState({ tab: target }, '', targetHash);
      }
    } else {
      window.history.replaceState({ tab: target }, '', targetHash);
    }
  };

  // Listen to both popstate and hashchange events for 100% reliable back/forward navigation
  useEffect(() => {
    const handleUrlNavigation = (event?: PopStateEvent | HashChangeEvent) => {
      const stateTab = (event as PopStateEvent)?.state?.tab;
      const targetTab = stateTab ? normalizeTab(stateTab) : getTabFromLocation();
      setCurrentTabState(targetTab);
      setMobileMenuOpen(false);
    };

    // Ensure initial entry exists in history state
    const initialTab = getTabFromLocation();
    if (!window.history.state?.tab) {
      window.history.replaceState({ tab: initialTab }, '', `#${initialTab}`);
    }

    window.addEventListener('popstate', handleUrlNavigation);
    window.addEventListener('hashchange', handleUrlNavigation);

    return () => {
      window.removeEventListener('popstate', handleUrlNavigation);
      window.removeEventListener('hashchange', handleUrlNavigation);
    };
  }, []);

  const [user, setUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check stored JWT token on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('aerovision_token');
      if (token) {
        try {
          const profile = await api.getProfile();
          setUser(profile);
        } catch (err) {
          console.error('Session expired or invalid:', err);
          api.logout();
          setUser(null);
        }
      }
      setCheckingAuth(false);
    };

    initAuth();
  }, []);

  const handleOpenAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthInitialMode(mode);
    setAuthModalOpen(true);
  };

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setAuthModalOpen(false);
    setCurrentTab('overview');
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setCurrentTab('overview');
  };

  // Guard for protected views
  const isProtectedTab = ['vehicles', 'garage', 'challans', 'vault', 'profile', 'admin'].includes(currentTab);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center animate-pulse mb-4">
          <Shield className="w-6 h-6 text-blue-400" />
        </div>
        <p className="font-mono text-xs text-slate-400 tracking-wider">
          INITIALIZING AEROVISION AVIONICS PLATFORM...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-background-base font-body-md text-body-md text-on-surface antialiased selection:bg-blue-600 selection:text-white min-h-screen flex flex-col">
      {/* Dynamic Animated Ambient Background System */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Animated Cyber Road Grid (Perspective velocity effect) */}
        <div className="cyber-road-grid opacity-75"></div>

        {/* Floating Atmospheric Glow Orbs */}
        <div className="ambient-orb-1 absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-600/15 to-cyan-500/10 blur-[130px]" />
        <div className="ambient-orb-2 absolute top-1/3 -right-40 w-[550px] h-[550px] rounded-full bg-gradient-to-bl from-indigo-600/15 to-purple-600/10 blur-[140px]" />
        <div className="ambient-orb-3 absolute -bottom-40 left-1/3 w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-cyan-600/10 to-blue-500/15 blur-[150px]" />

        {/* Ambient Telemetry Scan Line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent animate-pulse" />
      </div>

      {/* Desktop Fixed Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setMobileMenuOpen(false);
          setCurrentTab(tab);
        }}
        user={user}
        onOpenAuth={() => handleOpenAuth('login')}
      />

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md lg:hidden flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 h-full bg-[#101A2B] border-r border-white/10 p-4 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-400/20 text-cyan-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">shield</span>
                  </div>
                  <span className="font-heading font-bold text-white text-base">AeroVision</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <nav className="flex flex-col gap-1.5 font-body-md text-sm">
                {[
                  { id: 'overview', label: 'Overview', icon: 'grid_view' },
                  { id: 'vehicles', label: 'My Vehicles', icon: 'directions_car' },
                  { id: 'challans', label: 'Challan Centre', icon: 'receipt_long' },
                  { id: 'academy', label: 'Traffic Rules Academy', icon: 'school' },
                  { id: 'nav-alerts', label: 'Nav & Voice Alerts', icon: 'navigation' },
                  { id: 'vault', label: 'Dashcam Vault', icon: 'videocam' },
                  { id: 'ai-studio', label: 'AI Road Intelligence', icon: 'smart_toy' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-left transition-all ${
                      currentTab === item.id
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="pt-4 border-t border-white/10">
              {user ? (
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 rounded-lg hover:bg-red-500/10 font-mono"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  Disconnect Cockpit
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleOpenAuth('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs"
                >
                  Sign In Cockpit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Cockpit Layout Container (Offset by sidebar width on desktop) */}
      <div className="lg:pl-72 flex-1 flex flex-col relative z-10">
        {/* Fixed Top Header */}
        <Header
          currentTab={currentTab}
          user={user}
          onOpenAuth={() => handleOpenAuth('login')}
          onLogout={handleLogout}
          onNavigate={(tab) => setCurrentTab(tab)}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Viewport Content Stage */}
        <main className="w-full pt-16 flex-1 px-4 sm:px-6 lg:px-8 py-6">
          {/* Protected View Fallback for non-authenticated state */}
          {isProtectedTab && !user ? (
            <div className="titanium-panel p-8 sm:p-12 text-center max-w-lg mx-auto my-12 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="font-heading font-black text-2xl text-white mb-2">
                Restricted Cockpit Telemetry
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                You must sign in or register to access vehicle garage, challan center, dashcam cloud vault, and personalized safety records.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => handleOpenAuth('login')}
                  className="btn-primary text-xs"
                >
                  Sign In to Vehicle Garage
                </button>
                <button
                  onClick={() => setCurrentTab('overview')}
                  className="btn-secondary text-xs"
                >
                  Return to Overview
                </button>
              </div>
            </div>
          ) : (
            <>
              {currentTab === 'landing' && (
                <LandingPage
                  onOpenAuth={() => handleOpenAuth('login')}
                  onExploreRules={() => setCurrentTab('academy')}
                  onExploreAI={() => setCurrentTab('ai-studio')}
                />
              )}

              {(currentTab === 'overview' || currentTab === 'dashboard') && (
                <DashboardView user={user} onNavigate={(tab) => setCurrentTab(tab)} />
              )}

              {(currentTab === 'vehicles' || currentTab === 'garage') && <GarageView />}

              {currentTab === 'challans' && <ChallanView />}

              {(currentTab === 'academy' || currentTab === 'rules') && <RulesView />}

              {currentTab === 'vault' && <VaultView />}

              {currentTab === 'ai-studio' && <AIStudioView />}

              {currentTab === 'nav-alerts' && <NavigationAlertsView />}

              {currentTab === 'profile' && (
                <ProfileView
                  user={user}
                  onUserUpdated={(u) => setUser(u)}
                  onLogout={handleLogout}
                />
              )}

              {currentTab === 'admin' && <AdminView />}
            </>
          )}
        </main>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
        initialMode={authInitialMode}
      />
    </div>
  );
};

export default App;
