import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/lib/config";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const config = await getSiteConfig();

  return {
    name: config.siteTitle,
    short_name: config.siteTitle,
    description: config.siteDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f0f",
    theme_color: "#0f0f0f",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
