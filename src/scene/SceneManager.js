import * as THREE from "three";
import { CONFIG, qualityProfile } from "../config/config.js";
import { Starfield } from "./Starfield.js";
import { Nebula } from "./Nebula.js";
import { PlanetField } from "./PlanetField.js";
import { ParticleSystem } from "./ParticleSystem.js";
import { Wormhole } from "./Wormhole.js";
import { CameraController } from "./CameraController.js";
import { Cockpit } from "../cockpit/Cockpit.js";
import { PostFX } from "./PostFX.js";

export class SceneManager {
  constructor(canvas, quality) {
    this.canvas = canvas;
    this.qualityLevel = quality;
    this.profile = qualityProfile(quality);
    this.clock = new THREE.Clock();
    this.time = 0;
    this.running = true;
    this.fpsWindow = [];

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: quality !== "low",
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setClearColor(0x000008, 1);
    this.renderer.setPixelRatio(this.profile.dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000008, 0.0045);

    this.camera = new THREE.PerspectiveCamera(
      CONFIG.camera.idleFov,
      window.innerWidth / window.innerHeight,
      CONFIG.camera.near,
      CONFIG.camera.far,
    );
    this.scene.add(this.camera);

    this.scene.add(new THREE.AmbientLight(0x1a2430, 0.55));
    const key = new THREE.PointLight(0x7adfff, 1.4, 18);
    key.position.set(0, 1.4, 0.2);
    this.camera.add(key);
    const rim = new THREE.DirectionalLight(0x9ad4ff, 0.35);
    rim.position.set(-8, 6, 4);
    this.scene.add(rim);
    const wormholeLight = new THREE.PointLight(0x66c8ff, 2.2, 80);
    wormholeLight.position.set(
      CONFIG.wormhole.position.x,
      CONFIG.wormhole.position.y,
      CONFIG.wormhole.position.z + 8,
    );
    this.scene.add(wormholeLight);
    this.wormholeLight = wormholeLight;

    this.cameraControl = new CameraController(this.camera);
    this.cockpit = new Cockpit(this.camera);

    this.starfield = new Starfield(this.scene, this.profile.stars);
    this.starfield.setPixelRatio(this.profile.dpr);

    // Faint drifting dust clouds behind the stars — skipped on LOW quality
    // where the extra alpha-blended overdraw isn't worth the fill cost.
    this.nebula = this.profile.nebulaLayers > 0
      ? new Nebula(this.scene, { layers: this.profile.nebulaLayers })
      : null;

    // Sparse, far-off planets drift around the wormhole on the backmost
    // colored layer. Their motion is intentionally almost imperceptible.
    this.planets = new PlanetField(this.scene, CONFIG.wormhole.position);

    this.wormhole = new Wormhole(this.scene, { layers: this.profile.accretionLayers });

    this.inflow = new ParticleSystem(this.scene, {
      count: this.profile.wormholeParticles,
      mode: "inflow",
      speed: 0.55,
      origin: new THREE.Vector3(
        CONFIG.wormhole.position.x,
        CONFIG.wormhole.position.y,
        CONFIG.wormhole.position.z,
      ),
      radius: CONFIG.wormhole.discRadius * 0.85,
      color: "#9adfff",
      sizeMin: 0.9,
      sizeMax: 2.2,
    });
    this.inflow.setPixelRatio(this.profile.dpr);

    this.fx = new PostFX(this.renderer, this.scene, this.camera, {
      bloom: this.profile.bloom,
    });

    this.onResize = this.onResize.bind(this);
    window.addEventListener("resize", this.onResize);

    this._loop = this._loop.bind(this);
  }

  start() {
    this.clock.start();
    this.renderer.setAnimationLoop(this._loop);
  }

  _loop() {
    if (!this.running) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;

    this.cameraControl.update(dt, this.time);
    this.cockpit.update(this.time);
    this.starfield.update(dt, this.time);
    if (this.nebula) this.nebula.update(dt, this.time);
    this.planets.update(dt, this.time);
    this.inflow.update(dt, this.time);
    this.wormhole.update(dt, this.time, this.camera);
    this.wormholeLight.intensity = 1.6 + this.wormhole.intensity * 1.8;

    if (this.onUpdate) this.onUpdate(dt, this.time);

    this.fx.render(this.time);
    this._sampleFps(dt);
  }

  _sampleFps(dt) {
    this.fpsWindow.push(dt);
    if (this.fpsWindow.length > 90) this.fpsWindow.shift();
  }

  getAverageFps() {
    if (!this.fpsWindow.length) return 60;
    const avg = this.fpsWindow.reduce((a, b) => a + b, 0) / this.fpsWindow.length;
    return 1 / avg;
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.fx.setSize(w, h);
  }

  dispose() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("resize", this.onResize);
    if (this.nebula) this.nebula.dispose();
    this.planets.dispose();
  }
}
