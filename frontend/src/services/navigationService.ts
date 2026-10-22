// frontend/src/services/navigationService.ts
// Real-time GPS Tracking, Driving Simulator & Route Corridor Engine

import { api } from '../api';
import { alertEngine } from './alertEngine';
import type { RouteAlertItem } from './alertEngine';
import { speechService } from './speechService';
import type { AlertLanguage } from './speechService';

export interface GpsLocation {
  lat: number;
  lon: number;
  headingDeg: number;
  speedKmh: number;
  accuracyM: number;
  timestamp: number;
  altitudeM?: number | null;
}

export interface RouteCorridor {
  id: string;
  name: string;
  city: string;
  center: { lat: number; lon: number };
  description: string;
  waypoints: [number, number][];
}

export interface NavigationState {
  isActive: boolean;
  isSimulated: boolean;
  isPaused: boolean;
  selectedCorridor: RouteCorridor | null;
  currentLocation: GpsLocation;
  routeWaypoints: [number, number][];
  routeStatus: 'STANDBY' | 'ON_ROUTE' | 'OFF_ROUTE';
  crossTrackM: number;
  totalDistanceM: number;
  completedDistanceM: number;
  remainingDistanceM: number;
  upcomingAlerts: RouteAlertItem[];
  nextAlert: RouteAlertItem | null;
  lastSpokenAlert: { text: string; timestamp: number } | null;
  simulatedSpeedKmh: number;
  gpsSignalStatus: 'HIGH_PRECISION' | 'MODERATE' | 'DEGRADED' | 'STALE' | 'SIMULATED';
  errorMessage: string | null;
}

type NavigationListener = (state: NavigationState) => void;

class NavigationService {
  private state: NavigationState = {
    isActive: false,
    isSimulated: true, // Default to simulation mode for instant desktop testing
    isPaused: false,
    selectedCorridor: null,
    currentLocation: {
      lat: 17.4180,
      lon: 78.3410,
      headingDeg: 45.0,
      speedKmh: 40.0,
      accuracyM: 3.5,
      timestamp: Date.now(),
    },
    routeWaypoints: [],
    routeStatus: 'STANDBY',
    crossTrackM: 0,
    totalDistanceM: 0,
    completedDistanceM: 0,
    remainingDistanceM: 0,
    upcomingAlerts: [],
    nextAlert: null,
    lastSpokenAlert: null,
    simulatedSpeedKmh: 40.0,
    gpsSignalStatus: 'SIMULATED',
    errorMessage: null,
  };

  private listeners: Set<NavigationListener> = new Set();
  private watchId: number | null = null;
  private simIntervalId: any = null;
  private simStepFraction = 0.0;
  private simSegmentIndex = 0;
  private isProcessingTick = false;

  constructor() {
    // Listen for speech fallback events to update state
    speechService.onVisualFallback((msg) => {
      this.state.lastSpokenAlert = { text: msg, timestamp: Date.now() };
      this.notifyListeners();
    });
  }

  public getState(): NavigationState {
    return { ...this.state };
  }

  public subscribe(listener: NavigationListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const s = this.getState();
    this.listeners.forEach((l) => {
      try {
        l(s);
      } catch (e) {
        console.error('[NavigationService] Listener error:', e);
      }
    });
  }

  public setCorridor(corridor: RouteCorridor) {
    this.state.selectedCorridor = corridor;
    this.state.routeWaypoints = corridor.waypoints;
    this.simSegmentIndex = 0;
    this.simStepFraction = 0.0;

    // Set location to start of corridor
    const [startLat, startLon] = corridor.waypoints[0];
    const [nextLat, nextLon] = corridor.waypoints[1] || [startLat, startLon];
    const initBearing = this.calculateBearing(startLat, startLon, nextLat, nextLon);

    this.state.currentLocation = {
      lat: startLat,
      lon: startLon,
      headingDeg: initBearing,
      speedKmh: this.state.simulatedSpeedKmh,
      accuracyM: this.state.isSimulated ? 2.5 : 10.0,
      timestamp: Date.now(),
    };

    alertEngine.resetJourney();
    this.notifyListeners();
    this.matchRouteWithBackend();
  }

  private orientationHandler: any = null;

  public setMode(isSimulated: boolean) {
    this.state.isSimulated = isSimulated;
    this.state.gpsSignalStatus = isSimulated ? 'SIMULATED' : 'MODERATE';
    if (!isSimulated) {
      this.stopSimulation();
      this.startRealGpsTracking();
    } else {
      this.stopRealGpsTracking();
      if (this.state.isActive && !this.state.isPaused) {
        this.startSimulation();
      }
    }
    this.notifyListeners();
  }

  public setSimulatedSpeed(speedKmh: number) {
    this.state.simulatedSpeedKmh = speedKmh;
    this.state.currentLocation.speedKmh = speedKmh;
    this.notifyListeners();
  }

