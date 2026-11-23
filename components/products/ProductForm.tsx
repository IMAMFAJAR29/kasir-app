"use client";
import Image from "next/image";
import { Upload, Save, X } from "lucide-react";
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
  onClose?: () => void;
}

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
  onClose,
}: ProductFormProps) {
  return (
    <form
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      onSubmit={handleSubmit}
    >
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
        placeholder="SKU Produk"
        value={form.sku}
        onChange={(e) => setForm({ ...form, sku: e.target.value })}
        className="form-control"
      />

      {/* Barcode */}
      <input
        type="text"
        placeholder="Barcode (opsional, boleh sama dengan SKU)"
        value={form.barcode}
        onChange={(e) => setForm({ ...form, barcode: e.target.value })}
        className="form-control"
      />

      {/* Stok */}
      <div className="flex flex-col gap-1">
        <input
          type="number"
          placeholder={form.isBundle ? "Stok dihitung dari komponen" : "Stok"}
          min={0}
          step={1}
          value={form.isBundle ? "" : form.stock === 0 ? "" : form.stock}
          onChange={(e) =>
            setForm({
              ...form,
              stock: e.target.value === "" ? 0 : Number(e.target.value), // tetap number
            })
          }
          className={`form-control ${
            form.isBundle ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""
          }`}
          disabled={form.isBundle}
        />
        {form.isBundle && (
          <span className="text-xs text-slate-400">
            Stok bundle dihitung otomatis dari komponen.
          </span>
        )}
      </div>

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

      {/* Harga Beli */}
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

      {/* Produk Bundle */}
      <div className="col-span-1 sm:col-span-2">
        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isBundle}
            onChange={(e) =>
              setForm({ ...form, isBundle: e.target.checked, stock: 0 })
            }
            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-blue-600"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-800">
              Jadikan produk bundle
            </span>
            <span className="block text-xs text-slate-500">
              Produk bundle dijual sebagai satu SKU, tetapi stoknya diambil dari
              stok komponen.
            </span>
          </span>
        </label>
      </div>

      {form.isBundle && (
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
      {/* Tombol Aksi */}
      <div className="mt-4 col-span-1 sm:col-span-2 flex gap-2">
        <Button
          type="submit"
          className="flex items-center gap-2 bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
        >
          <Save size={16} /> {isEditing ? "Update Produk" : "Tambah Produk"}
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
