export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
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
  productId: number;
  name: string;
  qty: number;
  price: number;
  subtotal: number;
  imageUrl?: string;
}
