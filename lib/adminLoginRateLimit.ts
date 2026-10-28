import { createHmac } from "crypto";
import prisma from "@/lib/prisma";

const FAILURE_WINDOW_MINUTES = 15;
const MAX_EMAIL_FAILURES = 5;
const MAX_IP_FAILURES = 20;

function getAttemptKey(scope: "email" | "ip", value: string) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET wajib dikonfigurasi untuk login admin.");
  }
  return createHmac("sha256", secret)
    .update(`admin:${scope}:${value.trim().toLowerCase()}`)
    .digest("hex");
}

export async function isAdminLoginLocked(email: string, clientIp: string | null) {
  const keys = [
    getAttemptKey("email", email),
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

export async function recordAdminLoginFailure(
  email: string,
  clientIp: string | null,
  accountExists: boolean
) {
  const keys: Array<[string, number]> = [];
  if (accountExists) keys.push([getAttemptKey("email", email), MAX_EMAIL_FAILURES]);
  if (clientIp) keys.push([getAttemptKey("ip", clientIp), MAX_IP_FAILURES]);

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

export async function clearAdminLoginFailures(email: string) {
  await prisma.cashierLoginAttempt.deleteMany({
    where: { key: getAttemptKey("email", email) },
  });
}