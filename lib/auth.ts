import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

interface JwtPayload {
  id: string;
  email: string;
  [key: string]: any;
}

export function verifyToken(req: NextRequest): JwtPayload | null {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET as string) as unknown as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}
