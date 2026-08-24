import { TIME_POINTS } from '../../utils/oceanCalc';

interface TimelineProps {
  timeIndex: number;
  isPlaying: boolean;
  onChange: (i: number) => void;
  onPlayPause: () => void;
}

export function Timeline({ timeIndex, isPlaying, onChange, onPlayPause }: TimelineProps) {
  const total = TIME_POINTS.length - 1;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '52px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        background: 'rgba(2, 8, 22, 0.82)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(34,211,238,0.12)',
        borderRadius: '6px',
        padding: '10px 20px',
        zIndex: 20,
        minWidth: '480px',
      }}
    >
      {/* Play/Pause */}
      <button
        onClick={onPlayPause}
        style={{
          width: 28, height: 28,
          borderRadius: '50%',
          border: '1px solid rgba(34,211,238,0.3)',
          background: isPlaying ? 'rgba(34,211,238,0.15)' : 'transparent',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="1" y="1" width="3" height="8" fill="#22d3ee" />
            <rect x="6" y="1" width="3" height="8" fill="#22d3ee" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 1L9 5L2 9V1Z" fill="#22d3ee" />
          </svg>
        )}
      </button>

      {/* Time labels */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 1, position: 'relative' }}>
        {TIME_POINTS.map((tp, i) => (
          <button
            key={tp.label}
            onClick={() => onChange(i)}
            style={{
              flex: 1, textAlign: 'center',
              fontSize: '8px', letterSpacing: '0.12em',
              color: i === timeIndex ? '#22d3ee' : '#334155',
              fontWeight: i === timeIndex ? 600 : 400,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '2px 0',
              transition: 'color 0.2s',
              position: 'relative',
            }}
          >
            {tp.label}
            {i === timeIndex && (
              <div style={{
                position: 'absolute',
                bottom: '-8px', left: '50%',
                transform: 'translateX(-50%)',
                width: 4, height: 4,
                borderRadius: '50%',
                background: '#22d3ee',
                boxShadow: '0 0 6px #22d3ee',
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Slider */}
      <div style={{ width: '120px', flexShrink: 0 }}>
        <input
          type="range"
          min={0}
          max={total}
          value={timeIndex}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: '100%' }}
          aria-label="Time scrubber"
        />
      </div>
    </div>
  );
}
