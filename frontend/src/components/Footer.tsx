import React from 'react';
import { Shield, Phone, Mail, ExternalLink, ArrowUp, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: string) => void;
  user?: any;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, user }) => {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full border-t border-white/10 bg-[#070e1c]/90 backdrop-blur-xl text-slate-400 text-xs mt-16 pt-12 pb-24 lg:pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-white/10">
          {/* Column 1: Brand & Emergency Helplines */}
          <div className="space-y-4">
            <div
              onClick={() => {
                onNavigate(user ? 'overview' : 'landing');
                scrollToTop();
              }}
              className="flex items-center gap-2.5 cursor-pointer group w-fit"
              title="Return to AeroVision Home"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.3)] group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#070B14] rounded-[9px] flex items-center justify-center text-cyan-400">
                  <span className="material-symbols-outlined text-xl">shield</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-black text-lg text-white group-hover:text-cyan-400 transition-colors tracking-tight">
                  AeroVision
                </span>
                <span className="font-telemetry-sm text-[10px] text-slate-400">
                  AVIONICS COCKPIT v2.4
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Unified road safety intelligence connecting vehicle telemetry, 108 Indian RTO sign perception, e-Challan dispute verification, and private dashcam cloud vault.
            </p>

            {/* Clickable Emergency Helplines (Item 18) */}
            <div className="pt-2">
              <span className="font-telemetry-sm text-[10px] uppercase font-bold text-amber-400 tracking-wider block mb-2">
                24/7 Roadside Emergency Helplines
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                <a
                  href="tel:112"
                  className="px-2.5 py-1 rounded bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-colors flex items-center gap-1.5 font-mono font-bold"
                  title="National Emergency Number"
                >
                  <Phone className="w-3 h-3 text-red-400" />
                  <span>112 (National)</span>
                </a>
                <a
                  href="tel:1033"
                  className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5 font-mono font-bold"
                  title="National Highway Roadside Helpline"
                >
                  <Phone className="w-3 h-3 text-amber-400" />
                  <span>1033 (NHAI)</span>
                </a>
                <a
                  href="tel:1095"
                  className="px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 transition-colors flex items-center gap-1.5 font-mono font-bold"
                  title="Traffic Police Helpline"
                >
                  <Phone className="w-3 h-3 text-blue-400" />
                  <span>1095 (Traffic)</span>
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Cockpit Telemetry Navigation (Item 2 & 7) */}
          <div className="space-y-3">
            <h3 className="font-heading font-bold text-white text-sm uppercase tracking-wider">
              Cockpit Avionics
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => {
                    onNavigate('overview');
                    scrollToTop();
                  }}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-left"
                >
                  <span className="material-symbols-outlined text-[14px] text-cyan-400">grid_view</span>
                  <span>Cockpit Telemetry Overview</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigate('vehicles');
                    scrollToTop();
                  }}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-left"
                >
                  <span className="material-symbols-outlined text-[14px] text-cyan-400">directions_car</span>
                  <span>Vehicle Garage & CAN Fleet</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigate('challans');
                    scrollToTop();
                  }}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-left"
                >
                  <span className="material-symbols-outlined text-[14px] text-amber-400">receipt_long</span>
                  <span>Challan Centre & Evidence Dispute</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigate('academy');
                    scrollToTop();
                  }}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-left"
                >
                  <span className="material-symbols-outlined text-[14px] text-purple-400">school</span>
                  <span>108 Traffic Rules Academy</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigate('nav-alerts');
                    scrollToTop();
                  }}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-left"
                >
                  <span className="material-symbols-outlined text-[14px] text-emerald-400">navigation</span>
                  <span>Live Nav & Voice Alert Avionics</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigate('vault');
                    scrollToTop();
                  }}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-left"
                >
                  <span className="material-symbols-outlined text-[14px] text-blue-400">videocam</span>
                  <span>Dashcam Cloud Vault</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigate('ai-studio');
                    scrollToTop();
                  }}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-left"
                >
                  <span className="material-symbols-outlined text-[14px] text-cyan-400">smart_toy</span>
                  <span>AI Road Intelligence Perception</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Statutory Indian Portals (Item 2 & 7) */}
          <div className="space-y-3">
            <h3 className="font-heading font-bold text-white text-sm uppercase tracking-wider">
              Official Indian Portals
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://morth.nic.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>MoRTH (Govt of India)</span>
                </a>
              </li>
              <li>
                <a
                  href="https://parivahan.gov.in/parivahan/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Parivahan Sewa National Portal</span>
                </a>
              </li>
              <li>
                <a
                  href="https://echallan.parivahan.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>eChallan Parivahan Online Pay</span>
                </a>
              </li>
              <li>
                <a
                  href="https://vahan.parivahan.gov.in/puc/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Vahan PUC Pollution Check</span>
                </a>
              </li>
              <li>
                <a
                  href="https://irc.nic.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>IRC:67-2012 Road Sign Standards</span>
                </a>
              </li>
              <li>
                <a
                  href="https://delhitrafficpolice.nic.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Delhi & State Traffic Police</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Grievance Desk (Item 18 & 19) */}
          <div className="space-y-3">
            <h3 className="font-heading font-bold text-white text-sm uppercase tracking-wider">
              Cockpit Tech & Grievance
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Have questions regarding e-Challan dispute verification, dashcam telemetry export, or API telemetry integrations?
            </p>

            <div className="space-y-2.5 pt-1">
              {/* Clickable Phone Number (Item 18) */}
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Cockpit Toll-Free</span>
                  <a
                    href="tel:+9118002081033"
                    className="text-xs font-mono font-bold text-white hover:text-cyan-400 transition-colors"
                  >
                    +91 1800-208-1033
                  </a>
                </div>
              </div>

              {/* Clickable Support Email (Item 19) */}
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Technical Support</span>
                  <a
                    href="mailto:support@aerovision.in"
                    className="text-xs font-mono text-cyan-300 hover:text-white transition-colors"
                  >
                    support@aerovision.in
                  </a>
                </div>
              </div>

              {/* Clickable Dispute Email (Item 19) */}
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">e-Challan Dispute Desk</span>
                  <a
                    href="mailto:disputes@aerovision-cockpit.io"
                    className="text-xs font-mono text-amber-300 hover:text-white transition-colors"
                  >
                    disputes@aerovision-cockpit.io
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright (Item 9) & Status */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
            {/* Dynamic Copyright Year (Item 9) */}
            <span className="text-white font-medium">
              © {currentYear} AeroVision Intelligent Road Safety Platform.
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="text-slate-400">
              B.Tech CSM (AI & ML) Capstone Project
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> ISO 26262 ASIL-B & IRC:67 Compliant
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={scrollToTop}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono"
              title="Scroll to Top"
            >
              <span>TOP</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
