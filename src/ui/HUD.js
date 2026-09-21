import { TimeTravelState } from "../travel/TravelState.js";

export class HUD {
  constructor() {
    this.root = document.getElementById("hud");
    this.title = document.getElementById("hud-title");
    this.sequence = document.getElementById("sequence-text");
    this.reactor = document.getElementById("readout-reactor");
    this.lock = document.getElementById("readout-lock");
    this.status = document.getElementById("readout-status");
    this.coords = document.getElementById("readout-coords");
    this.scan = document.getElementById("hud-scan");
    this.boot = document.getElementById("boot");
    this.titleCard = document.getElementById("title-card");
    this.live = document.getElementById("aria-live");
  }

  async playBoot() {
    this.titleCard.classList.add("show");
    await wait(1600);
    this.titleCard.classList.add("hide");
    this.boot.classList.add("hide");
    this.root.classList.add("show");
    await wait(1400);
    this.boot.style.pointerEvents = "none";
  }

  setStatus(text) {
    this.status.textContent = text;
  }

  setLock(text) {
    this.lock.textContent = text;
  }

  setReactor(text) {
    this.reactor.textContent = text;
  }

  setCoords(text) {
    this.coords.textContent = text;
  }

  announce(text) {
    this.sequence.textContent = text;
    this.sequence.classList.toggle("show", Boolean(text));
    this.live.textContent = text;
  }

  setTravelMode(active) {
    this.root.classList.toggle("travel", active);
  }

  applyState(state, destination) {
    switch (state) {
      case TimeTravelState.IDLE:
        this.setLock("AWAITING INPUT");
        this.setStatus("HOLDING");
        this.setReactor("STABLE");
        this.setCoords("—");
        this.announce("");
        this.setTravelMode(false);
        break;
      case TimeTravelState.SELECTED:
        this.setLock("ENGAGED");
        this.setStatus("LOCKING");
        this.setCoords(destination?.subtitle || destination?.title || "—");
        this.announce("TEMPORAL DESTINATION LOCKED");
        this.setTravelMode(true);
        break;
      case TimeTravelState.ACCELERATING:
        this.setReactor("CHARGING");
        this.setStatus("ACCELERATING");
        this.announce("TEMPORAL JUMP INITIALIZED");
        break;
      case TimeTravelState.APPROACHING:
        this.setReactor("OVERDRIVE");
        this.setStatus("APPROACHING WORMHOLE");
        this.announce("");
        break;
      case TimeTravelState.ENTERING:
        this.setStatus("ENTERING WORMHOLE");
        this.announce("");
        break;
      case TimeTravelState.TUNNEL:
        this.setStatus("TEMPORAL TUNNEL");
        this.announce("");
        break;
      case TimeTravelState.FLASH:
        this.announce("");
        break;
      case TimeTravelState.BLACK:
        this.announce("ARRIVAL");
        break;
      default:
        break;
    }
  }
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
