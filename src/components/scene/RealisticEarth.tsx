import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DepthLevel } from '../../types/ocean';

interface RealisticEarthProps {
  depth?: DepthLevel;
  sunPosition?: [number, number, number];
}

// Vertex shader for Realistic Earth with day/night blending and normal mapping
const earthVertexShader = `
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

// Fragment shader for Realistic Earth
const earthFragmentShader = `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform sampler2D specularTexture;
  uniform sampler2D normalTexture;
  uniform vec3 sunDirection;
  uniform float depthOpacity;
  uniform float depthLevel;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    // Normal map perturbation for terrain & ocean ripples
    vec3 normalMap = texture2D(normalTexture, vUv).xyz * 2.0 - 1.0;
    vec3 N = normalize(vNormal + normalMap * 0.25);
    vec3 L = normalize(sunDirection);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 H = normalize(L + V);

    // Sun dot normal (day / night terminator)
    float dotNL = dot(N, L);

    // Smooth day/night transition factor
    float dayFactor = smoothstep(-0.15, 0.25, dotNL);

    // Sample textures
    vec4 dayColor = texture2D(dayTexture, vUv);
    vec4 nightColor = texture2D(nightTexture, vUv);
    vec4 specColor = texture2D(specularTexture, vUv);

    // Enhance ocean saturation and richness
    float isOcean = specColor.r; // Ocean has high specularity
    vec3 enrichedDay = dayColor.rgb;
    if (isOcean > 0.15) {
      enrichedDay = mix(enrichedDay, enrichedDay * vec3(0.85, 1.05, 1.25), isOcean * 0.4);
    }

    // Night side city lights (tinted warm golden-amber, boosted on dark side)
    vec3 cityLights = nightColor.rgb * vec3(1.6, 1.3, 0.95) * (1.0 - dayFactor) * 1.8;

    // Direct day diffuse lighting
    vec3 dayLight = enrichedDay * max(dotNL * 0.9 + 0.1, 0.0);

    // Ocean specular reflection (sun glint)
    float specFactor = pow(max(dot(N, H), 0.0), 32.0) * isOcean * 0.9;
    vec3 specularGlint = vec3(0.9, 0.95, 1.0) * specFactor * dayFactor;

    // Atmospheric limb brightening / Fresnel on Earth surface
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.5);
    vec3 limbGlow = vec3(0.12, 0.45, 0.85) * fresnel * max(dotNL + 0.3, 0.1) * 0.65;

    // Ambient space light
    vec3 ambient = enrichedDay * 0.035;

    // Final surface color
    vec3 finalColor = mix(cityLights, dayLight + specularGlint, dayFactor) + limbGlow + ambient;

    // Depth level modulation (underwater mode dims surface slightly and shifts to oceanic blue)
    if (depthLevel > 0.0) {
      float depthDim = clamp(depthLevel / 1000.0, 0.0, 0.65);
      finalColor = mix(finalColor, vec3(0.01, 0.08, 0.18), depthDim * 0.5);
    }

    gl_FragColor = vec4(finalColor, depthOpacity);
  }
`;

export function RealisticEarth({ depth = 0, sunPosition = [12, 5, 8] }: RealisticEarthProps) {
  const earthMeshRef = useRef<THREE.Mesh>(null!);
  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);

  // Load NASA / Three.js equirectangular textures with optimal filtering
  const { dayTex, nightTex, specTex, normalTex } = useMemo(() => {
    const day = textureLoader.load('/textures/earth_day.jpg');
    const night = textureLoader.load('/textures/earth_night.png');
    const spec = textureLoader.load('/textures/earth_specular.jpg');
    const norm = textureLoader.load('/textures/earth_normal.jpg');

    [day, night, spec, norm].forEach((t) => {
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = true;
    });

    return { dayTex: day, nightTex: night, specTex: spec, normalTex: norm };
  }, [textureLoader]);

  // Sun direction vector
  const sunDir = useMemo(() => {
    return new THREE.Vector3(...sunPosition).normalize();
  }, [sunPosition]);

  // Shader uniforms
  const uniforms = useMemo(() => ({
    dayTexture: { value: dayTex },
    nightTexture: { value: nightTex },
    specularTexture: { value: specTex },
    normalTexture: { value: normalTex },
    sunDirection: { value: sunDir },
    depthOpacity: { value: 1.0 },
    depthLevel: { value: depth as number },
  }), [dayTex, nightTex, specTex, normalTex, sunDir, depth]);

  useFrame(() => {
    if (!earthMeshRef.current) return;
    // Update uniforms
    uniforms.depthLevel.value = THREE.MathUtils.lerp(uniforms.depthLevel.value, depth, 0.08);
    uniforms.depthOpacity.value = THREE.MathUtils.lerp(
      uniforms.depthOpacity.value,
      depth > 100 ? 0.75 : 1.0,
      0.08
    );
  });

  return (
    <group>
      {/* High detail Earth sphere with 96x96 segments */}
      <mesh ref={earthMeshRef} receiveShadow castShadow>
        <sphereGeometry args={[2, 96, 96]} />
        <shaderMaterial
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
          uniforms={uniforms}
          transparent={depth > 0}
          depthWrite={true}
        />
      </mesh>

      {/* Subsurface depth shell indicator when depth > 0 */}
      {depth > 0 && (
        <mesh>
          <sphereGeometry args={[2 - (depth / 1000) * 0.04, 48, 48]} />
          <meshBasicMaterial
            color="#06b6d4"
            transparent
            opacity={Math.min(0.25, 0.08 + (depth / 1000) * 0.2)}
            wireframe
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
