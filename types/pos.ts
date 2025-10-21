// =======================
// POS Types
// =======================

// Import tipe Product supaya bisa reuse dari types/products
import { Product } from "./products";

// Item yang ada di keranjang (cart)
export interface CartItem extends Product {
  qty: number;
}

// Metode pembayaran
export interface PaymentMethod {
  id: string;
  name: string;
  icon?: string; // opsional, jika nanti mau tambahkan ikon lucide
}

// Data transaksi (bisa dipakai kalau nanti disimpan ke DB)
export interface Transaction {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  date: string; // ISO string
}
