// frontend/src/components/UpcomingAlertsPanel.tsx
// ADAS HUD Upcoming Alerts Panel with Real-Time Distance Countdown,
// Voice Controls, Speed Limit Badges, and Multi-Language Speech Telemetry.

import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Navigation,
  AlertTriangle,
  ShieldAlert,
  Info,
  Clock,
  Compass,
  Radio,
  Settings,
  Flag,
  CheckCircle2,
  HelpCircle,
  Play,
  Pause,
  FastForward,
  RotateCcw
} from 'lucide-react';
import type { NavigationState } from '../services/navigationService';
import { speechService } from '../services/speechService';
import type { AlertLanguage } from '../services/speechService';
import type { RouteAlertItem } from '../services/alertEngine';

interface UpcomingAlertsPanelProps {
  navState: NavigationState;
  onStartNav: () => void;
  onPauseNav: () => void;
  onResumeNav: () => void;
  onStopNav: () => void;
  onStepForward: (meters?: number) => void;
  onStepBackward: (meters?: number) => void;
  onOpenReportModal: (sign?: any) => void;
  onOpenConfigModal: () => void;
}

export const UpcomingAlertsPanel: React.FC<UpcomingAlertsPanelProps> = ({
  navState,
  onStartNav,
  onPauseNav,
  onResumeNav,
  onStopNav,
  onStepForward,
  onStepBackward,
  onOpenReportModal,
  onOpenConfigModal,
}) => {
  const [speechSettings, setSpeechSettings] = useState(speechService.getSettings());
  const [testPlaying, setTestPlaying] = useState(false);

  const toggleVoice = () => {
    const updated = !speechSettings.enabled;
    speechService.updateSettings({ enabled: updated });
    setSpeechSettings(speechService.getSettings());
  };

  const changeLanguage = (lang: AlertLanguage) => {
    speechService.updateSettings({ language: lang });
    setSpeechSettings(speechService.getSettings());
  };

  const handleTestVoice = () => {
    setTestPlaying(true);
    speechService.testVoiceOutput();
    setTimeout(() => setTestPlaying(false), 2500);
  };

  const next = navState.nextAlert;

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatEta = (seconds?: number | null): string => {
    if (!seconds || seconds <= 0) return '--';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
            CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            CAUTION
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            INFO
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Active Status & Master Controls ─────────────────────────────────── */}
      <div className="stitch-glass p-4 rounded-xl border border-white/10 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                navState.isActive
                  ? navState.isPaused
                    ? 'bg-amber-400'
                    : 'bg-emerald-400 animate-pulse'
                  : 'bg-slate-500'
              }`}
            />
            <span className="font-heading font-bold text-sm text-white">
              {navState.isActive
                ? navState.isPaused
                  ? 'NAVIGATION PAUSED'
                  : 'ACTIVE ROAD NAVIGATION'
                : 'NAVIGATION STANDBY'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenConfigModal}
              title="Configure Alert Thresholds"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => onOpenReportModal()}
              title="Report Missing / Incorrect Sign"
              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1 text-xs"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Report Sign</span>
            </button>
          </div>
        </div>

        {/* GPS Telemetry Sub-bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>GPS: </span>
            <span
              className={`font-bold ${
                navState.gpsSignalStatus === 'HIGH_PRECISION' || navState.gpsSignalStatus === 'SIMULATED'
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {navState.gpsSignalStatus} (±{navState.currentLocation.accuracyM}m)
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            <span>HEADING: </span>
            <span className="text-white font-bold">{Math.round(navState.currentLocation.headingDeg)}°</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Navigation className="w-3.5 h-3.5 text-purple-400" />
            <span>ROUTE: </span>
            <span
              className={`font-bold ${
                navState.routeStatus === 'ON_ROUTE' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {navState.routeStatus}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>SPEED: </span>
            <span className="text-cyan-300 font-bold">{Math.round(navState.currentLocation.speedKmh)} km/h</span>
          </div>
        </div>
      </div>

      {/* ── Primary Spotlight: Next Upcoming Traffic Sign ───────────────────── */}
      <div className="titanium-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-600/20 via-cyan-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-telemetry-sm text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              NEXT UPCOMING ADAS RESTRICTION
            </span>
          </div>
          {next && getUrgencyBadge(next.urgency)}
        </div>

        {next ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Traffic Sign Visual Icon / Speed Badge */}
              <div
                className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold shadow-lg border-2 shrink-0 ${
                  next.sign.speed_limit
                    ? 'bg-white text-slate-900 border-red-600'
                    : next.urgency === 'CRITICAL'
                    ? 'bg-red-500/20 text-red-400 border-red-500/40'
                    : next.urgency === 'WARNING'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                }`}
              >
                {next.sign.speed_limit ? (
                  <>
                    <span className="text-[10px] tracking-tight text-red-600 font-black">SPEED</span>
                    <span className="text-xl font-black leading-none">{next.sign.speed_limit}</span>
                  </>
                ) : next.urgency === 'CRITICAL' ? (
                  <ShieldAlert className="w-8 h-8" />
                ) : next.urgency === 'WARNING' ? (
                  <AlertTriangle className="w-8 h-8" />
                ) : (
                  <Info className="w-8 h-8" />
                )}
              </div>

              <div>
                <h3 className="font-heading font-black text-xl text-white tracking-tight">
                  {next.sign.sign_name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-1">
                  {next.sign.road_name} {next.sign.road_segment ? `• ${next.sign.road_segment}` : ''}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                    {next.sign.category}
                  </span>
                  {next.sign.verification_status === 'VERIFIED' ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Verified ({next.sign.source.split(' ')[0]})
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <HelpCircle className="w-2.5 h-2.5" />
                      Uncertain / Community Report
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Distance Countdown & ETA Metrics */}
            <div className="flex sm:flex-col items-baseline sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-white/5">
              <div className="text-right">
                <span className="font-mono text-3xl font-black text-electric-cyan tracking-tight">
                  {formatDistance(next.distance_m)}
                </span>
                <span className="block text-[11px] font-mono text-slate-400">
                  ETA: <span className="text-white font-semibold">{formatEta(next.eta_seconds)}</span>
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 sm:mt-1">
                Trigger: <span className="text-blue-300 font-bold">{next.alert_stage}</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-white">Roadway Corridor Clear</p>
            <p className="text-xs text-slate-400">No verified traffic signs or restrictions within current lookahead.</p>
          </div>
        )}

        {/* Dynamic Voice Prompt Broadcast Banner */}
        {next && (
          <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-slate-300 font-mono text-[11px]">
                <strong className="text-white font-sans">Voice Advisory:</strong> &ldquo;{next.speech_text}&rdquo;
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Voice Engine Controls & Audio Telemetry ─────────────────────────── */}
      <div className="stitch-glass p-4 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleVoice}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              speechSettings.enabled
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                : 'bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {speechSettings.enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{speechSettings.enabled ? 'Voice Alerts Active' : 'Voice Muted'}</span>
          </button>

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5 text-xs font-mono">
            {(['en', 'te', 'hi'] as AlertLanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={() => changeLanguage(lang)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  speechSettings.language === lang
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang === 'en' ? 'EN' : lang === 'te' ? 'తెలుగు' : 'हिंदी'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestVoice}
            disabled={testPlaying}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <Volume2 className={`w-3.5 h-3.5 ${testPlaying ? 'animate-bounce text-cyan-400' : ''}`} />
            <span>{testPlaying ? 'Speaking...' : 'Test Voice Output'}</span>
          </button>
        </div>
      </div>

      {/* ── Last Spoken Transcript Telemetry ───────────────────────────────── */}
      {navState.lastSpokenAlert && (
        <div className="px-4 py-2.5 rounded-xl bg-blue-950/40 border border-blue-500/20 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-slate-400">LAST ANNOUNCEMENT:</span>
            <span className="text-white font-sans font-semibold line-clamp-1">
              &ldquo;{navState.lastSpokenAlert.text}&rdquo;
            </span>
          </div>
          <span className="text-[10px] text-slate-400 shrink-0">
            {new Date(navState.lastSpokenAlert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      )}

      {/* ── Chronological Route Alerts Queue ────────────────────────────────── */}
      <div className="stitch-glass p-4 rounded-xl border border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-telemetry-sm text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            ALL UPCOMING SIGNS ALONG ROUTE ({navState.upcomingAlerts.length})
          </span>
          <span className="text-[11px] font-mono text-slate-400">Route Corridor Order</span>
        </div>

        {navState.upcomingAlerts.length > 0 ? (
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            {navState.upcomingAlerts.map((item, idx) => (
              <div
                key={`${item.sign.id}-${idx}`}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                  item.alert_stage === 'PASSED'
                    ? 'bg-white/5 border-white/5 opacity-50'
                    : item.alert_stage === 'IMMEDIATE_100M'
                    ? 'bg-red-500/10 border-red-500/30'
                    : item.alert_stage === 'PRIMARY_200M'
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-[#0f172a]/70 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      item.sign.speed_limit
                        ? 'bg-white text-slate-900 border border-red-600'
                        : item.urgency === 'CRITICAL'
                        ? 'bg-red-500/20 text-red-400'
                        : item.urgency === 'WARNING'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {item.sign.speed_limit ? item.sign.speed_limit : item.urgency === 'CRITICAL' ? '!' : 'ℹ'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-sm text-white">{item.sign.sign_name}</span>
                      {getUrgencyBadge(item.urgency)}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{item.sign.road_name}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-sm font-bold text-cyan-300 block">
                    {item.alert_stage === 'PASSED' ? 'PASSED' : formatDistance(item.distance_m)}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.alert_stage === 'PASSED' ? 'Passed' : formatEta(item.eta_seconds)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">No upcoming signs found along current route path.</p>
        )}
      </div>

      {/* ── Drive Simulation Controls ───────────────────────────────────────── */}
      <div className="stitch-glass p-4 rounded-xl border border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-telemetry-sm text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            DESKTOP SIMULATOR & TIME CONTROLS
          </span>
          <span className="text-[11px] font-mono text-cyan-400">Precision Testing</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!navState.isActive ? (
            <button
              onClick={onStartNav}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Driving Simulation
            </button>
          ) : navState.isPaused ? (
            <button
              onClick={onResumeNav}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Resume Driving
            </button>
          ) : (
            <button
              onClick={onPauseNav}
              className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause
            </button>
          )}

          {navState.isActive && (
            <button
              onClick={onStopNav}
              className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold"
            >
              Stop
            </button>
          )}

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => onStepBackward(150)}
              title="Step backward 150m"
              className="btn-secondary p-2 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onStepForward(150)}
              title="Advance forward 150m along route"
              className="btn-secondary p-2 text-xs flex items-center gap-1"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span className="text-[11px]">+150m</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
