import React, { useEffect, useState } from 'react';
import { api } from '../api';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  user?: any;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, user: propUser }) => {
  const [summary, setSummary] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashData, vehData] = await Promise.all([
        api.getDashboardSummary().catch(() => null),
        api.getVehicles().catch(() => []),
      ]);
      setSummary(dashData);
      setVehicles(vehData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load cockpit telemetry.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-telemetry-sm text-xs text-slate-400 tracking-wider">
            SYNCHRONIZING AEROVISION COCKPIT TELEMETRY...
          </p>
        </div>
      </div>
    );
  }

  // Fallback defaults if backend is still initializing
  const user = propUser || summary?.user || { full_name: 'Pilot Vikramaditya', email: 'driver@aerovision.ai' };
  const safetyScore = summary?.safety_score ?? 88;
  const vehiclesCount = summary?.vehicles_count ?? (vehicles.length || 3);
  const pendingChallansCount = summary?.pending_challans_count ?? 1;
  const pendingAmount = summary?.pending_challans_amount ?? 1000;
  const storageUsed = summary?.storage_used_bytes ?? 153325000000;
  const storageQuota = summary?.storage_quota_bytes ?? 536870912000;
  const storageGB = (storageUsed / 1e9).toFixed(1);
  const quotaGB = (storageQuota / 1e9).toFixed(0);
  const storagePct = Math.round((storageUsed / storageQuota) * 100);

  const activeVehicle = vehicles[selectedVehicleIndex] || {
    registration_number: 'DL-01-AB-4092',
    make: 'Tata',
    model: 'Nexon EV Max',
    variant: 'Empowered Fleet Variant • Obsidian Black',
    status: 'ACTIVE',
    fastag_balance: 1450.0,
    speed: 74,
    battery: 94,
    range: 348,
    last_location: 'Gurugram Expressway',
    ping: '42 min ago',
  };

  return (
    <div className="flex flex-col w-full gap-6 relative text-on-surface">
      {/* Ambient cockpit illumination orbs */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-cyan-400/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Operational Greeting & Live HUD Synoptic Strip */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 text-cyan-400 font-telemetry-sm text-[11px] border border-cyan-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
              NODE NCR-DELHI-04 // SYNCED
            </span>
            {user?.role === 'admin' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-telemetry-sm text-[11px] border border-purple-500/30 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                PLATFORM ADMINISTRATOR // FLEET OVERVIEW
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-telemetry-sm text-[11px] border border-blue-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                ACTIVE PILOT COCKPIT
              </span>
            )}
            <span className="text-slate-400 font-telemetry-sm text-[11px]">
              GNSS LOCK: 3D RTK ±2cm
            </span>
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight">
            Good morning,{' '}
            <span className="bg-gradient-to-r from-white via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {user.full_name}
            </span>
          </h1>
          <p className="font-body-md text-sm text-slate-400 max-w-2xl">
            {user?.role === 'admin'
              ? 'Platform governance, global fleet telemetry, and system diagnostics at a glance.'
              : 'Your vehicles, compliance, and road-safety telemetry active at a glance.'}
          </p>
        </div>

        {/* Quick Pilot & Admin Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {user?.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 font-body-sm text-xs font-semibold border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-sm text-purple-300">security</span>
              <span>Open Admin Ops</span>
            </button>
          )}
          <button
            onClick={() => fetchDashboardData()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#162B4D]/75 hover:bg-[#1E3A66] text-white font-body-sm text-xs border border-white/10 shadow-md transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm text-cyan-400">sync</span>
            <span>Force Sync Hub</span>
          </button>
          <button
            onClick={() => onNavigate('ai-studio')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-body-sm text-xs font-semibold shadow-[0_0_20px_rgba(77,142,255,0.4)] hover:brightness-110 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">videocam</span>
            <span>Stream Active Fleet</span>
          </button>
        </div>
      </section>

      {/* Level 2: Top Telemetry Glass Metrics (4-Column Bento Bar) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Metric 1: Registered Vehicles */}
        <div
          onClick={() => onNavigate('vehicles')}
          className="relative overflow-hidden rounded-xl bg-[#10203B]/70 hover:bg-[#162B4D]/80 border border-white/10 p-5 flex flex-col justify-between shadow-xl cursor-pointer group transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-telemetry-sm text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Fleet Registry
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-telemetry-sm text-[10px] flex items-center gap-1 border border-emerald-500/30">
              <span className="material-symbols-outlined text-[13px]">verified_user</span> All Insured
            </span>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="font-display-lg text-4xl leading-tight text-white font-bold tracking-tight">
                {String(vehiclesCount).padStart(2, '0')}
              </span>
              <span className="font-headline-md text-cyan-400 text-sm font-semibold">
                Active
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined">directions_car</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-slate-400 font-telemetry-sm text-[11px] pt-1 border-t border-white/5">
            <span>{vehiclesCount} Registered</span>
            <span className="text-emerald-400">{vehiclesCount}/{vehiclesCount} Online</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
        </div>

        {/* Metric 2: Pending Challans */}
        <div
          onClick={() => onNavigate('challans')}
          className="relative overflow-hidden rounded-xl bg-[#10203B]/70 hover:bg-[#162B4D]/80 border border-white/10 p-5 flex flex-col justify-between shadow-xl cursor-pointer group transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-telemetry-sm text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              e-Challan Radar
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-telemetry-sm text-[10px] animate-pulse flex items-center gap-1 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Action Required
            </span>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="font-display-lg text-4xl leading-tight text-amber-400 font-bold tracking-tight">
                {String(pendingChallansCount).padStart(2, '0')}
              </span>
              <span className="font-headline-md text-white text-sm font-semibold">
                Notice
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined">receipt_long</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-slate-400 font-telemetry-sm text-[11px] pt-1 border-t border-white/5">
            <span className="text-white font-telemetry-md">₹{pendingAmount.toLocaleString()} Pending</span>
            <span className="text-red-400">Camera Notice</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent"></div>
        </div>

        {/* Metric 3: Dashcam Storage Usage */}
        <div
          onClick={() => onNavigate('vault')}
          className="relative overflow-hidden rounded-xl bg-[#10203B]/70 hover:bg-[#162B4D]/80 border border-white/10 p-5 flex flex-col justify-between shadow-xl cursor-pointer group transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-telemetry-sm text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Vault Storage
            </span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-telemetry-sm text-[10px] border border-cyan-500/30">
              Auto-sync Online
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline justify-between">
              <div className="font-telemetry-lg text-white font-semibold">
                {storageGB} <span className="text-slate-400 text-xs font-normal">/ {quotaGB} GB</span>
              </div>
              <span className="font-telemetry-md text-xs text-cyan-400 font-bold">
                {storagePct}%
              </span>
            </div>
            {/* Segmented Glass Visual Storage Meter */}
            <div className="grid grid-cols-10 gap-1 mt-2 h-2 w-full">
              {[...Array(10)].map((_, i) => {
                const filled = i < Math.ceil(storagePct / 10);
                return (
                  <div
                    key={i}
                    className={`rounded-sm transition-all ${
                      filled
                        ? 'bg-cyan-400 shadow-[0_0_6px_#22D3EE]'
                        : 'bg-slate-800'
                    }`}
                  ></div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between text-slate-400 font-telemetry-sm text-[11px] pt-1 border-t border-white/5">
            <span>Cloud Retention: 60 Days</span>
            <span className="text-white">{(storageQuota / 1e9 - storageUsed / 1e9).toFixed(1)} GB Free</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
        </div>

        {/* Metric 4: Vision Engine (Edge) */}
        <div
          onClick={() => onNavigate('ai-studio')}
          className="relative overflow-hidden rounded-xl bg-[#10203B]/70 hover:bg-[#162B4D]/80 border border-white/10 p-5 flex flex-col justify-between shadow-xl cursor-pointer group transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-telemetry-sm text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Vision Engine (Edge)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-telemetry-sm text-[10px] border border-blue-500/30">
              PyTorch 108-Class
            </span>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="font-display-lg text-4xl leading-tight text-white font-bold tracking-tight">
                98.8%
              </span>
              <span className="font-headline-md text-emerald-400 text-sm font-semibold">
                Accuracy
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined">smart_toy</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-slate-400 font-telemetry-sm text-[11px] pt-1 border-t border-white/5">
            <span>108 Indian RTO Signs</span>
            <span className="text-emerald-400">11.8ms Latency</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
        </div>
      </section>

      {/* Main Asymmetric Operations Floor: 8-Col Telemetry vs 4-Col In-Cab Deck */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: 8 Columns Fluid Telemetry Deck */}
        <div className="xl:col-span-8 flex flex-col gap-6 min-w-0">
          {/* Featured Vehicle Fleet Status Card */}
          <div className="rounded-xl bg-[#10203B]/70 border border-white/10 backdrop-blur-xl p-6 relative overflow-hidden shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#10B981]"></span>
                <div>
                  <h2 className="font-heading font-bold text-lg text-white">
                    Primary Vehicle Live Cockpit
                  </h2>
                  <p className="font-telemetry-sm text-xs text-slate-400">
                    Telemetry stream #AV-NODE-NEXON-01
                  </p>
                </div>
              </div>

              {/* Vehicle Selector Filter Tabs */}
              <div className="flex items-center p-1 rounded-lg bg-[#070e1c] gap-1 overflow-x-auto max-w-full">
                {vehicles.length > 0 ? (
                  vehicles.map((v, idx) => (
                    <button
                      key={v.id || idx}
                      onClick={() => setSelectedVehicleIndex(idx)}
                      className={`px-3 py-1 rounded text-xs font-mono transition-all whitespace-nowrap ${
                        selectedVehicleIndex === idx
                          ? 'bg-[#162B4D] text-cyan-400 font-semibold shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {v.registration_number}
                    </button>
                  ))
                ) : (
                  <>
                    <button className="px-3 py-1 rounded bg-[#162B4D] text-cyan-400 font-mono text-xs font-semibold shadow-sm">
                      DL-01-AB-4092
                    </button>
                    <button className="px-3 py-1 rounded text-slate-400 hover:text-white font-mono text-xs">
                      HR-26-DQ-1102
                    </button>
                    <button className="px-3 py-1 rounded text-slate-400 hover:text-white font-mono text-xs">
                      TS-09-EA-8842
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Vehicle Hero Diagnostic Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4">
              {/* Visual Dashcam Viewport with Reticle Targeting */}
              <div className="lg:col-span-7 relative rounded-lg overflow-hidden bg-[#070e1c] group border border-white/10">
                <img
                  className="w-full h-56 lg:h-64 object-cover opacity-85 group-hover:opacity-95 group-hover:scale-105 transition-all duration-700"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDjbUwffWWXEFG9gvGkS5sJQZkyuDZtJ9MjKpkKTityOvEZqKKqj4pggo7lLr9OMH4PWkMWy-WPw1hUW97z4pG9DgCKy2Y1yow41J2-AEfdY1APvgh8qAjdm0FhFU3DyzSau0CMzNPYhwiwhs1te8o0vb-cGD_wNVflE-M_7CG-qppPAd_P3rlc2-rQjUl5HEF5A_oDRQtvCMK9h6wvKDKNLoYtOfYJTR_TrNl5JWbGJueWfFPCgPUYA"
                  alt="AeroVision Live Cockpit HUD"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070B14] via-transparent to-transparent"></div>

                {/* Dynamic HUD Overlay reticles */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#070e1c]/80 backdrop-blur-md text-red-400 font-telemetry-sm text-[10px] flex items-center gap-1 border border-red-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span> REC [4K 60FPS]
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#070e1c]/80 backdrop-blur-md text-cyan-400 font-telemetry-sm text-[10px] border border-cyan-500/30">
                    FOV: 160° HDR
                  </span>
                </div>

                {/* AI Bounding Box Reticle */}
                <div className="absolute top-1/3 left-1/3 w-32 h-20 pointer-events-none">
                  <div className="w-full h-full border-2 border-cyan-400/80 rounded relative shadow-[0_0_12px_rgba(34,211,238,0.5)]">
                    <span className="absolute -top-5 left-0 bg-cyan-400 text-slate-950 font-mono text-[9px] px-1 font-bold">
                      SPEED_LIMIT_50 // 98.6%
                    </span>
                    <span className="absolute -bottom-4 right-0 text-[9px] font-mono text-cyan-400 bg-slate-950/90 px-1 border border-cyan-500/30">
                      DIST: 24.2m
                    </span>
                  </div>
                </div>

                {/* Bottom telemetry bar in camera */}
                <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-white font-telemetry-sm text-[11px] bg-[#070e1c]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                  <span className="flex items-center gap-1 text-cyan-400">
                    <span className="material-symbols-outlined text-[14px]">speed</span> 74 KM/H
                  </span>
                  <span className="text-slate-300">G: 0.12 X / 0.04 Y</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">wifi_tethering</span> 11.8ms LATENCY
                  </span>
                </div>
              </div>

              {/* Vehicle Metric Specs */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-3 bg-[#070e1c]/60 rounded-lg p-4 border border-white/5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-base text-white">
                      {activeVehicle.make} {activeVehicle.model}
                    </span>
                    <span className="font-mono text-xs text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {activeVehicle.registration_number}
                    </span>
                  </div>
                  <p className="font-telemetry-sm text-xs text-slate-400 mt-1">
                    {activeVehicle.variant || 'Empowered Fleet Variant • Obsidian Black'}
                  </p>
                </div>

                {/* Battery & State of Charge */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-baseline font-telemetry-sm text-xs">
                    <span className="text-slate-300 flex items-center gap-1">
                      <span className="material-symbols-outlined text-emerald-400 text-[16px]">battery_charging_full</span>
                      Battery State
                    </span>
                    <span className="font-mono text-xs text-emerald-400 font-semibold">
                      94% • 348 km est.
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full w-[94%] shadow-[0_0_8px_#10B981]"></div>
                  </div>
                </div>

                {/* Dual Dashcam Hardware State */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col gap-0.5">
                    <span className="font-telemetry-sm text-[10px] text-slate-400">Front Optical</span>
                    <span className="font-mono text-xs text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 4K Dual Pro
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col gap-0.5">
                    <span className="font-telemetry-sm text-[10px] text-slate-400">Cabin Camera</span>
                    <span className="font-mono text-xs text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Infrared IR
                    </span>
                  </div>
                </div>

                {/* Last Trip Meta */}
                <div className="flex items-center justify-between text-xs text-slate-300 border-t border-white/10 pt-2 font-mono">
                  <span className="flex items-center gap-1 text-slate-300">
                    <span className="material-symbols-outlined text-[15px] text-cyan-400">route</span>
                    Gurugram Expy
                  </span>
                  <span className="text-slate-400">Ping: 42 min ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Challans Quick-View High-Contrast Glass Table */}
          <div className="rounded-xl bg-[#10203B]/70 border border-white/10 backdrop-blur-xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-heading font-bold text-lg text-white">
                  Recent Traffic Challans & Violations
                </h2>
                <p className="font-telemetry-sm text-xs text-slate-400">
                  Synchronized directly with Parivahan National Portal
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('challans')}
                  className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-cyan-400 font-body-sm text-xs transition-colors border border-cyan-500/20"
                >
                  View Full Ledger
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 font-telemetry-sm text-xs uppercase tracking-wider bg-[#070e1c]/80 border-b border-white/10">
                    <th className="py-2.5 px-3 rounded-l-lg">Challan Ref</th>
                    <th className="py-2.5 px-3">Vehicle</th>
                    <th className="py-2.5 px-3">Violation</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right rounded-r-lg">Action</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-xs divide-y divide-white/5">
                  <tr className="hover:bg-white/5 transition-colors bg-cyan-500/5">
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-cyan-400 font-bold">CH-TS-HYD-2026-90412</span>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[9px] font-bold w-fit border border-cyan-500/30">
                          TS • Telangana
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="text-white font-semibold font-mono">TS-09-EA-4020</span>
                        <span className="text-slate-400 text-[10px]">Telangana State Police (Cyberabad)</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 text-white">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        Speed Limit (&gt; 80 km/h ORR Gachibowli)
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">28 Sep 2026 • 11:24 IST</td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">₹1,000</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[10px] border border-amber-500/30">
                        Pending TS eChallan
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onNavigate('challans')}
                        className="px-2.5 py-1 rounded bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-bold text-xs shadow-sm transition-all"
                      >
                        Verify / Dispute
                      </button>
                    </td>
                  </tr>

                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-slate-300 font-medium">CH-DEL-2026-33104</span>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-mono text-[9px] w-fit">
                          DL • Delhi
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="text-white font-semibold font-mono">DL-03-EA-8890</span>
                        <span className="text-slate-400 text-[10px]">Delhi Traffic Police</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 text-white">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        Protective Helmet Sec 194D
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">14 Aug 2026 • 09:12 IST</td>
                    <td className="py-3 px-3 font-mono text-slate-400 line-through">₹1,000</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] border border-emerald-500/30">
                        Paid on Delhi Portal
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onNavigate('challans')}
                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors"
                      >
                        View Archival
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent AI Road Events Stream with Micro-Thumbnails */}
          <div className="rounded-xl bg-[#10203B]/70 border border-white/10 backdrop-blur-xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-lg text-white">
                  Edge AI Road Events Stream
                </h2>
                <p className="font-telemetry-sm text-xs text-slate-400">
                  Real-time object classification and regulatory signage cache
                </p>
              </div>
              <span className="font-telemetry-sm text-xs text-emerald-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">sensors</span> INFERENCE ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Event Card 1 */}
              <div className="rounded-xl bg-[#070e1c]/80 border border-white/5 p-3 flex flex-col gap-2 hover:bg-white/5 transition-all group">
                <div className="relative rounded-lg overflow-hidden h-28 bg-slate-900">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDoAntRgEBL9rFW-rzMO-pMBYxmHXxm0vqXSmUSZao2F6z8AGkb65__7Z9jx4D0E5R-5q7N8iEU2LEcMLejPGS6h3kfffKaYWGYpG0N_UeoejhlacJBb0l6dveaODmOq-VOCyVITwUxHbh944oOtR0kVvCgdzp56YVH8fCw1IjNNekGGW2ooP4INpmtaJb-PrbgZBYAuX5cqGKIcGlHSSgEmtIWZzz6HWBstpIhINnFYjd5wMn7bJ63w"
                    alt="Speed Limit 50 sign"
                  />
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-950/90 font-mono text-[9px] text-cyan-400 font-semibold border border-cyan-500/30">
                    CONF: 99.4%
                  </span>
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-slate-950/90 font-mono text-[9px] text-emerald-400 border border-emerald-500/30">
                    SPEED MATCHED
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-heading text-sm font-semibold text-white">Speed Limit 50 km/h</span>
                  <span className="material-symbols-outlined text-blue-400 text-base">speed</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 font-telemetry-sm text-[11px]">
                  <span>Cyber City Outer Ring</span>
                  <span className="text-cyan-400 font-mono">12:44:02</span>
                </div>
              </div>

              {/* Event Card 2 */}
              <div className="rounded-xl bg-[#070e1c]/80 border border-white/5 p-3 flex flex-col gap-2 hover:bg-white/5 transition-all group">
                <div className="relative rounded-lg overflow-hidden h-28 bg-slate-900">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8Uf6Ii74XZU1JtQ-CIF0mLVqH6SJODFSWasRHwxBySickaL57IJHR-kKaTC1Lo5p9VSQM3r9mE1hkstuCJol4ldBnPaGGX9OQ-TubMdRfBSIjVI3nDNanjOWWWVMNC69P9X1x9fQXkCt5OltWcqXj4-OqSZGWeVrQd3H2v3PmsMLoYdSZio1ALEkmRldP6gbRhiqfEyr8r-MN4mfhNwVzb-h2vV9jD7KM6rP0xE-YnLFKWdxSMQDdNg"
                    alt="No Right Turn sign"
                  />
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-950/90 font-mono text-[9px] text-cyan-400 font-semibold border border-cyan-500/30">
                    CONF: 98.4%
                  </span>
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[9px] font-semibold border border-amber-500/30">
                    RESTRICTION
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-heading text-sm font-semibold text-white">No Right Turn</span>
                  <span className="material-symbols-outlined text-amber-400 text-base">turn_right</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 font-telemetry-sm text-[11px]">
                  <span>NH-48 Service Slip</span>
                  <span className="text-cyan-400 font-mono">11:15:20</span>
                </div>
              </div>

              {/* Event Card 3 */}
              <div className="rounded-xl bg-[#070e1c]/80 border border-white/5 p-3 flex flex-col gap-2 hover:bg-white/5 transition-all group">
                <div className="relative rounded-lg overflow-hidden h-28 bg-slate-900">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1vtBBrpAAW3ID5MQzdR_BxernN9IZdlGZKQN8CFn-ADeByPjNZwWrYdUfRLYLwTaNSKMsCKO3E3rTzAKH6XMYaiFcsVFKyfSJ-B5znHuWQDzukzNIQmzOpSFk69cs1J8guLzpNrCrABpqy1_7v6HfWlSi5JehWnUGlh3V3ppBzkO3ExqikKQwFf62H9rMkoBfKu2ThS34s6R900B8PNI8CyKEeqf4lBFt7BZCO7qtSDxiniaZY7vvSA"
                    alt="School Zone Ahead sign"
                  />
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-950/90 font-mono text-[9px] text-cyan-400 font-semibold border border-cyan-500/30">
                    CONF: 97.9%
                  </span>
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[9px] font-semibold border border-blue-500/30">
                    SLOW ADVISORY
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-heading text-sm font-semibold text-white">School Zone Ahead</span>
                  <span className="material-symbols-outlined text-blue-400 text-base">school</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 font-telemetry-sm text-[11px]">
                  <span>Sector 29 Roadway</span>
                  <span className="text-cyan-400 font-mono">09:02:44</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 4 Columns In-Cab Assistant & Compliance Sidecar */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* Featured ADAS Card: Live Navigation & Voice Alert Cockpit */}
          <div
            onClick={() => onNavigate('nav-alerts')}
            className="rounded-xl bg-gradient-to-br from-[#10203B]/90 via-[#071328]/95 to-[#0b1c38]/90 border border-cyan-500/30 p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden cursor-pointer group hover:border-cyan-400/50 transition-all"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-xl">navigation</span>
                <h3 className="font-heading font-bold text-base text-white">Live Nav & Voice Alerts</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-semibold border border-cyan-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                ACTIVE ADAS
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Location-aware corridor navigation with advance voice warnings (500m/200m/100m) for verified Indian RTO signs & speed limits.
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-white/10 font-mono text-xs">
              <span className="text-slate-400">Google Maps Platform</span>
              <span className="text-cyan-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-semibold">
                Launch Cockpit →
              </span>
            </div>
          </div>

          {/* 1. Traffic-Rule Learning Progress Card (Gamified Radial Meter) */}
          <div className="rounded-xl bg-[#10203B]/70 border border-white/10 backdrop-blur-xl p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400">school</span>
                <h3 className="font-heading font-bold text-base text-white">Traffic Academy</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-semibold border border-purple-500/30">
                LEVEL 03
              </span>
            </div>

            <div className="flex items-center gap-4 py-1">
              {/* Radial Progress SVG */}
              <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    className="text-slate-800"
                    cx="50"
                    cy="50"
                    fill="none"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                  ></circle>
                  <circle
                    className="text-purple-400"
                    cx="50"
                    cy="50"
                    fill="none"
                    r="40"
                    stroke="currentColor"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - safetyScore / 100)}
                    strokeLinecap="round"
                    strokeWidth="8"
                  ></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-heading text-2xl text-white font-bold leading-none">
                    {safetyScore}%
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 mt-0.5">PASS SCORE</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-heading text-base text-white font-semibold truncate">
                  Road Compliance Pro
                </span>
                <p className="text-xs text-slate-400 line-clamp-2">
                  Next Module: Lane Discipline & High-Speed Expressway Protocols
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-[#070e1c]/80 border border-white/5 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400">Weekly Assessment:</span>
                <span className="text-emerald-400 font-semibold">4 / 5 Complete</span>
              </div>
              <button
                onClick={() => onNavigate('academy')}
                className="w-full py-2 rounded-lg bg-[#162B4D] hover:bg-purple-600 hover:text-white text-purple-300 font-medium text-xs transition-all text-center border border-purple-500/20"
              >
                Launch Expressway Safety Quiz
              </button>
            </div>
          </div>

          {/* 2. Dashcam Vault Quick Feed */}
          <div className="rounded-xl bg-[#10203B]/70 border border-white/10 backdrop-blur-xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400">video_library</span>
                <h3 className="font-heading font-bold text-base text-white">Vault Latest Feed</h3>
              </div>
              <button
                onClick={() => onNavigate('vault')}
                className="font-mono text-xs text-cyan-400 hover:underline"
              >
                Explore All ({summary?.videos_count ?? 48})
              </button>
            </div>

            {/* Latest Recording Media Block */}
            <div className="rounded-lg bg-[#070e1c]/80 border border-white/5 overflow-hidden flex flex-col group">
              <div className="relative h-36 bg-slate-900 overflow-hidden">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAD7fw3igYKa3OtfB7lr9H0UbYSAlbo9va440OtZTTtDKrUdbhcuL95aXB7FiePQGPq_Tu7qTVHrgRpSegMrdvsZEXWRBE40GgeqOMyu_i4S9JQ7xFXP8seOKDH-e8VwmtE9x7AVVIO-MXstwiaLVgQXbnhm12hFtC8waI8KqzJmDaCC1LRoSTgikAu6kKuIwCZMG4_e_MkvtQXeTNJIOMhv7a4x0MkW-PX4RWTtjcBD3JRVBo4kJvzFg"
                  alt="Dashcam preview"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070e1c] via-transparent to-transparent"></div>
                <button
                  onClick={() => onNavigate('vault')}
                  className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.6)] group-hover:scale-110 transition-transform"
                >
                  <span className="material-symbols-outlined text-2xl pl-0.5">play_arrow</span>
                </button>
                <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-slate-950/90 font-mono text-[9px] text-white">
                  24:18 MIN • 1.84 GB
                </span>
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[9px] font-semibold border border-emerald-500/30">
                  AI ANALYZED
                </span>
              </div>
              <div className="p-3 flex flex-col gap-1">
                <span className="font-mono text-xs text-white font-semibold truncate">
                  Trip_NCR_ORR_Front_1080p.mp4
                </span>
                <div className="flex items-center justify-between text-slate-400 font-telemetry-sm text-[11px]">
                  <span className="flex items-center gap-1 text-cyan-400">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                    18 Detected Road Events
                  </span>
                  <span>18 Feb • 08:30 IST</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 px-1 font-mono">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-emerald-400 text-base">lock</span>
                Encrypted Vault (SHA-256)
              </span>
              <button
                onClick={() => onNavigate('vault')}
                className="text-blue-400 hover:text-cyan-400 transition-colors"
              >
                Open Vault
              </button>
            </div>
          </div>

          {/* 3. Compliance & Upcoming Reminders Card */}
          <div className="rounded-xl bg-[#10203B]/70 border border-white/10 backdrop-blur-xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">event_upcoming</span>
                <h3 className="font-heading font-bold text-base text-white">Compliance Alerts</h3>
              </div>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Reminder Item 1 */}
              <div className="p-3 rounded-lg bg-[#070e1c]/80 border border-white/5 flex items-start gap-3 hover:bg-white/5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-500/20">
                  <span className="material-symbols-outlined text-base">co2</span>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">PUC Certificate Expiry</span>
                    <span className="font-mono text-[10px] text-amber-400 font-bold">14 DAYS</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Target: <span className="font-mono text-white">HR-26-DQ-1102</span> • Euro 6 / BS-VI
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-cyan-400">Find Nearest Test Center</span>
                  </div>
                </div>
              </div>

              {/* Reminder Item 2 */}
              <div className="p-3 rounded-lg bg-[#070e1c]/80 border border-white/5 flex items-start gap-3 hover:bg-white/5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-500/20">
                  <span className="material-symbols-outlined text-base">security</span>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Zero-Dep Insurance Renewal</span>
                    <span className="font-mono text-[10px] text-blue-400 font-bold">45 DAYS</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Target: <span className="font-mono text-white">DL-01-AB-4092</span> • ICICI Lombard Policy
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-blue-400">Review Quote (-15% Safe Driver)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between font-mono text-[11px] text-slate-400">
              <span>DigiLocker Linked</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check_circle</span> 100% SYNCED
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
