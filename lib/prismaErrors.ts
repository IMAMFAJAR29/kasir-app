export interface MappedPrismaError {
  status: number;
  message: string;
}

export function mapPrismaError(error: unknown): MappedPrismaError | null {
  if (!error || typeof error !== "object") return null;

  const code = "code" in error ? String(error.code) : "";
  const meta = "meta" in error ? (error.meta as Record<string, unknown>) : {};
  const target = Array.isArray(meta.target)
    ? meta.target.join(",")
    : String(meta.target ?? "");

  if (code === "P2002") {
    if (target.includes("barcode")) {
      return {
        status: 400,
        message: "Barcode sudah digunakan produk lain",
      };
    }
    if (target.includes("sku")) {
      return { status: 400, message: "SKU sudah digunakan produk lain" };
    }
    return { status: 400, message: "Data sudah digunakan" };
  }

  if (code === "P2003") {
    return {
      status: 400,
      message: "Data terkait tidak ditemukan atau masih digunakan",
    };
  }

  if (code === "P2025") {
    return { status: 404, message: "Data tidak ditemukan" };
  }

  return null;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
}

export function mapStockError(
  error: unknown
): { status: number; message: string } | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;

  if (error.code === "INSUFFICIENT_STOCK") {
    return {
      status: 409,
      message: getErrorMessage(error, "Stok tidak mencukupi"),
    };
  }
  if (error.code === "INVALID_STOCK") {
    return {
      status: 400,
      message: getErrorMessage(error, "Stok tidak valid"),
    };
  }
  return null;
}
