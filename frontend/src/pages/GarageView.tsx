import React, { useEffect, useState } from 'react';
import { api } from '../api';

export const GarageView: React.FC = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'ev' | 'ice' | 'alerts'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New vehicle form state
  const [formData, setFormData] = useState({
    registration_number: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    fuel_type: 'EV',
    color: 'Obsidian Black',
    vehicle_type: '4-Wheeler Car',
    fastag_balance: 1500,
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getVehicles();
      setVehicles(data || []);
    } catch (err: any) {
      console.error('Failed to load vehicles:', err);
      setError(err.message || 'Failed to load vehicle fleet.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createVehicle({
        reg_number: formData.registration_number.toUpperCase().trim(),
        make_model: `${formData.make} ${formData.model}`.trim(),
        nickname: `${formData.make} ${formData.model}`.trim(),
        vehicle_type: formData.vehicle_type || '4-Wheeler Car',
        year: Number(formData.year),
        fuel_type: formData.fuel_type,
        color: formData.color || 'Obsidian Black',
        insurance_expiry: '2027-06-30',
        puc_expiry: '2026-12-31',
      });
      setShowAddModal(false);
      setFormData({
        registration_number: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        fuel_type: 'EV',
        color: 'Obsidian Black',
        vehicle_type: '4-Wheeler Car',
        fastag_balance: 1500,
      });
      await fetchVehicles();
    } catch (err: any) {
      alert(err.message || 'Failed to enrol vehicle node.');
    }
  };

  const normalizeVehicle = (v: any, index: number) => {
    const reg = (v.reg_number || v.registration_number || `KA-0${index + 1}-AV-2024`).toUpperCase();
    const makeModel = v.make_model || (v.make ? `${v.make} ${v.model || ''}`.trim() : 'Tata Nexon EV Max');
    const fuel = (v.fuel_type || 'EV').toUpperCase();
    const isEV = fuel.includes('EV') || fuel.includes('ELECTRIC');
    const pendingChallans = v.pending_challans_count || 0;
    const hasAlert = pendingChallans > 0 || v.status === 'ATTENTION';

    return {
      id: v.id || index + 1,
      reg_number: reg,
      make_model: makeModel,
      nickname: v.nickname || makeModel,
      vehicle_type: v.vehicle_type || '4-Wheeler Car',
      year: v.year || 2024,
      fuel_type: fuel,
      isEV,
      color: v.color || 'Atlas Black',
      insurance_expiry: v.insurance_expiry || '2027-05-10',
      puc_expiry: v.puc_expiry || '2026-12-15',
      pending_challans_count: pendingChallans,
      total_challans_amount: v.total_challans_amount || (pendingChallans * 1000),
      status: hasAlert ? 'ATTENTION' : 'ONLINE',
      battery_soc: isEV ? 88 + (index * 3) % 10 : null,
      range: isEV ? 348 : 520,
      fastag_balance: 1450 - (index * 200),
      vin: `MAT${index + 6}28490PKA0041${index + 2}`,
      location: reg.startsWith('TS')
        ? 'Outer Ring Road (ORR) Gachibowli, Hyderabad'
        : reg.startsWith('DL')
        ? 'Ring Road, Dhaula Kuan, New Delhi'
        : reg.startsWith('MH')
        ? 'Mumbai-Pune Expressway, Khalapur'
        : 'Outer Ring Road, Bellandur, Bengaluru',
      speed: 42 + (index * 9) % 35,
    };
  };

  const normalizedVehicles = vehicles.map(normalizeVehicle);

  const filteredVehicles = normalizedVehicles.filter((v) => {
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch =
      v.reg_number.toLowerCase().includes(q) ||
      v.make_model.toLowerCase().includes(q) ||
      v.nickname.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (activeFilter === 'ev') return v.isEV;
    if (activeFilter === 'ice') return !v.isEV;
    if (activeFilter === 'alerts') return v.status === 'ATTENTION';
    return true;
  });

  return (
    <div className="flex flex-col w-full gap-6 max-w-[1720px] mx-auto text-on-surface">
      {/* Top Command Breadcrumb & Action Banner */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-telemetry-sm text-xs text-slate-400">
            <span>SYSTEM</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span>AEROVISION TERMINAL</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-cyan-400 font-semibold font-mono">FLEET COMMAND CENTER</span>
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight">
            Fleet Telemetry & Diagnostics
          </h1>
          <p className="font-body-md text-sm text-slate-400 max-w-3xl">
            Real-time CAN-bus metrics, cell-level electrochemical health, optical HUD neural link, and RTK sub-centimeter GPS trajectory streaming across active fleet nodes.
          </p>
        </div>

        {/* Action Group */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => alert(`OTA Telemetry Diagnostics Broadcast: All ${normalizedVehicles.length || 4} vehicle nodes ACK (200 OK)`)}
            className="px-3.5 py-2 rounded-lg bg-[#10203B]/80 hover:bg-[#162B4D] text-slate-200 hover:text-cyan-400 transition-all flex items-center gap-2 border border-white/10 shadow-md font-mono text-xs cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-base text-cyan-400">cell_tower</span>
            <span>Broadcast OTA Diagnostics</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-[0_0_16px_rgba(77,142,255,0.4)] hover:brightness-110 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>+ Enrol Vehicle Node</span>
          </button>
        </div>
      </div>

      {/* HUD Telemetry Metrics Strip (Top Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="relative overflow-hidden p-4 rounded-xl bg-[#10203B]/70 border border-white/10 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-telemetry-sm text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Total Fleet Health
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] flex items-center gap-1 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> 98.4%
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-heading text-2xl font-bold text-white">
              {normalizedVehicles.length} Registered
            </span>
            <span className="font-mono text-xs text-emerald-400 font-medium">All Units Online</span>
          </div>
          <div className="mt-2 pt-1 border-t border-white/5 flex items-center justify-between text-slate-400 font-telemetry-sm text-[11px]">
            <span>DTC Fault Zero-State</span>
            <span className="text-emerald-400 font-mono">ISO-14229 Compliant</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="relative overflow-hidden p-4 rounded-xl bg-[#10203B]/70 border border-white/10 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-telemetry-sm text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Fleet Energy Reserves
            </span>
            <span className="material-symbols-outlined text-cyan-400 text-xl">bolt</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-heading text-2xl font-bold text-white">88%</span>
            <span className="font-mono text-xs text-slate-400">Avg Fleet SOC</span>
          </div>
          <div className="mt-2 pt-1 border-t border-white/5 flex items-center justify-between text-slate-400 font-telemetry-sm text-[11px]">
            <span>Fast-Charge Synced</span>
            <span className="text-cyan-400 font-mono">2 Units Active (122 kW)</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="relative overflow-hidden p-4 rounded-xl bg-[#10203B]/70 border border-white/10 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-telemetry-sm text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              RTK GPS Constellation
            </span>
            <span className="material-symbols-outlined text-blue-400 text-xl">satellite_alt</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-heading text-2xl font-bold text-white">18 Sats Locked</span>
          </div>
          <div className="mt-2 pt-1 border-t border-white/5 flex items-center justify-between text-slate-400 font-telemetry-sm text-[11px]">
            <span>Kinematic Deviation</span>
            <span className="text-emerald-400 font-mono">&lt; 1.8 cm fix</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="relative overflow-hidden p-4 rounded-xl bg-[#10203B]/70 border border-white/10 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-telemetry-sm text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Telemetry Ingestion
            </span>
            <span className="material-symbols-outlined text-purple-400 text-xl">sensors</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-heading text-2xl font-bold text-white font-mono">128 pkts/s</span>
          </div>
          <div className="mt-2 pt-1 border-t border-white/5 flex items-center justify-between text-slate-400 font-telemetry-sm text-[11px]">
            <span>Socket Transport</span>
            <span className="text-cyan-400 font-mono">11.8ms latency</span>
          </div>
        </div>
      </div>

      {/* Filter Pills & Terminal Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#10203B]/70 border border-white/10 backdrop-blur-2xl p-3 rounded-xl">
        {/* Filter Segmented Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-[#070e1c] rounded-lg">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Vehicles ({normalizedVehicles.length})
          </button>
          <button
            onClick={() => setActiveFilter('ev')}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'ev'
                ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            EV Fleet ({normalizedVehicles.filter((v) => v.isEV).length})
          </button>
          <button
            onClick={() => setActiveFilter('ice')}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'ice'
                ? 'bg-purple-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ICE Patrol ({normalizedVehicles.filter((v) => !v.isEV).length})
          </button>
          <button
            onClick={() => setActiveFilter('alerts')}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'alerts'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Notices / Alerts ({normalizedVehicles.filter((v) => v.status === 'ATTENTION').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 text-slate-400 text-base pointer-events-none">
            filter_alt
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plate, model, make..."
            className="w-full bg-[#070e1c] text-white placeholder-slate-500 font-mono text-xs pl-9 pr-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-400 transition-all"
          />
        </div>
      </div>

      {/* Loading & Empty States */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-mono text-xs text-slate-400">SYNCING FLEET TELEMETRY NODES...</span>
          </div>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#10203B]/60 border border-white/10 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <span className="material-symbols-outlined text-2xl">directions_car</span>
          </div>
          <div className="font-bold text-white text-base">No Vehicle Nodes Match Filters</div>
          <p className="text-slate-400 text-xs font-mono max-w-sm">
            Try adjusting your search query or powertrain filter, or enrol a new vehicle into the cockpit fleet.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-xs shadow-md"
          >
            + Enrol Vehicle Node
          </button>
        </div>
      ) : (
        /* Vehicles Dynamic Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVehicles.map((v, idx) => {
            const isHero = idx === 0 && filteredVehicles.length > 1;

            if (isHero) {
              return (
                <div
                  key={v.id}
                  className="xl:col-span-2 relative rounded-2xl bg-[#10203B]/70 border border-white/10 backdrop-blur-2xl p-6 flex flex-col justify-between shadow-2xl overflow-hidden group hover:border-cyan-500/40 transition-all"
                >
                  <div className="absolute top-0 left-0 w-2 h-full bg-cyan-400 shadow-[0_0_12px_#22D3EE]"></div>

                  <div className="flex flex-col gap-4 pl-2">
                    {/* Card Header & Badges */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono text-[10px] font-semibold tracking-wider flex items-center gap-1 border border-cyan-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                            TRANSMITTING LIVE
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">NODE #{v.id}</span>
                        </div>
                        <h2 className="font-heading font-black text-xl text-white tracking-tight mt-1">
                          {v.make_model}
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5 font-mono text-xs">
                          <span className="px-2 py-0.5 rounded bg-[#070e1c] text-cyan-400 font-bold border border-cyan-500/20">
                            {v.reg_number}
                          </span>
                          <span className="text-slate-400">VIN: {v.vin}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 font-mono text-[11px] font-semibold flex items-center gap-1 border border-emerald-500/30">
                          <span className="material-symbols-outlined text-[15px]">
                            {v.isEV ? 'ev_station' : 'local_gas_station'}
                          </span>
                          {v.isEV ? '42 kW Fast-Charging' : `${v.fuel_type} Nominal`}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {v.isEV ? 'ETA 100%: 21 min' : 'Tank: 74% Full'}
                        </span>
                      </div>
                    </div>

                    {/* Hero Telemetry Matrix */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-1">
                      {/* Col A */}
                      <div className="p-4 rounded-xl bg-[#070e1c]/80 border border-white/5 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                          <span>{v.isEV ? 'BATTERY PACK' : 'FUEL SYSTEM'}</span>
                          <span className="text-emerald-400 font-bold">SoH 97.2%</span>
                        </div>
                        <div className="my-2 flex items-baseline gap-2">
                          <span className="font-heading text-3xl font-black text-white">
                            {v.isEV ? `${v.battery_soc}%` : '74%'}
                          </span>
                          <span className="font-mono text-xs text-cyan-400 font-semibold">
                            {v.isEV ? `SOC • ${v.range} km range` : `${v.range} km range`}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full shadow-[0_0_8px_#22D3EE]"
                            style={{ width: `${v.isEV ? v.battery_soc : 74}%` }}
                          ></div>
                        </div>
                        <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-400">
                          <span>Pack Temp: 28.4°C</span>
                          <span>Cell ΔV: 0.008V</span>
                        </div>
                      </div>

                      {/* Col B */}
                      <div className="p-4 rounded-xl bg-[#070e1c]/80 border border-white/5 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                          <span>DRIVETRAIN DIAGNOSTICS</span>
                          <span className="text-cyan-400 font-semibold">CAN Nominal</span>
                        </div>
                        <div className="my-1.5 grid grid-cols-2 gap-2 font-mono text-[11px]">
                          <div className="flex flex-col">
                            <span className="text-slate-400 text-[10px]">Inverter Temp</span>
                            <span className="text-white font-semibold">38°C</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-400 text-[10px]">Brake Wear</span>
                            <span className="text-emerald-400 font-semibold">12%</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-400 text-[10px]">Tire Pressure</span>
                            <span className="text-white font-semibold">34 PSI (All)</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-400 text-[10px]">Torque Split</span>
                            <span className="text-white font-semibold">100% FWD</span>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>Zero DTC Codes Active</span>
                        </div>
                      </div>

                      {/* Col C */}
                      <div className="p-4 rounded-xl bg-[#070e1c]/80 border border-white/5 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                          <span>EDGE OPTICAL LINK</span>
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> SYNCED
                          </span>
                        </div>
                        <div className="my-1.5 flex flex-col gap-0.5">
                          <span className="text-xs text-white font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-cyan-400">videocam</span>
                            Dual 4K Starvis II Active
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">VisionNet v3.4 @ 45 FPS Edge</span>
                          <span className="font-mono text-[10px] text-emerald-400">Threat Detection: 0 Warnings</span>
                        </div>
                        <div className="mt-1 pt-1 border-t border-white/5 flex items-center justify-between font-mono text-[10px] text-slate-400">
                          <span>FASTag Balance</span>
                          <span className="text-white font-bold">₹{v.fastag_balance}.00</span>
                        </div>
                      </div>
                    </div>

                    {/* GPS Telemetry Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#070e1c] border border-white/5 font-mono text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-cyan-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">location_on</span>
                          {v.location}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                        <span>Velocity: <strong className="text-white">{v.speed} km/h</strong></span>
                        <span>Heading: <strong className="text-white">142° SE</strong></span>
                        <span className="text-emerald-400 font-bold">RTK Fixed</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // Standard Vehicle Card
            const hasPendingChallan = v.pending_challans_count > 0;
            return (
              <div
                key={v.id}
                className={`relative rounded-2xl bg-[#10203B]/70 border backdrop-blur-2xl p-6 flex flex-col justify-between shadow-xl overflow-hidden group transition-all ${
                  hasPendingChallan ? 'border-amber-500/40 hover:border-amber-500/60' : 'border-white/10 hover:border-cyan-500/40'
                }`}
              >
                <div
                  className={`absolute top-0 right-0 w-2 h-full ${
                    hasPendingChallan ? 'bg-amber-400 shadow-[0_0_12px_#F59E0B]' : 'bg-cyan-400 shadow-[0_0_12px_#22D3EE]'
                  }`}
                ></div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold tracking-wider flex items-center gap-1.5 w-fit border ${
                          hasPendingChallan
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                            hasPendingChallan ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                        ></span>
                        {hasPendingChallan ? `${v.pending_challans_count} NOTICE PENDING` : 'ACTIVE // ALL SYSTEMS NOMINAL'}
                      </span>
                      <h2 className="font-heading font-black text-lg text-white tracking-tight mt-1">
                        {v.make_model}
                      </h2>
                      <div className="flex items-center gap-2 mt-0.5 font-mono text-xs">
                        <span className="px-2 py-0.5 rounded bg-[#070e1c] text-cyan-400 font-bold border border-cyan-500/20">
                          {v.reg_number}
                        </span>
                        <span className="text-slate-400">{v.fuel_type} • {v.year}</span>
                      </div>
                    </div>
                    <span className={`material-symbols-outlined text-2xl ${hasPendingChallan ? 'text-amber-400' : 'text-cyan-400'}`}>
                      {hasPendingChallan ? 'warning' : 'directions_car'}
                    </span>
                  </div>

                  {/* Diagnostic Summary */}
                  <div className="p-3.5 rounded-xl bg-[#070e1c]/80 border border-white/5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-slate-300">Insurance Expiry</span>
                      <span className="text-emerald-400 font-bold">{v.insurance_expiry}</span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-slate-300">PUC Certificate</span>
                      <span className="text-cyan-400 font-bold">{v.puc_expiry}</span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-xs pt-1 border-t border-white/5">
                      <span className="text-slate-400 text-[11px]">FASTag Balance</span>
                      <span className="text-white font-bold">₹{v.fastag_balance}.00</span>
                    </div>
                  </div>

                  {/* Location Strip */}
                  <div className="flex flex-col gap-1 font-mono text-xs text-slate-300 bg-[#070e1c] p-2.5 rounded-lg border border-white/5">
                    <div className="flex items-center gap-1 text-cyan-400">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      <span className="truncate">{v.location}</span>
                    </div>
                    <span className="text-slate-400 text-[11px]">Telemetry Latency: 11.8ms</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-3">
                  <span className="font-mono text-xs text-slate-400">Velocity: {v.speed} km/h</span>
                  <button
                    onClick={() => alert(`Diagnostics telemetry exported for ${v.reg_number} (${v.make_model}). Status: ISO-14229 Nominal.`)}
                    className="px-3 py-1 rounded bg-[#162B4D] hover:bg-white/10 text-cyan-300 text-xs font-mono border border-white/10 cursor-pointer transition-colors"
                  >
                    Export DTC Audit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Enrol Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="titanium-panel p-6 max-w-md w-full shadow-2xl border border-white/10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="font-heading font-bold text-base text-white">Enrol Vehicle Node</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Registration Plate (HSRP)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TS-09-EA-8842"
                  value={formData.registration_number}
                  onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                  className="w-full bg-[#070e1c] border border-white/10 rounded-lg p-2 text-white font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 mb-1 block">Make</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata / Hyundai"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    className="w-full bg-[#070e1c] border border-white/10 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Model</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nexon EV / Harrier"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-[#070e1c] border border-white/10 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 mb-1 block">Powertrain / Fuel</label>
                  <select
                    value={formData.fuel_type}
                    onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                    className="w-full bg-[#070e1c] border border-white/10 rounded-lg p-2 text-white"
                  >
                    <option value="EV">Electric (EV)</option>
                    <option value="PETROL">Petrol (ICE)</option>
                    <option value="DIESEL">Diesel (ICE)</option>
                    <option value="HYBRID">Strong Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Initial FASTag (₹)</label>
                  <input
                    type="number"
                    value={formData.fastag_balance}
                    onChange={(e) => setFormData({ ...formData, fastag_balance: Number(e.target.value) })}
                    className="w-full bg-[#070e1c] border border-white/10 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold cursor-pointer"
                >
                  Enrol Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
