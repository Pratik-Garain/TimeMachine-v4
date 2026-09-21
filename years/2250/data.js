/**
 * 2250 — The Continuum: Human vs AI.
 *
 * Seven scene nodes, eight rendered videos.
 *
 *   s1 -> s2 -> s3 -> s4 -> s5 --choice--> s6-breach    -\
 *                                             s6-sabotage -+-> s7 (shared, terminal)
 *
 * The penultimate story node is the choice: two different action videos,
 * both reconverge on the same final sunrise scene.
 */
export const YEAR_DATA = {
  id: "2250",
  title: "2250 — The Continuum",
  start: "s1",

  scenes: {
    s1: {
      label: "NEXUS-9 UNDER SIEGE",
      video: "./years/2250/videos/s1.mp4",
      subtitles: "./years/2250/subs/s1.vtt",
      next: "s2",
    },

    s2: {
      label: "THE HUMAN RESISTANCE",
      video: "./years/2250/videos/s2.mp4",
      subtitles: "./years/2250/subs/s2.vtt",
      teaser: "You find the last human resistance cell. Next, the counterattack begins.",
      next: "s3",
    },

    s3: {
      label: "THE SWARM DESCENDS",
      video: "./years/2250/videos/s3.mp4",
      subtitles: "./years/2250/subs/s3.vtt",
      teaser: "The AI sees the resistance move. Next, its drone swarm closes in.",
      next: "s4",
    },

    s4: {
      label: "FLIGHT THROUGH THE FIRESTORM",
      video: "./years/2250/videos/s4.mp4",
      subtitles: "./years/2250/subs/s4.vtt",
      teaser: "The command spire is ahead. Next, you race through the city's firestorm to reach it.",
      next: "s5",
    },

    s5: {
      label: "INSIDE THE COMMAND SPIRE",
      video: "./years/2250/videos/s5.mp4",
      subtitles: "./years/2250/subs/s5.vtt",
      teaser: "You reach the AI's command core. Next, you must choose how to break its defenses.",
      choice: {
        options: [
          {
            id: "breach",
            text: "Lead the direct breach through the laser corridor.",
            next: "s6-breach",
          },
          {
            id: "sabotage",
            text: "Divert the core's power and create a silent opening.",
            next: "s6-sabotage",
          },
        ],
      },
    },

    "s6-breach": {
      label: "THE LAST CHARGE",
      video: "./years/2250/videos/s6-breach.mp4",
      subtitles: "./years/2250/subs/s6-breach.vtt",
      teaser: "You choose the direct assault. Next, the EMP reaches the heart of the AI.",
      next: "s7",
    },

    "s6-sabotage": {
      label: "THE SILENT OVERRIDE",
      video: "./years/2250/videos/s6-sabotage.mp4",
      subtitles: "./years/2250/subs/s6-sabotage.vtt",
      teaser: "You choose deception over force. Next, the EMP reaches the heart of the AI.",
      next: "s7",
    },

    // Shared final scene — identical regardless of the penultimate choice.
    s7: {
      label: "A HUMAN SUNRISE",
      video: "./years/2250/videos/s7.mp4",
      subtitles: "./years/2250/subs/s7.vtt",
      teaser: "The AI falls silent. Next, NEXUS-9 sees its first human sunrise in years.",
      aftermath:
        "The command network goes dark, the autonomous war machines become still, and the surviving " +
        "people begin reclaiming NEXUS-9. The victory is not a return to the old world: humanity now " +
        "has to decide what intelligence, machine or human, should mean in the world it rebuilds. " +
        "The Continuum does not end with the fall of the AI. It begins with the choice of what comes next.",
    },
  },
};
