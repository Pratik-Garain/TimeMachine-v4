/**
 * 1857 — The Revolt.
 *
 * ONE branch point. Each path (Delhi / Jhansi) runs its own 4-scene chain
 * to its own historical defeat — the two paths never reconverge.
 *
 *   s1 --choice--> s2-delhi -> s3-delhi -> s4-delhi -> s5-delhi (terminal)
 *               \-> s2-jhansi -> s3-jhansi -> s4-jhansi -> s5-jhansi (terminal)
 *
 * 9 videos total: s1 + 4 (Delhi) + 4 (Jhansi).
 *
 * `subtitles`: path to a WebVTT file with the scene's spoken dialogue.
 * `teaser`: a forward-looking line shown on the black cinematic transition
 *           card that plays just BEFORE this scene loads (not shown for
 *           the year's root scene, which is entered via the opening
 *           darkness+blink ritual instead).
 */
export const YEAR_DATA = {
  id: "1857",
  title: "1857 — The Revolt",
  start: "s1",

  scenes: {
    s1: {
      label: "MEERUT — THE REFUSAL",
      video: "./years/1857/videos/enhanced/s1.mp4",
      subtitles: "./years/1857/subs/s1.vtt",
      choice: {
        options: [
          { id: "delhi", text: "March to Delhi to join Bahadur Shah II.", next: "s2-delhi" },
          { id: "jhansi", text: "March south to join Rani Lakshmibai at Jhansi.", next: "s2-jhansi" },
        ],
      },
    },

    // ---- Delhi path ----
    "s2-delhi": {
      label: "THE MARCH TO DELHI",
      video: "./years/1857/videos/enhanced/s2-delhi.mp4",
      subtitles: "./years/1857/subs/s2-delhi.vtt",
      teaser: "You turn toward Delhi — to place your fate under a fading Mughal crown.",
      next: "s3-delhi",
    },
    "s3-delhi": {
      label: "BAHADUR SHAH DECLARES WAR",
      video: "./years/1857/videos/enhanced/s3-delhi.mp4",
      subtitles: "./years/1857/subs/s3-delhi.vtt",
      teaser: "At the Red Fort, an old emperor is about to decide the fate of an empire.",
      next: "s4-delhi",
    },
    "s4-delhi": {
      label: "THE SIEGE OF DELHI",
      video: "./years/1857/videos/enhanced/s4-delhi.mp4",
      subtitles: "./years/1857/subs/s4-delhi.vtt",
      teaser: "Months pass. Next, British guns arrive at Delhi's walls.",
      next: "s5-delhi",
    },
    "s5-delhi": {
      label: "DEFEAT AT DELHI",
      video: "./years/1857/videos/enhanced/s5-delhi.mp4",
      subtitles: "./years/1857/subs/s5-delhi.vtt",
      teaser: "The siege is ending. What comes next, the city will not survive.",
      aftermath:
        "Delhi falls after a brutal siege that summer. Bahadur Shah II is captured and exiled to " +
        "Rangoon, the last of the Mughal line to sit — however briefly — as a symbol of resistance. " +
        "The British response is swift and merciless. Yet the sight of princes, sepoys, and " +
        "commoners fighting under one banner at Delhi becomes the seed of an idea that outlives the " +
        "defeat: that an ancient, fractured land could still imagine itself as one.",
    },

    // ---- Jhansi path ----
    "s2-jhansi": {
      label: "THE MARCH TO JHANSI",
      video: "./years/1857/videos/enhanced/s2-jhansi.mp4",
      subtitles: "./years/1857/subs/s2-jhansi.vtt",
      teaser: "You turn south, toward Jhansi — to stand with a Rani who refuses to kneel.",
      next: "s3-jhansi",
    },
    "s3-jhansi": {
      label: "JHANSI DECLARES RESISTANCE",
      video: "./years/1857/videos/enhanced/s3-jhansi.mp4",
      subtitles: "./years/1857/subs/s3-jhansi.vtt",
      teaser: "Ahead lies Jhansi Fort — where a queen is about to make her stand.",
      next: "s4-jhansi",
    },
    "s4-jhansi": {
      label: "THE BATTLE OF JHANSI",
      video: "./years/1857/videos/enhanced/s4-jhansi.mp4",
      subtitles: "./years/1857/subs/s4-jhansi.vtt",
      teaser: "The Rani has sworn defiance. Next, the British answer with cannon fire.",
      next: "s5-jhansi",
    },
    "s5-jhansi": {
      label: "DEFEAT AT JHANSI",
      video: "./years/1857/videos/enhanced/s5-jhansi.mp4",
      subtitles: "./years/1857/subs/s5-jhansi.vtt",
      teaser: "The walls cannot hold forever. What follows is Jhansi's final battle.",
      aftermath:
        "Rani Lakshmibai falls in battle at Gwalior weeks after Jhansi itself is stormed, reportedly " +
        "still on horseback, sword in hand. The British annex her kingdom outright. But her defiance " +
        "becomes the single most retold story of 1857 — recited in songs and schoolbooks alike — " +
        "proof that resistance, even in defeat, can outlast the empire that crushed it.",
    },
  },
};
