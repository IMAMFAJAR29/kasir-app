ALTER TABLE "public"."User"
ADD COLUMN "role" TEXT NOT NULL DEFAULT 'ADMIN';

ALTER TABLE "public"."transactions"
ADD COLUMN "cashSessionId" TEXT,
ADD COLUMN "clientTransactionId" TEXT;

CREATE UNIQUE INDEX "transactions_clientTransactionId_key"
ON "public"."transactions"("clientTransactionId");

CREATE INDEX "transactions_cashSessionId_idx"
ON "public"."transactions"("cashSessionId");

CREATE TABLE "public"."cash_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "openingCash" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "closingCash" DECIMAL(65,30),
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,
    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cash_sessions_userId_openedAt_idx"
ON "public"."cash_sessions"("userId", "openedAt");

CREATE INDEX "cash_sessions_closedAt_idx"
ON "public"."cash_sessions"("closedAt");

CREATE UNIQUE INDEX "cash_sessions_one_open_per_user_key"
ON "public"."cash_sessions"("userId")
WHERE "closedAt" IS NULL;

ALTER TABLE "public"."transactions"
ADD CONSTRAINT "transactions_cashSessionId_fkey"
FOREIGN KEY ("cashSessionId") REFERENCES "public"."cash_sessions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."cash_sessions"
ADD CONSTRAINT "cash_sessions_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
