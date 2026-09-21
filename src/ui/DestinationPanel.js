import { TIME_DESTINATIONS } from "../config/destinations.js";

/**
 * Builds destination controls from TIME_DESTINATIONS.
 * Buttons are real HTML <button> elements for keyboard access.
 */
export class DestinationPanel {
  constructor({ onSelect }) {
    this.el = document.getElementById("destination-panel");
    this.onSelect = onSelect;
    this.buttons = [];
    this.locked = false;
    this._render();
  }

  _render() {
    this.el.innerHTML = "";
    this.buttons = TIME_DESTINATIONS.map((dest, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dest-btn";
      btn.dataset.id = dest.id;
      btn.setAttribute("aria-label", `${dest.title}. ${dest.subtitle}`);
      btn.innerHTML = `
        <span class="dest-index">${String(index + 1).padStart(2, "0")} / NAV</span>
        <span class="dest-title">${dest.title}</span>
        <span class="dest-sub">${dest.subtitle}</span>
        <span class="dest-scan" aria-hidden="true"></span>
      `;
      btn.addEventListener("click", () => {
        if (this.locked) return;
        this.onSelect(dest, btn);
      });
      this.el.appendChild(btn);
      return btn;
    });
  }

  lock(selectedId) {
    this.locked = true;
    this.buttons.forEach((btn) => {
      btn.disabled = true;
      if (btn.dataset.id === selectedId) {
        btn.classList.add("locked");
        btn.classList.remove("faded");
      } else {
        btn.classList.add("faded");
      }
    });
  }

  unlock() {
    this.locked = false;
    this.buttons.forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove("locked", "faded");
    });
  }
}
