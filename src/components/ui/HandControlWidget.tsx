import React, { useState } from 'react';
import type { GestureType, TrackingStatus } from '../../hooks/useHandGesture';

interface HandControlWidgetProps {
  isEnabled: boolean;
  onToggle: () => void;
  status: TrackingStatus;
  gesture: GestureType;
  confidence: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function HandControlWidget({
  isEnabled,
  onToggle,
  status,
  gesture,
  confidence,
  videoRef,
  canvasRef,
}: HandControlWidgetProps) {
  const [showHelp, setShowHelp] = useState(false);

  const getStatusBadge = () => {
    if (!isEnabled) {
      return { label: 'OFF', color: '#64748b', dot: '○' };
    }
    switch (status) {
      case 'loading':
        return { label: 'INITIALIZING...', color: '#f59e0b', dot: '◌' };
      case 'ready':
      case 'tracking':
        return { label: 'ACTIVE', color: '#22c55e', dot: '●' };
      case 'permission_denied':
        return { label: 'DENIED', color: '#ef4444', dot: '✕' };
      case 'unavailable':
      default:
        return { label: 'UNAVAILABLE', color: '#64748b', dot: '○' };
    }
  };

  const badge = getStatusBadge();

  const getGestureLabel = () => {
    switch (gesture) {
      case 'drag':
        return 'ROTATING GLOBE';
      case 'pinch':
        return 'ZOOMING';
      case 'pan':
        return 'PANNING';
      case 'fist':
        return 'INTERACTION PAUSED';
      case 'palm':
        return 'PALM DETECTED';
      default:
        return 'MOVE HAND TO ROTATE';
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '52px',
        right: '16px',
        zIndex: 35,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '6px',
      }}
    >
      {/* Mini Help Popover */}
      {showHelp && (
        <div
          style={{
            background: 'rgba(2, 8, 22, 0.95)',
            border: '1px solid rgba(34,211,238,0.2)',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '9px',
            color: '#cbd5e1',
            width: '210px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
            marginBottom: '4px',
          }}
        >
          <div style={{ fontWeight: 600, color: '#22d3ee', letterSpacing: '0.12em', marginBottom: 6 }}>
            GESTURE COMMANDS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: 1.4 }}>
            <div><span style={{ color: '#38bdf8' }}>🖐 Open Hand:</span> Move to rotate Earth</div>
            <div><span style={{ color: '#38bdf8' }}>🤏 Pinch:</span> Zoom in / out</div>
            <div><span style={{ color: '#38bdf8' }}>✊ Fist:</span> Pause & lock view</div>
            <div><span style={{ color: '#94a3b8' }}>🖱 Mouse & Touch:</span> Always active</div>
          </div>
        </div>
      )}

      {/* Main compact widget card */}
      <div
        className="instrument"
        style={{
          background: 'rgba(2, 8, 22, 0.88)',
          border: `1px solid ${isEnabled ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: '8px',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          width: isEnabled && (status === 'tracking' || status === 'ready') ? '148px' : 'auto',
          boxShadow: isEnabled ? '0 0 20px rgba(34,211,238,0.1)' : 'none',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Top Header / Toggle Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 0',
            }}
            title={isEnabled ? 'Click to disable hand control' : 'Click to enable hand gesture control'}
          >
            {/* Hand icon SVG */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isEnabled ? '#22d3ee' : '#64748b'} strokeWidth="2">
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
            </svg>
            <span style={{ fontSize: '8px', letterSpacing: '0.14em', fontWeight: 600, color: isEnabled ? '#e2e8f0' : '#94a3b8' }}>
              HAND CONTROL
            </span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '7px', color: badge.color, fontFamily: 'monospace', fontWeight: 600 }}>
              {badge.dot} {badge.label}
            </span>
            <button
              onClick={() => setShowHelp(!showHelp)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                borderRadius: '50%',
                width: '14px',
                height: '14px',
                color: '#64748b',
                fontSize: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
              title="Gesture Help"
            >
              ?
            </button>
          </div>
        </div>

        {/* Tiny webcam preview box when enabled */}
        {isEnabled && (
          <div style={{ position: 'relative', width: '100%', height: '82px', borderRadius: '4px', overflow: 'hidden', background: '#000' }}>
            {/* Hidden video element for MediaPipe stream */}
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ display: 'none' }}
            />

            {/* Canvas overlay with mini skeleton */}
            <canvas
              ref={canvasRef}
              width={160}
              height={120}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />

            {/* Gesture status badge overlay */}
            <div
              style={{
                position: 'absolute',
                bottom: 2,
                left: 4,
                right: 4,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '2px',
                padding: '2px 4px',
              }}
            >
              <span style={{ fontSize: '7px', color: '#22d3ee', letterSpacing: '0.08em', fontWeight: 500 }}>
                {getGestureLabel()}
              </span>
              {confidence > 0 && (
                <span style={{ fontSize: '7px', color: '#64748b', fontFamily: 'monospace' }}>
                  {confidence}%
                </span>
              )}
            </div>

            {status === 'loading' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(2,8,22,0.85)',
                  fontSize: '8px',
                  color: '#22d3ee',
                  letterSpacing: '0.1em',
                }}
              >
                LOADING AI...
              </div>
            )}
          </div>
        )}

        {status === 'permission_denied' && (
          <div style={{ fontSize: '7px', color: '#ef4444', letterSpacing: '0.05em' }}>
            Webcam access denied. Mouse active.
          </div>
        )}
      </div>
    </div>
  );
}
