/**
 * TIME MACHINE — shared year-page engine (scene-graph version)
 *
 * A year is a graph of scenes, not a fixed scene1/scene2/endings shape.
 * Each scene node is one of:
 *   - linear:  { video, label?, subtitles?, teaser?, next: "<sceneId>" }
 *   - choice:  { video, label?, subtitles?, choice: { options: [{ id, text, next }, { id, text, next }] } }
 *   - terminal:{ video, label?, subtitles?, teaser?, aftermath: "<text>" }   // no `next`, no `choice`
 *
 * This lets two branches either stay separate all the way to their own
 * terminal scene (e.g. 1857 — two different historical defeats), or
 * reconverge onto a shared scene id (e.g. 1941 / 2250 — two choices,
 * one merged final scene).
 *
 * `subtitles` (optional): a WebVTT (.vtt) file with that scene's spoken
 * dialogue, rendered as fixed-screen-space captions over the 360 sphere
 * (never burned into the video itself, so it stays readable no matter
 * which way the viewer is looking).
 *
 * `teaser` (optional): a short forward-looking line shown, white-on-black,
 * on the cinematic transition card that plays just BEFORE this scene
 * loads. Not shown for a year's root scene — that one is still entered
 * through the darkness+blink ritual only.
 *
 * The ONLY control ever shown during video playback is "Return to Time
 * Machine". No play/pause, no stereo/format toggle, no recenter, no
 * scrubber.
 */
import * as THREE from "three";

const DARKNESS_MS = 2000;
const OPEN_BLINK_COUNT = 3;
const BLINK_CLOSE_MS = 220;
const BLINK_HOLD_MS = 90;
const BLINK_OPEN_MS = 220;

const TRANSITION_FADE_MS = 500;
const TRANSITION_TEXT_HOLD_MS = 1900;
const TRANSITION_TEXT_FADE_MS = 450;

