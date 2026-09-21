import * as THREE from "three";

/**
 * Reusable GPU particle cloud.
 * mode: "drift" | "inflow" | "streak"
 */
export class ParticleSystem {
  constructor(scene, options) {
    this.scene = scene;
    this.count = options.count;
    this.mode = options.mode || "drift";
    this.speed = options.speed ?? 0.4;
    this.origin = options.origin || new THREE.Vector3(0, 1.5, -50);
    this.radius = options.radius ?? 22;

    const positions = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    const seeds = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      this._spawn(positions, i, true);
      sizes[i] = options.sizeMin ?? 0.8 + Math.random() * (options.sizeMax ?? 2.4);
      seeds[i] = Math.random();
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uColor: { value: new THREE.Color(options.color || "#9fe9ff") },
        uStreak: { value: 0 },
        uOpacity: { value: options.opacity ?? 0.7 },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aSeed;
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uStreak;
        varying float vAlpha;
        varying float vStreak;
        void main() {
          vStreak = uStreak;
          vAlpha = 0.35 + 0.65 * fract(aSeed + uTime * 0.05);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPixelRatio * (90.0 / max(1.0, -mv.z)) * (1.0 + uStreak * 5.0);
          gl_PointSize = clamp(gl_PointSize, 0.5, 40.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        varying float vStreak;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float r;
          if (vStreak > 0.2) {
            r = length(vec2(uv.x * 1.8, uv.y * 0.22));
          } else {
            r = length(uv);
          }
          float a = smoothstep(0.5, 0.05, r) * vAlpha * uOpacity;
          if (a < 0.02) discard;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }

  _spawn(array, i, randomZ) {
    if (this.mode === "inflow") {
      const a = Math.random() * Math.PI * 2;
      const r = this.radius * (0.35 + Math.random() * 0.75);
      array[i * 3] = this.origin.x + Math.cos(a) * r;
      array[i * 3 + 1] = this.origin.y + (Math.random() - 0.5) * r * 0.35;
      array[i * 3 + 2] = this.origin.z + (randomZ ? (Math.random() - 0.5) * 18 : 12);
    } else {
      array[i * 3] = (Math.random() - 0.5) * 24;
      array[i * 3 + 1] = 0.4 + Math.random() * 2.4;
      array[i * 3 + 2] = randomZ ? (Math.random() * -40) : -2;
    }
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
    const pos = this.geometry.attributes.position;
    const array = pos.array;

    if (this.mode === "inflow") {
      for (let i = 0; i < this.count; i++) {
        const ix = i * 3;
        const dx = this.origin.x - array[ix];
        const dy = this.origin.y - array[ix + 1];
        const dz = this.origin.z - array[ix + 2];
        const dist = Math.hypot(dx, dy, dz) + 0.0001;
        const pull = this.speed * dt * (8 / dist);
        array[ix] += dx * pull;
        array[ix + 1] += dy * pull;
        array[ix + 2] += dz * pull * 0.6 + this.speed * dt * 0.4;
        // Spiral
        array[ix] += -dy * 0.35 * this.speed * dt;
        array[ix + 1] += dx * 0.18 * this.speed * dt;
        if (dist < 1.4 || array[ix + 2] < this.origin.z - 10) {
          this._spawn(array, i, false);
        }
      }
    } else {
      for (let i = 0; i < this.count; i++) {
        array[i * 3 + 2] += this.speed * dt;
        array[i * 3 + 1] += Math.sin(time + i) * 0.01 * dt * 20;
        if (array[i * 3 + 2] > 2.2) this._spawn(array, i, false);
      }
    }
    pos.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
