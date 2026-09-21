import * as THREE from "three";
import { CONFIG } from "../config/config.js";

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
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.07;
      a *= 0.5;
    }
    return v;
  }
`;

const discVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const discFragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uLayer;
  uniform vec3 uHot;
  uniform vec3 uCool;
  varying vec2 vUv;
  ${noiseChunk}

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r < 0.22 || r > 1.0) discard;

    float angle = atan(p.y, p.x);
    float swirl = angle * 2.4 + uTime * (0.35 + uLayer * 0.18) * uIntensity;
    float n = fbm(vec2(r * 6.0, swirl));
    float n2 = fbm(vec2(r * 11.0, -swirl * 1.4 + 2.0));

    float ring = smoothstep(0.22, 0.34, r) * smoothstep(1.0, 0.52, r);
    float photon = smoothstep(0.31, 0.28, r) * smoothstep(0.22, 0.29, r);
    float arms = pow(n * n2, 1.15);
    float energy = ring * (0.25 + arms * 1.35) + photon * 1.8;

    vec3 col = mix(uCool, uHot, clamp(arms + photon, 0.0, 1.0));
    col += vec3(1.0, 0.95, 0.85) * photon * 0.9;
    float alpha = energy * (0.45 + uIntensity * 0.4);
    gl_FragColor = vec4(col, alpha);
  }
`;

const lensVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const lensFragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;
  ${noiseChunk}

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    // Keep the lensed ring clear of the black throat so no color ever
    // bleeds onto the event horizon itself.
    if (r > 1.0 || r < 0.24) discard;

    float angle = atan(p.y, p.x);
    float bend = fbm(vec2(angle * 1.8 + uTime * 0.12, r * 4.0));
    float ring = smoothstep(0.24, 0.42, r) * smoothstep(0.95, 0.55, r);
    // Warped starlight bending around the photon sphere — elongated,
    // fast-moving arcs rather than a static glow, so it reads as motion.
    float bentArcs = pow(noise(vec2(angle * 5.0 + uTime * 0.4, r * 10.0 - uTime * 0.6)), 3.0);
    float lens = pow(1.0 - abs(r - 0.34), 5.0) * (0.35 + bend);
    float starStreak = pow(noise(vec2(angle * 18.0, r * 9.0 - uTime)), 8.0);

    vec3 col = vec3(0.72, 0.86, 1.0) * lens + vec3(1.0, 0.94, 0.8) * starStreak * ring;
    col += vec3(1.0, 0.97, 0.88) * bentArcs * ring * 0.6;
    float alpha = (lens * 0.5 + starStreak * 0.65 + bentArcs * ring * 0.4) * (0.35 + uIntensity * 0.5);
    gl_FragColor = vec4(col, alpha);
  }
`;

const tunnelFragment = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  varying vec2 vUv;
  ${noiseChunk}

  void main() {
    float x = vUv.x;
    float y = vUv.y;
    float n = fbm(vec2(x * 8.0, y * 3.0 - uTime * uSpeed));
    float rings = sin((y - uTime * uSpeed * 0.55) * 42.0);
    rings = pow(smoothstep(0.35, 1.0, rings), 3.0);
    float streaks = pow(noise(vec2(x * 40.0, y * 2.0 - uTime * uSpeed * 1.8)), 6.0);
    vec3 cool = vec3(0.25, 0.7, 1.0);
    vec3 hot = vec3(1.0, 0.72, 0.45);
    vec3 col = mix(cool, hot, n);
    col += vec3(1.0) * rings * 0.65 + cool * streaks * 1.4;
    float edge = smoothstep(0.0, 0.12, x) * smoothstep(1.0, 0.88, x);
    float alpha = (0.18 + n * 0.45 + rings * 0.5 + streaks) * edge;
    gl_FragColor = vec4(col, alpha);
  }
`;

