// frontend/src/services/speechService.ts
// Robust, Queue-Managed Text-to-Speech Engine with Multi-Language Support (EN / TE / HI)
// Zero-overlap audio lock, natural ADAS rhythm & cadence, and authentic native streaming support

import { getApiBase } from '../api';

export type AlertLanguage = 'en' | 'te' | 'hi' | 'all';
export type AlertSource = 'CAMERA' | 'NAVIGATION' | 'MANUAL' | 'SYSTEM';

export interface SpeechSettings {
  enabled: boolean;
  language: AlertLanguage;
  volume: number; // 0.0 to 1.0
  rate: number;   // 0.8 to 1.3
  pitch: number;  // 0.9 to 1.1
  chimeEnabled: boolean;
}

export interface SpeechEvent {
  text: string;
  urgency: 'CRITICAL' | 'WARNING' | 'INFORMATIONAL';
  language?: AlertLanguage;
  source?: AlertSource;
  timestamp: number;
}

type VisualFallbackCallback = (message: string, isError: boolean) => void;

// Transliteration lookup table for offline phonetic fallback
const PHONETIC_MAP: Record<string, string> = {
  // Telugu phrases
  'హెచ్చరిక: ఆగు సంకేతం గుర్తించబడింది. వాహనాన్ని పూర్తిగా నిలపండి.':
    'Hechcharika! Stop sign gurthinchabadindi. Vaahanaanni poorthigaa nilapandi.',
  'హెచ్చరిక: వేగ పరిమితి పాటించండి.':
    'Hechcharika! Vega parimithi paatinchandi.',
  'తప్పనిసరి సంకేతం: నిబంధనలను పాటించండి.':
    'Thappanisari sanketham. Nibandhanalanu paatinchandi.',
  'హెచ్చరిక: జాగ్రత్తగా నడపండి.':
    'Hechcharika! Jaagraththagaa nadapandi.',
  'ఏరోవిజన్ రక్షణ వ్యవస్థ యాక్టివ్‌గా ఉంది. ముందు పాఠశాల ప్రాంతం. వేగాన్ని తగ్గించండి.':
    'AeroVision rakshana vyavastha active gaa undi. Mundu paatashaala praantham. Veganni thagginchandi.',

  // Hindi phrases
  'चेतावनी: स्टॉप साइन पहचाना गया। वाहन को पूरी तरह रोकें।':
    'Chetaavani! Stop sign pehchaana gaya. Vaahan ko poori tarah rokein.',
  'चेतावनी: गति सीमा का पालन करें।':
    'Chetaavani! Gati seema ka paalan karein.',
  'अनिवार्य संकेत: नियमों का पालन करें।':
    'Anivaarya sanket. Niyamon ka paalan karein.',
  'चेतावनी: सावधानी से वाहन चलाएं।':
    'Chetaavani! Saavdhani se vaahan chalaayein.',
  'एरोविज़न सुरक्षा प्रणाली सक्रिय है. आगे गति सीमा चालीस किलोमीटर प्रति घंटा है. सावधानी से चलाएं.':
    'AeroVision suraksha pranali sakriya hai. Aage gati seema chaalis kilometer prati ghanta hai. Saavdhani se chalaayein.',
};

class SpeechService {
  private settings: SpeechSettings = {
    enabled: true,
    language: 'en',
    volume: 1.0,
    rate: 1.0,
    pitch: 1.0,
    chimeEnabled: true,
  };

  private synth: SpeechSynthesis | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentSessionId = 0;
  private isSpeaking = false;
  private speakingStartedAt = 0;
  private queue: SpeechEvent[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private visualListeners: Set<VisualFallbackCallback> = new Set();
  private availableVoices: SpeechSynthesisVoice[] = [];
  private lastSpokenText = '';
  private lastSpokenTimestamp = 0;
  private audioCtx: AudioContext | null = null;
  private exclusiveSource: AlertSource | null = null;
  private processingTimeout: any = null;

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
    return this.synth !== null || typeof Audio !== 'undefined';
  }

