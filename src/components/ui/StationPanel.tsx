import { useEffect, useRef } from 'react';
import type { Station, OceanParameter } from '../../types/ocean';
import { getComparisons, formatLastUpdate, PARAMETER_CONFIG } from '../../utils/oceanCalc';

interface StationPanelProps {
  station: Station;
  parameter: OceanParameter;
  onClose: () => void;
}

export function StationPanel({ station, parameter, onClose }: StationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const comparisons = getComparisons(station);
  const active = comparisons.find(c => c.parameter === parameter) ?? comparisons[0];
  const diff = active.difference;
  const pct = active.percentageDifference;

  const statusColor =
    active.status === 'critical' ? '#ef4444' :
    active.status === 'warning'  ? '#f59e0b' : '#22d3ee';

  const statusLabel =
    active.status === 'critical' ? 'HIGH DEVIATION' :
    active.status === 'warning'  ? 'WARNING' : 'NORMAL';

  // Animate in
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateX(0)';
    });
  }, [station.id]);

  const insight =
    active.status === 'critical'
      ? `Observed ${PARAMETER_CONFIG[parameter].label.toLowerCase()} is significantly ${diff > 0 ? 'above' : 'below'} the current model estimate. This deviation of ${Math.abs(pct).toFixed(0)}% may indicate a developing meteorological event not yet captured by the forecast model.`
      : active.status === 'warning'
      ? `A moderate deviation in observed ${PARAMETER_CONFIG[parameter].label.toLowerCase()} relative to the model estimate. This may reflect local variability or observation uncertainty.`
      : `Observed ${PARAMETER_CONFIG[parameter].label.toLowerCase()} is within expected bounds of the model estimate. Conditions appear nominal.`;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        right: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '280px',
        background: 'rgba(2, 8, 22, 0.92)',
        border: `1px solid ${statusColor}30`,
        borderRadius: '6px',
        backdropFilter: 'blur(16px)',
        overflow: 'hidden',
        zIndex: 30,
        boxShadow: `0 0 40px ${statusColor}15, 0 4px 32px rgba(0,0,0,0.6)`,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <div style={{
            fontSize: '11px', letterSpacing: '0.15em',
            color: '#94a3b8', marginBottom: 4,
          }}>
            {station.type.toUpperCase()} · {station.region}
          </div>
          <div style={{
            fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '0.05em',
            fontFamily: 'monospace',
          }}>
            {station.id}
          </div>
          <div style={{ fontSize: '10px', color: '#475569', marginTop: 2 }}>
            {station.latitude.toFixed(2)}°N &nbsp; {station.longitude.toFixed(2)}°E
            &nbsp;·&nbsp; {formatLastUpdate(station.lastSyncMinutes)}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: '#475569', cursor: 'pointer',
            fontSize: '18px', lineHeight: 1, padding: '2px 4px',
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Status bar */}
      <div style={{
        padding: '8px 16px',
        background: `${statusColor}12`,
        borderBottom: `1px solid ${statusColor}25`,
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
        <span style={{ fontSize: '10px', letterSpacing: '0.15em', color: statusColor, fontWeight: 600 }}>
          {statusLabel}
        </span>
      </div>

      {/* Parameter label */}
      <div style={{ padding: '12px 16px 8px' }}>
        <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.15em', marginBottom: 8 }}>
          {active.label.toUpperCase()}
        </div>

        {/* Model vs Observed */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: 12 }}>
          {[
            { label: 'MODEL', value: active.modelValue, unit: active.unit, color: '#60a5fa' },
            { label: 'OBSERVED', value: active.observedValue, unit: active.unit, color: '#22d3ee' },
            {
              label: 'DEVIATION',
              value: diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2),
              unit: active.unit,
              color: statusColor,
            },
          ].map(({ label, value, unit, color }) => (
            <div
              key={label}
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '4px',
                padding: '8px 8px 6px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '8px', color: '#475569', letterSpacing: '0.12em', marginBottom: 4 }}>
                {label}
              </div>
              <div style={{
                fontSize: '15px', fontWeight: 700, color,
                fontFamily: 'monospace', lineHeight: 1,
              }}>
                {typeof value === 'number' ? value.toFixed(2) : value}
              </div>
              <div style={{ fontSize: '9px', color: '#334155', marginTop: 2 }}>{unit}</div>
            </div>
          ))}
        </div>

        {/* Deviation bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em' }}>DEVIATION</span>
            <span style={{ fontSize: '9px', color: statusColor, fontFamily: 'monospace' }}>
              {Math.abs(pct).toFixed(1)}%
            </span>
          </div>
          <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
            <div style={{
              height: '100%', borderRadius: 1,
              width: `${Math.min(100, Math.abs(pct))}%`,
              background: statusColor,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>

        {/* Confidence */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em' }}>CONFIDENCE</span>
            <span style={{ fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace' }}>
              {active.confidence}%
            </span>
          </div>
          <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
            <div style={{
              height: '100%', borderRadius: 1,
              width: `${active.confidence}%`,
              background: 'rgba(96,165,250,0.6)',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Intelligence insight */}
      <div style={{
        margin: '0 12px 12px',
        padding: '10px 12px',
        background: `${statusColor}08`,
        border: `1px solid ${statusColor}20`,
        borderRadius: '4px',
      }}>
        <div style={{
          fontSize: '8px', color: '#f59e0b', letterSpacing: '0.15em', marginBottom: 6,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
          PROTOTYPE AI INSIGHT
        </div>
        <p style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.6 }}>{insight}</p>
      </div>

      {/* Other parameters mini-list */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '8px 16px 12px',
      }}>
        {comparisons.filter(c => c.parameter !== parameter).slice(0, 3).map((c) => (
          <div
            key={c.parameter}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '4px 0',
            }}
          >
            <span style={{ fontSize: '9px', color: '#334155', letterSpacing: '0.1em' }}>
              {c.label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '9px', color: '#64748b', fontFamily: 'monospace' }}>
                {c.observedValue.toFixed(2)} {c.unit}
              </span>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: c.status === 'critical' ? '#ef4444' :
                             c.status === 'warning' ? '#f59e0b' : '#22d3ee',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
