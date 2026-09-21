import * as THREE from "three";

const skyVertex = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  uniform float uTime;
  varying vec3 vDirection;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += noise(p) * amplitude;
      p = p * 2.03 + 1.7;
      amplitude *= 0.5;
    }
    return value;
  }

  float cluster(vec2 p, vec2 center, float scale) {
    vec2 q = (p - center) * scale;
    float r = length(q);
    float a = atan(q.y, q.x);
    float arms = 0.5 + 0.5 * sin(a * 3.0 - r * 9.0 + uTime * 0.025);
    return exp(-r * 2.8) * (0.25 + pow(arms, 5.0));
  }

  void main() {
    vec3 d = normalize(vDirection);
    vec2 p = vec2(atan(d.z, d.x) / 3.14159, asin(d.y) / 1.5708);
    vec3 drift = d * 3.3 + vec3(uTime * 0.0015, 0.0, -uTime * 0.001);
    float broad = fbm(drift);
    float detail = fbm(drift * 2.8 + 5.0);
    float dust = smoothstep(0.35, 0.78, broad * 0.72 + detail * 0.42);

    vec3 midnight = vec3(0.002, 0.005, 0.025);
    vec3 blue = vec3(0.025, 0.16, 0.42);
    vec3 red = vec3(0.42, 0.025, 0.09);
    float colorFlow = smoothstep(0.2, 0.85, fbm(drift * 1.45 + 9.0));
    vec3 color = midnight + mix(blue, red, colorFlow) * dust * 0.62;

    float g1 = cluster(p, vec2(-0.48, 0.28), 5.2);
    float g2 = cluster(p, vec2(0.52, -0.22), 6.0);
    float g3 = cluster(p, vec2(0.05, 0.48), 7.5);
    color += blue * g1 * 0.75 + red * g2 * 0.7 + mix(red, blue, 0.5) * g3 * 0.5;

    float stars = step(0.996, hash(floor(d * 520.0))) * (0.35 + 0.5 * hash(d * 1100.0));
    color += vec3(0.55, 0.72, 1.0) * stars * 0.65;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const PLANETS = [
  { radius: 30, size: 0.48, phase: 0.28, speed: 0.010, lift: 0.56, depth: -8, color: "#3e83e5", ring: true },
  { radius: 36, size: 0.36, phase: 1.15, speed: -0.008, lift: 0.52, depth: -12, color: "#8056d3" },
  { radius: 42, size: 0.56, phase: 2.45, speed: 0.007, lift: 0.45, depth: -17, color: "#db4569", ring: true },
  { radius: 49, size: 0.30, phase: 3.28, speed: -0.006, lift: 0.50, depth: -22, color: "#4289c8" },
  { radius: 56, size: 0.43, phase: 4.08, speed: 0.005, lift: 0.38, depth: -28, color: "#b43e56" },
  { radius: 63, size: 0.34, phase: 4.72, speed: -0.0045, lift: 0.42, depth: -34, color: "#566fd6", ring: true },
  { radius: 70, size: 0.46, phase: 5.38, speed: 0.004, lift: 0.34, depth: -40, color: "#d45b65" },
  { radius: 77, size: 0.28, phase: 5.95, speed: -0.0035, lift: 0.38, depth: -47, color: "#4d91dc" },
  { radius: 84, size: 0.38, phase: 1.82, speed: 0.003, lift: 0.31, depth: -54, color: "#934b91" },
  { radius: 92, size: 0.30, phase: 3.72, speed: -0.0027, lift: 0.29, depth: -61, color: "#c84b5d" },
  { radius: 100, size: 0.36, phase: 0.78, speed: 0.0024, lift: 0.27, depth: -68, color: "#3e72bd" },
];

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 3, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,0.85)");
  gradient.addColorStop(0.18, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A colorful deep-space layer with tiny bodies slowly orbiting the wormhole. */
export class PlanetField {
  constructor(scene, center) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.set(center.x, center.y, center.z);
    this.planets = [];

    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 20), this.skyMaterial);
    this.sky.renderOrder = -100;
    scene.add(this.sky);

    this.glowTexture = makeGlowTexture();
    const geometry = new THREE.SphereGeometry(1, 24, 16);
    for (const config of PLANETS) {
      const body = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: config.color,
          emissive: config.color,
          emissiveIntensity: 0.48,
          roughness: 0.7,
          metalness: 0.08,
          fog: false,
        }),
      );
      body.scale.setScalar(config.size);
      body.renderOrder = -7;
      this.group.add(body);

      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.glowTexture,
        color: config.color,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }));
      glow.scale.setScalar(3.4);
      body.add(glow);

      if (config.ring) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(1.35, 1.9, 48),
          new THREE.MeshBasicMaterial({
            color: config.color,
            transparent: true,
            opacity: 0.36,
            side: THREE.DoubleSide,
            depthWrite: false,
            fog: false,
          }),
        );
        ring.rotation.x = 1.14;
        ring.rotation.z = config.phase;
        body.add(ring);
      }

      this.planets.push({ body, ...config });
    }

    scene.add(this.group);
    this.update(0, 0);
  }

  update(_dt, time) {
    this.skyMaterial.uniforms.uTime.value = time;
    this.sky.position.copy(this.scene.userData.cameraPosition || new THREE.Vector3());
    for (const planet of this.planets) {
      const angle = planet.phase + time * planet.speed;
      planet.body.position.set(
        Math.cos(angle) * planet.radius,
        Math.sin(angle) * planet.radius * planet.lift,
        planet.depth + Math.sin(angle) * planet.radius * 0.06,
      );
      planet.body.rotation.y = time * 0.035 + planet.phase;
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.scene.remove(this.sky);
    this.sky.geometry.dispose();
    this.skyMaterial.dispose();
    this.glowTexture.dispose();
    const firstPlanet = this.planets[0];
    firstPlanet?.body.geometry.dispose();
    for (const planet of this.planets) {
      planet.body.material.dispose();
      for (const child of planet.body.children) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      }
    }
  }
}