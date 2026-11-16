import { randomUUID } from "crypto";
import slugify from "slugify";

export class ProductInputError extends Error {
  field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "ProductInputError";
    this.field = field;
  }
}

export interface ProductCreateInput {
  name: string;
  sku: string;
  barcode: string | null;
  stock: number;
  price: number;
  costPrice: number;
  categoryId: number | null;
  description: string | null;
  imageUrl: string | null;
}

export type ProductUpdateInput = Partial<ProductCreateInput>;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProductInputError("body", "Data produk tidak valid");
  }
  return value as Record<string, unknown>;
}

export function parseNumberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;

  let normalized = value
    .trim()
    .replace(/^rp\.?\s*/i, "")
    .replace(/\s/g, "");
  if (!normalized) return null;

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");
  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function readText(
  value: unknown,
  field: string,
  label: string,
  maxLength: number,
  required = false
): string | null {
  if (value === undefined || value === null) {
    if (required) throw new ProductInputError(field, `${label} wajib diisi`);
    return null;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw new ProductInputError(field, `${label} tidak valid`);
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    if (required) throw new ProductInputError(field, `${label} wajib diisi`);
    return null;
  }
  if (trimmed.length > maxLength) {
    throw new ProductInputError(
      field,
      `${label} maksimal ${maxLength} karakter`
    );
  }
  return trimmed;
}

function readNumber(
  value: unknown,
  field: string,
  label: string,
  options: { required?: boolean; min?: number; integer?: boolean } = {}
): number | null {
  const { required = false, min = 0, integer = false } = options;
  if (value === undefined || value === null || value === "") {
    if (required) throw new ProductInputError(field, `${label} wajib diisi`);
    return null;
  }

  const parsed = parseNumberValue(value);
  if (parsed === null) {
    throw new ProductInputError(field, `${label} tidak valid`);
  }
  if (integer && !Number.isInteger(parsed)) {
    throw new ProductInputError(field, `${label} harus berupa bilangan bulat`);
  }
  if (parsed < min) {
    throw new ProductInputError(field, `${label} tidak boleh kurang dari ${min}`);
  }
  return parsed;
}

function readCategoryId(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const parsed = parseNumberValue(value);
  if (parsed === null || !Number.isInteger(parsed) || parsed <= 0) {
    throw new ProductInputError("categoryId", "Kategori tidak valid");
  }
  return parsed;
}

function readImageUrl(value: unknown): string | null {
  const url = readText(value, "imageUrl", "URL gambar", 2048);
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new ProductInputError(
      "imageUrl",
      "URL gambar harus diawali http:// atau https://"
    );
  }
  return url;
}

export function generateProductSku(name: string): string {
  const base =
    slugify(name, { lower: false, strict: true, trim: true })
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24)
      .toUpperCase() || "PRODUK";

  return `SKU-${base}-${randomUUID()
    .replace(/-/g, "")
    .slice(0, 6)
    .toUpperCase()}`;
}

export function parseProductCreate(value: unknown): ProductCreateInput {
  const body = asRecord(value);
  const name = readText(body.name, "name", "Nama produk", 200, true)!;
  const price = readNumber(body.price, "price", "Harga jual", {
    required: true,
    min: 0,
  })!;
  const costPrice =
    readNumber(body.costPrice, "costPrice", "Harga beli", { min: 0 }) ?? 0;
  const stock =
    readNumber(body.stock, "stock", "Stok", { min: 0, integer: true }) ?? 0;
  const sku =
    readText(body.sku, "sku", "SKU", 100) ?? generateProductSku(name);

  return {
    name,
    sku,
    barcode: readText(body.barcode, "barcode", "Barcode", 100),
    stock,
    price,
    costPrice,
    categoryId: readCategoryId(body.categoryId) ?? null,
    description: readText(body.description, "description", "Deskripsi", 2000),
    imageUrl: readImageUrl(body.imageUrl),
  };
}

export function parseProductUpdate(value: unknown): ProductUpdateInput {
  const body = asRecord(value);
  const input: ProductUpdateInput = {};

  if (body.name !== undefined) {
    input.name = readText(body.name, "name", "Nama produk", 200, true)!;
  }
  if (body.price !== undefined) {
    input.price = readNumber(body.price, "price", "Harga jual", {
      required: true,
      min: 0,
    })!;
  }
  if (body.costPrice !== undefined) {
    input.costPrice =
      readNumber(body.costPrice, "costPrice", "Harga beli", { min: 0 }) ?? 0;
  }
  if (body.stock !== undefined) {
    input.stock =
      readNumber(body.stock, "stock", "Stok", { min: 0, integer: true }) ?? 0;
  }
  if (body.sku !== undefined) {
    const sku = readText(body.sku, "sku", "SKU", 100);
    if (sku) input.sku = sku;
  }
  if (body.barcode !== undefined) {
    input.barcode = readText(body.barcode, "barcode", "Barcode", 100);
  }
  if (body.categoryId !== undefined) {
    input.categoryId = readCategoryId(body.categoryId) ?? null;
  }
  if (body.description !== undefined) {
    input.description = readText(
      body.description,
      "description",
      "Deskripsi",
      2000
    );
  }
  if (body.imageUrl !== undefined) {
    input.imageUrl = readImageUrl(body.imageUrl);
  }

  return input;
}
