import { useMemo } from 'react';
import * as THREE from 'three';

interface RealisticAtmosphereProps {
  sunPosition?: [number, number, number];
}

// Fresnel atmosphere shader for realistic Rayleigh scattering blue glow
const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 sunDirection;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 L = normalize(sunDirection);

    // Fresnel factor (limb brightening)
    float dotNV = max(dot(N, V), 0.0);
    float fresnel = pow(1.0 - dotNV, 3.8);

    // Sunlight modulation on atmosphere
    float dotNL = dot(N, L);
    float sunScattering = smoothstep(-0.25, 0.4, dotNL);

    // Atmospheric colors (Rayleigh deep sky blue to cyan limb)
    vec3 dayAtmo = mix(vec3(0.08, 0.42, 0.95), vec3(0.35, 0.75, 1.0), fresnel);
    vec3 nightAtmo = vec3(0.02, 0.08, 0.22);

    vec3 atmoColor = mix(nightAtmo, dayAtmo, sunScattering);
    float alpha = fresnel * (0.15 + sunScattering * 0.75) * 0.92;

    gl_FragColor = vec4(atmoColor, alpha);
  }
`;

// Outer atmospheric glow shell (inverted sphere)
const outerGlowVertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const outerGlowFragmentShader = `
  uniform vec3 sunDirection;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 L = normalize(sunDirection);

    // View dot for outer shell
    float intensity = pow(0.75 - dot(N, V), 2.2);
    float dotNL = dot(N, L);
    float sunScattering = smoothstep(-0.3, 0.3, dotNL);

    vec3 skyColor = vec3(0.12, 0.48, 0.98) * (sunScattering * 0.8 + 0.2);
    float alpha = clamp(intensity * 0.35 * (sunScattering * 0.7 + 0.3), 0.0, 0.6);

    gl_FragColor = vec4(skyColor, alpha);
  }
`;

export function RealisticAtmosphere({ sunPosition = [12, 5, 8] }: RealisticAtmosphereProps) {
  const sunDir = useMemo(() => new THREE.Vector3(...sunPosition).normalize(), [sunPosition]);

  const innerUniforms = useMemo(() => ({
    sunDirection: { value: sunDir },
  }), [sunDir]);

  const outerUniforms = useMemo(() => ({
    sunDirection: { value: sunDir },
  }), [sunDir]);

  return (
    <group>
      {/* Surface atmospheric limb shell */}
      <mesh>
        <sphereGeometry args={[2.022, 64, 64]} />
        <shaderMaterial
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          uniforms={innerUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Outer atmospheric Rayleigh scattering halo */}
      <mesh>
        <sphereGeometry args={[2.14, 64, 64]} />
        <shaderMaterial
          vertexShader={outerGlowVertexShader}
          fragmentShader={outerGlowFragmentShader}
          uniforms={outerUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
