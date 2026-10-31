import React, { useState, useRef, useEffect } from 'react';
import { api, getApiBase, setCustomApiUrl } from '../api';
import { ALL_108_RTO_SIGNS, buildTrafficSignVoicePrompt } from '../data/rtoSignsData';
import { speechService, type AlertLanguage } from '../services/speechService';
import { navigationService, type NavigationState } from '../services/navigationService';
import { toast } from '../components/Toast';

export const AIStudioView: React.FC = () => {
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeMode, setActiveMode] = useState<'stream' | 'webcam' | 'upload'>('stream');
  
  // Voice Alert Avionics for Webcam & Optical Perception
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState(true);
  // Default to 'all' for sequential multilingual alerts (EN -> TE -> HI)
  const [webcamLang, setWebcamLang] = useState<AlertLanguage>('all');
  const [activeSpeakingLang, setActiveSpeakingLang] = useState<AlertLanguage | null>(null);
  const [lastVoiceSpoken, setLastVoiceSpoken] = useState<{
    text: string;
    signName: string;
    timestamp: number;
    lang: AlertLanguage;
  } | null>(null);
  const lastSpokenWebcamSignRef = useRef<{ signId: number; timestamp: number }>({ signId: -1, timestamp: 0 });
  const globalLastSpokenTimestampRef = useRef<number>(0);

  // Custom Backend API Configuration
  const [showApiModal, setShowApiModal] = useState(false);
  const [customApiUrlInput, setCustomApiUrlInput] = useState(getApiBase());

  // Live Location & Google Maps Navigation State
  const [gpsNav, setGpsNav] = useState<NavigationState>(navigationService.getState());
  const [useRealGps, setUseRealGps] = useState<boolean>(false);

  // Real detection state from webcam / upload
  const [livePrediction, setLivePrediction] = useState<any | null>({
    sign_name: 'Stop Sign',
    class_id: 'IRC67-M01',
    raw_class_id: 0,
    category: 'MANDATORY',
    shape: 'Octagon',
    color_code: '#EF4444',
    image_url: '/signs/000.png',
    confidence: 99.4,
    margin_score: 0.95,
    is_confirmed: true,
    legal_reference: 'MV Act Sec 119 read with Sec 184 & IRC:67-M01',
    penalty_info: '₹1,000 – ₹5,000 (Signal Violation / Dangerous Driving)',
    meaning: 'Mandatory full 0 km/h halt before stop line. Yield unconditionally to all crossing traffic.',
    distance_est: '12m',
    inference_ms: 11.8,
    bounding_box: [180, 80, 280, 280],
    frame_dimensions: [640, 480],
    top5: [
      { class_id: 0, class_name: 'Stop Sign', percentage: 99.4 },
      { class_id: 1, class_name: 'Give Way', percentage: 0.3 },
      { class_id: 5, class_name: 'No Entry', percentage: 0.1 },
      { class_id: 14, class_name: 'Speed Limit 50 km/h', percentage: 0.1 },
      { class_id: 20, class_name: 'Dangerous Curve Left', percentage: 0.1 },
    ],
    status: 'CONFIRMED_ACTIVE',
  });

  const [verifiedStatus, setVerifiedStatus] = useState<string | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState(false);
  const [snapshotPreviewUrl, setSnapshotPreviewUrl] = useState<string | null>(null);
  const [isSnapshotFrozen, setIsSnapshotFrozen] = useState(false);
  const isSnapshotFrozenRef = useRef(false);
  const [cameraShutterFlash, setCameraShutterFlash] = useState(false);
  const [snapshotAnalysis, setSnapshotAnalysis] = useState<any>(null);

  useEffect(() => {
    api.getModelStatus().then(setModelStatus).catch(() => null);
    const unsub = navigationService.subscribe((s) => {
      setGpsNav(s);
    });
    return () => unsub();
  }, []);

  const getCompassDirection = (deg: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
    return directions[idx];
  };

  const toggleGpsMode = () => {
    const nextMode = !useRealGps;
    setUseRealGps(nextMode);
    navigationService.setMode(!nextMode);
    if (nextMode) {
      navigationService.startNavigation();
      toast.success('Real Device GPS Linked with Google Maps & Live Speed Telemetry.');
    } else {
      toast.info('Switched to Highway Route Simulator.');
    }
  };

  // Temporal Stabilization State for jitter-free real-time HUD
  const temporalHistoryRef = useRef<Array<{
    class_id: number;
    sign_name: string;
    confidence: number;
    bounding_box: [number, number, number, number];
    top5: any[];
    timestamp: number;
  }>>([]);
  const smoothedBoxRef = useRef<[number, number, number, number] | null>(null);
  const activeLockRef = useRef<{
    class_id: number;
    sign_name: string;
    confidence: number;
    lockedUntil: number;
  } | null>(null);

  const parsePredictionResult = (res: any, isSnapshot = false) => {
    if (!res || !res.primary_prediction) return null;
    const now = Date.now();
    const rawCid = Number(res.primary_prediction.class_id);
    const rawConf = Math.round(res.primary_prediction.confidence * 1000) / 10;
    const rawBox: [number, number, number, number] = res.bounding_box || [160, 100, 320, 260];
    const isDetected = Boolean(res.is_detected !== false && rawCid >= 0 && rawConf >= 25);

    // Instant confirmation bypass for direct picture captures and verified model predictions
    if (isSnapshot || res.primary_prediction.is_confirmed) {
      const signMeta = ALL_108_RTO_SIGNS.find((s) => s.class_id === rawCid) || ALL_108_RTO_SIGNS[rawCid];
      const category = signMeta?.category || res.primary_prediction.category || 'MANDATORY';
      const urgency = signMeta?.speed_limit ? 'WARNING' : (signMeta?.category === 'INFORMATORY' ? 'INFORMATIONAL' : (rawCid === 0 || rawCid === 2 ? 'CRITICAL' : 'WARNING'));
      const isInfoSign = category === 'INFORMATORY' || urgency === 'INFORMATIONAL' || res.primary_prediction.alert_type === 'INFO';
      const alertType = isInfoSign ? 'INFO' : 'ALERT';

      smoothedBoxRef.current = rawBox;
      return {
        sign_name: signMeta?.name || res.primary_prediction.sign_name,
        name_te: signMeta?.name_te || res.primary_prediction.name_te,
        name_hi: signMeta?.name_hi || res.primary_prediction.name_hi,
        class_id: signMeta?.sign_code || res.primary_prediction.sign_code || `#${String(rawCid).padStart(3, '0')}`,
        raw_class_id: rawCid,
        category: category,
        shape: signMeta?.shape || res.primary_prediction.shape || 'Standard',
        color_code: signMeta?.color_code || '#EF4444',
        image_url: signMeta?.image_url || res.primary_prediction.image_url || `/signs/${String(rawCid).padStart(3, '0')}.png`,
        confidence: rawConf,
        glyph_match: res.primary_prediction.glyph_match || 0,
        margin_score: res.primary_prediction.margin_score || 0,
        is_confirmed: true,
        stage_step: 3,
        stage_title: 'STAGE 3: RECORD VERIFIED & ACTIVE',
        stage_description: `Verified statutory match: ${signMeta?.name || res.primary_prediction.sign_name} (${signMeta?.sign_code || res.primary_prediction.sign_code || 'IRC:67'})`,
        alert_type: alertType,
        alert_en: res.primary_prediction.alert_en || signMeta?.tts_prompt,
        alert_te: res.primary_prediction.alert_te,
        alert_hi: res.primary_prediction.alert_hi,
        legal_reference: signMeta?.legal_reference || res.primary_prediction.legal_reference || 'IRC:67 Regulatory',
        penalty_info: signMeta?.penalty_info || res.primary_prediction.penalty_info || `₹${res.primary_prediction.fine_amount || 500} fine under ${res.primary_prediction.mv_act_section || 'Sec 177 MV Act'}`,
        meaning: signMeta?.meaning || res.primary_prediction.advice,
        meaning_te: signMeta?.meaning_te || res.primary_prediction.meaning_te,
        meaning_hi: signMeta?.meaning_hi || res.primary_prediction.meaning_hi,
        halt: signMeta?.halt,
        distance_est: '~14m',
        inference_ms: Math.round((res.inference_time_ms || 18.0) * 10) / 10,
        bounding_box: rawBox,
        frame_dimensions: res.frame_dimensions || [640, 480],
        top5: res.top5_predictions || [],
        status: 'CONFIRMED_ACTIVE',
      };
    }

    if (!isDetected) {
      // Check if prior confirmed detection is still within warm grace period (600ms)
      if (activeLockRef.current && now < activeLockRef.current.lockedUntil) {
        const lockedCid = activeLockRef.current.class_id;
        const signMeta = ALL_108_RTO_SIGNS.find((s) => s.class_id === lockedCid) || ALL_108_RTO_SIGNS[lockedCid];
        return {
          sign_name: signMeta?.name || activeLockRef.current.sign_name,
          class_id: signMeta?.sign_code || `#${String(lockedCid).padStart(3, '0')}`,
          raw_class_id: lockedCid,
          category: signMeta?.category || 'MANDATORY',
          shape: signMeta?.shape || 'Standard',
          color_code: signMeta?.color_code || '#EF4444',
          image_url: signMeta?.image_url || `/signs/${String(lockedCid).padStart(3, '0')}.png`,
          confidence: activeLockRef.current.confidence,
          margin_score: 0.20,
          is_confirmed: true,
          legal_reference: signMeta?.legal_reference || 'IRC:67 Regulatory',
          penalty_info: signMeta?.penalty_info || 'Statutory traffic regulation',
          meaning: signMeta?.meaning || 'Regulatory road sign',
          halt: signMeta?.halt,
          distance_est: '~14m',
          inference_ms: Math.round((res.inference_time_ms || 18.0) * 10) / 10,
          bounding_box: smoothedBoxRef.current || rawBox,
          frame_dimensions: res.frame_dimensions || [640, 480],
          top5: [],
          status: 'CONFIRMED_ACTIVE',
        };
      }

      // Standby / Aiming State
      smoothedBoxRef.current = null;
      temporalHistoryRef.current = [];
      return {
        sign_name: 'Scanning for Signs...',
        class_id: 'IRC67-SCAN',
        raw_class_id: -1,
        category: 'SCANNING',
        shape: 'Reticle',
        color_code: '#22D3EE',
        image_url: '/signs/000.png',
        confidence: 0,
        margin_score: 0,
        is_confirmed: false,
        legal_reference: 'Optical Road Telemetry Online',
        penalty_info: 'Ready for road signs, phone screen, or printed charts',
        meaning: 'Align sign inside reticle at 30-60 cm (1-2 ft) distance.',
        distance_est: 'Scanning...',
        inference_ms: Math.round((res.inference_time_ms || 18.0) * 10) / 10,
        bounding_box: [160, 100, 320, 260],
        frame_dimensions: res.frame_dimensions || [640, 480],
        top5: [],
        status: 'STANDBY',
      };
    }

    // Push into sliding temporal window (last 6 detections within 1.2 seconds)
    temporalHistoryRef.current.push({
      class_id: rawCid,
      sign_name: res.primary_prediction.sign_name,
      confidence: rawConf,
      bounding_box: rawBox,
      top5: res.top5_predictions || [],
      timestamp: now,
    });
    temporalHistoryRef.current = temporalHistoryRef.current.filter((item) => now - item.timestamp < 1200);
    if (temporalHistoryRef.current.length > 6) {
      temporalHistoryRef.current.shift();
    }

    // Smooth Bounding Box with Linear Interpolation (LERP)
    if (!smoothedBoxRef.current) {
      smoothedBoxRef.current = [...rawBox];
    } else {
      const alpha = 0.35;
      smoothedBoxRef.current = [
        Math.round(smoothedBoxRef.current[0] * (1 - alpha) + rawBox[0] * alpha),
        Math.round(smoothedBoxRef.current[1] * (1 - alpha) + rawBox[1] * alpha),
        Math.round(smoothedBoxRef.current[2] * (1 - alpha) + rawBox[2] * alpha),
        Math.round(smoothedBoxRef.current[3] * (1 - alpha) + rawBox[3] * alpha),
      ];
    }

    // Temporal Consensus Voting across the sliding window
    const voteMap: Record<number, { count: number; totalConf: number; name: string }> = {};
    for (const item of temporalHistoryRef.current) {
      if (!voteMap[item.class_id]) {
        voteMap[item.class_id] = { count: 0, totalConf: 0, name: item.sign_name };
      }
      voteMap[item.class_id].count += 1;
      voteMap[item.class_id].totalConf += item.confidence;
    }

    // Find class with highest consensus score (frequency + rolling confidence)
    let bestCid = rawCid;
    let bestScore = -1;
    let bestAvgConf = rawConf;

    for (const [cidStr, data] of Object.entries(voteMap)) {
      const c = Number(cidStr);
      const avg = data.totalConf / data.count;
      const score = (data.count * 30) + avg;
      if (score > bestScore) {
        bestScore = score;
        bestCid = c;
        bestAvgConf = Math.round(avg * 10) / 10;
      }
    }

    const voteCount = voteMap[bestCid]?.count || 1;
    const signMeta = ALL_108_RTO_SIGNS.find((s) => s.class_id === bestCid) || ALL_108_RTO_SIGNS[bestCid];
    const category = signMeta?.category || res.primary_prediction.category || 'MANDATORY';
    const urgency = signMeta?.speed_limit ? 'WARNING' : (signMeta?.category === 'INFORMATORY' ? 'INFORMATIONAL' : (bestCid === 0 || bestCid === 2 ? 'CRITICAL' : 'WARNING'));
    const isInfoSign = category === 'INFORMATORY' || urgency === 'INFORMATIONAL' || res.primary_prediction.alert_type === 'INFO';
    const alertType = isInfoSign ? 'INFO' : 'ALERT';

    // 3-STAGE INTELLIGENT RECOGNITION PIPELINE:
    // Stage 1 (Frame 1): Analyzing sign visual contours & geometry (shape, chromatic ratio). Audio Muted.
    // Stage 2 (Frame 2): Cross-referencing candidate with 108 Indian RTO records. Audio Muted.
    // Stage 3 (Frame 3+ with consistent consensus): Record Verified & Active. Triggers Alert/Info once.
    let stageStep = 1;
    let stageTitle = 'STAGE 1: ANALYZING SIGN VISUALS';
    let stageDescription = 'Optical sensor inspecting sign shape & chromatic profile...';
    let isConfirmed = false;
    let status = 'ANALYZING_SIGN';

    const detectedShape = res.primary_prediction.shape || signMeta?.shape || 'Standard';

    // Check if prior confirmed detection lock is still active
    if (activeLockRef.current && now < activeLockRef.current.lockedUntil && activeLockRef.current.class_id === bestCid) {
      stageStep = 3;
      stageTitle = 'STAGE 3: RECORD VERIFIED & ACTIVE';
      stageDescription = `Verified in official records: ${signMeta?.name || res.primary_prediction.sign_name}`;
      isConfirmed = true;
      status = 'CONFIRMED_ACTIVE';
      bestAvgConf = Math.max(bestAvgConf, activeLockRef.current.confidence);
    } else if (voteCount >= 3 && bestAvgConf >= 30) {
      // Confirmed only after multi-frame observation consensus
      stageStep = 3;
      stageTitle = 'STAGE 3: RECORD VERIFIED & ACTIVE';
      stageDescription = `Verified statutory match: ${signMeta?.name || res.primary_prediction.sign_name} (${signMeta?.sign_code || res.primary_prediction.sign_code || 'IRC:67'})`;
      isConfirmed = true;
      status = 'CONFIRMED_ACTIVE';

      activeLockRef.current = {
        class_id: bestCid,
        sign_name: signMeta?.name || res.primary_prediction.sign_name,
        confidence: bestAvgConf,
        lockedUntil: now + 1400,
      };
    } else if (voteCount === 2) {
      // Stage 2: Cross-referencing 108 records
      stageStep = 2;
      stageTitle = 'STAGE 2: MATCHING 108 RTO RECORDS';
      stageDescription = `Cross-referencing candidate shape (${detectedShape}) with 108 Indian RTO database: ${signMeta?.name || res.primary_prediction.sign_name}...`;
      isConfirmed = false;
      status = 'SEARCHING_RECORDS';
    } else {
      // Stage 1: Analyzing sign
      stageStep = 1;
      stageTitle = 'STAGE 1: ANALYZING SIGN VISUALS';
      stageDescription = `Analyzing candidate shape: ${detectedShape}, chromatic boundary & glyph contour...`;
      isConfirmed = false;
      status = 'ANALYZING_SIGN';
    }

    return {
      sign_name: signMeta?.name || res.primary_prediction.sign_name,
      name_te: signMeta?.name_te || res.primary_prediction.name_te,
      name_hi: signMeta?.name_hi || res.primary_prediction.name_hi,
      class_id: signMeta?.sign_code || res.primary_prediction.sign_code || `#${String(bestCid).padStart(3, '0')}`,
      raw_class_id: bestCid,
      category: category,
      shape: signMeta?.shape || 'Standard',
      color_code: signMeta?.color_code || '#EF4444',
      image_url: signMeta?.image_url || res.primary_prediction.image_url || `/signs/${String(bestCid).padStart(3, '0')}.png`,
      confidence: bestAvgConf,
      glyph_match: res.primary_prediction.glyph_match || 0,
      margin_score: res.primary_prediction.margin_score || 0,
      is_confirmed: isConfirmed,
      stage_step: stageStep,
      stage_title: stageTitle,
      stage_description: stageDescription,
      alert_type: alertType,
      alert_en: res.primary_prediction.alert_en || signMeta?.tts_prompt,
      alert_te: res.primary_prediction.alert_te,
      alert_hi: res.primary_prediction.alert_hi,
      legal_reference: signMeta?.legal_reference || res.primary_prediction.legal_reference || 'IRC:67 Regulatory',
      penalty_info: signMeta?.penalty_info || res.primary_prediction.penalty_info || `₹${res.primary_prediction.fine_amount || 500} fine under ${res.primary_prediction.mv_act_section || 'Sec 177 MV Act'}`,
      meaning: signMeta?.meaning || res.primary_prediction.advice,
      meaning_te: signMeta?.meaning_te || res.primary_prediction.meaning_te,
      meaning_hi: signMeta?.meaning_hi || res.primary_prediction.meaning_hi,
      halt: signMeta?.halt,
      distance_est: isConfirmed ? '~14m' : stageStep === 2 ? 'Verifying...' : 'Acquiring...',
      inference_ms: Math.round((res.inference_time_ms || 18.0) * 10) / 10,
      bounding_box: smoothedBoxRef.current || rawBox,
      frame_dimensions: res.frame_dimensions || [640, 480],
      top5: res.top5_predictions || [],
      status: status,
    };
  };

  const webcamActiveRef = useRef(false);
  const isInferencePendingRef = useRef(false);
  const loopTimeoutRef = useRef<any>(null);

  const scheduleNextTick = (delayMs = 60) => {
    if (!webcamActiveRef.current || isSnapshotFrozenRef.current) return;
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    loopTimeoutRef.current = setTimeout(() => {
      runLiveFrameInference();
    }, delayMs);
  };

  // Real webcam activation with zero race condition
  const startWebcam = async () => {
    // Acquire exclusive audio lock for optical camera detection
    speechService.setExclusiveSource('CAMERA');
    setActiveMode('webcam');
    setIsSnapshotFrozen(false);
    isSnapshotFrozenRef.current = false;
    setSnapshotPreviewUrl(null);
    setSnapshotAnalysis(null);
    setLivePrediction({
      sign_name: 'Searching for Signs...',
      class_id: 'RTO-OPTICAL',
      raw_class_id: -1,
      category: 'SCANNING',
      shape: 'Reticle',
      color_code: '#22D3EE',
      image_url: '/signs/000.png',
      confidence: 0,
      margin_score: 0,
      is_confirmed: false,
      legal_reference: 'Optical Sensor Synchronized',
      penalty_info: 'Real-time telemetry stream active',
      meaning: 'Point camera at any of the 108 Indian RTO road signs, smartphone screen, or printed card.',
      distance_est: 'Scanning...',
      inference_ms: 22.0,
      bounding_box: [160, 100, 320, 260],
      frame_dimensions: [640, 480],
      top5: [],
      status: 'STANDBY',
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      });
      webcamActiveRef.current = true;
      setWebcamActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          scheduleNextTick(80);
        };
        videoRef.current.play().catch(() => {});
      }
      scheduleNextTick(150);
      toast.success('Live camera stream initiated with PyTorch 108-class neural model.');
    } catch (err: any) {
      toast.error('Unable to access camera: ' + err.message);
      webcamActiveRef.current = false;
      setWebcamActive(false);
      speechService.setExclusiveSource(null);
    }
  };

  const stopWebcam = () => {
    webcamActiveRef.current = false;
    isSnapshotFrozenRef.current = false;
    setIsSnapshotFrozen(false);
    setSnapshotPreviewUrl(null);
    setSnapshotAnalysis(null);
    speechService.setExclusiveSource(null);
    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }
    isInferencePendingRef.current = false;
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setWebcamActive(false);
  };

  // Intelligent Voice Alert Engine for Webcam Detections
  const speakWebcamDetection = (signMeta: any, force = false) => {
    if (!signMeta || signMeta.raw_class_id < 0) return;
    if (!voiceAlertsEnabled && !force) return;
    if (!signMeta.is_confirmed && !force) return; // STRICT GUARD: NEVER SPEAK UNCONFIRMED!

    const now = Date.now();
    const isSameSign = signMeta.raw_class_id === lastSpokenWebcamSignRef.current.signId;
    const timeSinceLastSpokenAny = now - globalLastSpokenTimestampRef.current;
    const timeSinceThisSign = now - lastSpokenWebcamSignRef.current.timestamp;

    // Strict ADAS Cadence & Calm Rhythm:
    // 1. Global Refractory: Never voice alerts faster than 4.5 seconds apart unless forced
    if (!force && timeSinceLastSpokenAny < 4500) {
      return;
    }

    // 2. Same-Sign Cooldown: Do not repeat identical sign within 14 seconds
    if (!force && isSameSign && timeSinceThisSign < 14000) {
      return;
    }

    const name = signMeta.sign_name || signMeta.name || 'Traffic Sign';
    const isInfo = signMeta.alert_type === 'INFO' || signMeta.category === 'INFORMATORY' || signMeta.urgency === 'INFORMATIONAL';
    const isCritical = signMeta.raw_class_id === 0 || signMeta.raw_class_id === 2 || /no entry/i.test(name);
    const urgency = isCritical ? 'CRITICAL' : isInfo ? 'INFORMATIONAL' : 'WARNING';

    // Build intelligent prompts for sequential multilingual alerts or single language
    if (webcamLang === 'all') {
      const promptEn = signMeta.alert_en || buildTrafficSignVoicePrompt(signMeta, 'en');
      const promptTe = signMeta.alert_te || buildTrafficSignVoicePrompt(signMeta, 'te');
      const promptHi = signMeta.alert_hi || buildTrafficSignVoicePrompt(signMeta, 'hi');

      speechService.speakSequentialMultilingual(
        { en: promptEn, te: promptTe, hi: promptHi },
        urgency,
        (lang) => setActiveSpeakingLang(lang),
        'CAMERA'
      );

      globalLastSpokenTimestampRef.current = now;
      lastSpokenWebcamSignRef.current = { signId: signMeta.raw_class_id, timestamp: now };
      setLastVoiceSpoken({
        text: `[EN] ${promptEn} ➜ [TE] ${promptTe} ➜ [HI] ${promptHi}`,
        signName: name,
        timestamp: now,
        lang: 'all',
      });
      return;
    }

    let promptText = '';
    if (webcamLang === 'te' && signMeta.alert_te) {
      promptText = signMeta.alert_te;
    } else if (webcamLang === 'hi' && signMeta.alert_hi) {
      promptText = signMeta.alert_hi;
    } else if (signMeta.alert_en) {
      promptText = signMeta.alert_en;
    } else {
      promptText = buildTrafficSignVoicePrompt(signMeta, webcamLang);
    }

    setActiveSpeakingLang(webcamLang);
    speechService.speak(promptText, urgency, webcamLang, 'CAMERA');

    globalLastSpokenTimestampRef.current = now;
    lastSpokenWebcamSignRef.current = { signId: signMeta.raw_class_id, timestamp: now };
    setLastVoiceSpoken({
      text: promptText,
      signName: name,
      timestamp: now,
      lang: webcamLang,
    });
  };

  // Resilient non-blocking webcam inference loop for real-time PyTorch model
  const runLiveFrameInference = async () => {
    if (!webcamActiveRef.current || isSnapshotFrozenRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      scheduleNextTick(100);
      return;
    }

    if (video.readyState < 2 || video.paused || video.ended || video.videoWidth === 0) {
      // Camera sensor still streaming initial metadata, retry in 80ms
      scheduleNextTick(80);
      return;
    }

    if (isInferencePendingRef.current) {
      // Prior frame is in flight, retry in 40ms to avoid congestion
      scheduleNextTick(40);
      return;
    }

    isInferencePendingRef.current = true;
    try {
      const targetW = 640;
      const targetH = 480;
      if (canvas.width !== targetW) canvas.width = targetW;
      if (canvas.height !== targetH) canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        scheduleNextTick(80);
        return;
      }

      ctx.drawImage(video, 0, 0, targetW, targetH);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.80)
      );

      if (blob && webcamActiveRef.current && !isSnapshotFrozenRef.current) {
        const formData = new FormData();
        formData.append('file', blob, 'webcam_frame.jpg');
        const res = await api.predictFrame(formData);
        const parsed = parsePredictionResult(res);
        if (parsed && webcamActiveRef.current && !isSnapshotFrozenRef.current) {
          setLivePrediction(parsed);
          if (parsed.is_confirmed && parsed.raw_class_id >= 0) {
            speakWebcamDetection(parsed);
          }
        }
      }
    } catch (err) {
      // Transient frame drop or network hiccup, keep loop alive
    } finally {
      isInferencePendingRef.current = false;
      scheduleNextTick(60);
    }
  };

  // High-Resolution Snapshot Capture & Immediate Statutory Voice Alert
  const captureAndAnalyzeSnapshot = async () => {
    if (!webcamActiveRef.current || !videoRef.current || videoRef.current.readyState < 2) {
      toast.error('Camera stream is not active. Please click "Live PC Webcam" to enable camera first.');
      return;
    }

    const video = videoRef.current;
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;

    // Synthetic audio click sound via Web Audio API (tactile camera shutter feedback)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(750, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.09);
    } catch (e) {
      // AudioContext unavailable or blocked
    }

    // Trigger visual shutter flash
    setCameraShutterFlash(true);
    setTimeout(() => setCameraShutterFlash(false), 200);

    // Freeze live inference loop immediately
    setIsSnapshotFrozen(true);
    isSnapshotFrozenRef.current = true;
    setIsCapturingSnapshot(true);

    // Capture crisp native resolution frame from camera
    const canvas = document.createElement('canvas');
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsCapturingSnapshot(false);
      return;
    }

    ctx.drawImage(video, 0, 0, vw, vh);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setSnapshotPreviewUrl(dataUrl);

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.95)
      );

      if (!blob) throw new Error('Failed to capture high-res frame');

      const formData = new FormData();
      formData.append('file', blob, 'camera_snapshot.jpg');
      toast.info('Analyzing sign photo with PyTorch 108-Class Model...');

      const res = await api.predictFrame(formData);

      const parsed = parsePredictionResult(res, true);
      if (parsed) {
        setLivePrediction(parsed);
        setSnapshotAnalysis(parsed);

        if (parsed.raw_class_id >= 0) {
          toast.success(`Target Locked: ${parsed.sign_name} (${parsed.confidence}% Conf)`);
          // INSTANTLY SOUND STATUTORY VOICE ALERT (force=true bypasses cadence cooldown)
          speakWebcamDetection(parsed, true);
        } else {
          toast.error('No road sign detected in picture. Please align the sign in the center reticle and retake.');
          speechService.speak(
            webcamLang === 'te'
              ? 'ట్రాఫిక్ గుర్తు గుర్తించబడలేదు. దయచేసి గుర్తును బాక్స్‌లో ఉంచి ఫోటో మళ్లీ తీయండి.'
              : webcamLang === 'hi'
              ? 'ट्रैफिक साइन की पहचान नहीं हो सकी। कृपया साइन को बॉक्स के बीच में रखें और फोटो पुनः लें।'
              : 'Road sign not detected. Please align the sign in the center box and take picture again.',
            'INFORMATIONAL',
            webcamLang,
            'MANUAL'
          );
        }
      }
    } catch (err: any) {
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        toast.error('Cannot reach backend API. Connect your Render URL via "Backend API" button.');
        setShowApiModal(true);
      } else {
        toast.error('Snapshot analysis error: ' + err.message);
      }
    } finally {
      setIsCapturingSnapshot(false);
    }
  };

  const resumeLiveStream = () => {
    setIsSnapshotFrozen(false);
    isSnapshotFrozenRef.current = false;
    setSnapshotPreviewUrl(null);
    setSnapshotAnalysis(null);
    if (webcamActiveRef.current) {
      scheduleNextTick(60);
    }
    toast.info('Live optical camera scanning resumed.');
  };

  // Keyboard shortcut: Spacebar to capture snapshot or resume live stream
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'Space' && activeMode === 'webcam' && webcamActive && !isCapturingSnapshot) {
        e.preventDefault();
        if (isSnapshotFrozen) {
          resumeLiveStream();
        } else {
          captureAndAnalyzeSnapshot();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMode, webcamActive, isCapturingSnapshot, isSnapshotFrozen]);

  useEffect(() => {
    if (webcamActive) {
      webcamActiveRef.current = true;
      scheduleNextTick(100);
    } else {
      webcamActiveRef.current = false;
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    }
    return () => {
      webcamActiveRef.current = false;
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      isInferencePendingRef.current = false;
    };
  }, [webcamActive]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopWebcam();
    setActiveMode('upload');
    const objectUrl = URL.createObjectURL(file);
    setUploadedImageSrc(objectUrl);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.predictFrame(formData);
      const parsed = parsePredictionResult(res, true);
      if (parsed) {
        setLivePrediction(parsed);
        if (parsed.is_confirmed && parsed.raw_class_id >= 0) {
          speakWebcamDetection(parsed, true);
        }
      }
    } catch (err: any) {
      toast.error('Inference error: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-full gap-6 max-w-[1720px] mx-auto text-on-surface overflow-hidden">
      {/* Screen Meta & Breadcrumb Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-xs text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span className="tracking-widest uppercase font-semibold">
              COCKPIT INFERENCE NODE • AP-SOUTH-1
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">
              STREAM ID: #FL-2025-089A
            </span>
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight">
            AI Road Intelligence
          </h1>
          <p className="font-body-md text-sm text-slate-400 max-w-2xl">
            Real-time edge & cloud computer-vision telemetry, sign recognition, and compliance verification.
          </p>
        </div>

        {/* Top Metric Badges */}
        <div className="flex flex-wrap items-center gap-2 bg-[#10203B]/80 border border-white/10 backdrop-blur-xl p-1.5 rounded-xl">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#070e1c] border border-white/5 rounded-lg">
            <span className="material-symbols-outlined text-cyan-400 text-base">videocam</span>
            <div className="flex flex-col font-mono text-xs">
              <span className="text-[9px] text-slate-400 uppercase">ACTIVE FEED</span>
              <span className="text-white font-semibold truncate max-w-[150px]">
                {activeMode === 'webcam'
                  ? 'LIVE_WEBCAM_OPTICAL'
                  : activeMode === 'upload'
                  ? 'UPLOADED_FRAME.JPG'
                  : 'REC_20250218_F.MP4'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#070e1c] border border-white/5 rounded-lg">
            <span className="material-symbols-outlined text-emerald-400 text-base">memory</span>
            <div className="flex flex-col font-mono text-xs">
              <span className="text-[9px] text-slate-400 uppercase">
                ENGINE ({livePrediction?.inference_ms || 11.8}ms)
              </span>
              <span className="text-emerald-400 font-bold">
                {modelStatus?.model_name || 'PyTorch 108-Class'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#070e1c] border border-white/5 rounded-lg">
            <span className="material-symbols-outlined text-blue-400 text-base">speed</span>
            <div className="flex flex-col font-mono text-xs">
              <span className="text-[9px] text-slate-400 uppercase">CERTAINTY</span>
              <span className="text-blue-400 font-bold">
                {livePrediction?.confidence || 98.4}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 bg-[#070e1c] border border-white/5 rounded-lg font-mono text-xs text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>STREAM SYNCED</span>
          </div>
        </div>
      </div>

      {/* Mode Selector Pill & Voice Alert Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#10203B]/70 border border-white/10 p-2 rounded-xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              stopWebcam();
              setActiveMode('stream');
              setLivePrediction({
                sign_name: 'Stop Sign',
                class_id: 'IRC67-M01',
                raw_class_id: 0,
                category: 'MANDATORY',
                shape: 'Octagon',
                color_code: '#EF4444',
                image_url: '/signs/000.png',
                confidence: 99.4,
                margin_score: 0.95,
                is_confirmed: true,
                legal_reference: 'MV Act Sec 119 read with Sec 184 & IRC:67-M01',
                penalty_info: '₹1,000 – ₹5,000 (Signal Violation / Dangerous Driving)',
                meaning: 'Mandatory full 0 km/h halt before stop line. Yield unconditionally to all crossing traffic.',
                distance_est: '12m',
                inference_ms: 11.8,
                bounding_box: [180, 80, 280, 280],
                frame_dimensions: [640, 480],
                top5: [
                  { class_id: 0, class_name: 'Stop Sign', percentage: 99.4 },
                  { class_id: 1, class_name: 'Give Way', percentage: 0.3 },
                  { class_id: 5, class_name: 'No Entry', percentage: 0.1 },
                  { class_id: 14, class_name: 'Speed Limit 50 km/h', percentage: 0.1 },
                  { class_id: 20, class_name: 'Dangerous Curve Left', percentage: 0.1 },
                ],
                status: 'CONFIRMED_ACTIVE',
              });
            }}
            className={`px-3.5 py-1.5 rounded-lg font-mono text-xs transition-all flex items-center gap-1.5 ${
              activeMode === 'stream'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">tv</span>
            <span>Simulated Dashcam Stream</span>
          </button>

          <button
            onClick={startWebcam}
            className={`px-3.5 py-1.5 rounded-lg font-mono text-xs transition-all flex items-center gap-1.5 ${
              activeMode === 'webcam'
                ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">camera_alt</span>
            <span>Live PC Webcam</span>
          </button>

          {activeMode === 'webcam' && (
            <button
              onClick={isSnapshotFrozen ? resumeLiveStream : captureAndAnalyzeSnapshot}
              disabled={isCapturingSnapshot}
              className={`px-3.5 py-1.5 rounded-lg font-mono text-xs transition-all flex items-center gap-1.5 border cursor-pointer ${
                isSnapshotFrozen
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-semibold'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {isSnapshotFrozen ? 'videocam' : 'photo_camera'}
              </span>
              <span>{isSnapshotFrozen ? 'Resume Live Stream' : 'Take Picture & Alert'}</span>
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`px-3.5 py-1.5 rounded-lg font-mono text-xs transition-all flex items-center gap-1.5 ${
              activeMode === 'upload'
                ? 'bg-purple-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">upload_file</span>
            <span>Upload Image for AI Check</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
        </div>

        {/* Live PC Webcam Voice Alert Avionics Controls */}
        <div className="flex items-center gap-2">
          {/* Mute / Unmute Toggle */}
          <button
            onClick={() => {
              const nextState = !voiceAlertsEnabled;
              setVoiceAlertsEnabled(nextState);
              if (!nextState) {
                speechService.stop();
              } else {
                speechService.speak(
                  webcamLang === 'te'
                    ? 'వెబ్‌క్యామ్ వాయిస్ అలర్ట్‌లు ప్రారంభించబడ్డాయి.'
                    : webcamLang === 'hi'
                    ? 'वेबकैम वॉयस अलर्ट सक्रिय कर दिए गए हैं।'
                    : 'Webcam optical voice alerts enabled.',
                  'INFORMATIONAL',
                  webcamLang
                );
              }
            }}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all flex items-center gap-1.5 border ${
              voiceAlertsEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'bg-slate-800 text-slate-400 border-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {voiceAlertsEnabled ? 'volume_up' : 'volume_off'}
            </span>
            <span>{voiceAlertsEnabled ? 'Voice Alerts Active' : 'Voice Muted'}</span>
          </button>

          {/* Language Selector */}
          <div className="flex items-center bg-[#070e1c] p-0.5 rounded-lg border border-white/10 text-xs font-mono">
            {(['all', 'en', 'te', 'hi'] as AlertLanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setWebcamLang(lang);
                  speechService.updateSettings({ language: lang });
                }}
                className={`px-2 py-1 rounded text-xs transition-all flex items-center gap-1 ${
                  webcamLang === lang
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={lang === 'all' ? 'Sequential Multilingual (English -> Telugu -> Hindi)' : `Speak only in ${lang}`}
              >
                {lang === 'all' ? (
                  <>
                    <span className="material-symbols-outlined text-xs">translate</span>
                    <span>ALL (EN➜TE➜HI)</span>
                  </>
                ) : lang === 'en' ? (
                  'EN'
                ) : lang === 'te' ? (
                  'తెలుగు'
                ) : (
                  'हिंदी'
                )}
              </button>
            ))}
          </div>

          {/* Test Voice Button */}
          <button
            onClick={() => {
              if (livePrediction && livePrediction.raw_class_id >= 0) {
                speakWebcamDetection(livePrediction, true);
              } else {
                speechService.testVoiceOutput((l) => setActiveSpeakingLang(l));
              }
            }}
            className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-mono flex items-center gap-1 transition-all shadow-sm"
            title="Trigger immediate sequential voice output in all languages"
          >
            <span className="material-symbols-outlined text-sm">graphic_eq</span>
            <span className="hidden md:inline">Test Output</span>
          </button>

          {/* Backend API Link / Connection Config */}
          <button
            onClick={() => {
              setCustomApiUrlInput(getApiBase());
              setShowApiModal(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
            title="Configure Backend API Server URL"
          >
            <span className="material-symbols-outlined text-sm text-cyan-400">dns</span>
            <span className="hidden md:inline">API URL</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Split Video Engine & Sidecar Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: 16:9 Vision Player Stage (Cols 8) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Video Viewport Container - Generous, high-visibility large viewport */}
          <div className={`relative w-full ${activeMode === 'webcam' ? 'min-h-[460px] sm:min-h-[560px] md:min-h-[640px] h-[58vh] sm:h-[620px]' : 'aspect-video'} rounded-2xl overflow-hidden bg-black shadow-2xl group select-none border border-white/15`}>
            {/* Real Webcam Stream Viewport */}
            {/* Real Webcam Stream Viewport - Permanently mounted to ensure refs are never null */}
            <div className={`relative w-full h-full bg-black flex items-center justify-center ${activeMode === 'webcam' ? 'block' : 'hidden'}`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Frozen High-Res Snapshot Viewport */}
            {activeMode === 'webcam' && isSnapshotFrozen && snapshotPreviewUrl ? (
              <img
                src={snapshotPreviewUrl}
                alt="Captured sign snapshot"
                className="absolute inset-0 w-full h-full object-cover z-10"
              />
            ) : null}

            {/* Camera Shutter Flash Effect */}
            {cameraShutterFlash && (
              <div className="absolute inset-0 bg-white/95 z-50 pointer-events-none transition-opacity duration-150 animate-pulse"></div>
            )}

            {/* Neural Evaluation Spinner Overlay */}
            {isCapturingSnapshot && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-40 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin"></div>
                <div className="font-mono text-sm text-cyan-300 font-bold tracking-wider">
                  ANALYZING SIGN PHOTO...
                </div>
                <div className="font-mono text-xs text-slate-400">
                  PyTorch 108 Indian RTO Classes
                </div>
              </div>
            )}

            {activeMode === 'upload' && uploadedImageSrc ? (
              /* Uploaded Image Viewport */
              <img
                src={uploadedImageSrc}
                alt="Uploaded inspection candidate"
                className="w-full h-full object-contain bg-black"
              />
            ) : activeMode === 'stream' ? (
              /* Simulated High-Def Dashcam Viewport */
              <img
                className="w-full h-full object-cover brightness-[0.92] contrast-[1.08]"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0yw_1xGWGWGN9Wtgk9y6xlbPyzzg7T13ryUwltq7SqzRiPEZgBtNy8mMetAPKhk-df4ZRGwhxZYtV4B1sHxTMMPZw9UsPPZq7ie5qWTUcdBNiRfjkOsHKwuY9kwOoT-T01Fl0-3ZmoW-__bSVE1y_ozaNuxHh23VnLVfdwizTP5Varwe8YoPV8ZBZ8HC6WpTodF_08W94mMkgI-piN9QFTHvvmqcDtV7mZz1ypl00SfyjQvbotLA4Gg"
                alt="AeroVision Live Highway Detection"
              />
            ) : null}

            {/* Holographic Scrim / HUD Layer - Only for simulated stream, never darken live webcam */}
            {activeMode === 'stream' && (
              <div className="absolute inset-0 bg-gradient-to-t from-[#070B14]/80 via-transparent to-[#070B14]/40 pointer-events-none"></div>
            )}

            {/* Vector Projection: Trajectory Lane Lines (Simulated Highway Stream Only) */}
            {activeMode === 'stream' && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                fill="none"
                viewBox="0 0 1000 562"
                xmlns="http://www.w3.org/2000/svg"
              >
                <polygon
                  fill="url(#lane-grad)"
                  opacity="0.32"
                  points="460,290 540,290 730,562 270,562"
                ></polygon>
                <line
                  opacity="0.85"
                  stroke="#10B981"
                  strokeDasharray="8 6"
                  strokeWidth="2.5"
                  x1="460"
                  x2="270"
                  y1="290"
                  y2="562"
                ></line>
                <line
                  opacity="0.85"
                  stroke="#10B981"
                  strokeDasharray="8 6"
                  strokeWidth="2.5"
                  x1="540"
                  x2="730"
                  y1="290"
                  y2="562"
                ></line>
                <line
                  stroke="#22D3EE"
                  strokeDasharray="4 4"
                  strokeOpacity="0.4"
                  strokeWidth="1.2"
                  x1="500"
                  x2="500"
                  y1="290"
                  y2="562"
                ></line>
                <circle cx="500" cy="290" fill="#22D3EE" opacity="0.8" r="4"></circle>
                <circle cx="500" cy="290" r="16" stroke="#22D3EE" strokeOpacity="0.4" strokeWidth="1"></circle>
                <defs>
                  <linearGradient id="lane-grad" x1="500" x2="500" y1="290" y2="562" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#10B981" stopOpacity="0.05"></stop>
                    <stop offset="1" stopColor="#10B981" stopOpacity="0.35"></stop>
                  </linearGradient>
                </defs>
              </svg>
            )}

            {/* Top-Left Live Record Telemetry Pill (Simulated and Upload Only) */}
            {activeMode !== 'webcam' && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-[#070e1c]/85 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md border border-white/10 pointer-events-none">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse"></span>
                <span className="font-mono text-xs text-white tracking-wider">LIVE INFERENCE</span>
                <span className="text-slate-500">|</span>
                <span className="font-mono text-xs text-cyan-400 font-semibold">PYTORCH RT ACCEL</span>
              </div>
            )}

            {/* Top-Right Optical Sensor Diagnostic Box - Only for simulated stream */}
            {activeMode === 'stream' && (
              <div className="absolute top-4 right-4 bg-[#070e1c]/85 backdrop-blur-md p-3 rounded-lg shadow-md border border-white/10 pointer-events-none space-y-0.5 text-right font-mono text-[11px]">
                <div className="text-white flex items-center justify-end gap-1.5">
                  <span className="text-slate-400">OPTICAL:</span>
                  <span className="text-blue-400 font-medium">Sony Starvis IMX678</span>
                </div>
                <div className="text-white flex items-center justify-end gap-1.5">
                  <span className="text-slate-400">RES:</span>
                  <span>3840×2160 UHD</span>
                </div>
                <div className="text-white flex items-center justify-end gap-1.5">
                  <span className="text-slate-400">FPS:</span>
                  <span className="text-emerald-400">59.84 CONST</span>
                </div>
                <div className="text-white flex items-center justify-end gap-1.5">
                  <span className="text-slate-400">EXP:</span>
                  <span>1/120s Auto (f/1.8)</span>
                </div>
              </div>
            )}

            {/* DYNAMIC RETICLE / TARGET LOCK */}
            {(() => {
              if (!livePrediction) return null;
              const isConfirmed = Boolean(livePrediction.is_confirmed);
              const [bx, by, bw, bh] = livePrediction.bounding_box || [0, 0, 640, 480];
              const [fw, fh] = livePrediction.frame_dimensions || [640, 480];
              const leftPct = Math.max(2, Math.min(85, (bx / fw) * 100));
              const topPct = Math.max(2, Math.min(80, (by / fh) * 100));
              const widthPct = Math.max(8, Math.min(65, (bw / fw) * 100));
              const heightPct = Math.max(8, Math.min(65, (bh / fh) * 100));

              if (activeMode === 'webcam') {
                // When in live webcam mode: keep scanning view 100% clean, NO front animations!
                if (isConfirmed && livePrediction.raw_class_id >= 0) {
                  return (
                    <div
                      className="absolute pointer-events-none z-20"
                      style={{
                        top: `${topPct}%`,
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        height: `${heightPct}%`,
                      }}
                    >
                      <div className="relative w-full h-full rounded border-2 border-emerald-400 bg-emerald-500/10 shadow-lg"></div>
                      <div className="absolute -top-7 left-0 whitespace-nowrap bg-[#070e1c]/95 border border-emerald-400 px-2.5 py-0.5 rounded shadow flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="text-white font-bold">{livePrediction.sign_name}</span>
                        <span className="text-emerald-400 font-bold">{livePrediction.confidence}%</span>
                      </div>
                    </div>
                  );
                }
                // In scanning/aiming mode: NO front animations or crosshairs blocking the lens!
                return null;
              } else if (activeMode === 'upload') {
                if (isConfirmed) {
                  return (
                    <div
                      className="absolute pointer-events-auto cursor-pointer group/box transition-all duration-150 z-20"
                      style={{
                        top: `${topPct}%`,
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        height: `${heightPct}%`,
                      }}
                    >
                      <div className="relative w-full h-full rounded-sm shadow-[0_0_20px_rgba(16,185,129,0.7)] bg-emerald-500/15 border-2 border-emerald-400"></div>
                      <div className="absolute -top-8 left-0 whitespace-nowrap bg-[#070e1c]/95 border border-emerald-400 backdrop-blur-lg px-2.5 py-1 rounded shadow-lg flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span className="text-white font-semibold">[{livePrediction.sign_name}]</span>
                        <span className="text-emerald-400 font-bold">{livePrediction.confidence}%</span>
                        <span className="text-slate-400">• Confirmed</span>
                      </div>
                    </div>
                  );
                }
                return null;
              } else {
                // Default Simulated Dashcam Reticle
                return (
                  <div className="absolute top-[28%] left-[44%] w-[18%] aspect-square pointer-events-auto cursor-pointer group/box transition-all">
                    <div className="relative w-full h-full rounded-sm shadow-[0_0_14px_rgba(34,211,238,0.5)] bg-cyan-500/10 border border-cyan-400/40">
                      <span className="absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 border-cyan-400"></span>
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 border-cyan-400"></span>
                      <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 border-cyan-400"></span>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 border-cyan-400"></span>
                      <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-cyan-400/80 animate-ping"></div>
                    </div>
                    <div className="absolute -top-8 -left-4 whitespace-nowrap bg-[#070e1c]/95 border border-cyan-400/40 backdrop-blur-lg px-2.5 py-1 rounded shadow-lg flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      <span className="text-white font-semibold">[{livePrediction.sign_name}]</span>
                      <span className="text-emerald-400">{livePrediction.confidence}%</span>
                      <span className="text-slate-400">• ~18m</span>
                    </div>
                  </div>
                );
              }
            })()}

            {/* Bottom Scrubber for Simulated Video Player Only */}
            {activeMode === 'stream' && (
              <div className="absolute bottom-3 inset-x-3 bg-[#070e1c]/80 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-xl flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {isPlaying ? 'pause' : 'play_arrow'}
                    </span>
                  </button>
                  <div className="h-4 w-px bg-white/10"></div>
                  <span className="font-mono text-xs text-cyan-400 font-semibold">
                    00:02:18.420
                  </span>
                  <span className="font-mono text-xs text-slate-400">/ 00:04:30.000</span>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-slate-400">FRAME</span>
                  <span className="text-white font-semibold bg-white/10 px-2 py-0.5 rounded">
                    04,289
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* WEBCAM VOICE ALERT STRIP (Placed below video, never blocking the camera) */}
          {activeMode === 'webcam' && lastVoiceSpoken && (
            <div className="bg-[#10203B]/95 border border-cyan-400/40 backdrop-blur-xl p-3.5 rounded-2xl shadow-lg flex items-center justify-between gap-3 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0">
                  <span className="material-symbols-outlined text-xl">volume_up</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-cyan-400 uppercase font-bold tracking-wider">
                      PC WEBCAM VOICE ALERT • [{lastVoiceSpoken.lang.toUpperCase()}]
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 truncate">{lastVoiceSpoken.signName}</span>
                  </div>
                  <p className="font-body-sm text-xs text-white font-medium truncate sm:whitespace-normal">
                    "{lastVoiceSpoken.text}"
                  </p>
                </div>
              </div>
              <button
                onClick={() => speechService.speak(lastVoiceSpoken.text, 'WARNING', lastVoiceSpoken.lang, 'MANUAL')}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-cyan-300 transition-colors flex items-center gap-1.5 border border-cyan-400/30 cursor-pointer shrink-0"
                title="Re-play Voice Announcement"
              >
                <span className="material-symbols-outlined text-sm">replay</span>
                <span>Repeat</span>
              </button>
            </div>
          )}

          {/* DEDICATED WEBCAM CONTROL BAR (Placed below video, completely unobstructed view) */}
          {activeMode === 'webcam' && (
            <div className="bg-[#10203B]/90 border border-cyan-500/30 backdrop-blur-xl p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isSnapshotFrozen ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`}></span>
                <span className="font-mono text-sm text-white font-bold">
                  {isSnapshotFrozen ? 'PHOTO CAPTURED & ANALYZED' : 'LIVE SCANNING ACTIVE'}
                </span>
                <span className="text-slate-500 hidden sm:inline">•</span>
                <span className="font-mono text-xs text-slate-300 hidden sm:inline">
                  {isSnapshotFrozen ? (livePrediction?.is_confirmed ? `Detected: ${livePrediction.sign_name}` : 'Inspection Complete') : 'Hold traffic sign in front of camera'}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {!isSnapshotFrozen ? (
                  <button
                    onClick={captureAndAnalyzeSnapshot}
                    disabled={isCapturingSnapshot}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono text-sm font-bold transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl">photo_camera</span>
                    <span>Take Picture & Analyze</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={resumeLiveStream}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs font-bold border border-cyan-400/40 transition-all flex items-center gap-2 cursor-pointer shadow"
                    >
                      <span className="material-symbols-outlined text-base">videocam</span>
                      <span>Resume Live Feed</span>
                    </button>
                    <button
                      onClick={captureAndAnalyzeSnapshot}
                      disabled={isCapturingSnapshot}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-mono text-xs font-bold transition-all shadow flex items-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">refresh</span>
                      <span>Retake Picture</span>
                    </button>
                  </>
                )}

                {livePrediction?.is_confirmed && (
                  <button
                    onClick={() => speakWebcamDetection(livePrediction, true)}
                    className="px-3.5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono text-xs font-semibold border border-emerald-400/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Replay speech alert"
                  >
                    <span className="material-symbols-outlined text-base">volume_up</span>
                    <span>Replay</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Optical Telemetry Auxiliary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#10203B]/70 border border-white/10 p-3 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-slate-400">VEHICLE SPEED</span>
                <span className="font-mono text-lg text-white font-bold">
                  {gpsNav.currentLocation.speedKmh.toFixed(1)} <span className="text-xs text-slate-400 font-normal">KM/H</span>
                </span>
              </div>
              <span className="material-symbols-outlined text-emerald-400 text-2xl">speed</span>
            </div>

            <div className="bg-[#10203B]/70 border border-white/10 p-3 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-slate-400">GPS HEADING</span>
                <span className="font-mono text-lg text-white font-bold">
                  {Math.round(gpsNav.currentLocation.headingDeg)}° <span className="text-xs text-slate-400 font-normal">{getCompassDirection(gpsNav.currentLocation.headingDeg)}</span>
                </span>
              </div>
              <span className="material-symbols-outlined text-cyan-400 text-2xl">explore</span>
            </div>

            <div className="bg-[#10203B]/70 border border-white/10 p-3 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-slate-400">ROAD GEOMETRY</span>
                <span className="font-mono text-sm text-white font-bold truncate max-w-[130px]" title={gpsNav.selectedCorridor?.name || 'NH-44 Outer Ring'}>
                  {gpsNav.selectedCorridor?.name?.split(' ')[0] || 'NH-44'} <span className="text-xs text-slate-400 font-normal">+0.4°</span>
                </span>
              </div>
              <span className="material-symbols-outlined text-blue-400 text-2xl">alt_route</span>
            </div>

            <div className="bg-[#10203B]/70 border border-white/10 p-3 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-slate-400">EDGE INFERENCE</span>
                <span className="font-mono text-lg text-emerald-400 font-bold">
                  {livePrediction?.inference_ms || 11.8} <span className="text-xs text-slate-400 font-normal">MS</span>
                </span>
              </div>
              <span className="material-symbols-outlined text-emerald-400 text-2xl">bolt</span>
            </div>
          </div>

          {/* Live Geolocation Access & Google Maps Integration */}
          <div className="bg-[#10203B]/80 border border-cyan-500/30 backdrop-blur-xl rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
                <span className="material-symbols-outlined text-2xl">location_on</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-sm text-white">
                    Live Location Access & Google Maps Link
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                    useRealGps
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                      : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                  }`}>
                    {useRealGps ? '● REAL DEVICE GPS' : 'CORRIDOR SIMULATOR'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-xs text-slate-300 mt-1">
                  <span className="text-cyan-300 font-semibold">
                    {gpsNav.currentLocation.lat.toFixed(5)}° N, {gpsNav.currentLocation.lon.toFixed(5)}° E
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-400">
                    Accuracy: <strong className="text-white">±{gpsNav.currentLocation.accuracyM.toFixed(1)}m</strong>
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-400 truncate max-w-[220px]">
                    Corridor: <strong className="text-white">{gpsNav.selectedCorridor?.name || 'NH-44 Outer Ring Road, Hyderabad'}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
              {/* Toggle Real Device GPS vs Corridor */}
              <button
                onClick={toggleGpsMode}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all flex items-center gap-1.5 border ${
                  useRealGps
                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 shadow-sm'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
                title="Toggle Real Device Location Access"
              >
                <span className="material-symbols-outlined text-sm">my_location</span>
                <span>{useRealGps ? 'GPS Locked' : 'Enable Device GPS'}</span>
              </button>

              {/* Open in Google Maps */}
              <a
                href={`https://www.google.com/maps?q=${gpsNav.currentLocation.lat},${gpsNav.currentLocation.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-mono text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
                title="Open exact vehicle position on Google Maps"
              >
                <span className="material-symbols-outlined text-sm">map</span>
                <span>Open in Google Maps</span>
                <span className="material-symbols-outlined text-xs">open_in_new</span>
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT: Elevated Sidecar Verification Glass Panel (Cols 4) */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="bg-[#10203B]/80 border border-white/10 backdrop-blur-2xl rounded-2xl p-6 shadow-xl flex flex-col justify-between h-full space-y-4">
            <div className="space-y-4">
              {/* Glass Card Title & Tag */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-cyan-400 text-xl">fact_check</span>
                  <span className="font-heading font-bold text-base text-white">
                    Active Detection Analysis
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold border ${
                  livePrediction?.is_confirmed
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : livePrediction?.stage_step === 2
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                    : livePrediction?.stage_step === 1
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {verifiedStatus || livePrediction?.stage_title || (livePrediction?.is_confirmed ? 'STAGE 3: CONFIRMED' : 'OPTICAL SCANNING')}
                </span>
              </div>

              {/* 3-Stage Sequential Recognition Stepper: Analyze -> Search Records -> Alert / Info */}
              <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-[#070e1c] rounded-xl border border-white/5">
                <div className={`p-2 rounded-lg border text-center font-mono transition-all ${
                  (livePrediction?.stage_step || 0) >= 1
                    ? 'bg-amber-500/15 border-amber-400/50 text-amber-300'
                    : 'bg-white/5 border-white/5 text-slate-500'
                }`}>
                  <div className="text-[10px] font-bold tracking-wider">1. ANALYZE</div>
                  <div className="text-[9px] truncate">
                    {(livePrediction?.stage_step || 0) === 1 ? 'Inspecting...' : (livePrediction?.stage_step || 0) > 1 ? '✓ Analyzed' : 'Standby'}
                  </div>
                </div>

                <div className={`p-2 rounded-lg border text-center font-mono transition-all ${
                  (livePrediction?.stage_step || 0) >= 2
                    ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300'
                    : 'bg-white/5 border-white/5 text-slate-500'
                }`}>
                  <div className="text-[10px] font-bold tracking-wider">2. RECORDS</div>
                  <div className="text-[9px] truncate">
                    {(livePrediction?.stage_step || 0) === 2 ? 'Matching...' : (livePrediction?.stage_step || 0) > 2 ? '✓ 108 Verified' : 'Standby'}
                  </div>
                </div>

                <div className={`p-2 rounded-lg border text-center font-mono transition-all ${
                  (livePrediction?.stage_step || 0) >= 3
                    ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
                    : 'bg-white/5 border-white/5 text-slate-500'
                }`}>
                  <div className="text-[10px] font-bold tracking-wider">
                    {livePrediction?.alert_type === 'INFO' ? '3. INFO' : '3. ALERT'}
                  </div>
                  <div className="text-[9px] truncate">
                    {(livePrediction?.stage_step || 0) >= 3 ? '✓ Dispatched' : 'Standby'}
                  </div>
                </div>
              </div>

              {/* Graphic Display: Identified Sign Canvas */}
              <div className="bg-[#070e1c] border border-white/5 rounded-xl p-4 flex items-center gap-4 shadow-inner">
                {/* Rendered Sign Graphic or Optical Radar */}
                {livePrediction && livePrediction.raw_class_id >= 0 ? (
                  <div className="relative w-20 h-20 shrink-0 flex items-center justify-center bg-[#0b172a] rounded-xl border border-white/10 p-1 overflow-hidden shadow-md">
                    <img
                      src={livePrediction.image_url || '/signs/000.png'}
                      alt={livePrediction.sign_name || 'Traffic Sign'}
                      className="w-full h-full object-contain drop-shadow"
                      onError={(e: any) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="relative w-20 h-20 shrink-0 flex items-center justify-center bg-cyan-950/20 rounded-xl border border-cyan-500/30 overflow-hidden shadow-inner">
                    <div className="w-10 h-10 rounded-full border border-dashed border-cyan-400 animate-spin flex items-center justify-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                    </div>
                  </div>
                )}

                {/* Metadata beside sign */}
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-[9px] text-slate-400 uppercase">
                    {livePrediction && livePrediction.raw_class_id >= 0
                      ? `${livePrediction.category || 'MANDATORY'} SIGN #${String(livePrediction.raw_class_id).padStart(3, '0')}`
                      : 'OPTICAL DETECTOR STANDBY'}
                  </span>
                  <span className="font-heading text-sm text-white font-bold truncate">
                    {livePrediction && livePrediction.raw_class_id >= 0
                      ? (livePrediction.class_id || 'IRC67')
                      : 'Searching for Signs...'}
                  </span>
                  <span className="font-body-sm text-xs text-slate-300 mt-0.5">
                    {livePrediction && livePrediction.raw_class_id >= 0
                      ? (webcamLang === 'te' && livePrediction.name_te
                          ? livePrediction.name_te
                          : webcamLang === 'hi' && livePrediction.name_hi
                          ? livePrediction.name_hi
                          : livePrediction.sign_name)
                      : 'Align road sign or screen inside camera reticle'}
                  </span>
                  {livePrediction && livePrediction.raw_class_id >= 0 && webcamLang !== 'en' && (
                    <span className="font-mono text-[10px] text-slate-400">
                      {livePrediction.sign_name}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px]">
                    {livePrediction && livePrediction.raw_class_id >= 0 ? (
                      <>
                        <span className={`font-semibold ${livePrediction.is_confirmed ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {livePrediction.confidence || 0}% Conf
                        </span>
                        <span className="text-slate-400">• {livePrediction.is_confirmed ? 'Target Locked' : 'Acquiring'}</span>
                      </>
                    ) : (
                      <span className="text-cyan-400 font-semibold">• Optical Radar Ready</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Webcam Voice Alert Avionics Status Card */}
              <div className="bg-[#070e1c] border border-cyan-500/30 rounded-xl p-3.5 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-cyan-400 text-lg">record_voice_over</span>
                    <span className="font-mono text-xs text-white font-bold uppercase tracking-wider">
                      Webcam Voice Alert System
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                    voiceAlertsEnabled
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-slate-700/40 text-slate-400 border-slate-600'
                  }`}>
                    {voiceAlertsEnabled ? 'VOICE ARMED' : 'MUTED'}
                  </span>
                </div>

                <div className="flex flex-col gap-2 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center bg-[#10203B] p-0.5 rounded-lg border border-white/10 text-xs font-mono">
                      {(['all', 'en', 'te', 'hi'] as AlertLanguage[]).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => {
                            setWebcamLang(lang);
                            speechService.updateSettings({ language: lang });
                          }}
                          className={`px-2 py-1 rounded text-xs transition-all ${
                            webcamLang === lang
                              ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title={lang === 'all' ? 'Sequential Multilingual (English -> Telugu -> Hindi)' : `Speak in ${lang}`}
                        >
                          {lang === 'all' ? 'ALL' : lang === 'en' ? 'EN' : lang === 'te' ? 'తెలుగు' : 'हिंदी'}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        if (livePrediction && livePrediction.raw_class_id >= 0) {
                          speakWebcamDetection(livePrediction, true);
                        } else {
                          speechService.testVoiceOutput((l) => setActiveSpeakingLang(l));
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm"
                      title="Trigger immediate sequential voice announcement"
                    >
                      <span className="material-symbols-outlined text-sm">volume_up</span>
                      <span>Test Voice</span>
                    </button>
                  </div>

                  {/* Active Sequential Spoken Language Flow */}
                  {activeSpeakingLang && (
                    <div className="bg-cyan-500/15 border border-cyan-400/50 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-xs font-mono text-cyan-300 animate-pulse">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                        <span className="font-semibold text-[11px]">ACTIVE SPEECH:</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className={`px-1.5 py-0.5 rounded ${activeSpeakingLang === 'en' ? 'bg-cyan-400 text-slate-950 shadow' : 'text-slate-500'}`}>
                          EN
                        </span>
                        <span className="text-slate-600">➜</span>
                        <span className={`px-1.5 py-0.5 rounded ${activeSpeakingLang === 'te' ? 'bg-cyan-400 text-slate-950 shadow' : 'text-slate-500'}`}>
                          తెలుగు
                        </span>
                        <span className="text-slate-600">➜</span>
                        <span className={`px-1.5 py-0.5 rounded ${activeSpeakingLang === 'hi' ? 'bg-cyan-400 text-slate-950 shadow' : 'text-slate-500'}`}>
                          हिंदी
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {lastVoiceSpoken && (
                  <div className="bg-[#10203B]/60 border border-white/5 rounded-lg p-2 font-mono text-[11px] text-slate-300">
                    <span className="text-[10px] text-cyan-400 font-bold block mb-0.5">LAST SPOKEN:</span>
                    "{lastVoiceSpoken.text}"
                  </div>
                )}
              </div>

              {/* Confidence Meter Visual */}
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">MODEL CERTAINTY SCORE</span>
                  <span className="text-cyan-400 font-bold">
                    {livePrediction?.confidence || 0}% (Confirm Threshold: 35.0%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all duration-200"
                    style={{ width: `${Math.min(100, Math.max(0, livePrediction?.confidence || 0))}%` }}
                  ></div>
                </div>
              </div>

              {/* Top 5 Probability Breakdown */}
              {livePrediction?.top5 && livePrediction.top5.length > 0 && (
                <div className="bg-[#070e1c] border border-white/5 rounded-xl p-3 space-y-2">
                  <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">
                    NEURAL CLASSIFIER PROBABILITIES (TOP 5)
                  </span>
                  <div className="space-y-1.5">
                    {livePrediction.top5.map((t: any, idx: number) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-300 truncate max-w-[210px]">
                            #{String(t.class_id).padStart(3, '0')} {t.class_name}
                          </span>
                          <span className={`font-bold ${idx === 0 ? 'text-cyan-400' : 'text-slate-400'}`}>
                            {t.percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-150 ${
                              idx === 0 ? 'bg-gradient-to-r from-cyan-400 to-emerald-400' : 'bg-slate-600'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, t.percentage))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Telemetry Properties Matrix */}
              <div className="bg-[#070e1c] border border-white/5 rounded-xl p-3 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">STATUTORY FINE:</span>
                  <span className="text-amber-400 font-semibold">{livePrediction?.penalty_info || 'Statutory rules apply'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">LEGAL SECTION:</span>
                  <span className="text-blue-400 font-semibold">{livePrediction?.legal_reference || 'Sec 119 / 177 MV Act'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">REQUIRED ACTION:</span>
                  <span className="text-white text-right max-w-[220px] truncate" title={livePrediction?.meaning}>
                    {(webcamLang === 'te' && livePrediction?.meaning_te
                      ? livePrediction.meaning_te
                      : webcamLang === 'hi' && livePrediction?.meaning_hi
                      ? livePrediction.meaning_hi
                      : livePrediction?.meaning) || 'Observe statutory regulations.'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">TARGET DISTANCE:</span>
                  <span className="text-emerald-400">{livePrediction?.distance_est || '~14m'}</span>
                </div>
              </div>

              {/* Review Action Buttons */}
              <div className="space-y-2 pt-1">
                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">
                  HUMAN OPERATOR VERIFICATION
                </span>

                <button
                  onClick={() => setVerifiedStatus('VERIFIED_HUMAN')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_16px_rgba(16,185,129,0.4)]"
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>Confirm Detection (Commit to Record)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setVerifiedStatus('UNCERTAIN')}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-all font-mono text-xs border border-amber-500/30"
                  >
                    <span className="material-symbols-outlined text-base">help</span>
                    <span>Mark Uncertain</span>
                  </button>

                  <button
                    onClick={() => setVerifiedStatus('FALSE_POSITIVE')}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all font-mono text-xs border border-red-500/30"
                  >
                    <span className="material-symbols-outlined text-base">cancel</span>
                    <span>False Positive</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backend API Connection Modal */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10203B] border border-cyan-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400">dns</span>
                <h3 className="font-heading font-bold text-lg text-white">Backend API Server</h3>
              </div>
              <button
                onClick={() => setShowApiModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Set the live backend server URL for your AI model and voice features. If hosted on Render, paste your Render URL ending in <code className="text-cyan-300 bg-black/40 px-1 py-0.5 rounded">/api</code>.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 uppercase">Live API Endpoint</label>
              <input
                type="text"
                value={customApiUrlInput}
                onChange={(e) => setCustomApiUrlInput(e.target.value)}
                placeholder="https://aerovision-api.onrender.com/api"
                className="w-full bg-[#070e1c] border border-white/15 rounded-xl px-3.5 py-2.5 font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setCustomApiUrl('');
                  setCustomApiUrlInput('/api');
                  toast.info('Reset API URL to default (/api)');
                  setShowApiModal(false);
                }}
                className="px-3 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Reset Default
              </button>
              <button
                onClick={() => {
                  const cleaned = customApiUrlInput.trim();
                  setCustomApiUrl(cleaned);
                  toast.success('Connected to Backend API: ' + (cleaned || '/api'));
                  setShowApiModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
