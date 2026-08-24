import { useState } from 'react';
import { ACTIVE_STATION_COUNT, ANOMALY_COUNT, MODEL_COVERAGE, DATA_FRESHNESS } from '../../data/oceanData';

interface NavigationProps {
  onNavClick?: (section: string) => void;
}

const NAV_ITEMS = ['EXPLORE', 'OBSERVATIONS', 'MODELS', 'ANALYTICS', 'ABOUT'];

export function Navigation({ onNavClick }: NavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Top nav bar */}
      <nav
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '52px',
          display: 'flex', alignItems: 'center',
          padding: '0 20px',
          zIndex: 40,
          background: 'linear-gradient(180deg, rgba(0,4,16,0.7) 0%, transparent 100%)',
        }}
      >
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          marginRight: '32px',
        }}>
          <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
            <path
              d="M1 8C3.5 4, 6 2, 8.5 5.5C11 9, 13 10, 16 7C17.5 5.5, 18.5 4.5, 19 4"
              stroke="url(#ng)" strokeWidth="1.8" strokeLinecap="round"
            />
            <defs>
              <linearGradient id="ng" x1="1" y1="6" x2="19" y2="6" gradientUnits="userSpaceOnUse">
                <stop stopColor="#22d3ee" /><stop offset="1" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
          <span style={{
            fontSize: '12px', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.9)',
            fontWeight: 500,
          }}>
            OCEAN SENTRY
          </span>
        </div>

        {/* Nav links - desktop */}
        <div style={{
          display: 'flex', gap: '24px', flex: 1,
        }}
          className="hidden sm:flex"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              onClick={() => onNavClick?.(item)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '9px', letterSpacing: '0.18em',
                color: 'rgba(148,163,184,0.7)',
                padding: '4px 0',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(34,211,238,0.85)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(148,163,184,0.7)')}
            >
              {item}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} className="sm:hidden" />

        {/* Status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', background: '#22c55e',
              boxShadow: '0 0 5px #22c55e',
            }} />
            <span style={{ fontSize: '9px', color: 'rgba(148,163,184,0.7)', letterSpacing: '0.12em' }}>
              OPERATIONAL
            </span>
          </div>

          {/* Mobile menu */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', marginLeft: '12px', padding: '4px',
            }}
            aria-label="Menu"
          >
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <rect y="0" width="16" height="1.5" rx="1" fill="currentColor" />
              <rect y="5.25" width="16" height="1.5" rx="1" fill="currentColor" />
              <rect y="10.5" width="16" height="1.5" rx="1" fill="currentColor" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div
          style={{
            position: 'absolute', top: '52px', right: 0,
            background: 'rgba(2, 8, 22, 0.95)',
            border: '1px solid rgba(34,211,238,0.12)',
            borderRadius: '0 0 6px 6px',
            padding: '8px 0',
            zIndex: 50,
            minWidth: '180px',
          }}
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              onClick={() => { onNavClick?.(item); setMenuOpen(false); }}
              style={{
                display: 'block', width: '100%',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '10px', letterSpacing: '0.15em', color: '#94a3b8',
                padding: '10px 20px', textAlign: 'left',
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {/* Bottom status bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '36px',
          display: 'flex', alignItems: 'center',
          padding: '0 20px',
          gap: '24px',
          background: 'linear-gradient(0deg, rgba(0,4,16,0.65) 0%, transparent 100%)',
          zIndex: 20,
        }}
      >
        {[
          { label: 'ACTIVE STATIONS', value: ACTIVE_STATION_COUNT },
          { label: 'MODEL COVERAGE', value: `${MODEL_COVERAGE}%` },
          { label: 'ANOMALIES', value: ANOMALY_COUNT, alert: true },
          { label: 'DATA SYNC', value: `${DATA_FRESHNESS} MIN AGO` },
        ].map(({ label, value, alert }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '7px', color: '#334155', letterSpacing: '0.15em' }}>
              {label}
            </span>
            <span style={{
              fontSize: '9px', fontFamily: 'monospace', fontWeight: 600,
              color: alert ? '#f59e0b' : '#94a3b8',
            }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
