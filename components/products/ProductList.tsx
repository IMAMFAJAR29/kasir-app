"use client";

import { Product } from "@/types/products";
import ProductCard from "./ProductCard";

interface ProductListProps {
  products: Product[];
}

export default function ProductList({ products }: ProductListProps) {
  if (!products || products.length === 0) {
    return (
      <div className="text-center text-gray-500 py-10">
        Tidak ada produk yang tersedia.
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="sr-only">Produk</h2>

        <div
          className="
            grid gap-6
            grid-cols-2       /* mobile */
            sm:grid-cols-3    /* tablet */
            lg:grid-cols-4    /* desktop */
            xl:grid-cols-5    /* max 5 */
          "
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
