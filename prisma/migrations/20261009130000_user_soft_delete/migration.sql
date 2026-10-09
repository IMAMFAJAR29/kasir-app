ALTER TABLE "public"."User"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN "deletedEmailHash" TEXT;

CREATE INDEX "User_deletedEmailHash_idx"
ON "public"."User"("deletedEmailHash");
