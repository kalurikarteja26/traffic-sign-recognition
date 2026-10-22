// frontend/src/pages/NavigationAlertsView.tsx
// Intelligent Traffic Sign Voice Alert & Navigation View with Google Maps Platform Integration,
// Interactive Vector Map Fallback, Real-Time ADAS HUD, and Route-Corridor Arbitration.

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  Gauge,
  Sliders,
  Flag,
  Key,
  Layers,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Volume2,
  VolumeX,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Camera,
  CameraOff,
  Eye,
  Sparkles,
  Crosshair
} from 'lucide-react';
import { navigationService } from '../services/navigationService';
import type { NavigationState, RouteCorridor } from '../services/navigationService';
import { alertEngine } from '../services/alertEngine';
import { speechService } from '../services/speechService';
import type { AlertLanguage } from '../services/speechService';
import { UpcomingAlertsPanel } from '../components/UpcomingAlertsPanel';
import { api } from '../api';

export const NavigationAlertsView: React.FC = () => {
  const [navState, setNavState] = useState<NavigationState>(navigationService.getState());
  const [corridors, setCorridors] = useState<RouteCorridor[]>([]);
  const [loadingCorridors, setLoadingCorridors] = useState(true);

  // Perspective Mode & Dashcam PIP State
  const [mapPerspective, setMapPerspective] = useState<'driver' | 'overview'>('driver');
  const [dashcamPipActive, setDashcamPipActive] = useState(false);
  const [pinningSign, setPinningSign] = useState(false);
  const [pinSuccessToast, setPinSuccessToast] = useState<string | null>(null);

  // Dashcam Webcam State
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipStreamRef = useRef<MediaStream | null>(null);
  const pipInferencePendingRef = useRef(false);
  const pipIntervalRef = useRef<any>(null);
  const [pipDetectedSign, setPipDetectedSign] = useState<any | null>(null);
  const lastPipSpokenRef = useRef<number | null>(null);
  const lastPipSpokenTimeRef = useRef<number>(0);

  // Modals state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Google Maps API Key handling
  const [apiKey, setApiKey] = useState<string>(() => {
    return (
      (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
      localStorage.getItem('aerovision_google_maps_key') ||
      ''
    );
  });
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState<string | null>(null);

  // Map view controls (zoom / pan) for interactive canvas fallback
  const [zoomLevel, setZoomLevel] = useState(15);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const googleMarkersRef = useRef<any[]>([]);
  const googlePolylineRef = useRef<any>(null);
  const googleVehicleMarkerRef = useRef<any>(null);

  // Threshold Configuration form state
  const [thresholdEarly, setThresholdEarly] = useState(alertEngine.getConfig().earlyThresholdM);
  const [thresholdPrimary, setThresholdPrimary] = useState(alertEngine.getConfig().primaryThresholdM);
  const [thresholdImmediate, setThresholdImmediate] = useState(alertEngine.getConfig().immediateThresholdM);
  const [corridorTolerance, setCorridorTolerance] = useState(alertEngine.getConfig().corridorToleranceM);

  // Sign Report form state
  const [reportType, setReportType] = useState('MISSING_SIGN');
  const [reportSignName, setReportSignName] = useState('');
  const [reportCategory, setReportCategory] = useState('Mandatory');
  const [reportSpeedLimit, setReportSpeedLimit] = useState<number | ''>('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Subscribe to Navigation Service state updates
  useEffect(() => {
    const unsub = navigationService.subscribe((state) => {
      setNavState(state);
    });
    return () => unsub();
  }, []);

  // Fetch verified Indian Corridors from backend
  useEffect(() => {
    const fetchCorridors = async () => {
      try {
        const list = await api.getCorridors();
        setCorridors(list);
        if (list.length > 0 && !navState.selectedCorridor) {
          navigationService.setCorridor(list[0]);
        }
      } catch (err) {
        console.error('Failed to load corridors:', err);
      } finally {
        setLoadingCorridors(false);
      }
    };
    fetchCorridors();
  }, []);

  // Initialize or reload Google Maps JS API when apiKey changes
  useEffect(() => {
    if (!apiKey || apiKey.trim() === '') {
      setGoogleMapsLoaded(false);
      return;
    }

    const scriptId = 'google-maps-script-aerovision';
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      existingScript.remove();
    }

    (window as any).initAeroVisionGoogleMap = () => {
      setGoogleMapsLoaded(true);
      setGoogleMapsError(null);
    };

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places,geometry&callback=initAeroVisionGoogleMap`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      setGoogleMapsError('Failed to load Google Maps SDK. Reverting to precision vector map.');
      setGoogleMapsLoaded(false);
    };
    document.head.appendChild(script);

    return () => {
      delete (window as any).initAeroVisionGoogleMap;
    };
  }, [apiKey]);

  // Sync Google Map instance when active
  useEffect(() => {
    if (!googleMapsLoaded || !mapContainerRef.current || !(window as any).google?.maps) return;

    const google = (window as any).google;
    const center = navState.currentLocation;

    if (!googleMapInstanceRef.current) {
      // Create new map
      const darkTitaniumStyle = [
        { elementType: 'geometry', stylers: [{ color: '#090e17' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#090e17' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2333' }] },
        { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0f1724' }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2563eb' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#030712' }] },
      ];

      googleMapInstanceRef.current = new google.maps.Map(mapContainerRef.current, {
        center: { lat: center.lat, lng: center.lon },
        zoom: zoomLevel,
        styles: darkTitaniumStyle,
        disableDefaultUI: true,
        zoomControl: false,
      });
    } else {
      googleMapInstanceRef.current.panTo({ lat: center.lat, lng: center.lon });
    }

    // Update Route Polyline
    if (googlePolylineRef.current) {
      googlePolylineRef.current.setMap(null);
    }
    if (navState.routeWaypoints.length >= 2) {
      const path = navState.routeWaypoints.map(([lat, lon]) => ({ lat, lng: lon }));
      googlePolylineRef.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#06b6d4',
        strokeOpacity: 0.9,
        strokeWeight: 5,
        map: googleMapInstanceRef.current,
      });
    }

    // Update Vehicle Marker
    if (!googleVehicleMarkerRef.current) {
      googleVehicleMarkerRef.current = new google.maps.Marker({
        position: { lat: center.lat, lng: center.lon },
        map: googleMapInstanceRef.current,
        title: 'Vehicle Position',
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#22d3ee',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          rotation: center.headingDeg,
        },
      });
    } else {
      googleVehicleMarkerRef.current.setPosition({ lat: center.lat, lng: center.lon });
      const icon = googleVehicleMarkerRef.current.getIcon();
      if (icon) {
        icon.rotation = center.headingDeg;
        googleVehicleMarkerRef.current.setIcon(icon);
      }
    }

    // Clear and redraw sign markers
    googleMarkersRef.current.forEach((m) => m.setMap(null));
    googleMarkersRef.current = [];

    navState.upcomingAlerts.forEach((alert) => {
      const sign = alert.sign;
      const marker = new google.maps.Marker({
        position: { lat: sign.latitude, lng: sign.longitude },
        map: googleMapInstanceRef.current,
        title: `${sign.sign_name} (${alert.distance_m}m)`,
        label: {
          text: sign.speed_limit ? `${sign.speed_limit}` : sign.category === 'Mandatory' ? '!' : 'ℹ',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '11px',
        },
      });
      googleMarkersRef.current.push(marker);
    });
  }, [googleMapsLoaded, navState.currentLocation, navState.upcomingAlerts, zoomLevel]);

  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem('aerovision_google_maps_key', newKey);
    setShowApiKeyModal(false);
  };

  const handleSaveConfig = () => {
    alertEngine.updateConfig({
      earlyThresholdM: Number(thresholdEarly),
      primaryThresholdM: Number(thresholdPrimary),
      immediateThresholdM: Number(thresholdImmediate),
      corridorToleranceM: Number(corridorTolerance),
    });
    setShowConfigModal(false);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportSubmitting(true);
    try {
      await api.submitSignReport({
        report_type: reportType,
        sign_name: reportSignName || 'Uncatalogued Sign',
        category: reportCategory,
        latitude: navState.currentLocation.lat,
        longitude: navState.currentLocation.lon,
        road_name: navState.selectedCorridor?.name || 'Active Roadway',
        direction_deg: navState.currentLocation.headingDeg,
        suggested_speed_limit: reportSpeedLimit ? Number(reportSpeedLimit) : null,
        description: reportDescription,
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setShowReportModal(false);
        setReportSignName('');
        setReportDescription('');
      }, 1800);
    } catch (err: any) {
      alert(`Report failed: ${err.message}`);
    } finally {
      setReportSubmitting(false);
    }
  };

  // Animation loop for live road flow
  const [animOffset, setAnimOffset] = useState(0);
  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();
    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (navState.isActive && !navState.isPaused && navState.currentLocation.speedKmh > 0) {
        const speedFactor = navState.currentLocation.speedKmh / 20;
        setAnimOffset((prev) => (prev + speedFactor * dt * 40) % 40);
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [navState.isActive, navState.isPaused, navState.currentLocation.speedKmh]);

  // Dashcam Webcam PIP Inference Loop
  useEffect(() => {
    if (!dashcamPipActive) {
      if (pipIntervalRef.current) clearInterval(pipIntervalRef.current);
      if (pipStreamRef.current) {
        pipStreamRef.current.getTracks().forEach((t) => t.stop());
        pipStreamRef.current = null;
      }
      setPipDetectedSign(null);
      return;
    }

    let isMounted = true;
    const startPip = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        pipStreamRef.current = stream;
        if (pipVideoRef.current) {
          pipVideoRef.current.srcObject = stream;
          pipVideoRef.current.play().catch(() => {});
        }

        pipIntervalRef.current = setInterval(async () => {
          if (!pipVideoRef.current || !pipCanvasRef.current || pipInferencePendingRef.current) return;
          const v = pipVideoRef.current;
          const c = pipCanvasRef.current;
          if (v.readyState < 2 || v.videoWidth === 0) return;

          pipInferencePendingRef.current = true;
          try {
            c.width = 480;
            c.height = 360;
            const ctx = c.getContext('2d');
            if (ctx) {
              ctx.drawImage(v, 0, 0, 480, 360);
              const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.8));
              if (blob) {
                const fd = new FormData();
                fd.append('file', blob, 'pip_webcam.jpg');
                const res = await api.predictFrame(fd);
                if (res && res.primary_prediction && res.is_detected && res.primary_prediction.class_id >= 0) {
                  const pred = res.primary_prediction;
                  setPipDetectedSign(pred);
                  const now = Date.now();
                  const cid = Number(pred.class_id);
                  if (now - lastPipSpokenTimeRef.current > 4000 || lastPipSpokenRef.current !== cid) {
                    lastPipSpokenRef.current = cid;
                    lastPipSpokenTimeRef.current = now;
                    const prompt = `Camera detection: ${pred.sign_name}.`;
                    speechService.speak(prompt, 'WARNING', speechService.getSettings().language);
                  }
                } else {
                  setPipDetectedSign(null);
                }
              }
            }
          } catch (_) {
          } finally {
            pipInferencePendingRef.current = false;
          }
        }, 220);
      } catch (err: any) {
        console.warn('PIP camera access error:', err);
        setDashcamPipActive(false);
      }
    };
    startPip();

    return () => {
      isMounted = false;
      if (pipIntervalRef.current) clearInterval(pipIntervalRef.current);
      if (pipStreamRef.current) {
        pipStreamRef.current.getTracks().forEach((t) => t.stop());
        pipStreamRef.current = null;
      }
    };
  }, [dashcamPipActive]);

  const handleQuickPin = async () => {
    setPinningSign(true);
    try {
      await navigationService.quickPinSignAhead('Stop Sign', 180);
      setPinSuccessToast('Verified Stop Sign pinned 180m ahead of your device! Advance alert armed.');
      setTimeout(() => setPinSuccessToast(null), 3500);
    } catch (e: any) {
      alert(`Quick pin failed: ${e.message}`);
    } finally {
      setPinningSign(false);
    }
  };

  // Live Driver Follow Coordinate Projection
  const scale = 0.52 * (zoomLevel / 15);
  const currLat = navState.currentLocation.lat;
  const currLon = navState.currentLocation.lon;
  const currHeading = navState.currentLocation.headingDeg;

  const projectDriverCoord = (lat: number, lon: number) => {
    const dLat = lat - currLat;
    const dLon = lon - currLon;
    const dyM = dLat * 111320;
    const dxM = dLon * (111320 * Math.cos((currLat * Math.PI) / 180));
    const rad = (-currHeading * Math.PI) / 180;
    const rotX = dxM * Math.cos(rad) - dyM * Math.sin(rad);
    const rotY = dxM * Math.sin(rad) + dyM * Math.cos(rad);
    return {
      x: 400 + rotX * scale,
      y: 360 - rotY * scale,
      rotY,
    };
  };

  let driverPathD = '';
  if (navState.routeWaypoints.length >= 2) {
    const pts = navState.routeWaypoints.map(([lat, lon]) => projectDriverCoord(lat, lon));
    driverPathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  } else {
    driverPathD = `M 400 520 L 400 30`;
  }

  // Overview Bounding Box Projection
  const allWaypoints = navState.routeWaypoints.length > 0 ? navState.routeWaypoints : [[currLat, currLon]];
  const lats = allWaypoints.map((p) => p[0]);
  const lons = allWaypoints.map((p) => p[1]);
  lats.push(currLat);
  lons.push(currLon);
  const minLat = Math.min(...lats) - 0.003;
  const maxLat = Math.max(...lats) + 0.003;
  const minLon = Math.min(...lons) - 0.004;
  const maxLon = Math.max(...lons) + 0.004;

  const projectOverviewCoord = (lat: number, lon: number) => {
    const normX = (lon - minLon) / Math.max(0.0001, maxLon - minLon);
    const normY = (lat - minLat) / Math.max(0.0001, maxLat - minLat);
    return {
      x: 80 + normX * 640,
      y: 420 - normY * 340,
    };
  };

  let overviewPathD = '';
  if (navState.routeWaypoints.length >= 2) {
    const pts = navState.routeWaypoints.map(([lat, lon]) => projectOverviewCoord(lat, lon));
    overviewPathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* ── Top Header Navigation Bar ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl stitch-glass border border-white/10 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
              <Navigation className="w-4 h-4" />
            </div>
            <h1 className="font-heading font-black text-xl text-white tracking-tight">
              Live Navigation & Voice Alert Avionics
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Intelligent location-aware road restriction warning engine with Google Maps Platform & high-precision ADAS HUD.
          </p>
        </div>

        {/* Corridor Selector & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-[#070e1c] p-1.5 rounded-xl border border-white/10">
            <MapPin className="w-4 h-4 text-cyan-400 ml-1.5 shrink-0" />
            <select
              value={navState.selectedCorridor?.id || ''}
              onChange={(e) => {
                const found = corridors.find((c) => c.id === e.target.value);
                if (found) navigationService.setCorridor(found);
              }}
              className="bg-transparent text-xs text-white font-medium focus:outline-none pr-3"
            >
              {corridors.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Switch: Real GPS vs Driving Simulator */}
          <div className="flex items-center gap-1 bg-[#070e1c] p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => navigationService.setMode(true)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                navState.isSimulated
                  ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Simulator Mode
            </button>
            <button
              onClick={() => navigationService.setMode(false)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                !navState.isSimulated
                  ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Live Device GPS
            </button>
          </div>

          {/* Handheld Live Device Quick-Pin Button */}
          <button
            onClick={handleQuickPin}
            disabled={pinningSign}
            title="Pin a verified Stop Sign 180m ahead of your current device location"
            className="px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Crosshair className={`w-3.5 h-3.5 ${pinningSign ? 'animate-spin' : ''}`} />
            <span>{pinningSign ? 'Pinning...' : '📍 Pin Test Sign 180m'}</span>
          </button>

          {/* Live PC Webcam Dashcam Eye Toggle */}
          <button
            onClick={() => setDashcamPipActive(!dashcamPipActive)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              dashcamPipActive
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
            }`}
          >
            {dashcamPipActive ? <CameraOff className="w-3.5 h-3.5 text-cyan-400" /> : <Camera className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{dashcamPipActive ? 'Close Webcam Eye' : 'Live PC Webcam Eye'}</span>
          </button>

          {/* Google Maps API Key Button */}
          <button
            onClick={() => setShowApiKeyModal(true)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              googleMapsLoaded
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{googleMapsLoaded ? 'Google Maps Active' : 'Google Maps'}</span>
          </button>
        </div>
      </div>

      {/* Success Toast Banner */}
      {pinSuccessToast && (
        <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono flex items-center gap-2 animate-pulse shadow-lg">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{pinSuccessToast}</span>
        </div>
      )}

      {/* ── Main Layout: Map Cockpit Stage + Upcoming Alerts HUD ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Map & Telemetry Dashboard (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Interactive Map Viewport */}
          <div className="relative titanium-panel rounded-2xl overflow-hidden border border-white/10 h-[500px] shadow-2xl flex flex-col justify-between">
            {/* Embedded Google Map Container */}
            {googleMapsLoaded ? (
              <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />
            ) : (
              /* High-Precision Interactive Live Moving Vector SVG Map */
              <div className="absolute inset-0 w-full h-full bg-[#070b14] flex items-center justify-center overflow-hidden z-0">
                <svg
                  className="w-full h-full opacity-95 transition-transform duration-300"
                  viewBox="0 0 800 500"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <radialGradient id="cyberGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="headlightBeam" cx="50%" cy="100%" r="90%">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.20" />
                      <stop offset="60%" stopColor="#0ea5e9" stopOpacity="0.06" />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>

                  {/* Cyber Grid Lines */}
                  <g stroke="rgba(255,255,255,0.03)" strokeWidth="1">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <line key={`v-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="500" />
                    ))}
                    {Array.from({ length: 10 }).map((_, i) => (
                      <line key={`h-${i}`} x1="0" y1={i * 50} x2="800" y2={i * 50} />
                    ))}
                  </g>

                  {mapPerspective === 'driver' ? (
                    /* ── Live Driver Cockpit Follow Mode ────────────────────────────────── */
                    <g>
                      {/* Concentric Radar Distance Rings centered on Vehicle (400, 360) */}
                      <circle cx="400" cy="360" r={100 * scale} fill="none" stroke="rgba(239,68,68,0.22)" strokeWidth="1" strokeDasharray="4 6" />
                      <text x={400 + 100 * scale + 4} y="364" fill="rgba(239,68,68,0.7)" fontSize="9" fontFamily="monospace">100m</text>

                      <circle cx="400" cy="360" r={200 * scale} fill="none" stroke="rgba(245,158,11,0.22)" strokeWidth="1" strokeDasharray="4 6" />
                      <text x={400 + 200 * scale + 4} y="364" fill="rgba(245,158,11,0.7)" fontSize="9" fontFamily="monospace">200m</text>

                      <circle cx="400" cy="360" r={500 * scale} fill="none" stroke="rgba(6,182,212,0.18)" strokeWidth="1" strokeDasharray="6 8" />
                      <text x={400 + 500 * scale + 4} y="364" fill="rgba(6,182,212,0.6)" fontSize="9" fontFamily="monospace">500m</text>

                      {/* Forward Headlights Illumination Cone */}
                      <polygon
                        points="370,360 430,360 550,20 250,20"
                        fill="url(#headlightBeam)"
                      />

                      {/* Dynamic Road Surface Polyline */}
                      {driverPathD && (
                        <>
                          <path
                            d={driverPathD}
                            fill="none"
                            stroke="#111c2e"
                            strokeWidth="38"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d={driverPathD}
                            fill="none"
                            stroke="#0ea5e9"
                            strokeWidth="40"
                            strokeOpacity="0.22"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d={driverPathD}
                            fill="none"
                            stroke="url(#routeGradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="drop-shadow-[0_0_12px_#06b6d4]"
                          />
                          <path
                            d={driverPathD}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeDasharray="14 18"
                            strokeDashoffset={-animOffset}
                            opacity="0.9"
                          />
                        </>
                      )}

                      {/* Upcoming Traffic Signs Projected along the Driver's Vector */}
                      {navState.upcomingAlerts.map((alert) => {
                        const sign = alert.sign;
                        const pos = projectDriverCoord(sign.latitude, sign.longitude);
                        const isNext = navState.nextAlert?.sign.id === sign.id;
                        if (pos.rotY < -50 || pos.rotY > 1200) return null;

                        const isStop = sign.sign_type.toLowerCase().includes('stop') || sign.sign_name.toLowerCase().includes('stop');
                        const isSpeed = sign.speed_limit !== null && sign.speed_limit !== undefined;

                        return (
                          <g key={`driver-sign-${sign.id}`} transform={`translate(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`}>
                            {/* Glowing Pulse for Next Sign */}
                            {isNext && (
                              <circle r="26" fill="none" stroke="#22d3ee" strokeWidth="2" opacity="0.6">
                                <animate attributeName="r" values="20;32;20" dur="1.8s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.8s" repeatCount="indefinite" />
                              </circle>
                            )}

                            {/* Sign Icon Representation */}
                            {isSpeed ? (
                              <g>
                                <circle r="18" fill="#ffffff" stroke="#dc2626" strokeWidth="3.5" className="drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
                                <text textAnchor="middle" y="5" fill="#0f172a" fontSize="12" fontWeight="900" fontFamily="sans-serif">
                                  {sign.speed_limit}
                                </text>
                              </g>
                            ) : isStop ? (
                              <g>
                                <circle r="18" fill="#ef4444" className="drop-shadow-[0_0_10px_#ef4444]" />
                                <text textAnchor="middle" y="4" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="sans-serif">
                                  STOP
                                </text>
                              </g>
                            ) : sign.category === 'Cautionary' ? (
                              <g>
                                <circle r="17" fill="#f59e0b" className="drop-shadow-[0_0_8px_#f59e0b]" />
                                <text textAnchor="middle" y="5" fill="#0f172a" fontSize="13" fontWeight="black">
                                  ⚠
                                </text>
                              </g>
                            ) : (
                              <g>
                                <circle r="17" fill="#2563eb" className="drop-shadow-[0_0_8px_#2563eb]" />
                                <text textAnchor="middle" y="5" fill="#ffffff" fontSize="12" fontWeight="bold">
                                  ℹ
                                </text>
                              </g>
                            )}

                            {/* Live Distance Countdown Badge */}
                            <rect x="-28" y="22" width="56" height="15" rx="4" fill="#090e17" stroke={isNext ? '#22d3ee' : '#334155'} strokeWidth="1" />
                            <text textAnchor="middle" y="33" fill={isNext ? '#22d3ee' : '#cbd5e1'} fontSize="9" fontFamily="monospace" fontWeight="bold">
                              {Math.round(alert.distance_m)}m
                            </text>
                          </g>
                        );
                      })}

                      {/* Vehicle Marker: Center Anchor (400, 360) pointing UP */}
                      <g transform="translate(400, 360)">
                        <circle r="32" fill="url(#cyberGlow)" />
                        <circle r="16" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" className="drop-shadow-[0_0_14px_#38bdf8]" />
                        <polygon points="0,-12 7,6 0,2 -7,6" fill="#ffffff" />
                        <text textAnchor="middle" y="32" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                          {Math.round(navState.currentLocation.speedKmh)} km/h • {Math.round(navState.currentLocation.headingDeg)}°
                        </text>
                      </g>
                    </g>
                  ) : (
                    /* ── Overview Mode (North-Up) ────────────────────────────────────────── */
                    <g>
                      {overviewPathD && (
                        <>
                          <path
                            d={overviewPathD}
                            fill="none"
                            stroke="url(#routeGradient)"
                            strokeWidth="7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="drop-shadow-[0_0_12px_#06b6d4]"
                          />
                          <path
                            d={overviewPathD}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            strokeDasharray="6 8"
                            opacity="0.8"
                          />
                        </>
                      )}

                      {/* Overview Sign Markers */}
                      {navState.upcomingAlerts.map((alert) => {
                        const sign = alert.sign;
                        const pos = projectOverviewCoord(sign.latitude, sign.longitude);
                        const isNext = navState.nextAlert?.sign.id === sign.id;
                        const isStop = sign.sign_type.toLowerCase().includes('stop') || sign.sign_name.toLowerCase().includes('stop');
                        const isSpeed = sign.speed_limit !== null && sign.speed_limit !== undefined;

                        return (
                          <g key={`overview-sign-${sign.id}`} transform={`translate(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`}>
                            {isNext && (
                              <circle r="22" fill="none" stroke="#22d3ee" strokeWidth="2" opacity="0.7">
                                <animate attributeName="r" values="16;26;16" dur="2s" repeatCount="indefinite" />
                              </circle>
                            )}
                            {isSpeed ? (
                              <circle r="14" fill="#ffffff" stroke="#dc2626" strokeWidth="2.5" />
                            ) : isStop ? (
                              <circle r="14" fill="#ef4444" />
                            ) : (
                              <circle r="14" fill="#f59e0b" />
                            )}
                            <text textAnchor="middle" y="4" fill={isSpeed ? '#0f172a' : '#ffffff'} fontSize="9" fontWeight="900">
                              {isSpeed ? sign.speed_limit : isStop ? 'STOP' : '⚠'}
                            </text>
                            <text textAnchor="middle" y="24" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
                              {Math.round(alert.distance_m)}m
                            </text>
                          </g>
                        );
                      })}

                      {/* Moving Vehicle Position on Overview Map */}
                      {(() => {
                        const vPos = projectOverviewCoord(currLat, currLon);
                        return (
                          <g transform={`translate(${vPos.x.toFixed(1)}, ${vPos.y.toFixed(1)})`}>
                            <circle r="26" fill="url(#cyberGlow)" />
                            <circle r="14" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                            <polygon
                              points="0,-9 5,5 0,2 -5,5"
                              fill="#ffffff"
                              transform={`rotate(${navState.currentLocation.headingDeg})`}
                            />
                          </g>
                        );
                      })()}
                    </g>
                  )}
                </svg>
              </div>
            )}

            {/* Dashcam PIP Floating Window (when activated) */}
            {dashcamPipActive && (
              <div className="absolute top-14 right-4 z-20 w-64 rounded-xl overflow-hidden stitch-glass border border-cyan-500/40 shadow-2xl p-2 flex flex-col gap-2 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-white/10">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <Eye className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                    <span>Live PC Webcam Eye</span>
                  </div>
                  <button
                    onClick={() => setDashcamPipActive(false)}
                    className="text-slate-400 hover:text-white text-xs font-mono"
                  >
                    ✕
                  </button>
                </div>
                <div className="relative w-full h-36 bg-black rounded-lg overflow-hidden border border-white/10">
                  <video
                    ref={pipVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={pipCanvasRef} className="hidden" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-20 h-20 border border-cyan-400/60 rounded-lg flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    </div>
                  </div>
                </div>
                {pipDetectedSign ? (
                  <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[11px] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-300 block">{pipDetectedSign.sign_name}</span>
                      <span className="text-[10px] text-slate-300 font-mono">
                        Confidence: {Math.round(pipDetectedSign.confidence_score * 100)}%
                      </span>
                    </div>
                    <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 font-mono text-center py-1">
                    Optical AI Sensor Active • Show sign to camera
                  </div>
                )}
              </div>
            )}

            {/* Top Left Floating HUD Telemetry Badge */}
            <div className="relative z-10 m-4 flex items-center gap-2">
              <div className="stitch-glass px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-mono flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                <span className="text-white font-bold">{navState.selectedCorridor?.name.split('—')[0]}</span>
                <span className="text-slate-400">•</span>
                <span className="text-cyan-300 font-bold">{Math.round(navState.currentLocation.speedKmh)} KM/H</span>
              </div>

              {!googleMapsLoaded && (
                <div className="stitch-glass px-3 py-1.5 rounded-xl border border-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                  <span className="text-emerald-400">●</span>
                  <span>Vector Map Engine</span>
                </div>
              )}
            </div>

            {/* Floating Zoom & Simulator Floating Action Controls */}
            <div className="relative z-10 m-4 flex items-end justify-between">
              {/* Bottom Speed & Drive Controls */}
              <div className="stitch-glass p-2 rounded-xl border border-white/10 flex items-center gap-2 shadow-lg">
                <button
                  onClick={() => navigationService.setSimulatedSpeed(20)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                    navState.simulatedSpeedKmh === 20 ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  20k
                </button>
                <button
                  onClick={() => navigationService.setSimulatedSpeed(40)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                    navState.simulatedSpeedKmh === 40 ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  40k
                </button>
                <button
                  onClick={() => navigationService.setSimulatedSpeed(60)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                    navState.simulatedSpeedKmh === 60 ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  60k
                </button>
                <button
                  onClick={() => navigationService.setSimulatedSpeed(80)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                    navState.simulatedSpeedKmh === 80 ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  80k
                </button>
              </div>

              {/* Map Perspective & Zoom Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMapPerspective((p) => (p === 'driver' ? 'overview' : 'driver'))}
                  className="stitch-glass px-2.5 py-1.5 rounded-xl border border-white/10 text-cyan-300 hover:text-white flex items-center gap-1.5 text-xs font-mono transition-colors shadow-lg"
                  title="Toggle 3D Cockpit Follow vs North-Up Overview"
                >
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{mapPerspective === 'driver' ? '3D Cockpit' : 'North-Up'}</span>
                </button>

                <div className="flex flex-col gap-1 stitch-glass p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(19, z + 1))}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(12, z - 1))}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Real-Time Avionics Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="stitch-glass p-3.5 rounded-xl border border-white/10">
              <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">
                GPS COORDINATES
              </span>
              <span className="text-xs font-mono font-bold text-white block mt-1">
                {navState.currentLocation.lat.toFixed(4)}°N, {navState.currentLocation.lon.toFixed(4)}°E
              </span>
            </div>

            <div className="stitch-glass p-3.5 rounded-xl border border-white/10">
              <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">
                ACCURACY METRIC
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 block mt-1">
                ± {navState.currentLocation.accuracyM}m (HIGH)
              </span>
            </div>

            <div className="stitch-glass p-3.5 rounded-xl border border-white/10">
              <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">
                CORRIDOR DRIFT
              </span>
              <span
                className={`text-xs font-mono font-bold block mt-1 ${
                  navState.crossTrackM <= 15 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {Math.round(navState.crossTrackM)}m off center
              </span>
            </div>

            <div className="stitch-glass p-3.5 rounded-xl border border-white/10">
              <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">
                STATUTORY JURISDICTION
              </span>
              <span className="text-xs font-mono font-bold text-cyan-300 block mt-1">
                MVA 1988 / IRC:67
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Alerts Panel HUD (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <UpcomingAlertsPanel
            navState={navState}
            onStartNav={() => navigationService.startNavigation()}
            onPauseNav={() => navigationService.pauseNavigation()}
            onResumeNav={() => navigationService.resumeNavigation()}
            onStopNav={() => navigationService.stopNavigation()}
            onStepForward={(m) => navigationService.stepForward(m)}
            onStepBackward={(m) => navigationService.stepBackward(m)}
            onOpenReportModal={() => setShowReportModal(true)}
            onOpenConfigModal={() => setShowConfigModal(true)}
          />
        </div>
      </div>

      {/* ── Modal: Threshold Configuration ─────────────────────────────────── */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="titanium-panel p-6 rounded-2xl max-w-md w-full border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <h3 className="font-heading font-bold text-white text-base">Advance Alert Thresholds</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white text-lg font-mono"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Configure distances at which voice warnings and HUD countdown alerts trigger ahead of road signs.
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-mono text-slate-300 flex items-center justify-between mb-1">
                  <span>Early Warning (Meters):</span>
                  <span className="text-cyan-400 font-bold">{thresholdEarly}m</span>
                </label>
                <input
                  type="range"
                  min="300"
                  max="1000"
                  step="50"
                  value={thresholdEarly}
                  onChange={(e) => setThresholdEarly(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 flex items-center justify-between mb-1">
                  <span>Primary Warning (Meters):</span>
                  <span className="text-blue-400 font-bold">{thresholdPrimary}m</span>
                </label>
                <input
                  type="range"
                  min="150"
                  max="400"
                  step="25"
                  value={thresholdPrimary}
                  onChange={(e) => setThresholdPrimary(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 flex items-center justify-between mb-1">
                  <span>Immediate Critical Warning (Meters):</span>
                  <span className="text-red-400 font-bold">{thresholdImmediate}m</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="10"
                  value={thresholdImmediate}
                  onChange={(e) => setThresholdImmediate(Number(e.target.value))}
                  className="w-full accent-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 flex items-center justify-between mb-1">
                  <span>Corridor Width Tolerance (Rejects parallel streets):</span>
                  <span className="text-purple-400 font-bold">{corridorTolerance}m</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="60"
                  step="5"
                  value={corridorTolerance}
                  onChange={(e) => setCorridorTolerance(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => setShowConfigModal(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                className="btn-primary text-xs"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Report Missing / Incorrect Traffic Sign ─────────────────── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="titanium-panel p-6 rounded-2xl max-w-md w-full border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-400" />
                <h3 className="font-heading font-bold text-white text-base">Report Road Sign</h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-white text-lg font-mono"
              >
                ✕
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-8 text-center text-emerald-400 flex flex-col items-center gap-2">
                <CheckCircle className="w-12 h-12" />
                <p className="font-heading font-bold text-base text-white">Report Submitted Successfully</p>
                <p className="text-xs text-slate-300">
                  Your report has been logged and queued for administrative review.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="flex flex-col gap-3">
                <p className="text-xs text-slate-400">
                  Help keep the verified traffic sign database accurate. Reports are vetted against official gazettes.
                </p>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">Report Category</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-white/10 text-xs text-white"
                  >
                    <option value="MISSING_SIGN">Missing Sign on Roadway</option>
                    <option value="INCORRECT_SIGN">Incorrect / Outdated Restriction</option>
                    <option value="DAMAGED_SIGN">Damaged / Obscured Sign</option>
                    <option value="OBSOLETE_SIGN">Sign Removed / Obsolete</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">Sign Title / Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Speed Limit 50 km/h or Sharp Curve"
                    value={reportSignName}
                    onChange={(e) => setReportSignName(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-white/10 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">Category</label>
                    <select
                      value={reportCategory}
                      onChange={(e) => setReportCategory(e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-white/10 text-xs text-white"
                    >
                      <option value="Mandatory">Mandatory</option>
                      <option value="Cautionary">Cautionary</option>
                      <option value="Informational">Informational</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">Speed Limit (km/h)</label>
                    <input
                      type="number"
                      placeholder="Optional"
                      value={reportSpeedLimit}
                      onChange={(e) => setReportSpeedLimit(e.target.value ? Number(e.target.value) : '')}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-white/10 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">Observations / Evidence</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Provide details about landmark, kilometer stone, or condition..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-white/10 text-xs text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="btn-primary text-xs"
                  >
                    {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Google Maps API Key Setup ─────────────────────────────────── */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="titanium-panel p-6 rounded-2xl max-w-md w-full border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-400" />
                <h3 className="font-heading font-bold text-white text-base">Google Maps Platform Setup</h3>
              </div>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="text-slate-400 hover:text-white text-lg font-mono"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-3">
              To render satellite tiles, live route calculation, and street views using Google Maps Platform, enter your Google Maps JavaScript API key below.
            </p>

            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/20 text-xs text-slate-300 mb-4">
              <strong className="text-cyan-400 block mb-1">Built-in Fallback Active:</strong>
              If you don't have a Google Maps key right now, AeroVision automatically runs its built-in high-precision vector engine with accurate coordinates, bearings, and voice alerts.
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">Google Maps API Key</label>
              <input
                type="text"
                placeholder="AIzaSy..."
                defaultValue={apiKey}
                id="google-maps-key-input"
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('google-maps-key-input') as HTMLInputElement;
                  handleSaveApiKey(input?.value || '');
                }}
                className="btn-primary text-xs"
              >
                Save & Apply Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
