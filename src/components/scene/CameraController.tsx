import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { CameraStage } from '../../types/ocean';
import { easeInOutCubic, latLonToXYZ } from '../../utils/oceanCalc';

// Camera position presets focused on India, Bay of Bengal, and Indian Ocean
const CAMERA_PRESETS: Record<CameraStage, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
  intro:       { pos: new THREE.Vector3(1.5, 2.5, -22.0), target: new THREE.Vector3(0, 0, 0) },
  space:       { pos: new THREE.Vector3(1.2, 2.0, -15.0), target: new THREE.Vector3(0, 0, 0) },
  earth:       { pos: new THREE.Vector3(0.9, 1.5, -8.5),  target: new THREE.Vector3(0, 0, 0) },
  indianOcean: { pos: new THREE.Vector3(0.6, 0.4, -6.0),  target: new THREE.Vector3(0.1, -0.1, -0.2) },
  bayOfBengal: { pos: new THREE.Vector3(0.35, 1.05, -4.5), target: new THREE.Vector3(0.1, 0.35, -0.6) },
  exploration: { pos: new THREE.Vector3(0.35, 1.05, -4.5), target: new THREE.Vector3(0.1, 0.35, -0.6) },
};

interface CameraControllerProps {
  stage: CameraStage;
  onStageComplete?: (stage: CameraStage) => void;
  targetStation?: { latitude: number; longitude: number } | null;
  isExploring: boolean;
  handDelta?: { dx: number; dy: number };
  handZoom?: number;
  isFist?: boolean;
}

export function CameraController({
  stage,
  onStageComplete,
  targetStation,
  isExploring,
  handDelta,
  handZoom = 1.0,
  isFist = false,
}: CameraControllerProps) {
  const { camera } = useThree();
  const progress = useRef(0);
  const lastStage = useRef<CameraStage>(stage);
  const fromPos = useRef(new THREE.Vector3());
  const fromTarget = useRef(new THREE.Vector3());
  const currentTarget = useRef(new THREE.Vector3(0.1, 0.35, -0.6));
  const orbitTarget = useRef(new THREE.Vector3(0.1, 0.35, -0.6));

  // Capture transition start on stage change
  useEffect(() => {
    if (stage !== lastStage.current) {
      fromPos.current.copy(camera.position);
      fromTarget.current.copy(orbitTarget.current);
      progress.current = 0;
      lastStage.current = stage;
    }
  }, [stage, camera]);

  // Capture transition on station target
  useEffect(() => {
    if (targetStation && isExploring) {
      fromPos.current.copy(camera.position);
      fromTarget.current.copy(orbitTarget.current);
      progress.current = 0;
    }
  }, [targetStation, isExploring, camera]);

  const getDesiredPos = useCallback((): THREE.Vector3 => {
    if (targetStation && isExploring) {
      const [x, y, z] = latLonToXYZ(
        targetStation.latitude,
        targetStation.longitude,
        4.4
      );
      return new THREE.Vector3(x, y, z);
    }
    return CAMERA_PRESETS[stage].pos;
  }, [stage, targetStation, isExploring]);

  const getDesiredTarget = useCallback((): THREE.Vector3 => {
    if (targetStation && isExploring) {
      const [x, y, z] = latLonToXYZ(
        targetStation.latitude,
        targetStation.longitude,
        1.2
      );
      return new THREE.Vector3(x, y, z);
    }
    return CAMERA_PRESETS[stage].target;
  }, [stage, targetStation, isExploring]);

  useFrame((_, delta) => {
    // 1. Stage transition lerp
    if (progress.current < 1) {
      progress.current = Math.min(1, progress.current + delta * 0.45);
      const t = easeInOutCubic(progress.current);
      camera.position.lerpVectors(fromPos.current, getDesiredPos(), t);
      currentTarget.current.lerpVectors(fromTarget.current, getDesiredTarget(), t);

      if (progress.current >= 1 && onStageComplete) {
        onStageComplete(stage);
      }
    } else if (stage === 'exploration') {
      // 2. Hand Gesture control in exploration mode (when not locked by fist)
      if (!isFist && handDelta && (handDelta.dx !== 0 || handDelta.dy !== 0)) {
        // Spherical rotation around current target
        const offset = new THREE.Vector3().subVectors(camera.position, currentTarget.current);
        const spherical = new THREE.Spherical().setFromVector3(offset);

        // Apply hand rotation with smoothing
        spherical.theta -= handDelta.dx * 0.04;
        spherical.phi = THREE.MathUtils.clamp(
          spherical.phi - handDelta.dy * 0.04,
          0.1,
          Math.PI - 0.1
        );

        // Apply hand pinch zoom
        if (handZoom && Math.abs(handZoom - 1.0) > 0.001) {
          spherical.radius = THREE.MathUtils.clamp(
            spherical.radius * handZoom,
            2.8,
            12.0
          );
        }

        offset.setFromSpherical(spherical);
        camera.position.copy(currentTarget.current).add(offset);
      }
    }

    camera.lookAt(currentTarget.current);
    orbitTarget.current.copy(currentTarget.current);
  });

  return null;
}
