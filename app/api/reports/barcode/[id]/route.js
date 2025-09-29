import { NextResponse } from "next/server";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import prisma from "@/lib/prisma";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

export async function GET(req, context) {
  const { params } = await context; // ⬅️ harus di-await
  const id = Number(params.id);

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json(
      { error: "Produk tidak ditemukan" },
      { status: 404 }
    );
  }

  const qrDataUrl = await QRCode.toDataURL(product.sku);

  const fontPath = path.join(
    process.cwd(),
    "public",
    "fonts",
    "Poppins-Regular.ttf"
  );

  // ✅ pastikan font ada
  const fontExists = fs.existsSync(fontPath);

  // ✅ buat dokumen PDF dengan font custom langsung
  const doc = new PDFDocument({
    margin: 30,
    font: fontExists ? fontPath : undefined, // ⬅️ cegah Helvetica.afm
  });

  if (fontExists) {
    doc.registerFont("Poppins", fontPath);
    doc.font("Poppins");
  } else {
    doc.font("Courier"); // fallback
  }

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  doc.fontSize(20).text("Barcode Produk", { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text(`Nama: ${product.name}`);
  doc.text(`SKU: ${product.sku}`);
  doc.text(`Harga: Rp ${product.price}`);
  doc.moveDown();

  const qrImage = qrDataUrl.replace(/^data:image\/png;base64,/, "");
  const qrBuffer = Buffer.from(qrImage, "base64");
  doc.image(qrBuffer, { fit: [150, 150], align: "center" });

  doc.end();

  const pdfBuffer = await new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="barcode-${product.sku}.pdf"`,
    },
  });
}
