export interface Category {
  id: string | number;
  name: string;
  parentId: string | number | null;
  [key: string]: any; // kalau ada properti lain (misal slug, description, dsb)
}

// Fungsi rekursif membangun pohon kategori
export function buildTree(
  categories: Category[],
  parentId: string | number | null = null
): (Category & { children: Category[] })[] {
  return categories
    .filter((cat) => cat.parentId === parentId)
    .map((cat) => ({
      ...cat,
      children: buildTree(categories, cat.id),
    }));
}
