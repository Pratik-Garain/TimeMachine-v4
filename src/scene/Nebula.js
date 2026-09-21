import * as THREE from "three";

const noiseChunk = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 6; i++) {
      v += a * noise(p);
      p *= 2.02;
      a *= 0.55;
    }
    return v;
  }
`;

// Billboards without touching the camera each frame: strip rotation out
// of the modelView matrix in the vertex shader.
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Billboard: take only the translation from modelViewMatrix and add
    // the (already correctly sized) local-space quad on top of that, so
    // the plane always faces the camera regardless of its rotation.
    vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mvPosition.xy += position.xy;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uDensity;
  uniform float uDrift;
  varying vec2 vUv;
  ${noiseChunk}

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float mask = smoothstep(1.0, 0.15, r);
    if (mask < 0.01) discard;

    vec2 q = vUv * 3.1 + vec2(uTime * uDrift, -uTime * uDrift * 0.4);
    float n1 = fbm(q);
    float n2 = fbm(q * 1.7 + 4.2);
    float cloud = pow(n1 * n2, 1.6) * uDensity;

    vec3 col = mix(uColorA, uColorB, clamp(n2, 0.0, 1.0));
    float alpha = cloud * mask;
    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * Faint, slow-drifting deep-space dust clouds sitting far behind the
 * starfield. Purely additive and cheap — a handful of billboarded
 * planes with fbm noise — so it reads as depth and atmosphere rather
 * than a flat black backdrop, without costing a real volumetric pass.
 */
export class Nebula {
  constructor(scene, { layers = 4 } = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.meshes = [];

    const palette = [
      ["#0c2a3d", "#123a52"], // deep teal — cool shadow field
      ["#2a1030", "#3d1638"], // muted violet
      ["#331c0c", "#4a2a12"], // rust / amber, restrained (not neon)
      ["#0a1f33", "#1d2f4a"], // steel blue
    ];

    for (let i = 0; i < layers; i++) {
      const [a, b] = palette[i % palette.length];
      const w = 700 + Math.random() * 400;
      const h = 500 + Math.random() * 300;
      const geo = new THREE.PlaneGeometry(w, h);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: new THREE.Color(a) },
          uColorB: { value: new THREE.Color(b) },
          uDensity: { value: 0.5 + Math.random() * 0.25 },
          uDrift: { value: 0.004 + Math.random() * 0.004 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geo, mat);
      const angle = (i / layers) * Math.PI * 2 + Math.random() * 0.6;
      const dist = 520 + Math.random() * 260;
      mesh.position.set(
        Math.cos(angle) * dist,
        60 + Math.random() * 220 - 60,
        Math.sin(angle) * dist - 300,
      );
      mesh.renderOrder = -10;
      this.group.add(mesh);
      this.meshes.push(mesh);
    }
  }

  update(dt, time) {
    for (const m of this.meshes) {
      m.material.uniforms.uTime.value = time;
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }
}
