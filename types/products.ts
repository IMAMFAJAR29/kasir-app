// types/product.ts

// Tipe dasar produk dari database
export interface Product {
  id: number;
  name: string;
  sku: string;
  stock: number;
  price: number;
  imageUrl?: string;
  description?: string;
  categoryId?: number | null;
}

// Tipe produk dengan relasi ke kategori
export interface ProductWithCategory extends Product {
  category: {
    id: number; // <- pakai number agar cocok dengan Prisma & backend
    name: string;
  } | null; // bisa null kalau belum ada kategori
}

// Tipe kategori (untuk dropdown, tree, dll)
export interface Category {
  id: number;
  name: string;
  parentId?: number | null;
  children?: Category[];
}

// Tipe data untuk form tambah / edit produk
export interface FormProduct {
  id?: number;
  name: string;
  sku: string;
  stock: number;
  price: number;
  imageUrl: string;
  description: string;
  categoryId?: number | null;
}

// Tipe data untuk API (request body)
export interface ProductBody {
  id?: number | string;
  name: string;
  sku?: string;
  stock?: number | string;
  price: number | string;
  imageUrl?: string;
  description?: string;
  categoryId?: number | string | null;
}
