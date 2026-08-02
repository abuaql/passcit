import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Passcit — U.S. Citizenship Test Practice",
    short_name: "Passcit",
    description:
      "Study and prepare for the official USCIS naturalization civics test with flashcards, practice interviews, and progress tracking.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    // These match the app's existing light-mode tokens exactly (src/app/globals.css)
    // rather than introducing separate PWA-only branding values.
    background_color: "#faf9f6",
    theme_color: "#2d8142",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      {
        name: "Practice",
        short_name: "Practice",
        description: "Jump into a practice session",
        url: "/practice",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Flashcards",
        short_name: "Flashcards",
        description: "Review flashcards",
        url: "/flashcards",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Eligibility Calculator",
        short_name: "Eligibility",
        description: "Check your naturalization eligibility",
        url: "/eligibility",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
