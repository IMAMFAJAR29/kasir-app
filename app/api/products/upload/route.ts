// api/products/upload/route.ts
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// tipe hasil upload yang kita butuhkan
interface CloudinaryUploadResult {
  secure_url: string;
}

export async function POST(req: Request) {
  // 1. Autentikasi & otorisasi
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  const canUpload =
    hasPermission(auth.user.role, auth.user.permissions, "products", "create") ||
    hasPermission(auth.user.role, auth.user.permissions, "products", "update");
  if (!canUpload) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // 2. Validasi tipe & ukuran file
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Tipe file tidak didukung. Hanya gambar (JPEG/PNG/WEBP/GIF)." },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file terlalu besar. Maksimal 5 MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 3. Upload ke Cloudinary (hanya gambar)
    const result: CloudinaryUploadResult = await new Promise(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "products",
              resource_type: "image",
              allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
            },
            (err, res) => {
              if (err) return reject(err);
              if (!res?.secure_url) return reject(new Error("Upload failed"));
              resolve({ secure_url: res.secure_url });
            }
          )
          .end(buffer);
      }
    );

    return NextResponse.json({ url: result.secure_url });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}