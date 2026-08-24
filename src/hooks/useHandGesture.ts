import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export type GestureType = 'none' | 'drag' | 'pinch' | 'pan' | 'fist' | 'palm';
export type TrackingStatus = 'disabled' | 'loading' | 'ready' | 'tracking' | 'permission_denied' | 'unavailable';

export interface HandGestureState {
  status: TrackingStatus;
  isEnabled: boolean;
  gesture: GestureType;
  deltaX: number; // Normalized horizontal drag delta (-1 to 1)
  deltaY: number; // Normalized vertical drag delta (-1 to 1)
  pinchScale: number; // >1 zooming out, <1 zooming in
  isFist: boolean;
  confidence: number;
}

// Distance helper
function dist2D(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

export function useHandGesture() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [status, setStatus] = useState<TrackingStatus>('disabled');
  const [gesture, setGesture] = useState<GestureType>('none');
  const [confidence, setConfidence] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Filtered / smoothed values
  const smoothedPos = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDist = useRef<number | null>(null);
  const deltaRot = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const zoomFactor = useRef<number>(1.0);
  const isFistRef = useRef<boolean>(false);
  const palmHoldTimer = useRef<number>(0);

  // Initialize MediaPipe HandLandmarker
  useEffect(() => {
    let isCancelled = false;

    async function initMediaPipe() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        if (isCancelled) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        if (isCancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        if (isEnabled) setStatus('ready');
      } catch (err) {
        console.warn('MediaPipe initialization warning (will fallback to mouse):', err);
        if (!isCancelled) setStatus('unavailable');
      }
    }

    if (isEnabled && !landmarkerRef.current) {
      setStatus('loading');
      initMediaPipe();
    }

    return () => {
      isCancelled = true;
    };
  }, [isEnabled]);

  // Start / Stop camera stream
  useEffect(() => {
    if (!isEnabled) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setStatus('disabled');
      setGesture('none');
      smoothedPos.current = null;
      lastPinchDist.current = null;
      return;
    }

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            frameRate: { ideal: 24, max: 30 },
            facingMode: 'user',
          },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus('tracking');
        }
      } catch (err) {
        console.warn('Webcam permission denied or unavailable:', err);
        setStatus('permission_denied');
        setIsEnabled(false);
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isEnabled]);

  // Processing loop throttled to ~24 FPS for zero GPU/CPU lag
  useEffect(() => {
    if (!isEnabled || status !== 'tracking') return;

    const FRAME_INTERVAL = 1000 / 25; // 25 FPS max

    function processFrame(now: number) {
      rafRef.current = requestAnimationFrame(processFrame);

      if (now - lastTimeRef.current < FRAME_INTERVAL) return;
      lastTimeRef.current = now;

      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      const canvas = canvasRef.current;

      if (!video || !landmarker || video.readyState < 2) return;

      try {
        const results = landmarker.detectForVideo(video, now);
        const ctx = canvas?.getContext('2d');

        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Mirror preview horizontally
          ctx.save();
          ctx.scale(-1, 1);
          ctx.translate(-canvas.width, 0);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0]; // 21 landmarks
          const score = results.handedness?.[0]?.[0]?.score ?? 0.85;
          setConfidence(Math.round(score * 100));

          // Draw skeleton on mini preview canvas
          if (ctx && canvas) {
            ctx.fillStyle = '#22d3ee';
            ctx.strokeStyle = 'rgba(34,211,238,0.7)';
            ctx.lineWidth = 1.5;

            // Connections
            const connections = [
              [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
              [0, 5], [5, 6], [6, 7], [7, 8], // Index
              [5, 9], [9, 10], [10, 11], [11, 12], // Middle
              [9, 13], [13, 14], [14, 15], [16, 16], // Ring
              [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
              [0, 17], // Palm base
            ];

            connections.forEach(([i, j]) => {
              if (landmarks[i] && landmarks[j]) {
                ctx.beginPath();
                ctx.moveTo(landmarks[i].x * canvas.width, landmarks[i].y * canvas.height);
                ctx.lineTo(landmarks[j].x * canvas.width, landmarks[j].y * canvas.height);
                ctx.stroke();
              }
            });

            // Points
            landmarks.forEach((p) => {
              ctx.beginPath();
              ctx.arc(p.x * canvas.width, p.y * canvas.height, 2, 0, Math.PI * 2);
              ctx.fill();
            });
            ctx.restore();
          }

          // Key landmarks:
          // 0: Wrist
          // 4: Thumb tip
          // 8: Index tip
          // 12: Middle tip
          // 16: Ring tip
          // 20: Pinky tip
          // 9: Middle MCP (Hand center)
          const wrist = landmarks[0];
          const thumbTip = landmarks[4];
          const indexTip = landmarks[8];
          const middleTip = landmarks[12];
          const ringTip = landmarks[16];
          const pinkyTip = landmarks[20];
          const palmCenter = landmarks[9];

          // 1. Check Fist: all fingertips close to wrist
          const avgTipDistToWrist = (
            dist2D(thumbTip, wrist) +
            dist2D(indexTip, wrist) +
            dist2D(middleTip, wrist) +
            dist2D(ringTip, wrist) +
            dist2D(pinkyTip, wrist)
          ) / 5;

          if (avgTipDistToWrist < 0.22) {
            isFistRef.current = true;
            setGesture('fist');
            deltaRot.current = { dx: 0, dy: 0 };
            return;
          }
          isFistRef.current = false;

          // 2. Check Pinch: thumbTip to indexTip distance
          const pinchDist = dist2D(thumbTip, indexTip);
          const isPinching = pinchDist < 0.08;

          if (isPinching) {
            setGesture('pinch');
            if (lastPinchDist.current !== null) {
              const delta = pinchDist - lastPinchDist.current;
              // Pinch closer -> zoom in (scale < 1); expand -> zoom out (scale > 1)
              zoomFactor.current = 1.0 - delta * 2.5;
            }
            lastPinchDist.current = pinchDist;
            deltaRot.current = { dx: 0, dy: 0 };
            return;
          } else {
            lastPinchDist.current = null;
            zoomFactor.current = 1.0;
          }

          // 3. Check Open Palm Hold (held for > 1.2s toggles/status)
          const isOpenPalm = avgTipDistToWrist > 0.42;
          if (isOpenPalm) {
            palmHoldTimer.current += 1;
          } else {
            palmHoldTimer.current = 0;
          }

          // 4. One-hand Drag: track index tip or palm center with exponential smoothing
          const targetX = 1.0 - palmCenter.x; // Inverted for mirror view
          const targetY = palmCenter.y;

          if (!smoothedPos.current) {
            smoothedPos.current = { x: targetX, y: targetY };
          } else {
            // Exponential smoothing (alpha = 0.35)
            const alpha = 0.35;
            const newX = smoothedPos.current.x + (targetX - smoothedPos.current.x) * alpha;
            const newY = smoothedPos.current.y + (targetY - smoothedPos.current.y) * alpha;

            const dx = (newX - smoothedPos.current.x) * 4.0;
            const dy = (newY - smoothedPos.current.y) * 4.0;

            smoothedPos.current = { x: newX, y: newY };

            // Apply deadzone to remove micro-jitter
            const deadzone = 0.003;
            deltaRot.current = {
              dx: Math.abs(dx) > deadzone ? dx : 0,
              dy: Math.abs(dy) > deadzone ? dy : 0,
            };

            if (Math.abs(dx) > deadzone || Math.abs(dy) > deadzone) {
              setGesture('drag');
            } else {
              setGesture(isOpenPalm ? 'palm' : 'none');
            }
          }
        } else {
          if (ctx && canvas) {
            ctx.restore();
          }
          setConfidence(0);
          setGesture('none');
          smoothedPos.current = null;
          deltaRot.current = { dx: 0, dy: 0 };
        }
      } catch (err) {
        console.warn('Tracking tick error:', err);
      }
    }

    rafRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isEnabled, status]);

  const toggleEnabled = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  return {
    isEnabled,
    toggleEnabled,
    status,
    gesture,
    confidence,
    videoRef,
    canvasRef,
    deltaRot,
    zoomFactor,
    isFistRef,
  };
}
