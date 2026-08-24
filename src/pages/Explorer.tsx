import { useRef, useEffect, useState, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import { RealisticEarth } from '../components/scene/RealisticEarth';
import { CloudLayer } from '../components/scene/CloudLayer';
import { RealisticAtmosphere } from '../components/scene/RealisticAtmosphere';
import { OceanCurrents } from '../components/scene/OceanCurrents';
import { DifferenceLayer } from '../components/scene/DifferenceLayer';
import { ObservationMarkers } from '../components/scene/ObservationMarkers';
import { CameraController } from '../components/scene/CameraController';
import { StationPanel } from '../components/ui/StationPanel';
import { LayerControl, ParameterControl, DepthControl } from '../components/ui/LayerControl';
import { Timeline } from '../components/ui/Timeline';
import { Navigation } from '../components/ui/Navigation';
import { HandControlWidget } from '../components/ui/HandControlWidget';
import { useHandGesture } from '../hooks/useHandGesture';
import { STATIONS } from '../data/oceanData';
import type { Station, OceanLayer, OceanParameter, DepthLevel, CameraStage } from '../types/ocean';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface ExplorerProps {
  initialStage?: CameraStage;
}

export default function Explorer({ initialStage = 'space' }: ExplorerProps) {
  // Camera / scene stage state
  const [stage, setStage] = useState<CameraStage>(initialStage);
  const [showControls, setShowControls] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [markersVisible, setMarkersVisible] = useState(false);

  // Ocean intelligence state
  const [layer, setLayer] = useState<OceanLayer>('observation');
  const [parameter, setParameter] = useState<OceanParameter>('waveHeight');
  const [depth, setDepth] = useState<DepthLevel>(0);
  const [timeIndex, setTimeIndex] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  // Hand gesture control hook
  const hand = useHandGesture();

  // Orbit controls ref
  const orbitRef = useRef<OrbitControlsImpl>(null!);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sun directional light position
  const sunPosition: [number, number, number] = [12, 5, 8];

  // Cinematic sequence timing
  useEffect(() => {
    const stages: CameraStage[] = ['space', 'earth', 'indianOcean', 'bayOfBengal', 'exploration'];
    const delays = [1200, 3600, 6800, 10500];
    const timers: ReturnType<typeof setTimeout>[] = [];

    stages.forEach((s, i) => {
      if (i === 0) return;
      const t = setTimeout(() => {
        setStage(s);
        if (s === 'indianOcean') {
          setShowControls(true);
        }
        if (s === 'bayOfBengal') {
          setShowParticles(true);
          setMarkersVisible(true);
        }
        if (s === 'exploration') {
          if (orbitRef.current) {
            orbitRef.current.enabled = true;
          }
        }
      }, delays[i - 1]);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  // Timeline auto playback
  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setTimeIndex((t) => {
          if (t >= 4) {
            setIsPlaying(false);
            return t;
          }
          return t + 1;
        });
      }, 1500);
    } else {
      if (playRef.current) clearInterval(playRef.current);
    }
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [isPlaying]);

  const handleStationSelect = useCallback((station: Station | null) => {
    setSelectedStation(station);
  }, []);

  const isExploring = stage === 'exploration';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000208', overflow: 'hidden' }}>
      {/* THREE.JS WEBGL CANVAS */}
      <Canvas
        camera={{ position: [1.2, 2.0, -15.0], fov: 42, near: 0.1, far: 300 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        style={{ background: '#000208' }}
      >
        {/* Lighting system */}
        <ambientLight intensity={0.12} />
        <directionalLight
          position={sunPosition}
          intensity={1.8}
          color="#ffffff"
          castShadow={false}
        />
        {/* Deep space back-fill light */}
        <pointLight position={[-12, -6, 12]} intensity={0.18} color="#0c2244" />

        {/* Deep cosmos stars */}
        <Stars
          radius={120}
          depth={80}
          count={5000}
          factor={3.2}
          saturation={0.1}
          fade
          speed={0.15}
        />

        {/* Realistic Earth + Atmosphere + Cloud Layer */}
        <Suspense fallback={null}>
          <RealisticEarth depth={depth} sunPosition={sunPosition} />
          <CloudLayer depth={depth} sunPosition={sunPosition} />
          <RealisticAtmosphere sunPosition={sunPosition} />
        </Suspense>

        {/* Ocean current streamlines */}
        <OceanCurrents
          visible={showParticles}
          parameter={parameter}
          depth={depth}
        />

        {/* Difference & Anomaly spatial layers */}
        <DifferenceLayer
          stations={STATIONS}
          layer={layer}
          parameter={parameter}
          visible={markersVisible}
        />

        {/* Ocean observation stations & buoys */}
        <ObservationMarkers
          stations={STATIONS}
          layer={layer}
          parameter={parameter}
          depth={depth}
          selectedId={selectedStation?.id ?? null}
          visible={markersVisible}
          onSelect={handleStationSelect}
        />

        {/* Unified Camera Controller */}
        <CameraController
          stage={stage}
          targetStation={selectedStation}
          isExploring={isExploring}
          handDelta={hand.deltaRot.current}
          handZoom={hand.zoomFactor.current}
          isFist={hand.isFistRef.current}
        />

        {/* OrbitControls */}
        <OrbitControls
          ref={orbitRef}
          enabled={isExploring && !selectedStation && !hand.isEnabled}
          enablePan={false}
          minDistance={2.8}
          maxDistance={14.0}
          rotateSpeed={0.4}
          zoomSpeed={0.6}
          enableDamping
          dampingFactor={0.06}
          makeDefault={false}
        />
      </Canvas>

      {/* Top Navigation HUD */}
      <Navigation />

      {/* Floating Instrument Controls — Left Side */}
      {showControls && (
        <div
          style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 30,
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.8s ease',
          }}
        >
          <LayerControl layer={layer} onChange={setLayer} />
          <ParameterControl parameter={parameter} onChange={setParameter} />
          <DepthControl depth={depth} onChange={setDepth} />
        </div>
      )}

      {/* Scientific Station Information Panel — Right Side */}
      {selectedStation && (
        <StationPanel
          station={selectedStation}
          parameter={parameter}
          onClose={() => setSelectedStation(null)}
        />
      )}

      {/* Timeline Controls — Bottom Center */}
      {showControls && (
        <Timeline
          timeIndex={timeIndex}
          isPlaying={isPlaying}
          onChange={setTimeIndex}
          onPlayPause={() => setIsPlaying((p) => !p)}
        />
      )}

      {/* Hand Gesture Control Widget — Bottom Right */}
      {showControls && (
        <HandControlWidget
          isEnabled={hand.isEnabled}
          onToggle={hand.toggleEnabled}
          status={hand.status}
          gesture={hand.gesture}
          confidence={hand.confidence}
          videoRef={hand.videoRef}
          canvasRef={hand.canvasRef}
        />
      )}

      {/* Depth Indicator Bar — Right side when depth > 0 */}
      {depth > 0 && showControls && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: selectedStation ? '305px' : '16px',
            transform: 'translateY(-50%)',
            zIndex: 25,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(2, 8, 22, 0.75)',
            border: '1px solid rgba(34,211,238,0.2)',
            borderRadius: '6px',
            padding: '8px 6px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ fontSize: '7px', color: '#64748b', letterSpacing: '0.15em' }}>
            DEPTH
          </div>
          <div
            style={{
              width: '2px',
              height: '90px',
              background: 'linear-gradient(180deg, rgba(34,211,238,0.8), rgba(34,211,238,0.1))',
              borderRadius: '1px',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '-4px',
                top: `${([0, 10, 50, 100, 500, 1000].indexOf(depth) / 5) * 100}%`,
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#22d3ee',
                boxShadow: '0 0 8px #22d3ee',
                transition: 'top 0.4s ease',
              }}
            />
          </div>
          <div style={{ fontSize: '9px', color: '#22d3ee', fontFamily: 'monospace', fontWeight: 600 }}>
            {depth === 0 ? 'SURF' : `${depth}m`}
          </div>
        </div>
      )}

      {/* Camera Stage Status Indicator during Intro */}
      {stage !== 'exploration' && (
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '9px',
            letterSpacing: '0.24em',
            color: 'rgba(34,211,238,0.6)',
            fontFamily: 'monospace',
            zIndex: 20,
            pointerEvents: 'none',
            background: 'rgba(2,8,22,0.6)',
            padding: '4px 14px',
            borderRadius: '4px',
            border: '1px solid rgba(34,211,238,0.15)',
          }}
        >
          {stage === 'space'       && '● ORBITAL SATELLITE VIEW'}
          {stage === 'earth'       && '● APPROACHING PLANET EARTH'}
          {stage === 'indianOcean' && '● LOCKING TARGET: INDIAN OCEAN BASIN'}
          {stage === 'bayOfBengal' && '● FOCUSING OBSERVATION GRID: BAY OF BENGAL'}
        </div>
      )}
    </div>
  );
}
