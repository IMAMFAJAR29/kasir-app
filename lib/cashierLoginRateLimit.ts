import { createHmac } from "crypto";
import prisma from "@/lib/prisma";

const FAILURE_WINDOW_MINUTES = 15;
const MAX_NIK_FAILURES = 5;
const MAX_IP_FAILURES = 30;

function getAttemptKey(scope: "nik" | "ip", value: string) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET wajib dikonfigurasi untuk login kasir.");
  }
  return createHmac("sha256", secret)
    .update(`${scope}:${value}`)
    .digest("hex");
}

export async function isCashierLoginLocked(nik: string, clientIp: string | null) {
  const keys = [
    getAttemptKey("nik", nik),
    ...(clientIp ? [getAttemptKey("ip", clientIp)] : []),
  ];
  const attempts = await prisma.cashierLoginAttempt.findMany({
    where: { key: { in: keys } },
    select: { lockedUntil: true },
  });
  return attempts.some(
    (attempt) => attempt.lockedUntil && attempt.lockedUntil > new Date()
  );
}

export async function recordCashierLoginFailure(
  nik: string,
  clientIp: string | null,
  accountExists: boolean
) {
  const keys = [
    ...(accountExists ? [[getAttemptKey("nik", nik), MAX_NIK_FAILURES] as const] : []),
    ...(clientIp ? [[getAttemptKey("ip", clientIp), MAX_IP_FAILURES] as const] : []),
  ];
  for (const [key, maxFailures] of keys) {
    await prisma.$queryRaw<Array<{ failures: number; lockedUntil: Date | null }>>`
      INSERT INTO "CashierLoginAttempt"
        ("key", "failures", "windowStartedAt", "lockedUntil", "updatedAt")
      VALUES (${key}, 1, CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP)
      ON CONFLICT ("key") DO UPDATE SET
        "failures" = CASE
          WHEN "CashierLoginAttempt"."windowStartedAt" <= CURRENT_TIMESTAMP - (${FAILURE_WINDOW_MINUTES} * INTERVAL '1 minute')
            THEN 1
          ELSE "CashierLoginAttempt"."failures" + 1
        END,
        "windowStartedAt" = CASE
          WHEN "CashierLoginAttempt"."windowStartedAt" <= CURRENT_TIMESTAMP - (${FAILURE_WINDOW_MINUTES} * INTERVAL '1 minute')
            THEN CURRENT_TIMESTAMP
          ELSE "CashierLoginAttempt"."windowStartedAt"
        END,
        "lockedUntil" = CASE
          WHEN (
            CASE
              WHEN "CashierLoginAttempt"."windowStartedAt" <= CURRENT_TIMESTAMP - (${FAILURE_WINDOW_MINUTES} * INTERVAL '1 minute')
                THEN 1
              ELSE "CashierLoginAttempt"."failures" + 1
            END
          ) >= ${maxFailures}
            THEN CURRENT_TIMESTAMP + (${FAILURE_WINDOW_MINUTES} * INTERVAL '1 minute')
          ELSE NULL
        END,
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING "failures", "lockedUntil"
    `;
  }
}

export async function clearCashierLoginFailures(nik: string) {
  await prisma.cashierLoginAttempt.deleteMany({
    where: { key: getAttemptKey("nik", nik) },
  });
}