  public startNavigation() {
    this.state.isActive = true;
    this.state.isPaused = false;
    alertEngine.resetJourney();

    if (this.state.isSimulated) {
      this.startSimulation();
    } else {
      this.startRealGpsTracking();
    }

    this.matchRouteWithBackend();
    this.notifyListeners();
  }

  public pauseNavigation() {
    this.state.isPaused = true;
    this.stopSimulation();
    this.notifyListeners();
  }

  public resumeNavigation() {
    this.state.isPaused = false;
    if (this.state.isSimulated) {
      this.startSimulation();
    }
    this.notifyListeners();
  }

  public stopNavigation() {
    this.state.isActive = false;
    this.state.isPaused = false;
    this.stopSimulation();
    this.stopRealGpsTracking();
    alertEngine.resetJourney();
    this.notifyListeners();
  }

  public stepForward(metersJump = 150) {
    if (!this.state.routeWaypoints.length) return;
    this.advanceSimulationDistance(metersJump);
    this.matchRouteWithBackend();
  }

  public stepBackward(metersJump = 150) {
    if (!this.state.routeWaypoints.length) return;
    this.advanceSimulationDistance(-metersJump);
    this.matchRouteWithBackend();
  }

  // ── Driving Simulator Logic ────────────────────────────────────────────────
  private startSimulation() {
    this.stopSimulation();
    const intervalMs = 600; // Tick every 600ms
    this.simIntervalId = setInterval(() => {
      if (!this.state.isActive || this.state.isPaused) return;

      const speedKmh = this.state.simulatedSpeedKmh;
      const metersPerSecond = speedKmh / 3.6;
      const metersThisTick = metersPerSecond * (intervalMs / 1000.0);

      this.advanceSimulationDistance(metersThisTick);
      this.matchRouteWithBackend();
    }, intervalMs);
  }

  private stopSimulation() {
    if (this.simIntervalId) {
      clearInterval(this.simIntervalId);
      this.simIntervalId = null;
    }
  }

  private advanceSimulationDistance(deltaMeters: number) {
    const pts = this.state.routeWaypoints;
    if (pts.length < 2) return;

    let idx = this.simSegmentIndex;
    let [lat1, lon1] = pts[idx];
    let [lat2, lon2] = pts[idx + 1] || pts[idx];

    let segLen = this.haversineMeters(lat1, lon1, lat2, lon2);
    let currentDistanceInSeg = this.simStepFraction * segLen;
    let newDistInSeg = currentDistanceInSeg + deltaMeters;

    if (newDistInSeg >= segLen) {
      // Advance to next segment
      if (idx + 2 < pts.length) {
        this.simSegmentIndex += 1;
        this.simStepFraction = (newDistInSeg - segLen) / Math.max(1, this.haversineMeters(pts[idx + 1][0], pts[idx + 1][1], pts[idx + 2][0], pts[idx + 2][1]));
        [lat1, lon1] = pts[this.simSegmentIndex];
        [lat2, lon2] = pts[this.simSegmentIndex + 1];
      } else {
        // Reached end of corridor: loop smoothly to start for continuous test
        this.simSegmentIndex = 0;
        this.simStepFraction = 0.0;
        [lat1, lon1] = pts[0];
        [lat2, lon2] = pts[1];
        alertEngine.resetJourney();
      }
    } else if (newDistInSeg < 0) {
      if (idx > 0) {
        this.simSegmentIndex -= 1;
        [lat1, lon1] = pts[this.simSegmentIndex];
        [lat2, lon2] = pts[this.simSegmentIndex + 1];
        segLen = this.haversineMeters(lat1, lon1, lat2, lon2);
        this.simStepFraction = 0.9;
      } else {
        this.simStepFraction = 0.0;
      }
    } else {
      this.simStepFraction = segLen > 0 ? newDistInSeg / segLen : 0;
    }

    // Interpolate coordinates
    const frac = Math.max(0, Math.min(1, this.simStepFraction));
    const currLat = lat1 + (lat2 - lat1) * frac;
    const currLon = lon1 + (lon2 - lon1) * frac;
    const currBearing = this.calculateBearing(lat1, lon1, lat2, lon2);

    this.state.currentLocation = {
      lat: Number(currLat.toFixed(6)),
      lon: Number(currLon.toFixed(6)),
      headingDeg: Number(currBearing.toFixed(1)),
      speedKmh: this.state.simulatedSpeedKmh,
      accuracyM: 2.8,
      timestamp: Date.now(),
    };

    this.notifyListeners();
  }

