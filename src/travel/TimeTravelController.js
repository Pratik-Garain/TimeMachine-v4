import * as THREE from "three";
import { CONFIG } from "../config/config.js";
import { TimeTravelState } from "./TravelState.js";
import { easeInCubic, easeInOutCubic, easeOutCubic, lerp, saturate, smoothstep } from "../utils/easing.js";

export class TimeTravelController {
  constructor({ scene, hud, panel, audio }) {
    this.scene = scene;
    this.hud = hud;
    this.panel = panel;
    this.audio = audio;
    this.state = TimeTravelState.IDLE;
    this.stateTime = 0;
    this.destination = null;
    this.navigated = false;

    this.idlePos = new THREE.Vector3(
      CONFIG.camera.idlePosition.x,
      CONFIG.camera.idlePosition.y,
      CONFIG.camera.idlePosition.z,
    );
    this.idleLook = new THREE.Vector3(
      CONFIG.camera.idleLookAt.x,
      CONFIG.camera.idleLookAt.y,
      CONFIG.camera.idleLookAt.z,
    );

    this.flashEl = document.getElementById("flash-layer");
    this.blackEl = document.getElementById("blackout");
  }

  get traveling() {
    return this.state !== TimeTravelState.IDLE;
  }

  select(destination) {
    if (this.state !== TimeTravelState.IDLE) return;
    this.destination = destination;
    this.panel.lock(destination.id);
    this.audio.unlock();
    this.audio.click();
    this.audio.lockTone();
    this._enter(TimeTravelState.SELECTED);
  }

  _enter(state) {
    this.state = state;
    this.stateTime = 0;
    this.hud.applyState(state, this.destination);

    if (state === TimeTravelState.ACCELERATING) this.audio.engineRise();
    if (state === TimeTravelState.APPROACHING) this.audio.rumble();
    if (state === TimeTravelState.ENTERING) this.audio.whoosh();
    if (state === TimeTravelState.TUNNEL) this.scene.wormhole.showTunnel(true);
    if (state === TimeTravelState.NAVIGATING) this._navigate();
  }

