import type { CSSProperties, ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { PwaInit } from "@/components/PwaInit";
import { getSiteConfig } from "@/lib/config";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();

  return {
    title: {
      default: config.siteTitle,
      template: `%s | ${config.siteTitle}`,
    },
    description: config.siteDescription,
    applicationName: config.siteTitle,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: config.siteTitle,
    },
    icons: {
      apple: "/apple-icon",
      icon: "/icon",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#d76546",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const config = await getSiteConfig();
  const themeStyle = {
    "--accent": config.theme.accentColor,
    "--accent-tint": config.theme.accentTint,
  } as CSSProperties;

  return (
    <html lang="en">
      <body style={themeStyle}>
        <PwaInit />
        {children}
      </body>
    </html>
  );
}
