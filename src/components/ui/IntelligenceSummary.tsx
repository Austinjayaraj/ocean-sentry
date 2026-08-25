import type { AnomalySummary } from '../../services/oceanApi';

interface IntelligenceSummaryProps {
  summary: AnomalySummary | null;
  isLoading: boolean;
  dataSource: string;
}

export function IntelligenceSummary({ summary, isLoading, dataSource }: IntelligenceSummaryProps) {
  if (isLoading || !summary || !summary.available) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '64px',
        left: '16px',
        width: '220px',
        zIndex: 30,
        background: 'rgba(2, 8, 22, 0.88)',
        border: '1px solid rgba(34, 211, 238, 0.12)',
        borderRadius: '8px',
        padding: '12px',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 4px #22d3ee' }} />
        <span style={{ fontSize: '8px', letterSpacing: '0.2em', color: '#94a3b8', fontWeight: 600 }}>
          ML INTELLIGENCE
        </span>
      </div>

      {/* Score range */}
      <div>
        <div style={{ fontSize: '7px', letterSpacing: '0.12em', color: '#475569', marginBottom: '4px' }}>
          ANOMALY SCORE RANGE
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: '#22d3ee' }}>
            {summary.score_mean?.toFixed(3) ?? '—'}
          </span>
          <span style={{ fontSize: '8px', color: '#64748b' }}>mean</span>
        </div>
        <div style={{ fontSize: '8px', color: '#475569', fontFamily: 'monospace', marginTop: '2px' }}>
          [{summary.score_min?.toFixed(3) ?? '?'} — {summary.score_max?.toFixed(3) ?? '?'}]
        </div>
      </div>

      {/* Breakdown */}
      <div>
        <div style={{ fontSize: '7px', letterSpacing: '0.12em', color: '#475569', marginBottom: '6px' }}>
          CLASSIFICATION
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <StatusRow label="HIGH" count={summary.high_count ?? 0} color="#ef4444" total={summary.total_records ?? 1} />
          <StatusRow label="WARNING" count={summary.warning_count ?? 0} color="#f59e0b" total={summary.total_records ?? 1} />
          <StatusRow label="NORMAL" count={summary.normal_count ?? 0} color="#22c55e" total={summary.total_records ?? 1} />
        </div>
      </div>

      {/* Total */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '7px', color: '#334155', letterSpacing: '0.12em' }}>
            TOTAL SCORED
          </span>
          <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', fontWeight: 600 }}>
            {(summary.total_records ?? 0).toLocaleString()}
          </span>
        </div>
        <div style={{ fontSize: '7px', color: '#334155', marginTop: '4px' }}>
          {dataSource === 'api' ? 'Isolation Forest · QC-cleaned data' : 'Offline mode'}
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, count, color, total }: { label: string; count: number; color: string; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: '8px', color: '#64748b', width: '50px', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: '2px' }} />
      </div>
      <span style={{ fontSize: '8px', color: '#94a3b8', fontFamily: 'monospace', minWidth: '28px', textAlign: 'right' }}>
        {count}
      </span>
    </div>
  );
}