  update(dt) {
    this.stateTime += dt;
    const cam = this.scene.cameraControl;
    const wormhole = this.scene.wormhole;
    const wp = CONFIG.wormhole.position;

    switch (this.state) {
      case TimeTravelState.IDLE: {
        cam.idleSway = 1;
        cam.shakeAmount = 0;
        cam.setPose(this.idlePos, this.idleLook, CONFIG.camera.idleFov);
        wormhole.setIntensity(1);
        wormhole.setSpinBoost(1);
        wormhole.setApproachScale(1);
        this.scene.starfield.setSpeed(CONFIG.idleStarSpeed);
        this.scene.starfield.setStreak(0);
        this.scene.inflow.setSpeed(0.55);
        this.scene.cockpit.setIntensity(1);
        this.scene.cockpit.setVisibility(1);
        this.scene.fx.setBloom(CONFIG.bloomStrengthIdle);
        this.scene.fx.setDistortion(CONFIG.distortionIdle);
        this.scene.fx.setAberration(0);
        this.scene.fx.setFlash(0);
        this.scene.fx.setBlack(0);
        this.scene.fx.setLetterbox(0);
        this.audio.setTravelLevel(0);
        break;
      }

      case TimeTravelState.SELECTED: {
        const t = saturate(this.stateTime / CONFIG.selectedHold);
        cam.idleSway = 0.4;
        this.scene.cockpit.setIntensity(1.2 + t * 0.4);
        wormhole.setIntensity(1 + t * 0.25);
        this.scene.fx.setLetterbox(t * 0.3);
        if (t >= 1) this._enter(TimeTravelState.ACCELERATING);
        break;
      }

      case TimeTravelState.ACCELERATING: {
        const t = easeOutCubic(this.stateTime / CONFIG.accelerationDuration);
        cam.idleSway = 0;
        cam.shakeAmount = CONFIG.shakeAmount * t;
        const pos = new THREE.Vector3(0, 1.16, lerp(0.55, -1.6, t));
        const look = new THREE.Vector3(0, lerp(1.35, 1.5, t), lerp(-40, -48, t));
        cam.setPose(pos, look, lerp(CONFIG.camera.idleFov, 64, t));
        wormhole.setIntensity(1.2 + t * 0.5);
        wormhole.setSpinBoost(1 + t * 1.4);
        this.scene.starfield.setSpeed(lerp(CONFIG.idleStarSpeed, 14, t));
        this.scene.starfield.setStreak(t * 0.25);
        this.scene.inflow.setSpeed(0.55 + t * 2);
        this.scene.cockpit.setIntensity(1.6 + t);
        this.scene.fx.setBloom(lerp(CONFIG.bloomStrengthIdle, 0.55, t));
        this.scene.fx.setDistortion(lerp(CONFIG.distortionIdle, 0.35, t));
        this.scene.fx.setLetterbox(lerp(0.3, 1, t));
        this.audio.setTravelLevel(t * 0.4);
        if (this.stateTime >= CONFIG.accelerationDuration) {
          this._enter(TimeTravelState.APPROACHING);
        }
        break;
      }

      case TimeTravelState.APPROACHING: {
        const t = easeInCubic(this.stateTime / CONFIG.wormholeApproachDuration);
        cam.shakeAmount = CONFIG.shakeAmount * (1 - t * 0.6);
        const pos = new THREE.Vector3(0, lerp(1.16, 1.45, t), lerp(-1.6, -28, t));
        const look = new THREE.Vector3(0, wp.y, wp.z);
        cam.setPose(pos, look, lerp(64, 78, t));
        wormhole.setSpinBoost(2.4 + t * 2);
        wormhole.setApproachScale(1 + t * 0.55);
        wormhole.setIntensity(1.6 + t * 0.6);
        this.scene.starfield.setSpeed(lerp(14, CONFIG.travelStarSpeed * 0.55, t));
        this.scene.starfield.setStreak(0.25 + t * 0.5);
        this.scene.inflow.setSpeed(2.5 + t * 6);
        this.scene.inflow.setStreak(t * 0.7);
        this.scene.fx.setBloom(lerp(0.55, CONFIG.bloomStrengthTravel, t));
        this.scene.fx.setDistortion(lerp(0.35, 0.7, t));
        this.scene.fx.setAberration(t * 0.45);
        this.audio.setTravelLevel(0.4 + t * 0.35);
        if (this.stateTime >= CONFIG.wormholeApproachDuration) {
          this._enter(TimeTravelState.ENTERING);
        }
        break;
      }

      case TimeTravelState.ENTERING: {
        // Camera physically flies through the throat — not a 2D zoom.
        const t = easeInCubic(this.stateTime / CONFIG.wormholeEntryDuration);
        cam.shakeAmount = CONFIG.shakeAmount * 0.25 * (1 - t);
        const pos = new THREE.Vector3(
          0,
          lerp(1.45, wp.y, t),
          lerp(-28, wp.z - 6, t),
        );
        cam.setPose(pos, new THREE.Vector3(0, wp.y, wp.z - 40), lerp(78, CONFIG.camera.travelFov, t));
        wormhole.setApproachScale(1.55 + t * 2.4);
        wormhole.setSpinBoost(5 + t * 3);
        this.scene.cockpit.setVisibility(1 - t);
        this.scene.cockpit.setIntensity(2.4);
        this.scene.starfield.setSpeed(CONFIG.travelStarSpeed);
        this.scene.starfield.setStreak(0.75 + t * 0.25);
        this.scene.fx.setDistortion(lerp(0.7, CONFIG.distortionTravel, t));
        this.scene.fx.setAberration(0.45 + t * 0.55);
        this.scene.fx.setVignette(0.45 + t * 0.25);
        if (t > 0.35) wormhole.showTunnel(true);
        this.audio.setTravelLevel(0.75 + t * 0.25);
        if (this.stateTime >= CONFIG.wormholeEntryDuration) {
          this._enter(TimeTravelState.TUNNEL);
        }
        break;
      }

      case TimeTravelState.TUNNEL: {
        const t = saturate(this.stateTime / CONFIG.tunnelDuration);
        cam.shakeAmount = 0;
        const pos = new THREE.Vector3(0, wp.y, lerp(wp.z - 6, wp.z - 95, easeInOutCubic(t)));
        const look = new THREE.Vector3(0, wp.y, pos.z - 30);
        cam.setPose(pos, look, CONFIG.camera.travelFov);
        wormhole.setSpinBoost(8);
        this.scene.starfield.setStreak(1);
        this.scene.starfield.setSpeed(CONFIG.travelStarSpeed * 1.4);
        this.scene.fx.setAberration(1);
        this.scene.fx.setDistortion(CONFIG.distortionTravel);
        this.scene.fx.setBloom(CONFIG.bloomStrengthTravel);
        if (this.stateTime >= CONFIG.tunnelDuration) this._enter(TimeTravelState.FLASH);
        break;
      }

      case TimeTravelState.FLASH: {
        const t = saturate(this.stateTime / CONFIG.flashDuration);
        this.scene.fx.setFlash(t < 0.5 ? t * 2 : 1);
        this.flashEl.style.opacity = String(t < 0.5 ? t * 2 : 1);
        if (this.stateTime >= CONFIG.flashDuration) this._enter(TimeTravelState.BLACK);
        break;
      }

      case TimeTravelState.BLACK: {
        const t = saturate(this.stateTime / CONFIG.blackScreenDuration);
        this.scene.fx.setFlash(1 - t);
        this.scene.fx.setBlack(smoothstep(t * 1.4));
        this.flashEl.style.opacity = String(1 - t);
        this.blackEl.classList.add("show");
        if (this.stateTime >= CONFIG.blackScreenDuration) {
          this._enter(TimeTravelState.NAVIGATING);
        }
        break;
      }

      case TimeTravelState.NAVIGATING:
        break;
      default:
        break;
    }
  }

  _navigate() {
    if (this.navigated || !this.destination) return;
    this.navigated = true;
    window.location.href = this.destination.url;
  }
}
