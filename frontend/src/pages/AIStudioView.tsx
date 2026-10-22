import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { ALL_108_RTO_SIGNS } from '../data/rtoSignsData';
import { speechService, type AlertLanguage } from '../services/speechService';

export const AIStudioView: React.FC = () => {
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeMode, setActiveMode] = useState<'stream' | 'webcam' | 'upload'>('stream');
  
  // Voice Alert Avionics for Webcam & Optical Perception
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState(true);
  const [webcamLang, setWebcamLang] = useState<AlertLanguage>('en');
  const [lastVoiceSpoken, setLastVoiceSpoken] = useState<{
    text: string;
    signName: string;
    timestamp: number;
    lang: AlertLanguage;
  } | null>(null);
  const lastSpokenWebcamSignRef = useRef<{ signId: number; timestamp: number }>({ signId: -1, timestamp: 0 });

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

  useEffect(() => {
    api.getModelStatus().then(setModelStatus).catch(() => null);
  }, []);

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

  const parsePredictionResult = (res: any) => {
    if (!res || !res.primary_prediction) return null;
    const now = Date.now();
    const rawCid = Number(res.primary_prediction.class_id);
    const rawConf = Math.round(res.primary_prediction.confidence * 1000) / 10;
    const rawBox: [number, number, number, number] = res.bounding_box || [160, 100, 320, 260];
    const isDetected = Boolean(res.is_detected !== false && rawCid >= 0 && rawConf >= 28);

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

    // Smooth Transition: Prevent single-frame flicker while allowing rapid, responsive sign switching
    if (activeLockRef.current && now < activeLockRef.current.lockedUntil) {
      const priorCid = activeLockRef.current.class_id;
      // If a new sign candidate has appeared with good confidence (>=42%) or repeated occurrence, switch smoothly
      const newCandidateIsStrong = bestCid !== priorCid && (bestAvgConf >= 42 || (voteMap[bestCid]?.count || 0) >= 2);
      if (!newCandidateIsStrong) {
        // Retain prior lock for continuity
        bestCid = priorCid;
        bestAvgConf = Math.max(bestAvgConf, activeLockRef.current.confidence);
      } else {
        // Clear prior lock so new sign immediately takes over
        activeLockRef.current = null;
      }
    }

    // Update active lock if consensus is established on the winning sign
    const isStrong = (bestAvgConf >= 42 && (voteMap[bestCid]?.count || 1) >= 2) || bestAvgConf >= 55;
    if (isStrong) {
      activeLockRef.current = {
        class_id: bestCid,
        sign_name: voteMap[bestCid]?.name || res.primary_prediction.sign_name,
        confidence: bestAvgConf,
        lockedUntil: now + 800,
      };
    }

    const signMeta = ALL_108_RTO_SIGNS.find((s) => s.class_id === bestCid) || ALL_108_RTO_SIGNS[bestCid];
    const isConfirmed = Boolean(isStrong || (activeLockRef.current && now < activeLockRef.current.lockedUntil));

    return {
      sign_name: signMeta?.name || res.primary_prediction.sign_name,
      class_id: signMeta?.sign_code || `#${String(bestCid).padStart(3, '0')}`,
      raw_class_id: bestCid,
      category: signMeta?.category || res.primary_prediction.risk_tier || 'MANDATORY',
      shape: signMeta?.shape || 'Standard',
      color_code: signMeta?.color_code || '#EF4444',
      image_url: signMeta?.image_url || `/signs/${String(bestCid).padStart(3, '0')}.png`,
      confidence: bestAvgConf,
      margin_score: res.primary_prediction.margin_score || 0,
      is_confirmed: isConfirmed,
      legal_reference: signMeta?.legal_reference || res.primary_prediction.legal_reference || 'IRC:67 Regulatory',
      penalty_info: signMeta?.penalty_info || `₹${res.primary_prediction.fine_amount || 500} fine under ${res.primary_prediction.mv_act_section || 'Sec 177 MV Act'}`,
      meaning: signMeta?.meaning || res.primary_prediction.advice,
      halt: signMeta?.halt,
      distance_est: isConfirmed ? '~14m' : 'Acquiring...',
      inference_ms: Math.round((res.inference_time_ms || 18.0) * 10) / 10,
      bounding_box: smoothedBoxRef.current || rawBox,
      frame_dimensions: res.frame_dimensions || [640, 480],
      top5: res.top5_predictions || [],
      status: isConfirmed ? 'CONFIRMED_ACTIVE' : 'ACQUIRING_FOCUS',
    };
  };

  const webcamActiveRef = useRef(false);
  const isInferencePendingRef = useRef(false);
  const loopTimeoutRef = useRef<any>(null);

  const scheduleNextTick = (delayMs = 60) => {
    if (!webcamActiveRef.current) return;
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    loopTimeoutRef.current = setTimeout(() => {
      runLiveFrameInference();
    }, delayMs);
  };

  // Real webcam activation with zero race condition
  const startWebcam = async () => {
    setActiveMode('webcam');
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
    } catch (err: any) {
      alert('Unable to access webcam: ' + err.message);
      webcamActiveRef.current = false;
      setWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    webcamActiveRef.current = false;
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

    const now = Date.now();
    const isDifferentSign = signMeta.raw_class_id !== lastSpokenWebcamSignRef.current.signId;
    const cooldownOver = now - lastSpokenWebcamSignRef.current.timestamp > 4200;

    if (!force && !isDifferentSign && !cooldownOver) {
      return;
    }

    let promptText = '';
    const name = signMeta.sign_name || 'Traffic Sign';

    if (webcamLang === 'te') {
      if (signMeta.raw_class_id === 0 || signMeta.halt) {
        promptText = 'హెచ్చరిక: ఆగు సంకేతం గుర్తించబడింది. వాహనాన్ని పూర్తిగా నిలపండి.';
      } else if (name.toLowerCase().includes('speed') || name.toLowerCase().includes('limit')) {
        promptText = `హెచ్చరిక: ${name} గుర్తించబడింది. వేగ పరిమితి పాటించండి.`;
      } else if (signMeta.category === 'MANDATORY') {
        promptText = `తప్పనిసరి సంకేతం: ${name}. నిబంధనలను పాటించండి.`;
      } else {
        promptText = `హెచ్చరిక: ${name} గుర్తించబడింది. జాగ్రత్తగా నడపండి.`;
      }
    } else if (webcamLang === 'hi') {
      if (signMeta.raw_class_id === 0 || signMeta.halt) {
        promptText = 'चेतावनी: स्टॉप साइन पहचाना गया। वाहन को पूरी तरह रोकें।';
      } else if (name.toLowerCase().includes('speed') || name.toLowerCase().includes('limit')) {
        promptText = `चेतावनी: ${name} पहचाना गया। गति सीमा का पालन करें।`;
      } else if (signMeta.category === 'MANDATORY') {
        promptText = `अनिवार्य संकेत: ${name}। नियमों का पालन करें।`;
      } else {
        promptText = `चेतावनी: ${name} पहचाना गया। सावधानी से वाहन चलाएं।`;
      }
    } else {
      if (signMeta.raw_class_id === 0 || signMeta.halt) {
        promptText = 'Warning: Stop Sign detected. Mandatory full stop before stop line.';
      } else if (name.toLowerCase().includes('speed') || name.toLowerCase().includes('limit')) {
        promptText = `Warning: ${name} detected. Observe posted speed limit.`;
      } else if (signMeta.category === 'MANDATORY') {
        promptText = `Mandatory notice: ${name}. Compliance required.`;
      } else if (signMeta.category === 'CAUTIONARY') {
        promptText = `Caution: ${name} ahead. Proceed with caution.`;
      } else {
        promptText = `Notice: ${name} detected.`;
      }
    }

    const urgency = (signMeta.category === 'MANDATORY' || signMeta.halt) ? 'CRITICAL' : 'WARNING';
    speechService.speak(promptText, urgency, webcamLang);

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
    if (!webcamActiveRef.current) return;

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

      if (blob && webcamActiveRef.current) {
        const formData = new FormData();
        formData.append('file', blob, 'webcam_frame.jpg');
        const res = await api.predictFrame(formData);
        const parsed = parsePredictionResult(res);
        if (parsed && webcamActiveRef.current) {
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
      const parsed = parsePredictionResult(res);
      if (parsed) {
        setLivePrediction(parsed);
        if (parsed.is_confirmed && parsed.raw_class_id >= 0) {
          speakWebcamDetection(parsed, true);
        }
      }
    } catch (err: any) {
      alert('Inference error: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col w-full gap-6 max-w-[1720px] mx-auto text-on-surface">
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
            {(['en', 'te', 'hi'] as AlertLanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setWebcamLang(lang)}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  webcamLang === lang
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang === 'en' ? 'EN' : lang === 'te' ? 'తెలుగు' : 'हिंदी'}
              </button>
            ))}
          </div>

          {/* Test Voice Button */}
          <button
            onClick={() => {
              if (livePrediction && livePrediction.raw_class_id >= 0) {
                speakWebcamDetection(livePrediction, true);
              } else {
                speechService.speak(
                  webcamLang === 'te'
                    ? 'టెస్ట్: ఆగు సంకేతం గుర్తించబడింది.'
                    : webcamLang === 'hi'
                    ? 'परीक्षण: स्टॉप संकेत पहचाना गया।'
                    : 'Test alert: Stop sign detected ahead.',
                  'CRITICAL',
                  webcamLang
                );
              }
            }}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 text-xs font-mono flex items-center gap-1 transition-all"
            title="Trigger immediate voice output test"
          >
            <span className="material-symbols-outlined text-sm">graphic_eq</span>
            <span className="hidden md:inline">Test Output</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Split Video Engine & Sidecar Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: 16:9 Vision Player Stage (Cols 8) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Video Viewport Container */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#070e1c] shadow-2xl group select-none border border-white/10">
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

            {/* Holographic Scrim / HUD Layer */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#070B14]/80 via-transparent to-[#070B14]/40 pointer-events-none"></div>

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

            {/* Top-Left Live Record Telemetry Pill */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-[#070e1c]/85 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md border border-white/10 pointer-events-none">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse"></span>
              <span className="font-mono text-xs text-white tracking-wider">LIVE INFERENCE</span>
              <span className="text-slate-500">|</span>
              <span className="font-mono text-xs text-cyan-400 font-semibold">PYTORCH RT ACCEL</span>
            </div>

            {/* Top-Right Optical Sensor Diagnostic Box */}
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

              if (activeMode === 'webcam' || activeMode === 'upload') {
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
                      <div className="relative w-full h-full rounded-sm shadow-[0_0_20px_rgba(16,185,129,0.7)] bg-emerald-500/15 border-2 border-emerald-400">
                        <span className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-300"></span>
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-300"></span>
                        <span className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-300"></span>
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-300"></span>
                        <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                      </div>

                      <div className="absolute -top-8 left-0 whitespace-nowrap bg-[#070e1c]/95 border border-emerald-400 backdrop-blur-lg px-2.5 py-1 rounded shadow-lg flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span className="text-white font-semibold">[{livePrediction.sign_name}]</span>
                        <span className="text-emerald-400 font-bold">{livePrediction.confidence}%</span>
                        <span className="text-slate-400">• Confirmed Active</span>
                      </div>
                    </div>
                  );
                } else {
                  // Aiming / Standby Reticle
                  return (
                    <div className="absolute top-[20%] left-[25%] w-[50%] h-[60%] pointer-events-none flex flex-col items-center justify-center z-20">
                      <div className="relative w-full h-full rounded-2xl border-2 border-dashed border-cyan-400/50 bg-cyan-950/15 flex items-center justify-center">
                        <span className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-cyan-400"></span>
                        <span className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-cyan-400"></span>
                        <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-cyan-400"></span>
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-cyan-400"></span>
                        
                        <div className="w-8 h-0.5 bg-cyan-400/50"></div>
                        <div className="h-8 w-0.5 bg-cyan-400/50 absolute"></div>

                        <div className="absolute bottom-3 bg-[#070e1c]/90 border border-cyan-400/40 px-3.5 py-1 rounded-full font-mono text-[11px] text-cyan-300 tracking-wide flex items-center gap-2 shadow-lg">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                          <span>
                            {livePrediction.confidence >= 25 && livePrediction.raw_class_id >= 0
                              ? `ACQUIRING FOCUS: ${livePrediction.sign_name} (${livePrediction.confidence}%)`
                              : 'KEEP FULL SIGN INSIDE RETICLE (~30-60 CM / 1-2 FT)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
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

            {/* LIVE VOICE ADVISORY BROADCAST HUD BANNER */}
            {lastVoiceSpoken && (
              <div className="absolute bottom-14 inset-x-3 z-30 bg-[#070e1c]/95 border border-cyan-400/50 backdrop-blur-xl p-3 rounded-xl shadow-[0_0_24px_rgba(34,211,238,0.35)] flex items-center justify-between animate-fadeIn transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0">
                    <span className="material-symbols-outlined text-xl animate-pulse">volume_up</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
                        PC WEBCAM VOICE ALERT • [{lastVoiceSpoken.lang.toUpperCase()}]
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span className="font-mono text-[9px] text-slate-400 truncate max-w-[120px]">{lastVoiceSpoken.signName}</span>
                    </div>
                    <p className="font-body-sm text-xs text-white font-medium truncate sm:whitespace-normal">
                      "{lastVoiceSpoken.text}"
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => speechService.speak(lastVoiceSpoken.text, 'CRITICAL', lastVoiceSpoken.lang)}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-cyan-300 transition-colors flex items-center gap-1.5 border border-cyan-400/30"
                    title="Re-play Voice Announcement"
                  >
                    <span className="material-symbols-outlined text-sm">replay</span>
                    <span className="hidden sm:inline">Repeat</span>
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Player In-Viewport Controls Overlay */}
            <div className="absolute bottom-3 inset-x-3 bg-[#070e1c]/80 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-xl flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-white transition-colors"
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
          </div>

          {/* Optical Telemetry Auxiliary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#10203B]/70 border border-white/10 p-3 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-slate-400">VEHICLE SPEED</span>
                <span className="font-mono text-lg text-white font-bold">
                  48.2 <span className="text-xs text-slate-400 font-normal">KM/H</span>
                </span>
              </div>
              <span className="material-symbols-outlined text-emerald-400 text-2xl">speed</span>
            </div>

            <div className="bg-[#10203B]/70 border border-white/10 p-3 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-slate-400">GPS HEADING</span>
                <span className="font-mono text-lg text-white font-bold">
                  284° <span className="text-xs text-slate-400 font-normal">WNW</span>
                </span>
              </div>
              <span className="material-symbols-outlined text-cyan-400 text-2xl">explore</span>
            </div>

            <div className="bg-[#10203B]/70 border border-white/10 p-3 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-slate-400">ROAD GEOMETRY</span>
                <span className="font-mono text-lg text-white font-bold">
                  Tangent <span className="text-xs text-slate-400 font-normal">+0.4°</span>
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
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  {verifiedStatus || (livePrediction?.is_confirmed ? 'CONFIRMED ACTIVE' : 'SCANNING')}
                </span>
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
                      ? livePrediction.sign_name
                      : 'Align road sign or screen inside camera reticle'}
                  </span>
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

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center bg-[#10203B] p-0.5 rounded-lg border border-white/10 text-xs font-mono">
                    {(['en', 'te', 'hi'] as AlertLanguage[]).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setWebcamLang(lang)}
                        className={`px-2.5 py-1 rounded text-xs transition-all ${
                          webcamLang === lang
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {lang === 'en' ? 'EN' : lang === 'te' ? 'తెలుగు' : 'हिंदी'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      if (livePrediction && livePrediction.raw_class_id >= 0) {
                        speakWebcamDetection(livePrediction, true);
                      } else {
                        speechService.speak(
                          webcamLang === 'te'
                            ? 'వెబ్‌క్యామ్ వాయిస్ సిస్టమ్ సిద్ధంగా ఉంది.'
                            : webcamLang === 'hi'
                            ? 'वेबकैम वॉयस अलर्ट सिस्टम सक्रिय है।'
                            : 'Webcam optical voice alert system is armed and operational.',
                          'INFORMATIONAL',
                          webcamLang
                        );
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 text-xs font-mono flex items-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">volume_up</span>
                    <span>Test Voice</span>
                  </button>
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
                    {livePrediction?.meaning || 'Observe statutory regulations.'}
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
    </div>
  );
};
