# TIME MACHINE — year pages: folder map

## Where everything lives

```
project root/
├── index.html                 ← cockpit homepage
├── vr-viewer.html              ← standalone tool: drop in any raw clip to eyeball it
│                                  before wiring it into a year. NOT used by the
│                                  year pages themselves.
├── 1857.html / 1941.html / 2250.html   ← thin loader pages, one per year
│
├── shared/
│   ├── year-engine.js          ← generic scene-graph runner (see below)
│   └── year.css                ← all visual styling for year pages
│
└── years/
    ├── 1857/
    │   ├── data.js
    │   └── videos/             ← 9 clips: s1, s2/3/4/5-delhi, s2/3/4/5-jhansi
    ├── 1941/
    │   ├── data.js
    │   └── videos/             ← 5 clips: s1, s2, s3-hiroshima, s3-nagasaki, s4
    └── 2250/
        ├── data.js
        └── videos/             ← 4 clips: s1, s2-open, s2-guarded, s3
```

`src/config/destinations.js` lists exactly these 3 years and points each
button at `./1857.html`, `./1941.html`, `./2250.html`.

## The scene-graph model (replaces the old fixed scene1/scene2/endings shape)

Each year's `data.js` exports `{ id, title, start, scenes }`. `scenes` is a
map of scene-id → node. A node is one of:

- **linear** — `{ video, label?, next: "<sceneId>" }` — plays, then
  auto-continues to `next` with no MCQ.
- **choice** — `{ video, label?, choice: { options: [{ id, text, next }, { id, text, next }] } }`
  — plays, then shows a 2-option MCQ; the picked option's `next` decides
  where the story goes.
- **terminal** — `{ video, label?, aftermath: "<text>" }` — has neither
  `next` nor `choice`. Once its video ends, the aftermath paragraph is
  shown with a "Return to Time Machine" button.

This graph shape supports both patterns the story needs:

- **Two paths that never reconverge** (1857): the Delhi and Jhansi paths
  each run their own 4-scene chain to their own terminal "defeat" scene.
- **A branch that reconverges** (1941, 2250): two choice-scenes both list
  the *same* scene id as their `next`, so both paths play their own
  divergent clip(s) and then land on one shared final scene, video and
  aftermath included.

`shared/year-engine.js` just walks the graph from `start` until it hits a
node with no `next`/`choice` — it has no year-specific logic at all, so
adding a 4th year, or reshaping a year's branches, never touches this file.

## The on-page flow, exactly as built

1. Page loads → **2s of darkness**, then **3 blinks** (once, only before the
   very first scene of the whole run).
2. That scene's video plays automatically, unmuted, once, full screen. Only
   look-around (drag / gyro) and the "Return to Time Machine" button work.
3. Video ends → pauses on the last frame.
   - If the scene has a **choice**: 2 MCQ options slide in; picking one
     leads to the next scene.
   - If the scene has a plain **next**: a single quick blink (a fast
     cinematic cut, not the full 3-blink opening) plays, then the next
     scene's video starts automatically — no MCQ, no waiting.
4. This repeats until a **terminal** scene's video ends, at which point its
   `aftermath` text is shown with the "Return to Time Machine" button.

**Sound-autoplay note:** if a browser blocks autoplay-with-sound (can
happen right after a click on the *previous* page), a one-time "Tap to Step
Through Time" prompt appears before that video — not a manual playback
control, just a one-time consent tap some browsers require. It won't
reappear for later scenes in the same page load.

## Testing before your videos exist

Serve the folder with a real HTTP server (ES module imports don't work over
`file://`):

```
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Any missing video file shows an on-screen notice with a "Continue anyway"
button, so you can validate the whole branching flow before a single clip
is rendered.

## Notes for when video prompts get written (not done yet)

- **No on-screen text in the generated videos** — no captions, subtitles,
  or burned-in titles. The app's own `label` field handles on-screen
  chapter titles; Flow's clips should be pure scene + dialogue.
- **Target 10-second clips** (updated from an earlier 8-second target).
- Dialogue should be short enough to land naturally inside that window —
  1–2 short exchanges per clip, not a full scene's worth of lines.

## Adding or reshaping a year

1. Add/edit `years/<year>/data.js` with a `start` id and a `scenes` map
   using the three node shapes above.
2. Add/edit `years/<year>/videos/` with clips named to match the `video`
   paths you used in `data.js`.
3. Add/edit `<year>.html` (copy an existing one, change the two `<year>`
   references) and add an entry to `src/config/destinations.js`.

`shared/year-engine.js` and `shared/year.css` never need to change for
this — only touch them if you want to change the shared flow/theme
(blink timing, darkness duration, color palette) for every year at once.
