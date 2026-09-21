/**
 * TIME MACHINE — visual and timing knobs
 *
 * Tweak these numbers to change the feel of the scene without
 * hunting through shaders and controllers.
 */
export const Quality = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

export const CONFIG = {
  // ----- renderer -----
  // Cap pixel ratio so exhibition PCs with 4K screens stay smooth.
  maxPixelRatio: 2,

  // ----- camera (idle first-person cockpit) -----
  camera: {
    idleFov: 52, // narrower = more cinematic / telephoto
    travelFov: 92, // wider during the jump (speed sensation)
    near: 0.05,
    far: 4000,
    idlePosition: { x: 0, y: 1.18, z: 0.55 },
    idleLookAt: { x: 0, y: 1.35, z: -40 },
    // Tiny idle sway so the cockpit never feels frozen.
    idleSwayAmount: 0.018,
    idleSwaySpeed: 0.22,
  },

  // ----- wormhole placement -----
  // The hole sits far ahead and is huge relative to the cockpit.
  wormhole: {
    position: { x: 0, y: 1.6, z: -52 },
    scale: 1, // multiplied onto the built geometry
    throatRadius: 7.5,
    discRadius: 28,
    rotationSpeed: 0.08, // idle spin of accretion layers (radians / sec)
    travelRotationBoost: 4.2, // multiplied onto spin during jump
    glowPulseSpeed: 0.35,
  },

  // ----- starfield -----
  starCount: 4800, // HIGH; reduced automatically on lower quality
  idleStarSpeed: 1.6, // slow drift toward the camera in idle
  travelStarSpeed: 85, // forward rush during the jump
  twinkleAmount: 0.55,

  // ----- nearby dust / cockpit-adjacent motes -----
  nearbyParticleCount: 0,
  idleParticleSpeed: 0.35,
  travelParticleSpeed: 28,

  // ----- wormhole inflow particles -----
  wormholeParticleCount: 760,

  // ----- time-travel durations (seconds) -----
  selectedHold: 1.15, // “destination locked” beat
  accelerationDuration: 2.05, // engines spool, camera shake
  wormholeApproachDuration: 2.35, // camera races toward the hole
  wormholeEntryDuration: 1.45, // hole swallows the frame
  tunnelDuration: 2.55, // temporal corridor
  flashDuration: 0.18,
  blackScreenDuration: 0.95,

  // ----- camera shake (acceleration only) -----
  shakeAmount: 0.045,
  shakeFrequency: 18,

  // ----- post-processing -----
  bloomStrengthIdle: 0.28,
  bloomStrengthTravel: 1.05,
  distortionIdle: 0.18,
  distortionTravel: 0.92,
};

export function qualityProfile(level) {
  if (level === Quality.LOW) {
    return {
      stars: 1100,
      nearby: 0,
      wormholeParticles: 180,
      accretionLayers: 3,
      nebulaLayers: 0,
      dpr: 1,
      bloom: false,
      shadows: false,
    };
  }
  if (level === Quality.MEDIUM) {
    return {
      stars: 2700,
      nearby: 0,
      wormholeParticles: 420,
      accretionLayers: 4,
      nebulaLayers: 2,
      dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      bloom: true,
      shadows: false,
    };
  }
  return {
    stars: CONFIG.starCount,
    nearby: CONFIG.nearbyParticleCount,
    wormholeParticles: CONFIG.wormholeParticleCount,
    accretionLayers: 6,
    nebulaLayers: 4,
    dpr: Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio),
    bloom: true,
    shadows: false,
  };
}

export function pickInitialQuality() {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 8;
  const isMobile = matchMedia("(max-width: 820px)").matches;
  if (isMobile || cores <= 4 || memory <= 4) return Quality.MEDIUM;
  return Quality.HIGH;
}
