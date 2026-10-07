export interface Category {
  id: string | number;
  name: string;
  parentId?: string | number | null;
  [key: string]: any; // kalau ada properti lain (misal slug, description, dsb)
}

function normalizeId(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

// Fungsi rekursif membangun pohon kategori
export function buildTree(
  categories: Category[] = [],
  parentId: string | number | null = null
): (Category & { children: Category[] })[] {
  const normalizedParentId = normalizeId(parentId);

  return categories
    .filter((cat) => normalizeId(cat.parentId) === normalizedParentId)
    .map((cat) => ({
      ...cat,
      children: buildTree(categories, cat.id),
    }));
}
