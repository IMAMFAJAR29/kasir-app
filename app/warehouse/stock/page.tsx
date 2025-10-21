"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Button from "@/components/Button";
import StockAdjustmentModal from "@/components/StockAdjustment/StockAdjustmentModal";
import { Wrench } from "lucide-react";
import { StockProduct, Location } from "@/types/stock";

interface ProductApi {
  id: number;
  name: string;
  sku: string;
  imageUrl?: string;
  stocks: Record<number, number>;
  price?: number;
}

export default function StockPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [products, setProducts] = useState<ProductApi[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<StockProduct[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchLocations = async () => {
    const res = await fetch("/api/locations");
    const data: Location[] = await res.json();
    setLocations(data);
    if (data.length > 0) setSelectedLocation(data[0].id);
  };

  const fetchProducts = async () => {
    if (locations.length === 0) return;
    const productsWithStocks: ProductApi[] = [];
    for (const loc of locations) {
      const res = await fetch(`/api/warehouse/stock?locationId=${loc.id}`);
      const data: any[] = await res.json();
      data.forEach((p) => {
        const existing = productsWithStocks.find((prod) => prod.id === p.id);
        if (existing) existing.stocks[loc.id] = p.stock;
        else
          productsWithStocks.push({
            id: p.id,
            name: p.name,
            sku: p.sku,
            imageUrl: p.imageUrl,
            price: p.price ?? 0,
            stocks: { [loc.id]: p.stock },
          });
      });
    }
    setProducts(productsWithStocks);
    setSelectedProducts([]);
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (locations.length > 0) fetchProducts();
  }, [locations]);

  const toggleProduct = (product: ProductApi) => {
    const stockProduct: StockProduct = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      stock: product.stocks[selectedLocation!] ?? 0,
      price: product.price ?? 0,
      imageUrl: product.imageUrl,
    };
    setSelectedProducts((prev) =>
      prev.some((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, stockProduct]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === products.length) setSelectedProducts([]);
    else {
      const all: StockProduct[] = products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: p.stocks[selectedLocation!] ?? 0,
        price: p.price ?? 0,
        imageUrl: p.imageUrl,
      }));
      setSelectedProducts(all);
    }
  };

  return (
    <div className="max-w-7xl mx-auto mt-24 p-4">
      <h1 className="text-2xl font-bold mb-6">Gudang Stok</h1>

      <div className="mb-6">
        <select
          value={selectedLocation || ""}
          onChange={(e) => setSelectedLocation(Number(e.target.value))}
          className="bg-gray-100 rounded shadow-sm px-4 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      {selectedProducts.length > 0 && (
        <div className="mb-4">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2"
          >
            <Wrench className="w-5 h-5" /> Penyesuaian Stok (
            {selectedProducts.length})
          </Button>
        </div>
      )}

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={
                    products.length > 0 &&
                    selectedProducts.length === products.length
                  }
                  onChange={toggleSelectAll}
                  className="w-4 h-4"
                />
              </th>
              <th className="px-4 py-3 text-left">Produk</th>
              {locations.map((loc) => (
                <th key={loc.id} className="px-4 py-3 text-center">
                  Stok {loc.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((prod) => (
              <tr key={prod.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 align-middle">
                  <input
                    type="checkbox"
                    checked={selectedProducts.some((p) => p.id === prod.id)}
                    onChange={() => toggleProduct(prod)}
                    className="w-4 h-4"
                  />
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                      {prod.imageUrl ? (
                        <Image
                          src={prod.imageUrl}
                          alt={prod.name}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <span className="text-gray-400 text-sm">No Img</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{prod.sku}</p>
                      <p className="text-sm text-gray-700">{prod.name}</p>
                    </div>
                  </div>
                </td>
                {locations.map((loc) => (
                  <td key={loc.id} className="px-4 py-3 text-center">
                    {prod.stocks[loc.id] ?? 0}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedLocation && (
        <StockAdjustmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            fetchProducts();
            setSelectedProducts([]);
          }}
          locationId={selectedLocation}
          products={selectedProducts}
          locations={locations}
        />
      )}
    </div>
  );
}
