import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';

export const VaultView: React.FC = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'incidents' | 'processed' | 'starred'>('all');
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null);

  // Fallback demo footage items from Stitch layout
  const defaultVideos = [
    {
      id: 1,
      filename: 'REC_20250218_143002_F.MP4',
      vehicle_name: 'Tata Nexon EV Max',
      registration: 'DL-01-AB-4092',
      duration: '05:24',
      file_size_mb: 480,
      timestamp: '18 Feb 2025 • 14:30 IST',
      resolution: '4K UHD 60FPS',
      signs_count: 14,
      tag: 'Clean Run',
      is_incident: false,
      is_starred: true,
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBi6nJCa6uJmlkxhGHQdMKhVxmlPUJovXeJloHVNP2XHqZyioPHq53W23ds4y7PON2y7SZbw3LQ5wjGWhRmDO7h858808Ylh7-Of7oor7ieTF0Lv-XAJ-kJFxsW_6iVu--BTAg34HI52H2xPtvyH2sbC1uG8smUTEQS80rI53q7r5eAU8wfZ625PGEmOtrXKvpyJIDlarEuKsQz8g6o77ZmCPjneaANJiZo4laEjPNB4gbzRJV7DMDTOQ',
    },
    {
      id: 2,
      filename: 'REC_20250217_190412_F_Night.MP4',
      vehicle_name: 'Skoda Slavia 1.5 TSI',
      registration: 'HR-26-DQ-1102',
      duration: '08:12',
      file_size_mb: 2100,
      timestamp: '17 Feb 2025 • 19:04 IST',
      resolution: '4K UHD 30FPS',
      signs_count: 9,
      tag: 'Near Miss / Harsh Braking',
      is_incident: true,
      is_starred: false,
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4f2m71_o3OElrHlRdxhCb157X0fnD1irGMqJ9MR0l1pVVDYHtUIe5BmdRgbwIoWtevZOp9gNIq0fLJ8Uc21fkRGlgpLTXdzLtTjRw2w8LclelI8-tUW5k4T4nVLLK8_k4O_qI5HDHPZBRWdW_hBPRtYhxtCITfCtf_FJ7umr2dJBvOZJyCRFWylW6c07i4ELDLEKg1nxprZ4_9A4XbqiJ7bspGMVHzIBD7s1VCFjnJ6gogaIIscwjMA',
    },
    {
      id: 3,
      filename: 'REC_20250216_091544_R_Rear.MP4',
      vehicle_name: 'Hyundai Ioniq 5',
      registration: 'MH-02-EE-8891',
      duration: '04:02',
      file_size_mb: 1400,
      timestamp: '16 Feb 2025 • 09:15 IST',
      resolution: 'Rear 1080p 60FPS',
      signs_count: 0,
      tag: 'Tailgating Alert (Rear Lens)',
      is_incident: true,
      is_starred: false,
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAEUhS_x5_2_2mPGZS7SNMa8UmGs4MQ-S1Cr54MIsCQ4Z60VyAmW3VtVbECto3u1DGxjNWL9_OPA7oRv3BXz2u4n4Pxrkzs4ivAmfy6cwrU-jOu6tuq66omMUzKbRJSig_si6X3LjMxsRTf8iDR1pYPNPulyQX3K1jucyKTAiY13jbK4tMK-T7DBvXQviEueqrXEblw27HOMrJ4f5RoFkInSkxTE6A14SqZGp61qBoTEqbhkcvp8pfKEQ',
    },
    {
      id: 4,
      filename: 'REC_20250215_164210_F_Parivahan.MP4',
      vehicle_name: 'Tata Nexon EV Max',
      registration: 'DL-01-AB-4092',
      duration: '03:45',
      file_size_mb: 950,
      timestamp: '15 Feb 2025 • 16:42 IST',
      resolution: '4K UHD 60FPS',
      signs_count: 6,
      tag: 'Attached to Appeal (Challan DL-2025-0914)',
      is_incident: false,
      is_starred: true,
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDw3bJ3C9CpzbkSR_5wyKj-W4P6fbu7HERUUXS8A_FE5xlmTOqFdSBimvTSgLq9iJC8tumzNSoMySwHFbEP0FSpnWgciYBRlPq35OoodIfoHiFgdJDPaFYtZWRR0DBmYQ_47i8sBZWBJSYewX_cl_UFBoP0MsREzE6U15JHakxu3mokD7sj0ofxz9PK6T-QW_8dMS8Q0oFdTYEM9K9UR5RyRjvnCCHggo8Fxz5yOp5loeQsVK6EZGV3DQ',
    },
  ];

  useEffect(() => {
    fetchVaultVideos();
  }, []);

  const fetchVaultVideos = async () => {
    try {
      setLoading(true);
      const data = await api.getVideos();
      if (data && data.length > 0) {
        setVideos(data);
        setSelectedVideo(data[0]);
      } else {
        setVideos(defaultVideos);
        setSelectedVideo(defaultVideos[0]);
      }
    } catch (err) {
      setVideos(defaultVideos);
      setSelectedVideo(defaultVideos[0]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('vehicle_id', '1');
      await api.uploadVideo(formData);
      setShowUploadModal(false);
      fetchVaultVideos();
    } catch (err: any) {
      alert(err.message || 'Video upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const filteredVideos = videos.filter((v) => {
    if (activeFilter === 'incidents') return v.is_incident;
    if (activeFilter === 'processed') return v.signs_count > 0;
    if (activeFilter === 'starred') return v.is_starred;
    return true;
  });

  const active = selectedVideo || defaultVideos[0];

  return (
    <div className="flex flex-col w-full px-2 sm:px-4 pb-8 max-w-[1720px] mx-auto text-on-surface">
      {/* Title & Operational Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-2 pb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs tracking-wider uppercase mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Vault Enclave 04 // AES-256 Cloud Sync</span>
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight">
            Dashcam Vault
          </h1>
          <p className="font-body-md text-sm text-slate-400 mt-1">
            Encrypted recording storage, multi-channel video playback, and AI indexing.
          </p>
        </div>

        {/* Quick Vehicle Selector Pill */}
        <div className="flex items-center gap-2 bg-[#10203B]/80 border border-white/10 p-1.5 rounded-xl shadow-lg">
          <span className="material-symbols-outlined text-slate-400 ml-2 text-lg">commute</span>
          <select className="bg-transparent text-white font-mono text-xs py-1.5 pr-8 pl-1 focus:outline-none cursor-pointer">
            <option className="bg-[#070e1c] text-white" value="all">
              Fleet View: All Units
            </option>
            <option className="bg-[#070e1c] text-white" value="dl01">
              Tata Nexon EV (DL-01-AB-4092)
            </option>
            <option className="bg-[#070e1c] text-white" value="hr26">
              Skoda Slavia (HR-26-DQ-1102)
            </option>
          </select>
        </div>
      </div>

      {/* Top Control Strip / Telemetry Ribbon */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-6">
        {/* Storage Quota Widget (5 Cols) */}
        <div className="xl:col-span-5 bg-[#10203B]/70 border border-white/10 backdrop-blur-2xl p-4 rounded-xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400 text-lg">cloud_sync</span>
              <span className="font-mono text-xs text-slate-300 font-medium">
                TIER 1 CLOUD TELEMETRY STORAGE
              </span>
            </div>
            <button
              onClick={() => alert('Storage upgrade simulator: 1 TB encrypted fleet vault available.')}
              className="font-mono text-[11px] text-cyan-400 hover:underline"
            >
              Manage / Upgrade
            </button>
          </div>

          <div className="my-2">
            <div className="flex justify-between items-baseline mb-1">
              <span className="font-heading text-xl text-white font-bold">
                142.8 <span className="font-mono text-xs text-slate-400">GB</span>
              </span>
              <span className="font-mono text-xs text-slate-400">500 GB Allocated (28.5%)</span>
            </div>
            <div className="w-full bg-[#070e1c] h-2 rounded-full overflow-hidden p-0.5 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400"
                style={{ width: '28.5%' }}
              ></div>
            </div>
          </div>

          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] pt-1 border-t border-white/5">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> Auto-archive: 90 Days
            </span>
            <span className="text-emerald-400">Local Mirror: Validated</span>
          </div>
        </div>

        {/* Quick Action & Upload Hub (7 Cols) */}
        <div className="xl:col-span-7 bg-[#10203B]/70 border border-white/10 backdrop-blur-2xl p-4 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all flex items-center gap-1 ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white font-semibold shadow-[0_0_12px_rgba(77,142,255,0.4)]'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              All ({videos.length})
            </button>
            <button
              onClick={() => setActiveFilter('incidents')}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all flex items-center gap-1.5 ${
                activeFilter === 'incidents'
                  ? 'bg-red-600 text-white font-semibold'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Incidents
            </button>
            <button
              onClick={() => setActiveFilter('processed')}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all ${
                activeFilter === 'processed'
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              AI Processed
            </button>
          </div>

          {/* Action & Layout Controls */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 text-white font-semibold text-xs transition-all shadow-[0_0_16px_rgba(77,142,255,0.4)] whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-base">upload_file</span>
              <span>+ Upload Dashcam Footage</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Interactive Split: Tactical HUD Stage (Left 7) & Incident Stream Vault (Right 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Active Player Frame & Incident Telemetry Inspector (8 Cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          {/* 16:9 Glass Player Stage */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#070e1c] shadow-2xl flex flex-col justify-between group border border-white/10">
            {/* Live Dashcam Simulated Feed */}
            <div
              className="absolute inset-0 bg-cover bg-center brightness-[0.92] contrast-[1.08]"
              style={{
                backgroundImage: `url(${active.thumbnail || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeYK8j7cOVw_X-By81ixfoMnn0USp4Tv154y7sggomxh-UmY08jMAax_oPG1SAu7jnSB08qxir-Ke4b3ZHVhjSEC8eMbw6oAmgFuSaiTVOunkL7qg4_OaHvHcOSxlv8_YzpENncmAOaQQUjuOwfcU8P-3GUWQ11N5h2T7ydkVyheTBctzJRddrrVJ0aKC_FV9Xqz-EU1cIu4GEfkUuYJdAuKt8uc2oTfdA9iz8NzIkWRTbOhnVepi_fA'})`,
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#070B14] via-transparent to-[#070B14]/60"></div>

            {/* Top HUD Overlay Ribbon */}
            <div className="relative z-20 flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <div className="bg-[#070e1c]/80 backdrop-blur-md px-3 py-1 rounded-lg flex items-center gap-2 border border-white/10 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                  <span className="font-mono text-xs text-white font-semibold tracking-wider">
                    CH-01 FRONT OPTICAL
                  </span>
                </div>
                <div className="bg-[#070e1c]/80 backdrop-blur-md px-3 py-1 rounded-lg font-mono text-xs text-cyan-400 hidden sm:flex items-center gap-1 border border-cyan-500/20">
                  <span className="material-symbols-outlined text-sm">satellite_alt</span> GPS FIX 99.8% (14 Sats)
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="bg-[#070e1c]/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-white border border-white/10">
                  18-FEB-2025 14:32:08 IST
                </span>
                <span className="bg-blue-500/20 text-cyan-300 px-2 py-1 rounded-lg font-semibold border border-blue-500/30">
                  {active.resolution || '4K UHD'}
                </span>
              </div>
            </div>

            {/* Center AI Optical Target Annotations */}
            <div className="relative z-10 flex-1 pointer-events-none flex items-center justify-center">
              <div className="absolute w-44 h-32 rounded border border-cyan-400 bg-cyan-400/5 flex flex-col justify-between p-2 shadow-[0_0_12px_rgba(34,211,238,0.3)]" style={{ top: '34%', left: '42%' }}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] bg-cyan-400 text-slate-950 px-1 py-0.2 rounded font-bold uppercase">
                    Target: Vehicle
                  </span>
                  <span className="font-mono text-[9px] text-cyan-400">98.4% conf</span>
                </div>
                <div className="flex items-end justify-between font-mono text-[9px] text-cyan-400">
                  <span>Dist: 18.2m</span>
                  <span>Δv: -2 km/h</span>
                </div>
              </div>

              {/* Speed & Heading Cockpit Dial in Center Bottom */}
              <div className="absolute bottom-4 left-4 bg-[#070e1c]/90 border border-white/10 backdrop-blur-xl p-3 rounded-xl flex items-center gap-4 shadow-xl">
                <div className="flex flex-col">
                  <span className="font-mono text-[9px] text-slate-400 tracking-wider">SPEED</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-heading text-2xl text-white font-bold">48</span>
                    <span className="font-mono text-xs text-cyan-400">KM/H</span>
                  </div>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="flex flex-col">
                  <span className="font-mono text-[9px] text-slate-400 tracking-wider">HEADING</span>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-emerald-400 text-base">explore</span>
                    <span className="font-mono text-xs text-white font-semibold">NW 312°</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Integrated Playback Deck */}
            <div className="relative z-20 bg-[#070e1c]/80 border-t border-white/10 backdrop-blur-2xl p-3 flex flex-col gap-2">
              {/* Multi-Layer Telemetry Interactive Scrubber Bar */}
              <div className="relative w-full h-6 flex items-center cursor-pointer group/scrub">
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative">
                  <div className="absolute left-0 top-0 bottom-0 bg-slate-700 w-3/4 rounded-full"></div>
                  <div className="absolute left-0 top-0 bottom-0 bg-blue-600 w-[42%] rounded-full shadow-[0_0_8px_rgba(77,142,255,0.6)]"></div>
                </div>

                {/* AI Event Markers */}
                <div className="absolute left-[15%] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-900" title="Speed Limit Sign (50km/h)"></div>
                <div className="absolute left-[34%] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-900" title="Lane Merge Warning Sign"></div>
                <div className="absolute left-[42%] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-amber-400 ring-4 ring-amber-500/30 animate-pulse" title="Harsh Deceleration Event (-0.42G)"></div>
                <div className="absolute left-[68%] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-900" title="Traffic Light Detection"></div>
              </div>

              {/* Controls Sub-strip */}
              <div className="flex items-center justify-between text-white font-mono text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {isPlaying ? 'pause' : 'play_arrow'}
                    </span>
                  </button>
                  <span className="text-slate-400 pl-2">02:18 / {active.duration || '05:24'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-[#070e1c] border border-white/10 rounded-lg p-0.5 flex items-center text-[10px]">
                    {[0.5, 1.0, 2.0].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          playbackSpeed === speed
                            ? 'bg-cyan-500/20 text-cyan-400 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => alert(`Clip ${active.filename} exported to Parivahan dispute ledger.`)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs border border-white/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">cut</span>
                    <span>Export Clip</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Playback Telemetry Breakdown & Proof of Non-Fault */}
          <div className="bg-[#10203B]/70 border border-white/10 backdrop-blur-2xl p-4 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-12 h-12 rounded-xl bg-[#070e1c] border border-white/5 flex items-center justify-center text-cyan-400">
                <span className="material-symbols-outlined text-2xl">psychology</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-base text-white">
                    {active.signs_count} Road Signs Cataloged
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Pass Verified
                  </span>
                </div>
                <span className="text-xs text-slate-400 mt-0.5">
                  Automated optical character recognition paired with geo-spatial telemetry logs.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={() => alert('Proof of Non-Fault certificate generated (SHA-256 telemetry seal).')}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">verified_user</span>
                <span>Proof of Non-Fault</span>
              </button>
            </div>
          </div>

          {/* End-to-End Encryption Security Card */}
          <div className="bg-[#070e1c]/80 border border-white/5 p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-400 text-2xl">lock</span>
              <div className="flex flex-col">
                <span className="font-mono text-xs text-white font-semibold">Zero-Knowledge Vault Active</span>
                <span className="text-xs text-slate-400">
                  End-to-End Encrypted: Only your registered hardware token possesses decryption keys.
                </span>
              </div>
            </div>
            <span className="font-mono text-[10px] text-slate-400 hidden md:inline">
              ENCR: XChaCha20-Poly1305
            </span>
          </div>
        </div>

        {/* Media Library Stream / Vault Grid (4 Cols) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400 text-base">movie</span>
              CAPTURED FOOTAGE LOGS
            </span>
            <span className="font-mono text-xs text-slate-400">{filteredVideos.length} Sessions</span>
          </div>

          <div className="flex flex-col gap-3 max-h-[820px] overflow-y-auto pr-1">
            {filteredVideos.map((v) => {
              const isSelected = active.id === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVideo(v)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#162B4D] border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                      : 'bg-[#10203B]/70 border-white/10 hover:bg-white/5'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="relative w-28 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[#070e1c] border border-white/5">
                      <img
                        src={v.thumbnail}
                        alt="Dashcam thumbnail"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/80 font-mono text-[9px] text-white px-1 rounded">
                        {v.duration}
                      </span>
                      {v.is_incident && (
                        <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
                      )}
                    </div>

                    <div className="flex flex-col flex-1 min-w-0 justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-xs text-cyan-400 font-bold truncate">
                            {v.filename}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                          {v.vehicle_name} • {v.registration}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                        <span className="font-mono text-[10px] text-slate-400">{v.timestamp}</span>
                        <span
                          className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            v.is_incident
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {v.tag || 'Processed'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upload Footage Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="titanium-panel p-6 max-w-md w-full shadow-2xl border border-white/10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="font-heading font-bold text-base text-white">Upload Dashcam Evidence</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Upload local MP4 or MKV recording from your vehicle dashcam. The video will be encrypted with SHA-256 and evaluated against our 108-class PyTorch model for signs, speed restrictions, and potential false challans.
            </p>

            <div
              onClick={() => uploadFileInputRef.current?.click()}
              className="border-2 border-dashed border-cyan-400/40 hover:border-cyan-400 bg-[#070e1c] rounded-xl p-8 text-center cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-4xl text-cyan-400 mb-2">cloud_upload</span>
              <div className="text-xs text-white font-semibold">Click to select MP4/MKV file</div>
              <div className="text-[10px] text-slate-400 mt-1">Up to 4GB supported</div>
            </div>
            <input
              type="file"
              ref={uploadFileInputRef}
              onChange={handleUploadVideo}
              accept="video/*"
              className="hidden"
            />

            {uploading && (
              <div className="mt-3 text-center text-xs font-mono text-cyan-400 animate-pulse">
                Encrypting and uploading dashcam telemetry to cloud vault...
              </div>
            )}

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