  // ── Real Geolocation Logic ─────────────────────────────────────────────────
  private startRealGpsTracking() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.state.errorMessage = 'Geolocation API not supported on this browser or platform.';
      this.state.isSimulated = true;
      this.notifyListeners();
      return;
    }

    this.stopRealGpsTracking();

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    // Mobile / Handheld device compass orientation listener
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window && !this.orientationHandler) {
      this.orientationHandler = (event: any) => {
        let heading: number | null = null;
        if (event.webkitCompassHeading !== undefined) {
          heading = event.webkitCompassHeading;
        } else if (event.alpha !== null && event.alpha !== undefined) {
          heading = (360 - event.alpha) % 360;
        }
        if (heading !== null && !isNaN(heading)) {
          this.state.currentLocation.headingDeg = Math.round(heading);
          this.notifyListeners();
        }
      };
      try {
        window.addEventListener('deviceorientation', this.orientationHandler, { passive: true });
      } catch (_) {}
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = pos.coords;
        let heading = coords.heading;

        // If device heading is null and compass hasn't provided orientation, compute from previous position
        if ((heading === null || isNaN(heading)) && !this.orientationHandler) {
          heading = this.calculateBearing(
            this.state.currentLocation.lat,
            this.state.currentLocation.lon,
            coords.latitude,
            coords.longitude
          );
        } else if (heading === null || isNaN(heading)) {
          heading = this.state.currentLocation.headingDeg;
        }

        const speedKmh = coords.speed !== null && !isNaN(coords.speed) ? coords.speed * 3.6 : 0;
        const accuracy = coords.accuracy || 10;

        let signal: NavigationState['gpsSignalStatus'] = 'HIGH_PRECISION';
        if (accuracy > 40) signal = 'DEGRADED';
        else if (accuracy > 15) signal = 'MODERATE';

        this.state.currentLocation = {
          lat: coords.latitude,
          lon: coords.longitude,
          headingDeg: heading ?? this.state.currentLocation.headingDeg,
          speedKmh: Math.round(speedKmh * 10) / 10,
          accuracyM: accuracy,
          altitudeM: coords.altitude,
          timestamp: pos.timestamp || Date.now(),
        };

        this.state.gpsSignalStatus = signal;
        this.matchRouteWithBackend();
        this.notifyListeners();
      },
      (err) => {
        console.warn('[NavigationService] Geolocation error:', err.message);
        this.state.gpsSignalStatus = 'DEGRADED';
        this.state.errorMessage = `GPS Tracking: ${err.message}. Switching to simulation fallback.`;
        this.notifyListeners();
      },
      options
    );
  }

  private stopRealGpsTracking() {
    if (this.watchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.orientationHandler && typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', this.orientationHandler);
      this.orientationHandler = null;
    }
  }

  public async quickPinSignAhead(signType: string = 'Stop Sign', distanceM: number = 180) {
    try {
      const loc = this.state.currentLocation;
      await api.quickPinTestSign({
        lat: loc.lat,
        lon: loc.lon,
        heading_deg: loc.headingDeg,
        sign_type: signType,
        distance_ahead_m: distanceM,
      });
      alertEngine.resetJourney();
      await this.matchRouteWithBackend();
      return true;
    } catch (e: any) {
      console.error('[NavigationService] Quick pin failed:', e);
      throw e;
    }
  }

  // ── Backend Route Matching API Call ────────────────────────────────────────
  private async matchRouteWithBackend() {
    if (this.isProcessingTick) return;
    this.isProcessingTick = true;

    try {
      const loc = this.state.currentLocation;
      const waypoints = this.state.routeWaypoints;

      const payload = {
        user_lat: loc.lat,
        user_lon: loc.lon,
        user_heading_deg: loc.headingDeg,
        user_speed_kmh: loc.speedKmh,
        route_waypoints: waypoints,
        corridor_tolerance_m: alertEngine.getConfig().corridorToleranceM,
        heading_tolerance_deg: alertEngine.getConfig().headingToleranceDeg,
        lookahead_meters: alertEngine.getConfig().lookaheadM,
        warning_thresholds: [
          alertEngine.getConfig().earlyThresholdM,
          alertEngine.getConfig().primaryThresholdM,
          alertEngine.getConfig().immediateThresholdM,
        ],
      };

      const res = await api.matchRoute(payload);

      this.state.routeStatus = res.route_status;
      this.state.crossTrackM = res.cross_track_distance_m;

      // Pass matched alerts to local alert engine state machine
      const processed = alertEngine.processRouteAlerts(
        res.upcoming_alerts,
        loc.speedKmh,
        loc.accuracyM,
        speechService.getSettings().language
      );

      this.state.upcomingAlerts = processed.alerts;
      this.state.nextAlert = processed.nextAlert;

      if (processed.announcedThisTick) {
        this.state.lastSpokenAlert = {
          text: processed.announcedThisTick.speech_text,
          timestamp: Date.now(),
        };
      }

      this.notifyListeners();
    } catch (err: any) {
      console.error('[NavigationService] matchRoute failed:', err);
    } finally {
      this.isProcessingTick = false;
    }
  }

  // ── Helper Math Functions ──────────────────────────────────────────────────
  private haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dLambda = ((lon2 - lon1) * Math.PI) / 180;

    const y = Math.sin(dLambda) * Math.cos(phi2);
    const x =
      Math.cos(phi1) * Math.sin(phi2) -
      Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);

    const b = (Math.atan2(y, x) * 180) / Math.PI;
    return (b + 360) % 360;
  }
}

export const navigationService = new NavigationService();
