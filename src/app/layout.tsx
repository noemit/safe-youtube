import type { CSSProperties, ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
      statusBarStyle: "black-translucent",
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
  themeColor: "#0f0f0f",
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
        <Script id="old-safari-polyfills" strategy="beforeInteractive">
          {`(function () {
  function defineAt(proto) {
    if (!proto || proto.at) return;
    Object.defineProperty(proto, 'at', {
      value: function (index) {
        var length = this.length >>> 0;
        var relativeIndex = Number(index) || 0;
        var normalizedIndex =
          relativeIndex < 0 ? length + relativeIndex : relativeIndex;

        return normalizedIndex < 0 || normalizedIndex >= length
          ? undefined
          : this[normalizedIndex];
      },
      writable: true,
      configurable: true
    });
  }

  defineAt(Array.prototype);
  defineAt(String.prototype);

  if (!Object.hasOwn) {
    Object.defineProperty(Object, 'hasOwn', {
      value: function (object, property) {
        return Object.prototype.hasOwnProperty.call(object, property);
      },
      writable: true,
      configurable: true
    });
  }
})();`}
        </Script>
        <PwaInit />
        {children}
      </body>
    </html>
  );
}
