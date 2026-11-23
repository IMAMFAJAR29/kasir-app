"use client";
import Image from "next/image";
import { Upload, Save, X, Boxes, Package } from "lucide-react";
import Button from "../Button";
import BundleComponentsEditor from "./BundleComponentsEditor";
import {
  Category,
  FormProduct,
  ProductWithCategory,
} from "@/types/products";

interface ProductFormProps {
  form: FormProduct;
  setForm: React.Dispatch<React.SetStateAction<FormProduct>>;
  isEditing: boolean;
  uploading: boolean;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  categories: Category[];
  flattenCategories: (cats: Category[]) => Category[];
  setShowCategoryModal: (show: boolean) => void;
  products: ProductWithCategory[];
  /** Ubah produk satuan yang sudah tersimpan menjadi bundle. */
  onConvertToBundle?: () => void;
  onClose?: () => void;
}

const MAX_BUNDLE_COMPONENTS = 100;

export default function ProductForm({
  form,
  setForm,
  isEditing,
  uploading,
  handleFileChange,
  handleSubmit,
  categories,
  flattenCategories,
  setShowCategoryModal,
  products,
  onConvertToBundle,
  onClose,
}: ProductFormProps) {
  const isBundle = form.isBundle;

  // Stok bundle adalah stok turunan: min(floor(stok komponen / qty)).
  const derivedBundleStock = (() => {
    if (!isBundle || form.bundleComponents.length === 0) return 0;
    const stockById = new Map(products.map((p) => [p.id, p.stock]));
    return form.bundleComponents.reduce((minimum, component) => {
      const available = stockById.get(component.componentProductId) ?? 0;
      return Math.min(minimum, Math.floor(available / component.quantity));
    }, Number.POSITIVE_INFINITY);
  })();

  return (
    <form
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      onSubmit={handleSubmit}
    >
      {/* Jenis produk: hanya label, jenis ditentukan dari tombol tambah */}
      <div className="col-span-1 sm:col-span-2">
        <div
          className={`flex items-start gap-2.5 rounded-2xl border p-3 ${
            isBundle
              ? "border-indigo-200 bg-indigo-50/60"
              : "border-slate-200 bg-slate-50/60"
          }`}
        >
          {isBundle ? (
            <Boxes size={18} className="mt-0.5 shrink-0 text-indigo-600" />
          ) : (
            <Package size={18} className="mt-0.5 shrink-0 text-slate-500" />
          )}
          <div>
            <p
              className={`text-sm font-semibold ${
                isBundle ? "text-indigo-800" : "text-slate-800"
              }`}
            >
              {isBundle ? "Produk Bundle" : "Produk Satuan"}
            </p>
            <p className="text-xs text-slate-500">
              {isBundle
                ? "Dijual sebagai satu SKU; stoknya dihitung dari komposisi komponen."
                : "Produk yang memiliki stok sendiri dan dijual per satuan."}
            </p>
          </div>
        </div>
      </div>

      {/* Nama Produk */}
      <input
        type="text"
        placeholder="Nama Produk"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="form-control"
        required
      />

      {/* SKU */}
      <input
        type="text"
        placeholder={isBundle ? "SKU Produk Bundle" : "SKU Produk"}
        value={form.sku}
        onChange={(e) => setForm({ ...form, sku: e.target.value })}
        className="form-control"
      />

      {!isBundle && (
        <>
          {/* Barcode */}
          <input
            type="text"
            placeholder="Barcode (opsional, boleh sama dengan SKU)"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            className="form-control"
          />

          {/* Stok */}
          <input
            type="number"
            placeholder="Stok"
            min={0}
            step={1}
            value={form.stock === 0 ? "" : form.stock}
            onChange={(e) =>
              setForm({
                ...form,
                stock: e.target.value === "" ? 0 : Number(e.target.value), // tetap number
              })
            }
            className="form-control"
          />
        </>
      )}

      {/* Harga Jual */}
      <input
        type="number"
        placeholder="Harga Jual"
        min={0}
        step="0.01"
        value={form.price}
        onChange={(e) =>
          setForm({
            ...form,
            price: e.target.value === "" ? 0 : Number(e.target.value),
          })
        }
        className="form-control"
        required
      />

      {isBundle ? (
        <div className="flex flex-col justify-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3">
          <span className="text-xs font-medium text-indigo-700">
            Stok bundle (otomatis)
          </span>
          <span className="text-lg font-bold text-indigo-900">
            {derivedBundleStock} unit
          </span>
          <span className="text-xs text-indigo-600/80">
            Dihitung dari stok komponen terkini.
          </span>
        </div>
      ) : (
        /* Harga Beli */
        <input
          type="number"
          placeholder="Harga Beli"
          min={0}
          step="0.01"
          value={form.costPrice}
          onChange={(e) =>
            setForm({
              ...form,
              costPrice: e.target.value === "" ? 0 : Number(e.target.value),
            })
          }
          className="form-control"
        />
      )}

      {/* Upload Gambar */}
      <div className="col-span-1 sm:col-span-2 flex flex-col gap-2">
        {/* Input URL manual */}
        <input
          type="text"
          placeholder="Atau paste URL gambar"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          className="form-control"
        />

        {/* Input file hidden */}
        <input
          type="file"
          id="uploadImage"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />

        {/* Tombol upload */}
        <label htmlFor="uploadImage">
          <Button
            as="span"
            className="flex items-center gap-2 bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
          >
            {uploading ? (
              "Uploading..."
            ) : (
              <>
                <Upload size={16} /> Upload Gambar
              </>
            )}
          </Button>
        </label>

        {/* Preview gambar */}
        {form.imageUrl && (
          <div className="w-32 h-32 relative border rounded overflow-hidden">
            <Image
              src={form.imageUrl}
              alt="Preview"
              fill
              className="object-cover"
            />
          </div>
        )}
      </div>

      {/* Deskripsi */}
      <textarea
        placeholder="Deskripsi Produk"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="form-control col-span-1 min-h-24 resize-y sm:col-span-2"
        rows={4}
      />

      {/* Komposisi bundle — hanya untuk produk bundle */}
      {isBundle && (
        <BundleComponentsEditor
          components={form.bundleComponents}
          onChange={(bundleComponents) =>
            setForm((prev) => ({ ...prev, bundleComponents }))
          }
          products={products}
          currentProductId={form.id}
        />
      )}

      {/* Kategori */}
      <div className="col-span-1 sm:col-span-2">
        <label className="block text-sm font-medium mb-1">Kategori</label>
        <button
          type="button"
          onClick={() => setShowCategoryModal(true)} // ✅ ini harus jalan
          className="form-control text-left"
        >
          {form.categoryId
            ? flattenCategories(categories).find(
                (c) => c.id === Number(form.categoryId)
              )?.name
            : "Pilih kategori..."}
        </button>
      </div>

      {/* Ubah jenis produk: satuan -> bundle (hanya saat edit produk satuan) */}
      {!isBundle && isEditing && onConvertToBundle && (
        <div className="col-span-1 sm:col-span-2">
          <button
            type="button"
            onClick={onConvertToBundle}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            <Boxes size={16} /> Ubah Jenis menjadi Produk Bundle
          </button>
          <p className="mt-1 text-xs text-slate-400">
            Produk yang sudah memiliki transaksi tidak dapat diubah menjadi bundle.
          </p>
        </div>
      )}

      {/* Tombol Aksi */}
      <div className="mt-4 col-span-1 sm:col-span-2 flex gap-2">
        <Button
          type="submit"
          className="flex items-center gap-2 bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
        >
          <Save size={16} />{" "}
          {isEditing
            ? "Update Produk"
            : isBundle
            ? "Tambah Produk Bundle"
            : "Tambah Produk"}
        </Button>
        <Button
          type="button"
          onClick={onClose}
          variant="outline"
          className="flex items-center gap-2 px-3 py-2 text-sm"
        >
          <X size={18} />
        </Button>
      </div>
    </form>
  );
}