export function runYear(yearData, opts = {}) {
  const homeUrl = opts.homeUrl || "./index.html";

  const root = document.createElement("div");
  root.className = "yy-root";
  root.innerHTML = `
    <div class="yy-stage" id="yyStage"></div>
    <div class="yy-vignette"></div>
    <div class="yy-grain"></div>
    <div class="yy-darkness" id="yyDarkness"></div>
    <div class="yy-eyelid yy-eyelid-top" id="yyLidTop"></div>
    <div class="yy-eyelid yy-eyelid-bottom" id="yyLidBottom"></div>
    <div class="yy-scene-label" id="yySceneLabel"></div>
    <button class="yy-return" id="yyReturn" type="button">&larr; Return to Time Machine</button>

    <div class="yy-subtitles" id="yySubtitles">
      <div class="yy-subtitles-inner" id="yySubtitlesInner">
        <span class="yy-subtitles-speaker" id="yySubSpeaker"></span>
        <span id="yySubText"></span>
      </div>
    </div>

    <div class="yy-transition" id="yyTransition">
      <div>
        <span class="yy-transition-rule"></span>
        <p class="yy-transition-text" id="yyTransitionText"></p>
      </div>
    </div>

    <div class="yy-tapgate" id="yyTapgate">
      <div class="yy-tapgate-card">
        <p>${escapeHtml(yearData.title || yearData.id)}</p>
        <button id="yyTapBtn" type="button">Tap to Step Through Time</button>
      </div>
    </div>

    <div class="yy-mcq" id="yyMcq"></div>

    <div class="yy-missing" id="yyMissing">
      <div class="yy-missing-card">
        <p id="yyMissingText"></p>
        <button id="yyMissingContinue" type="button">Continue anyway</button>
      </div>
    </div>

    <div class="yy-aftermath" id="yyAftermath">
      <div class="yy-aftermath-card">
        <h2>${escapeHtml(yearData.title || yearData.id)} — Aftermath</h2>
        <p id="yyAftermathText"></p>
        <button id="yyAftermathReturn" type="button">Return to Time Machine</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const $ = (id) => root.querySelector("#" + id);
  const stageEl = $("yyStage");
  const darknessEl = $("yyDarkness");
  const lidTop = $("yyLidTop");
  const lidBottom = $("yyLidBottom");
  const sceneLabel = $("yySceneLabel");
  const returnBtn = $("yyReturn");
  const tapgate = $("yyTapgate");
  const tapBtn = $("yyTapBtn");
  const mcqEl = $("yyMcq");
  const missingEl = $("yyMissing");
  const missingText = $("yyMissingText");
  const missingContinue = $("yyMissingContinue");
  const aftermathEl = $("yyAftermath");
  const aftermathText = $("yyAftermathText");
  const aftermathReturn = $("yyAftermathReturn");
  const transitionEl = $("yyTransition");
  const transitionText = $("yyTransitionText");
  const subtitlesInner = $("yySubtitlesInner");
  const subSpeaker = $("yySubSpeaker");
  const subText = $("yySubText");

  function goHome() {
    window.location.href = homeUrl;
  }
  returnBtn.addEventListener("click", goHome);
  aftermathReturn.addEventListener("click", goHome);

  const player = createPanoramaPlayer(stageEl);

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function checkVideoExists(url) {
    return fetch(url, { method: "HEAD" })
      .then((r) => r.ok)
      .catch(() => false);
  }

  function showTapGate() {
    return new Promise((res) => {
      tapgate.classList.add("show");
      tapBtn.onclick = () => {
        tapgate.classList.remove("show");
        res();
      };
    });
  }

  function showMissing(url) {
    return new Promise((res) => {
      missingText.textContent = `Video not found yet: ${url}`;
      missingEl.classList.add("show");
      missingContinue.onclick = () => {
        missingEl.classList.remove("show");
        res();
      };
    });
  }

  function showMcq(options) {
    return new Promise((res) => {
      mcqEl.innerHTML = options
        .map((o, i) => `<button class="yy-mcq-btn" data-i="${i}">${escapeHtml(o.text)}</button>`)
        .join("");
      mcqEl.classList.add("show");
      Array.from(mcqEl.querySelectorAll(".yy-mcq-btn")).forEach((btn) => {
        btn.addEventListener(
          "click",
          () => {
            mcqEl.classList.remove("show");
            mcqEl.innerHTML = "";
            res(options[Number(btn.dataset.i)]);
          },
          { once: true },
        );
      });
    });
  }

  /* ---------------- subtitles (WebVTT, rendered in fixed screen space) ---------------- */

  let activeCues = [];

  async function loadSubtitles(url) {
    if (!url) return [];
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      return parseVTT(await res.text());
    } catch {
      return [];
    }
  }

  function parseVTT(raw) {
    const lines = raw.replace(/\r/g, "").split("\n");
    const cues = [];
    let i = 0;
    while (i < lines.length) {
      if (lines[i].includes("-->")) {
        const [startStr, endStr] = lines[i].split("-->").map((s) => s.trim().split(" ")[0]);
        const start = parseVttTime(startStr);
        const end = parseVttTime(endStr);
        i++;
        const textLines = [];
        while (i < lines.length && lines[i].trim() !== "") {
          textLines.push(lines[i].trim());
          i++;
        }
        cues.push({ start, end, text: textLines.join(" ") });
      }
      i++;
    }
    return cues;
  }

  function parseVttTime(s) {
    const m = s.match(/(\d+):(\d+):(\d+)\.(\d+)/);
    if (!m) return 0;
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000;
  }

  function onSubtitleTime(t) {
    const cue = activeCues.find((c) => t >= c.start && t <= c.end);
    if (!cue) {
      subtitlesInner.classList.remove("show");
      return;
    }
    const sepIdx = cue.text.indexOf(": ");
    if (sepIdx > -1 && sepIdx < 26) {
      subSpeaker.textContent = cue.text.slice(0, sepIdx);
      subSpeaker.style.display = "block";
      subText.textContent = cue.text.slice(sepIdx + 2);
    } else {
      subSpeaker.style.display = "none";
      subText.textContent = cue.text;
    }
    subtitlesInner.classList.add("show");
  }

  function clearSubtitles() {
    activeCues = [];
    subtitlesInner.classList.remove("show");
  }

  /* ---------------- video step ---------------- */

  async function playVideoStep(url, subtitleUrl, onStarted) {
    const [exists, cues] = await Promise.all([checkVideoExists(url), loadSubtitles(subtitleUrl)]);
    if (!exists) await showMissing(url);

    await player.load(url);
    activeCues = cues;
    player.onTimeUpdate(onSubtitleTime);

    const ended = new Promise((res) => player.onEnded(res));
    const playedWithSound = await player.play({ muted: false });
    if (onStarted) onStarted();
    if (!playedWithSound) {
      await showTapGate();
      player.unmute();
    }
    await ended;
    player.pause();
    clearSubtitles();
  }

  /* ---------------- transitions ---------------- */

  function blink(count, holdMs = BLINK_HOLD_MS) {
    return new Promise(async (res) => {
      for (let i = 0; i < count; i++) {
        lidTop.classList.add("closed");
        lidBottom.classList.add("closed");
        await wait(BLINK_CLOSE_MS + holdMs);
        lidTop.classList.remove("closed");
        lidBottom.classList.remove("closed");
        await wait(BLINK_OPEN_MS);
      }
      res();
    });
  }

  async function openingTransition() {
    darknessEl.classList.add("show");
    await wait(DARKNESS_MS);
    await blink(OPEN_BLINK_COUNT);
    darknessEl.classList.remove("show");
  }

  // Cinematic scene-to-scene cut: fade to black, hold a short forward-looking
  // line (white text, black screen) if the upcoming scene has a `teaser`,
  // then leave the screen black — the caller reveals it once the next
  // video actually starts playing, via revealFromBlack().
  async function cinematicTransition(teaser) {
    transitionEl.classList.add("show");
    await wait(TRANSITION_FADE_MS);
    if (teaser) {
      transitionText.textContent = teaser;
      await wait(50);
      transitionText.classList.add("show");
      await wait(TRANSITION_TEXT_HOLD_MS);
      transitionText.classList.remove("show");
      await wait(TRANSITION_TEXT_FADE_MS);
    } else {
      await wait(300);
    }
  }

  function revealFromBlack() {
    transitionEl.classList.remove("show");
  }

  async function sequence() {
    let currentId = yearData.start;
    let lastNode = null;
    let first = true;

    while (currentId) {
      const node = yearData.scenes[currentId];
      if (!node) {
        console.error(`TIME MACHINE: unknown scene id "${currentId}"`);
        break;
      }

      if (first) {
        await openingTransition();
        first = false;

        sceneLabel.textContent = node.label || "";
        sceneLabel.style.display = node.label ? "block" : "none";
        await playVideoStep(node.video, node.subtitles);
      } else {
        await cinematicTransition(node.teaser);

        sceneLabel.textContent = node.label || "";
        sceneLabel.style.display = node.label ? "block" : "none";
        await playVideoStep(node.video, node.subtitles, revealFromBlack);
      }

      lastNode = node;

      if (node.choice) {
        const picked = await showMcq(node.choice.options);
        currentId = picked.next;
      } else if (node.next) {
        currentId = node.next;
      } else {
        currentId = null; // terminal
      }
    }

    sceneLabel.style.display = "none";
    if (lastNode && lastNode.aftermath) {
      aftermathText.textContent = lastNode.aftermath;
      aftermathEl.classList.add("show");
    } else {
      // no aftermath text defined — still give the user a way back
      aftermathText.textContent = "";
      aftermathEl.classList.add("show");
    }
  }

  sequence();
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

/* ---------------- minimal equirectangular-video sphere viewer ----------------
 * Look-around only (pointer drag). No dock, no play/pause, no stereo/format,
 * no recenter, no VR button — by design, per the spec for the year flow.
 */
function createPanoramaPlayer(mountEl) {
  let W = mountEl.clientWidth || window.innerWidth;
  let H = mountEl.clientHeight || window.innerHeight;
  // Equirectangular texture center is opposite the horizontal wrap/seam.
  // Start the viewer facing that center rather than the overlapping edge.
  // Three.js SphereGeometry maps the texture midpoint to -Z, so lon=-90°
  // looks directly at the visual centre of the equirectangular frame.
  let lon = 180,
    lat = 0;
  let dragging = false,
    startX = 0,
    startY = 0,
    lonStart = 0,
    latStart = 0;
  let texture = null;
  let sphere = null;
  let endedCb = null;
  let timeUpdateCb = null;

  const video = document.createElement("video");
  video.loop = false;
  video.playsInline = true;
  video.setAttribute("webkit-playsinline", "");
  video.crossOrigin = "anonymous";
  video.style.display = "none";
  document.body.appendChild(video);
  video.addEventListener("ended", () => {
    if (endedCb) endedCb();
  });
  video.addEventListener("timeupdate", () => {
    if (timeUpdateCb) timeUpdateCb(video.currentTime);
  });

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H);
  mountEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(80, W / H, 0.1, 1000);

  window.addEventListener("resize", () => {
    W = mountEl.clientWidth || window.innerWidth;
    H = mountEl.clientHeight || window.innerHeight;
    renderer.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  });

  renderer.domElement.addEventListener("pointerdown", (e) => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    lonStart = lon;
    latStart = lat;
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    lon = lonStart - (e.clientX - startX) * 0.18;
    lat = Math.max(-85, Math.min(85, latStart + (e.clientY - startY) * 0.18));
  });
  window.addEventListener("pointerup", () => (dragging = false));

  function animate() {
    requestAnimationFrame(animate);
    if (texture) texture.needsUpdate = true;
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon);
    camera.position.set(0, 0, 0);
    camera.lookAt(
      500 * Math.sin(phi) * Math.cos(theta),
      500 * Math.cos(phi),
      500 * Math.sin(phi) * Math.sin(theta),
    );
    renderer.render(scene, camera);
  }
  animate();

  function buildSphereIfNeeded() {
    if (sphere) return;
    const geo = new THREE.SphereGeometry(500, 60, 40);
    geo.scale(-1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ map: texture });
    sphere = new THREE.Mesh(geo, mat);
    scene.add(sphere);
  }

  return {
    load(url) {
      return new Promise((resolve, reject) => {
        video.pause();
        video.removeAttribute("src");
        video.src = url;
        video.currentTime = 0;
        // Every scene starts facing the centre of the panorama, opposite
        // the equirectangular overlap/seam at the horizontal wrap edge.
        lon = 180;
        lat = 0;
        const onLoaded = () => {
          video.removeEventListener("loadeddata", onLoaded);
          if (!texture) texture = new THREE.VideoTexture(video);
          buildSphereIfNeeded();
          sphere.material.map = texture;
          resolve();
        };
        video.addEventListener("loadeddata", onLoaded, { once: true });
        video.addEventListener("error", () => reject(new Error("video load error")), { once: true });
        video.load();
      });
    },
    play({ muted = false } = {}) {
      video.muted = muted;
      return video
        .play()
        .then(() => !video.muted)
        .catch(() => {
          video.muted = true;
          return video
            .play()
            .then(() => false)
            .catch(() => false);
        });
    },
    unmute() {
      video.muted = false;
    },
    pause() {
      video.pause();
    },
    onEnded(cb) {
      endedCb = cb;
    },
    onTimeUpdate(cb) {
      timeUpdateCb = cb;
    },
  };
}
