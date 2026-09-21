import * as THREE from "three";
import { CONFIG } from "../config/config.js";
import { lerp, lerpVec3 } from "../utils/easing.js";

/**
 * Movie-style camera: position, look target, FOV, shake, travel path.
 * Shake is applied only when `shakeAmount` is raised (acceleration).
 */
export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.position = new THREE.Vector3(
      CONFIG.camera.idlePosition.x,
      CONFIG.camera.idlePosition.y,
      CONFIG.camera.idlePosition.z,
    );
    this.target = new THREE.Vector3(
      CONFIG.camera.idleLookAt.x,
      CONFIG.camera.idleLookAt.y,
      CONFIG.camera.idleLookAt.z,
    );
    this.fov = CONFIG.camera.idleFov;
    this.shakeAmount = 0;
    this.shakeTime = 0;
    this.idleSway = 1;
    this.mouse = new THREE.Vector2(0, 0);
    this._shake = new THREE.Vector3();
    this._look = new THREE.Vector3();

    window.addEventListener("pointermove", (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    });
  }

  setPose(position, lookAt, fov) {
    this.position.copy(position);
    this.target.copy(lookAt);
    if (fov != null) this.fov = fov;
  }

  blendTo(position, lookAt, fov, t) {
    lerpVec3(this.position, this.position, position, t);
    lerpVec3(this.target, this.target, lookAt, t);
    this.fov = lerp(this.fov, fov, t);
  }

  update(dt, time) {
    this.shakeTime += dt * CONFIG.shakeFrequency;

    const sway = this.idleSway * CONFIG.camera.idleSwayAmount;
    const sx = Math.sin(time * CONFIG.camera.idleSwaySpeed) * sway + this.mouse.x * 0.04 * this.idleSway;
    const sy = Math.cos(time * CONFIG.camera.idleSwaySpeed * 0.85) * sway * 0.6 + this.mouse.y * 0.02 * this.idleSway;

    if (this.shakeAmount > 0.001) {
      this._shake.set(
        (Math.sin(this.shakeTime * 2.1) + Math.sin(this.shakeTime * 5.3)) * this.shakeAmount,
        (Math.cos(this.shakeTime * 1.7) + Math.sin(this.shakeTime * 4.1)) * this.shakeAmount * 0.7,
        (Math.sin(this.shakeTime * 3.3)) * this.shakeAmount * 0.4,
      );
    } else {
      this._shake.set(0, 0, 0);
    }

    this.camera.position.set(
      this.position.x + sx + this._shake.x,
      this.position.y + sy + this._shake.y,
      this.position.z + this._shake.z,
    );
    this._look.copy(this.target).add(this._shake);
    this.camera.lookAt(this._look);
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
  }
}
