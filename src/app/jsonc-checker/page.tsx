import type { Metadata } from "next";
import { HomeButton } from "@/components/HomeButton";
import { JsoncChecker } from "@/components/JsoncChecker";

export const metadata: Metadata = {
  title: "JSONC Checker",
  description:
    "Paste a Safe YouTube config here to check whether the JSONC syntax is valid before deployment.",
};

export default function JsoncCheckerPage() {
  return (
    <main className="shell shell--compact">
      <section className="page-banner card">
        <div>
          <span className="eyebrow">Parent Tool</span>
          <h1>JSONC Checker</h1>
          <p>
            Paste your <code>safe-youtube.config.jsonc</code> here to check the
            syntax before you deploy. If it is valid, this page can also give
            you a cleaned copy without comments.
          </p>
        </div>
        <div className="page-banner__actions">
          <HomeButton />
        </div>
      </section>

      <JsoncChecker />
    </main>
  );
}

