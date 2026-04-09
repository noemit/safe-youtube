import Link from "next/link";
import type { SearchCategory } from "@/lib/types";

interface CategoryGridProps {
  categories: SearchCategory[];
}

function getBadge(label: string): string {
  const trimmed = label.trim();

  if (!trimmed) {
    return "GO";
  }

  const [firstWord, secondWord] = trimmed.split(/\s+/);

  if (secondWord) {
    return `${firstWord[0] ?? ""}${secondWord[0] ?? ""}`.toUpperCase();
  }

  return trimmed.slice(0, 2).toUpperCase();
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="category-grid">
      {categories.map((category) => (
        <Link
          key={`${category.label}-${category.query}`}
          className="category-card"
          href={`/search?q=${encodeURIComponent(category.query)}`}
        >
          <span className="category-card__badge">{getBadge(category.label)}</span>
          <strong>{category.label}</strong>
        </Link>
      ))}
    </div>
  );
}

