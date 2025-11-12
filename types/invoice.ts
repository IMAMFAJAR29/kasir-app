export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  sku?: string;
  imageUrl?: string;
}

export interface Customer {
  id: number;
  name: string;
  email?: string;
}

export interface Location {
  id: number;
  name: string;
}

export interface InvoiceItem {
  id?: number; // id produk
  productId?: number; // optional jika dari invoice lama
  name: string;
  sku?: string;
  qty: number;
  price: number;
  subtotal?: number;
  imageUrl?: string;
}

export interface Invoice {
  id?: number;
  invoiceNumber: string;
  customerId?: number;
  locationId?: number;
  refNo?: string;
  salesman?: string;
  date?: string;
  termin?: number;
  dueDate?: string;
  notes?: string;
  tax?: { id: number; name: string; rate: number } | null;
  discount?: number;
  shipping?: number;
  items?: InvoiceItem[];
}
