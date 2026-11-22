import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FretMaster Studio",
    short_name: "FretMaster",
    description:
      "Learn electric guitar with 39 interactive lessons, real-time pitch & chord feedback, fretboard harmony guides, and cloud progress sync.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f6f8",
    theme_color: "#e85d3f",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
