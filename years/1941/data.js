/**
 * 1941 — The World at War.
 *
 * Linear intro, ONE branch near the end (which bombing you witness), both
 * paths merge back into a single shared final scene.
 *
 *   s1 -> s2 --choice--> s3-hiroshima -\
 *                     \-> s3-nagasaki  -+-> s4 (shared, terminal)
 *
 * 5 videos total: s1, s2, s3-hiroshima, s3-nagasaki, s4.
 *
 * `subtitles`: path to a WebVTT file with the scene's spoken dialogue.
 * `teaser`: a forward-looking line shown on the black cinematic transition
 *           card that plays just BEFORE this scene loads (not shown for
 *           the year's root scene s1).
 */
export const YEAR_DATA = {
  id: "1941",
  title: "1941 — The World at War",
  start: "s1",

  scenes: {
    s1: {
      label: "DAWN AT PEARL HARBOR",
      video: "./years/1941/videos/s1.mp4",
      subtitles: "./years/1941/subs/s1.vtt",
      next: "s2",
    },
    s2: {
      label: "THE WORLD AT WAR",
      video: "./years/1941/videos/s2.mp4",
      subtitles: "./years/1941/subs/s2.vtt",
      teaser: "Years pass in an instant. Next, you stand in the war room, watching the world burn.",
      choice: {
        options: [
          { id: "hiroshima", text: "Witness the bombing of Hiroshima.", next: "s3-hiroshima" },
          { id: "nagasaki", text: "Witness the bombing of Nagasaki.", next: "s3-nagasaki" },
        ],
      },
    },

    "s3-hiroshima": {
      label: "HIROSHIMA — AUGUST 6, 1945",
      video: "./years/1941/videos/s3-hiroshima.mp4",
      subtitles: "./years/1941/subs/s3-hiroshima.vtt",
      teaser: "The order has been given. Next, the sky over Hiroshima is about to change forever.",
      next: "s4",
    },
    "s3-nagasaki": {
      label: "NAGASAKI — AUGUST 9, 1945",
      video: "./years/1941/videos/s3-nagasaki.mp4",
      subtitles: "./years/1941/subs/s3-nagasaki.vtt",
      teaser: "Three days later, it happens again. Next, Nagasaki's sky is about to break open.",
      next: "s4",
    },

    // shared merged ending — same video and aftermath regardless of which
    // bombing you chose to witness
    s4: {
      label: "OUT OF THE ASHES",
      video: "./years/1941/videos/s4.mp4",
      subtitles: "./years/1941/subs/s4.vtt",
      teaser: "Out of the fire, the war finally ends — and your journey home begins.",
      aftermath:
        "Within days of the second bombing, Japan announces its surrender, ending the deadliest war " +
        "in human history. The atomic age begins in the same instant it ends a war — a genie that no " +
        "future generation, including the one you just returned to, will ever fully put back in the " +
        "bottle.",
    },
  },
};
