import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DepthLevel } from '../../types/ocean';

interface CloudLayerProps {
  depth?: DepthLevel;
  sunPosition?: [number, number, number];
}

const cloudVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const cloudFragmentShader = `
  uniform sampler2D cloudTexture;
  uniform vec3 sunDirection;
  uniform float cloudOpacity;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec4 cloudTex = texture2D(cloudTexture, vUv);
    float cloudDensity = cloudTex.r;

    if (cloudDensity < 0.05) {
      discard;
    }

    vec3 N = normalize(vNormal);
    vec3 L = normalize(sunDirection);
    float dotNL = dot(N, L);

    // Sunlit vs dark clouds (soft terminator)
    float sunFactor = smoothstep(-0.2, 0.4, dotNL);
    vec3 cloudLit = vec3(0.96, 0.98, 1.0) * (sunFactor * 0.85 + 0.15);
    vec3 cloudDark = vec3(0.04, 0.06, 0.12);
    vec3 color = mix(cloudDark, cloudLit, sunFactor);

    // Fade clouds towards edge slightly
    vec3 V = normalize(cameraPosition - vWorldPosition);
    float edgeFactor = max(dot(N, V), 0.0);

    float alpha = cloudDensity * cloudOpacity * (0.6 + edgeFactor * 0.4);
    gl_FragColor = vec4(color, alpha);
  }
`;

export function CloudLayer({ depth = 0, sunPosition = [12, 5, 8] }: CloudLayerProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);

  const cloudTexture = useMemo(() => {
    const tex = textureLoader.load('/textures/earth_clouds.png');
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [textureLoader]);

  const sunDir = useMemo(() => {
    return new THREE.Vector3(...sunPosition).normalize();
  }, [sunPosition]);

  const uniforms = useMemo(() => ({
    cloudTexture: { value: cloudTexture },
    sunDirection: { value: sunDir },
    cloudOpacity: { value: 0.32 },
  }), [cloudTexture, sunDir]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    // Differential slow rotation for dynamic realism
    meshRef.current.rotation.y += delta * 0.0035;

    // Dim clouds if inspecting deeper ocean levels
    const targetOpacity = depth > 0 ? Math.max(0.05, 0.32 - (depth / 1000) * 0.28) : 0.32;
    uniforms.cloudOpacity.value = THREE.MathUtils.lerp(uniforms.cloudOpacity.value, targetOpacity, 0.1);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2.016, 64, 64]} />
      <shaderMaterial
        vertexShader={cloudVertexShader}
        fragmentShader={cloudFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}
