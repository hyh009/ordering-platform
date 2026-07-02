// Soft, readable badge palettes. Each category is mapped to one palette by a
// stable hash of its id, so a given category keeps the same color across the
// menu without needing a persisted color field.
const CATEGORY_COLOR_CLASSES = [
  'bg-amber-100 text-amber-800',
  'bg-blue-100 text-blue-800',
  'bg-emerald-100 text-emerald-800',
  'bg-violet-100 text-violet-800',
  'bg-rose-100 text-rose-800',
  'bg-cyan-100 text-cyan-800',
  'bg-orange-100 text-orange-800',
  'bg-fuchsia-100 text-fuchsia-800',
  'bg-lime-100 text-lime-800',
  'bg-sky-100 text-sky-800',
] as const;

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Returns the Tailwind background/text classes for a category badge, chosen
 * deterministically from a fixed palette based on the category id.
 */
export function getCategoryColorClasses(categoryId: string): string {
  const index = hashId(categoryId) % CATEGORY_COLOR_CLASSES.length;
  return CATEGORY_COLOR_CLASSES[index]!;
}
