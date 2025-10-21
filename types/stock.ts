// types/stock.ts

// Tipe produk khusus untuk Stock Adjustment
export interface StockProduct {
  id: number;
  name: string;
  sku: string;
  stock: number;
  imageUrl?: string;
  price: number; // tambahkan ini
}

// Tipe lokasi (untuk dropdown lokasi di modal)
export interface Location {
  id: number;
  name: string;
}
