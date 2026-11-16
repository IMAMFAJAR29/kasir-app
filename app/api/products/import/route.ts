import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import readXlsxFile from "read-excel-file/node";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import { mapPrismaError } from "@/lib/prismaErrors";
import {
  IMPORT_HEADERS,
  MAX_IMPORT_ROWS,
  mapImportHeaders,
  parseImportRows,
  type ImportRowError,
  type ParsedImportRow,
} from "@/lib/productImport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ALLOWED_XLSX_TYPES = new Set([
  XLSX_MIME,
  "application/octet-stream",
  "application/zip",
]);

export async function POST(req: Request) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json(
      { error: "Autentikasi diperlukan" },
      { status: 401 }
    );
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "products", "create")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "File import wajib dipilih" },
        { status: 400 }
      );
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "Format file harus .xlsx" },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file terlalu besar. Maksimal 5 MB." },
        { status: 400 }
      );
    }
    if (file.type && !ALLOWED_XLSX_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Tipe file tidak sesuai. Gunakan file Excel .xlsx." },
        { status: 400 }
      );
    }

    let rows: unknown[][];
    try {
      rows = await readXlsxFile(Buffer.from(await file.arrayBuffer()));
    } catch {
      return NextResponse.json(
        { error: "File Excel tidak dapat dibaca" },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "File import kosong" },
        { status: 400 }
      );
    }

    if (rows.length - 1 > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        {
          error: `Maksimal ${MAX_IMPORT_ROWS} baris per import. File berisi ${rows.length - 1} baris.`,
        },
        { status: 400 }
      );
    }

    const { columns, missing } = mapImportHeaders(rows[0]);
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Kolom wajib tidak ditemukan: ${missing.join(", ")}. Gunakan template terbaru.`,
          headers: IMPORT_HEADERS,
        },
        { status: 400 }
      );
    }

    const parsed = parseImportRows(rows, columns);
    const errors: ImportRowError[] = [...parsed.errors];

    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
    });
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const categoryByName = new Map(
      categories.map((category) => [
        category.name.trim().toLowerCase(),
        category.id,
      ])
    );

    const validRows: ParsedImportRow[] = [];

    for (const row of parsed.rows) {
      if (row.categoryName) {
        const resolvedId = categoryByName.get(
          row.categoryName.trim().toLowerCase()
        );
        if (resolvedId === undefined) {
          errors.push({
            row: row.row,
            message: `Kategori "${row.categoryName}" tidak ditemukan`,
          });
          continue;
        }
        if (row.input.categoryId !== null && row.input.categoryId !== resolvedId) {
          errors.push({
            row: row.row,
            message: "Kategori ID dan nama kategori tidak cocok",
          });
          continue;
        }
        row.input.categoryId = resolvedId;
      }

      if (
        row.input.categoryId !== null &&
        !categoryById.has(row.input.categoryId)
      ) {
        errors.push({
          row: row.row,
          message: `Kategori ID ${row.input.categoryId} tidak ditemukan`,
        });
        continue;
      }

      validRows.push(row);
    }

    if (validRows.length > 0) {
      const existing = await prisma.product.findMany({
        where: {
          OR: [
            { sku: { in: validRows.map((row) => row.input.sku) } },
            {
              barcode: {
                in: validRows
                  .map((row) => row.input.barcode)
                  .filter((barcode): barcode is string => Boolean(barcode)),
              },
            },
          ],
        },
        select: { sku: true, barcode: true },
      });

      const existingSkus = new Set(existing.map((product) => product.sku));
      const existingBarcodes = new Set(
        existing
          .map((product) => product.barcode)
          .filter((barcode): barcode is string => Boolean(barcode))
      );

      for (let index = validRows.length - 1; index >= 0; index -= 1) {
        const row = validRows[index];
        if (existingSkus.has(row.input.sku)) {
          errors.push({
            row: row.row,
            message: `SKU "${row.input.sku}" sudah digunakan`,
          });
          validRows.splice(index, 1);
        } else if (row.input.barcode && existingBarcodes.has(row.input.barcode)) {
          errors.push({
            row: row.row,
            message: `Barcode "${row.input.barcode}" sudah digunakan`,
          });
          validRows.splice(index, 1);
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "File import memiliki kesalahan. Tidak ada produk yang diimport.",
          details: errors
            .sort((left, right) => left.row - right.row)
            .slice(0, 100),
          totalErrors: errors.length,
        },
        { status: 400 }
      );
    }

    if (validRows.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada baris produk yang dapat diimport" },
        { status: 400 }
      );
    }

    const imported = await prisma.$transaction(
      async (tx) => {
        const location = await tx.location.findFirst({
          where: { isActive: true },
          orderBy: { id: "asc" },
          select: { id: true },
        });

        await tx.product.createMany({
          data: validRows.map((row) => ({
            name: row.input.name,
            sku: row.input.sku,
            barcode: row.input.barcode,
            description: row.input.description,
            imageUrl: row.input.imageUrl,
            price: row.input.price,
            costPrice: row.input.costPrice,
            stock: row.input.stock,
            categoryId: row.input.categoryId,
          })),
        });

        const importedProducts = await tx.product.findMany({
          where: { sku: { in: validRows.map((row) => row.input.sku) } },
          include: { category: true },
          orderBy: { id: "asc" },
        });

        if (location) {
          const stockBySku = new Map(
            validRows.map((row) => [row.input.sku, row.input.stock])
          );
          await tx.productStock.createMany({
            data: importedProducts.map((product) => ({
              productId: product.id,
              locationId: location.id,
              quantity: stockBySku.get(product.sku) ?? 0,
            })),
          });
        }

        return importedProducts;
      },
      { timeout: 120000 }
    );

    return NextResponse.json(
      { imported, count: imported.length },
      { status: 201 }
    );
  } catch (err) {
    const prismaError = mapPrismaError(err);
    if (prismaError) {
      return NextResponse.json(
        { error: prismaError.message },
        { status: prismaError.status }
      );
    }

    console.error("Error import products:", err);
    return NextResponse.json(
      { error: "Gagal mengimport produk" },
      { status: 500 }
    );
  }
}
