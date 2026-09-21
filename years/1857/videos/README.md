Drop freshly rendered clips in this folder, named exactly as below:

  s1.mp4
  s2-delhi.mp4
  s3-delhi.mp4
  s4-delhi.mp4
  s5-delhi.mp4
  s2-jhansi.mp4
  s3-jhansi.mp4
  s4-jhansi.mp4
  s5-jhansi.mp4

Until a file exists, opening 1857.html will show an on-screen
"video not found yet" notice with a Continue-anyway button, so you
can test the branching flow before every clip is rendered.

--------------------------------------------------------------------
enhanced/  — the app currently plays videos from THIS subfolder
             (see data.js). These are the original 9 clips run
             through a CPU upscale + light denoise/sharpen pass
             (2x resolution, ~478p -> ~956p) to reduce blockiness.
             This is NOT true AI super-resolution — it doesn't
             invent detail the source never had, it just presents
             the existing pixels more cleanly. The real fix is
             re-rendering the source clips at higher native
             resolution (Google Flow now supports 4K export/
             upscale on paid tiers) — see the chat notes / README
             at the project root for details and alternatives.

             If you drop a newer, higher-resolution render directly
             into this videos/ folder (not enhanced/), either copy
             it into enhanced/ as well, or edit data.js's video
             paths back to "./years/1857/videos/<name>.mp4".
