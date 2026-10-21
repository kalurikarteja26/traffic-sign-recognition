import React from 'react';
import {
  Shield, Car, FileText, BookOpen, Video, Cpu,
  CheckCircle, ArrowRight, AlertTriangle, Eye, Lock, Sparkles
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: () => void;
  onExploreRules: () => void;
  onExploreAI: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onExploreRules,
  onExploreAI,
}) => {
  const sampleSigns = [
    { id: 0, name: 'Stop Sign', tier: 'CRITICAL', icon: '🛑', action: 'Bring vehicle to complete halt before the line.' },
    { id: 1, name: 'Give Way', tier: 'CRITICAL', icon: '⚠️', action: 'Yield right-of-way to main road traffic.' },
    { id: 2, name: 'Speed Limit 50', tier: 'WARNING', icon: '⏱️', action: 'Do not exceed posted speed of 50 km/h.' },
    { id: 43, name: 'Pedestrian Crossing', tier: 'CRITICAL', icon: '🚶', action: 'Decelerate and give way to pedestrians.' },
    { id: 44, name: 'School Ahead', tier: 'WARNING', icon: '🏫', action: 'Reduce speed; expect children crossing.' },
    { id: 87, name: 'Hospital', tier: 'INFORMATIONAL', icon: '🏥', action: 'Medical facility ahead; refrain from honking.' },
  ];

  return (
    <div className="space-y-24 py-8">
      {/* Hero Section */}
      <section className="relative max-w-6xl mx-auto px-4 text-center pt-8 sm:pt-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-telemetry font-bold tracking-wide uppercase mb-6 shadow-sm shadow-blue-500/20">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>Next-Gen Road Safety & Vehicle Intelligence</span>
        </div>

        <h1 className="font-heading font-black text-4xl sm:text-6xl lg:text-7xl tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Intelligent Road Safety for Every Indian Vehicle Owner
        </h1>

        <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
          A unified AI-powered platform connecting <span className="text-blue-400 font-medium">Vehicle Garages</span>,{' '}
          <span className="text-amber-400 font-medium">Traffic Challans</span>,{' '}
          <span className="text-emerald-400 font-medium">RTO Education</span>, and{' '}
          <span className="text-purple-400 font-medium">Dashcam Video Intelligence</span>.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onOpenAuth}
            className="btn-primary text-base px-8 py-3.5 shadow-lg shadow-blue-600/30"
          >
            <span>Launch AeroVision Platform</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={onExploreRules}
            className="btn-secondary text-base px-6 py-3.5"
          >
            <BookOpen className="w-5 h-5 text-blue-400" />
            <span>Explore 108 RTO Signs</span>
          </button>
          <button
            onClick={onExploreAI}
            className="btn-secondary text-base px-6 py-3.5 border-purple-500/30 text-purple-300 hover:text-white"
          >
            <Cpu className="w-5 h-5 text-purple-400" />
            <span>Test AI Studio</span>
          </button>
        </div>

        {/* Metrics Bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="titanium-card p-4 text-center">
            <div className="font-telemetry text-3xl font-extrabold text-blue-400">108</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Official Indian RTO Signs</div>
          </div>
          <div className="titanium-card p-4 text-center">
            <div className="font-telemetry text-3xl font-extrabold text-emerald-400">4-Agent</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Safety Arbitration</div>
          </div>
          <div className="titanium-card p-4 text-center">
            <div className="font-telemetry text-3xl font-extrabold text-amber-400">100%</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Private Dashcam Vault</div>
          </div>
          <div className="titanium-card p-4 text-center">
            <div className="font-telemetry text-3xl font-extrabold text-purple-400">11.8ms</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Deep Neural Inference</div>
          </div>
        </div>
      </section>

      {/* Five Core Modules Grid */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-white">
            Comprehensive Vehicle Intelligence Suite
          </h2>
          <p className="text-slate-400 mt-2 max-w-2xl mx-auto text-sm sm:text-base">
            Engineered to elevate safety compliance from reactive fines to proactive driving awareness.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Garage */}
          <div className="titanium-panel p-6 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-4">
                <Car className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-xl text-white">01. Vehicle Garage</h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Register family cars, two-wheelers, EVs, or commercial vehicles. Track registration numbers, PUC and insurance expiry, and linked compliance records.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-xs font-telemetry text-blue-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Multi-Vehicle Support
            </div>
          </div>

          {/* Card 2: Challans */}
          <div className="titanium-panel p-6 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-xl text-white">02. Challan & Violation Center</h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Organize pending, paid, and disputed traffic challans. Upload official notices, track fine amounts, and access direct official Parivahan payment links.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-xs font-telemetry text-amber-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Transparent Parivahan Links
            </div>
          </div>

          {/* Card 3: Rules & Quizzes */}
          <div className="titanium-panel p-6 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-xl text-white">03. Traffic Rules & Quizzes</h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Complete interactive guide to 108 Indian RTO signs, statutory Motor Vehicles Act penalties, Mistake Awareness tutorials, and scored quizzes.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-xs font-telemetry text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Mistake Awareness Center
            </div>
          </div>

          {/* Card 4: Dashcam Vault */}
          <div className="titanium-panel p-6 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-4">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-xl text-white">04. Dashcam Cloud Vault</h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Privately store and review recordings from your dashcam. Integrated video player, custom bookmarks, event notes, and user storage quota control.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-xs font-telemetry text-purple-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Zero Unauthorized Access
            </div>
          </div>

          {/* Card 5: AI Perception */}
          <div className="titanium-panel p-6 flex flex-col justify-between md:col-span-2">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-4">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-xl text-white">05. AI Video Road-Safety Perception</h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                The technical core: Ingests uploaded dashcam footage, samples video frames, runs deep residual vision inference across 108 Indian RTO signs, and generates timestamped safety events with localized bounding box snapshots.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-xs font-telemetry text-blue-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Real-Time HUD & Test-Time Augmentation
            </div>
          </div>
        </div>
      </section>

      {/* RTO Sign Library Teaser */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="titanium-panel p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-heading font-bold text-2xl text-white">108 Official Indian RTO Signs Reference</h2>
              <p className="text-xs sm:text-sm text-slate-400">Integrated statutory safety directives under the Motor Vehicles Act, 1988</p>
            </div>
            <button
              onClick={onExploreRules}
              className="btn-secondary text-xs sm:text-sm"
            >
              <span>View All 108 Signs</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {sampleSigns.map((s) => (
              <div key={s.id} className="titanium-card p-4 flex items-start gap-3">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-semibold text-sm text-white">{s.name}</span>
                    <span className={`text-[10px] font-telemetry font-bold px-1.5 py-0.5 rounded ${
                      s.tier === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                      s.tier === 'WARNING' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {s.tier}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency & Ethical Disclaimer */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="titanium-card p-6 border-blue-500/30 bg-blue-950/20 text-xs sm:text-sm text-slate-300 flex items-start gap-4">
          <Shield className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-heading font-bold text-white text-base">Ethical Engineering & Platform Transparency</h4>
            <p className="leading-relaxed">
              AeroVision is an educational and intelligent driver-assistance system. It assists vehicle owners in understanding road signs, avoiding dangerous habits, and reviewing dashcam footage. Detections do not constitute legal proof of traffic violations or replace human driver vigilance. Challan management supports manual entry and verified document uploads with direct links to official state Parivahan portals.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-white">AeroVision Platform</span>
            <span>•</span>
            <span>B.Tech CSM (AI & ML) Capstone Project</span>
          </div>
          <div className="font-telemetry text-[11px] text-slate-500">
            Powered by PyTorch 2.14 • 108 Indian RTO Classes • FastAPI • React
          </div>
        </div>
      </footer>
    </div>
  );
};
