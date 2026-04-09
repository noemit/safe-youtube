import Link from "next/link";
import type { SearchCategory } from "@/lib/types";

interface CategoryGridProps {
  categories: SearchCategory[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="category-grid">
      {categories.map((category) => (
        <Link
          key={`${category.label}-${category.searchFor}`}
          className="category-card"
          href={`/search?q=${encodeURIComponent(category.searchFor)}`}
        >          <strong>{category.label}</strong>
        </Link>
      ))}
    </div>
  );
}
