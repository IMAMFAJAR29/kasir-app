import type { Prisma } from "@prisma/client";
import { BomInputError, MAX_BUNDLE_COMPONENTS } from "@/lib/bom";

export interface BundleComponentInput {
  componentProductId: number;
  quantity: number;
}

export interface ParsedBundleFields {
  isBundle?: boolean;
  components?: BundleComponentInput[];
}

function readIsBundle(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new BomInputError("isBundle", "Status bundle tidak valid");
  }
  return value;
}

export function parseBundleComponents(value: unknown): BundleComponentInput[] {
  if (!Array.isArray(value)) {
    throw new BomInputError("components", "Komposisi bundle tidak valid");
  }
  if (value.length === 0) {
    throw new BomInputError("components", "Produk bundle minimal punya satu komponen");
  }
  if (value.length > MAX_BUNDLE_COMPONENTS) {
    throw new BomInputError(
      "components",
      `Komposisi bundle maksimal ${MAX_BUNDLE_COMPONENTS} komponen`
    );
  }

  const seen = new Set<number>();
  const result: BundleComponentInput[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new BomInputError("components", "Baris komposisi tidak valid");
    }
    const source = entry as Record<string, unknown>;
    const componentProductId = Number(source.componentProductId);
    const quantity = Number(source.quantity);

    if (!Number.isSafeInteger(componentProductId) || componentProductId <= 0) {
      throw new BomInputError("components", "Produk komponen tidak valid");
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new BomInputError(
        "components",
        "Jumlah komponen harus bilangan bulat lebih dari 0"
      );
    }
    if (seen.has(componentProductId)) {
      throw new BomInputError("components", "Produk komponen tidak boleh duplikat");
    }

    seen.add(componentProductId);
    result.push({ componentProductId, quantity });
  }

  return result;
}

export function parseBundleFields(value: unknown): ParsedBundleFields {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BomInputError("body", "Data produk tidak valid");
  }
  const body = value as Record<string, unknown>;
  const parsed: ParsedBundleFields = {};

  const isBundle = readIsBundle(body.isBundle);
  if (isBundle !== undefined) parsed.isBundle = isBundle;

  if (body.components !== undefined) {
    parsed.components = parseBundleComponents(body.components);
  }

  if (parsed.isBundle === true && parsed.components === undefined) {
    throw new BomInputError("components", "Komposisi bundle wajib diisi");
  }
  if (parsed.isBundle === false && parsed.components !== undefined) {
    throw new BomInputError(
      "components",
      "Komposisi bundle hanya boleh diisi untuk produk bundle"
    );
  }

  return parsed;
}

/**
 * Validasi komposisi terhadap database: produk harus ada, bukan bundle lain,
 * dan bukan produk bundle itu sendiri.
 */
export async function validateBundleComponents(
  tx: Prisma.TransactionClient,
  bundleProductId: number,
  components: BundleComponentInput[]
) {
  const ids = components.map((component) => component.componentProductId);

  if (ids.includes(bundleProductId)) {
    throw new BomInputError(
      "components",
      "Produk bundle tidak boleh menjadi komponen dirinya sendiri"
    );
  }

  const products = await tx.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  if (products.length !== ids.length) {
    throw new BomInputError("components", "Ada produk komponen yang tidak ditemukan");
  }

  const nestedBoms = await tx.bom.findMany({
    where: { productId: { in: ids } },
    select: { product: { select: { id: true, name: true } } },
  });
  if (nestedBoms.length > 0) {
    const names = nestedBoms.map((bom) => bom.product.name).join(", ");
    throw new BomInputError(
      "components",
      `Produk bundle tidak boleh menjadi komponen: ${names}`
    );
  }
}
