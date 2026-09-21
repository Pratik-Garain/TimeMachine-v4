import * as THREE from "three";
import { CONFIG } from "../config/config.js";

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aBright;
  attribute float aPhase;
  uniform float uTime;
  uniform float uTwinkle;
  uniform float uStreak;
  uniform float uPixelRatio;
  varying float vBright;
  varying float vStreak;

  void main() {
    vStreak = uStreak;
    float twinkle = 0.65 + uTwinkle * 0.45 * sin(uTime * (1.2 + aPhase * 2.4) + aPhase * 6.28318);
    vBright = aBright * twinkle;

    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;

    float distBoost = 80.0 / max(1.0, -mv.z);
    float streakScale = 1.0 + uStreak * 7.0;
    gl_PointSize = aSize * uPixelRatio * distBoost * streakScale;
    gl_PointSize = clamp(gl_PointSize, 0.6, 48.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vBright;
  varying float vStreak;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float r;
    if (vStreak > 0.15) {
      // Elongate into a streak along Y of the point sprite.
      vec2 stretched = vec2(uv.x * (1.0 + vStreak * 2.2), uv.y * (0.22 + (1.0 - vStreak) * 0.55));
      r = length(stretched);
    } else {
      r = length(uv);
    }
    float alpha = smoothstep(0.5, 0.08, r) * vBright;
    if (alpha < 0.02) discard;
    vec3 color = mix(vec3(0.72, 0.85, 1.0), vec3(1.0, 0.97, 0.9), vBright);
    gl_FragColor = vec4(color, alpha);
  }
`;

export class Starfield {
  constructor(scene, count) {
    this.scene = scene;
    this.count = count;
    this.radius = 900;

    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const brights = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // More stars far away, a few closer for parallax.
      const layer = Math.random();
      const r = layer < 0.12
        ? 18 + Math.random() * 70
        : layer < 0.4
          ? 90 + Math.random() * 180
          : 280 + Math.random() * this.radius;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = layer < 0.12 ? 2.4 + Math.random() * 2.2 : 0.7 + Math.random() * 1.6;
      brights[i] = 0.25 + Math.random() * 0.75;
      phases[i] = Math.random();
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute("aBright", new THREE.BufferAttribute(brights, 1));
    this.geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTwinkle: { value: CONFIG.twinkleAmount },
        uStreak: { value: 0 },
        uPixelRatio: { value: 1 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);

    this._drift = 0;
    this.speed = CONFIG.idleStarSpeed;
  }

  setPixelRatio(dpr) {
    this.material.uniforms.uPixelRatio.value = dpr;
  }

  setStreak(amount) {
    this.material.uniforms.uStreak.value = amount;
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  update(dt, time) {
    this.material.uniforms.uTime.value = time;
    // Slow / fast drift along -Z so stars feel like they have depth.
    const positions = this.geometry.attributes.position;
    const array = positions.array;
    const wrap = this.radius;
    const dz = this.speed * dt;
    for (let i = 0; i < this.count; i++) {
      array[i * 3 + 2] += dz;
      if (array[i * 3 + 2] > 40) array[i * 3 + 2] -= wrap + 80;
    }
    positions.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
