# TIME MACHINE — GitHub Pages hosting guide

See `MAP.md` for the full folder map and exactly how the scene-graph flow
works. This file only covers hosting.

## Hosting on GitHub Pages

**File naming:**

- All lowercase, hyphens instead of spaces or underscores
  (`s3-hiroshima.mp4`, not `Scene 3 Hiroshima.mp4`).
- No spaces in any path segment — spaces in URLs get encoded to `%20`
  and are a common source of broken links on Pages.
- Year loader pages live at the **repo root**, named exactly `1857.html`,
  `1941.html`, `2250.html`, since that's what `destinations.js` links to.
- `index.html` at the root is required — it's what GitHub Pages serves at
  your site's base URL.

**Two files to enable it:**

- `.nojekyll` (empty file, repo root) — stops GitHub's default Jekyll
  build step from running.
- `README.md` (this file) — not required for Pages to work, but GitHub
  displays it on the repo's main page.

**Turning it on:** push this repo to GitHub, then in the repo go to
**Settings → Pages → Build and deployment → Source: Deploy from a
branch**, pick `main` (or whichever branch) and `/ (root)`, save. Your
site will be live at `https://<username>.github.io/<repo-name>/`.

**Video file size — worth knowing before you push:**

- GitHub hard-blocks any single file over 100 MB.
- GitHub's own guidance recommends keeping files under ~50 MB and repos
  under ~1 GB total; Pages sites are also soft-capped around 1 GB with a
  fair-use bandwidth limit.
- With 3 years now (9 + 5 + 4 = 18 clips total), you have more headroom
  than the earlier 5-year plan. If you get close to these limits anyway,
  compress the MP4s (`ffmpeg -crf 28`), use **Git LFS** for the `videos/`
  folders, or host the videos on an external CDN/bucket and point
  `video:` in each `data.js` at that full `https://` URL instead of a
  local path — the engine doesn't care which.


### 360° initial orientation
The panorama viewer starts each scene facing the visual centre of the equirectangular video, opposite the horizontal wrap/overlap seam. The initial longitude is set to -90° for the Three.js sphere mapping, and the orientation resets to that centre whenever a new scene video loads.
