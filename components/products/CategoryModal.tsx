"use client";

import { X, Layers } from "lucide-react";
import { Category } from "@/types/products";

interface CategoryModalProps {
  show: boolean;
  onClose: () => void;
  categories: Category[];
  onSelect: (categoryId: number) => void;
  categorySearch: string;
  setCategorySearch: (val: string) => void;
  flattenCategories: (cats: Category[]) => any[];
}

export default function CategoryModal({
  show,
  onClose,
  categories,
  onSelect,
  categorySearch,
  setCategorySearch,
  flattenCategories,
}: CategoryModalProps) {
  if (!show) return null;

  const flatCats = flattenCategories(categories).filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-[400px] relative">
        {/* Close button */}
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-green-600" />
          Pilih Kategori
        </h2>

        {/* Search box */}
        <input
          type="text"
          placeholder="Cari kategori..."
          value={categorySearch}
          onChange={(e) => setCategorySearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-green-600"
        />

        {/* List kategori */}
        <div className="space-y-1 max-h-[300px] overflow-y-auto border-t border-b border-gray-200 py-2">
          {flatCats.map((cat) => (
            <div
              key={cat.id}
              className="cursor-pointer py-2 px-3 hover:bg-gray-50 rounded"
              onClick={() => {
                onSelect(cat.id);
                onClose();
              }}
            >
              <span style={{ paddingLeft: `${cat.depth * 16}px` }}>
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
