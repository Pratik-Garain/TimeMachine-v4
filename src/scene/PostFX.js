import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

const cinematicShader = {
  uniforms: {
    tDiffuse: { value: null },
    uDistortion: { value: 0.2 },
    uAberration: { value: 0 },
    uVignette: { value: 0.45 },
    uFlash: { value: 0 },
    uBlack: { value: 0 },
    uTime: { value: 0 },
    uGrain: { value: 0.028 },
    uLetterbox: { value: 0 },
    uGrade: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uDistortion;
    uniform float uAberration;
    uniform float uVignette;
    uniform float uFlash;
    uniform float uBlack;
    uniform float uTime;
    uniform float uGrain;
    uniform float uLetterbox;
    uniform float uGrade;
    varying vec2 vUv;

    float hash13(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 center = uv - 0.5;
      float r = length(center);

      // Radial gravitational pinch toward the wormhole (screen center).
      float pinch = uDistortion * 0.22 * pow(r, 1.4);
      uv = 0.5 + center * (1.0 - pinch);

      // Subtle swirl near the core during travel.
      float swirl = uDistortion * 0.35 * (1.0 - smoothstep(0.0, 0.55, r));
      float a = swirl * 0.8;
      float s = sin(a);
      float c = cos(a);
      vec2 p = uv - 0.5;
      uv = 0.5 + vec2(p.x * c - p.y * s, p.x * s + p.y * c);

      vec2 dir = center;
      vec4 col;
      col.r = texture2D(tDiffuse, uv + dir * uAberration * 0.012).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir * uAberration * 0.012).b;
      col.a = 1.0;

      // ---- Cinematic color grade: filmic contrast + teal/orange split-tone ----
      // Kept restrained (not neon) to read as naturalistic IMAX-style grading
      // rather than a cartoon teal/orange preset.
      vec3 graded = col.rgb;
      graded = mix(graded, smoothstep(0.0, 1.0, graded), 0.32 * uGrade);

      float luma = dot(graded, vec3(0.299, 0.587, 0.114));
      vec3 shadowTint = vec3(-0.015, 0.02, 0.045);
      vec3 highlightTint = vec3(0.05, 0.025, -0.02);
      float shadowMix = smoothstep(0.5, 0.0, luma);
      float highlightMix = smoothstep(0.4, 1.0, luma);
      graded += shadowTint * shadowMix * uGrade;
      graded += highlightTint * highlightMix * uGrade;

      float g = dot(graded, vec3(0.299, 0.587, 0.114));
      graded = mix(vec3(g), graded, mix(1.0, 0.88, uGrade));
      col.rgb = graded;

      float vig = 1.0 - uVignette * pow(r * 1.35, 1.8);
      col.rgb *= vig;

      // ---- Film grain (always faintly present, like real stock) ----
      float grainN = hash13(vUv * vec2(1920.0, 1080.0) + uTime * 97.0) - 0.5;
      col.rgb += grainN * uGrain;

      col.rgb = mix(col.rgb, vec3(1.0), uFlash);
      col.rgb *= 1.0 - uBlack;

      // ---- Letterbox bars (2.39:1-ish widescreen during the jump) ----
      float barHeight = 0.12 * uLetterbox;
      float bar = step(uv.y, barHeight) + step(1.0 - barHeight, uv.y);
      col.rgb = mix(col.rgb, vec3(0.0), clamp(bar, 0.0, 1.0));

      gl_FragColor = col;
    }
  `,
};

export class PostFX {
  constructor(renderer, scene, camera, { bloom }) {
    this.renderer = renderer;
    this.enabled = true;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.32,
      0.65,
      0.78,
    );
    this.bloomPass.enabled = bloom;
    this.composer.addPass(this.bloomPass);

    this.cinePass = new ShaderPass(cinematicShader);
    this.composer.addPass(this.cinePass);
  }

  setSize(w, h) {
    this.composer.setSize(w, h);
    this.bloomPass.setSize(w, h);
  }

  setBloom(strength) {
    this.bloomPass.strength = strength;
  }

  setDistortion(v) {
    this.cinePass.uniforms.uDistortion.value = v;
  }

  setAberration(v) {
    this.cinePass.uniforms.uAberration.value = v;
  }

  setFlash(v) {
    this.cinePass.uniforms.uFlash.value = v;
  }

  setBlack(v) {
    this.cinePass.uniforms.uBlack.value = v;
  }

  setVignette(v) {
    this.cinePass.uniforms.uVignette.value = v;
  }

  setGrain(v) {
    this.cinePass.uniforms.uGrain.value = v;
  }

  setLetterbox(v) {
    this.cinePass.uniforms.uLetterbox.value = v;
  }

  setGrade(v) {
    this.cinePass.uniforms.uGrade.value = v;
  }

  render(time) {
    this.cinePass.uniforms.uTime.value = time;
    this.composer.render();
  }
}
