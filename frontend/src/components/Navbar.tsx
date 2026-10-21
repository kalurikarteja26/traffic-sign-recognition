import React, { useState } from 'react';
import {
  Shield, Car, FileText, BookOpen, Video, Cpu,
  User as UserIcon, LogOut, Bell, Menu, X, Award
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onLogout,
  onOpenAuth,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield, authRequired: true },
    { id: 'garage', label: 'Vehicle Garage', icon: Car, authRequired: true },
    { id: 'challans', label: 'Challan Center', icon: FileText, authRequired: true },
    { id: 'rules', label: 'Rules & Learning', icon: BookOpen, authRequired: false },
    { id: 'vault', label: 'Dashcam Vault', icon: Video, authRequired: true },
    { id: 'ai-studio', label: 'AI Safety Studio', icon: Cpu, authRequired: false },
  ];

  if (user && user.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin Ops', icon: Shield, authRequired: true });
  }

  return (
    <header className="sticky top-0 z-50 bg-[#070B14]/90 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Emblem */}
        <div
          onClick={() => setCurrentTab(user ? 'dashboard' : 'landing')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center border border-blue-400/30 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-blue-400 bg-clip-text text-transparent">
                AeroVision
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-telemetry font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400 uppercase tracking-widest">
                ADAS v2.0
              </span>
            </div>
            <div className="text-[11px] font-telemetry text-slate-400 flex items-center gap-1.5">
              <span className="pulse-online"></span> ROAD SAFETY PLATFORM
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            if (item.authRequired && !user) return null;
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm shadow-blue-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section: User Status or Login Button */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {/* Safety Score Chip */}
              <div
                onClick={() => setCurrentTab('profile')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-telemetry font-bold cursor-pointer hover:bg-emerald-500/20 transition-colors"
                title="Your Driver Safety Score"
              >
                <Award className="w-4 h-4" />
                <span>SAFETY: {user.safety_score || 85}/100</span>
              </div>

              {/* User Dropdown Button */}
              <button
                onClick={() => setCurrentTab('profile')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-white/10 hover:border-blue-500/40 text-slate-200 text-sm font-medium transition-colors"
              >
                <UserIcon className="w-4 h-4 text-blue-400" />
                <span className="max-w-[120px] truncate">{user.full_name}</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="p-2 rounded-lg bg-slate-800/60 border border-white/10 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn-primary text-sm"
            >
              <UserIcon className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 border border-white/10 text-slate-300"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-white/10 flex flex-col gap-1 pb-2">
          {navItems.map((item) => {
            if (item.authRequired && !user) return null;
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-left ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-2 mt-2 border-t border-white/10">
            {user ? (
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-sm font-medium text-slate-300">{user.full_name}</span>
                <button
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="btn-danger text-xs py-1.5 px-3"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onOpenAuth();
                  setMobileMenuOpen(false);
                }}
                className="btn-primary w-full justify-center text-sm"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
