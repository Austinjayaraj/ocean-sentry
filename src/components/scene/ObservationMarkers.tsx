import { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { Station, OceanLayer, OceanParameter, DepthLevel } from '../../types/ocean';
import { latLonToXYZ, statusColor, getComparisons } from '../../utils/oceanCalc';

// ── Single marker ─────────────────────────────────────────────────────────────
interface MarkerProps {
  station: Station;
  layer: OceanLayer;
  parameter: OceanParameter;
  depth: DepthLevel;
  isSelected: boolean;
  onSelect: (s: Station) => void;
  onHover: (s: Station | null, x: number, y: number) => void;
}

function Marker({ station, layer, parameter, depth, isSelected, onSelect, onHover }: MarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const pulseRef = useRef<number>(0);
  const { gl } = useThree();

  // Compute marker radius based on depth
  const markerRadius = useMemo(() => {
    const stationDepthOffset = (station.depth / 1000) * 0.04;
    return 2.032 - stationDepthOffset;
  }, [station.depth]);

  const position = useMemo(
    () => {
      const [x, y, z] = latLonToXYZ(station.latitude, station.longitude, markerRadius);
      return new THREE.Vector3(x, y, z);
    },
    [station.latitude, station.longitude, markerRadius]
  );

  // Determine color from layer/parameter
  const color = useMemo(() => {
    if (layer === 'anomaly') return statusColor(station.status);
    if (layer === 'difference') {
      const comp = getComparisons(station).find(c => c.parameter === parameter);
      if (!comp) return '#22d3ee';
      const abs = Math.abs(comp.percentageDifference);
      if (abs > 40) return '#ef4444';
      if (abs > 18) return '#f59e0b';
      return '#22d3ee';
    }
    if (!station.isOnline) return '#6b7280';
    return statusColor(station.status);
  }, [layer, parameter, station]);

  const isDepthMatched = depth === 0 ? true : Math.abs(station.depth - depth) <= 100;
  const size = isSelected ? 0.034 : 0.022;

  useFrame((state) => {
    if (!meshRef.current) return;
    pulseRef.current += 0.05;

    // Pulse ring for anomalies
    if (ringRef.current && station.status !== 'normal') {
      const scale = 1 + Math.abs(Math.sin(pulseRef.current * 0.9)) * 1.5;
      ringRef.current.scale.setScalar(scale);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.75 - (scale - 1) * 0.5);
    }

    // Glowing pulsation on selection / anomaly
    if (meshRef.current.material) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (isSelected) {
        mat.emissiveIntensity = 1.0 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
      } else if (station.status === 'critical') {
        mat.emissiveIntensity = 0.7 + Math.sin(state.clock.elapsedTime * 3) * 0.25;
      }
    }
  });

  return (
    <group position={position}>
      {/* Pulse ring for anomalous stations */}
      {station.status !== 'normal' && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.6, size * 2.2, 24]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Core glowing marker sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(station);
        }}
        onPointerEnter={(e) => {
          e.stopPropagation();
          gl.domElement.style.cursor = 'pointer';
          const rect = gl.domElement.getBoundingClientRect();
          onHover(station, e.clientX - rect.left, e.clientY - rect.top);
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          gl.domElement.style.cursor = 'default';
          onHover(null, 0, 0);
        }}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.95 : station.status === 'critical' ? 0.7 : 0.4}
          roughness={0.1}
          metalness={0.2}
          transparent={!isDepthMatched}
          opacity={isDepthMatched ? 1.0 : 0.35}
        />
      </mesh>

      {/* Selection halo */}
      {isSelected && (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[size * 1.8, size * 2.3, 32]} />
            <meshBasicMaterial
              color="#22d3ee"
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[size * 2.8, size * 3.2, 32]} />
            <meshBasicMaterial
              color="#22d3ee"
              transparent
              opacity={0.35}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

// ── Hover Tooltip ─────────────────────────────────────────────────────────────
interface TooltipProps {
  station: Station;
  parameter: OceanParameter;
  x: number;
  y: number;
}

function HoverTooltip({ station, parameter }: TooltipProps) {
  const comp = getComparisons(station).find(c => c.parameter === parameter);
  const obs = comp ? comp.observedValue : 0;
  const unit = comp ? comp.unit : '';
  const statusLabel =
    station.status === 'critical' ? 'HIGH DEVIATION' :
    station.status === 'warning' ? 'WARNING' : 'NORMAL';
  const statusClr =
    station.status === 'critical' ? '#ef4444' :
    station.status === 'warning' ? '#f59e0b' : '#22d3ee';

  return (
    <div
      style={{
        background: 'rgba(2, 10, 26, 0.94)',
        border: `1px solid ${statusClr}50`,
        borderRadius: '4px',
        padding: '8px 12px',
        minWidth: '130px',
        pointerEvents: 'none',
        color: '#e2e8f0',
        fontSize: '11px',
        fontFamily: 'system-ui, sans-serif',
        boxShadow: `0 0 16px ${statusClr}25`,
        transform: 'translate(12px, -50%)',
        whiteSpace: 'nowrap',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ fontWeight: 600, letterSpacing: '0.08em', marginBottom: 4, color: statusClr }}>
        {station.id}
      </div>
      <div style={{ color: '#94a3b8', fontSize: '9px', letterSpacing: '0.1em', marginBottom: 2 }}>
        {comp?.label?.toUpperCase() ?? parameter.toUpperCase()}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#fff', fontWeight: 600 }}>
        {obs.toFixed(1)} {unit}
      </div>
      <div style={{ fontSize: '9px', color: statusClr, marginTop: 4, letterSpacing: '0.12em', fontWeight: 500 }}>
        ● {statusLabel}
      </div>
    </div>
  );
}

// ── Main Observation Markers ──────────────────────────────────────────────────
interface ObservationMarkersProps {
  stations: Station[];
  layer: OceanLayer;
  parameter: OceanParameter;
  depth?: DepthLevel;
  selectedId: string | null;
  visible: boolean;
  onSelect: (s: Station | null) => void;
}

export function ObservationMarkers({
  stations,
  layer,
  parameter,
  depth = 0,
  selectedId,
  visible,
  onSelect,
}: ObservationMarkersProps) {
  const [hovered, setHovered] = useState<{ station: Station; x: number; y: number } | null>(null);
  const groupRef = useRef<THREE.Group>(null!);

  const handleHover = useCallback((station: Station | null, x: number, y: number) => {
    setHovered(station ? { station, x, y } : null);
  }, []);

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      {stations.map((station) => (
        <Marker
          key={station.id}
          station={station}
          layer={layer}
          parameter={parameter}
          depth={depth}
          isSelected={selectedId === station.id}
          onSelect={onSelect}
          onHover={handleHover}
        />
      ))}

      {/* Hover tooltip */}
      {hovered && (
        <group position={new THREE.Vector3(
          ...latLonToXYZ(hovered.station.latitude, hovered.station.longitude, 2.08) as [number, number, number]
        )}>
          <Html style={{ pointerEvents: 'none' }} occlude={false}>
            <HoverTooltip
              station={hovered.station}
              parameter={parameter}
              x={hovered.x}
              y={hovered.y}
            />
          </Html>
        </group>
      )}
    </group>
  );
}
