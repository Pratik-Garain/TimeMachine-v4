import { Quality, pickInitialQuality } from "./config/config.js";
import { SceneManager } from "./scene/SceneManager.js";
import { HUD } from "./ui/HUD.js";
import { DestinationPanel } from "./ui/DestinationPanel.js";
import { TimeTravelController } from "./travel/TimeTravelController.js";
import { AudioEngine } from "./audio/AudioEngine.js";

function showFallback(reason) {
  const el = document.getElementById("webgl-fallback");
  el.classList.add("active");
  const why = el.querySelector(".fallback-reason");
  if (why) why.textContent = reason || "";
  document.getElementById("app").classList.add("fallback");
}

function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function resolveQuality() {
  const q = new URLSearchParams(location.search).get("q");
  if (q && Object.values(Quality).includes(q)) return q;
  return pickInitialQuality();
}

async function main() {
  const canvas = document.getElementById("webgl-canvas");
  const hud = new HUD();
  const audio = new AudioEngine();
  let travel = null;

  const audioBtn = document.getElementById("audio-toggle");
  audioBtn.addEventListener("click", async () => {
    await audio.unlock();
    const muted = audioBtn.classList.toggle("muted");
    audio.setEnabled(!muted);
  });

  const panel = new DestinationPanel({
    onSelect: (dest) => {
      audio.unlock();
      if (travel) travel.select(dest);
      else window.location.href = dest.url;
    },
  });

  if (!supportsWebGL()) {
    showFallback("This computer could not start WebGL.");
    await hud.playBoot();
    return;
  }

  const quality = resolveQuality();
  const qualitySelect = document.getElementById("quality-select");
  qualitySelect.value = quality;

  let scene;
  try {
    scene = new SceneManager(canvas, quality);
  } catch (err) {
    console.error(err);
    showFallback("The 3D engine failed to start.");
    await hud.playBoot();
    return;
  }

  travel = new TimeTravelController({ scene, hud, panel, audio });

  scene.onUpdate = (dt) => {
    travel.update(dt);
  };

  qualitySelect.addEventListener("change", () => {
    const params = new URLSearchParams(location.search);
    params.set("q", qualitySelect.value);
    location.search = params.toString();
  });

  scene.start();
  await hud.playBoot();

  document.body.addEventListener("pointerdown", () => audio.unlock(), { once: true });

  setTimeout(() => {
    if (scene.getAverageFps() < 32 && quality === Quality.HIGH) {
      qualitySelect.title = "Frame rate is low — try MEDIUM or LOW";
    }
  }, 4000);
}

main().catch((err) => {
  console.error(err);
  showFallback("The time machine could not start.");
});