  public isCurrentlySpeaking(): boolean {
    const isAudioActive = Boolean(this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended);
    const now = Date.now();

    if (isAudioActive || this.isSpeaking) {
      // Auto-unlocking watchdog: prevents speech lock if an utterance or audio stalls
      // Multilingual 3-language sequence takes up to 12s; if exceeded 14s, auto-reset!
      if (this.speakingStartedAt > 0 && now - this.speakingStartedAt > 14000) {
        console.warn('[SpeechService] Watchdog timer expired: auto-resetting speech lock');
        this.forceResetSpeech();
        return false;
      }
      return true;
    }
    return false;
  }

  public forceResetSpeech() {
    this.currentSessionId++;
    this.queue = [];
    this.isSpeaking = false;
    this.speakingStartedAt = 0;
    this.currentUtterance = null;
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }
    if (this.currentAudio) {
      try {
        (this.currentAudio as any).__isAborted = true;
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch (_) {}
      this.currentAudio = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
        if (this.synth.paused) {
          this.synth.resume();
        }
      } catch (_) {}
    }
  }

  public clearLastSpoken() {
    this.lastSpokenText = '';
    this.lastSpokenTimestamp = 0;
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

  public setLanguage(lang: AlertLanguage) {
    this.updateSettings({ language: lang });
  }

  /**
   * Proactively unlock Web Audio, SpeechSynthesis, and HTMLAudio pipelines.
   * Mobile browsers (Android Chrome, iOS Safari) strictly require AudioContext.resume()
   * and SpeechSynthesis activation during a user gesture (tap/click/touch) before
   * camera stream callbacks can play audio alerts.
   */
  public async unlockAudio(): Promise<boolean> {
    try {
      // 1. Resume / Initialize Web Audio Context
      const AudioCtxClass =
        typeof window !== 'undefined'
          ? window.AudioContext || (window as any).webkitAudioContext
          : null;
      if (AudioCtxClass) {
        if (!this.audioCtx || this.audioCtx.state === 'closed') {
          this.audioCtx = new AudioCtxClass();
        }
        if (this.audioCtx.state === 'suspended') {
          await this.audioCtx.resume().catch(() => {});
        }
        // Play an imperceptible 1-sample silent Web Audio buffer
        try {
          const buffer = this.audioCtx.createBuffer(1, 1, 22050);
          const source = this.audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(this.audioCtx.destination);
          source.start(0);
        } catch (_) {}
      }

      // 2. Clean resume of SpeechSynthesis (WITHOUT deadlocking Chromium with empty/space utterance!)
      if (this.synth) {
        try {
          this.synth.cancel();
          if (this.synth.paused) {
            this.synth.resume();
          }
        } catch (_) {}
      }

      // 3. Prime HTML5 Audio with a 1-sample silent WAV data URI
      try {
        const silentWav =
          'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
        const a = new Audio(silentWav);
        a.volume = 0.01;
        const p = a.play();
        if (p !== undefined) {
          p.catch(() => {});
        }
      } catch (_) {}

      return true;
    } catch (e) {
      console.warn('[SpeechService] Unlock audio attempt:', e);
      return false;
    }
  }

  /**
   * Set exclusive source lock (e.g. 'CAMERA' when live camera detection is active).
   * Background simulated alerts from other sources will be politely suppressed.
   */
  public setExclusiveSource(source: AlertSource | null) {
    this.exclusiveSource = source;
  }

  public getExclusiveSource(): AlertSource | null {
    return this.exclusiveSource;
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

  /**
   * Play a subtle acoustic pre-alert tone (dual harmonic sine tone) for rhythmic ADAS pacing.
   */
  private playPreAlertChime(): Promise<void> {
    if (!this.settings.chimeEnabled || typeof window === 'undefined') {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) {
          resolve();
          return;
        }
        if (!this.audioCtx || this.audioCtx.state === 'closed') {
          this.audioCtx = new AudioCtxClass();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }

        const now = this.audioCtx.currentTime;
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now);
        osc2.frequency.exponentialRampToValueAtTime(783.99, now + 0.08); // G5

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.08 * this.settings.volume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.13);
        osc2.stop(now + 0.13);

        setTimeout(() => resolve(), 130);
      } catch {
        resolve();
      }
    });
  }

  /**
   * Checks whether the current operating system/browser provides a native TTS voice for the language.
   */
  public hasNativeVoiceFor(lang: AlertLanguage): boolean {
    if (!this.synth) return false;
    if (!this.availableVoices.length) {
      this.loadVoices();
    }
    const prefix = lang === 'te' ? 'te' : lang === 'hi' ? 'hi' : 'en';
    return this.availableVoices.some((v) => v.lang.toLowerCase().startsWith(prefix));
  }

  /**
   * Full, clean stop with zero race conditions.
   * Increments currentSessionId to invalidate any in-flight promises and prevent overlapping speech synthesis.
   */
  public stop() {
    this.currentSessionId++;
    this.queue = [];

    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }

    if (this.currentAudio) {
      try {
        (this.currentAudio as any).__isAborted = true;
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch (e) {
        console.error('[SpeechService] Audio stop failed:', e);
      }
      this.currentAudio = null;
    }

    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        console.error('[SpeechService] Synth cancel failed:', e);
      }
    }

    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  /**
   * Speak an alert with priority-aware queueing, source exclusivity, and calm ADAS rhythm.
   */
  public speak(
    text: string,
    urgency: 'CRITICAL' | 'WARNING' | 'INFORMATIONAL' = 'INFORMATIONAL',
    languageOverride?: AlertLanguage,
    source: AlertSource = 'SYSTEM'
  ) {
    if (!text || text.trim() === '') return;

    // Source exclusivity: if exclusiveSource is set (e.g. CAMERA), suppress background NAVIGATION alerts
    if (this.exclusiveSource && source !== this.exclusiveSource && source !== 'MANUAL' && urgency !== 'CRITICAL') {
      return;
    }

    // Anti-overlap: If an alert is actively speaking, politely ignore new stream triggers unless MANUAL/CRITICAL
    if (source !== 'MANUAL' && urgency !== 'CRITICAL' && this.isCurrentlySpeaking()) {
      return;
    }

    const now = Date.now();

    // Rhythmic Cadence Guard:
    // If the identical alert was spoken within 6 seconds, suppress it to prevent nagging.
    if (text === this.lastSpokenText && now - this.lastSpokenTimestamp < 6000) {
      return;
    }

    // Always deliver to visual notification banner for driver awareness
    this.notifyVisual(text, !this.settings.enabled);

    if (!this.settings.enabled) {
      return;
    }

    const event: SpeechEvent = {
      text,
      urgency,
      language: languageOverride || this.settings.language,
      source,
      timestamp: now,
    };

    if (urgency === 'CRITICAL') {
      // True emergency: Stop current audio, clear lower-urgency queue, and play immediately
      this.stop();
      this.enqueueAndProcess(event);
    } else {
      // For warning / informational, queue politely without cutting off in-flight audio
      this.enqueueAndProcess(event);
    }
  }

  private enqueueAndProcess(event: SpeechEvent) {
    // Drop duplicates in queue
    if (this.queue.some((q) => q.text === event.text)) {
      return;
    }

    // Limit queue size to avoid alert backlog
    if (this.queue.length >= 3) {
      this.queue.shift();
    }

    this.queue.push(event);

    if (!this.isSpeaking) {
      this.processNextInQueue();
    }
  }

  private async processNextInQueue() {
    if (this.queue.length === 0) {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.currentAudio = null;
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
    this.speakingStartedAt = Date.now();
    this.lastSpokenText = event.text;
    this.lastSpokenTimestamp = event.timestamp;

    const targetLang = event.language || this.settings.language;
    const hasNative = this.hasNativeVoiceFor(targetLang);

    // Play subtle ADAS chime before spoken prompt
    await this.playPreAlertChime();

    // Check if stopped during chime
    if (!this.isSpeaking) return;

    // Use backend authentic voice generation for Telugu & Hindi when browser lacks a native system voice
    if ((targetLang === 'te' || targetLang === 'hi') && !hasNative) {
      this.playStreamingAudio(event, targetLang);
    } else {
      this.playUtterance(event, targetLang);
    }
  }

  /**
   * Plays authentic high-definition audio generated via backend /api/ai/tts endpoint.
   * Completely immune to AbortError overlaps and multiple parallel streams.
   */
  private playStreamingAudio(event: SpeechEvent, lang: AlertLanguage) {
    const sessionId = ++this.currentSessionId;

    // Ensure speech synthesis is completely silent
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (_) {}
    }

    try {
      const audioUrl = `${getApiBase()}/ai/tts?text=${encodeURIComponent(event.text)}&lang=${lang}`;
      const audio = new Audio(audioUrl);
      audio.volume = Math.max(0.1, Math.min(1.0, this.settings.volume));
      audio.playbackRate = Math.max(0.7, Math.min(1.3, this.settings.rate));

      this.currentAudio = audio;

      audio.onended = () => {
        if (this.currentSessionId !== sessionId) return;
        this.isSpeaking = false;
        this.currentAudio = null;
        // Calm rhythm: 650ms breathing pause before processing next queue item
        this.processingTimeout = setTimeout(() => this.processNextInQueue(), 650);
      };

      audio.onerror = (e) => {
        if (this.currentSessionId !== sessionId || (audio as any).__isAborted) return;
        console.warn('[SpeechService] Streaming audio failed, falling back to phonetic TTS:', e);
        this.currentAudio = null;
        this.playPhoneticFallback(event, lang, sessionId);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // If playback was aborted intentionally by stop() or new alert, IGNORE it!
          if (
            this.currentSessionId !== sessionId ||
            (audio as any).__isAborted ||
            err.name === 'AbortError'
          ) {
            return;
          }
          console.warn('[SpeechService] Audio play error (e.g. autoplay restriction):', err);
          this.currentAudio = null;
          this.playPhoneticFallback(event, lang, sessionId);
        });
      }
    } catch (err) {
      if (this.currentSessionId !== sessionId) return;
      console.warn('[SpeechService] Exception during audio stream:', err);
      this.playPhoneticFallback(event, lang, sessionId);
    }
  }

  /**
   * Plays speech using browser's native SpeechSynthesisUtterance.
   */
  private playUtterance(event: SpeechEvent, lang: AlertLanguage) {
    const sessionId = ++this.currentSessionId;

    // Ensure audio element is completely stopped
    if (this.currentAudio) {
      try {
        (this.currentAudio as any).__isAborted = true;
        this.currentAudio.pause();
        this.currentAudio = null;
      } catch (_) {}
    }

    if (!this.synth) {
      this.playStreamingAudio(event, lang);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(event.text);
      utterance.volume = Math.max(0.1, Math.min(1.0, this.settings.volume));
      utterance.rate = Math.max(0.7, Math.min(1.3, this.settings.rate));
      utterance.pitch = Math.max(0.8, Math.min(1.2, this.settings.pitch));

      const langCode = this.getLanguageCode(lang);
      utterance.lang = langCode;

      const voice = this.selectVoiceForLanguage(langCode);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        if (this.currentSessionId !== sessionId) return;
        this.isSpeaking = false;
        this.currentUtterance = null;
        if (this.synth) {
          try { this.synth.cancel(); } catch (_) {}
        }
        // Crisp pacing: 250ms breathing pause before processing next queue item
        this.processingTimeout = setTimeout(() => this.processNextInQueue(), 250);
      };

      utterance.onerror = (e) => {
        if (this.currentSessionId !== sessionId) return;
        console.warn('[SpeechService] Synthesis error, falling back to streaming audio:', e.error);
        this.isSpeaking = false;
        this.currentUtterance = null;
        if (this.synth) {
          try { this.synth.cancel(); } catch (_) {}
        }
        this.playStreamingAudio(event, lang);
      };

      this.currentUtterance = utterance;
      // Prevent Chromium / WebKit Garbage Collection bug mid-utterance
      (window as any).__aerovisionActiveUtterance = utterance;

      if (this.synth.paused) {
        try {
          this.synth.resume();
        } catch (_) {}
      }

      this.synth.speak(utterance);
    } catch (err) {
      if (this.currentSessionId !== sessionId) return;
      console.error('[SpeechService] Utterance failed:', err);
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.notifyVisual(`[SPEECH FAILED] ${event.text}`, true);
      this.processingTimeout = setTimeout(() => this.processNextInQueue(), 400);
    }
  }

  /**
   * Emergency fallback for offline environments without regional voices.
   */
  private playPhoneticFallback(event: SpeechEvent, lang: AlertLanguage, sessionId: number) {
    if (this.currentSessionId !== sessionId) return;

    const rawText = event.text;
    let phoneticText = PHONETIC_MAP[rawText];

    if (!phoneticText) {
      if (lang === 'te') {
        phoneticText = rawText
          .replace(/హెచ్చరిక/g, 'Hechcharika')
          .replace(/సంకేతం/g, 'sanketham')
          .replace(/గుర్తించబడింది/g, 'gurthinchabadindi')
          .replace(/నిబంధనలను పాటించండి/g, 'nibandhanalanu paatinchandi')
          .replace(/వేగ పరిమితి/g, 'vega parimithi')
          .replace(/జాగ్రత్తగా నడపండి/g, 'jaagraththaga nadapandi');
      } else if (lang === 'hi') {
        phoneticText = rawText
          .replace(/चेतावनी/g, 'Chetaavani')
          .replace(/पहचाना गया/g, 'pehchaana gaya')
          .replace(/नियमों का पालन करें/g, 'niyamon ka paalan karein')
          .replace(/गति सीमा/g, 'gati seema')
          .replace(/सावधानी से चलाएं/g, 'saavdhani se chalaayein');
      } else {
        phoneticText = rawText;
      }
    }

    if (!this.synth) {
      this.isSpeaking = false;
      this.processingTimeout = setTimeout(() => this.processNextInQueue(), 650);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(phoneticText);
      utterance.volume = this.settings.volume;
      utterance.rate = 0.9;
      utterance.lang = 'en-IN';

      utterance.onend = () => {
        if (this.currentSessionId !== sessionId) return;
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.processingTimeout = setTimeout(() => this.processNextInQueue(), 650);
      };

      utterance.onerror = () => {
        if (this.currentSessionId !== sessionId) return;
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.processingTimeout = setTimeout(() => this.processNextInQueue(), 400);
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    } catch {
      if (this.currentSessionId !== sessionId) return;
      this.isSpeaking = false;
      this.processingTimeout = setTimeout(() => this.processNextInQueue(), 400);
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
    const exact = this.availableVoices.find((v) => v.lang.toLowerCase() === langCode.toLowerCase());
    if (exact) return exact;

    const prefix = langCode.split('-')[0].toLowerCase();
    const partial = this.availableVoices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    if (partial) return partial;

    if (prefix === 'en') {
      const enVoice = this.availableVoices.find((v) => v.lang.toLowerCase().startsWith('en'));
      if (enVoice) return enVoice;
      return this.availableVoices[0] || null;
    }

    return null;
  }

  /**
   * Sequential Multilingual Speech Announcer:
   * Chains English -> pause(450ms) -> Telugu -> pause(450ms) -> Hindi.
   * Completely asynchronous, clean, non-overlapping with dynamic language state callbacks.
   */
  public async speakSequentialMultilingual(
    prompts: { en: string; te?: string; hi?: string },
    urgency: 'CRITICAL' | 'WARNING' | 'INFORMATIONAL' = 'WARNING',
    onLangChange?: (lang: AlertLanguage | null) => void,
    source: AlertSource = 'CAMERA',
    force: boolean = false
  ): Promise<void> {
    if (!this.settings.enabled) return;
    if (this.exclusiveSource && source !== this.exclusiveSource && source !== 'MANUAL' && urgency !== 'CRITICAL') {
      return;
    }

    // Anti-overlap: If an alert is actively speaking, politely ignore new stream triggers unless MANUAL/CRITICAL
    if (!force && source !== 'MANUAL' && urgency !== 'CRITICAL' && this.isCurrentlySpeaking()) {
      return;
    }

    const enText = prompts.en?.trim();
    const teText = prompts.te?.trim() || prompts.en?.trim();
    const hiText = prompts.hi?.trim() || prompts.en?.trim();

    if (!enText) return;

    // Cadence check: if this alert was just spoken within 6 seconds, do not repeat unless forced
    const now = Date.now();
    if (!force && enText === this.lastSpokenText && now - this.lastSpokenTimestamp < 6000) {
      return;
    }

    this.stop();
    const sessionId = ++this.currentSessionId;
    this.isSpeaking = true;
    this.speakingStartedAt = now;
    this.lastSpokenText = enText;
    this.lastSpokenTimestamp = now;

    // Step 0: Pre-alert chime
    await this.playPreAlertChime();
    if (this.currentSessionId !== sessionId) return;

    // 1. English
    this.speakingStartedAt = Date.now();
    onLangChange?.('en');
    this.notifyVisual(enText, false);
    await this.playPhrasePromise(enText, 'en', urgency, sessionId);
    if (this.currentSessionId !== sessionId) {
      onLangChange?.(null);
      return;
    }

    // 250ms cadence pause
    await new Promise((r) => setTimeout(r, 250));
    if (this.currentSessionId !== sessionId) {
      onLangChange?.(null);
      return;
    }

    // 2. Telugu
    if (teText) {
      this.speakingStartedAt = Date.now();
      onLangChange?.('te');
      this.notifyVisual(teText, false);
      await this.playPhrasePromise(teText, 'te', urgency, sessionId);
      if (this.currentSessionId !== sessionId) {
        onLangChange?.(null);
        return;
      }
      // 250ms cadence pause
      await new Promise((r) => setTimeout(r, 250));
      if (this.currentSessionId !== sessionId) {
        onLangChange?.(null);
        return;
      }
    }

    // 3. Hindi
    if (hiText) {
      this.speakingStartedAt = Date.now();
      onLangChange?.('hi');
      this.notifyVisual(hiText, false);
      await this.playPhrasePromise(hiText, 'hi', urgency, sessionId);
      if (this.currentSessionId !== sessionId) {
        onLangChange?.(null);
        return;
      }
    }

    this.isSpeaking = false;
    this.speakingStartedAt = 0;
    if (this.synth) {
      try { this.synth.cancel(); } catch (_) {}
    }
    onLangChange?.(null);
  }

  private playPhrasePromise(
    text: string,
    lang: AlertLanguage,
    urgency: 'CRITICAL' | 'WARNING' | 'INFORMATIONAL',
    sessionId: number
  ): Promise<void> {
    return new Promise((resolve) => {
      if (this.currentSessionId !== sessionId) {
        resolve();
        return;
      }

      let settled = false;
      const safeResolve = () => {
        if (settled) return;
        settled = true;
        clearTimeout(safetyTimer);
        this.currentAudio = null;
        this.currentUtterance = null;
        if (this.synth) {
          try { this.synth.cancel(); } catch (_) {}
        }
        resolve();
      };

      // Failsafe safety timeout: ensures promise never hangs if mobile browser drops onend event
      const safetyTimer = setTimeout(() => {
        safeResolve();
      }, Math.max(3000, Math.min(9000, text.length * 110)));

      const hasNative = this.hasNativeVoiceFor(lang);
      if ((lang === 'te' || lang === 'hi') && !hasNative) {
        // Use streaming audio from backend
        try {
          const audioUrl = `${getApiBase()}/ai/tts?text=${encodeURIComponent(text)}&lang=${lang}`;
          const audio = new Audio(audioUrl);
          audio.volume = Math.max(0.1, Math.min(1.0, this.settings.volume));
          audio.playbackRate = Math.max(0.7, Math.min(1.3, this.settings.rate));
          this.currentAudio = audio;

          audio.onended = () => {
            safeResolve();
          };
          audio.onerror = () => {
            this.playPhoneticPhrase(text, lang, sessionId).then(safeResolve);
          };
          const p = audio.play();
          if (p !== undefined) {
            p.catch((err) => {
              if (err.name !== 'AbortError') {
                this.playPhoneticPhrase(text, lang, sessionId).then(safeResolve);
              } else {
                safeResolve();
              }
            });
          }
        } catch {
          this.playPhoneticPhrase(text, lang, sessionId).then(safeResolve);
        }
      } else {
        // Native SpeechSynthesisUtterance
        if (!this.synth) {
          // Fall back to backend audio stream if synth is not supported
          try {
            const audioUrl = `${getApiBase()}/ai/tts?text=${encodeURIComponent(text)}&lang=${lang}`;
            const audio = new Audio(audioUrl);
            audio.volume = Math.max(0.1, Math.min(1.0, this.settings.volume));
            this.currentAudio = audio;
            audio.onended = safeResolve;
            audio.onerror = safeResolve;
            const p = audio.play();
            if (p) p.catch(safeResolve);
          } catch {
            safeResolve();
          }
          return;
        }
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.volume = Math.max(0.1, Math.min(1.0, this.settings.volume));
          utterance.rate = Math.max(0.7, Math.min(1.3, this.settings.rate));
          utterance.pitch = Math.max(0.8, Math.min(1.2, this.settings.pitch));
          const code = this.getLanguageCode(lang);
          utterance.lang = code;
          const voice = this.selectVoiceForLanguage(code);
          if (voice) utterance.voice = voice;

          utterance.onend = () => {
            safeResolve();
          };
          utterance.onerror = (e) => {
            console.warn('[SpeechService] Synthesis error on utterance, falling back:', e);
            // Fall back to backend TTS stream on synthesis error
            try {
              const audioUrl = `${getApiBase()}/ai/tts?text=${encodeURIComponent(text)}&lang=${lang}`;
              const audio = new Audio(audioUrl);
              audio.volume = Math.max(0.1, Math.min(1.0, this.settings.volume));
              this.currentAudio = audio;
              audio.onended = safeResolve;
              audio.onerror = safeResolve;
              const p = audio.play();
              if (p) p.catch(safeResolve);
            } catch {
              safeResolve();
            }
          };
          this.currentUtterance = utterance;
          (window as any).__aerovisionActiveUtterance = utterance;

          if (this.synth.paused) {
            try {
              this.synth.resume();
            } catch (_) {}
          }

          this.synth.speak(utterance);
        } catch {
          safeResolve();
        }
      }
    });
  }

  private playPhoneticPhrase(text: string, lang: AlertLanguage, sessionId: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.currentSessionId !== sessionId || !this.synth) {
        resolve();
        return;
      }
      let settled = false;
      const safeResolve = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(safeResolve, Math.max(2500, text.length * 100));

      let phoneticText = PHONETIC_MAP[text];
      if (!phoneticText) {
        // High-fidelity transliteration for Indian regional prompts to Roman phonetic script
        phoneticText = text
          .replace(/హెచ్చరిక[:\s]*/g, 'Hechcharika! ')
          .replace(/సమాచారం[:\s]*/g, 'Samaachaaram! ')
          .replace(/నియంత్రణ[:\s]*/g, 'Niyanthrana! ')
          .replace(/ఆగు సంకేతం/g, 'Stop sign')
          .replace(/దారి ఇవ్వండి/g, 'Daari ivvandi, yield')
          .replace(/కుడి వైపు మలుపు/g, 'kudi vaipu malupu, right curve')
          .replace(/ఎడమ వైపు మలుపు/g, 'edama vaipu malupu, left curve')
          .replace(/వేగాన్ని తగ్గించండి/g, 'vegaanni thagginchandi, reduce speed')
          .replace(/వేగం తగ్గించండి/g, 'vegam thagginchandi, slow down')
          .replace(/వాహనాన్ని పూర్తిగా నిలపండి/g, 'vaahanaanni poorthigaa nilapandi')
          .replace(/గుర్తించబడింది/g, 'gurthinchabadindi')
          .replace(/నిబంధనలను పాటించండి/g, 'nibandhanalanu paatinchandi')
          .replace(/పాఠశాల ప్రాంతం/g, 'paatashaala praantham, school ahead')
          .replace(/పాదచారుల క్రాసింగ్/g, 'paadachaarula crossing, pedestrian crossing')
          .replace(/ప్రవేశం నిషేధించబడింది/g, 'pravesham nishedhinchabadindi, no entry')
          .replace(/చేतावनी[:\s]*/g, 'Chetaavani! ')
          .replace(/सावधानी[:\s]*/g, 'Saavdhani! ')
          .replace(/सूचना[:\s]*/g, 'Soochna! ')
          .replace(/स्टॉप साइन/g, 'Stop sign')
          .replace(/रास्ता दें/g, 'Raasta dein, give way')
          .replace(/दाहिना मोड़/g, 'daahina mod, right turn')
          .replace(/बायां मोड़/g, 'baayan mod, left turn')
          .replace(/गति धीमी करें/g, 'gati dheemi karein, slow down')
          .replace(/वाहन को पूरी तरह रोकें/g, 'vaahan ko poori tarah rokein')
          .replace(/पहचाना गया/g, 'pehchaana gaya')
          .replace(/नियमों का पालन करें/g, 'niyamon ka paalan karein')
          .replace(/स्कूल आगे है/g, 'school aage hai')
          .replace(/पैदल पार पथ/g, 'paidal paar path, pedestrian crossing');

        // If non-ASCII characters remain, clean them so English synthesizer speaks cleanly
        phoneticText = phoneticText.replace(/[^\x00-\x7F]+/g, ' ').replace(/\s+/g, ' ').trim();
        if (!phoneticText || phoneticText.length < 3) {
          phoneticText = lang === 'te' ? 'Hechcharika! Traffic sign ahead.' : 'Chetaavani! Traffic sign ahead.';
        }
      }
      try {
        if (this.synth.paused) {
          try {
            this.synth.resume();
          } catch (_) {}
        }
        const u = new SpeechSynthesisUtterance(phoneticText);
        u.volume = this.settings.volume;
        u.rate = 0.95;
        u.lang = 'en-IN';
        u.onend = safeResolve;
        u.onerror = safeResolve;
        (window as any).__aerovisionActiveUtterance = u;
        this.synth.speak(u);
      } catch {
        safeResolve();
      }
    });
  }

  /**
   * Test current voice settings with an immediate spoken phrase in the active language.
   */
  public testVoiceOutput(onLangChange?: (lang: AlertLanguage | null) => void) {
    const lang = this.settings.language;
    if (lang === 'en' || (lang as string) === 'all') {
      const sampleEn = 'AeroVision avionics active. Speed limit ahead is 40 kilometres per hour. Drive safely.';
      const sampleTe = 'ఏరోవిజన్ రక్షణ వ్యవస్థ యాక్టివ్‌గా ఉంది. ముందు పాఠశాల ప్రాంతం. వేగాన్ని తగ్గించండి.';
      const sampleHi = 'एरोविज़न सुरक्षा प्रणाली सक्रिय है. आगे गति सीमा चालीस किलोमीटर प्रति घंटा है. सावधानी से चलाएं.';
      this.speakSequentialMultilingual({ en: sampleEn, te: sampleTe, hi: sampleHi }, 'WARNING', onLangChange, 'MANUAL');
      return;
    }
    let sample = 'AeroVision avionics active. Speed limit ahead is 40 kilometres per hour. Drive safely.';
    if (lang === 'te') {
      sample = 'ఏరోవిజన్ రక్షణ వ్యవస్థ యాక్టివ్‌గా ఉంది. ముందు పాఠశాల ప్రాంతం. వేగాన్ని తగ్గించండి.';
    } else if (lang === 'hi') {
      sample = 'एरोविज़न सुरक्षा प्रणाली सक्रिय है. आगे गति सीमा चालीस किलोमीटर प्रति घंटा है. सावधानी से चलाएं.';
    }
    this.speak(sample, 'WARNING', lang, 'MANUAL');
  }
}

export const speechService = new SpeechService();
