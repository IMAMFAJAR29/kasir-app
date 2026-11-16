import {
  parseProductCreate,
  ProductInputError,
  type ProductCreateInput,
} from "@/lib/productInput";

export const MAX_IMPORT_ROWS = 500;

export const IMPORT_HEADERS = [
  "Nama",
  "SKU",
  "Barcode",
  "Harga Jual",
  "Harga Beli",
  "Stok",
  "Kategori",
  "Kategori ID",
  "Deskripsi",
  "URL Gambar",
] as const;

export const REQUIRED_IMPORT_HEADERS = ["Nama", "Harga Jual"] as const;

export interface ParsedImportRow {
  row: number;
  input: ProductCreateInput;
  categoryName: string | null;
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  imported: ProductCreateInput[];
  count: number;
}

const HEADER_ALIASES: Record<string, string> = {
  nama: "name",
  "nama produk": "name",
  name: "name",
  sku: "sku",
  kode: "sku",
  "kode produk": "sku",
  "item code": "sku",
  barcode: "barcode",
  barkode: "barcode",
  "harga jual": "price",
  harga: "price",
  "sell price": "price",
  "harga beli": "costPrice",
  "harga modal": "costPrice",
  "buy price": "costPrice",
  cost: "costPrice",
  stok: "stock",
  stock: "stock",
  qty: "stock",
  quantity: "stock",
  kategori: "categoryName",
  category: "categoryName",
  "kategori id": "categoryId",
  "category id": "categoryId",
  categoryid: "categoryId",
  kategoriid: "categoryId",
  deskripsi: "description",
  description: "description",
  keterangan: "description",
  "url gambar": "imageUrl",
  "image url": "imageUrl",
  gambar: "imageUrl",
  imageurl: "imageUrl",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function readCell(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

export function mapImportHeaders(headerRow: unknown[]): {
  columns: Record<string, number>;
  missing: string[];
} {
  const columns: Record<string, number> = {};

  headerRow.forEach((cell, index) => {
    const key = HEADER_ALIASES[normalizeHeader(cell)];
    if (key && columns[key] === undefined) {
      columns[key] = index;
    }
  });

  const missing = REQUIRED_IMPORT_HEADERS.filter((header) => {
    const key = HEADER_ALIASES[normalizeHeader(header)];
    return !key || columns[key] === undefined;
  }) as string[];

  return { columns, missing };
}

export function parseImportRows(
  rows: unknown[][],
  columns: Record<string, number>
): { rows: ParsedImportRow[]; errors: ImportRowError[] } {
  const parsedRows: ParsedImportRow[] = [];
  const errors: ImportRowError[] = [];
  const seenSku = new Map<string, number>();
  const seenBarcode = new Map<string, number>();

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    const isEmpty = row.every((cell) => readCell(cell) === null);
    if (isEmpty) continue;

    const cell = (key: string) =>
      columns[key] === undefined ? undefined : row[columns[key]];

    try {
      const input = parseProductCreate({
        name: cell("name"),
        sku: cell("sku"),
        barcode: cell("barcode"),
        price: cell("price"),
        costPrice: cell("costPrice"),
        stock: cell("stock"),
        categoryId: cell("categoryId"),
        description: cell("description"),
        imageUrl: cell("imageUrl"),
      });

      const duplicateSkuRow = seenSku.get(input.sku);
      if (duplicateSkuRow !== undefined) {
        throw new ProductInputError(
          "sku",
          `SKU "${input.sku}" duplikat dengan baris ${duplicateSkuRow}`
        );
      }
      seenSku.set(input.sku, index + 1);

      if (input.barcode) {
        const duplicateBarcodeRow = seenBarcode.get(input.barcode);
        if (duplicateBarcodeRow !== undefined) {
          throw new ProductInputError(
            "barcode",
            `Barcode "${input.barcode}" duplikat dengan baris ${duplicateBarcodeRow}`
          );
        }
        seenBarcode.set(input.barcode, index + 1);
      }

      parsedRows.push({
        row: index + 1,
        input,
        categoryName: readCell(cell("categoryName")),
      });
    } catch (error) {
      errors.push({
        row: index + 1,
        message:
          error instanceof ProductInputError
            ? error.message
            : "Baris tidak dapat diproses",
      });
    }
  }

  return { rows: parsedRows, errors };
}
