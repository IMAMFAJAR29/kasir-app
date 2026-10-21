ALTER TABLE "public"."User"
ALTER COLUMN "email" DROP NOT NULL,
ADD COLUMN "nik" TEXT,
ADD COLUMN "pinHash" TEXT;

CREATE UNIQUE INDEX "User_nik_key" ON "public"."User"("nik");

CREATE TABLE "public"."CashierLoginAttempt" (
    "key" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CashierLoginAttempt_pkey" PRIMARY KEY ("key")
);