// Thin cloud ribbon that always faces the camera (billboarded flat in the
// plane of the screen — not tilted into depth like the accretion discs,
// which is what made earlier rings vanish from some angles). Color drifts
// slowly between a cool blue and a violet-purple over time rather than
// sitting on one fixed hue.
const horizontalCloudFragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;
  ${noiseChunk}

  void main() {
    float lengthCoord = vUv.x;
    float thicknessCoord = vUv.y;

    float edgeFade = smoothstep(0.0, 0.12, lengthCoord) * smoothstep(1.0, 0.88, lengthCoord);
    float thickFade = smoothstep(0.0, 0.5, thicknessCoord) * smoothstep(1.0, 0.5, thicknessCoord);
    thickFade = pow(thickFade, 1.6);

    float flow = uTime * 0.07;
    float cloud = fbm(vec2(lengthCoord * 7.0 - flow * 3.0, thicknessCoord * 5.0));
    float wisps = fbm(vec2(lengthCoord * 18.0 + flow * 4.0, thicknessCoord * 8.0 - flow));
    // Bright floor so the ribbon always reads clearly — noise only
    // modulates it into wisps, it never fades toward invisible.
    float density = mix(0.5, 1.2, pow(cloud * wisps * 2.2, 1.05));

    // Slow drift between blue and violet-purple, independent of the noise.
    float hueShift = sin(uTime * 0.22) * 0.5 + 0.5;
    vec3 blueTint = vec3(0.42, 0.62, 1.0);
    vec3 purpleTint = vec3(0.66, 0.4, 0.98);
    vec3 col = mix(blueTint, purpleTint, hueShift) * mix(0.85, 1.2, wisps);

    float alpha = clamp(density * thickFade * edgeFade * (0.6 + uIntensity * 0.55), 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

// Circular halo cloud — also billboarded flat to the camera, so it
// always reads as a perfect ring regardless of viewing angle. Hugs
// just outside the black throat (not the wider accretion disc),
// colored with the same slow blue-to-purple drift as the horizontal
// ribbon.
const circularCloudFragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;
  ${noiseChunk}

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;

    float angle = atan(p.y, p.x);
    float band = smoothstep(0.1, 0.6, r) * smoothstep(0.99, 0.38, r);

    float flow = fbm(vec2(angle * 3.0 - uTime * 0.1, r * 5.0));
    float wisps = fbm(vec2(angle * 9.0 + uTime * 0.16, r * 8.0 - uTime * 0.07));
    float density = mix(0.45, 1.15, pow(clamp(flow * wisps * 2.0, 0.0, 1.0), 1.0));

    float hueShift = sin(uTime * 0.22 + 1.6) * 0.5 + 0.5;
    vec3 blueTint = vec3(0.4, 0.6, 1.0);
    vec3 purpleTint = vec3(0.64, 0.38, 0.97);
    vec3 col = mix(blueTint, purpleTint, hueShift) * mix(0.85, 1.2, wisps);

    float alpha = clamp(density * band * (0.6 + uIntensity * 0.55), 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * Wormhole built entirely in Three.js.
 * Sketchfab's "Galaxy Space Portal Black Hole" is used as visual reference only —
 * an iframe cannot drive a cinematic camera, so we do not embed it.
 */
export class Wormhole {
  constructor(scene, { layers = 6 } = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    const pos = CONFIG.wormhole.position;
    this.group.position.set(pos.x, pos.y, pos.z);
    this.group.scale.setScalar(CONFIG.wormhole.scale);
    scene.add(this.group);

    this.intensity = 1;
    this.spinBoost = 1;
    this.discs = [];

    const throatR = CONFIG.wormhole.throatRadius;
    const discR = CONFIG.wormhole.discRadius;

    // Event-horizon throat — deep, not a flat PNG. Sized to sit just
    // inside the lensed ring below so the center reads solid black with
    // nothing bleeding onto it.
    const throat = new THREE.Mesh(
      new THREE.SphereGeometry(throatR * 0.98, 48, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000 }),
    );
    this.group.add(throat);

    // Only a whisper of rim glow hugging the horizon's edge — enough to
    // sell "light bent around a void", not enough to tint the core blue.
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(throatR * 1.02, 32, 24),
      new THREE.MeshBasicMaterial({
        color: 0x0a1420,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.group.add(glow);
    this.glow = glow;

    const discGeo = new THREE.CircleGeometry(discR, 96);
    for (let i = 0; i < layers; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 1 },
          uLayer: { value: i },
          uHot: { value: new THREE.Color(i % 2 ? "#7fe8ff" : "#ffc07a") },
          uCool: { value: new THREE.Color(i % 2 ? "#2a4d8c" : "#4a2060") },
        },
        vertexShader: discVertex,
        fragmentShader: discFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(discGeo, mat);
      mesh.rotation.x = Math.PI / 2 + (i - layers / 2) * 0.035;
      mesh.rotation.z = i * 0.4;
      mesh.renderOrder = i;
      this.group.add(mesh);
      this.discs.push(mesh);
    }

    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(discR * 1.15, 80),
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 1 },
        },
        vertexShader: lensVertex,
        fragmentShader: lensFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    lens.rotation.x = Math.PI / 2;
    this.group.add(lens);
    this.lens = lens;

    // Two billboarded blue/violet cloud shapes, always facing the camera
    // (updated each frame in update()) rather than tilted into 3D depth:
    // a thin horizontal ribbon crossing the throat, and a circular halo
    // ringing the outer edge of the accretion disc.
    const makeCloud = (w, h, fragmentShader) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 1 },
        },
        vertexShader: lensVertex,
        fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      });
      return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    };

    const cloudH = makeCloud(discR * 2.5, discR * 0.5, horizontalCloudFragment);
    this.group.add(cloudH);
    this.cloudH = cloudH;

    const cloudRing = makeCloud(throatR * 3.4, throatR * 3.4, circularCloudFragment);
    this.group.add(cloudRing);
    this.cloudRing = cloudRing;

    // Temporal tunnel — the camera flies down this after entry.
    const tunnelGeo = new THREE.CylinderGeometry(throatR * 0.95, throatR * 1.4, 160, 48, 1, true);
    this.tunnelMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 1.2 },
      },
      vertexShader: discVertex,
      fragmentShader: tunnelFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    this.tunnel = new THREE.Mesh(tunnelGeo, this.tunnelMat);
    this.tunnel.rotation.x = Math.PI / 2;
    this.tunnel.position.z = -70;
    this.tunnel.visible = false;
    this.group.add(this.tunnel);

    this.cloudSpin = 0;
  }

  setIntensity(value) {
    this.intensity = value;
  }

  setSpinBoost(boost) {
    this.spinBoost = boost;
  }

  showTunnel(show) {
    this.tunnel.visible = show;
  }

  /**
   * Scale the whole portal. During entry we grow it so the throat
   * fills the windshield — the camera is also flying toward it.
   */
  setApproachScale(scale) {
    this.group.scale.setScalar(CONFIG.wormhole.scale * scale);
  }

  update(dt, time, camera) {
    const spin = CONFIG.wormhole.rotationSpeed * this.spinBoost;
    this.cloudSpin += spin * dt;
    this.discs.forEach((disc, i) => {
      disc.rotation.z = this.cloudSpin * (0.7 + i * 0.12) * (i % 2 ? -1 : 1);
      disc.material.uniforms.uTime.value = time;
      disc.material.uniforms.uIntensity.value = this.intensity;
    });
    this.lens.material.uniforms.uTime.value = time;
    this.lens.material.uniforms.uIntensity.value = this.intensity;
    this.lens.rotation.z = -this.cloudSpin * 0.25;

    const pulse = 0.1 + Math.sin(time * CONFIG.wormhole.glowPulseSpeed) * 0.04 * this.intensity;
    this.glow.material.opacity = pulse + this.intensity * 0.06;

    // Billboard both cloud shapes flat against the camera every frame —
    // this is what keeps them visible from any angle, unlike a ring
    // tilted into 3D depth which can project down to zero width.
    if (camera) {
      this.cloudH.quaternion.copy(camera.quaternion);
      this.cloudRing.quaternion.copy(camera.quaternion);
    }
    this.cloudH.material.uniforms.uTime.value = time;
    this.cloudH.material.uniforms.uIntensity.value = this.intensity;
    this.cloudRing.material.uniforms.uTime.value = time + 12.5; // desync the two shapes
    this.cloudRing.material.uniforms.uIntensity.value = this.intensity;

    this.tunnelMat.uniforms.uTime.value = time;
    this.tunnelMat.uniforms.uSpeed.value = 1.1 * this.spinBoost;
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }
}
