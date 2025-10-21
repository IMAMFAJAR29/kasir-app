// api/products/upload/route.ts
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// tipe hasil upload yang kita butuhkan
interface CloudinaryUploadResult {
  secure_url: string;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // upload ke Cloudinary
    const result: CloudinaryUploadResult = await new Promise(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: "products" }, (err, res) => {
            if (err) return reject(err);
            if (!res?.secure_url) return reject(new Error("Upload failed"));
            resolve({ secure_url: res.secure_url });
          })
          .end(buffer);
      }
    );

    return NextResponse.json({ url: result.secure_url });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload failed", details: err.message || err },
      { status: 500 }
    );
  }
}
