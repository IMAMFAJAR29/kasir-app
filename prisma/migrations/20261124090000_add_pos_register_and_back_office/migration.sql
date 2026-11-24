-- Cashier Back Office: mesin kasir (PosRegister), konteks outlet/gudang pada
-- shift, dan pembatasan akses kasir per outlet.
--
-- Semua perubahan bersifat aditif. Kolom baru pada cash_sessions nullable
-- sehingga data shift lama tetap valid tanpa backfill.

-- CreateTable
CREATE TABLE "public"."pos_registers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "locationId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_location_access" (
    "userId" TEXT NOT NULL,
    "locationId" INTEGER NOT NULL,

    CONSTRAINT "user_location_access_pkey" PRIMARY KEY ("userId","locationId")
);

-- AlterTable
ALTER TABLE "public"."cash_sessions"
ADD COLUMN "registerId" INTEGER,
ADD COLUMN "locationId" INTEGER,
ADD COLUMN "warehouseId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "pos_registers_locationId_code_key" ON "public"."pos_registers"("locationId", "code");
CREATE INDEX "pos_registers_locationId_idx" ON "public"."pos_registers"("locationId");
CREATE INDEX "pos_registers_warehouseId_idx" ON "public"."pos_registers"("warehouseId");
CREATE INDEX "user_location_access_locationId_idx" ON "public"."user_location_access"("locationId");
CREATE INDEX "cash_sessions_registerId_closedAt_idx" ON "public"."cash_sessions"("registerId", "closedAt");
CREATE INDEX "cash_sessions_locationId_idx" ON "public"."cash_sessions"("locationId");

-- Satu mesin kasir hanya boleh punya satu shift terbuka pada satu waktu.
-- Partial unique index tidak didukung deklarasi Prisma, jadi dibuat manual.
CREATE UNIQUE INDEX "cash_sessions_one_open_per_register_key"
ON "public"."cash_sessions"("registerId")
WHERE "closedAt" IS NULL AND "registerId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."pos_registers" ADD CONSTRAINT "pos_registers_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."pos_registers" ADD CONSTRAINT "pos_registers_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."user_location_access" ADD CONSTRAINT "user_location_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."user_location_access" ADD CONSTRAINT "user_location_access_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."cash_sessions" ADD CONSTRAINT "cash_sessions_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "public"."pos_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."cash_sessions" ADD CONSTRAINT "cash_sessions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."cash_sessions" ADD CONSTRAINT "cash_sessions_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
