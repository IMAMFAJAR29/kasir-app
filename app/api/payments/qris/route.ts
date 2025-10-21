import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Ambil order_id dan amount dari request body
    const body = await req.json();
    const { order_id, amount } = body;

    if (!order_id || !amount) {
      return NextResponse.json(
        { error: "Missing order_id or amount" },
        { status: 400 }
      );
    }

    // Ambil server key dari environment
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      return NextResponse.json(
        { error: "Server key not found in environment" },
        { status: 500 }
      );
    }

    // Encode server key untuk autentikasi basic
    const auth = Buffer.from(serverKey + ":").toString("base64");

    // Panggil Midtrans API Sandbox untuk QRIS
    const response = await fetch("https://api.sandbox.midtrans.com/v2/charge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        payment_type: "qris",
        transaction_details: {
          order_id,
          gross_amount: amount,
        },
        customer_details: {
          first_name: "Customer POS",
        },
      }),
    });

    const data = await response.json();
    console.log("Midtrans Response:", data);

    // Jika gagal, return error
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.status_message || "Failed to create QRIS" },
        { status: response.status }
      );
    }

    // Kembalikan data Midtrans ke frontend
    return NextResponse.json(data);
  } catch (err) {
    console.error("QRIS API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
