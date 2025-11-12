export interface PurchaseItem {
  id: number;
  name: string;
  sku?: string;
  price: number;
  qty: number;
  subtotal: number;
  stock?: number;
}

export interface Purchase {
  id: number;
  purchaseNumber: string;
  supplierId: number;
  locationId: number;
  refNo?: string;
  date: string;
  notes?: string;
  items: PurchaseItem[];
  totalAmount: number;
}
