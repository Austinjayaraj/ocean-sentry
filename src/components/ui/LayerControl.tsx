import type { OceanLayer, OceanParameter, DepthLevel } from '../../types/ocean';
import { PARAMETER_CONFIG, DEPTH_LABELS } from '../../utils/oceanCalc';

interface LayerControlProps {
  layer: OceanLayer;
  onChange: (l: OceanLayer) => void;
}

const LAYERS: { key: OceanLayer; label: string; color: string }[] = [
  { key: 'model',       label: 'MODEL',       color: '#60a5fa' },
  { key: 'observation', label: 'OBSERVATIONS', color: '#22d3ee' },
  { key: 'difference',  label: 'DIFFERENCE',  color: '#f59e0b' },
  { key: 'anomaly',     label: 'ANOMALY',     color: '#ef4444' },
];

export function LayerControl({ layer, onChange }: LayerControlProps) {
  return (
    <div className="instrument p-3" style={{ width: '160px' }}>
      <div style={{ fontSize: '8px', letterSpacing: '0.2em', color: '#475569', marginBottom: 10 }}>
        DATA LAYER
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {LAYERS.map((l) => (
          <button
            key={l.key}
            onClick={() => onChange(l.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              background: layer === l.key ? `${l.color}12` : 'transparent',
              border: `1px solid ${layer === l.key ? `${l.color}40` : 'transparent'}`,
              borderRadius: '3px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: layer === l.key ? l.color : '#334155',
              transition: 'background 0.2s ease',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: '9px', letterSpacing: '0.12em',
              color: layer === l.key ? l.color : '#475569',
              fontWeight: layer === l.key ? 600 : 400,
            }}>
              {l.label}
            </span>
          </button>
        ))}
      </div>

      {/* Difference legend */}
      {(layer === 'difference' || layer === 'anomaly') && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '7px', color: '#334155', letterSpacing: '0.12em', marginBottom: 4 }}>
            DEVIATION SCALE
          </div>
          <div style={{
            height: '3px', borderRadius: '2px',
            background: 'linear-gradient(90deg, #22d3ee, #f59e0b, #ef4444)',
            marginBottom: 3,
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '7px', color: '#334155' }}>LOW</span>
            <span style={{ fontSize: '7px', color: '#334155' }}>HIGH</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface ParameterControlProps {
  parameter: OceanParameter;
  onChange: (p: OceanParameter) => void;
}

const PARAMS: OceanParameter[] = ['temperature', 'salinity', 'waveHeight', 'currentSpeed', 'seaLevel'];

export function ParameterControl({ parameter, onChange }: ParameterControlProps) {
  return (
    <div className="instrument p-3" style={{ width: '160px' }}>
      <div style={{ fontSize: '8px', letterSpacing: '0.2em', color: '#475569', marginBottom: 10 }}>
        PARAMETER
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {PARAMS.map((p) => {
          const cfg = PARAMETER_CONFIG[p];
          const isActive = p === parameter;
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '5px 8px',
                background: isActive ? 'rgba(34,211,238,0.08)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(34,211,238,0.3)' : 'transparent'}`,
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <span style={{
                fontSize: '9px', letterSpacing: '0.1em',
                color: isActive ? '#22d3ee' : '#475569',
              }}>
                {cfg.shortLabel}
              </span>
              <span style={{ fontSize: '8px', color: '#334155', fontFamily: 'monospace' }}>
                {cfg.unit}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DepthControlProps {
  depth: DepthLevel;
  onChange: (d: DepthLevel) => void;
}

const DEPTHS: DepthLevel[] = [0, 10, 50, 100, 500, 1000];

export function DepthControl({ depth, onChange }: DepthControlProps) {
  return (
    <div className="instrument p-3" style={{ width: '160px' }}>
      <div style={{ fontSize: '8px', letterSpacing: '0.2em', color: '#475569', marginBottom: 10 }}>
        DEPTH
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {DEPTHS.map((d, i) => {
          const isActive = d === depth;
          const depthPct = i / (DEPTHS.length - 1);
          return (
            <button
              key={d}
              onClick={() => onChange(d)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 8px',
                background: isActive ? 'rgba(34,211,238,0.08)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(34,211,238,0.25)' : 'transparent'}`,
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%',
              }}
            >
              {/* Depth bar visual */}
              <div style={{
                width: `${8 + depthPct * 14}px`,
                height: '2px',
                background: isActive ? '#22d3ee' :
                  `rgba(34,211,238,${0.18 + depthPct * 0.12})`,
              }} />
              <span style={{
                fontSize: '9px', letterSpacing: '0.1em',
                color: isActive ? '#22d3ee' : '#475569',
              }}>
                {DEPTH_LABELS[d]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
