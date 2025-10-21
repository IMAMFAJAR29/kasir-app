"use client";
import Image from "next/image";
import { Upload, Save, X } from "lucide-react";
import Button from "../Button";
import { Category, FormProduct } from "@/types/products";

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
        className="w-full border border-gray-200 shadow-sm px-3 py-2 rounded-lg"
        required
      />

      {/* SKU */}
      <input
        type="text"
        placeholder="SKU Produk"
        value={form.sku}
        onChange={(e) => setForm({ ...form, sku: e.target.value })}
        className="w-full border border-gray-200 shadow-sm px-3 py-2 rounded-lg"
      />

      {/* Stok */}
      <input
        type="number"
        placeholder="Stok"
        value={form.stock === 0 ? "" : form.stock}
        onChange={(e) =>
          setForm({
            ...form,
            stock: e.target.value === "" ? 0 : Number(e.target.value), // tetap number
          })
        }
        className="w-full border border-gray-200 shadow-sm px-3 py-2 rounded-lg"
      />

      {/* Harga */}
      <input
        type="number"
        placeholder="Harga"
        value={form.price === 0 ? "" : form.price}
        onChange={(e) =>
          setForm({
            ...form,
            price: e.target.value === "" ? 0 : Number(e.target.value),
          })
        }
        className="w-full border border-gray-200 shadow-sm px-3 py-2 rounded-lg"
        required
      />

      {/* Upload Gambar */}
      <div className="col-span-1 sm:col-span-2 flex flex-col gap-2">
        {/* Input URL manual */}
        <input
          type="text"
          placeholder="Atau paste URL gambar"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          className="w-full border border-gray-200 shadow-sm px-3 py-2 rounded-lg"
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
            className="flex items-center gap-2 px-3 py-1 bg-black text-white rounded text-sm"
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
        className="col-span-1 sm:col-span-2 border border-gray-200 shadow-sm px-3 py-2 rounded-lg"
        rows={4}
      />

      {/* Kategori */}
      <div className="col-span-1 sm:col-span-2">
        <label className="block text-sm font-medium mb-1">Kategori</label>
        <button
          type="button"
          onClick={() => setShowCategoryModal(true)} // ✅ ini harus jalan
          className="w-full text-left border border-gray-200 shadow-sm px-3 py-2 rounded-lg"
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
          className="flex items-center gap-2 px-3 py-1 bg-black text-white rounded text-sm"
        >
          <Save size={16} /> {isEditing ? "Update Produk" : "Tambah Produk"}
        </Button>
        <Button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-1 bg-black text-white rounded text-sm"
        >
          <X size={18} />
        </Button>
      </div>
    </form>
  );
}
