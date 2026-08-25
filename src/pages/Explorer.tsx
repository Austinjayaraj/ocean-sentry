import { useRef, useEffect, useState, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RealisticEarth } from '../components/scene/RealisticEarth';
import { CloudLayer } from '../components/scene/CloudLayer';
import { RealisticAtmosphere } from '../components/scene/RealisticAtmosphere';
import { OceanCurrents } from '../components/scene/OceanCurrents';
import { DifferenceLayer } from '../components/scene/DifferenceLayer';
import { ObservationMarkers } from '../components/scene/ObservationMarkers';
import { SubsurfaceMarkers } from '../components/scene/SubsurfaceMarkers';
import { SubsurfaceEnvironment } from '../components/scene/SubsurfaceEnvironment';
import { CameraController } from '../components/scene/CameraController';
import { CinematicTransitionManager } from '../components/scene/CinematicTransitionManager';
import { StationPanel } from '../components/ui/StationPanel';
import { LayerControl, ParameterControl, DepthControl } from '../components/ui/LayerControl';
import { Timeline } from '../components/ui/Timeline';
import { Navigation } from '../components/ui/Navigation';
import { HandControlWidget } from '../components/ui/HandControlWidget';
import { SubsurfaceHUD } from '../components/ui/SubsurfaceHUD';
import { DiveButton } from '../components/ui/DiveButton';
import { AnomalyDetailPanel } from '../components/ui/AnomalyDetailPanel';
import { IntelligenceSummary } from '../components/ui/IntelligenceSummary';
import { GestureIndicator } from '../components/GestureIndicator';
import { GestureDebugPanel } from '../components/GestureDebugPanel';
import { useHandGesture } from '../hooks/useHandGesture';
import { useGestureControl } from '../hooks/useGestureControl';
import { useOceanData } from '../hooks/useOceanData';
import { gestureManager } from '../gestures/GestureManager';
import type { Station, OceanLayer, OceanParameter, DepthLevel, CameraStage } from '../types/ocean';
import type { AnomalyRecord } from '../services/oceanApi';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { CinematicTransitionManagerHandle } from '../components/scene/CinematicTransitionManager';
import type { CinematicTransitionState } from '../hooks/useCinematicTransition';

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
  const [isSubsurface, setIsSubsurface] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyRecord | null>(null);

  // Ocean data from API (falls back to mock if unavailable)
  const {
    stations: STATIONS, dataSource, isLoading: dataLoading,
    anomalyCount, anomalies, anomalySummary,
    depthObservations, depthAnomalies, depthLoading, depthError,
    loadDepthData, clearDepthData,
  } = useOceanData();

  // Hand gesture control hook
  const hand = useHandGesture();

  // Face gesture control (Blow-Blow)
  const faceGesture = useGestureControl(hand.videoRef, hand.isEnabled);

  // Cinematic transition ref (bridges R3F scene with React state)
  const cinematicRef = useRef<CinematicTransitionManagerHandle>(null);
  const cameraTargetRef = useRef(new THREE.Vector3(0.1, 0.35, -0.6));
  const [transitionState, setTransitionState] = useState<CinematicTransitionState | null>(null);

  // Orbit controls ref
  const orbitRef = useRef<OrbitControlsImpl>(null!);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sun directional light position
  const sunPosition: [number, number, number] = [12, 5, 8];

  // Listen for BLOW_BLOW gesture events
  useEffect(() => {
    const unsubscribe = gestureManager.on('BLOW_BLOW', (_event) => {
      if (cinematicRef.current && !cinematicRef.current.isTransitioning) {
        setShowParticles(true);
        setMarkersVisible(true);
        cinematicRef.current.startTransition({
          target: { latitude: 13.08, longitude: 80.27 },
          duration: 3500,
          easing: 'easeInOutCubic',
          zoom: 1.2,
          rotation: true,
        });
      }
    });
    return unsubscribe;
  }, []);

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

  const handleDepthChange = useCallback((d: DepthLevel) => {
    setDepth(d);
    if (d > 0) loadDepthData(d);
  }, [loadDepthData]);

  const handleDive = useCallback(() => {
    setIsSubsurface(true);
    setDepth(10);
    loadDepthData(10);
  }, [loadDepthData]);

  const handleReturnToSurface = useCallback(() => {
    setIsSubsurface(false);
    setDepth(0);
    setSelectedAnomaly(null);
    setSelectedStation(null);
    clearDepthData();
  }, [clearDepthData]);

  const handleAnomalySelect = useCallback((anomaly: AnomalyRecord) => {
    setSelectedAnomaly(anomaly);
    setSelectedStation(null);
  }, []);

  const handleTransitionStateChange = useCallback((state: CinematicTransitionState) => {
    setTransitionState(state);
  }, []);

  const isExploring = stage === 'exploration';
  const isTransitioning = cinematicRef.current?.isTransitioning ?? false;

  // Compute particle/marker boost from transition
  const particleBoost = transitionState?.particleIntensity ?? 0;
  const effectiveShowParticles = showParticles || particleBoost > 0;
  const effectiveMarkersVisible = markersVisible || (transitionState?.markerVisibility ?? 0) > 0;

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
          visible={effectiveShowParticles}
          parameter={parameter}
          depth={depth}
        />

        {/* Difference & Anomaly spatial layers */}
        <DifferenceLayer
          stations={STATIONS}
          layer={layer}
          parameter={parameter}
          visible={effectiveMarkersVisible}
        />

        {/* Ocean observation stations & buoys (surface mode) */}
        <ObservationMarkers
          stations={STATIONS}
          layer={layer}
          parameter={parameter}
          depth={depth}
          selectedId={selectedStation?.id ?? null}
          visible={effectiveMarkersVisible && !isSubsurface}
          onSelect={handleStationSelect}
        />

        {/* Depth-specific markers (subsurface mode) */}
        <SubsurfaceMarkers
          observations={depthObservations}
          anomalies={depthAnomalies}
          depth={depth}
          visible={isSubsurface && !depthLoading}
          onAnomalySelect={handleAnomalySelect}
          selectedAnomalyId={selectedAnomaly ? `${selectedAnomaly.station_id}-${selectedAnomaly.depth}-${selectedAnomaly.timestamp}` : null}
        />

        {/* Subsurface underwater environment */}
        <SubsurfaceEnvironment depth={depth} visible={isSubsurface} />

        {/* Unified Camera Controller */}
        <CameraController
          stage={stage}
          targetStation={selectedAnomaly ? { latitude: selectedAnomaly.latitude, longitude: selectedAnomaly.longitude } : selectedStation}
          isExploring={isExploring}
          handDelta={hand.deltaRot.current}
          handZoom={hand.zoomFactor.current}
          isFist={hand.isFistRef.current}
          currentTargetRef={cameraTargetRef}
        />

        {/* Cinematic Transition Manager (effects + camera override) */}
        <CinematicTransitionManager
          ref={cinematicRef}
          currentTargetRef={cameraTargetRef}
          targetLatitude={13.08}
          targetLongitude={80.27}
          onTransitionStateChange={handleTransitionStateChange}
        />

        {/* OrbitControls */}
        <OrbitControls
          ref={orbitRef}
          enabled={isExploring && !selectedStation && !selectedAnomaly && !hand.isEnabled && !isTransitioning}
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
      <Navigation
        anomalyCount={anomalyCount}
        stationCount={STATIONS.length}
        dataSource={dataSource}
        totalRecords={anomalySummary?.total_records ?? 0}
        highCount={anomalySummary?.high_count ?? 0}
      />

      {/* ML Intelligence Summary — Top Left */}
      {showControls && !isSubsurface && (
        <IntelligenceSummary
          summary={anomalySummary}
          isLoading={dataLoading}
          dataSource={dataSource}
        />
      )}

      {/* Anomaly Detail Panel — Top Right (when anomaly selected) */}
      {selectedAnomaly && (
        <AnomalyDetailPanel
          anomaly={selectedAnomaly}
          onClose={() => setSelectedAnomaly(null)}
        />
      )}

      {/* Dive Button — Bottom Center (when at surface and exploring) */}
      {showControls && isExploring && !isSubsurface && (
        <DiveButton
          isSubsurface={false}
          onDive={handleDive}
          onSurface={handleReturnToSurface}
        />
      )}

      {/* Subsurface HUD — Right side when diving */}
      {isSubsurface && (
        <SubsurfaceHUD
          depth={depth}
          observationCount={depthObservations.length}
          anomalyCount={depthAnomalies.length}
          isLoading={depthLoading}
          error={depthError}
          onReturnToSurface={handleReturnToSurface}
          onDepthChange={handleDepthChange}
        />
      )}

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
          <DepthControl depth={depth} onChange={handleDepthChange} />
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

      {/* Face Gesture (Blow-Blow) Indicator — Above Hand Widget */}
      {showControls && hand.isEnabled && (
        <GestureIndicator
          isEnabled={faceGesture.isEnabled}
          faceDetected={faceGesture.status.faceDetected}
          detectorState={faceGesture.status.detectorState}
          blowScore={faceGesture.status.blowScore}
          timeSinceBlow1={faceGesture.status.timeSinceBlow1}
        />
      )}

      {/* Face Gesture Toggle — small button near hand control */}
      {showControls && hand.isEnabled && (
        <button
          onClick={faceGesture.toggleEnabled}
          style={{
            position: 'absolute',
            bottom: '52px',
            right: '170px',
            zIndex: 36,
            background: faceGesture.isEnabled ? 'rgba(34,211,238,0.15)' : 'rgba(2, 8, 22, 0.8)',
            border: `1px solid ${faceGesture.isEnabled ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title={faceGesture.isEnabled ? 'Disable Blow-Blow gesture' : 'Enable Blow-Blow gesture'}
        >
          <span style={{ fontSize: '10px' }}>💨</span>
          <span style={{
            fontSize: '7px',
            color: faceGesture.isEnabled ? '#22d3ee' : '#64748b',
            letterSpacing: '0.1em',
            fontWeight: 600,
          }}>
            BLOW
          </span>
        </button>
      )}

      {/* Debug Panel — only with ?debugGestures=true */}
      {faceGesture.isEnabled && (
        <GestureDebugPanel
          faceDetected={faceGesture.status.faceDetected}
          faceConfidence={faceGesture.status.isReady ? 0.95 : 0}
          blowScore={faceGesture.status.blowScore}
          detectorState={faceGesture.status.detectorState}
          timeSinceBlow1={faceGesture.status.timeSinceBlow1}
        />
      )}

      {/* Depth Indicator Bar — Right side when depth > 0 (surface mode only) */}
      {depth > 0 && showControls && !isSubsurface && (
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

      {/* Data Source Label */}
      {showControls && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(2, 8, 22, 0.75)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '4px',
            padding: '4px 10px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: dataSource === 'api' ? '#22d3ee' : dataSource === 'loading' ? '#f59e0b' : '#64748b',
              boxShadow: dataSource === 'api' ? '0 0 6px #22d3ee' : 'none',
            }}
          />
          <span style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.12em' }}>
            {dataLoading
              ? 'CONNECTING...'
              : dataSource === 'api'
              ? 'COPERNICUS MARINE + ARGO · ML ONLINE'
              : 'OFFLINE DEMO DATA'}
          </span>
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
