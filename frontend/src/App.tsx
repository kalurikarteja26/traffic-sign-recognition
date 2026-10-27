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
import { NotFoundView } from './pages/NotFoundView';
import { Footer } from './components/Footer';
import { MobileBottomBar } from './components/MobileBottomBar';
import { ToastContainer } from './components/Toast';
import { api } from './api';
import { Shield, Lock, Phone, Mail, X } from 'lucide-react';

// Normalizes tab aliases and strips out query parameters or sub-routes
const normalizeTab = (raw: string): string => {
  const clean = raw
    .replace(/^#\/?/, '')
    .split('?')[0]
    .split('/')[0]
    .trim()
    .toLowerCase();

  if (!clean || clean === '' || clean === 'home') return 'overview';
  if (clean === 'dashboard') return 'overview';
  if (clean === 'garage') return 'vehicles';
  if (clean === 'rules') return 'academy';
  if (clean === 'navigation' || clean === 'nav' || clean === 'map' || clean === 'alerts') return 'nav-alerts';
  if (clean === '404' || clean === 'notfound') return 'notfound';

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
  return validTabs.includes(clean) ? clean : 'notfound';
};

const getTabFromLocation = (): string => {
  return normalizeTab(window.location.hash || 'overview');
};

export const App: React.FC = () => {
  const [currentTab, setCurrentTabState] = useState<string>(getTabFromLocation);
  const [user, setUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigate function that pushes browser history state
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

  // Listen to popstate and hashchange events for 100% reliable back/forward navigation
  useEffect(() => {
    const handleUrlNavigation = (event?: PopStateEvent | HashChangeEvent) => {
      const stateTab = (event as PopStateEvent)?.state?.tab;
      const targetTab = stateTab ? normalizeTab(stateTab) : getTabFromLocation();
      setCurrentTabState(targetTab);
      setMobileMenuOpen(false);
    };

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

  // Dynamic Document Title and Meta Description Updater (Items 5 & 6)
  useEffect(() => {
    const tabMetadata: Record<string, { title: string; desc: string }> = {
      overview: {
        title: 'Cockpit Overview & Live Telemetry | AeroVision',
        desc: 'Real-time vehicle telemetry, CAN-bus diagnostics, safety score, and HUD road perception stream.',
      },
      vehicles: {
        title: 'Vehicle Garage & Fleet Diagnostics | AeroVision',
        desc: 'Manage family cars, EVs, commercial vehicles, PUC and insurance validity, and FASTag balances.',
      },
      challans: {
        title: 'Challan Centre & Evidence Dispute | AeroVision',
        desc: 'Track pending traffic challans across Indian states, dispute wrongful notices with dashcam video proof, and view official Parivahan payment links.',
      },
      academy: {
        title: 'Traffic Rules & IRC:67 Academy | AeroVision',
        desc: 'Comprehensive reference of 108 Indian RTO signs, statutory Motor Vehicles Act penalties, and interactive safety quizzes.',
      },
      'nav-alerts': {
        title: 'Live Navigation & Voice Alerts Avionics | AeroVision',
        desc: 'GPS route corridor navigation with advance voice warnings in English, Hindi, and Telugu for verified traffic signs and speed limits.',
      },
      vault: {
        title: 'Dashcam Cloud Evidence Vault | AeroVision',
        desc: 'Secure private cloud storage for dashcam recordings with bookmarking, timestamped safety events, and dispute exports.',
      },
      'ai-studio': {
        title: 'AI Road Intelligence & HUD Stream | AeroVision',
        desc: 'Deep neural network perception classifying 108 Indian RTO road signs with real-time bounding boxes and voice alerts.',
      },
      profile: {
        title: 'Pilot Profile & Data Privacy Center | AeroVision',
        desc: 'User identity settings, phone and email management, password updates, and GDPR/DPDP personal data export.',
      },
      admin: {
        title: 'Platform Administration & Operations | AeroVision',
        desc: 'Administrative governance, user accounts directory, PyTorch node diagnostics, and immutable audit logs.',
      },
      landing: {
        title: 'AeroVision — Intelligent Road Safety & AI Cockpit',
        desc: 'Unified road safety intelligence platform connecting vehicle garage, traffic challans, RTO learning, and dashcam AI.',
      },
      notfound: {
        title: '404 Telemetry Lost — Route Not Found | AeroVision',
        desc: 'The requested cockpit waypoint or telemetry corridor could not be located on the active grid.',
      },
    };

    const currentMeta = tabMetadata[currentTab] || tabMetadata.notfound || tabMetadata.overview;
    document.title = currentMeta.title;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', currentMeta.desc);
    }
  }, [currentTab]);

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
    <div className="bg-background-base font-body-md text-body-md text-on-surface antialiased selection:bg-blue-600 selection:text-white min-h-screen flex flex-col w-full max-w-full overflow-x-hidden relative">
      {/* Dynamic Animated Ambient Background System */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Animated Cyber Road Grid */}
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

      {/* Mobile Drawer Navigation (Item 3, 17, 18, 19) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md lg:hidden flex animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-80 max-w-[85vw] h-full bg-[#0d1627] border-r border-white/10 p-5 flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Header with Clickable Logo (Item 17) */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div
                  onClick={() => {
                    setCurrentTab(user ? 'overview' : 'landing');
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 cursor-pointer group"
                  title="Return to Cockpit Overview"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                    <div className="w-full h-full bg-[#070B14] rounded-[6px] flex items-center justify-center text-cyan-400">
                      <span className="material-symbols-outlined text-lg">shield</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-heading font-black text-white text-base tracking-tight block">
                      AeroVision
                    </span>
                    <span className="font-mono text-[9px] text-cyan-400 block -mt-0.5">
                      AI COCKPIT v2.4
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                  aria-label="Close navigation drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Pilot Status Header in Mobile Drawer */}
              {user && (
                <div className="mb-4 p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-white text-xs shrink-0">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">{user.full_name}</div>
                    <div className="text-[10px] text-cyan-400 font-mono truncate">{user.email}</div>
                  </div>
                </div>
              )}

              {/* Complete Navigation Items */}
              <nav className="flex flex-col gap-1 text-sm font-medium">
                {[
                  { id: 'overview', label: 'Cockpit Overview', icon: 'grid_view' },
                  { id: 'vehicles', label: 'My Vehicles & CAN Fleet', icon: 'directions_car' },
                  { id: 'challans', label: 'Challan & Violation Centre', icon: 'receipt_long' },
                  { id: 'academy', label: '108 Traffic Rules Academy', icon: 'school' },
                  { id: 'nav-alerts', label: 'Live Nav & Voice Alerts', icon: 'navigation' },
                  { id: 'vault', label: 'Dashcam Cloud Vault', icon: 'videocam' },
                  { id: 'ai-studio', label: 'AI Road Intelligence', icon: 'smart_toy' },
                  { id: 'profile', label: 'Pilot Profile & Security', icon: 'person' },
                  ...(user && user.role === 'admin'
                    ? [{ id: 'admin', label: 'Admin Operations Console', icon: 'security' }]
                    : []),
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all ${
                      currentTab === item.id
                        ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    <span className="text-xs sm:text-sm">{item.label}</span>
                  </button>
                ))}
              </nav>

              {/* Clickable Emergency Helplines (Item 18) */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-2">
                  Emergency Helplines
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a
                    href="tel:112"
                    className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 flex items-center gap-1.5 font-mono"
                  >
                    <Phone className="w-3.5 h-3.5 text-red-400" />
                    <span>112 (Police)</span>
                  </a>
                  <a
                    href="tel:1033"
                    className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-1.5 font-mono"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>1033 (NHAI)</span>
                  </a>
                </div>
              </div>

              {/* Clickable Support Email (Item 19) */}
              <div className="mt-3">
                <a
                  href="mailto:support@aerovision.in"
                  className="flex items-center gap-2 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono"
                >
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="truncate">support@aerovision.in</span>
                </a>
              </div>
            </div>

            {/* Bottom Auth Disconnect / Sign In */}
            <div className="pt-4 border-t border-white/10 mt-6">
              {user ? (
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs text-red-400 rounded-xl hover:bg-red-500/10 border border-red-500/20 font-mono font-bold"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  Disconnect Cockpit
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleOpenAuth('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30"
                >
                  Sign In Cockpit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Cockpit Layout Container (Offset by sidebar width on desktop) */}
      <div className="lg:pl-72 flex-1 flex flex-col relative z-10 w-full max-w-full overflow-x-hidden">
        {/* Fixed Top Header */}
        <Header
          currentTab={currentTab}
          user={user}
          onOpenAuth={() => handleOpenAuth('login')}
          onLogout={handleLogout}
          onNavigate={(tab) => setCurrentTab(tab)}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Viewport Content Stage (pb-20 on mobile to clear MobileBottomBar) */}
        <main className="w-full pt-16 flex-1 px-3 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8 max-w-full overflow-x-hidden">
          {/* Protected View Fallback for non-authenticated state */}
          {isProtectedTab && !user ? (
            <div className="titanium-panel p-6 sm:p-12 text-center max-w-lg mx-auto my-12 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="font-heading font-black text-2xl text-white mb-2">
                Restricted Cockpit Telemetry
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                You must sign in or register to access vehicle garage, challan center, dashcam cloud vault, and personalized safety records.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
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

              {currentTab === 'notfound' && (
                <NotFoundView onNavigate={(tab) => setCurrentTab(tab)} />
              )}
            </>
          )}

          {/* Global Cockpit Footer (Item 7, 9, 17, 18, 19) */}
          <Footer onNavigate={(tab) => setCurrentTab(tab)} user={user} />
        </main>
      </div>

      {/* Mobile App Bottom Navigation Bar (Item 3 & 20) */}
      <MobileBottomBar
        currentTab={currentTab}
        onNavigate={(tab) => setCurrentTab(tab)}
        user={user}
        onOpenAuth={() => handleOpenAuth('login')}
      />

      {/* Global Toast Notification Container (Item 12 & 13) */}
      <ToastContainer />

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
