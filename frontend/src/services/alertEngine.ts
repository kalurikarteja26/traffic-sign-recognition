// frontend/src/services/alertEngine.ts
// Advance Voice Alert State Machine & Duplicate Suppression Engine

import { speechService } from './speechService';
import type { AlertLanguage } from './speechService';

export type AlertStage = 'UPCOMING' | 'EARLY_500M' | 'PRIMARY_200M' | 'IMMEDIATE_100M' | 'PASSED' | 'CANCELLED';

export interface VerifiedSignRecord {
  id: number;
  sign_code?: string;
  sign_name: string;
  category: 'Mandatory' | 'Cautionary' | 'Informational' | string;
  sign_type: string;
  latitude: number;
  longitude: number;
  road_name: string;
  road_segment?: string;
  direction_deg?: number;
  speed_limit?: number | null;
  restriction_details?: string;
  legal_reference?: string;
  penalty_info?: string;
  tts_prompt_en: string;
  tts_prompt_te?: string;
  tts_prompt_hi?: string;
  advance_warning_meters: number;
  verification_status: 'VERIFIED' | 'UNVERIFIED_REPORT' | 'EXPERIMENTAL_DETECTION' | string;
  source: string;
}

export interface RouteAlertItem {
  sign: VerifiedSignRecord;
  eligible: boolean;
  distance_m: number;
  direct_distance_m: number;
  cross_track_m: number;
  bearing_diff_deg: number;
  eta_seconds?: number | null;
  alert_stage: AlertStage;
  speech_text: string;
  urgency: 'CRITICAL' | 'WARNING' | 'INFORMATIONAL';
  reason: string;
}

export interface AlertEngineConfig {
  earlyThresholdM: number;     // e.g. 500
  primaryThresholdM: number;   // e.g. 200
  immediateThresholdM: number; // e.g. 100
  corridorToleranceM: number;  // e.g. 35
  headingToleranceDeg: number; // e.g. 65
  lookaheadM: number;          // e.g. 3000
}

export class AlertEngine {
  private config: AlertEngineConfig = {
    earlyThresholdM: 500,
    primaryThresholdM: 200,
    immediateThresholdM: 100,
    corridorToleranceM: 35,
    headingToleranceDeg: 65,
    lookaheadM: 3000,
  };

  // Tracks announced (signId, stage) -> timestamp to prevent duplicate calls
  private announcedHistory: Map<string, number> = new Map();
  // Tracks passed sign IDs during current route journey
  private passedSignIds: Set<number> = new Set();
  // Active queue of alerts currently approaching
  private activeAlerts: RouteAlertItem[] = [];

  constructor(customConfig?: Partial<AlertEngineConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
  }

  public getConfig(): AlertEngineConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AlertEngineConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public resetJourney() {
    this.announcedHistory.clear();
    this.passedSignIds.clear();
    this.activeAlerts = [];
    speechService.stop();
  }

  /**
   * Evaluates server route-matched alerts, updates lifecycle states,
   * performs duplicate suppression, and dispatches timely voice announcements.
   */
  public processRouteAlerts(
    incomingAlerts: RouteAlertItem[],
    userSpeedKmh: number = 0,
    gpsAccuracyM: number = 5,
    currentLanguage: AlertLanguage = 'en'
  ): {
    alerts: RouteAlertItem[];
    nextAlert: RouteAlertItem | null;
    announcedThisTick: RouteAlertItem | null;
  } {
    // If GPS accuracy is severely degraded (> 45m), hold voice alerts to prevent false triggers
    if (gpsAccuracyM > 45) {
      return { alerts: incomingAlerts, nextAlert: incomingAlerts[0] || null, announcedThisTick: null };
    }

    const early = this.config.earlyThresholdM;
    const primary = this.config.primaryThresholdM;
    const immediate = this.config.immediateThresholdM;

    let announcedThisTick: RouteAlertItem | null = null;
    const processed: RouteAlertItem[] = [];

    for (const item of incomingAlerts) {
      const signId = item.sign.id;

      // Skip already passed signs
      if (this.passedSignIds.has(signId) || item.distance_m < 8) {
        this.passedSignIds.add(signId);
        processed.push({ ...item, alert_stage: 'PASSED' });
        continue;
      }

      // Determine appropriate stage for current distance
      let stage: AlertStage = 'UPCOMING';
      if (item.distance_m <= immediate) {
        stage = 'IMMEDIATE_100M';
      } else if (item.distance_m <= primary) {
        stage = 'PRIMARY_200M';
      } else if (item.distance_m <= early) {
        stage = 'EARLY_500M';
      }

      // Formulate localized speech text matching the user's selected language & stage
      const speechText = this.getLocalizedPrompt(item.sign, stage, currentLanguage);

      const updatedItem: RouteAlertItem = {
        ...item,
        alert_stage: stage,
        speech_text: speechText
      };
      processed.push(updatedItem);

      // Evaluate voice announcement eligibility
      // We announce once at EARLY_500M (for highways/critical), once at PRIMARY_200M, and once at IMMEDIATE_100M
      const historyKey = `${signId}:${stage}`;
      const hasAnnouncedThisStage = this.announcedHistory.has(historyKey);

      // Check if this sign requires voice trigger at this stage
      const shouldTrigger =
        !hasAnnouncedThisStage &&
        (stage === 'PRIMARY_200M' ||
          stage === 'IMMEDIATE_100M' ||
          (stage === 'EARLY_500M' && (userSpeedKmh > 55 || item.urgency === 'CRITICAL')));

      if (shouldTrigger && !announcedThisTick) {
        // Record announcement
        this.announcedHistory.set(historyKey, Date.now());
        announcedThisTick = updatedItem;

        // Dispatch to Speech Service
        speechService.speak(speechText, updatedItem.urgency, currentLanguage);
      }
    }

    this.activeAlerts = processed;
    const nextAlert = processed.find((a) => a.alert_stage !== 'PASSED') || null;

    return {
      alerts: processed,
      nextAlert,
      announcedThisTick,
    };
  }

  private getLocalizedPrompt(
    sign: VerifiedSignRecord,
    stage: AlertStage,
    lang: AlertLanguage
  ): string {
    let base = sign.tts_prompt_en;
    if (lang === 'te' && sign.tts_prompt_te) {
      base = sign.tts_prompt_te;
    } else if (lang === 'hi' && sign.tts_prompt_hi) {
      base = sign.tts_prompt_hi;
    }

    if (stage === 'IMMEDIATE_100M') {
      if (lang === 'te') {
        return `తక్షణ హెచ్చరిక: ${base}`;
      } else if (lang === 'hi') {
        return `तत्काल चेतावनी: ${base}`;
      }
      return `Immediate alert: ${base}`;
    }

    if (stage === 'EARLY_500M') {
      if (lang === 'te') {
        return `ముందస్తు హెచ్చరిక: 500 మీటర్ల దూరంలో ${sign.sign_name}.`;
      } else if (lang === 'hi') {
        return `अग्रिम चेतावनी: 500 मीटर में ${sign.sign_name}.`;
      }
      return `Advance notice: ${sign.sign_name} 500 metres ahead.`;
    }

    return base;
  }
}

export const alertEngine = new AlertEngine();
