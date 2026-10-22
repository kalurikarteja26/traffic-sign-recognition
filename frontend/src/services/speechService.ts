// frontend/src/services/speechService.ts
// Robust, Queue-Managed Text-to-Speech Engine with Multi-Language Support (EN / TE / HI)

export type AlertLanguage = 'en' | 'te' | 'hi';

export interface SpeechSettings {
  enabled: boolean;
  language: AlertLanguage;
  volume: number; // 0.0 to 1.0
  rate: number;   // 0.8 to 1.3
  pitch: number;  // 0.9 to 1.1
}

export interface SpeechEvent {
  text: string;
  urgency: 'CRITICAL' | 'WARNING' | 'INFORMATIONAL';
  language?: AlertLanguage;
  timestamp: number;
}

type VisualFallbackCallback = (message: string, isError: boolean) => void;

class SpeechService {
  private settings: SpeechSettings = {
    enabled: true,
    language: 'en',
    volume: 1.0,
    rate: 1.0,
    pitch: 1.0,
  };

  private synth: SpeechSynthesis | null = null;
  private isSpeaking = false;
  private queue: SpeechEvent[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private visualListeners: Set<VisualFallbackCallback> = new Set();
  private availableVoices: SpeechSynthesisVoice[] = [];
  private lastSpokenText = '';
  private lastSpokenTimestamp = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    } else {
      console.warn('[SpeechService] Web Speech API not supported in this browser environment.');
    }

    // Load saved preferences if available
    try {
      const saved = localStorage.getItem('aerovision_tts_settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore storage read error
    }
  }

  private loadVoices() {
    if (this.synth) {
      this.availableVoices = this.synth.getVoices();
    }
  }

  public isSupported(): boolean {
    return this.synth !== null;
  }

  public getSettings(): SpeechSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<SpeechSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem('aerovision_tts_settings', JSON.stringify(this.settings));
    } catch {
      // Ignore
    }
  }

  public onVisualFallback(cb: VisualFallbackCallback) {
    this.visualListeners.add(cb);
    return () => this.visualListeners.delete(cb);
  }

  private notifyVisual(message: string, isError = false) {
    this.visualListeners.forEach((cb) => {
      try {
        cb(message, isError);
      } catch (e) {
        console.error('[SpeechService] Error in visual callback:', e);
      }
    });
  }

  public getLastSpoken(): { text: string; timestamp: number } {
    return { text: this.lastSpokenText, timestamp: this.lastSpokenTimestamp };
  }

  public stop() {
    this.queue = [];
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        console.error('[SpeechService] Cancel failed:', e);
      }
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  /**
   * Speak an alert with priority-aware queueing:
   * CRITICAL interrupts lower priority and speaks immediately.
   * Duplicate within 4 seconds is suppressed.
   */
  public speak(
    text: string,
    urgency: 'CRITICAL' | 'WARNING' | 'INFORMATIONAL' = 'INFORMATIONAL',
    languageOverride?: AlertLanguage
  ) {
    if (!text || text.trim() === '') return;

    // Check duplicate speech in short succession
    const now = Date.now();
    if (text === this.lastSpokenText && now - this.lastSpokenTimestamp < 4000) {
      return;
    }

    // Always deliver to visual notification banner
    this.notifyVisual(text, !this.settings.enabled);

    if (!this.settings.enabled) {
      return;
    }

    if (!this.synth) {
      this.notifyVisual(`[AUDIO UNAVAILABLE] ${text}`, true);
      return;
    }

    const event: SpeechEvent = {
      text,
      urgency,
      language: languageOverride || this.settings.language,
      timestamp: now,
    };

    if (urgency === 'CRITICAL') {
      // Preempt any pending or low-priority speech
      this.stop();
      this.enqueueAndProcess(event);
    } else {
      // If currently speaking a critical alert, don't interrupt
      if (this.isSpeaking && this.currentUtterance && this.queue.some(q => q.urgency === 'CRITICAL')) {
        this.queue.push(event);
      } else {
        this.enqueueAndProcess(event);
      }
    }
  }

  private enqueueAndProcess(event: SpeechEvent) {
    this.queue.push(event);
    if (!this.isSpeaking) {
      this.processNextInQueue();
    }
  }

  private processNextInQueue() {
    if (!this.synth || this.queue.length === 0) {
      this.isSpeaking = false;
      this.currentUtterance = null;
      return;
    }

    // Sort queue by urgency: CRITICAL > WARNING > INFORMATIONAL
    this.queue.sort((a, b) => {
      const p = { CRITICAL: 3, WARNING: 2, INFORMATIONAL: 1 };
      return p[b.urgency] - p[a.urgency];
    });

    const event = this.queue.shift();
    if (!event) return;

    this.isSpeaking = true;
    this.lastSpokenText = event.text;
    this.lastSpokenTimestamp = event.timestamp;

    try {
      const utterance = new SpeechSynthesisUtterance(event.text);
      utterance.volume = Math.max(0.1, Math.min(1.0, this.settings.volume));
      utterance.rate = Math.max(0.7, Math.min(1.3, this.settings.rate));
      utterance.pitch = Math.max(0.8, Math.min(1.2, this.settings.pitch));

      const langCode = this.getLanguageCode(event.language || this.settings.language);
      utterance.lang = langCode;

      // Select voice matching language if available
      const voice = this.selectVoiceForLanguage(langCode);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        // Small 300ms pause between queued utterances for natural pacing
        setTimeout(() => this.processNextInQueue(), 300);
      };

      utterance.onerror = (e) => {
        console.warn('[SpeechService] Synthesis error:', e.error);
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.notifyVisual(`[SPEECH PLAYBACK ERROR: ${e.error}] ${event.text}`, true);
        setTimeout(() => this.processNextInQueue(), 200);
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    } catch (err) {
      console.error('[SpeechService] Utterance failed:', err);
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.notifyVisual(`[SPEECH FAILED] ${event.text}`, true);
      this.processNextInQueue();
    }
  }

  private getLanguageCode(lang: AlertLanguage): string {
    switch (lang) {
      case 'te':
        return 'te-IN';
      case 'hi':
        return 'hi-IN';
      case 'en':
      default:
        return 'en-IN';
    }
  }

  private selectVoiceForLanguage(langCode: string): SpeechSynthesisVoice | null {
    if (!this.availableVoices.length) {
      this.loadVoices();
    }
    // Try exact match e.g. en-IN or te-IN
    const exact = this.availableVoices.find((v) => v.lang.toLowerCase() === langCode.toLowerCase());
    if (exact) return exact;

    // Try language prefix match e.g. te or hi or en
    const prefix = langCode.split('-')[0].toLowerCase();
    const partial = this.availableVoices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    if (partial) return partial;

    // Default fallback
    return this.availableVoices[0] || null;
  }

  /**
   * Test current voice settings with an immediate spoken phrase.
   */
  public testVoiceOutput() {
    const lang = this.settings.language;
    let sample = 'AeroVision avionics active. Speed limit ahead is 40 kilometres per hour. Drive safely.';
    if (lang === 'te') {
      sample = 'ఏరోవిజన్ రక్షణ వ్యవస్థ యాక్టివ్‌గా ఉంది. ముందు పాఠశాల ప్రాంతం. వేగాన్ని తగ్గించండి.';
    } else if (lang === 'hi') {
      sample = 'एरोविज़न सुरक्षा प्रणाली सक्रिय है. आगे गति सीमा चालीस किलोमीटर प्रति घंटा है. सावधानी से चलाएं.';
    }
    this.speak(sample, 'WARNING');
  }
}

export const speechService = new SpeechService();
