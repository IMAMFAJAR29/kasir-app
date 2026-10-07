"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Button from "@/components/Button";
import { Badge } from "@/components/ui/badge";
import StockAdjustmentModal from "@/components/StockAdjustment/StockAdjustmentModal";
import {
  Wrench,
  Warehouse,
  Search,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MapPin,
  Layers,
  ArrowUpDown
} from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "low" | "empty">("all");

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

  const activeLocation = useMemo(() => {
    return locations.find((l) => l.id === selectedLocation);
  }, [locations, selectedLocation]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      const locStock = selectedLocation ? p.stocks[selectedLocation] ?? 0 : 0;
      if (filterStatus === "empty") return locStock === 0;
      if (filterStatus === "low") return locStock > 0 && locStock <= 5;
      if (filterStatus === "available") return locStock > 5;
      return true;
    });
  }, [products, search, filterStatus, selectedLocation]);

  // Metrics calculation
  const metrics = useMemo(() => {
    let totalUnits = 0;
    let lowStockCount = 0;
    let emptyStockCount = 0;

    products.forEach((p) => {
      const s = selectedLocation ? p.stocks[selectedLocation] ?? 0 : 0;
      totalUnits += s;
      if (s === 0) emptyStockCount++;
      else if (s <= 5) lowStockCount++;
    });

    return {
      totalSku: products.length,
      totalUnits,
      lowStockCount,
      emptyStockCount,
    };
  }, [products, selectedLocation]);

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
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      const all: StockProduct[] = filteredProducts.map((p) => ({
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Monitoring & Stok Gudang
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pantau ketersediaan stok fisik real-time di setiap cabang dan gudang penyimpanan.
          </p>
        </div>

        {selectedProducts.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200/60">
              {selectedProducts.length} Produk Dipilih
            </span>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
            >
              <Wrench className="w-4 h-4" /> Penyesuaian Stok
            </Button>
          </div>
        )}
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Produk</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalSku} SKU</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Unit Fisik ({activeLocation?.name || "Semua"})</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalUnits.toLocaleString("id-ID")}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stok Menipis</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{metrics.lowStockCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stok Habis</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{metrics.emptyStockCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Controls: Location Tabs & Search Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        {/* Location selector pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase mr-2 tracking-wider shrink-0">
            <MapPin className="w-4 h-4 text-indigo-500" /> Lokasi:
          </div>
          {locations.map((loc) => {
            const isActive = selectedLocation === loc.id;
            return (
              <button
                key={loc.id}
                onClick={() => setSelectedLocation(loc.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 flex items-center gap-2 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Warehouse className="w-3.5 h-3.5" />
                {loc.name}
              </button>
            );
          })}
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan nama produk atau SKU..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            {(["all", "available", "low", "empty"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-2 text-xs font-medium rounded-xl transition-all capitalize ${
                  filterStatus === st
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st === "all" ? "Semua" : st === "available" ? "Aman (>5)" : st === "low" ? "Menipis (≤5)" : "Habis (0)"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredProducts.length > 0 &&
                      selectedProducts.length === filteredProducts.length
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-5 py-4">Produk</th>
                <th className="px-5 py-4">Harga Acuan</th>
                {locations.map((loc) => (
                  <th
                    key={loc.id}
                    className={`px-5 py-4 text-center ${
                      selectedLocation === loc.id ? "text-indigo-600 bg-indigo-50/50" : ""
                    }`}
                  >
                    Stok {loc.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={3 + locations.length} className="px-5 py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-medium text-slate-600">Tidak ada produk ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter lokasi.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const isSelected = selectedProducts.some((p) => p.id === prod.id);
                  return (
                    <tr
                      key={prod.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? "bg-indigo-50/30" : ""
                      }`}
                    >
                      <td className="px-5 py-3 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProduct(prod)}
                          className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-5 py-3 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/60 overflow-hidden flex items-center justify-center shrink-0">
                            {prod.imageUrl ? (
                              <Image
                                src={prod.imageUrl}
                                alt={prod.name}
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{prod.name}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">SKU: {prod.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 align-middle font-medium text-slate-700">
                        {prod.price ? `Rp ${(prod.price).toLocaleString("id-ID")}` : "-"}
                      </td>
                      {locations.map((loc) => {
                        const count = prod.stocks[loc.id] ?? 0;
                        const isCurrentLoc = selectedLocation === loc.id;
                        return (
                          <td
                            key={loc.id}
                            className={`px-5 py-3 text-center align-middle ${
                              isCurrentLoc ? "bg-indigo-50/20" : ""
                            }`}
                          >
                            {count === 0 ? (
                              <Badge variant="danger" withDot>
                                Habis
                              </Badge>
                            ) : count <= 5 ? (
                              <Badge variant="warning" withDot>
                                {`Sisa ${count}`}
                              </Badge>
                            ) : (
                              <Badge variant="success">
                                {`${count} Unit`}
                              </Badge>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
